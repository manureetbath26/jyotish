/**
 * Jaimini Yoga Checker
 *
 * Evaluates a natal chart against Jaimini Rajayoga definitions stored in the database.
 * Uses Chara Karakas (from karakaEngine) and Jaimini sign aspects (from charaDashaEngine).
 *
 * Usage:
 *   const yogas = await checkJaiminiYogas(chart);
 *   // Returns list of found yogas with interpretations
 */

import type { ChartResponse, PlanetPosition, HouseInfo } from "./api";
import { computeCharaKarakas, type KarakaResult } from "./karakaEngine";
import {
  hasJaiminiAspect,
  type Sign,
} from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Short karaka/entity codes used in yoga definitions */
type EntityCode = "AK" | "AmK" | "BK" | "MK" | "PK" | "GK" | "DK" | "5L";

/** Map from entity code to karaka role name */
const ENTITY_TO_ROLE: Record<string, string> = {
  AK: "Atmakaraka",
  AmK: "Amatyakaraka",
  BK: "Bhratrikaraka",
  MK: "Matrikaraka",
  PK: "Putrakaraka",
  GK: "Gnatikaraka",
  DK: "Darakaraka",
};

/** Natural benefics for special note checks */
const NATURAL_BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);

/** Natural malefics for special note checks */
const NATURAL_MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu"]);

/** Houses that are kendras (quadrants) from a reference */
const KENDRA_OFFSETS = new Set([1, 4, 7, 10]);

/** Houses that are trikonas (trines) from a reference */
const TRIKONA_OFFSETS = new Set([1, 5, 9]);

/** Dusthana house offsets */
const DUSTHANA_OFFSETS = new Set([6, 8, 12]);

// ────────────────────────────────────────────────────────────────────────────
// Yoga result types
// ────────────────────────────────────────────────────────────────────────────

export interface FoundYoga {
  yoga_number: number;
  name: string;
  group: string;
  entity1: string;
  entity2: string;
  entity1_planet: string;
  entity2_planet: string;
  entity1_sign: string;
  entity2_sign: string;
  condition_met: "conjunction" | "aspect" | "both";
  description: string;
  interpretation: string;
}

export interface SpecialNoteResult {
  note_number: number;
  name: string;
  check_type: string;
  is_active: boolean;
  details: string;
  description: string;
  interpretation: string;
}

export interface JaiminiYogaReport {
  /** All Rajayogas found in the chart */
  yogas: FoundYoga[];
  /** All special notes evaluated */
  special_notes: SpecialNoteResult[];
  /** Summary count */
  yoga_count: number;
  /** Karakas used for this evaluation */
  karakas: KarakaResult[];
}

// ────────────────────────────────────────────────────────────────────────────
// Database fetching
// ────────────────────────────────────────────────────────────────────────────

interface DbYoga {
  id: string;
  category: string;
  key1: string;
  key2: string;
  content: {
    yoga_number: number;
    name: string;
    entity1: string;
    entity2: string;
    condition: string;
    group: string;
    description: string;
    interpretation: string;
  };
}

interface DbSpecialNote {
  id: string;
  category: string;
  key1: string;
  key2: string;
  content: {
    note_number: number;
    name: string;
    check_type: string;
    description: string;
    interpretation: string;
  };
}

/**
 * Fetch yoga definitions from the database via API.
 * Falls back to empty arrays if the API is unreachable.
 */
