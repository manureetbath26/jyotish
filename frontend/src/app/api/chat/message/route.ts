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
import { composeNaturalAnswer, buildConversationSummary, isLlmComposerAvailable } from "@/lib/llmComposer";
import { extractDailyFacts } from "@/lib/dailyEngine";
import {
  computeAshtakvarga,
  type AshtakvargaAnalysis,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import type { CurrentTransitResponse } from "@/lib/api";
import { resolveQuestionWindow } from "@/lib/questionWindow";
import { buildWindowContext } from "@/lib/windowContext";
import { getChatRules, getCachedAshtakvargaRules } from "@/lib/rulesServer";
import { readAnonId } from "@/lib/anonSession";
import { consumeQuestion, getQuotaSummary, type QuotaIdentity } from "@/lib/chatQuota";

/**
 * Resolve which identity owns this chat session: a logged-in userId or
 * an anonymous cookie. Returns the role flags + the matched session row.
 * `notFound` means neither identity matches — caller returns 404.
 */
async function resolveChatSessionAccess(sessionId: string) {
  const [session, anonId] = await Promise.all([auth(), readAnonId()]);

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

// ── Per-session LifeEventsReport cache ───────────────────────────────────────
// generateLifeEventsReport is pure + expensive (full chart walk). The chart
// never mutates within a session, so we cache the result in-process keyed by
// sessionId and let it expire after 30 minutes (covers any realistic session
// length without accumulating stale entries indefinitely).
import type { LifeEventsReport } from "@/lib/lifeEventsReport";
const REPORT_CACHE = new Map<string, { report: LifeEventsReport; ts: number }>();
const REPORT_TTL_MS = 30 * 60 * 1000;
function getCachedReport(sessionId: string, chartData: ChartResponse): LifeEventsReport {
  const hit = REPORT_CACHE.get(sessionId);
  if (hit && Date.now() - hit.ts < REPORT_TTL_MS) return hit.report;
  const report = generateLifeEventsReport(chartData);
  REPORT_CACHE.set(sessionId, { report, ts: Date.now() });
  // Evict entries older than TTL to prevent unbounded growth
  if (REPORT_CACHE.size > 500) {
    const cutoff = Date.now() - REPORT_TTL_MS;
    for (const [k, v] of REPORT_CACHE) if (v.ts < cutoff) REPORT_CACHE.delete(k);
  }
  return report;
}

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
    select: { id: true, role: true, content: true, saved: true, createdAt: true },
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

  // Wallet quota check — pooled across all the user's chat threads (so
  // buying once gives questions usable across every profile chart).
  // Admins bypass.
  const quotaIdentity: QuotaIdentity = chatSession.userId
    ? { userId: chatSession.userId }
    : { guestEmail: chatSession.guestEmail };
  const quotaBefore = isAdmin ? null : await getQuotaSummary(quotaIdentity);
  if (!isAdmin && quotaBefore && quotaBefore.remaining <= 0) {
    return Response.json({
      error: "You've used all your questions. Buy more to keep asking.",
      remaining: 0,
      totalLimit: quotaBefore.totalLimit,
      totalUsed: quotaBefore.totalUsed,
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
  // Use cached report — generateLifeEventsReport is pure but expensive;
  // the chart never changes within a session.
  const report = getCachedReport(sessionId, chartData);

  // Resolve the question's time window. Hard-capped to 5 years; the
  // resolver returns a user-facing note describing the focus.
  const now = new Date();
  const questionWindow = resolveQuestionWindow(trimmedQuestion, now);

  // Load the DB-backed interpretive rules + ashtakvarga rules in parallel.
  // Both use 5-min in-process caches so concurrent questions share one DB fetch.
  const [rules, ashtakRules] = await Promise.all([
    getChatRules(),
    getCachedAshtakvargaRules(),
  ]);

  // Compute enriched context (Jaimini marriage/career windows + Ashtakvarga
  // house-level SAV + karaka BAV). Fails open — chat still works if this
  // throws, answer just lacks the "Jaimini + Ashtakvarga check" section.
  let enriched;
  try {
    enriched = await computeChatEnrichment(chartData, ashtakRules);
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
      ashtakvarga = computeAshtakvargaForChat(chartData, ashtakRules);
    } catch (err) {
      console.warn("[chat] ashtakvarga compute failed:", err);
    }
  }

  // Build the window-scoped context (dasha slice, clipped highlights,
  // projected slow-planet transits, Jaimini overlap, house SAV focus).
  // Fails open — a crash here must not kill the whole request.
  const classification = classifyQuestion(rules, trimmedQuestion);
  let windowContext;
  try {
    windowContext = buildWindowContext({
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
  } catch (err) {
    console.warn("[chat] buildWindowContext failed:", err);
    windowContext = undefined;
  }

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

      // Fetch last 10 messages (5 exchanges) before this question for context.
      // Exclude the just-saved user message; summarise compactly to save tokens.
      const priorMessages = await prisma.chatMessage.findMany({
        where: { sessionId, id: { not: userMessage.id } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { role: true, content: true },
      });
      const conversationSummary = buildConversationSummary(
        priorMessages.reverse(),
      );

      answer = await composeNaturalAnswer(facts, chartData, conversationSummary);
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

  // Wallet consume: FIFO from the oldest active balance. Admins skip.
  if (!isAdmin) {
    const result = await consumeQuestion(quotaIdentity);
    if (!result.ok) {
      // Should be impossible since we checked remaining > 0 above, but
      // guard against the rare race window where the only active balance
      // got exhausted between check and consume.
      console.warn("[chat] consumeQuestion failed:", result.reason);
    }
  }

  const quotaAfter = await getQuotaSummary(quotaIdentity);
  return Response.json({
    userMessage,
    assistantMessage,
    quota: quotaAfter,
    // Legacy fields for backward compat with the existing client. Will
    // remove after the UI migrates to reading `quota` directly.
    questionsUsed: quotaAfter.totalUsed,
    questionLimit: quotaAfter.totalLimit,
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

function computeAshtakvargaForChat(
  chartData: ChartResponse,
  rules: AshtakvargaRule[],
): AshtakvargaAnalysis {
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
