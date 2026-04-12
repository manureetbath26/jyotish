/**
 * Jaimini Chara Dasha Calculation Engine
 *
 * Computes the 12-sign Chara Dasha sequence from a D1 chart.
 *
 * Rules:
 * 1. Start from the Ascendant sign
 * 2. Direction: Odd signs → forward (zodiacal), Even signs → backward
 * 3. Duration: count signs from dasha sign to its lord's sign (inclusive).
 *    If the lord is in its own sign → 12 years.
 * 4. Sequence: 12 consecutive signs in the determined direction
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
 * Count signs from `from` to `to` in the given direction (inclusive of both).
 * If same sign → return 12 (special Jaimini rule: lord in own sign = 12 years).
 *
 * Example (forward): Taurus → Aquarius = Taurus, Gemini, Cancer, Leo, Virgo,
 *   Libra, Scorpio, Sagittarius, Capricorn, Aquarius = 10 signs inclusive.
 */
function countSigns(from: Sign, to: Sign, direction: "forward" | "backward"): number {
  const fromIdx = SIGN_INDEX[from];
  const toIdx = SIGN_INDEX[to];

  if (fromIdx === toIdx) return 12;

  if (direction === "forward") {
    // Distance (hops) + 1 for inclusive counting of the start sign
    return ((toIdx - fromIdx + 12) % 12) + 1;
  } else {
    return ((fromIdx - toIdx + 12) % 12) + 1;
  }
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
    const duration = countSigns(sign, lordSign as Sign, direction);

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