async function fetchYogaDefinitions(): Promise<{
  yogas: DbYoga[];
  specialNotes: DbSpecialNote[];
}> {
  try {
    const [yogaRes, specialRes] = await Promise.all([
      fetch("/api/interpretations?category=jaimini_yoga"),
      fetch("/api/interpretations?category=jaimini_yoga_special"),
    ]);

    const yogas: DbYoga[] = yogaRes.ok ? await yogaRes.json() : [];
    const specialNotes: DbSpecialNote[] = specialRes.ok
      ? await specialRes.json()
      : [];

    return { yogas, specialNotes };
  } catch {
    console.warn("Could not fetch Jaimini Yoga definitions from database");
    return { yogas: [], specialNotes: [] };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: resolve entity code to planet info
// ────────────────────────────────────────────────────────────────────────────

interface ResolvedEntity {
  planet: string;
  sign: Sign;
  house: number;
}

/**
 * Resolve an entity code (AK, AmK, PK, DK, 5L) to the actual planet and its position.
 */
function resolveEntity(
  code: EntityCode | string,
  karakas: KarakaResult[],
  houses: HouseInfo[],
  planets: PlanetPosition[],
): ResolvedEntity | null {
  // Special case: 5L = 5th house lord
  if (code === "5L") {
    const fifthHouse = houses.find((h) => h.house_num === 5);
    if (!fifthHouse) return null;
    const lordName = fifthHouse.lord;
    const lordPlanet = planets.find((p) => p.name === lordName);
    if (!lordPlanet) return null;
    return {
      planet: lordName,
      sign: lordPlanet.rashi as Sign,
      house: lordPlanet.house,
    };
  }

  // Karaka codes
  const roleName = ENTITY_TO_ROLE[code];
  if (!roleName) return null;

  const karaka = karakas.find((k) => k.role === roleName);
  if (!karaka) return null;

  return {
    planet: karaka.planet,
    sign: karaka.rashi as Sign,
    house: karaka.house,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: check conjunction or aspect between two entities
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if two entities satisfy the yoga condition.
 * "together_or_aspecting" = conjunction (same sign) OR Jaimini aspect
 * "together_and_aspecting" = both conjunction AND aspect (rare — typically means strong link)
 */
function checkCondition(
  e1: ResolvedEntity,
  e2: ResolvedEntity,
  condition: string,
): "conjunction" | "aspect" | "both" | null {
  const sameSign = e1.sign === e2.sign;
  const aspecting =
    hasJaiminiAspect(e1.sign, e2.sign) ||
    hasJaiminiAspect(e2.sign, e1.sign);

  if (condition === "together_and_aspecting") {
    // Both conditions required
    if (sameSign && aspecting) return "both";
    // Treat "together" alone as satisfying too (conjunction is strongest)
    if (sameSign) return "conjunction";
    return null;
  }

  // Default: together_or_aspecting
  if (sameSign && aspecting) return "both";
  if (sameSign) return "conjunction";
  if (aspecting) return "aspect";
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Special note evaluators
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the house offset from one planet to another (1-based, forward zodiacal).
 */
function houseOffset(fromSign: Sign, toSign: Sign): number {
  const ZODIAC_ORDER: Sign[] = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  const fromIdx = ZODIAC_ORDER.indexOf(fromSign);
  const toIdx = ZODIAC_ORDER.indexOf(toSign);
  return ((toIdx - fromIdx + 12) % 12) + 1; // 1 = same sign
}

function evaluateSpecialNote(
  note: DbSpecialNote,
  karakas: KarakaResult[],
  planets: PlanetPosition[],
  houses: HouseInfo[],
): SpecialNoteResult {
  const { content } = note;
  const base: Omit<SpecialNoteResult, "is_active" | "details"> = {
    note_number: content.note_number,
    name: content.name,
    check_type: content.check_type,
    description: content.description,
    interpretation: content.interpretation,
  };

  switch (content.check_type) {
    case "moon_venus_conjunction_or_aspect": {
      const moon = planets.find((p) => p.name === "Moon");
      const venus = planets.find((p) => p.name === "Venus");
      if (!moon || !venus) {
        return { ...base, is_active: false, details: "Moon or Venus not found in chart." };
      }
      const sameSign = moon.rashi === venus.rashi;
      const aspect =
        hasJaiminiAspect(moon.rashi as Sign, venus.rashi as Sign) ||
        hasJaiminiAspect(venus.rashi as Sign, moon.rashi as Sign);
      const active = sameSign || aspect;
      const how = sameSign ? "conjunction" : aspect ? "Jaimini aspect" : "none";
      return {
        ...base,
        is_active: active,
        details: `Moon in ${moon.rashi}, Venus in ${venus.rashi} — ${how}.`,
      };
    }

    case "moon_multi_aspected": {
      const moon = planets.find((p) => p.name === "Moon");
      if (!moon) {
        return { ...base, is_active: false, details: "Moon not found in chart." };
      }
      const moonSign = moon.rashi as Sign;
      // Count planets aspecting the Moon's sign (Jaimini rashi drishti)
      const aspectingPlanets = planets.filter(
        (p) =>
          p.name !== "Moon" &&
          hasJaiminiAspect(p.rashi as Sign, moonSign),
      );
      const active = aspectingPlanets.length >= 3;
      return {
        ...base,
        is_active: active,
        details: `Moon in ${moonSign} aspected by ${aspectingPlanets.length} planet(s): ${aspectingPlanets.map((p) => p.name).join(", ") || "none"}.`,
      };
    }

    case "navamsha_confirmation": {
      // Cannot evaluate without Navamsha yoga data — flag as informational
      return {
        ...base,
        is_active: false,
        details: "Navamsha yoga comparison requires separate analysis. Check Navamsha chart for confirmation of D1 yogas.",
      };
    }

    case "amk_well_placed": {
      const ak = karakas.find((k) => k.role === "Atmakaraka");
      const amk = karakas.find((k) => k.role === "Amatyakaraka");
      if (!ak || !amk) {
        return { ...base, is_active: false, details: "AK or AmK not found." };
      }
      const offset = houseOffset(ak.rashi as Sign, amk.rashi as Sign);
      const wellPlaced =
        KENDRA_OFFSETS.has(offset) ||
        TRIKONA_OFFSETS.has(offset) ||
        offset === 11;
      return {
        ...base,
        is_active: wellPlaced,
        details: `AmK (${amk.planet} in ${amk.rashi}) is ${offset}th from AK (${ak.planet} in ${ak.rashi}) — ${wellPlaced ? "well placed (kendra/trikona/11th)" : "not in favorable position"}.`,
      };
    }

    case "ak_amk_difficult": {
      const ak = karakas.find((k) => k.role === "Atmakaraka");
      const amk = karakas.find((k) => k.role === "Amatyakaraka");
      if (!ak || !amk) {
        return { ...base, is_active: false, details: "AK or AmK not found." };
      }
      const offset = houseOffset(ak.rashi as Sign, amk.rashi as Sign);
      const difficult = DUSTHANA_OFFSETS.has(offset);
      return {
        ...base,
        is_active: difficult,
        details: `AmK (${amk.planet}) is ${offset}th from AK (${ak.planet}) — ${difficult ? "dusthana placement, struggles in career" : "not in dusthana"}.`,
      };
    }

    case "afflicted_karakas": {
      // Check each karaka for malefic conjunction or aspect
      const afflictions: string[] = [];
      for (const karaka of karakas) {
        const kSign = karaka.rashi as Sign;
        // Malefics in same sign (conjunction)
        const conjunctMalefics = planets.filter(
          (p) =>
            p.name !== karaka.planet &&
            NATURAL_MALEFICS.has(p.name) &&
            p.rashi === karaka.rashi,
        );
        // Malefics aspecting by Jaimini drishti
        const aspectingMalefics = planets.filter(
          (p) =>
            NATURAL_MALEFICS.has(p.name) &&
            p.rashi !== karaka.rashi &&
            hasJaiminiAspect(p.rashi as Sign, kSign),
        );
        const allMalefics = [
          ...conjunctMalefics.map((p) => `${p.name} (conjunct)`),
          ...aspectingMalefics.map((p) => `${p.name} (aspect)`),
        ];
        if (allMalefics.length > 0) {
          afflictions.push(
            `${karaka.role} (${karaka.planet}): afflicted by ${allMalefics.join(", ")}`,
          );
        }
      }
      return {
        ...base,
        is_active: afflictions.length > 0,
        details:
          afflictions.length > 0
            ? afflictions.join("; ")
            : "No karakas are afflicted by malefics.",
      };
    }

    case "benefic_aspects": {
      // Check each karaka for benefic conjunction or aspect
      const benefits: string[] = [];
      for (const karaka of karakas) {
        const kSign = karaka.rashi as Sign;
        const conjunctBenefics = planets.filter(
          (p) =>
            p.name !== karaka.planet &&
            NATURAL_BENEFICS.has(p.name) &&
            p.rashi === karaka.rashi,
        );
        const aspectingBenefics = planets.filter(
          (p) =>
            NATURAL_BENEFICS.has(p.name) &&
            p.rashi !== karaka.rashi &&
            hasJaiminiAspect(p.rashi as Sign, kSign),
        );
        const allBenefics = [
          ...conjunctBenefics.map((p) => `${p.name} (conjunct)`),
          ...aspectingBenefics.map((p) => `${p.name} (aspect)`),
        ];
        if (allBenefics.length > 0) {
          benefits.push(
            `${karaka.role} (${karaka.planet}): supported by ${allBenefics.join(", ")}`,
          );
        }
      }
      return {
        ...base,
        is_active: benefits.length > 0,
        details:
          benefits.length > 0
            ? benefits.join("; ")
            : "No karakas receive benefic support.",
      };
    }

    default:
      return {
        ...base,
        is_active: false,
        details: `Unknown check type: ${content.check_type}`,
      };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main checker function
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check all Jaimini Rajayogas for a given natal chart.
 *
 * 1. Computes Chara Karakas from the chart's planets
 * 2. Fetches yoga definitions from the database
 * 3. Evaluates each yoga condition (conjunction / Jaimini aspect)
 * 4. Evaluates all special notes
 * 5. Returns a complete report
 */
export async function checkJaiminiYogas(
  chart: ChartResponse,
): Promise<JaiminiYogaReport> {
  // Step 1: Compute karakas
  const karakas = computeCharaKarakas(chart.planets);

  // Step 2: Fetch yoga definitions from DB
  const { yogas: yogaDefs, specialNotes: noteDefs } =
    await fetchYogaDefinitions();

  // Step 3: Evaluate each yoga
  const foundYogas: FoundYoga[] = [];

  for (const def of yogaDefs) {
    const { content } = def;

    const e1 = resolveEntity(
      content.entity1,
      karakas,
      chart.houses,
      chart.planets,
    );
    const e2 = resolveEntity(
      content.entity2,
      karakas,
      chart.houses,
      chart.planets,
    );

    if (!e1 || !e2) continue;

    const conditionMet = checkCondition(e1, e2, content.condition);
    if (!conditionMet) continue;

    foundYogas.push({
      yoga_number: content.yoga_number,
      name: content.name,
      group: content.group,
      entity1: content.entity1,
      entity2: content.entity2,
      entity1_planet: e1.planet,
      entity2_planet: e2.planet,
      entity1_sign: e1.sign,
      entity2_sign: e2.sign,
      condition_met: conditionMet,
      description: content.description,
      interpretation: content.interpretation,
    });
  }

  // Step 4: Evaluate special notes
  const specialNotes: SpecialNoteResult[] = noteDefs.map((note) =>
    evaluateSpecialNote(note, karakas, chart.planets, chart.houses),
  );

  return {
    yogas: foundYogas,
    special_notes: specialNotes,
    yoga_count: foundYogas.length,
    karakas,
  };
}

/**
 * Synchronous version that works with pre-loaded yoga definitions.
 * Useful when you've already fetched definitions and want to avoid async overhead.
 */
export function checkJaiminiYogasSync(
  chart: ChartResponse,
  yogaDefs: DbYoga[],
  noteDefs: DbSpecialNote[],
): JaiminiYogaReport {
  const karakas = computeCharaKarakas(chart.planets);

  const foundYogas: FoundYoga[] = [];

  for (const def of yogaDefs) {
    const { content } = def;
    const e1 = resolveEntity(content.entity1, karakas, chart.houses, chart.planets);
    const e2 = resolveEntity(content.entity2, karakas, chart.houses, chart.planets);
    if (!e1 || !e2) continue;

    const conditionMet = checkCondition(e1, e2, content.condition);
    if (!conditionMet) continue;

    foundYogas.push({
      yoga_number: content.yoga_number,
      name: content.name,
      group: content.group,
      entity1: content.entity1,
      entity2: content.entity2,
      entity1_planet: e1.planet,
      entity2_planet: e2.planet,
      entity1_sign: e1.sign,
      entity2_sign: e2.sign,
      condition_met: conditionMet,
      description: content.description,
      interpretation: content.interpretation,
    });
  }

  const specialNotes = noteDefs.map((note) =>
    evaluateSpecialNote(note, karakas, chart.planets, chart.houses),
  );

  return {
    yogas: foundYogas,
    special_notes: specialNotes,
    yoga_count: foundYogas.length,
    karakas,
  };
}
