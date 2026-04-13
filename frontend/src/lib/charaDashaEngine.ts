/**
 * Jaimini Chara Dasha Calculation Engine
 *
 * Computes the 12-sign Chara Dasha sequence from a D1 chart.
 *
 * Rules (K.N. Rao method):
 * 1. Start from the Ascendant sign
 * 2. Sequence direction based on 9th house from lagna:
 *    - 9th in Aries/Taurus/Gemini/Libra/Scorpio/Sagittarius → Direct (forward)
 *    - 9th in Cancer/Leo/Virgo/Capricorn/Aquarius/Pisces → Indirect (backward)
 * 3. Duration counting: each sign counts independently —
 *    Direct signs count FORWARD to lord, Indirect signs count BACKWARD
 * 4. Count is exclusive of start sign (distance-based)
 * 5. Dual lordship signs: Scorpio (Mars + Ketu) and Aquarius (Saturn + Rahu)
 *    - If one lord is in the sign, count to the other lord
 *    - If both lords are in the sign, 12 years
 *    - If both lords are outside, count to the stronger lord
 *    - Strength: associated > alone, then higher degree wins
 * 6. If any other lord sits in own sign → 12 years
 * 7. Sequence: 12 consecutive signs in the determined direction
 */

import type { ChartResponse, PlanetPosition } from "./api";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer"
  | "Leo" | "Virgo" | "Libra" | "Scorpio"
  | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export interface SubSubPeriod {
  sign: Sign;
  lord: string;
  lordSign: Sign;
  duration: number;       // years (fraction of sub-period)
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  isCurrentPeriod: boolean;
}

export interface SubPeriod {
  sign: Sign;
  lord: string;
  lordSign: Sign;
  duration: number;       // years (fraction of major period)
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  isCurrentPeriod: boolean;
  subSubPeriods: SubSubPeriod[];
}

export interface DashaPeriod {
  sign: Sign;
  lord: string;
  lordSign: Sign;
  duration: number;       // years
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  startYear: number;
  endYear: number;
  isCurrentPeriod: boolean;
  subPeriods: SubPeriod[];
}

