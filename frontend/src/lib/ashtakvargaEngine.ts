/**
 * Ashtakvarga Engine
 *
 * Computes the Prastharashtakvarga (spread chart) for each of the 7 planets
 * (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) and the Sarvashtakvarga
 * (total chart) for a given natal chart.
 *
 * Based on classical rules from M.S. Mehta's "Jyotish Ashtakavarga" (tables
 * stored in AshtakvargaRule DB table, seeded from pages 11-13 of the book).
 *
 * Computation model:
 *   Each planet P has, for each source S (7 planets + Lagna), a list of
 *   house offsets {h1, h2, ...} at which P receives a bindu (benefic point).
 *
 *   When S is placed in sign X, planet P earns a bindu in each sign
 *     (X + h - 1) mod 12  for every h in the rules list.
 *
 *   The Prasthara chakra of P is an 8-row × 12-column matrix:
 *     rows    = 8 sources (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna)
 *     columns = 12 signs (Aries, Taurus, ..., Pisces)
 *     cell    = 1 if that source contributed a bindu to that sign for P, else 0
 *
 *   The BAV (Bhinnashtakvarga) of P is the per-sign column total (max 8).
 *   The SAV (Sarvashtakvarga) is the sum of the 7 BAVs across all planets.
 */

import {
  ZODIAC_ORDER,
  SIGN_INDEX,
  type Sign,
} from "./charaDashaEngine";
import type { ChartResponse } from "./api";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AshtakvargaPlanet =
  | "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";

export type AshtakvargaSource = AshtakvargaPlanet | "Lagna";

