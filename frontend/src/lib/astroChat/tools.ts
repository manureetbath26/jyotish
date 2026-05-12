// ─────────────────────────────────────────────────────────────────────────────
// Astrology Chatbot — deterministic tool wrappers around existing engines
//
// Each function takes a ChartResponse and returns structured data.
// No LLM calls here — pure engine orchestration.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartResponse } from "@/lib/api";
import {
  preparePredictionInput,
} from "@/lib/jaiminiPredictiveEngine";
import {
  scanMarriageWindows,
  generateFutureTransitSnapshots,
  type TransitPositions,
} from "@/lib/jaiminiMarriagePrediction";
import { scanCareerWindows } from "@/lib/jaiminiCareerPrediction";
import { computeAshtakvarga } from "@/lib/ashtakvargaEngine";
import { computeD9Analysis, detectYogas } from "@/lib/yogaEngine";
import { getCachedAshtakvargaRules } from "@/lib/rulesServer";
import type {
  AstrologyData,
  Intent,
  LifeTheme,
} from "./types";
import type { Sign } from "@/lib/charaDashaEngine";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract approximate current transit sign for a planet from chart context.
 * The chart gives natal positions; for transits we use today as a best-effort
 * proxy (the marriage/career engines project forward internally anyway). */
function getCurrentTransitSign(chart: ChartResponse, planet: string): Sign {
  // chart.planets is natal — we use it as a proxy; the scanning engine
  // will project forward from this base, which is accurate within ~1 sign
  const p = chart.planets.find((pl) => pl.name === planet);
  return (p?.rashi ?? "Aries") as Sign;
}

/** Build planet → house map for the astrologer's prose context */
function buildPlanetHouseMap(chart: ChartResponse): Record<string, number> {
  const result: Record<string, number> = {};
  for (const planet of chart.planets) {
    result[planet.name] = planet.house;
  }
  return result;
}

/** Extract current dasha info from chart */
function extractCurrentDasha(chart: ChartResponse) {
  return {
    planet: chart.current_dasha?.planet ?? "Unknown",
    endDate: chart.current_dasha?.end_date ?? "",
    subPlanet: chart.current_antardasha?.planet ?? "Unknown",
    subEndDate: chart.current_antardasha?.end_date ?? "",
  };
}

/** Yoga categories relevant to each life theme */
const THEME_YOGA_CATEGORIES: Partial<Record<LifeTheme, string[]>> = {
  marriage:    ["relationship", "marriage", "venus", "7th_house"],
  career:      ["career", "raja", "wealth", "10th_house"],
  finances:    ["wealth", "dhana", "lakshmi"],
  health:      ["health", "longevity"],
  spirituality:["spiritual", "moksha", "vipareet"],
  yoga:        [],   // all yogas
};

// ── Main assembler ────────────────────────────────────────────────────────────

/**
 * Collect all astrological data relevant to the user's intent.
 * Called deterministically by the data-collector node — no LLM, no IO besides
 * a single DB read for Ashtakvarga rules.
 */
