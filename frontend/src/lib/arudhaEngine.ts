/**
 * Jaimini Arudha Pada Engine
 *
 * Classical Jaimini technique: for any bhava, the Arudha Pada is the sign
 * that is as far from the bhava-lord's sign as the bhava-lord's sign is
 * from the bhava itself. It represents the *perception / manifest image*
 * of that bhava rather than the inner reality.
 *
 * Special rules:
 *  - If the Arudha falls in the same sign as the bhava OR in the 7th
 *    from it, shift it 10 houses from the bhava-lord (these are classical
 *    "cancellation rules", per Jaimini Upadesa Sutras 1.1.13).
 *
 * Most commonly used:
 *   AL  — Arudha Lagna (A1)  : the native's public image / how the world sees them
 *   A2  — Dhana Pada         : manifest wealth / visible income
 *   A11 — Labha Pada         : networks, perceived gains, reputation-driven income
 *   A7  — Dara Pada          : perceived relationships
 *   A10 — Karma Pada         : perceived career / status
 *
 * Source: Jaimini Upadesa Sutras ch 1 pada 1-2; Sanjay Rath "Jaimini Sutras"
 * commentary; BPHS ch 10 (Arudha Lagna).
 */

import type { ChartResponse } from "./api";
import { ZODIAC_ORDER, SIGN_INDEX, SIGN_LORD, type Sign } from "./charaDashaEngine";

export interface ArudhaSet {
  /** A1 - Arudha Lagna: public image */
  AL: Sign;
  /** A2 - Dhana Pada: visible wealth */
  A2: Sign;
  /** A3 - Vikrama Pada: courage, siblings' image */
  A3: Sign;
  /** A4 - Matri Pada: mother/home/vehicles image */
  A4: Sign;
  /** A5 - Putra Pada: children/creativity image */
  A5: Sign;
  /** A6 - Shatru Pada: enemies/health image */
  A6: Sign;
  /** A7 - Dara Pada: partnership image */
  A7: Sign;
  /** A8 - Mrityu Pada: transformation/inheritance image */
  A8: Sign;
  /** A9 - Bhagya Pada: fortune/guru image */
  A9: Sign;
  /** A10 - Karma Pada: career image */
  A10: Sign;
  /** A11 - Labha Pada: gains/network image */
  A11: Sign;
  /** A12 - Upapada Lagna (UL): spouse/moksha image */
  A12: Sign;
}

function signAtHouse(lagna: Sign, house: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[lagna] + house - 1) % 12];
}

function distanceFromSignToSign(fromSign: Sign, toSign: Sign): number {
  return ((SIGN_INDEX[toSign] - SIGN_INDEX[fromSign] + 12) % 12) + 1;
}

function signAtDistance(fromSign: Sign, distance: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[fromSign] + distance - 1) % 12];
}

/**
 * Compute the Arudha Pada of a single bhava.
 *
 * Algorithm:
 *   1. Identify the sign of the bhava (house N from lagna).
 *   2. Identify the lord of that sign.
 *   3. Find which house the lord currently occupies (from the bhava sign).
 *   4. Count that same number forward from the lord's sign — result is Arudha.
 *   5. Apply cancellation: if Arudha equals bhava sign or 7th from it,
 *      shift 10 signs forward from the lord instead.
 */
export function computeArudhaPada(
  bhavaNum: number,
  lagna: Sign,
  planetSignByName: Record<string, Sign>,
): Sign {
  const bhavaSign = signAtHouse(lagna, bhavaNum);
  const bhavaLord = SIGN_LORD[bhavaSign];
  const lordSign = planetSignByName[bhavaLord];
  if (!lordSign) return bhavaSign; // defensive fallback

  // Distance from bhava sign to lord's sign
  const distance = distanceFromSignToSign(bhavaSign, lordSign);
  // Count the same distance forward from the lord
  let arudha = signAtDistance(lordSign, distance);

  // Cancellation: if arudha lands on the bhava sign itself or the 7th
  // from it, shift 10 signs from the lord instead.
  const seventhFromBhava = signAtDistance(bhavaSign, 7);
  if (arudha === bhavaSign || arudha === seventhFromBhava) {
    arudha = signAtDistance(lordSign, 10);
  }

  return arudha;
}

/**
 * Compute all 12 Arudha Padas for a chart in one pass.
 *
 * Rahu/Ketu are never used as bhava lords (they don't own any signs), so
 * the per-planet sign map only needs the 7 classical planets.
 */
export function computeAllArudhas(chart: ChartResponse): ArudhaSet {
  const lagna = chart.lagna as Sign;
  const planetSignByName: Record<string, Sign> = {};
  for (const p of chart.planets) {
    // Use D1 rashi only; Rahu/Ketu still get included harmlessly
    planetSignByName[p.name] = p.rashi as Sign;
  }

  const out: Partial<ArudhaSet> = {};
  const nums: [keyof ArudhaSet, number][] = [
    ["AL", 1], ["A2", 2], ["A3", 3], ["A4", 4], ["A5", 5], ["A6", 6],
    ["A7", 7], ["A8", 8], ["A9", 9], ["A10", 10], ["A11", 11], ["A12", 12],
  ];
  for (const [key, bhava] of nums) {
    out[key] = computeArudhaPada(bhava, lagna, planetSignByName);
  }
  return out as ArudhaSet;
}

/**
 * Is planet P placed in or aspecting (Jaimini rashi aspect) the given sign?
 * Used for classical Arudha rules like "benefic in/aspecting A11 → wealth
 * via virtuous means" (Jaimini Upadesa Sutras 1.2.74+).
 *
 * This is a thin helper that relies on the planet's D1 sign; for full
 * aspect checks use the yoga engine's rashi-aspect helper.
 */
export function planetInfluencesSign(
  chart: ChartResponse,
  planet: string,
  sign: Sign,
): boolean {
  const p = chart.planets.find((x) => x.name === planet);
  if (!p) return false;
  return p.rashi === sign;
}
