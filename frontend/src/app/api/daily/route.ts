import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ChartResponse, CurrentTransitResponse } from "@/lib/api";
import { computeAshtakvarga } from "@/lib/ashtakvargaEngine";
import { getChatRules, getCachedAshtakvargaRules, getCachedMoonTransitRules } from "@/lib/rulesServer";
import { extractDailyFacts, type DailyFacts } from "@/lib/dailyEngine";
import {
  composeDailyReading,
  composeDailyTemplate,
  isDailyComposerAvailable,
  type DailyTone,
} from "@/lib/dailyComposer";

export const dynamic = "force-dynamic";

const VALID_TONES = new Set<DailyTone>(["thoughtful", "coffee", "classical"]);
const MAX_DAYS_AHEAD = 5;

/** Bump this whenever backend chart computation logic changes. */
const CURRENT_CHART_VERSION = 2;

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validate a requested date string: must be YYYY-MM-DD, today or up to
 * MAX_DAYS_AHEAD in the future (UTC). Returns the validated ISO string or
 * null if invalid/out-of-range.
 */
function validateReadingDate(dateParam: string | null): string | null {
  if (!dateParam) return todayISODate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null;
  const today = new Date(todayISODate());
  const requested = new Date(dateParam);
  if (isNaN(requested.getTime())) return null;
  const diffDays = Math.round((requested.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0 || diffDays > MAX_DAYS_AHEAD) return null;
  return dateParam;
}

/**
 * GET /api/daily?profileId=...&tone=thoughtful&date=YYYY-MM-DD
 *
 * Returns the reading for the given date (today by default, up to 5 days ahead).
 * Cached per (profile, date, tone) — one LLM call per unique combination.
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

  const readingDate = validateReadingDate(searchParams.get("date"));
  if (!readingDate) {
    return Response.json(
      { error: `date must be today or within ${MAX_DAYS_AHEAD} days ahead (YYYY-MM-DD)` },
      { status: 400 },
    );
  }

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

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Chart freshness check (must run before DailyReading cache hit) ─────────
  // If the stored natal chart is below CURRENT_CHART_VERSION it was produced by
  // an older computation (e.g. wrong Gulika table).  Recompute it here so the
  // daily reading uses accurate house data, then delete today's DailyReading so
  // it gets regenerated from the fresh chart.
  let natalChartData = profile.chart.chartData as Record<string, unknown>;
  const chartVersion =
    typeof natalChartData._chart_version === "number" ? natalChartData._chart_version : 0;

  if (chartVersion < CURRENT_CHART_VERSION) {
    try {
      const freshRes = await fetch(`${backendUrl}/api/chart/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: profile.dateOfBirth,
          time: profile.timeOfBirth,
          place: profile.placeOfBirth,
        }),
      });
      if (freshRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const freshData = (await freshRes.json()) as any;
        // Persist refreshed chart
        await prisma.profileChart.upsert({
          where: { profileId: profile.id },
          create: { profileId: profile.id, chartData: freshData },
          update: { chartData: freshData },
        });
        // Bust today's reading — it was built from stale data
        await prisma.dailyReading.deleteMany({ where: { profileId, readingDate } });
        natalChartData = freshData;
      }
    } catch {
      // Best-effort: if backend is unreachable proceed with stale data rather
      // than returning an error for the daily reading.
    }
  }

  // ── Cache hit? (after freshness check so stale reads are already deleted) ──
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
  const natal = natalChartData as unknown as ChartResponse;

  // Steps 1–4 are independent — run them in parallel.
  //   1. Today's transits from the Python backend
  //   2. Ashtakvarga rules (cached in-process, ~56 static rows)
  //   3. Chat / interpretive rules (cached in-process)
  //   4. Moon transit rules (cached in-process, 36 rows)
  const [transitRes, ashtakRules, chatRules, moonTransitRules] = await Promise.all([
    fetch(`${backendUrl}/api/chart/current-transits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ayanamsha_value: natal.ayanamsha_value,
        natal_lagna_degree: natal.lagna_degree,
        transit_date: readingDate,
      }),
    }),
    getCachedAshtakvargaRules(),
    getChatRules(),
    getCachedMoonTransitRules(),
  ]);

  if (!transitRes.ok) {
    return Response.json(
      { error: `Failed to compute today's transits (${transitRes.status})` },
      { status: 502 },
    );
  }
  const transits = (await transitRes.json()) as CurrentTransitResponse;
  const ashtakvarga = computeAshtakvarga(natal, ashtakRules);
  const facts: DailyFacts = extractDailyFacts(
    natal,
    transits,
    ashtakvarga,
    profile.name,
    chatRules,
    undefined,
    moonTransitRules,
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
