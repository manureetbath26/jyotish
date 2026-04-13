/**
 * Jaimini Predictive Engine
 *
 * Assembles the complete prediction checklist for Jaimini Chara Dasha analysis.
 * This is the master function that a practitioner runs before making predictions.
 *
 * Checklist (as per K.N. Rao method):
 * 1. List all 7 karakas (excluding Rahu/Ketu)
 * 2. Mark the Karakamsha in the birth horoscope
 * 3. Mark the Pada-Lagna (Arudha Lagna / AL) in the birth horoscope
 * 4. Mark the Upa-Pada (UL) in the birth horoscope
 * 5. Note the dasha order (direct/indirect), calculate dasha periods
 *    (with special rules for Scorpio and Aquarius)
 * 6. Calculate sub-periods carefully (own sign last)
 * 7. Note which house from birth lagna each dasha sign belongs to
 */

import type { ChartResponse } from "./api";
import {
  computeCharaKarakas,
  calculateKarakamsha,
  type KarakaResult,
  type KarakamshaResult,
} from "./karakaEngine";
import {
  calculateCharaDasha,
  calculatePadas,
  hasJaiminiAspect,
  getAspectingJaimini,
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  type Sign,
  type CharaDashaResult,
  type DashaPeriod,
  type SubPeriod,
  type PadaResult,
} from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Planet placement summary used throughout the engine */
export interface PlanetSummary {
  name: string;
  rashi: string;
  house: number;
  degree_in_rashi: number;
  is_retrograde: boolean;
  dignity: string | null;
  nakshatra: string;
  nakshatra_pada: number;
  lord_of_houses: number[];
}

/** Dasha period enriched with house-from-lagna info */
export interface EnrichedDashaPeriod {
  sign: Sign;
  lord: string;
  lordSign: Sign;
  duration: number;
  startDate: string;
  endDate: string;
  isCurrentPeriod: boolean;
  /** Which house number (1-12) this dasha sign is from the birth lagna */
  houseFromLagna: number;
  /** Planets occupying this dasha sign */
  planetsInSign: string[];
  /** Signs aspecting this dasha sign (Jaimini rashi drishti) */
  aspectsReceived: Sign[];
  /** Sub-periods with house info */
  subPeriods: EnrichedSubPeriod[];
}

/** Sub-period enriched with house-from-lagna */
export interface EnrichedSubPeriod {
  sign: Sign;
  lord: string;
  lordSign: Sign;
  duration: number;
  startDate: string;
  endDate: string;
  isCurrentSubPeriod: boolean;
  houseFromLagna: number;
  planetsInSign: string[];
  aspectsReceived: Sign[];
}

/** The complete prediction input — everything a Jaimini practitioner needs */
export interface JaiminiPredictionInput {
  // ── Birth data ──
  dateOfBirth: string;
  timeOfBirth: string;
  place: string;
  lagna: string;

  // ── Step 1: Seven Karakas ──
  karakas: KarakaResult[];

  // ── Step 2: Karakamsha ──
  karakamsha: KarakamshaResult | null;

  // ── Step 3: Pada-Lagna (Arudha Lagna / AL) ──
  arudhaLagna: PadaResult | null;

  // ── Step 4: Upa-Pada (UL) ──
  upaPada: PadaResult | null;

  // ── All 12 Padas for reference ──
  allPadas: PadaResult[];

  // ── Step 5 & 6: Dasha order, periods, sub-periods ──
  dashaDirection: "forward" | "backward";
  totalDashaYears: number;
  dashaSequence: EnrichedDashaPeriod[];

  // ── Current running periods ──
  currentDasha: EnrichedDashaPeriod | null;
  currentSubPeriod: EnrichedSubPeriod | null;
  currentSubSubSign: string | null;

  // ── Step 7: House mapping (sign → house from lagna) ──
  signToHouse: Record<string, number>;

  // ── Planet placements for quick lookup ──
  planets: PlanetSummary[];
  planetsBySign: Record<string, string[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute which house number (1-12) a sign is from the lagna.
 * Lagna sign = house 1, next sign = house 2, etc.
 */
function houseFromLagna(lagna: Sign, sign: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
}

/**
 * Build a map of sign → list of planet names placed in that sign.
 */
function buildPlanetsBySign(
  planets: { name: string; rashi: string }[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const sign of ZODIAC_ORDER) {
    map[sign] = [];
  }
  for (const p of planets) {
    if (map[p.rashi]) {
      map[p.rashi].push(p.name);
    }
  }
  return map;
}

/**
 * Build a sign → house number map for all 12 signs.
 */
function buildSignToHouseMap(lagna: Sign): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sign of ZODIAC_ORDER) {
    map[sign] = houseFromLagna(lagna, sign);
  }
  return map;
}

// ────────────────────────────────────────────────────────────────────────────
// Enrich dasha periods with house info, planets, and aspects
// ────────────────────────────────────────────────────────────────────────────

