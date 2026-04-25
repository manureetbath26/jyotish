import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChartResponse } from "@/lib/api";
import { generateLifeEventsReport } from "@/lib/lifeEventsReport";
import {
  answerAstrologyQuestion,
  classifyQuestion,
  extractAnswerFacts,
  type DailyContext,
} from "@/lib/chatEngine";
import { computeChatEnrichment } from "@/lib/chatEnrichment";
import { composeNaturalAnswer, isLlmComposerAvailable } from "@/lib/llmComposer";
import { extractDailyFacts } from "@/lib/dailyEngine";
import {
  computeAshtakvarga,
  type AshtakvargaAnalysis,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import type { CurrentTransitResponse } from "@/lib/api";
import { resolveQuestionWindow } from "@/lib/questionWindow";
import { buildWindowContext } from "@/lib/windowContext";
import { getChatRules } from "@/lib/rulesServer";
import { readAnonId } from "@/lib/anonSession";

/**
 * Resolve which identity owns this chat session: a logged-in userId or
 * an anonymous cookie. Returns the role flags + the matched session row.
 * `notFound` means neither identity matches — caller returns 404.
 */
async function resolveChatSessionAccess(sessionId: string) {
  const session = await auth();
  const anonId = await readAnonId();

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
  if (!chatSession) return { notFound: true as const };

  // Logged-in owner
  if (session?.user?.id && chatSession.userId === session.user.id) {
    return { chatSession, isAdmin: false, isOwner: true, isGuest: false };
  }
  // Admin bypass
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role === "admin") {
      return { chatSession, isAdmin: true, isOwner: false, isGuest: false };
    }
  }
  // Anonymous owner via cookie
  if (anonId && chatSession.anonSessionId === anonId) {
    return { chatSession, isAdmin: false, isOwner: true, isGuest: true };
  }
  return { notFound: true as const };
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  const access = await resolveChatSessionAccess(sessionId);
  if ("notFound" in access) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(messages);
}

export async function POST(req: NextRequest) {
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

  const access = await resolveChatSessionAccess(sessionId);
  if ("notFound" in access) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const { chatSession, isAdmin } = access;

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

  // Resolve the question's time window. Hard-capped to 5 years; the
  // resolver returns a user-facing note describing the focus.
  const now = new Date();
  const questionWindow = resolveQuestionWindow(trimmedQuestion, now);

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

  // Shared resources for window context + daily context. Both need current
  // transits and Ashtakvarga — fetch once, reuse, fail open.
  let currentTransits: CurrentTransitResponse | undefined;
  let ashtakvarga: AshtakvargaAnalysis | undefined;
  if (!questionWindow.isPurePast) {
    try {
      currentTransits = await fetchCurrentTransits(chartData);
    } catch (err) {
      console.warn("[chat] current transits fetch failed:", err);
    }
    try {
      ashtakvarga = await computeAshtakvargaForChat(chartData);
    } catch (err) {
      console.warn("[chat] ashtakvarga compute failed:", err);
    }
  }

  // Load the DB-backed interpretive rules (5-min in-process cache).
  const rules = await getChatRules();

  // Build the window-scoped context (dasha slice, clipped highlights,
  // projected slow-planet transits, Jaimini overlap, house SAV focus).
  const classification = classifyQuestion(rules, trimmedQuestion);
  const windowContext = buildWindowContext({
    chart: chartData,
    report,
    window: questionWindow,
    categories: classification.categories,
    houses: classification.houses,
    rules,
    enriched,
    currentTransits,
    ashtakvarga,
    now,
  });

  // Deterministic extraction first — this is our source of truth and our
  // fallback if the LLM composer is unavailable or fails.
  const { answer: templateAnswer, metadata } = answerAstrologyQuestion(
    trimmedQuestion,
    chartData,
    report,
    rules,
    enriched,
    windowContext,
  );
  let answer = templateAnswer;
  let composer: "openai" | "template" = "template";

  if (isLlmComposerAvailable()) {
    try {
      const facts = extractAnswerFacts(
        trimmedQuestion,
        chartData,
        report,
        rules,
        enriched,
        questionWindow,
        windowContext,
      );

      // Daily-granularity context only when the window is a single day
      // AND we already have the transit snapshot in memory.
      if (questionWindow.isDaily && currentTransits && ashtakvarga) {
        try {
          facts.dailyContext = dailyContextFromShared(
            chartData,
            currentTransits,
            ashtakvarga,
            rules,
          );
        } catch (err) {
          console.warn("[chat] daily context assembly failed:", err);
        }
      }

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


/** Fetch today's transit snapshot from the backend — used by both the
 *  window transit projector and the optional daily-context augmentation. */
async function fetchCurrentTransits(
  chartData: ChartResponse,
): Promise<CurrentTransitResponse> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${backendUrl}/api/chart/current-transits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ayanamsha_value: chartData.ayanamsha_value,
      natal_lagna_degree: chartData.lagna_degree,
    }),
  });
  if (!res.ok) throw new Error(`current-transits failed (${res.status})`);
  return res.json();
}

async function computeAshtakvargaForChat(
  chartData: ChartResponse,
): Promise<AshtakvargaAnalysis> {
  const rulesRaw = await prisma.ashtakvargaRule.findMany();
  const rules: AshtakvargaRule[] = rulesRaw.map((r) => ({
    planet: r.planet as AshtakvargaRule["planet"],
    source: r.source as AshtakvargaRule["source"],
    houses: r.houses,
  }));
  return computeAshtakvarga(chartData, rules);
}

/** Assemble DailyContext from already-fetched transits + ashtakvarga.
 *  Only called when the question's window is a single day. */
function dailyContextFromShared(
  chartData: ChartResponse,
  transits: CurrentTransitResponse,
  ashtakvarga: AshtakvargaAnalysis,
  rules: import("@/lib/rulesServer").ChatRules,
): DailyContext {
  const dailyFacts = extractDailyFacts(chartData, transits, ashtakvarga, "", rules);
  return {
    date: dailyFacts.date,
    moonSign: dailyFacts.moonPulse.sign,
    moonNakshatra: dailyFacts.moonPulse.nakshatra || undefined,
    moonHouseFromLagna: dailyFacts.moonPulse.houseFromLagna,
    moonHouseTheme: dailyFacts.moonPulse.houseTheme,
    activeTransits: dailyFacts.activeTransits.map((t) => ({
      planet: t.planet,
      transitSign: t.transitSign,
      houseFromLagna: t.houseFromLagna,
      houseTheme: t.houseTheme,
      nature: t.nature,
      effect: t.effectIfActive,
      bav: t.bav || undefined,
      threshold: t.threshold || undefined,
    })),
  };
}
