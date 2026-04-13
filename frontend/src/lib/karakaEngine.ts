/**
 * Jaimini Chara Karaka Engine
 *
 * Standalone module that computes Chara Karakas from birth data.
 * Input: date of birth, time of birth, place of birth
 * Output: list of 7 karakas with planet, degree, rashi, house, dignity, role
 *
 * Rules:
 * - Only 7 visible planets are eligible: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
 * - Rahu and Ketu are excluded (nodes don't own signs in Jaimini)
 * - Planets are sorted by degree_in_rashi (0–30°) in descending order
 * - Highest degree = Atmakaraka (soul significator)
 * - 2nd highest = Amatyakaraka (career significator)
 * - 3rd = Bhratrikaraka (siblings), 4th = Matrikaraka (mother)
 * - 5th = Putrakaraka (children), 6th = Gnatikaraka (enemies/relatives)
 * - 7th = Darakaraka (spouse)
 */

import { PlanetPosition, NavamsaPosition, BirthDataInput, ChartResponse, calculateChart } from "./api";

// Only visible planets — Rahu/Ketu excluded per Jaimini system
export const CHARA_ELIGIBLE_PLANETS = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"
] as const;

export type CharaKarakaName =
  | "Atmakaraka"
  | "Amatyakaraka"
  | "Bhratrikaraka"
  | "Matrikaraka"
  | "Putrakaraka"
  | "Gnatikaraka"
  | "Darakaraka";

export const KARAKA_ROLES: CharaKarakaName[] = [
  "Atmakaraka",
  "Amatyakaraka",
  "Bhratrikaraka",
  "Matrikaraka",
  "Putrakaraka",
  "Gnatikaraka",
  "Darakaraka",
];

export const KARAKA_MEANINGS: Record<CharaKarakaName, string> = {
  Atmakaraka: "Soul significator — the planet most advanced in its sign, representing the native's deepest self and life purpose",
  Amatyakaraka: "Career/minister significator — indicates profession, intellect, and advisory capacity",
  Bhratrikaraka: "Sibling significator — governs younger siblings, courage, and initiative",
  Matrikaraka: "Mother significator — represents mother, nurturing, emotional security, and property",
  Putrakaraka: "Children significator — governs children, creativity, intelligence, and merit (purva punya)",
  Gnatikaraka: "Rival/relative significator — indicates enemies, diseases, obstacles, and extended family",
  Darakaraka: "Spouse significator — the planet with lowest degree, representing partner and marriage",
};

export interface KarakaResult {
  role: CharaKarakaName;
  meaning: string;
  planet: string;
  degree_in_rashi: number;
  rashi: string;
  rashi_num: number;
  house: number;
  nakshatra: string;
  nakshatra_pada: number;
  dignity: string | null;
  is_retrograde: boolean;
  lord_of_houses: number[];
}

export interface KarakaEngineOutput {
  /** Birth data used for computation */
  birth_data: {
    date: string;
    time: string;
    place: string;
  };
  /** Lagna of the chart */
  lagna: string;
  /** Ayanamsha used */
  ayanamsha: string;
  /** All 7 Chara Karakas, ordered from Atmakaraka to Darakaraka */
  karakas: KarakaResult[];
}

/**
 * Compute Chara Karakas from pre-computed planet positions.
 * Use this when you already have chart data available.
 */
export function computeCharaKarakas(planets: PlanetPosition[]): KarakaResult[] {
  const eligible = planets
    .filter(p => (CHARA_ELIGIBLE_PLANETS as readonly string[]).includes(p.name))
    .sort((a, b) => b.degree_in_rashi - a.degree_in_rashi);

  return KARAKA_ROLES.map((role, i) => {
    const p = eligible[i];
    if (!p) return null;
    return {
      role,
      meaning: KARAKA_MEANINGS[role],
      planet: p.name,
      degree_in_rashi: p.degree_in_rashi,
      rashi: p.rashi,
      rashi_num: p.rashi_num,
      house: p.house,
      nakshatra: p.nakshatra,
      nakshatra_pada: p.nakshatra_pada,
      dignity: p.dignity,
      is_retrograde: p.is_retrograde,
      lord_of_houses: p.lord_of_houses,
    };
  }).filter(Boolean) as KarakaResult[];
}

// ────────────────────────────────────────────────────────────────────────────
// Karakamsha
// ────────────────────────────────────────────────────────────────────────────

export interface KarakamshaResult {
  /** The Atmakaraka planet (highest degree) */
  atmakaraka: string;
  /** Sign the Atmakaraka occupies in D1 (Rashi chart) */
  atmakaraka_rashi: string;
  /** Sign the Atmakaraka occupies in Navamsa (D9) — this IS the Karakamsha */
  karakamsha: string;
  /** Degree of the AK in its rashi */
  degree_in_rashi: number;
}

/**
 * Calculate Karakamsha — the Navamsa sign occupied by the Atmakaraka.
 *
 * The Atmakaraka is the planet with the highest degree_in_rashi among the
 * 7 visible planets (Sun–Saturn). Its Navamsa placement is the Karakamsha,
 * a key reference point in Jaimini astrology for determining career, status,
 * and spiritual inclination.
 *
 * @param planets    D1 planet positions (used to identify the Atmakaraka)
 * @param navamsaPlanets  Navamsa planet positions (used to find AK's Navamsa sign)
 * @returns KarakamshaResult or null if data is missing
 */
export function calculateKarakamsha(
  planets: PlanetPosition[],
  navamsaPlanets: NavamsaPosition[],
): KarakamshaResult | null {
  // Identify Atmakaraka: highest degree_in_rashi among eligible planets
  const eligible = planets
    .filter(p => (CHARA_ELIGIBLE_PLANETS as readonly string[]).includes(p.name))
    .sort((a, b) => b.degree_in_rashi - a.degree_in_rashi);

  const ak = eligible[0];
  if (!ak) return null;

  // Find the AK in Navamsa chart
  const akNavamsa = navamsaPlanets.find(np => np.name === ak.name);
  if (!akNavamsa) return null;

  return {
    atmakaraka: ak.name,
    atmakaraka_rashi: ak.rashi,
    karakamsha: akNavamsa.rashi,
    degree_in_rashi: ak.degree_in_rashi,
  };
}

/**
 * Full pipeline: accepts birth inputs, calls chart API, returns karakas.
 * Use this when starting from raw birth data.
 */
export async function calculateKarakas(input: {
  date: string;       // e.g. "1990-05-15"
  time: string;       // e.g. "14:30"
  place: string;      // e.g. "Mumbai, India"
  ayanamsha?: "lahiri" | "krishnamurti" | "raman";
}): Promise<KarakaEngineOutput> {
  const birthData: BirthDataInput = {
    date: input.date,
    time: input.time,
    place: input.place,
    ayanamsha: input.ayanamsha || "lahiri",
  };

  const chart: ChartResponse = await calculateChart(birthData);

  const karakas = computeCharaKarakas(chart.planets);

  return {
    birth_data: {
      date: input.date,
      time: input.time,
      place: input.place,
    },
    lagna: chart.lagna,
    ayanamsha: chart.ayanamsha,
    karakas,
  };
}
