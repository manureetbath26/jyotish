import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ChartResponse, CurrentTransitResponse } from "@/lib/api";
import { computeAshtakvarga, type AshtakvargaRule } from "@/lib/ashtakvargaEngine";
import { extractDailyFacts, type DailyFacts } from "@/lib/dailyEngine";
import { getChatRules } from "@/lib/rulesServer";
import {
  composeDailyReading,
  composeDailyTemplate,
  isDailyComposerAvailable,
  type DailyTone,
} from "@/lib/dailyComposer";

export const dynamic = "force-dynamic";

const VALID_TONES = new Set<DailyTone>(["thoughtful", "coffee", "classical"]);

function todayISODate(): string {
  // Strict "today" in UTC — good enough for daily cache dedupe. A stricter
  // per-user-TZ implementation can layer on later if needed.
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/daily?profileId=...&tone=thoughtful
 *
 * Returns today's reading for the active profile. Cached per
 * (profile, date, tone) — one LLM call per user per day per tone.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const toneParam = (searchParams.get("tone") ?? "thoughtful") as DailyTone;
  const tone: DailyTone = VALID_TONES.has(toneParam) ? toneParam : "thoughtful";

  if (!profileId) {
    return Response.json({ error: "profileId required" }, { status: 400 });
  }

  // Ownership check
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { chart: true },
  });
  if (!profile || profile.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!profile.chart) {
    return Response.json({ error: "Profile has no cached chart" }, { status: 409 });
  }

  const readingDate = todayISODate();

  // Cache hit?
  const cached = await prisma.dailyReading.findUnique({
    where: {
      profileId_readingDate_tone: { profileId, readingDate, tone },
    },
  });
  if (cached) {
    return Response.json({
      cached: true,
      readingDate,
      tone,
      reading: cached.reading,
      facts: cached.facts,
    });
  }

  // ── Compute today's facts ─────────────────────────────────────────────────
  const natal = profile.chart.chartData as unknown as ChartResponse;

  // 1. Today's transits (via backend)
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const transitRes = await fetch(`${backendUrl}/api/chart/current-transits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ayanamsha_value: natal.ayanamsha_value,
      natal_lagna_degree: natal.lagna_degree,
    }),
  });
  if (!transitRes.ok) {
    return Response.json(
      { error: `Failed to compute today's transits (${transitRes.status})` },
      { status: 502 },
    );
  }
  const transits = (await transitRes.json()) as CurrentTransitResponse;

  // 2. Ashtakvarga (for BAV gochara thresholds)
  const rulesRaw = await prisma.ashtakvargaRule.findMany();
  const rules: AshtakvargaRule[] = rulesRaw.map((r) => ({
    planet: r.planet as AshtakvargaRule["planet"],
    source: r.source as AshtakvargaRule["source"],
    houses: r.houses,
  }));
  const ashtakvarga = computeAshtakvarga(natal, rules);

  // 3. Extract structured facts (DB-backed interpretive rules)
  const chatRules = await getChatRules();
  const facts: DailyFacts = extractDailyFacts(
    natal,
    transits,
    ashtakvarga,
    profile.name,
    chatRules,
  );

  // 4. Compose — LLM if configured, template fallback otherwise
  let reading: string;
  if (isDailyComposerAvailable()) {
    try {
      reading = await composeDailyReading(facts, tone);
    } catch (err) {
      console.warn("[daily] LLM compose failed, using template:", err);
      reading = composeDailyTemplate(facts);
    }
  } else {
    reading = composeDailyTemplate(facts);
  }

  // 5. Cache
  await prisma.dailyReading.create({
    data: {
      profileId,
      readingDate,
      tone,
      facts: facts as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
      reading,
    },
  });

  return Response.json({
    cached: false,
    readingDate,
    tone,
    reading,
    facts,
  });
}
