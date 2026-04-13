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

export const ZODIAC_ORDER: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGN_INDEX: Record<Sign, number> = Object.fromEntries(
  ZODIAC_ORDER.map((s, i) => [s, i])
) as Record<Sign, number>;

// ────────────────────────────────────────────────────────────────────────────
// Jaimini Sign Aspects
// ────────────────────────────────────────────────────────────────────────────

/** Sign classification: Movable (Chara), Fixed (Sthira), Dual (Dvisvabhava) */
const MOVABLE_SIGNS = new Set<Sign>(["Aries", "Cancer", "Libra", "Capricorn"]);
const FIXED_SIGNS   = new Set<Sign>(["Taurus", "Leo", "Scorpio", "Aquarius"]);
const DUAL_SIGNS    = new Set<Sign>(["Gemini", "Virgo", "Sagittarius", "Pisces"]);

/**
 * Jaimini sign aspects (rashi drishti).
 * Hard-coded from the standard rules — no formula, exact values only.
 *
 * 1. Movable signs aspect all Fixed signs except the adjacent one.
 * 2. Fixed signs aspect all Movable signs except the adjacent one.
 * 3. Dual signs aspect all other Dual signs.
 */
const JAIMINI_ASPECTS: Record<Sign, Sign[]> = {
  // Movable → Fixed (skip adjacent)
  Aries:       ["Leo", "Scorpio", "Aquarius"],       // not Taurus
  Cancer:      ["Scorpio", "Aquarius", "Taurus"],     // not Leo
  Libra:       ["Aquarius", "Taurus", "Leo"],         // not Scorpio
  Capricorn:   ["Taurus", "Leo", "Scorpio"],          // not Aquarius

  // Fixed → Movable (skip adjacent)
  Taurus:      ["Cancer", "Libra", "Capricorn"],      // not Aries
  Leo:         ["Libra", "Capricorn", "Aries"],       // not Cancer
  Scorpio:     ["Capricorn", "Aries", "Cancer"],      // not Libra
  Aquarius:    ["Aries", "Cancer", "Libra"],           // not Capricorn

  // Dual → all other Duals
  Gemini:      ["Virgo", "Sagittarius", "Pisces"],
  Virgo:       ["Sagittarius", "Pisces", "Gemini"],
  Sagittarius: ["Pisces", "Gemini", "Virgo"],
  Pisces:      ["Gemini", "Virgo", "Sagittarius"],
};

/**
 * Get the signs that a given sign aspects (Jaimini rashi drishti).
 */
export function getJaiminiAspects(sign: Sign): Sign[] {
  return JAIMINI_ASPECTS[sign] ?? [];
}

/**
 * Check if sign1 aspects sign2 (Jaimini rashi drishti).
 */
export function hasJaiminiAspect(from: Sign, to: Sign): boolean {
  return JAIMINI_ASPECTS[from]?.includes(to) ?? false;
}

/**
 * Get all signs that aspect a given sign (reverse lookup).
 */
