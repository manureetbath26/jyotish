// ─────────────────────────────────────────────────────────────────────────────
// /api/astro-chat/message
//
// POST — run the multi-agent pipeline and stream the astrologer's response
//
// Body: { sessionId: string, message: string, chart?: ChartResponse, birthData?: BirthData }
//
// The response is SSE:
//   data: {"type":"token","token":"..."}
//   data: {"type":"intent","intent":{...}}
//   data: {"type":"done","messageId":"..."}
//   data: {"type":"error","error":"..."}
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { interpreterNode } from "@/lib/astroChat/interpreterNode";
import { dataCollectorNode } from "@/lib/astroChat/dataCollectorNode";
import { buildAstrologerMessages, astrologerLLM } from "@/lib/astroChat/astrologerNode";
import { makeInitialState } from "@/lib/astroChat/graph";
import type { BirthData } from "@/lib/astroChat/types";
import type { ChartResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, message, chart, birthData } = body as {
    sessionId: string;
    message: string;
    chart?: ChartResponse;
    birthData?: BirthData;
  };

  if (!sessionId || !message) {
    return Response.json({ error: "sessionId and message required" }, { status: 400 });
  }

  // Load chat session + chart data
  const chatSession = await prisma.astroChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Use chart from body (fresh) or stored in session
  const resolvedChart = (chart ?? chatSession.chartData) as ChartResponse;
  const resolvedBirthData = (birthData ?? chatSession.birthData ?? {}) as BirthData;

  if (!resolvedChart) {
    return Response.json({ error: "No chart data available" }, { status: 400 });
  }

  // Save the user message immediately
  await prisma.astroChatMessage.create({
    data: {
      sessionId,
      role:    "user",
      content: message,
    },
  });

  // Update session timestamp + auto-title on first message
  if (!chatSession.title) {
    // Use first 60 chars of message as title
    const autoTitle = message.length > 60 ? message.slice(0, 60) + "…" : message;
    await prisma.astroChatSession.update({
      where: { id: sessionId },
      data: { title: autoTitle, updatedAt: new Date() },
    });
  } else {
    await prisma.astroChatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  // Build SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 1: Interpreter ────────────────────────────────────────────
        let state = makeInitialState(resolvedChart, resolvedBirthData, message);
        const interpreterResult = await interpreterNode(state);
        state = { ...state, ...interpreterResult };

        if (state.intent) {
          controller.enqueue(sseEvent({ type: "intent", intent: state.intent }));
        }

        // ── Step 2: Data Collector ─────────────────────────────────────────
        const collectorResult = await dataCollectorNode(state);
        state = { ...state, ...collectorResult };

        if (state.error && !state.astrologyData) {
          controller.enqueue(sseEvent({ type: "error", error: state.error }));
          controller.close();
          return;
        }

        // ── Step 3: Astrologer — streaming ────────────────────────────────
        const messages = buildAstrologerMessages(state);
        if (!messages.length) {
          controller.enqueue(sseEvent({ type: "error", error: "Could not build astrologer prompt" }));
          controller.close();
          return;
        }

        let fullAnswer = "";
        const streamResponse = await astrologerLLM.stream(
          messages.map((m) => ({ role: m.role as "system" | "user", content: m.content })),
        );

        for await (const chunk of streamResponse) {
          const token = typeof chunk.content === "string"
            ? chunk.content
            : Array.isArray(chunk.content)
              ? chunk.content.map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? "")).join("")
              : "";

          if (token) {
            fullAnswer += token;
            controller.enqueue(sseEvent({ type: "token", token }));
          }
        }

        // ── Persist assistant message ──────────────────────────────────────
        const saved = await prisma.astroChatMessage.create({
          data: {
            sessionId,
            role:    "assistant",
            content: fullAnswer,
            // Store intent as Prisma-compatible JSON input
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            intent: state.intent ? (state.intent as any) : undefined,
          },
        });

        controller.enqueue(sseEvent({ type: "done", messageId: saved.id }));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(sseEvent({ type: "error", error: msg }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