export const ASHTAKVARGA_PLANETS: AshtakvargaPlanet[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

export const ASHTAKVARGA_SOURCES: AshtakvargaSource[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Lagna",
];

/** Rule: for `planet`, the `source` contributes a bindu at these house offsets */
export interface AshtakvargaRule {
  planet: AshtakvargaPlanet;
  source: AshtakvargaSource;
  houses: number[]; // 1-12
}

/** Prasthara chart: 8 sources × 12 signs, cell = 1 or 0 */
export interface PrastharaChart {
  planet: AshtakvargaPlanet;
  /** [sourceIndex][signIndex] = 0 or 1 */
  matrix: number[][];
  /** Per-sign totals (max 8) — this is the BAV */
  signTotals: number[];
  /** Grand total across all 12 signs */
  grandTotal: number;
  /** Sign where the planet itself is placed (for reference) */
  planetSign: Sign;
  /** Signs where each source is placed (for rendering asterisks) */
  sourcePlacements: Record<AshtakvargaSource, Sign>;
}

/** Sarvashtakvarga: summed per-sign totals across all 7 planets */
export interface SarvashtakvargaChart {
  /** [planetIndex][signIndex] = that planet's BAV at that sign */
  matrix: number[][];
  /** Grand total per sign (sum across 7 planets) */
  signTotals: number[];
  /** Sum across all 12 signs (typically ~337) */
  grandTotal: number;
}

/** Complete Ashtakvarga analysis — all 8 charts */
export interface AshtakvargaAnalysis {
  /** 7 Prasthara charts, one per planet */
  prastharaCharts: PrastharaChart[];
  /** 8th chart — total across all 7 */
  sarvashtakvarga: SarvashtakvargaChart;
  /** Lagna sign */
  lagnaSign: Sign;
  /** Sign placements of each source for reference */
  sourcePlacements: Record<AshtakvargaSource, Sign>;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * For a source placed at `sourceSign`, compute which sign is at the
 * given `offset` (1-based: 1 = same sign, 2 = next sign, ..., 12 = previous).
 */
function signAtOffset(sourceSign: Sign, offset: number): Sign {
  const idx = (SIGN_INDEX[sourceSign] + offset - 1) % 12;
  return ZODIAC_ORDER[idx];
}

/** Get the sign where a given source is placed in the chart */
function getSourceSign(
  chart: ChartResponse,
  source: AshtakvargaSource,
): Sign {
  if (source === "Lagna") {
    return chart.lagna as Sign;
  }
  const planet = chart.planets.find((p) => p.name === source);
  return (planet?.rashi as Sign) || (chart.lagna as Sign);
}

// ────────────────────────────────────────────────────────────────────────────
// Core computation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build an index of rules: rulesByPlanet[planet][source] = houses[]
 */
function indexRules(rules: AshtakvargaRule[]): Record<AshtakvargaPlanet, Partial<Record<AshtakvargaSource, number[]>>> {
  const index = {} as Record<AshtakvargaPlanet, Partial<Record<AshtakvargaSource, number[]>>>;
  for (const planet of ASHTAKVARGA_PLANETS) {
    index[planet] = {};
  }
  for (const rule of rules) {
    if (!index[rule.planet]) index[rule.planet] = {};
    index[rule.planet][rule.source] = rule.houses;
  }
  return index;
}

/**
 * Compute the Prasthara chart for a single planet.
 */
function computePrastharaForPlanet(
  planet: AshtakvargaPlanet,
  chart: ChartResponse,
  rulesBySource: Partial<Record<AshtakvargaSource, number[]>>,
  sourcePlacements: Record<AshtakvargaSource, Sign>,
): PrastharaChart {
  // Initialize 8×12 matrix of zeros
  const matrix: number[][] = Array.from({ length: 8 }, () =>
    new Array(12).fill(0),
  );

  ASHTAKVARGA_SOURCES.forEach((source, srcIdx) => {
    const houses = rulesBySource[source];
    if (!houses) return;

    const sourceSign = sourcePlacements[source];
    for (const h of houses) {
      const benefitSign = signAtOffset(sourceSign, h);
      const signIdx = SIGN_INDEX[benefitSign];
      matrix[srcIdx][signIdx] = 1;
    }
  });

  // Per-sign totals (column sums) — these form the BAV
  const signTotals = new Array(12).fill(0);
  for (let s = 0; s < 12; s++) {
    for (let r = 0; r < 8; r++) {
      signTotals[s] += matrix[r][s];
    }
  }

  const grandTotal = signTotals.reduce((a, b) => a + b, 0);

  return {
    planet,
    matrix,
    signTotals,
    grandTotal,
    planetSign: sourcePlacements[planet],
    sourcePlacements,
  };
}

/**
 * Main entry: compute all 8 charts for a natal chart given the rules.
 */
export function computeAshtakvarga(
  chart: ChartResponse,
  rules: AshtakvargaRule[],
): AshtakvargaAnalysis {
  // Index rules and compute source placements once
  const rulesByPlanet = indexRules(rules);
  const sourcePlacements = {} as Record<AshtakvargaSource, Sign>;
  for (const source of ASHTAKVARGA_SOURCES) {
    sourcePlacements[source] = getSourceSign(chart, source);
  }

  // Compute 7 Prasthara charts
  const prastharaCharts = ASHTAKVARGA_PLANETS.map((planet) =>
    computePrastharaForPlanet(
      planet,
      chart,
      rulesByPlanet[planet] || {},
      sourcePlacements,
    ),
  );

  // Compute Sarvashtakvarga: 7 rows (planets) × 12 cols (signs)
  const savMatrix = prastharaCharts.map((p) => p.signTotals);
  const savSignTotals = new Array(12).fill(0);
  for (let s = 0; s < 12; s++) {
    for (let p = 0; p < 7; p++) {
      savSignTotals[s] += savMatrix[p][s];
    }
  }
  const savGrandTotal = savSignTotals.reduce((a, b) => a + b, 0);

  return {
    prastharaCharts,
    sarvashtakvarga: {
      matrix: savMatrix,
      signTotals: savSignTotals,
      grandTotal: savGrandTotal,
    },
    lagnaSign: chart.lagna as Sign,
    sourcePlacements,
  };
}
