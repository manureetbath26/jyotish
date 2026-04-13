/**
 * Jaimini Argala (Planetary/Sign Intervention) Calculator
 *
 * Argala means planetary/sign intervention. Every planet has the power to
 * influence the affairs of every other planet or house, even without
 * ownership, aspect, or conjunction.
 *
 * Rules:
 * (a) Every planet can influence every other planet/house via Argala.
 *
 * (b) PRIMARY ARGALA (direct intervention):
 *     Bodies in the 2nd, 4th, and 11th house from any planet/sign.
 *
 * (c) VIRODHA ARGALA (obstruction):
 *     Bodies in the 12th, 10th, and 3rd house obstruct the Argala
 *     from the 2nd, 4th, and 11th house respectively.
 *
 * Obstruction rule: Virodha Argala cancels Primary Argala only when
 * the obstructing house has equal or more planets than the Argala house.
 * If the Argala house has more planets, the Argala prevails despite obstruction.
 */

import type { ChartResponse, PlanetPosition, HouseInfo } from "./api";
import {
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  type Sign,
} from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/**
 * Primary Argala houses and their corresponding Virodha (obstruction) houses.
 * Offset is counted from the reference sign (1 = same sign).
 *
 *   Argala from  →  Obstructed by
 *   2nd house    →  12th house
 *   4th house    →  10th house
 *   11th house   →  3rd house
 */
const ARGALA_PAIRS: { argalaOffset: number; virodhaOffset: number; label: string }[] = [
  { argalaOffset: 2,  virodhaOffset: 12, label: "2nd house (Dhana Argala)" },
  { argalaOffset: 4,  virodhaOffset: 10, label: "4th house (Sukha Argala)" },
  { argalaOffset: 11, virodhaOffset: 3,  label: "11th house (Labha Argala)" },
];

/** Natural benefics for strength assessment */
const NATURAL_BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);

/** Natural malefics for strength assessment */
const NATURAL_MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]);

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** A single Argala relationship from one house to a reference */
export interface ArgalaEntry {
  /** "2nd house (Dhana Argala)" / "4th house (Sukha Argala)" / "11th house (Labha Argala)" */
  type: string;
  /** The sign causing the Argala */
  argalaSign: Sign;
  /** Planets in the Argala sign */
  argalaPlanets: string[];
  /** The sign causing Virodha (obstruction) */
  virodhaSign: Sign;
  /** Planets in the Virodha sign */
  virodhaPlanets: string[];
  /** Is the Argala effective (not obstructed)? */
  isEffective: boolean;
  /** Reason: "unobstructed", "argala prevails (more planets)", or "obstructed by virodha" */
  status: string;
}

/** Complete Argala analysis for a single reference point (sign or planet) */
export interface ArgalaResult {
  /** The reference sign being analysed */
  referenceSign: Sign;
  /** If this is a planet-based analysis, the planet name; null for house-based */
  referencePlanet: string | null;
  /** House number from lagna (1-12), if applicable */
  houseFromLagna: number | null;
  /** All three Argala entries (2nd, 4th, 11th) */
  argalas: ArgalaEntry[];
  /** Summary: signs/planets that effectively intervene in this reference's affairs */
  effectiveArgalaPlanets: string[];
  /** Summary: signs/planets causing effective obstruction */
  effectiveVirodhaPlanets: string[];
}

