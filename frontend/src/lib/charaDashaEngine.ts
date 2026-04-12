/**
 * Jaimini Chara Dasha Calculation Engine
 *
 * Computes the 12-sign Chara Dasha sequence from a D1 chart.
 *
 * Rules (K.N. Rao method):
 * 1. Start from the Ascendant sign
 * 2. Sequence direction: Odd ascendant → forward, Even ascendant → backward
 * 3. Duration counting: each sign counts independently —
 *    odd dasha signs count FORWARD to lord, even signs count BACKWARD
 * 4. Count is exclusive of start sign (distance-based)
 * 5. Dual lordship exception: if lord is in own sign, count to lord's OTHER sign
 *    (Sun/Moon have single lordship → 12 years if in own sign)
 * 6. Sequence: 12 consecutive signs in the determined direction
 */

import type { ChartResponse, PlanetPosition } from "./api";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer"
  | "Leo" | "Virgo" | "Libra" | "Scorpio"
  | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

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

/** Odd signs (1-indexed: 1,3,5,7,9,11) go forward; even go backward */
const ODD_SIGNS = new Set<Sign>([
  "Aries", "Gemini", "Leo", "Libra", "Sagittarius", "Aquarius",
]);

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
 * Dual lordship: planets that rule two signs.
 * When the lord sits in the dasha sign itself, we count to its OTHER sign.
 * Sun (Leo) and Moon (Cancer) rule only one sign → no alternate → 12 years.
 */
const DUAL_LORDSHIP: Record<string, [Sign, Sign]> = {
  Mars:    ["Aries", "Scorpio"],
  Venus:   ["Taurus", "Libra"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Saturn:  ["Capricorn", "Aquarius"],
};

/** Get the other sign a planet rules (returns null for Sun/Moon) */
function getOtherSign(planet: string, currentSign: Sign): Sign | null {
  const pair = DUAL_LORDSHIP[planet];
  if (!pair) return null; // Sun or Moon — single lordship
  return pair[0] === currentSign ? pair[1] : pair[0];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Get the rashi (sign) a planet occupies from the chart */
function getPlanetSign(planets: PlanetPosition[], planetName: string): Sign {
  const p = planets.find((pl) => pl.name === planetName);
  return (p?.rashi as Sign) ?? "Aries";
}

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
 * Each sign counts independently: odd signs count forward, even signs backward.
 * This may differ from the overall sequence direction.
 */
function getCountDirection(sign: Sign): "forward" | "backward" {
  return ODD_SIGNS.has(sign) ? "forward" : "backward";
}

/**
 * Calculate the dasha duration for a sign.
 *
 * Standard K.N. Rao rules:
 * 1. Counting direction is per-sign: odd signs count forward, even backward.
 * 2. Count from dasha sign to lord's sign (exclusive of start).
 * 3. If lord is in the dasha sign itself (same sign):
 *    a. Dual-lordship planets (Mars, Venus, Mercury, Jupiter, Saturn):
 *       count to the lord's OTHER sign instead.
 *    b. Single-lordship planets (Sun, Moon): duration = 12 years.
 */
function getDashaDuration(
  dashaSign: Sign,
  lord: string,
  lordSign: Sign,
): number {
  const countDir = getCountDirection(dashaSign);

  if (dashaSign === lordSign) {
    // Lord is in its own sign — dual lordship exception
    const otherSign = getOtherSign(lord, dashaSign);
    if (otherSign) {
      // Count to the OTHER sign this lord rules
      const count = countSigns(dashaSign, otherSign, countDir);
      return count === 0 ? 12 : count;
    }
    // Sun or Moon — single lordship → 12 years
    return 12;
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

  // Determine direction based on ascendant
  const direction: "forward" | "backward" = ODD_SIGNS.has(ascendant)
    ? "forward"
    : "backward";

  // Build 12-sign dasha sequence
  const signs: Sign[] = [ascendant];
  let current = ascendant;
  for (let i = 1; i < 12; i++) {
    current = getNextSign(current, direction);
    signs.push(current);
  }

  // Calculate durations and build timeline
  const birthDate = chart.date; // "YYYY-MM-DD"
  const today = new Date().toISOString().split("T")[0];
  let runningDate = birthDate;
  let totalYears = 0;

  const dashaSequence: DashaPeriod[] = signs.map((sign) => {
    const lord = SIGN_LORD[sign];
    const lordSign = planetSignMap[lord] || sign;
    const duration = getDashaDuration(sign, lord, lordSign as Sign);

    const startDate = runningDate;
    const endDate = addYearsToDate(startDate, duration);
    const startYear = new Date(startDate + "T00:00:00").getFullYear();
    const endYear = new Date(endDate + "T00:00:00").getFullYear();

    // Is this the current period?
    const isCurrentPeriod = startDate <= today && today < endDate;

    totalYears += duration;
    runningDate = endDate;

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
