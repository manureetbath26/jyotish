import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChartResponse } from "@/lib/api";
import { generateLifeEventsReport } from "@/lib/lifeEventsReport";
import { answerAstrologyQuestion, extractAnswerFacts } from "@/lib/chatEngine";
import { computeChatEnrichment } from "@/lib/chatEnrichment";
import { composeNaturalAnswer, isLlmComposerAvailable } from "@/lib/llmComposer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  // Verify ownership
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!chatSession || chatSession.userId !== session.user.id) {
    // Admin bypass
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "admin") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, question } = body;

  if (!sessionId || !question || typeof question !== "string") {
    return Response.json({ error: "sessionId and question are required" }, { status: 400 });
  }

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length === 0) {
    return Response.json({ error: "Question cannot be empty" }, { status: 400 });
  }
  if (trimmedQuestion.length > 500) {
    return Response.json({ error: "Question too long (max 500 characters)" }, { status: 400 });
  }

  // Load session and verify ownership + quota
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Check admin bypass
  let isAdmin = false;
  if (chatSession.userId !== session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role === "admin") {
      isAdmin = true;
    } else {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Check quota (admins bypass)
  if (!isAdmin && chatSession.questionsUsed >= chatSession.questionLimit) {
    return Response.json({
      error: "You've used all your questions. Please upgrade your plan for more.",
      questionsUsed: chatSession.questionsUsed,
      questionLimit: chatSession.questionLimit,
    }, { status: 403 });
  }

  // Save user message
  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: trimmedQuestion,
    },
  });

  // Generate answer using the engine — enriched with Jaimini + Ashtakvarga
  const chartData = chatSession.chartData as unknown as ChartResponse;
  const report = generateLifeEventsReport(chartData);

  // Compute enriched context (Jaimini marriage/career windows + Ashtakvarga
  // house-level SAV + karaka BAV). Fails open — chat still works if this
  // throws, answer just lacks the "Jaimini + Ashtakvarga check" section.
  let enriched;
  try {
    enriched = await computeChatEnrichment(chartData);
  } catch (err) {
    console.warn("[chat] enrichment failed:", err);
    enriched = undefined;
  }

  // Deterministic extraction first — this is our source of truth and our
  // fallback if the LLM composer is unavailable or fails.
  const { answer: templateAnswer, metadata } = answerAstrologyQuestion(
    trimmedQuestion,
    chartData,
    report,
    enriched,
  );
  let answer = templateAnswer;
  let composer: "openai" | "template" = "template";

  if (isLlmComposerAvailable()) {
    try {
      const facts = extractAnswerFacts(trimmedQuestion, chartData, report, enriched);
      answer = await composeNaturalAnswer(facts, chartData);
      composer = "openai";
    } catch (err) {
      console.warn("[chat] LLM composer failed, using template:", err);
      // answer already holds templateAnswer; composer stays "template"
    }
  }

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: answer,
      metadata: { ...metadata, composer } as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
    },
  });

  // Increment question count atomically (skip for admin)
  if (!isAdmin) {
    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        questionsUsed: { increment: 1 },
        status: chatSession.questionsUsed + 1 >= chatSession.questionLimit ? "exhausted" : "active",
      },
    });

    return Response.json({
      userMessage,
      assistantMessage,
      questionsUsed: updated.questionsUsed,
      questionLimit: updated.questionLimit,
    });
  }

  return Response.json({
    userMessage,
    assistantMessage,
    questionsUsed: chatSession.questionsUsed,
    questionLimit: chatSession.questionLimit,
  });
}