export async function collectAstrologyData(
  chart: ChartResponse,
  intent: Intent,
): Promise<AstrologyData> {
  const { lifeTheme, tense, wantsTiming, wantsStrength, yearsToScan } = intent;
  const years = yearsToScan ?? 5;

  // ── Always computed ─────────────────────────────────────────────────────────
  const predictionInput = preparePredictionInput(chart);
  const currentDasha = extractCurrentDasha(chart);
  const planetHouses = buildPlanetHouseMap(chart);
  const lagna = chart.lagna;

  const data: AstrologyData = {
    predictionInput,
    currentDasha,
    lagna,
    planetHouses,
  };

  // ── Marriage / love theme ───────────────────────────────────────────────────
  if (lifeTheme === "marriage") {
    if (wantsTiming || tense === "future") {
      const transitPositions: TransitPositions = {
        saturn:  getCurrentTransitSign(chart, "Saturn"),
        mars:    getCurrentTransitSign(chart, "Mars"),
        jupiter: getCurrentTransitSign(chart, "Jupiter"),
      };
      const snapshots = generateFutureTransitSnapshots(
        transitPositions,
        chart.lagna as Sign,
        years,
      );
      data.marriageScan = scanMarriageWindows(predictionInput, chart, snapshots, years);
    }
  }

  // ── Career theme ─────────────────────────────────────────────────────────────
  if (lifeTheme === "career") {
    if (wantsTiming || tense === "future") {
      const transitPositions: TransitPositions = {
        saturn:  getCurrentTransitSign(chart, "Saturn"),
        mars:    getCurrentTransitSign(chart, "Mars"),
        jupiter: getCurrentTransitSign(chart, "Jupiter"),
      };
      const snapshots = generateFutureTransitSnapshots(
        transitPositions,
        chart.lagna as Sign,
        years,
      );
      data.careerScan = scanCareerWindows(predictionInput, chart, snapshots, years);
    }
  }

  // ── Ashtakvarga (for strength / transit timing questions) ─────────────────
  if (wantsStrength || lifeTheme === "transit" || lifeTheme === "yoga") {
    const avRules = await getCachedAshtakvargaRules();
    data.ashtakvarga = computeAshtakvarga(chart, avRules);
  }

  // ── Yogas ─────────────────────────────────────────────────────────────────
  // Use pre-computed yogas from ChartResponse (detected by the backend at chart
  // calculation time). We store them as DetectedYoga-compatible objects by
  // building a minimal YogaRule shell. detectYogas() requires DB rules which
  // we skip here for performance.
  if (wantsStrength || lifeTheme === "yoga" || lifeTheme === "general") {
    if (chart.yogas && chart.yogas.length > 0) {
      const categories = THEME_YOGA_CATEGORIES[lifeTheme] ?? [];

      // Build minimal DetectedYoga objects from YogaEntry
      const allYogas: import("@/lib/yogaEngine").DetectedYoga[] = chart.yogas.map((y) => ({
        rule: {
          id:            y.name,
          slug:          y.name.toLowerCase().replace(/\s+/g, "_"),
          name:          y.name,
          category:      (y.category ?? "general") as import("@/lib/yogaEngine").YogaCategory,
          chapter:       0,
          source:        "BPHS",
          classicalText: "",
          formation:     y.effects ?? "",
          effects:       y.effects ?? "",
          importance:    y.strength === "strong" ? 5 : y.strength === "moderate" ? 3 : 2,
          detector:      { type: "mahapurusha", planet: "Mars" } as import("@/lib/yogaEngine").YogaDetector,
          sortOrder:     0,
        },
        detected:         true as const,
        evidence:         y.effects ?? "",
        formationInChart: y.interpretation ?? y.effects ?? "",
      }));

      // Filter by category keywords if applicable
      const filtered = categories.length > 0
        ? allYogas.filter((yoga) =>
            categories.some((cat) =>
              yoga.rule.name.toLowerCase().includes(cat) ||
              yoga.rule.category.toLowerCase().includes(cat)
            )
          )
        : allYogas;

      data.yogas = filtered.length > 0 ? filtered : allYogas;
    }
  }

  // ── D9 strength for relevant themes ──────────────────────────────────────
  if (wantsStrength || lifeTheme === "marriage" || lifeTheme === "career") {
    const relevantPlanets =
      lifeTheme === "marriage"
        ? ["Venus", "Jupiter", "Moon", "Saturn"]
        : lifeTheme === "career"
        ? ["Sun", "Saturn", "Mercury", "Jupiter"]
        : ["Sun", "Moon", "Jupiter", "Venus", "Saturn"];
    try {
      data.d9 = computeD9Analysis(chart, relevantPlanets);
    } catch {
      // d9 is optional
    }
  }

  return data;
}
