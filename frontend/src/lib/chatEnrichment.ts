/**
 * Chat enrichment — computes insights from the Jaimini and Ashtakvarga
 * engines for a given chart, to be injected into chat answers.
 *
 * Runs server-side at question time. Uses the fallback transit projector
 * (no external API dependency) — accuracy is sign-level which is enough
 * for the conversational tone of the chat.
 */

import type { ChartResponse } from "./api";
import { preparePredictionInput } from "./jaiminiPredictiveEngine";
import {
  scanMarriageWindows,
  generateFutureTransitSnapshots,
  type MarriageWindow,
  type TransitPositions,
} from "./jaiminiMarriagePrediction";
import {
  scanCareerWindows,
  type CareerWindow,
} from "./jaiminiCareerPrediction";
import {
  computeAshtakvarga,
  type AshtakvargaRule,
  ASHTAKVARGA_PLANETS,
} from "./ashtakvargaEngine";
import { SIGN_INDEX, ZODIAC_ORDER, type Sign } from "./charaDashaEngine";
import { prisma } from "./prisma";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface MarriageInsight {
  peakWindow: MarriageWindow | null;
  upcomingWindows: MarriageWindow[]; // up to 3 windows in next 5 years, score >= 3
  // Ashtakvarga natal signals
  seventhSav: number;
  ulSav: number;
  secondFromUlSav: number;
  venusIn7: number;     // 0-8
  saturnIn7: number;    // 0-8
  jupiterIn7: number;   // 0-8
  overallNatal: "Strong" | "Average" | "Weak";
}

export interface CareerInsight {
  peakWindow: CareerWindow | null;
  upcomingWindows: CareerWindow[];
  tenthSav: number;
  eleventhSav: number;
  a10Sav: number;
  amkPlanet: string;
  amkIn10: number;      // 0-8
  sunIn10: number;      // 0-8
  saturnIn10: number;   // 0-8
  jupiterIn10: number;  // 0-8
  overallNatal: "Strong" | "Average" | "Weak";
  /** Classical 11th vs 10th: > 0 means business-friendly, < 0 job-friendly */
  businessVsJob: number;
}

export interface HouseSav {
  house: number;
  sign: Sign;
  bindus: number;
  strength: "Weak" | "Average" | "Strong";
}