export interface CharaDashaResult {
  ascendant: Sign;
  direction: "forward" | "backward";
  dashaSequence: DashaPeriod[];
  totalYears: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const ZODIAC_ORDER: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_INDEX: Record<Sign, number> = Object.fromEntries(
  ZODIAC_ORDER.map((s, i) => [s, i])
) as Record<Sign, number>;

/**
 * Direct signs: when the 9th house falls on one of these, dasha order is forward.
 * Also used for per-sign counting direction: direct signs count forward to lord.
 */
const DIRECT_SIGNS = new Set<Sign>([
  "Aries", "Taurus", "Gemini", "Libra", "Scorpio", "Sagittarius",
]);

/**
 * Determine dasha sequence direction based on 9th house from lagna.
 * 9th house = lagna index + 8 (since lagna is house 1).
 */
function getSequenceDirection(ascendant: Sign): "forward" | "backward" {
  const ninthIdx = (SIGN_INDEX[ascendant] + 8) % 12;
  const ninthSign = ZODIAC_ORDER[ninthIdx];
  return DIRECT_SIGNS.has(ninthSign) ? "forward" : "backward";
}

/** Sign → Lord mapping */
const SIGN_LORD: Record<Sign, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

/**
 * Dual lordship signs — only Scorpio and Aquarius have two lords in Jaimini.
 *
 * Scorpio (Direct counting): Mars + Ketu
 * Aquarius (Indirect counting): Saturn + Rahu
 *
 * Rules:
 * 1. If lord1 is in the sign & lord2 elsewhere → count to lord2
 * 2. If lord2 is in the sign & lord1 elsewhere → count to lord1
 * 3. If both in the sign → 12 years
 * 4. If both outside → count to the stronger lord:
 *    a. Associated (conjunct other planets) beats unassociated
 *    b. Both associated or both alone → higher degree_in_rashi wins
 */
interface DualLordSign {
  sign: Sign;
  lord1: string;  // traditional ruler
  lord2: string;  // shadow planet co-ruler
}

const DUAL_LORD_SIGNS: DualLordSign[] = [
  { sign: "Scorpio",  lord1: "Mars",   lord2: "Ketu" },
  { sign: "Aquarius", lord1: "Saturn", lord2: "Rahu" },
];

/**
 * Determine which lord to count to for a dual-lordship sign (Scorpio / Aquarius).
 * Returns the TARGET sign to count to, or null if duration should be 12.
 */
function resolveDualLord(
  cfg: DualLordSign,
  planetSignMap: Record<string, Sign>,
  planets: PlanetPosition[],
): Sign | null {
  const sign1 = planetSignMap[cfg.lord1] ?? cfg.sign;
  const sign2 = planetSignMap[cfg.lord2] ?? cfg.sign;

  const lord1InSign = sign1 === cfg.sign;
  const lord2InSign = sign2 === cfg.sign;

  // Rule 1: lord1 in sign, lord2 elsewhere → count to lord2
  if (lord1InSign && !lord2InSign) return sign2;

  // Rule 2: lord2 in sign, lord1 elsewhere → count to lord1
  if (lord2InSign && !lord1InSign) return sign1;

  // Rule 3: both in sign → 12 years
  if (lord1InSign && lord2InSign) return null;

  // Rule 4: both outside → count to the stronger one
  return getStrongerPlanetSign(cfg.lord1, cfg.lord2, planetSignMap, planets);
}

/**
 * Compare two planets' strength and return the sign of the stronger one.
 *
 * Strength hierarchy:
 * a. Associated with other planets (conjunct) beats unassociated (alone in sign)
 * b. If tie on association, higher degree_in_rashi wins
 */
function getStrongerPlanetSign(
  name1: string,
  name2: string,
  planetSignMap: Record<string, Sign>,
  planets: PlanetPosition[],
): Sign {
  const sign1 = planetSignMap[name1];
  const sign2 = planetSignMap[name2];

  // Count how many OTHER planets share the same sign (associations)
  const assoc1 = planets.filter(
    (p) => p.name !== name1 && (p.rashi as Sign) === sign1,
  ).length;
  const assoc2 = planets.filter(
    (p) => p.name !== name2 && (p.rashi as Sign) === sign2,
  ).length;

  // Rule 4a: associated beats unassociated
  if (assoc1 > 0 && assoc2 === 0) return sign1;
  if (assoc2 > 0 && assoc1 === 0) return sign2;

  // Rule 4b/c/d: higher degree_in_rashi wins
  const p1 = planets.find((p) => p.name === name1);
  const p2 = planets.find((p) => p.name === name2);
  const deg1 = p1?.degree_in_rashi ?? 0;
  const deg2 = p2?.degree_in_rashi ?? 0;

  return deg1 >= deg2 ? sign1 : sign2;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Build a map of planet → sign from chart data */
function buildPlanetSignMap(planets: PlanetPosition[]): Record<string, Sign> {
  const map: Record<string, Sign> = {};
  for (const p of planets) {
    map[p.name] = p.rashi as Sign;
  }
  return map;
}

/**
 * Count signs from `from` to `to` in the given direction.
 * Returns the number of sign-hops (exclusive of start, inclusive of end).
 * If same sign → return 0 (caller handles via dual lordship exception).
 *
 * Example (forward): Libra(6) → Aquarius(10) = 4 hops.
 * Example (backward): Taurus(1) → Leo(4) = (1-4+12)%12 = 9 hops.
 */
function countSigns(from: Sign, to: Sign, direction: "forward" | "backward"): number {
  const fromIdx = SIGN_INDEX[from];
  const toIdx = SIGN_INDEX[to];

  if (fromIdx === toIdx) return 0;

  if (direction === "forward") {
    return ((toIdx - fromIdx + 12) % 12);
  } else {
    return ((fromIdx - toIdx + 12) % 12);
  }
}

/**
 * Get the counting direction for a specific dasha sign.
 * Direct signs count forward to lord, Indirect signs count backward.
 */
function getCountDirection(sign: Sign): "forward" | "backward" {
  return DIRECT_SIGNS.has(sign) ? "forward" : "backward";
}

/**
 * Calculate the dasha duration for a sign.
 *
 * Rules:
 * 1. Counting direction is per-sign: odd signs count forward, even backward.
 * 2. Scorpio & Aquarius have dual lords — use resolveDualLord() to pick target.
 * 3. All other signs: count from dasha sign to lord's natal sign.
 * 4. If lord is in the dasha sign itself → 12 years.
 */
function getDashaDuration(
  dashaSign: Sign,
  planetSignMap: Record<string, Sign>,
  planets: PlanetPosition[],
): number {
  const countDir = getCountDirection(dashaSign);

  // Check if this is a dual-lordship sign (Scorpio or Aquarius)
  const dualCfg = DUAL_LORD_SIGNS.find((d) => d.sign === dashaSign);
  if (dualCfg) {
    const targetSign = resolveDualLord(dualCfg, planetSignMap, planets);
    if (targetSign === null) return 12; // both lords in own sign
    const count = countSigns(dashaSign, targetSign, countDir);
    return count === 0 ? 12 : count;
  }

  // Standard single-lord logic
  const lord = SIGN_LORD[dashaSign];
  const lordSign = (planetSignMap[lord] ?? dashaSign) as Sign;

  if (dashaSign === lordSign) {
    return 12; // lord sitting in own sign
  }

  const count = countSigns(dashaSign, lordSign, countDir);
  return count === 0 ? 12 : count;
}

/**
 * Get the next sign in a given direction from a starting sign.
 */
function getNextSign(current: Sign, direction: "forward" | "backward"): Sign {
  const idx = SIGN_INDEX[current];
  if (direction === "forward") {
    return ZODIAC_ORDER[(idx + 1) % 12];
  } else {
    return ZODIAC_ORDER[(idx - 1 + 12) % 12];
  }
}

/**
 * Add fractional years to a date string, returning a new date string.
 */
function addYearsToDate(dateStr: string, years: number): string {
  const d = new Date(dateStr + "T00:00:00");
  const totalDays = Math.round(years * 365.25);
  d.setDate(d.getDate() + totalDays);
  return d.toISOString().split("T")[0];
}

/**
 * Compute the i-th boundary date within a parent period.
 * Uses direct offset from parent start to avoid cumulative rounding errors.
 *
 * boundary(0) = parentStart, boundary(12) = parentEnd
 */
function getBoundaryDate(parentStart: string, parentDurationYears: number, i: number, total: number = 12): string {
  const d = new Date(parentStart + "T00:00:00");
  const totalDays = parentDurationYears * 365.25;
  const offsetDays = Math.round((i / total) * totalDays);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-Period & Sub-Sub-Period Calculation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the 12-sign order for a given sign's sub/sub-sub period.
 * Same rule at every level:
 *   - Direction via 9th-house rule on the sign
 *   - Own sign goes LAST
 */
function buildSubOrder(sign: Sign): Sign[] {
  const direction = getSequenceDirection(sign);
  const signs: Sign[] = [];
  let current = sign;
  for (let i = 0; i < 11; i++) {
    current = getNextSign(current, direction);
    signs.push(current);
  }
  signs.push(sign); // own sign last
  return signs;
}

/**
 * Sub-sub-period duration uses the Vedic 360-day year convention.
 * Formula: major_period_years × 2.5 days per sub-sub-period.
 *
 * Table reference:
 *   Major 12y → 30d 0h   | Major 6y → 15d 0h
 *   Major 11y → 27d 12h  | Major 5y → 12d 12h
 *   Major 10y → 25d 0h   | Major 4y → 10d 0h
 *   Major  9y → 22d 12h  | Major 3y →  7d 12h
 *   Major  8y → 20d 0h   | Major 2y →  5d 0h
 *   Major  7y → 17d 12h  | Major 1y →  2d 12h
 */
function getSubSubDurationDays(majorYears: number): number {
  return majorYears * 2.5;
}

/**
 * Add a precise number of days (including fractional) to a date string.
 */
function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  // Split into whole days and fractional hours for precision
  const wholeDays = Math.floor(days);
  const fractionalHours = (days - wholeDays) * 24;
  d.setDate(d.getDate() + wholeDays);
  d.setHours(d.getHours() + Math.round(fractionalHours));
  return d.toISOString().split("T")[0];
}

/**
 * Calculate sub-sub-periods (pratyantardashas) for a sub-period sign.
 * Duration per Vedic convention: major_years × 2.5 days each.
 * Dates computed as direct offsets from sub-period start to avoid rounding drift.
 */
function calculateSubSubPeriods(
  subSign: Sign,
  subStartDate: string,
  majorDuration: number,
  planetSignMap: Record<string, Sign>,
  today: string,
): SubSubPeriod[] {
  const signs = buildSubOrder(subSign);
  const durationDays = getSubSubDurationDays(majorDuration);

  return signs.map((sign, i) => {
    const lord = SIGN_LORD[sign];
    const lordSign = (planetSignMap[lord] ?? sign) as Sign;
    // Compute each boundary as offset from sub start to avoid cumulative rounding
    const startDate = addDaysToDate(subStartDate, i * durationDays);
    const endDate = addDaysToDate(subStartDate, (i + 1) * durationDays);
    const isCurrentPeriod = startDate <= today && today < endDate;

    return {
      sign,
      lord,
      lordSign,
      duration: durationDays / 365.25, // store as years for consistency
      startDate,
      endDate,
      isCurrentPeriod,
    };
  });
}

/**
 * Calculate sub-periods (antardashas) for a major dasha sign.
 * Each sub-period = major period duration / 12.
 * Uses getBoundaryDate to avoid cumulative rounding errors.
 */
function calculateSubPeriods(
  dashaSign: Sign,
  majorStartDate: string,
  majorDuration: number,
  planetSignMap: Record<string, Sign>,
  today: string,
): SubPeriod[] {
  const subDuration = majorDuration / 12;
  const signs = buildSubOrder(dashaSign);

  return signs.map((sign, i) => {
    const lord = SIGN_LORD[sign];
    const lordSign = (planetSignMap[lord] ?? sign) as Sign;
    const startDate = getBoundaryDate(majorStartDate, majorDuration, i);
    const endDate = getBoundaryDate(majorStartDate, majorDuration, i + 1);
    const isCurrentPeriod = startDate <= today && today < endDate;

    // Calculate sub-sub-periods (needs major duration for Vedic 2.5-day formula)
    const subSubPeriods = calculateSubSubPeriods(sign, startDate, majorDuration, planetSignMap, today);

    return {
      sign,
      lord,
      lordSign,
      duration: subDuration,
      startDate,
      endDate,
      isCurrentPeriod,
      subSubPeriods,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Core Engine
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the full Jaimini Chara Dasha sequence.
 *
 * @param chart - The D1 chart response from the calculation engine
 * @returns CharaDashaResult with 12 dasha periods
 */
export function calculateCharaDasha(chart: ChartResponse): CharaDashaResult {
  const ascendant = chart.lagna as Sign;
  const planetSignMap = buildPlanetSignMap(chart.planets);

  // Determine direction based on 9th house from ascendant
  const direction: "forward" | "backward" = getSequenceDirection(ascendant);

  // Build 12-sign dasha sequence
  const signs: Sign[] = [ascendant];
  let current = ascendant;
  for (let i = 1; i < 12; i++) {
    current = getNextSign(current, direction);
    signs.push(current);
  }

  // Calculate durations first, then build timeline with precise boundary dates
  const birthDate = chart.date; // "YYYY-MM-DD"
  const today = new Date().toISOString().split("T")[0];

  const durations = signs.map((sign) =>
    getDashaDuration(sign, planetSignMap, chart.planets),
  );
  const totalYears = durations.reduce((sum, d) => sum + d, 0);

  // Pre-compute cumulative year offsets for precise boundary dates
  const cumulativeYears: number[] = [0];
  for (let i = 0; i < durations.length; i++) {
    cumulativeYears.push(cumulativeYears[i] + durations[i]);
  }

  const dashaSequence: DashaPeriod[] = signs.map((sign, i) => {
    const lord = SIGN_LORD[sign];
    const lordSign = planetSignMap[lord] || sign;
    const duration = durations[i];

    // Compute dates directly from birth date to avoid cumulative rounding
    const startDate = addYearsToDate(birthDate, cumulativeYears[i]);
    const endDate = addYearsToDate(birthDate, cumulativeYears[i + 1]);
    const startYear = new Date(startDate + "T00:00:00").getFullYear();
    const endYear = new Date(endDate + "T00:00:00").getFullYear();

    const isCurrentPeriod = startDate <= today && today < endDate;

    // Calculate sub-periods
    const subPeriods = calculateSubPeriods(sign, startDate, duration, planetSignMap, today);

    return {
      sign,
      lord,
      lordSign: lordSign as Sign,
      duration,
      startDate,
      endDate,
      startYear,
      endYear,
      isCurrentPeriod,
      subPeriods,
    };
  });

  return {
    ascendant,
    direction,
    dashaSequence,
    totalYears,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Report Generation
// ────────────────────────────────────────────────────────────────────────────

export interface CharaDashaReport {
  user: {
    name: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    place: string;
    maritalStatus: string;
  };
  chart: {
    ascendant: Sign;
    direction: string;
    totalYears: number;
  };
  dashaSequence: DashaPeriod[];
  currentDasha: DashaPeriod | null;
}

/**
 * Generate a complete Chara Dasha report from chart data and user info.
 */
export function generateCharaDashaReport(
  chart: ChartResponse,
  userInfo: {
    name: string;
    gender: string;
    maritalStatus: string;
  },
): CharaDashaReport {
  const result = calculateCharaDasha(chart);
  const currentDasha = result.dashaSequence.find((d) => d.isCurrentPeriod) || null;

  return {
    user: {
      name: userInfo.name,
      gender: userInfo.gender,
      dateOfBirth: chart.date,
      timeOfBirth: chart.time,
      place: chart.place,
      maritalStatus: userInfo.maritalStatus,
    },
    chart: {
      ascendant: result.ascendant,
      direction: result.direction,
      totalYears: result.totalYears,
    },
    dashaSequence: result.dashaSequence,
    currentDasha,
  };
}