/** Full Argala report for the entire chart */
export interface ArgalaReport {
  /** Argala analysis for all 12 houses (signs from lagna) */
  byHouse: ArgalaResult[];
  /** Argala analysis for each planet */
  byPlanet: ArgalaResult[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the sign at a given offset from a reference sign.
 * Offset 1 = same sign, 2 = next sign, etc.
 */
function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

/**
 * Build a map of sign → list of planet names placed in that sign.
 */
function buildPlanetsBySign(
  planets: PlanetPosition[],
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
 * Compute which house number (1-12) a sign is from the lagna.
 */
function houseFromLagna(lagna: Sign, sign: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
}

// ────────────────────────────────────────────────────────────────────────────
// Core Argala computation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Argala for a single reference sign.
 *
 * For each of the three Argala pairs (2nd/12th, 4th/10th, 11th/3rd):
 * - Identify planets in the Argala house and Virodha house
 * - If Argala house has planets and Virodha house has fewer → Argala effective
 * - If Virodha house has equal or more planets → Argala obstructed
 * - If Argala house is empty → no Argala from that house
 */
function computeArgalaForSign(
  referenceSign: Sign,
  referencePlanet: string | null,
  houseNum: number | null,
  planetsBySign: Record<string, string[]>,
): ArgalaResult {
  const argalas: ArgalaEntry[] = [];
  const effectiveArgalaPlanets: string[] = [];
  const effectiveVirodhaPlanets: string[] = [];

  for (const pair of ARGALA_PAIRS) {
    const argalaSign = signAtOffset(referenceSign, pair.argalaOffset);
    const virodhaSign = signAtOffset(referenceSign, pair.virodhaOffset);

    const argalaPlanets = planetsBySign[argalaSign] || [];
    const virodhaPlanets = planetsBySign[virodhaSign] || [];

    let isEffective = false;
    let status: string;

    if (argalaPlanets.length === 0) {
      // No planets in the Argala house → no Argala from this house
      status = "no argala (empty)";
    } else if (virodhaPlanets.length === 0) {
      // Argala exists, no obstruction
      isEffective = true;
      status = "unobstructed";
    } else if (argalaPlanets.length > virodhaPlanets.length) {
      // Argala house has more planets → Argala prevails
      isEffective = true;
      status = `argala prevails (${argalaPlanets.length} vs ${virodhaPlanets.length} obstructing)`;
    } else {
      // Virodha has equal or more planets → Argala obstructed
      isEffective = false;
      status = `obstructed by virodha (${virodhaPlanets.length} vs ${argalaPlanets.length} argala)`;
    }

    argalas.push({
      type: pair.label,
      argalaSign,
      argalaPlanets,
      virodhaSign,
      virodhaPlanets,
      isEffective,
      status,
    });

    if (isEffective) {
      effectiveArgalaPlanets.push(...argalaPlanets);
    }
    // Track virodha planets that successfully obstruct
    if (!isEffective && argalaPlanets.length > 0 && virodhaPlanets.length > 0) {
      effectiveVirodhaPlanets.push(...virodhaPlanets);
    }
  }

  return {
    referenceSign,
    referencePlanet,
    houseFromLagna: houseNum,
    argalas,
    effectiveArgalaPlanets: Array.from(new Set(effectiveArgalaPlanets)),
    effectiveVirodhaPlanets: Array.from(new Set(effectiveVirodhaPlanets)),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Argala for all 12 houses in the chart.
 *
 * For each house (sign from lagna), determines:
 * - Which planets in the 2nd, 4th, 11th from that sign cause Primary Argala
 * - Which planets in the 12th, 10th, 3rd cause Virodha Argala (obstruction)
 * - Whether the Argala is effective or obstructed
 *
 * @param chart  Full chart response
 * @returns      ArgalaResult[] for all 12 houses
 */
export function calculateArgalaByHouse(
  chart: ChartResponse,
): ArgalaResult[] {
  const lagna = chart.lagna as Sign;
  const planetsBySign = buildPlanetsBySign(chart.planets);

  const results: ArgalaResult[] = [];

  for (let h = 0; h < 12; h++) {
    const sign = ZODIAC_ORDER[(SIGN_INDEX[lagna] + h) % 12] as Sign;
    const houseNum = h + 1;
    results.push(
      computeArgalaForSign(sign, null, houseNum, planetsBySign),
    );
  }

  return results;
}

/**
 * Calculate Argala for all planets in the chart.
 *
 * For each planet, uses its occupied sign as the reference and determines
 * which other planets cause Argala (intervention) on it.
 *
 * @param chart  Full chart response
 * @returns      ArgalaResult[] for each planet
 */
export function calculateArgalaByPlanet(
  chart: ChartResponse,
): ArgalaResult[] {
  const lagna = chart.lagna as Sign;
  const planetsBySign = buildPlanetsBySign(chart.planets);

  return chart.planets.map((planet) => {
    const sign = planet.rashi as Sign;
    const houseNum = houseFromLagna(lagna, sign);
    return computeArgalaForSign(sign, planet.name, houseNum, planetsBySign);
  });
}

/**
 * Calculate the complete Argala report — both house-wise and planet-wise.
 *
 * @param chart  Full chart response
 * @returns      ArgalaReport with byHouse and byPlanet analyses
 */
export function calculateArgala(chart: ChartResponse): ArgalaReport {
  return {
    byHouse: calculateArgalaByHouse(chart),
    byPlanet: calculateArgalaByPlanet(chart),
  };
}

/**
 * Quick lookup: get all effective Argala planets acting on a specific sign.
 * Useful during dasha analysis to see which planets subtly influence a dasha sign.
 *
 * @param targetSign    The sign to check Argala on
 * @param planets       Planet positions from the chart
 * @returns             List of planet names with effective Argala on the target
 */
export function getEffectiveArgalaOnSign(
  targetSign: Sign,
  planets: PlanetPosition[],
): { planet: string; fromHouse: string; argalaType: string }[] {
  const planetsBySign = buildPlanetsBySign(planets);
  const results: { planet: string; fromHouse: string; argalaType: string }[] = [];

  for (const pair of ARGALA_PAIRS) {
    const argalaSign = signAtOffset(targetSign, pair.argalaOffset);
    const virodhaSign = signAtOffset(targetSign, pair.virodhaOffset);

    const argalaPlanets = planetsBySign[argalaSign] || [];
    const virodhaPlanets = planetsBySign[virodhaSign] || [];

    // Argala effective if argala house has more planets than virodha
    const effective = argalaPlanets.length > 0 &&
      argalaPlanets.length > virodhaPlanets.length;

    // Also effective if virodha is empty
    const unobstructed = argalaPlanets.length > 0 && virodhaPlanets.length === 0;

    if (effective || unobstructed) {
      for (const name of argalaPlanets) {
        results.push({
          planet: name,
          fromHouse: argalaSign,
          argalaType: pair.label,
        });
      }
    }
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// Summary / display
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable summary of the Argala report.
 */
export function summarizeArgala(report: ArgalaReport, lagna: string): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("  JAIMINI ARGALA ANALYSIS");
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("");

  // House-wise
  lines.push("─── ARGALA BY HOUSE ────────────────────────────────────");
  for (const result of report.byHouse) {
    const hLabel = `House ${result.houseFromLagna} (${result.referenceSign})`;
    const effective = result.effectiveArgalaPlanets;
    const obstructed = result.effectiveVirodhaPlanets;

    if (effective.length === 0 && result.argalas.every(a => a.argalaPlanets.length === 0)) {
      lines.push(`  ${hLabel}: No Argala`);
      continue;
    }

    lines.push(`  ${hLabel}:`);
    for (const a of result.argalas) {
      if (a.argalaPlanets.length === 0) continue;
      const mark = a.isEffective ? "✓" : "✗";
      lines.push(
        `    ${mark} ${a.type}: ${a.argalaPlanets.join(", ")} in ${a.argalaSign} — ${a.status}`,
      );
      if (a.virodhaPlanets.length > 0) {
        lines.push(
          `      Virodha: ${a.virodhaPlanets.join(", ")} in ${a.virodhaSign}`,
        );
      }
    }
  }
  lines.push("");

  // Planet-wise
  lines.push("─── ARGALA BY PLANET ───────────────────────────────────");
  for (const result of report.byPlanet) {
    const pLabel = `${result.referencePlanet} (${result.referenceSign}, H${result.houseFromLagna})`;
    const hasAnyArgala = result.argalas.some(a => a.argalaPlanets.length > 0);

    if (!hasAnyArgala) {
      lines.push(`  ${pLabel}: No Argala`);
      continue;
    }

    lines.push(`  ${pLabel}:`);
    for (const a of result.argalas) {
      if (a.argalaPlanets.length === 0) continue;
      const mark = a.isEffective ? "✓" : "✗";
      lines.push(
        `    ${mark} ${a.type}: ${a.argalaPlanets.join(", ")} in ${a.argalaSign} — ${a.status}`,
      );
    }
    if (result.effectiveArgalaPlanets.length > 0) {
      lines.push(
        `    → Effective intervention by: ${result.effectiveArgalaPlanets.join(", ")}`,
      );
    }
  }
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