export interface EnrichedChatContext {
  lagnaSign: Sign;
  marriage: MarriageInsight | null;
  career: CareerInsight | null;
  /** Per-house SAV for every house 1-12, for answering wealth/property/education/etc */
  houseSav: HouseSav[];
  /** Grand total SAV for quick context */
  sarvaTotal: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Main computation
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

function savStrength(bindus: number): "Weak" | "Average" | "Strong" {
  if (bindus <= 22) return "Weak";
  if (bindus <= 28) return "Average";
  return "Strong";
}

export async function computeChatEnrichment(
  chart: ChartResponse,
): Promise<EnrichedChatContext> {
  const lagnaSign = chart.lagna as Sign;
  const predInput = preparePredictionInput(chart);

  // ── Transit snapshots for the next 5 years (fallback projector) ──
  const getNatalSign = (name: string): Sign => {
    const p = chart.planets.find((pl) => pl.name === name);
    return (p?.rashi || "Aries") as Sign;
  };
  const transit: TransitPositions = {
    saturn: getNatalSign("Saturn"),
    mars: getNatalSign("Mars"),
    jupiter: getNatalSign("Jupiter"),
  };
  const snapshots = generateFutureTransitSnapshots(transit, lagnaSign, 5);

  // ── Marriage windows (5 years) ──
  let marriage: MarriageInsight | null = null;
  try {
    const marriageScan = scanMarriageWindows(predInput, chart, snapshots, 5);
    const windows = marriageScan.windows.filter((w) => w.peakScore >= 3);
    const peak = windows.length
      ? windows.reduce((a, b) => (b.peakScore > a.peakScore ? b : a))
      : null;
    marriage = { peakWindow: peak, upcomingWindows: windows.slice(0, 3) } as MarriageInsight;
  } catch {
    marriage = null;
  }

  // ── Career windows (5 years) ──
  let career: CareerInsight | null = null;
  try {
    const careerScan = scanCareerWindows(predInput, chart, snapshots, 5);
    const windows = careerScan.windows.filter((w) => w.peakScore >= 3);
    const peak = windows.length
      ? windows.reduce((a, b) => (b.peakScore > a.peakScore ? b : a))
      : null;
    career = {
      peakWindow: peak,
      upcomingWindows: windows.slice(0, 3),
    } as CareerInsight;
  } catch {
    career = null;
  }

  // ── Ashtakvarga (load rules from DB) ──
  let houseSav: HouseSav[] = [];
  let sarvaTotal = 0;
  try {
    const rulesRaw = await prisma.ashtakvargaRule.findMany({
      select: { planet: true, source: true, houses: true },
    });
    const rules: AshtakvargaRule[] = rulesRaw.map((r) => ({
      planet: r.planet as AshtakvargaRule["planet"],
      source: r.source as AshtakvargaRule["source"],
      houses: r.houses,
    }));

    if (rules.length >= 56) {
      const analysis = computeAshtakvarga(chart, rules);
      const sav = analysis.sarvashtakvarga.signTotals;
      sarvaTotal = analysis.sarvashtakvarga.grandTotal;

      // Build per-house signal
      for (let h = 1; h <= 12; h++) {
        const signIdx = (SIGN_INDEX[lagnaSign] + h - 1) % 12;
        const sign = ZODIAC_ORDER[signIdx];
        const bindus = sav[signIdx];
        houseSav.push({
          house: h,
          sign,
          bindus,
          strength: savStrength(bindus),
        });
      }

      // BAV per planet in a sign — helper
      const bavIn = (planet: string, sign: Sign): number => {
        const idx = ASHTAKVARGA_PLANETS.indexOf(
          planet as (typeof ASHTAKVARGA_PLANETS)[number],
        );
        if (idx < 0) return 0;
        return analysis.prastharaCharts[idx].signTotals[SIGN_INDEX[sign]] ?? 0;
      };

      // Marriage natal signals
      if (marriage) {
        const ulSign = (predInput.upaPada?.padaSign || signAtOffset(lagnaSign, 12)) as Sign;
        const seventhSign = signAtOffset(lagnaSign, 7);
        const secondFromUl = signAtOffset(ulSign, 2);
        marriage.seventhSav = sav[SIGN_INDEX[seventhSign]] ?? 0;
        marriage.ulSav = sav[SIGN_INDEX[ulSign]] ?? 0;
        marriage.secondFromUlSav = sav[SIGN_INDEX[secondFromUl]] ?? 0;
        marriage.venusIn7 = bavIn("Venus", seventhSign);
        marriage.saturnIn7 = bavIn("Saturn", seventhSign);
        marriage.jupiterIn7 = bavIn("Jupiter", seventhSign);

        const positives =
          (marriage.seventhSav > 22 ? 1 : 0) +
          (marriage.ulSav > 22 ? 1 : 0) +
          (marriage.secondFromUlSav > 22 ? 1 : 0) +
          (marriage.venusIn7 >= 3 ? 1 : 0) +
          (marriage.jupiterIn7 >= 3 ? 1 : 0);
        marriage.overallNatal =
          positives >= 4 ? "Strong" : positives >= 3 ? "Average" : "Weak";
      }

      // Career natal signals
      if (career) {
        const tenthSign = signAtOffset(lagnaSign, 10);
        const eleventhSign = signAtOffset(lagnaSign, 11);
        const a10Pada = predInput.allPadas.find((p) => p.house === 10);
        const a10Sign = (a10Pada?.padaSign || tenthSign) as Sign;
        const amk = predInput.karakas.find((k) => k.role === "Amatyakaraka");
        const amkPlanet = amk?.planet || "Mercury";

        career.tenthSav = sav[SIGN_INDEX[tenthSign]] ?? 0;
        career.eleventhSav = sav[SIGN_INDEX[eleventhSign]] ?? 0;
        career.a10Sav = sav[SIGN_INDEX[a10Sign]] ?? 0;
        career.amkPlanet = amkPlanet;
        career.amkIn10 = bavIn(amkPlanet, tenthSign);
        career.sunIn10 = bavIn("Sun", tenthSign);
        career.saturnIn10 = bavIn("Saturn", tenthSign);
        career.jupiterIn10 = bavIn("Jupiter", tenthSign);
        career.businessVsJob = career.eleventhSav - career.tenthSav;

        const housePos =
          (career.tenthSav > 22 ? 1 : 0) +
          (career.eleventhSav > 22 ? 1 : 0) +
          (career.a10Sav > 22 ? 1 : 0);
        const planetPos =
          (career.amkIn10 >= 3 ? 1 : 0) +
          (career.sunIn10 >= 3 ? 1 : 0) +
          (career.saturnIn10 >= 3 ? 1 : 0) +
          (career.jupiterIn10 >= 3 ? 1 : 0);
        career.overallNatal =
          housePos >= 2 && planetPos >= 2 ? "Strong"
          : housePos >= 1 || planetPos >= 2 ? "Average"
          : "Weak";
      }
    }
  } catch {
    // Fail open — chat still works without Ashtakvarga
  }

  return {
    lagnaSign,
    marriage,
    career,
    houseSav,
    sarvaTotal,
  };
}