export function getAspectingJaimini(targetSign: Sign): Sign[] {
  return ZODIAC_ORDER.filter(
    (sign) => sign !== targetSign && hasJaiminiAspect(sign, targetSign),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pada (Arudha) Calculation
// ────────────────────────────────────────────────────────────────────────────

export interface PadaResult {
  house: number;           // house number (1-12)
  houseSign: Sign;         // sign of the house
  lord: string;            // lord of the house
  lordPlacedIn: Sign;      // sign where lord is placed
  lordDistance: number;     // how far lord has gone from own house (direct count)
  padaSign: Sign;          // the resulting pada sign
  label: string;           // e.g. "A1" / "Arudha Pada" / "Upa-Pada"
}

/**
 * Count houses forward (direct) from one sign to another.
 * Returns 1 if same sign, 2 if next sign, etc.
 * Always counts in zodiacal (direct/forward) order.
 */
function countForward(from: Sign, to: Sign): number {
  const diff = (SIGN_INDEX[to] - SIGN_INDEX[from] + 12) % 12;
  return diff === 0 ? 1 : diff + 1; // inclusive: same sign = 1
}

/**
 * Get the sign that is N positions forward from a given sign.
 * N=1 returns the same sign, N=2 returns next sign, etc.
 */
function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

/**
 * Calculate the pada (arudha) for a single house.
 *
 * Steps:
 * 1. Find how far (direct/forward count) the lord has travelled from its own house.
 * 2. Count that same distance forward from the lord's position.
 * 3. The sign arrived at is the pada.
 */
function calculateSinglePada(
  houseSign: Sign,
  lordPlacedIn: Sign,
): Sign {
  const distance = countForward(houseSign, lordPlacedIn);
  const padaSign = signAtOffset(lordPlacedIn, distance);
  return padaSign;
}

/**
 * Calculate padas for all 12 houses.
 *
 * - Pada of the 1st house (lagna) = Arudha Pada (Arudha Lagna / AL)
 * - Pada of the 12th house = Upa-Pada (UL)
 * - All others labelled A1-A12
 *
 * @param houses - The 12 houses from the chart (with rashi, lord)
 * @param planets - Planet positions (to find where each lord is placed)
 */
export function calculatePadas(
  houses: { house_num: number; rashi: string; lord: string }[],
  planets: { name: string; rashi: string }[],
): PadaResult[] {
  const planetSignMap: Record<string, Sign> = {};
  for (const p of planets) {
    planetSignMap[p.name] = p.rashi as Sign;
  }

  return houses.map((house) => {
    const houseSign = house.rashi as Sign;
    const lord = house.lord;
    const lordPlacedIn = (planetSignMap[lord] ?? houseSign) as Sign;
    const distance = countForward(houseSign, lordPlacedIn);
    const padaSign = calculateSinglePada(houseSign, lordPlacedIn);

    let label = `A${house.house_num}`;
    if (house.house_num === 1) label = "Arudha Pada (AL)";
    if (house.house_num === 12) label = "Upa-Pada (UL)";

    return {
      house: house.house_num,
      houseSign,
      lord,
      lordPlacedIn,
      lordDistance: distance,
      padaSign,
      label,
    };
  });
}

/**
 * Calculate pada for a specific planet.
 * Same logic: see how far the planet's sign lord has gone from the planet's sign,
 * then count that distance from the lord.
 */
export function calculatePlanetPada(
  planetSign: Sign,
  planets: { name: string; rashi: string }[],
): Sign {
  const lord = SIGN_LORD[planetSign];
  const planetSignMap: Record<string, Sign> = {};
  for (const p of planets) {
    planetSignMap[p.name] = p.rashi as Sign;
  }
  const lordPlacedIn = (planetSignMap[lord] ?? planetSign) as Sign;
  return calculateSinglePada(planetSign, lordPlacedIn);
}

// ────────────────────────────────────────────────────────────────────────────
// Dasha Direction Constants
// ────────────────────────────────────────────────────────────────────────────

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
export const SIGN_LORD: Record<Sign, string> = {
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

/** Format a Date as YYYY-MM-DD using local time (avoids UTC shift from toISOString). */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Add whole years to a date using calendar addition (preserves day-of-month).
 * e.g. Jan 26, 1988 + 4 years = Jan 26, 1992
 */
function addCalendarYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return formatDate(d);
}

/**
 * Add whole months to a date using calendar addition (preserves day-of-month).
 * e.g. Jan 26, 2017 + 12 months = Jan 26, 2018
 */
function addCalendarMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
}

/**
 * Add a precise number of days (including fractional) to a date string.
 * Used for sub-sub-period boundaries from the Vedic table.
 */
function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  const wholeDays = Math.floor(days);
  const fractionalHours = (days - wholeDays) * 24;
  d.setDate(d.getDate() + wholeDays);
  d.setHours(d.getHours() + Math.round(fractionalHours));
  return formatDate(d);
}

/**
 * Sub-period duration from the table: N months where N = major period years.
 */
const SUB_PERIOD_MONTHS: Record<number, number> = {
  12: 12, 11: 11, 10: 10, 9: 9, 8: 8, 7: 7,
   6: 6,  5: 5,  4: 4,  3: 3, 2: 2, 1: 1,
};

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
 * Sub-sub-period durations from the standard Chara Dasha table.
 * Key = major period years, Value = [days, hours] per sub-sub-period.
 */
const SUB_SUB_DURATION: Record<number, [number, number]> = {
  12: [30, 0],
  11: [27, 12],
  10: [25, 0],
   9: [22, 12],
   8: [20, 0],
   7: [17, 12],
   6: [15, 0],
   5: [12, 12],
   4: [10, 0],
   3: [7, 12],
   2: [5, 0],
   1: [2, 12],
};

/** Get sub-sub-period duration in fractional days from the lookup table. */
function getSubSubDurationDays(majorYears: number): number {
  const entry = SUB_SUB_DURATION[majorYears];
  if (entry) return entry[0] + entry[1] / 24;
  // Fallback for non-integer major years (shouldn't happen in standard Chara Dasha)
  return majorYears * 2.5;
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
 * Each sub-period = N calendar months (from table: N = major period years).
 */
function calculateSubPeriods(
  dashaSign: Sign,
  majorStartDate: string,
  majorDuration: number,
  planetSignMap: Record<string, Sign>,
  today: string,
): SubPeriod[] {
  const subMonths = SUB_PERIOD_MONTHS[majorDuration] ?? majorDuration;
  const signs = buildSubOrder(dashaSign);

  return signs.map((sign, i) => {
    const lord = SIGN_LORD[sign];
    const lordSign = (planetSignMap[lord] ?? sign) as Sign;
    // Each sub-period = N calendar months from major start
    const startDate = addCalendarMonths(majorStartDate, i * subMonths);
    const endDate = addCalendarMonths(majorStartDate, (i + 1) * subMonths);
    const isCurrentPeriod = startDate <= today && today < endDate;

    // Calculate sub-sub-periods (needs major duration for table lookup)
    const subSubPeriods = calculateSubSubPeriods(sign, startDate, majorDuration, planetSignMap, today);

    return {
      sign,
      lord,
      lordSign,
      duration: majorDuration / 12,
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

    // Use calendar year addition to preserve day-of-month (e.g. Jan 26 stays Jan 26)
    const startDate = addCalendarYears(birthDate, cumulativeYears[i]);
    const endDate = addCalendarYears(birthDate, cumulativeYears[i + 1]);
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