function enrichSubPeriod(
  sub: SubPeriod,
  lagna: Sign,
  planetsBySign: Record<string, string[]>,
): EnrichedSubPeriod {
  return {
    sign: sub.sign,
    lord: sub.lord,
    lordSign: sub.lordSign,
    duration: sub.duration,
    startDate: sub.startDate,
    endDate: sub.endDate,
    isCurrentSubPeriod: sub.isCurrentPeriod,
    houseFromLagna: houseFromLagna(lagna, sub.sign),
    planetsInSign: planetsBySign[sub.sign] || [],
    aspectsReceived: getAspectingJaimini(sub.sign),
  };
}

function enrichDashaPeriod(
  dasha: DashaPeriod,
  lagna: Sign,
  planetsBySign: Record<string, string[]>,
): EnrichedDashaPeriod {
  return {
    sign: dasha.sign,
    lord: dasha.lord,
    lordSign: dasha.lordSign,
    duration: dasha.duration,
    startDate: dasha.startDate,
    endDate: dasha.endDate,
    isCurrentPeriod: dasha.isCurrentPeriod,
    houseFromLagna: houseFromLagna(lagna, dasha.sign),
    planetsInSign: planetsBySign[dasha.sign] || [],
    aspectsReceived: getAspectingJaimini(dasha.sign),
    subPeriods: dasha.subPeriods.map((sub) =>
      enrichSubPeriod(sub, lagna, planetsBySign),
    ),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main Engine
// ────────────────────────────────────────────────────────────────────────────

/**
 * Prepare the complete Jaimini prediction input from a natal chart.
 *
 * This is the single entry point that assembles all 7 checklist items:
 *
 * 1. Computes 7 Chara Karakas (AK through DK)
 * 2. Finds the Karakamsha (AK's Navamsa sign)
 * 3. Marks the Arudha Lagna (Pada of 1st house)
 * 4. Marks the Upa-Pada (Pada of 12th house)
 * 5. Calculates dasha direction + all 12 major periods
 *    (handles Scorpio/Aquarius dual lordship)
 * 6. Calculates sub-periods (own sign last) and sub-sub-periods
 * 7. Tags every dasha/sub-period with its house from birth lagna
 *
 * @param chart  Full chart response from the backend
 * @returns      Complete prediction input ready for interpretation
 */
export function preparePredictionInput(
  chart: ChartResponse,
): JaiminiPredictionInput {
  const lagna = chart.lagna as Sign;

  // ── Step 1: Seven Karakas ──
  const karakas = computeCharaKarakas(chart.planets);

  // ── Step 2: Karakamsha ──
  const karakamsha = calculateKarakamsha(
    chart.planets,
    chart.navamsa_planets,
  );

  // ── Steps 3 & 4: Padas (AL and UL) ──
  const allPadas = calculatePadas(chart.houses, chart.planets);
  const arudhaLagna = allPadas.find((p) => p.house === 1) || null;   // AL
  const upaPada = allPadas.find((p) => p.house === 12) || null;      // UL

  // ── Steps 5 & 6: Dasha calculation ──
  const dashaResult: CharaDashaResult = calculateCharaDasha(chart);

  // ── Helper maps ──
  const planetsBySign = buildPlanetsBySign(chart.planets);
  const signToHouse = buildSignToHouseMap(lagna);

  // ── Step 7: Enrich every dasha with house-from-lagna, planets, aspects ──
  const enrichedSequence = dashaResult.dashaSequence.map((d) =>
    enrichDashaPeriod(d, lagna, planetsBySign),
  );

  // ── Find current running periods ──
  const currentDasha = enrichedSequence.find((d) => d.isCurrentPeriod) || null;
  const currentSubPeriod =
    currentDasha?.subPeriods.find((s) => s.isCurrentSubPeriod) || null;

  // Find current sub-sub-period from the original dasha result
  let currentSubSubSign: string | null = null;
  if (currentDasha) {
    const originalDasha = dashaResult.dashaSequence.find(
      (d) => d.isCurrentPeriod,
    );
    if (originalDasha) {
      const originalSub = originalDasha.subPeriods.find(
        (s) => s.isCurrentPeriod,
      );
      if (originalSub) {
        const currentSubSub = originalSub.subSubPeriods?.find(
          (ss) => ss.isCurrentPeriod,
        );
        currentSubSubSign = currentSubSub?.sign || null;
      }
    }
  }

  // ── Planet summaries ──
  const planets: PlanetSummary[] = chart.planets.map((p) => ({
    name: p.name,
    rashi: p.rashi,
    house: p.house,
    degree_in_rashi: p.degree_in_rashi,
    is_retrograde: p.is_retrograde,
    dignity: p.dignity,
    nakshatra: p.nakshatra,
    nakshatra_pada: p.nakshatra_pada,
    lord_of_houses: p.lord_of_houses,
  }));

  return {
    dateOfBirth: chart.date,
    timeOfBirth: chart.time,
    place: chart.place,
    lagna: chart.lagna,

    karakas,
    karakamsha,
    arudhaLagna,
    upaPada,
    allPadas,

    dashaDirection: dashaResult.direction,
    totalDashaYears: dashaResult.totalYears,
    dashaSequence: enrichedSequence,

    currentDasha,
    currentSubPeriod,
    currentSubSubSign,

    signToHouse,
    planets,
    planetsBySign,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Summary / display helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable summary of the prediction input.
 * Useful for logging, debugging, or displaying the checklist.
 */
export function summarizePredictionInput(
  input: JaiminiPredictionInput,
): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("  JAIMINI CHARA DASHA — PREDICTION CHECKLIST");
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`  DOB: ${input.dateOfBirth}  Time: ${input.timeOfBirth}`);
  lines.push(`  Place: ${input.place}`);
  lines.push(`  Lagna: ${input.lagna}`);
  lines.push("");

  // 1. Karakas
  lines.push("─── 1. SEVEN KARAKAS ───────────────────────────────────");
  for (const k of input.karakas) {
    lines.push(
      `  ${k.role.padEnd(16)} → ${k.planet.padEnd(8)} in ${k.rashi.padEnd(12)} (House ${k.house}, ${k.degree_in_rashi.toFixed(2)}°)`,
    );
  }
  lines.push("");

  // 2. Karakamsha
  lines.push("─── 2. KARAKAMSHA ──────────────────────────────────────");
  if (input.karakamsha) {
    lines.push(
      `  Atmakaraka: ${input.karakamsha.atmakaraka} (${input.karakamsha.atmakaraka_rashi})`,
    );
    lines.push(`  Karakamsha (AK's Navamsa): ${input.karakamsha.karakamsha}`);
  } else {
    lines.push("  Not available (Navamsa data missing)");
  }
  lines.push("");

  // 3. Arudha Lagna
  lines.push("─── 3. ARUDHA LAGNA (PADA-LAGNA / AL) ─────────────────");
  if (input.arudhaLagna) {
    lines.push(
      `  1st house (${input.arudhaLagna.houseSign}) → Lord ${input.arudhaLagna.lord} in ${input.arudhaLagna.lordPlacedIn}`,
    );
    lines.push(`  Arudha Lagna: ${input.arudhaLagna.padaSign}`);
  }
  lines.push("");

  // 4. Upa-Pada
  lines.push("─── 4. UPA-PADA (UL) ──────────────────────────────────");
  if (input.upaPada) {
    lines.push(
      `  12th house (${input.upaPada.houseSign}) → Lord ${input.upaPada.lord} in ${input.upaPada.lordPlacedIn}`,
    );
    lines.push(`  Upa-Pada: ${input.upaPada.padaSign}`);
  }
  lines.push("");

  // 5. Dasha direction & periods
  lines.push("─── 5. DASHA ORDER & PERIODS ───────────────────────────");
  lines.push(
    `  Direction: ${input.dashaDirection.toUpperCase()} (total ${input.totalDashaYears} years)`,
  );
  lines.push("");
  lines.push(
    "  Sign           Lord      Yrs   House  Start        End          Planets",
  );
  lines.push(
    "  ─────────────  ────────  ────  ─────  ───────────  ───────────  ──────────────",
  );
  for (const d of input.dashaSequence) {
    const marker = d.isCurrentPeriod ? " ◄" : "";
    const planetsStr = d.planetsInSign.join(", ") || "—";
    lines.push(
      `  ${d.sign.padEnd(13)}  ${d.lord.padEnd(8)}  ${String(d.duration).padStart(4)}  H${String(d.houseFromLagna).padStart(2)}   ${d.startDate}  ${d.endDate}  ${planetsStr}${marker}`,
    );
  }
  lines.push("");

  // 6. Current running periods
  lines.push("─── 6. CURRENT RUNNING PERIOD ──────────────────────────");
  if (input.currentDasha) {
    lines.push(
      `  Dasha:     ${input.currentDasha.sign} (House ${input.currentDasha.houseFromLagna})  ${input.currentDasha.startDate} → ${input.currentDasha.endDate}`,
    );
    if (input.currentSubPeriod) {
      lines.push(
        `  Sub:       ${input.currentSubPeriod.sign} (House ${input.currentSubPeriod.houseFromLagna})  ${input.currentSubPeriod.startDate} → ${input.currentSubPeriod.endDate}`,
      );
    }
    if (input.currentSubSubSign) {
      lines.push(`  Sub-Sub:   ${input.currentSubSubSign}`);
    }
  } else {
    lines.push("  No current period found for today's date.");
  }
  lines.push("");

  // 7. Sign → House mapping
  lines.push("─── 7. SIGN → HOUSE FROM LAGNA ────────────────────────");
  const houseLines: string[] = [];
  for (const sign of ZODIAC_ORDER) {
    houseLines.push(`${sign}=H${input.signToHouse[sign]}`);
  }
  // Print 4 per line
  for (let i = 0; i < houseLines.length; i += 4) {
    lines.push("  " + houseLines.slice(i, i + 4).join("  "));
  }
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
