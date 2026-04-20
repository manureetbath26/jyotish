/**
 * Yoga detection engine.
 *
 * Takes a ChartResponse and a set of YogaRule entries (from the DB), runs
 * each rule's structured detector against the chart, and returns the list
 * of yogas present with supporting evidence.
 *
 * Sources: Brihat Parashara Hora Shastra (BPHS), chapters 34-43.
 * - Ch 34: Yoga Karakas (per-ascendant yoga-making planets)
 * - Ch 35: Nabhasa Yogas (32 geometric combinations)
 * - Ch 36: Many other yogas (Gaja Kesari, Amala, Parvata, ...)
 * - Ch 37: Chandra yogas (Adhi, Sunapha, Anapha, Duradhara, KemaDruma)
 * - Ch 38: Surya yogas (Vesi, Vosi, Ubhayachari)
 * - Ch 39: Raja Yogas (royal combinations)
 * - Ch 40: Yogas for royal association
 * - Ch 41: Wealth combinations
 * - Ch 42: Poverty (Daridra) combinations
 * - Ch 43: Longevity calculations (not rendered as yogas)
 */

import type { ChartResponse, PlanetPosition } from "./api";
import {
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  type Sign,
} from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type YogaCategory =
  | "mahapurusha"
  | "nabhasa"
  | "chandra"
  | "surya"
  | "raja"
  | "dhana"
  | "special"
  | "dosha";

export interface YogaRule {
  id: string;
  slug: string;
  name: string;
  category: YogaCategory;
  chapter: number;
  source: string;
  classicalText: string;
  formation: string;
  effects: string;
  /** Richer narrative: manifestation, activation, caveats, how to maximize */
  implications?: string | null;
  importance: number;
  detector: YogaDetector;
  sortOrder: number;
}

/** Union of all detector types supported by this engine. */
export type YogaDetector =
  // Pancha Mahapurusha — planet in own/exalted sign AND in a kendra
  | { type: "mahapurusha"; planet: "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" }
  // Nabhasa Asraya — all 7 planets in a single modality
  | { type: "nabhasa_asraya"; modality: "movable" | "fixed" | "dual" }
  // Nabhasa Dala — 3 kendras occupied by only benefics (Maala) or only malefics (Sarpa)
  | { type: "nabhasa_dala"; subtype: "maala" | "sarpa" }
  // Nabhasa Sankhya — all 7 planets in exactly N signs
  | { type: "nabhasa_sankhya"; signsOccupied: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  // Gaja Kesari — Jupiter in kendra from Moon or Lagna
  | { type: "gajakesari" }
  // Amala — benefic in 10th from Lagna or Moon
  | { type: "amala" }
  // Parvata — benefics in kendras with 6th and 8th houses vacant
  | { type: "parvata" }
  // Lakshmi — 9th lord in kendra in own/exalt/moola + strong lagna lord
  | { type: "lakshmi" }
  // Chamara — exalted lagna lord in kendra with Jupiter's drishti
  | { type: "chamara" }
  // Kalanidhi — Jupiter in 2nd or 5th, aspected by/conjunct Mercury & Venus
  | { type: "kalanidhi" }
  // Budhaditya — Sun + Mercury conjunction
  | { type: "budhaditya" }
  // Chandra-Mangal — Moon + Mars conjunction
  | { type: "chandra_mangal" }
  // Adhi yoga — benefics in 6th, 7th, 8th from Moon
  | { type: "adhi_moon" }
  // Sunapha — planet other than Sun in 2nd from Moon
  | { type: "sunapha" }
  // Anapha — planet other than Sun in 12th from Moon
  | { type: "anapha" }
  // Duradhara — planets in both 2nd and 12th from Moon
  | { type: "duradhara" }
  // Kema Druma — no planets in 2nd/12th/with Moon, and no kendra from Lagna
  | { type: "kemadruma" }
  // Vesi — planet other than Moon in 2nd from Sun
  | { type: "vesi" }
  // Vosi — planet other than Moon in 12th from Sun
  | { type: "vosi" }
  // Ubhayachari — planets in both 2nd and 12th from Sun (not Moon)
  | { type: "ubhayachari" }
  // Maha Raja — lagna lord and 5th lord in mutual exchange (parivartana)
  | { type: "maha_raja" }
  // Generic Raja yoga — kendra lord + kona lord in conjunction/exchange/aspect
  | { type: "raja_kendra_kona" }
  // Dhana yoga — 2nd/5th/9th/11th lords in any combination (conjunction/aspect/exchange)
  | { type: "dhana_yoga" }
  // Wealth in lagna — Planet in lagna in own sign + aspects from specific planets
  | { type: "wealth_lagna"; planet: string; aspecters: string[] }
  // Daridra (poverty) — lagna lord in 12th + 12th lord in lagna with marak lord
  | { type: "daridra_lagna_12_swap" }
  // Shakata — Jupiter in 6/8/12 from Moon
  | { type: "shakata" }
  // Kala Sarpa — all 7 classical planets between Rahu and Ketu
  | { type: "kala_sarpa" }
  // Vipareet Raja Yogas — Nth lord in 6/8/12 houses
  | { type: "vipareet_raja"; house: 6 | 8 | 12 }  // Harsha / Sarala / Vimala
  // Papa/Shubha Kartari — malefics/benefics flanking a reference (Lagna or Moon)
  // Permissive reading: fires when there is AT LEAST one of the relevant
  // class (benefic/malefic) in BOTH the 12th and 2nd from the reference.
  // The two flavours can co-exist on the same reference if both classes are
  // represented on each flanking side.
  | { type: "kartari"; benefic: boolean; reference: "lagna" | "moon" }
  // Per-planet Kartari — same flanking logic but reference is a specific planet's sign
  | { type: "kartari_planet"; benefic: boolean; planet: string }
  // Per-bhava Kartari — flanking the sign of bhava N
  | { type: "kartari_bhava"; benefic: boolean; bhava: number }
  // Yogakaraka planet — a planet that lords both a Kendra and a Kona
  | { type: "yogakaraka" }
  // Dhana via mutual 7th aspect between wealth lords
  | { type: "dhana_mutual_aspect" }
  // Parivartana — exchange between any two house lords
  | { type: "parivartana_general" }
  // Saraswati — Jupiter + Venus + Mercury in kendra/kona/2nd, Jupiter strong
  | { type: "saraswati" }
  // Amala (10th from Moon variant) — benefic only in 10th from Moon
  // (covered by existing "amala")
  // Vasumati — benefics in upachayas (3/6/10/11) from Lagna or Sun
  | { type: "vasumati" }
  // Planet-pair conjunction doshas/special yogas
  | { type: "planet_conjunction"; planetA: string; planetB: string }
  // Neecha Bhanga — debilitated planet with cancellation
  | { type: "neecha_bhanga" }
  // Akhanda Samrajya — 2L, 9L, 11L related with Jupiter influence
  | { type: "akhanda_samrajya" }
  // Sunapha/Anapha all-benefic or all-malefic subtype (flavours existing rules)
  // Grahana (eclipse) — Sun or Moon conjunct Rahu or Ketu
  | { type: "grahana" }
  // Named Raja yogas from BPHS Ch 36
  | { type: "shankh" }
  | { type: "bhairi" }
  | { type: "mridang" }
  | { type: "shrinath" }
  | { type: "khadg" }
  | { type: "matsya" }
  | { type: "kurma" }
  // Chandra-yoga flavor variants (is it benefic-flavored or malefic-flavored?)
  | { type: "sunapha_flavored"; flavor: "benefic" | "malefic" }
  | { type: "anapha_flavored"; flavor: "benefic" | "malefic" }
  | { type: "duradhara_flavored"; flavor: "benefic" | "malefic" }
  // Per-ascendant yogakaraka — BPHS Ch 34 specific narratives
  | { type: "ascendant_yogakaraka"; ascendant: Sign; planet: string }
  // General bhava yoga — lord of house N placed in house M
  | { type: "bhava_yoga"; lordOf: number; inHouse: number };

export interface DetectedYoga {
  rule: YogaRule;
  detected: true;
  evidence: string;
  /** Primary house this yoga acts through (if identifiable). */
  keyHouse?: number;
  /** Primary planets involved in this yoga's formation. */
  keyPlanets?: string[];
  /** Rashi (sign) where the yoga is seated, when relevant. */
  keySign?: Sign;
  /** Plain-English description of how this yoga is formed in *this* chart. */
  formationInChart?: string;
  /** Nuanced note on what this yoga means when anchored in its key house. */
  houseContextNote?: string;
  /** Overall verdict for this yoga given the house it sits in. */
  houseVerdict?: "favorable" | "mixed" | "challenging";
  /** D9 (Navamsa) strength check — only populated for applicable yogas. */
  d9Analysis?: D9Analysis;
}

// ────────────────────────────────────────────────────────────────────────────
// House significations (used for house-context explanations)
// ────────────────────────────────────────────────────────────────────────────

export const HOUSE_SIGNIFICATIONS: Record<number, { name: string; significations: string }> = {
  1:  { name: "Lagna (Self)",        significations: "self, body, vitality, personality, head, overall life direction" },
  2:  { name: "Dhana Bhava (Wealth)",significations: "wealth, family, speech, food, values, face" },
  3:  { name: "Sahaja (Siblings)",   significations: "courage, younger siblings, skills, short travel, self-effort, communication" },
  4:  { name: "Sukha (Home)",        significations: "home, mother, vehicles, inner peace, property, early education" },
  5:  { name: "Putra (Children)",    significations: "children, intelligence, creativity, romance, speculation, past-life merit (poorva punya)" },
  6:  { name: "Ripu (Enemies)",      significations: "enemies, debts, disease, daily work, service, obstacles overcome" },
  7:  { name: "Yuvati (Marriage)",   significations: "spouse, marriage, business partnerships, public dealings, open enemies" },
  8:  { name: "Ayu (Longevity)",     significations: "longevity, transformation, secrets, inheritance, occult, sudden events, in-laws" },
  9:  { name: "Dharma (Fortune)",    significations: "dharma, fortune, father, higher learning, long journeys, guru, spirituality" },
  10: { name: "Karma (Career)",      significations: "career, public image, status, authority, action in the world" },
  11: { name: "Labha (Gains)",       significations: "gains, friends, elder siblings, fulfilment of desires, networks" },
  12: { name: "Vyaya (Losses)",      significations: "expenses, foreign lands, moksha, seclusion, bed pleasures, hidden enemies" },
};

const TRIK_HOUSES = [6, 8, 12];
const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIKONA_HOUSES = [1, 5, 9];
const UPACHAYA_HOUSES = [3, 6, 10, 11];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]);
// "True" benefics exclude Moon (depends on phase/companionship) in stricter
// contexts. BPHS uses the lighter set for most yogas.
const STRICT_BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);

const KENDRAS = [1, 4, 7, 10];
const KONAS = [1, 5, 9];

const OWN_SIGNS: Record<string, Sign[]> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
};

const EXALTATION_SIGN: Record<string, Sign> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
};

const DEBILITATION_SIGN: Record<string, Sign> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
};

// Naisargika (natural) planetary friendships per Parashara (BPHS Ch 3)
const PLANET_FRIENDS: Record<string, string[]> = {
  Sun:     ["Moon", "Mars", "Jupiter"],
  Moon:    ["Sun", "Mercury"],
  Mars:    ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus:   ["Mercury", "Saturn"],
  Saturn:  ["Mercury", "Venus"],
};

const PLANET_ENEMIES: Record<string, string[]> = {
  Sun:     ["Venus", "Saturn"],
  Moon:    [],
  Mars:    ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus:   ["Sun", "Moon"],
  Saturn:  ["Sun", "Moon", "Mars"],
};

const MODALITY: Record<Sign, "movable" | "fixed" | "dual"> = {
  Aries: "movable", Cancer: "movable", Libra: "movable", Capricorn: "movable",
  Taurus: "fixed", Leo: "fixed", Scorpio: "fixed", Aquarius: "fixed",
  Gemini: "dual", Virgo: "dual", Sagittarius: "dual", Pisces: "dual",
};

const CLASSICAL_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

function signOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

function planetSign(chart: ChartResponse, name: string): Sign | null {
  const p = chart.planets.find((pl) => pl.name === name);
  return p ? (p.rashi as Sign) : null;
}

function planetHouse(chart: ChartResponse, name: string): number | null {
  const p = chart.planets.find((pl) => pl.name === name);
  return p ? p.house : null;
}

function planetsInSign(chart: ChartResponse, sign: Sign): PlanetPosition[] {
  return chart.planets.filter((p) => p.rashi === sign);
}

function planetsInHouse(chart: ChartResponse, house: number): PlanetPosition[] {
  return chart.planets.filter((p) => p.house === house);
}

function lordOf(house: number, lagna: Sign): string {
  const sign = signOffset(lagna, house);
  return SIGN_LORD[sign];
}

function houseNumberOfSign(sign: Sign, lagna: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
}

// Jaimini rashi-drishti aspects between signs (used for mutual-aspect Raja yogas)
function hasRashiAspect(from: Sign, to: Sign): boolean {
  if (from === to) return false;
  const m1 = MODALITY[from];
  const m2 = MODALITY[to];
  if (m1 === "movable") {
    if (m2 !== "fixed") return false;
    return Math.abs(SIGN_INDEX[from] - SIGN_INDEX[to]) !== 1 &&
           Math.abs(SIGN_INDEX[from] - SIGN_INDEX[to]) !== 11;
  }
  if (m1 === "fixed") {
    if (m2 !== "movable") return false;
    return Math.abs(SIGN_INDEX[from] - SIGN_INDEX[to]) !== 1 &&
           Math.abs(SIGN_INDEX[from] - SIGN_INDEX[to]) !== 11;
  }
  // dual
  return m2 === "dual";
}

// Parashari planet aspects (only relevant special aspects beyond 7th)
function planetAspectsHouse(chart: ChartResponse, planet: string, house: number): boolean {
  const ph = planetHouse(chart, planet);
  if (!ph) return false;
  const offset = ((house - ph + 12) % 12) + 1;
  // 7th aspect (all planets)
  if (offset === 7) return true;
  // Jupiter: 5, 9
  if (planet === "Jupiter" && (offset === 5 || offset === 9)) return true;
  // Mars: 4, 8
  if (planet === "Mars" && (offset === 4 || offset === 8)) return true;
  // Saturn: 3, 10
  if (planet === "Saturn" && (offset === 3 || offset === 10)) return true;
  // Rahu/Ketu: 5, 7, 9 (per some traditions)
  if ((planet === "Rahu" || planet === "Ketu") && (offset === 5 || offset === 9)) return true;
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Detector implementations
// ────────────────────────────────────────────────────────────────────────────

function detectMahapurusha(
  planet: "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn",
  chart: ChartResponse,
): string | null {
  const sign = planetSign(chart, planet);
  const house = planetHouse(chart, planet);
  if (!sign || !house) return null;
  if (!KENDRAS.includes(house)) return null;
  const isOwn = OWN_SIGNS[planet]?.includes(sign) ?? false;
  const isExalted = EXALTATION_SIGN[planet] === sign;
  if (!isOwn && !isExalted) return null;
  return `${planet} is ${isExalted ? "exalted" : "in own sign"} (${sign}) and occupies kendra house ${house}`;
}

function detectNabhasaAsraya(
  modality: "movable" | "fixed" | "dual",
  chart: ChartResponse,
): string | null {
  const relevant = chart.planets.filter((p) => CLASSICAL_PLANETS.includes(p.name));
  if (relevant.length < 7) return null;
  if (relevant.every((p) => MODALITY[p.rashi as Sign] === modality)) {
    return `All 7 planets in ${modality} signs (${[...new Set(relevant.map((p) => p.rashi))].join(", ")})`;
  }
  return null;
}

function detectNabhasaDala(
  subtype: "maala" | "sarpa",
  chart: ChartResponse,
): string | null {
  const kendraOccupants = [1, 4, 7, 10].map((h) => planetsInHouse(chart, h));
  const occupied = kendraOccupants.filter((occ) => occ.length > 0);
  if (occupied.length < 3) return null;
  if (subtype === "maala") {
    const allBenefic = occupied.every((occ) =>
      occ.every((p) => BENEFICS.has(p.name)),
    );
    if (allBenefic && occupied.length >= 3) {
      const kendras = [1, 4, 7, 10].filter((h) => planetsInHouse(chart, h).length > 0);
      return `${kendras.length} kendras (${kendras.join(", ")}) occupied only by benefics`;
    }
  } else {
    const allMalefic = occupied.every((occ) =>
      occ.every((p) => MALEFICS.has(p.name)),
    );
    if (allMalefic && occupied.length >= 3) {
      const kendras = [1, 4, 7, 10].filter((h) => planetsInHouse(chart, h).length > 0);
      return `${kendras.length} kendras (${kendras.join(", ")}) occupied only by malefics`;
    }
  }
  return null;
}

function detectNabhasaSankhya(
  signsOccupied: number,
  chart: ChartResponse,
): string | null {
  const relevant = chart.planets.filter((p) => CLASSICAL_PLANETS.includes(p.name));
  if (relevant.length < 7) return null;
  const uniqueSigns = new Set(relevant.map((p) => p.rashi)).size;
  if (uniqueSigns === signsOccupied) {
    return `All 7 planets span exactly ${signsOccupied} sign${signsOccupied > 1 ? "s" : ""}`;
  }
  return null;
}

function detectGajakesari(chart: ChartResponse): string | null {
  const jupiterHouse = planetHouse(chart, "Jupiter");
  const moonHouse = planetHouse(chart, "Moon");
  if (!jupiterHouse || !moonHouse) return null;

  // Jupiter kendra from Moon
  const fromMoon = ((jupiterHouse - moonHouse + 12) % 12) + 1;
  const kendraFromMoon = KENDRAS.includes(fromMoon);
  const kendraFromLagna = KENDRAS.includes(jupiterHouse);
  if (!kendraFromMoon && !kendraFromLagna) return null;

  // Avoid debilitation / combustion (rough — no combustion data, skip)
  const jSign = planetSign(chart, "Jupiter");
  if (jSign === "Capricorn") return null; // Jupiter debilitated

  const where = kendraFromMoon
    ? `Jupiter in kendra (${fromMoon}th) from Moon`
    : `Jupiter in kendra from Lagna (house ${jupiterHouse})`;
  return where;
}

function detectAmala(chart: ChartResponse): string | null {
  const tenthFromLagna = planetsInHouse(chart, 10);
  const moonHouse = planetHouse(chart, "Moon");
  let text: string | null = null;
  if (tenthFromLagna.length > 0 && tenthFromLagna.every((p) => BENEFICS.has(p.name))) {
    text = `Benefic${tenthFromLagna.length > 1 ? "s" : ""} (${tenthFromLagna.map((p) => p.name).join(", ")}) exclusively in 10th from Lagna`;
  }
  if (!text && moonHouse) {
    const tenthFromMoonHouseNum = ((moonHouse + 9 - 1) % 12) + 1;
    const tenthFromMoon = planetsInHouse(chart, tenthFromMoonHouseNum);
    if (tenthFromMoon.length > 0 && tenthFromMoon.every((p) => BENEFICS.has(p.name))) {
      text = `Benefic${tenthFromMoon.length > 1 ? "s" : ""} (${tenthFromMoon.map((p) => p.name).join(", ")}) exclusively in 10th from Moon`;
    }
  }
  return text;
}

function detectParvata(chart: ChartResponse): string | null {
  const kendraBenefics: string[] = [];
  for (const h of KENDRAS) {
    const occ = planetsInHouse(chart, h);
    for (const p of occ) {
      if (BENEFICS.has(p.name)) kendraBenefics.push(`${p.name}(H${h})`);
    }
  }
  if (kendraBenefics.length < 2) return null;
  // 6th and 8th houses must be vacant or only have benefics
  const sixth = planetsInHouse(chart, 6);
  const eighth = planetsInHouse(chart, 8);
  const cleanDusthanas =
    (sixth.length === 0 || sixth.every((p) => BENEFICS.has(p.name))) &&
    (eighth.length === 0 || eighth.every((p) => BENEFICS.has(p.name)));
  if (!cleanDusthanas) return null;
  return `Benefics in kendras (${kendraBenefics.join(", ")}) with 6th and 8th unoccupied by malefics`;
}

function detectLakshmi(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const ninthLord = lordOf(9, lagna);
  const ninthLordHouse = planetHouse(chart, ninthLord);
  const ninthLordSign = planetSign(chart, ninthLord);
  if (!ninthLordHouse || !ninthLordSign) return null;
  if (!KENDRAS.includes(ninthLordHouse)) return null;

  const isOwn = OWN_SIGNS[ninthLord]?.includes(ninthLordSign) ?? false;
  const isExalted = EXALTATION_SIGN[ninthLord] === ninthLordSign;
  if (!isOwn && !isExalted) return null;

  // Lagna lord must be "strong" — approximation: in own/exalted/kendra/trikona
  const lagnaLord = lordOf(1, lagna);
  const lagnaLordHouse = planetHouse(chart, lagnaLord);
  const lagnaLordSign = planetSign(chart, lagnaLord);
  if (!lagnaLordHouse || !lagnaLordSign) return null;
  const ownOrExalted =
    (OWN_SIGNS[lagnaLord]?.includes(lagnaLordSign) ?? false) ||
    EXALTATION_SIGN[lagnaLord] === lagnaLordSign;
  const strongPlaced = KENDRAS.includes(lagnaLordHouse) || KONAS.includes(lagnaLordHouse);
  if (!ownOrExalted && !strongPlaced) return null;

  return `9th lord ${ninthLord} ${isExalted ? "exalted" : "in own sign"} (${ninthLordSign}) in kendra (H${ninthLordHouse}), lagna lord ${lagnaLord} also well-placed`;
}

function detectChamara(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const lagnaLord = lordOf(1, lagna);
  const lagnaLordHouse = planetHouse(chart, lagnaLord);
  const lagnaLordSign = planetSign(chart, lagnaLord);
  if (!lagnaLordHouse || !lagnaLordSign) return null;
  if (EXALTATION_SIGN[lagnaLord] !== lagnaLordSign) return null;
  if (!KENDRAS.includes(lagnaLordHouse)) return null;
  if (!planetAspectsHouse(chart, "Jupiter", lagnaLordHouse)) return null;
  return `Lagna lord ${lagnaLord} exalted in kendra (H${lagnaLordHouse}), aspected by Jupiter`;
}

function detectKalanidhi(chart: ChartResponse): string | null {
  const jupiterHouse = planetHouse(chart, "Jupiter");
  if (!jupiterHouse) return null;
  if (jupiterHouse !== 2 && jupiterHouse !== 5) return null;
  const mercuryConjOrAspect =
    planetHouse(chart, "Mercury") === jupiterHouse ||
    planetAspectsHouse(chart, "Mercury", jupiterHouse);
  const venusConjOrAspect =
    planetHouse(chart, "Venus") === jupiterHouse ||
    planetAspectsHouse(chart, "Venus", jupiterHouse);
  if (!mercuryConjOrAspect || !venusConjOrAspect) return null;
  return `Jupiter in ${jupiterHouse === 2 ? "2nd" : "5th"} with Mercury and Venus influence`;
}

function detectBudhaditya(chart: ChartResponse): string | null {
  const sunHouse = planetHouse(chart, "Sun");
  const mercuryHouse = planetHouse(chart, "Mercury");
  if (!sunHouse || !mercuryHouse) return null;
  if (sunHouse !== mercuryHouse) return null;
  return `Sun and Mercury conjunct in house ${sunHouse}`;
}

function detectChandraMangal(chart: ChartResponse): string | null {
  const mH = planetHouse(chart, "Moon");
  const marsH = planetHouse(chart, "Mars");
  if (!mH || !marsH) return null;
  if (mH !== marsH) return null;
  return `Moon and Mars conjunct in house ${mH}`;
}

function detectAdhiMoon(chart: ChartResponse): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  // 6th, 7th, 8th from Moon
  const targetHouses = [6, 7, 8].map((off) => ((moonHouse + off - 1 - 1) % 12) + 1);
  const hits: string[] = [];
  for (const h of targetHouses) {
    const benefic = planetsInHouse(chart, h).find((p) => BENEFICS.has(p.name));
    if (benefic) hits.push(`${benefic.name}@H${h}`);
  }
  if (hits.length >= 2) {
    return `Benefic(s) in 6/7/8 from Moon: ${hits.join(", ")}`;
  }
  return null;
}

function detectSunapha(chart: ChartResponse): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  const secondFromMoon = ((moonHouse + 1 - 1) % 12) + 1;
  const occupants = planetsInHouse(chart, secondFromMoon).filter((p) => p.name !== "Sun" && p.name !== "Moon");
  if (occupants.length === 0) return null;
  return `${occupants.map((p) => p.name).join(", ")} in 2nd from Moon (house ${secondFromMoon})`;
}

function detectAnapha(chart: ChartResponse): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  const twelfthFromMoon = ((moonHouse - 1 - 1 + 12) % 12) + 1;
  const occupants = planetsInHouse(chart, twelfthFromMoon).filter((p) => p.name !== "Sun" && p.name !== "Moon");
  if (occupants.length === 0) return null;
  return `${occupants.map((p) => p.name).join(", ")} in 12th from Moon (house ${twelfthFromMoon})`;
}

function detectDuradhara(chart: ChartResponse): string | null {
  const sun = detectSunapha(chart);
  const ana = detectAnapha(chart);
  if (sun && ana) return `${sun}; ${ana}`;
  return null;
}

function detectKemadruma(chart: ChartResponse): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  const same = planetsInHouse(chart, moonHouse).filter((p) => p.name !== "Moon" && p.name !== "Sun");
  const second = planetsInHouse(chart, ((moonHouse + 1 - 1) % 12) + 1).filter((p) => p.name !== "Sun");
  const twelfth = planetsInHouse(chart, ((moonHouse - 1 - 1 + 12) % 12) + 1).filter((p) => p.name !== "Sun");
  if (same.length > 0 || second.length > 0 || twelfth.length > 0) return null;
  // Check kendras from Lagna for planets (some texts say no planets in kendras from Lagna either)
  return `Moon is alone — no non-Sun planets in 2nd, 12th, or with Moon`;
}

function detectVesi(chart: ChartResponse): string | null {
  const sunHouse = planetHouse(chart, "Sun");
  if (!sunHouse) return null;
  const secondFromSun = ((sunHouse + 1 - 1) % 12) + 1;
  const occ = planetsInHouse(chart, secondFromSun).filter((p) => p.name !== "Moon" && p.name !== "Sun");
  if (occ.length === 0) return null;
  return `${occ.map((p) => p.name).join(", ")} in 2nd from Sun`;
}

function detectVosi(chart: ChartResponse): string | null {
  const sunHouse = planetHouse(chart, "Sun");
  if (!sunHouse) return null;
  const twelfthFromSun = ((sunHouse - 1 - 1 + 12) % 12) + 1;
  const occ = planetsInHouse(chart, twelfthFromSun).filter((p) => p.name !== "Moon" && p.name !== "Sun");
  if (occ.length === 0) return null;
  return `${occ.map((p) => p.name).join(", ")} in 12th from Sun`;
}

function detectUbhayachari(chart: ChartResponse): string | null {
  const v = detectVesi(chart);
  const vs = detectVosi(chart);
  if (v && vs) return `${v}; ${vs}`;
  return null;
}

function detectMahaRaja(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const l1 = lordOf(1, lagna);
  const l5 = lordOf(5, lagna);
  if (l1 === l5) return null;
  const l1Sign = planetSign(chart, l1);
  const l5Sign = planetSign(chart, l5);
  if (!l1Sign || !l5Sign) return null;
  // Parivartana: l1 in l5's natal sign AND l5 in l1's natal sign
  const l1NatalSign = signOffset(lagna, 1);
  const l5NatalSign = signOffset(lagna, 5);
  if (l1Sign === l5NatalSign && l5Sign === l1NatalSign) {
    return `Lagna lord ${l1} and 5th lord ${l5} have exchanged signs (parivartana yoga)`;
  }
  return null;
}

function detectRajaKendraKona(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const kendraLords = new Set([lordOf(1, lagna), lordOf(4, lagna), lordOf(7, lagna), lordOf(10, lagna)]);
  const konaLords = new Set([lordOf(1, lagna), lordOf(5, lagna), lordOf(9, lagna)]);
  // Remove lagna lord from one side to avoid trivial self-pairing
  konaLords.delete(lordOf(1, lagna));

  for (const kendraL of kendraLords) {
    for (const konaL of konaLords) {
      if (kendraL === konaL) continue;
      const kSign = planetSign(chart, kendraL);
      const trSign = planetSign(chart, konaL);
      const kHouse = planetHouse(chart, kendraL);
      const trHouse = planetHouse(chart, konaL);
      if (!kSign || !trSign || !kHouse || !trHouse) continue;
      // Conjunction
      if (kSign === trSign) {
        return `Kendra lord ${kendraL} and kona lord ${konaL} conjunct in ${kSign} (house ${kHouse})`;
      }
      // Exchange (parivartana)
      const kNatalSign = signOffset(lagna, CLASSICAL_HOUSE_BY_LORD(kendraL, lagna));
      const trNatalSign = signOffset(lagna, CLASSICAL_HOUSE_BY_LORD(konaL, lagna));
      if (kSign === trNatalSign && trSign === kNatalSign) {
        return `Kendra lord ${kendraL} and kona lord ${konaL} in mutual exchange (parivartana)`;
      }
      // Mutual 7th aspect
      const offset = ((trHouse - kHouse + 12) % 12) + 1;
      if (offset === 7) {
        return `Kendra lord ${kendraL} (H${kHouse}) and kona lord ${konaL} (H${trHouse}) in mutual 7th aspect`;
      }
    }
  }
  return null;
}

// Utility — find the primary house ruled by a planet from lagna
function CLASSICAL_HOUSE_BY_LORD(planet: string, lagna: Sign): number {
  for (let h = 1; h <= 12; h++) {
    if (lordOf(h, lagna) === planet) return h;
  }
  return 1;
}

function detectDhanaYoga(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const dhanaLords = [2, 5, 9, 11].map((h) => ({ house: h, lord: lordOf(h, lagna) }));
  // Look for any two lords in same sign (conjunction)
  for (let i = 0; i < dhanaLords.length; i++) {
    for (let j = i + 1; j < dhanaLords.length; j++) {
      const a = dhanaLords[i];
      const b = dhanaLords[j];
      if (a.lord === b.lord) continue;
      const aSign = planetSign(chart, a.lord);
      const bSign = planetSign(chart, b.lord);
      if (!aSign || !bSign) continue;
      if (aSign === bSign) {
        return `${a.house}th lord ${a.lord} and ${b.house}th lord ${b.lord} conjunct in ${aSign}`;
      }
    }
  }
  return null;
}

function detectWealthLagna(
  detector: { planet: string; aspecters: string[] },
  chart: ChartResponse,
): string | null {
  const p = chart.planets.find((pl) => pl.name === detector.planet);
  if (!p) return null;
  if (p.house !== 1) return null;
  // Must be in own sign
  if (!OWN_SIGNS[detector.planet]?.includes(p.rashi as Sign)) return null;
  // Check aspecters
  const matched: string[] = [];
  for (const a of detector.aspecters) {
    const inLagna = planetHouse(chart, a) === 1;
    const aspects = planetAspectsHouse(chart, a, 1);
    if (inLagna || aspects) matched.push(a);
  }
  if (matched.length < Math.min(2, detector.aspecters.length)) return null;
  return `${detector.planet} in lagna (own sign ${p.rashi}) aspected/conjunct by ${matched.join(", ")}`;
}

function detectDaridraLagna12Swap(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const lagnaLord = lordOf(1, lagna);
  const twelfthLord = lordOf(12, lagna);
  const lagnaLordHouse = planetHouse(chart, lagnaLord);
  const twelfthLordHouse = planetHouse(chart, twelfthLord);
  if (lagnaLordHouse !== 12) return null;
  if (twelfthLordHouse !== 1) return null;
  return `Lagna lord ${lagnaLord} in 12th, and 12th lord ${twelfthLord} in lagna`;
}

function detectShakata(chart: ChartResponse): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  const jupH = planetHouse(chart, "Jupiter");
  if (!moonHouse || !jupH) return null;

  // Classical rule (Phaladeepika, Mantreswara; B.V. Raman):
  //   Shakata Yoga forms when the Moon is in the 6th, 8th, or 12th
  //   house from Jupiter.
  const moonFromJupiter = ((moonHouse - jupH + 12) % 12) + 1;
  if (moonFromJupiter !== 6 && moonFromJupiter !== 8 && moonFromJupiter !== 12) {
    return null;
  }

  // Cancellation: if the Moon is in a kendra from the Lagna, the yoga
  // is nullified (and in some texts becomes Mukuta Yoga).
  if (KENDRAS.includes(moonHouse)) return null;

  return `Moon is in ${moonFromJupiter}th from Jupiter (and Moon is not in a kendra from Lagna)`;
}

function detectKalaSarpa(chart: ChartResponse): string | null {
  const rahuIdx = chart.planets.find((p) => p.name === "Rahu")?.rashi_num;
  const ketuIdx = chart.planets.find((p) => p.name === "Ketu")?.rashi_num;
  if (!rahuIdx || !ketuIdx) return null;
  // All 7 classical planets between Rahu (start) and Ketu (end) in zodiac order
  const classical = chart.planets.filter((p) => CLASSICAL_PLANETS.includes(p.name));
  if (classical.length < 7) return null;

  // Normalize: rahu at position 0
  const shift = rahuIdx;
  const normalize = (n: number) => ((n - shift + 12) % 12);
  const ketuNorm = normalize(ketuIdx);
  // All planets must be in positions > 0 and < ketuNorm (all between Rahu and Ketu on one side)
  const onOneSide = classical.every((p) => {
    const pos = normalize(p.rashi_num);
    return pos > 0 && pos < ketuNorm;
  });
  if (!onOneSide) {
    // try the other direction
    const otherSide = classical.every((p) => {
      const pos = normalize(p.rashi_num);
      return pos > ketuNorm && pos < 12;
    });
    if (!otherSide) return null;
  }
  return `All 7 classical planets hemmed between Rahu and Ketu`;
}

// ────────────────────────────────────────────────────────────────────────────
// Extended detectors (phase 2 additions)
// ────────────────────────────────────────────────────────────────────────────

const DUSTHANAS = [6, 8, 12];

/**
 * Check if `planet` forms a "hard" connection (conjunction, mutual 7th
 * aspect, or sign exchange) with any of the `others`. Special one-way
 * Parashari aspects (Jupiter 5/9, Mars 4/8, Saturn 3/10) are NOT
 * considered blockers here — classical commentaries generally treat
 * only strong bilateral relationships as disruptive of Vipareet Raja.
 */
function hasHardConnection(
  planet: string,
  others: string[],
  chart: ChartResponse,
  lagna: Sign,
): { connected: boolean; via: string | null } {
  const planetH = planetHouse(chart, planet);
  const planetSignV = planetSign(chart, planet);
  if (!planetH || !planetSignV) return { connected: false, via: null };

  for (const other of others) {
    if (other === planet) continue;
    const otherH = planetHouse(chart, other);
    const otherSign = planetSign(chart, other);
    if (!otherH || !otherSign) continue;

    // Conjunction
    if (otherH === planetH) {
      return { connected: true, via: `conjunct with ${other} in H${planetH}` };
    }

    // Mutual 7th aspect
    const offset = ((otherH - planetH + 12) % 12) + 1;
    if (offset === 7) {
      return { connected: true, via: `mutual 7th aspect with ${other}` };
    }

    // Sign exchange (parivartana)
    const planetHome = CLASSICAL_HOUSE_BY_LORD(planet, lagna);
    const otherHome = CLASSICAL_HOUSE_BY_LORD(other, lagna);
    const planetHomeSign = signOffset(lagna, planetHome);
    const otherHomeSign = signOffset(lagna, otherHome);
    if (planetSignV === otherHomeSign && otherSign === planetHomeSign) {
      return { connected: true, via: `sign exchange with ${other}` };
    }
  }
  return { connected: false, via: null };
}

function detectVipareetRaja(houseLorded: 6 | 8 | 12, chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const lord = lordOf(houseLorded, lagna);
  const placementHouse = planetHouse(chart, lord);
  if (!placementHouse) return null;
  if (!DUSTHANAS.includes(placementHouse)) return null;

  // Classical cancellation: the Vipareet Raja Yoga is blocked if the
  // dusthana lord forms a HARD connection (conjunction, mutual 7th
  // aspect, or sign exchange) with the Lagna lord, 5th lord, or 9th
  // lord — the three kona lords being the most unambiguously benefic.
  // A benefic kona lord's connection "saves" the dusthana from its
  // debilitated state, eliminating the need for the reversal effect.
  //
  // One-way Parashari aspects (e.g. Jupiter's 9th aspect to another
  // house) are intentionally NOT considered blockers — classical
  // sources treat only bilateral / strong relationships as disruptive.
  const konaLords = Array.from(
    new Set([1, 5, 9].map((h) => lordOf(h, lagna)).filter((l) => l !== lord)),
  );
  const connection = hasHardConnection(lord, konaLords, chart, lagna);
  if (connection.connected) {
    // Yoga is cancelled — do not report.
    return null;
  }

  const yogaName =
    houseLorded === 6 ? "Harsha" : houseLorded === 8 ? "Sarala" : "Vimala";
  return `${yogaName}: ${houseLorded}th lord ${lord} is in the ${placementHouse}th house (dusthana) and has no blocking connection with the Lagna/5th/9th lord — the classical cancellation does not apply, so the yoga delivers full results`;
}

/**
 * Permissive Kartari detection. Fires when there is at least one planet of
 * the relevant class (benefic for Shubha, malefic for Papa) in BOTH the
 * 12th and 2nd houses from the reference. Records purity ("pure" if every
 * occupant on both sides matches the class; "mixed" if the opposite class
 * also appears on either side).
 *
 * Common targets: lagna (H1), Moon, any classical planet (its sign), any
 * bhava (its sign).
 */
function detectKartariByHouse(
  benefic: boolean,
  refHouse: number,
  refLabel: string,
  chart: ChartResponse,
  excludePlanetFromCount?: string,
): string | null {
  const second = ((refHouse + 1 - 1) % 12) + 1;
  const twelfth = ((refHouse - 1 - 1 + 12) % 12) + 1;
  const targetSet = benefic ? BENEFICS : MALEFICS;
  const oppositeSet = benefic ? MALEFICS : BENEFICS;

  const secondOcc = planetsInHouse(chart, second).filter(
    (p) => !excludePlanetFromCount || p.name !== excludePlanetFromCount,
  );
  const twelfthOcc = planetsInHouse(chart, twelfth).filter(
    (p) => !excludePlanetFromCount || p.name !== excludePlanetFromCount,
  );

  const secondMatches = secondOcc.filter((p) => targetSet.has(p.name));
  const twelfthMatches = twelfthOcc.filter((p) => targetSet.has(p.name));

  // Permissive rule: at least one match in EACH flanking house
  if (secondMatches.length === 0 || twelfthMatches.length === 0) return null;

  // Purity: pure if NO opposite-class planets appear in either flanking house
  const secondHasOpposite = secondOcc.some((p) => oppositeSet.has(p.name));
  const twelfthHasOpposite = twelfthOcc.some((p) => oppositeSet.has(p.name));
  const isPure = !secondHasOpposite && !twelfthHasOpposite;

  const className = benefic ? "benefic" : "malefic";
  const purityNote = isPure ? "pure" : "mixed (opposite class also present)";
  return `${refLabel} flanked by ${className}s: ${twelfthMatches
    .map((p) => p.name)
    .join(", ")} in H${twelfth} (12th from ${refLabel}) and ${secondMatches
    .map((p) => p.name)
    .join(", ")} in H${second} (2nd from ${refLabel}) \u2014 ${purityNote}`;
}

function detectKartari(
  benefic: boolean,
  reference: "lagna" | "moon",
  chart: ChartResponse,
): string | null {
  const refHouse = reference === "lagna" ? 1 : planetHouse(chart, "Moon");
  if (!refHouse) return null;
  const refLabel = reference === "lagna" ? `Lagna (H${refHouse})` : `Moon (H${refHouse})`;
  return detectKartariByHouse(
    benefic,
    refHouse,
    refLabel,
    chart,
    reference === "moon" ? "Moon" : undefined,
  );
}

function detectKartariPlanet(
  benefic: boolean,
  planet: string,
  chart: ChartResponse,
): string | null {
  const ph = planetHouse(chart, planet);
  if (!ph) return null;
  return detectKartariByHouse(
    benefic,
    ph,
    `${planet} (H${ph})`,
    chart,
    // Exclude the planet itself if it happens to count in its own flanking
    // (it doesn't classically since adjacency is by sign not by self-sign,
    // but defensive against rare cases).
    planet,
  );
}

function detectKartariBhava(
  benefic: boolean,
  bhava: number,
  chart: ChartResponse,
): string | null {
  return detectKartariByHouse(
    benefic,
    bhava,
    `Bhava ${bhava}`,
    chart,
  );
}

function detectYogakaraka(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  // Find planets that lord a kendra AND a kona
  const found: string[] = [];
  for (const planet of CLASSICAL_PLANETS) {
    if (planet === "Sun" || planet === "Moon") continue; // only lord ONE sign each
    const lordedHouses: number[] = [];
    for (let h = 1; h <= 12; h++) {
      if (lordOf(h, lagna) === planet) lordedHouses.push(h);
    }
    const isKendra = lordedHouses.some((h) => KENDRAS.includes(h));
    const isKona = lordedHouses.some((h) => KONAS.includes(h));
    // Exclude if it ALSO owns 1st only (that's just lagna lord with another)
    if (isKendra && isKona && !(lordedHouses.length === 1 && lordedHouses[0] === 1)) {
      found.push(`${planet} (lords H${lordedHouses.join(",H")})`);
    }
  }
  if (found.length === 0) return null;
  return `Yogakaraka planet(s): ${found.join("; ")}`;
}

function detectDhanaMutualAspect(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const dhanaHouses = [2, 5, 9, 11];
  for (let i = 0; i < dhanaHouses.length; i++) {
    for (let j = i + 1; j < dhanaHouses.length; j++) {
      const hA = dhanaHouses[i];
      const hB = dhanaHouses[j];
      const lA = lordOf(hA, lagna);
      const lB = lordOf(hB, lagna);
      if (lA === lB) continue;
      const hLA = planetHouse(chart, lA);
      const hLB = planetHouse(chart, lB);
      if (!hLA || !hLB) continue;
      // Mutual 7th aspect
      const offset = ((hLB - hLA + 12) % 12) + 1;
      if (offset === 7) {
        return `${hA}th lord ${lA} (H${hLA}) and ${hB}th lord ${lB} (H${hLB}) in mutual 7th aspect`;
      }
    }
  }
  return null;
}

function detectParivartanaGeneral(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  // Build sign → house-number map
  const found: string[] = [];
  for (let h1 = 1; h1 <= 12; h1++) {
    for (let h2 = h1 + 1; h2 <= 12; h2++) {
      const l1 = lordOf(h1, lagna);
      const l2 = lordOf(h2, lagna);
      if (l1 === l2) continue;
      const natalSignOfH1 = signOffset(lagna, h1);
      const natalSignOfH2 = signOffset(lagna, h2);
      const l1Sign = planetSign(chart, l1);
      const l2Sign = planetSign(chart, l2);
      if (!l1Sign || !l2Sign) continue;
      if (l1Sign === natalSignOfH2 && l2Sign === natalSignOfH1) {
        found.push(`${h1}th lord ${l1} ↔ ${h2}th lord ${l2}`);
      }
    }
  }
  if (found.length === 0) return null;
  // Deduplicate pairs
  return `Parivartana (sign exchange): ${found.slice(0, 3).join("; ")}`;
}

function detectSaraswati(chart: ChartResponse): string | null {
  // Jupiter + Venus + Mercury all in kendra (1/4/7/10), kona (1/5/9), or 2nd house
  const valid = [1, 2, 4, 5, 7, 9, 10];
  const jH = planetHouse(chart, "Jupiter");
  const vH = planetHouse(chart, "Venus");
  const mH = planetHouse(chart, "Mercury");
  if (!jH || !vH || !mH) return null;
  if (!valid.includes(jH) || !valid.includes(vH) || !valid.includes(mH)) return null;
  // Jupiter must be in own/exalt/friend (simplified: own or exalt)
  const jSign = planetSign(chart, "Jupiter");
  if (!jSign) return null;
  const jOwn = OWN_SIGNS["Jupiter"]?.includes(jSign) ?? false;
  const jExalt = EXALTATION_SIGN["Jupiter"] === jSign;
  if (!jOwn && !jExalt) return null;
  return `Jupiter (${jSign}, H${jH}), Venus (H${vH}), and Mercury (H${mH}) all in kendra/kona/2nd with Jupiter dignified`;
}

function detectVasumati(chart: ChartResponse): string | null {
  // Benefics in upachaya (3, 6, 10, 11) from Lagna
  const upachayas = [3, 6, 10, 11];
  const beneficsInUpachaya: string[] = [];
  for (const h of upachayas) {
    for (const p of planetsInHouse(chart, h)) {
      if (BENEFICS.has(p.name)) beneficsInUpachaya.push(`${p.name}@H${h}`);
    }
  }
  // Classical: all 3 benefics (Jup, Ven, Mer) in upachayas. Relax to >= 2.
  const uniqueBenefics = new Set(
    beneficsInUpachaya.map((s) => s.split("@")[0]),
  );
  if (uniqueBenefics.size < 2) return null;
  return `Benefics in upachaya houses from Lagna: ${beneficsInUpachaya.join(", ")}`;
}

function detectPlanetConjunction(
  planetA: string,
  planetB: string,
  chart: ChartResponse,
): string | null {
  const a = chart.planets.find((p) => p.name === planetA);
  const b = chart.planets.find((p) => p.name === planetB);
  if (!a || !b) return null;
  if (a.house !== b.house) return null;
  return `${planetA} and ${planetB} conjunct in ${a.rashi} (house ${a.house})`;
}

function detectNeechaBhanga(chart: ChartResponse): string | null {
  // Find any debilitated planet
  const debilitations: Record<string, Sign> = {
    Sun: "Libra", Moon: "Scorpio", Mars: "Cancer", Mercury: "Pisces",
    Jupiter: "Capricorn", Venus: "Virgo", Saturn: "Aries",
  };
  for (const [planet, debSign] of Object.entries(debilitations)) {
    const p = chart.planets.find((pl) => pl.name === planet);
    if (!p || p.rashi !== debSign) continue;
    // Cancellation condition: the lord of the debilitation sign, OR the planet that
    // would be exalted in that sign, is in a kendra from the Lagna or Moon.
    const cancellers: string[] = [];
    const debSignLord = SIGN_LORD[debSign];
    const exalter = Object.entries(EXALTATION_SIGN).find(([, s]) => s === debSign)?.[0];
    const cancellerPlanets = [debSignLord, exalter].filter(Boolean) as string[];
    const moonHouse = planetHouse(chart, "Moon");
    for (const c of cancellerPlanets) {
      const h = planetHouse(chart, c);
      if (!h) continue;
      if (KENDRAS.includes(h)) cancellers.push(`${c} in kendra from Lagna (H${h})`);
      if (moonHouse) {
        const fromMoon = ((h - moonHouse + 12) % 12) + 1;
        if (KENDRAS.includes(fromMoon)) cancellers.push(`${c} in kendra from Moon (${fromMoon}th)`);
      }
    }
    if (cancellers.length > 0) {
      return `${planet} debilitated in ${debSign}, cancelled by: ${cancellers[0]}`;
    }
  }
  return null;
}

function detectAkhandaSamrajya(chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const l2 = lordOf(2, lagna);
  const l9 = lordOf(9, lagna);
  const l11 = lordOf(11, lagna);
  // Simplified: 2L/9L/11L any two in same sign (related) + Jupiter aspect
  const h2 = planetHouse(chart, l2);
  const h9 = planetHouse(chart, l9);
  const h11 = planetHouse(chart, l11);
  if (!h2 || !h9 || !h11) return null;
  const grouped = h2 === h9 || h9 === h11 || h2 === h11;
  if (!grouped) return null;
  // Jupiter aspect on any of them
  const jupAspects =
    planetAspectsHouse(chart, "Jupiter", h2) ||
    planetAspectsHouse(chart, "Jupiter", h9) ||
    planetAspectsHouse(chart, "Jupiter", h11);
  if (!jupAspects) return null;
  return `2L, 9L, 11L related (at least two conjunct) with Jupiter's aspect`;
}

function detectGrahana(chart: ChartResponse): string | null {
  const findings: string[] = [];
  for (const luminary of ["Sun", "Moon"]) {
    const lumH = planetHouse(chart, luminary);
    if (!lumH) continue;
    for (const node of ["Rahu", "Ketu"]) {
      const nodeH = planetHouse(chart, node);
      if (nodeH === lumH) {
        findings.push(`${luminary} conjunct ${node} in house ${lumH}`);
      }
    }
  }
  if (findings.length === 0) return null;
  return `Grahana (eclipse) yoga: ${findings.join(", ")}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 3: Named Raja yogas from BPHS Ch 36
// ────────────────────────────────────────────────────────────────────────────

function isOwnOrExalted(planet: string, sign: Sign): boolean {
  return (OWN_SIGNS[planet]?.includes(sign) ?? false) || EXALTATION_SIGN[planet] === sign;
}

function detectShankh(chart: ChartResponse): string | null {
  // BPHS 36.13-14: If Lagna lord is strong, while the Lords of 5th and 6th
  // Bhava are in mutual Kendras, Shankh Yog is produced.
  // Alternatively: 1L and 10L in a Movable sign while 9L is strong.
  const lagna = chart.lagna as Sign;
  const l1 = lordOf(1, lagna);
  const l5 = lordOf(5, lagna);
  const l6 = lordOf(6, lagna);
  const l1H = planetHouse(chart, l1);
  const l5H = planetHouse(chart, l5);
  const l6H = planetHouse(chart, l6);
  const l1Sign = planetSign(chart, l1);
  if (!l1H || !l5H || !l6H || !l1Sign) return null;

  // Lagna lord strong: in own sign, exaltation, or kendra/kona
  const l1Strong = isOwnOrExalted(l1, l1Sign) || KENDRAS.includes(l1H) || KONAS.includes(l1H);
  if (!l1Strong) return null;

  // 5L and 6L in mutual kendras (i.e., 1/4/7/10 from each other)
  const fromL5toL6 = ((l6H - l5H + 12) % 12) + 1;
  if (!KENDRAS.includes(fromL5toL6)) return null;

  return `Shankh: Lagna lord ${l1} strong (H${l1H}); 5L ${l5} (H${l5H}) and 6L ${l6} (H${l6H}) in mutual kendras`;
}

function detectBhairi(chart: ChartResponse): string | null {
  // BPHS 36.15-16: Venus, Jupiter and Lagna lord are in a Kendra, while 9L is strong.
  const lagna = chart.lagna as Sign;
  const l1 = lordOf(1, lagna);
  const l9 = lordOf(9, lagna);
  const venusH = planetHouse(chart, "Venus");
  const jupH = planetHouse(chart, "Jupiter");
  const l1H = planetHouse(chart, l1);
  const l9Sign = planetSign(chart, l9);
  const l9H = planetHouse(chart, l9);
  if (!venusH || !jupH || !l1H || !l9H || !l9Sign) return null;

  // Venus, Jupiter, Lagna Lord — all in kendras
  if (!KENDRAS.includes(venusH) || !KENDRAS.includes(jupH) || !KENDRAS.includes(l1H)) {
    return null;
  }

  const l9Strong =
    isOwnOrExalted(l9, l9Sign) || KENDRAS.includes(l9H) || KONAS.includes(l9H);
  if (!l9Strong) return null;

  return `Bhairi: Venus (H${venusH}), Jupiter (H${jupH}), Lagna lord ${l1} (H${l1H}) all in kendras; 9L ${l9} strongly placed`;
}

function detectMridang(chart: ChartResponse): string | null {
  // BPHS 36.17: If Lagna lord is strong and others occupy kendras, konas,
  // own bhavas, or exaltation signs, Mridang Yoga is formed.
  const lagna = chart.lagna as Sign;
  const l1 = lordOf(1, lagna);
  const l1H = planetHouse(chart, l1);
  const l1Sign = planetSign(chart, l1);
  if (!l1H || !l1Sign) return null;
  const l1Strong = isOwnOrExalted(l1, l1Sign) || KENDRAS.includes(l1H) || KONAS.includes(l1H);
  if (!l1Strong) return null;

  // Require at least 4 of the other 6 classical planets to be in kendra/kona/own/exalt
  const others = CLASSICAL_PLANETS.filter((p) => p !== l1);
  let wellPlaced = 0;
  const details: string[] = [];
  for (const p of others) {
    const pSign = planetSign(chart, p);
    const pH = planetHouse(chart, p);
    if (!pSign || !pH) continue;
    if (isOwnOrExalted(p, pSign) || KENDRAS.includes(pH) || KONAS.includes(pH)) {
      wellPlaced++;
      details.push(`${p}@H${pH}`);
    }
  }
  if (wellPlaced < 4) return null;
  return `Mridang: Lagna lord ${l1} strong, and ${wellPlaced} other planets in dignified placements (${details.slice(0, 4).join(", ")})`;
}

function detectShrinath(chart: ChartResponse): string | null {
  // BPHS 36.18: 7L in 10th Bhava, 10L exalted and conjunct 9L.
  const lagna = chart.lagna as Sign;
  const l7 = lordOf(7, lagna);
  const l9 = lordOf(9, lagna);
  const l10 = lordOf(10, lagna);
  const l7H = planetHouse(chart, l7);
  const l9H = planetHouse(chart, l9);
  const l10H = planetHouse(chart, l10);
  const l10Sign = planetSign(chart, l10);
  if (!l7H || !l9H || !l10H || !l10Sign) return null;
  if (l7H !== 10) return null;
  if (EXALTATION_SIGN[l10] !== l10Sign) return null;
  if (l9H !== l10H) return null; // conjunct
  return `Shrinath: 7L ${l7} in 10th; 10L ${l10} exalted in ${l10Sign} conjunct 9L ${l9} in H${l10H}`;
}

function detectKhadg(chart: ChartResponse): string | null {
  // BPHS 36.25-26: 2L and 9L exchange signs, while Lagna lord is in a kendra or kona.
  const lagna = chart.lagna as Sign;
  const l1 = lordOf(1, lagna);
  const l2 = lordOf(2, lagna);
  const l9 = lordOf(9, lagna);
  const l1H = planetHouse(chart, l1);
  const l2Sign = planetSign(chart, l2);
  const l9Sign = planetSign(chart, l9);
  if (!l1H || !l2Sign || !l9Sign) return null;
  if (!KENDRAS.includes(l1H) && !KONAS.includes(l1H)) return null;
  const l2NatalSign = signOffset(lagna, 2);
  const l9NatalSign = signOffset(lagna, 9);
  if (l2Sign === l9NatalSign && l9Sign === l2NatalSign) {
    return `Khadg: 2L ${l2} and 9L ${l9} in sign exchange; Lagna lord ${l1} well-placed in H${l1H}`;
  }
  return null;
}

function detectMatsya(chart: ChartResponse): string | null {
  // BPHS 36.21-22: Benefics in 9th and 1st, mixed grahas in 5th, malefics in
  // 4th and 8th.
  const first = planetsInHouse(chart, 1);
  const ninth = planetsInHouse(chart, 9);
  const fourth = planetsInHouse(chart, 4);
  const eighth = planetsInHouse(chart, 8);

  const beneficIn1 = first.length > 0 && first.every((p) => BENEFICS.has(p.name));
  const beneficIn9 = ninth.length > 0 && ninth.every((p) => BENEFICS.has(p.name));
  const maleficIn4 = fourth.length > 0 && fourth.every((p) => MALEFICS.has(p.name));
  const maleficIn8 = eighth.length > 0 && eighth.every((p) => MALEFICS.has(p.name));

  if (beneficIn1 && beneficIn9 && maleficIn4 && maleficIn8) {
    return `Matsya: benefics in H1 (${first.map((p) => p.name).join(",")}) and H9 (${ninth.map((p) => p.name).join(",")}); malefics in H4 (${fourth.map((p) => p.name).join(",")}) and H8 (${eighth.map((p) => p.name).join(",")})`;
  }
  return null;
}

function detectKurma(chart: ChartResponse): string | null {
  // BPHS 36.23-24: Benefics in 5th, 6th, and 7th identical with own/exalt/friend
  // signs; malefics in 1st, 3rd, and 11th in own or exalt.
  const lagna = chart.lagna as Sign;
  const checkBeneficsIn = (houses: number[]): { ok: boolean; detail: string } => {
    const found: string[] = [];
    for (const h of houses) {
      const occ = planetsInHouse(chart, h);
      const sign = signOffset(lagna, h);
      const benefic = occ.find((p) => BENEFICS.has(p.name) && isOwnOrExalted(p.name, sign));
      if (!benefic) return { ok: false, detail: "" };
      found.push(`${benefic.name}@H${h}`);
    }
    return { ok: true, detail: found.join(", ") };
  };
  const checkMaleficsIn = (houses: number[]): { ok: boolean; detail: string } => {
    const found: string[] = [];
    for (const h of houses) {
      const occ = planetsInHouse(chart, h);
      const sign = signOffset(lagna, h);
      const malefic = occ.find((p) => MALEFICS.has(p.name) && isOwnOrExalted(p.name, sign));
      if (!malefic) return { ok: false, detail: "" };
      found.push(`${malefic.name}@H${h}`);
    }
    return { ok: true, detail: found.join(", ") };
  };

  const bene = checkBeneficsIn([5, 6, 7]);
  if (!bene.ok) return null;
  const male = checkMaleficsIn([1, 3, 11]);
  if (!male.ok) return null;
  return `Kurma: dignified benefics in H5/6/7 (${bene.detail}); dignified malefics in H1/3/11 (${male.detail})`;
}

// ────────────────────────────────────────────────────────────────────────────
// Chandra yoga variants (benefic/malefic flavour)
// ────────────────────────────────────────────────────────────────────────────

function detectSunaphaFlavored(
  flavor: "benefic" | "malefic",
  chart: ChartResponse,
): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  const secondFromMoon = ((moonHouse + 1 - 1) % 12) + 1;
  const occ = planetsInHouse(chart, secondFromMoon).filter((p) =>
    p.name !== "Sun" && p.name !== "Moon",
  );
  if (occ.length === 0) return null;
  const want = flavor === "benefic" ? BENEFICS : MALEFICS;
  const allMatch = occ.every((p) => want.has(p.name));
  if (!allMatch) return null;
  return `Sunapha with only ${flavor}s in 2nd from Moon: ${occ.map((p) => p.name).join(", ")}`;
}

function detectAnaphaFlavored(
  flavor: "benefic" | "malefic",
  chart: ChartResponse,
): string | null {
  const moonHouse = planetHouse(chart, "Moon");
  if (!moonHouse) return null;
  const twelfthFromMoon = ((moonHouse - 1 - 1 + 12) % 12) + 1;
  const occ = planetsInHouse(chart, twelfthFromMoon).filter((p) =>
    p.name !== "Sun" && p.name !== "Moon",
  );
  if (occ.length === 0) return null;
  const want = flavor === "benefic" ? BENEFICS : MALEFICS;
  const allMatch = occ.every((p) => want.has(p.name));
  if (!allMatch) return null;
  return `Anapha with only ${flavor}s in 12th from Moon: ${occ.map((p) => p.name).join(", ")}`;
}

function detectDuradharaFlavored(
  flavor: "benefic" | "malefic",
  chart: ChartResponse,
): string | null {
  const s = detectSunaphaFlavored(flavor, chart);
  const a = detectAnaphaFlavored(flavor, chart);
  if (!s || !a) return null;
  return `${s}; ${a}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Per-ascendant yogakaraka (BPHS Ch 34)
// ────────────────────────────────────────────────────────────────────────────

function detectAscendantYogakaraka(
  detector: { ascendant: Sign; planet: string },
  chart: ChartResponse,
): string | null {
  const lagna = chart.lagna as Sign;
  if (lagna !== detector.ascendant) return null;
  const pSign = planetSign(chart, detector.planet);
  const pH = planetHouse(chart, detector.planet);
  if (!pSign || !pH) return null;
  // At minimum require the planet to exist in the chart (always true for 7 planets)
  // Add dignity/placement note to the evidence
  const dignified = isOwnOrExalted(detector.planet, pSign);
  const strongPlaced = KENDRAS.includes(pH) || KONAS.includes(pH);
  const strengthNote = dignified && strongPlaced
    ? "dignified and well-placed"
    : dignified
      ? "dignified"
      : strongPlaced
        ? "well-placed in kendra/kona"
        : `in ${pSign}, H${pH}`;
  return `For ${detector.ascendant} ascendant: ${detector.planet} (${strengthNote})`;
}

// ────────────────────────────────────────────────────────────────────────────
// Generic Bhava Yoga (Nth lord in Mth house) — BPHS Ch 34-36
// ────────────────────────────────────────────────────────────────────────────

function detectBhavaYoga(
  detector: { lordOf: number; inHouse: number },
  chart: ChartResponse,
): string | null {
  const lagna = chart.lagna as Sign;
  const lord = lordOf(detector.lordOf, lagna);
  const lordHouse = planetHouse(chart, lord);
  if (!lordHouse) return null;
  if (lordHouse !== detector.inHouse) return null;
  return `${detector.lordOf}${ord(detector.lordOf)} lord ${lord} is placed in the ${detector.inHouse}${ord(detector.inHouse)} house`;
}

function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────────────────────

function dispatch(detector: YogaDetector, chart: ChartResponse): string | null {
  switch (detector.type) {
    case "mahapurusha": return detectMahapurusha(detector.planet, chart);
    case "nabhasa_asraya": return detectNabhasaAsraya(detector.modality, chart);
    case "nabhasa_dala": return detectNabhasaDala(detector.subtype, chart);
    case "nabhasa_sankhya": return detectNabhasaSankhya(detector.signsOccupied, chart);
    case "gajakesari": return detectGajakesari(chart);
    case "amala": return detectAmala(chart);
    case "parvata": return detectParvata(chart);
    case "lakshmi": return detectLakshmi(chart);
    case "chamara": return detectChamara(chart);
    case "kalanidhi": return detectKalanidhi(chart);
    case "budhaditya": return detectBudhaditya(chart);
    case "chandra_mangal": return detectChandraMangal(chart);
    case "adhi_moon": return detectAdhiMoon(chart);
    case "sunapha": return detectSunapha(chart);
    case "anapha": return detectAnapha(chart);
    case "duradhara": return detectDuradhara(chart);
    case "kemadruma": return detectKemadruma(chart);
    case "vesi": return detectVesi(chart);
    case "vosi": return detectVosi(chart);
    case "ubhayachari": return detectUbhayachari(chart);
    case "maha_raja": return detectMahaRaja(chart);
    case "raja_kendra_kona": return detectRajaKendraKona(chart);
    case "dhana_yoga": return detectDhanaYoga(chart);
    case "wealth_lagna": return detectWealthLagna(detector, chart);
    case "daridra_lagna_12_swap": return detectDaridraLagna12Swap(chart);
    case "shakata": return detectShakata(chart);
    case "kala_sarpa": return detectKalaSarpa(chart);
    case "vipareet_raja": return detectVipareetRaja(detector.house, chart);
    case "kartari": return detectKartari(detector.benefic, detector.reference, chart);
    case "kartari_planet": return detectKartariPlanet(detector.benefic, detector.planet, chart);
    case "kartari_bhava": return detectKartariBhava(detector.benefic, detector.bhava, chart);
    case "yogakaraka": return detectYogakaraka(chart);
    case "dhana_mutual_aspect": return detectDhanaMutualAspect(chart);
    case "parivartana_general": return detectParivartanaGeneral(chart);
    case "saraswati": return detectSaraswati(chart);
    case "vasumati": return detectVasumati(chart);
    case "planet_conjunction": return detectPlanetConjunction(detector.planetA, detector.planetB, chart);
    case "neecha_bhanga": return detectNeechaBhanga(chart);
    case "akhanda_samrajya": return detectAkhandaSamrajya(chart);
    case "grahana": return detectGrahana(chart);
    case "shankh": return detectShankh(chart);
    case "bhairi": return detectBhairi(chart);
    case "mridang": return detectMridang(chart);
    case "shrinath": return detectShrinath(chart);
    case "khadg": return detectKhadg(chart);
    case "matsya": return detectMatsya(chart);
    case "kurma": return detectKurma(chart);
    case "sunapha_flavored": return detectSunaphaFlavored(detector.flavor, chart);
    case "anapha_flavored": return detectAnaphaFlavored(detector.flavor, chart);
    case "duradhara_flavored": return detectDuradharaFlavored(detector.flavor, chart);
    case "ascendant_yogakaraka": return detectAscendantYogakaraka(detector, chart);
    case "bhava_yoga": return detectBhavaYoga(detector, chart);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Chart-context derivation (key house / key planets / house verdict)
// ────────────────────────────────────────────────────────────────────────────

interface ChartContext {
  keyHouse?: number;
  keyPlanets?: string[];
  keySign?: Sign;
  formationInChart?: string;
}

function safeHouse(chart: ChartResponse, planet: string): number | undefined {
  const h = planetHouse(chart, planet);
  return h ?? undefined;
}

function placementPhrase(chart: ChartResponse, planets: string[]): string {
  return planets
    .map((p) => {
      const s = planetSign(chart, p);
      const h = planetHouse(chart, p);
      if (!s || !h) return p;
      return `${p} in ${s} (house ${h})`;
    })
    .join(", ");
}

/** Derive keyHouse/keyPlanets/formation string from detector type + chart. */
function getChartContext(rule: YogaRule, chart: ChartResponse): ChartContext {
  const det = rule.detector;
  const lagna = chart.lagna as Sign;
  switch (det.type) {
    case "mahapurusha": {
      const h = safeHouse(chart, det.planet);
      const s = planetSign(chart, det.planet) ?? undefined;
      return {
        keyHouse: h, keyPlanets: [det.planet], keySign: s,
        formationInChart: `${det.planet} sits in ${s} in your ${h}${h ? ord(h) : ""} house — ${EXALTATION_SIGN[det.planet] === s ? "its exaltation sign" : "its own sign"} and a kendra, the exact configuration classical texts require.`,
      };
    }
    case "gajakesari": {
      const h = safeHouse(chart, "Jupiter");
      return {
        keyHouse: h, keyPlanets: ["Jupiter", "Moon"],
        formationInChart: `${placementPhrase(chart, ["Jupiter", "Moon"])} — Jupiter is in a kendra from the Moon (or Lagna), seating wisdom over emotion.`,
      };
    }
    case "budhaditya": {
      const h = safeHouse(chart, "Sun");
      return {
        keyHouse: h, keyPlanets: ["Sun", "Mercury"],
        formationInChart: `${placementPhrase(chart, ["Sun", "Mercury"])} — Sun and Mercury are in the same sign, fusing authority with intellect.`,
      };
    }
    case "chandra_mangal": {
      const h = safeHouse(chart, "Moon");
      return {
        keyHouse: h, keyPlanets: ["Moon", "Mars"],
        formationInChart: `${placementPhrase(chart, ["Moon", "Mars"])} — Moon conjoins Mars, blending instinct with drive.`,
      };
    }
    case "planet_conjunction": {
      const a = chart.planets.find((p) => p.name === det.planetA);
      const b = chart.planets.find((p) => p.name === det.planetB);
      if (a && b && a.house === b.house) {
        return {
          keyHouse: a.house, keyPlanets: [det.planetA, det.planetB], keySign: a.rashi as Sign,
          formationInChart: `${det.planetA} and ${det.planetB} are conjunct in ${a.rashi} in your ${a.house}${ord(a.house)} house.`,
        };
      }
      return {};
    }
    case "grahana": {
      // Find first eclipse pair
      for (const lum of ["Sun", "Moon"]) {
        const lh = safeHouse(chart, lum);
        if (!lh) continue;
        for (const node of ["Rahu", "Ketu"]) {
          if (safeHouse(chart, node) === lh) {
            return {
              keyHouse: lh, keyPlanets: [lum, node], keySign: (planetSign(chart, lum) ?? undefined),
              formationInChart: `${lum} is conjunct ${node} in ${planetSign(chart, lum)} in your ${lh}${ord(lh)} house — a shadowed luminary.`,
            };
          }
        }
      }
      return {};
    }
    case "shakata": {
      const h = safeHouse(chart, "Moon");
      const jh = safeHouse(chart, "Jupiter");
      if (!h || !jh) return {};
      const off = ((h - jh + 12) % 12) + 1;
      return {
        keyHouse: h, keyPlanets: ["Moon", "Jupiter"],
        formationInChart: `Your Moon is in ${planetSign(chart, "Moon")} (house ${h}), which is the ${off}${ord(off)} from your Jupiter in ${planetSign(chart, "Jupiter")} (house ${jh}).`,
      };
    }
    case "vipareet_raja": {
      const lord = lordOf(det.house, lagna);
      const lh = safeHouse(chart, lord);
      return {
        keyHouse: lh, keyPlanets: [lord],
        formationInChart: `${det.house}${ord(det.house)} lord ${lord} sits in your ${lh}${lh ? ord(lh) : ""} house — a dusthana lord gone into another dusthana, the exact reversal configuration.`,
      };
    }
    case "bhava_yoga": {
      const lord = lordOf(det.lordOf, lagna);
      return {
        keyHouse: det.inHouse, keyPlanets: [lord],
        formationInChart: `Your ${det.lordOf}${ord(det.lordOf)} lord is ${lord}, and it sits in your ${det.inHouse}${ord(det.inHouse)} house in ${planetSign(chart, lord)}.`,
      };
    }
    case "ascendant_yogakaraka": {
      const h = safeHouse(chart, det.planet);
      return {
        keyHouse: h, keyPlanets: [det.planet], keySign: planetSign(chart, det.planet) ?? undefined,
        formationInChart: `For ${det.ascendant} lagna, ${det.planet} lords both a kendra and a trikona — a natural yoga-karaka. In your chart it sits in ${planetSign(chart, det.planet)} in house ${h}.`,
      };
    }
    case "kartari_planet": {
      const h = safeHouse(chart, det.planet);
      const flavour = det.benefic ? "Shubha (benefic)" : "Papa (malefic)";
      return {
        keyHouse: h, keyPlanets: [det.planet], keySign: planetSign(chart, det.planet) ?? undefined,
        formationInChart: `${det.planet} sits in ${planetSign(chart, det.planet)} (your ${h}${h ? ord(h) : ""} house) and is flanked by ${det.benefic ? "benefic" : "malefic"} planets in the adjacent signs — ${flavour} Kartari.`,
      };
    }
    case "kartari_bhava": {
      const flavour = det.benefic ? "Shubha (benefic)" : "Papa (malefic)";
      return {
        keyHouse: det.bhava,
        formationInChart: `Your ${det.bhava}${ord(det.bhava)} house is flanked by ${det.benefic ? "benefic" : "malefic"} planets in the 12th and 2nd from it — ${flavour} Kartari to this bhava.`,
      };
    }
    case "amala": {
      const tenth = planetsInHouse(chart, 10).filter((p) => BENEFICS.has(p.name));
      if (tenth.length > 0) {
        return {
          keyHouse: 10, keyPlanets: tenth.map((p) => p.name),
          formationInChart: `Only benefic${tenth.length > 1 ? "s" : ""} (${tenth.map((p) => p.name).join(", ")}) occupy your 10th house — no malefic shadow over your career-karma axis.`,
        };
      }
      return { keyHouse: 10 };
    }
    case "kalanidhi": {
      const h = safeHouse(chart, "Jupiter");
      return {
        keyHouse: h, keyPlanets: ["Jupiter", "Mercury", "Venus"],
        formationInChart: `Jupiter in your ${h}${h ? ord(h) : ""} house, with both Mercury and Venus either joining or aspecting it.`,
      };
    }
    case "saraswati": {
      return {
        keyPlanets: ["Jupiter", "Venus", "Mercury"],
        formationInChart: `Jupiter, Venus, and Mercury together occupy a kendra, a trikona, or the 2nd, with Jupiter strong — the classical seat of learning and arts.`,
      };
    }
    case "yogakaraka": {
      return {
        formationInChart: `Your chart carries a planet that lords both a kendra and a trikona — the single most potent Raja-yoga signature in Parashara.`,
      };
    }
    default:
      return {};
  }
}

/**
 * Generate a nuanced "this yoga in this house" interpretation.
 * Combines house significations with the yoga's tone (benefic/malefic/dosha)
 * and special per-yoga overrides for a few key combinations.
 */
function getHouseContextNote(
  rule: YogaRule,
  keyHouse: number,
): string {
  const hs = HOUSE_SIGNIFICATIONS[keyHouse];
  if (!hs) return "";
  const isDosha = rule.category === "dosha";
  const isRaja = rule.category === "raja" || rule.category === "mahapurusha";
  const inTrik = TRIK_HOUSES.includes(keyHouse);
  const inKendra = KENDRA_HOUSES.includes(keyHouse);
  const inTrikona = TRIKONA_HOUSES.includes(keyHouse);
  const inUpachaya = UPACHAYA_HOUSES.includes(keyHouse);

  // Special per-yoga, per-house overrides for high-impact cases
  const key = `${rule.slug}|${keyHouse}`;
  const override = YOGA_HOUSE_OVERRIDES[key];
  if (override) return override;

  // Dosha in trik = often mitigated ("dosha cancels dosha")
  if (isDosha && inTrik) {
    return `This yoga's dosha lands in the ${keyHouse}${ord(keyHouse)} house of ${hs.significations}. Because this is itself a dusthana, the classical principle "dusthana in dusthana" softens the harm — the difficulty still plays out through ${hs.significations.split(",")[0]}, but it often purifies rather than destroys, especially after maturity.`;
  }

  if (isDosha && inKendra) {
    return `This dosha sits in the ${keyHouse}${ord(keyHouse)} house, which governs ${hs.significations}. Kendras are the pillars of the chart, so the disturbance is felt more visibly here — these are life areas that will need conscious handling, remedies, and maturity to settle.`;
  }

  if (isDosha && inTrikona) {
    return `This dosha falls in the ${keyHouse}${ord(keyHouse)} — a trikona, one of the most auspicious houses. Classically the trikona's good fortune absorbs much of the dosha, redirecting what could be loss into learning. Expect friction in ${hs.significations.split(",")[0]}, but look for growth underneath.`;
  }

  if (isRaja && (inKendra || inTrikona)) {
    return `This Raja-yoga anchors in the ${keyHouse}${ord(keyHouse)} house (${hs.significations}). A Raja yoga seated in a kendra or trikona is working at full strength — status, authority, and recognition will most clearly express through these themes.`;
  }

  if (isRaja && inUpachaya && keyHouse !== 6) {
    return `This Raja-yoga sits in the ${keyHouse}${ord(keyHouse)} (${hs.significations}). Upachaya houses grow stronger with time, so this yoga delivers gradually rather than at once — its full fruit tends to arrive after the first Saturn return.`;
  }

  if (isRaja && inTrik) {
    return `This Raja-yoga lands in the ${keyHouse}${ord(keyHouse)} — a dusthana (${hs.significations}). The classical reading is that the yoga's dignity is compromised unless strong aspect or cancellation repairs it; results come through struggle, service, or after a crisis.`;
  }

  // Dhana / wealth yogas
  if (rule.category === "dhana") {
    if ([2, 5, 9, 11].includes(keyHouse)) {
      return `This wealth yoga expresses through the ${keyHouse}${ord(keyHouse)} (${hs.significations}) — one of the natural wealth axes, so gains flow cleanly through these themes.`;
    }
    return `Wealth yoga anchored in the ${keyHouse}${ord(keyHouse)} (${hs.significations}) — the money will come coloured by these life areas rather than through direct income streams.`;
  }

  // Generic fallback
  return `This yoga operates through the ${keyHouse}${ord(keyHouse)} house — ${hs.significations}. Its effects will most visibly show up in these life themes.`;
}

/** Targeted overrides for high-impact yoga/house combinations. */
const YOGA_HOUSE_OVERRIDES: Record<string, string> = {
  // Guru Chandala (Jupiter + Rahu conjunction) per house
  "guru-chandala|1": "Guru Chandala on the ascendant: wisdom and identity wrestle with unorthodox impulses. The native's worldview is original and magnetic but can drift from traditional dharma — strong remedies (Jupiter mantra, charity, guru worship) are classical.",
  "guru-chandala|2": "Guru Chandala in the 2nd (wealth & speech): teaching, preaching, or finance can bring sudden rises and falls. Watch for exaggerated speech and questionable counsel — verified knowledge matters more than confident delivery.",
  "guru-chandala|3": "Guru Chandala in the 3rd: communications, writing, and short travel carry mixed karma. Ideas spread wide but with flaws attached — peer review and editorial discipline transform the yoga into a reformer's voice.",
  "guru-chandala|4": "Guru Chandala in the 4th (home, mother, inner peace): philosophy-of-life confusion, unconventional upbringing, or foreign/mixed cultural roots. Spiritual restlessness at home is common until the native finds their own dharma.",
  "guru-chandala|5": "Guru Chandala in the 5th (children, intelligence, purva-punya): unconventional intelligence and original creativity, but shaky classical ethics. Risk of wrong counsel, speculation losses, or philosophical scandals — the remedy is a real living guru.",
  "guru-chandala|6": "Guru Chandala in the 6th (enemies, debt, disease, service): this is classically the LEAST harmful house for the combination. The 6th absorbs the dosha — it may show as unusual immune or metabolic issues, or a controversial service/teaching role, but often turns into a reformer's chart that fights what mainstream Jupiter would endorse.",
  "guru-chandala|7": "Guru Chandala in the 7th (marriage, partnerships): spouse or partner from a different culture, religion, or value system — powerful if consciously chosen, turbulent if not. Idealistic expectations of the partner must be watched.",
  "guru-chandala|8": "Guru Chandala in the 8th (occult, transformation, longevity): deep interest in taboo subjects, mysticism, research — a natural occultist's placement. Sudden philosophical rebirths. Health: watch liver and endocrine system.",
  "guru-chandala|9": "Guru Chandala in the 9th (dharma, father, guru): THE most charged house for this yoga. Classical religion clashes with personal truth; relationship with father or teacher is complicated. The native often rejects and later reclaims tradition on their own terms.",
  "guru-chandala|10": "Guru Chandala in the 10th (career, reputation): rises through unconventional authority — may teach, preach, publish, or consult on disruptive ideas. Reputation can swing between visionary and fraudulent; strict ethics protect the career.",
  "guru-chandala|11": "Guru Chandala in the 11th (gains, network, desires): large, unusual networks and sudden gains from group activity, publishing, or mass movements. Guard against get-rich-quick schemes dressed as wisdom.",
  "guru-chandala|12": "Guru Chandala in the 12th (moksha, foreign, seclusion): foreign spiritual lineages, ashram life, unorthodox moksha-paths — or the opposite, wasted years on false teachers. This placement rewards genuine surrender and punishes cult-following.",

  // Kala Sarpa-style nodal placements often anchor in specific houses —
  // these are examples; more can be added as needed.
  "grahana|1": "Grahana in the 1st: identity itself feels eclipsed — an inward, introspective personality that often comes into full self-expression only in the second half of life.",
  "grahana|10": "Grahana in the 10th (career): authority and public image carry karmic weight — visibility comes in waves, with periods of obscurity followed by breakthroughs. Remedies for Sun/Moon plus the node strengthen the 10th significantly.",
};

/** Overall favourable/mixed/challenging verdict for this yoga in its key house. */
function getHouseVerdict(
  rule: YogaRule,
  keyHouse: number,
): "favorable" | "mixed" | "challenging" {
  const isDosha = rule.category === "dosha";
  const inTrik = TRIK_HOUSES.includes(keyHouse);
  const inKendra = KENDRA_HOUSES.includes(keyHouse);
  const inTrikona = TRIKONA_HOUSES.includes(keyHouse);

  if (isDosha) {
    if (inTrik) return "mixed"; // dosha-in-dusthana often cancels
    if (inKendra || inTrikona) return "challenging";
    return "mixed";
  }
  // Positive yogas
  if (inKendra || inTrikona) return "favorable";
  if (inTrik) return "challenging";
  return "mixed";
}

// ────────────────────────────────────────────────────────────────────────────
// D9 (Navamsa) strength check
// ────────────────────────────────────────────────────────────────────────────

export type D9Dignity =
  | "vargottama"
  | "exalted"
  | "own"
  | "friendly"
  | "neutral"
  | "enemy"
  | "debilitated"
  | "unknown";

const D9_DIGNITY_SCORE: Record<D9Dignity, number> = {
  vargottama: 3, exalted: 3, own: 2, friendly: 1,
  neutral: 0, enemy: -1, debilitated: -2, unknown: 0,
};

const D9_DIGNITY_LABEL: Record<D9Dignity, string> = {
  vargottama: "Vargottama (same sign in D1 & D9)",
  exalted: "Exalted in D9",
  own: "Own sign in D9",
  friendly: "Friendly sign in D9",
  neutral: "Neutral sign in D9",
  enemy: "Enemy sign in D9",
  debilitated: "Debilitated in D9",
  unknown: "D9 position unavailable",
};

export interface D9PlanetStrength {
  planet: string;
  d1Sign?: Sign;
  d9Sign?: Sign;
  d9House?: number;
  dignity: D9Dignity;
  score: number;
  note: string;
}

export interface D9Analysis {
  planets: D9PlanetStrength[];
  /** Sum of dignity scores across all analysed planets. */
  totalScore: number;
  /** Sun↔Mercury longitude gap if both are in the analysis set (for combustion). */
  combustionGap?: number;
  combustionNote?: string;
  verdict: "strong" | "moderate" | "weak";
  summary: string;
}

function getD9Position(chart: ChartResponse, planet: string): { sign?: Sign; house?: number } {
  const np = chart.navamsa_planets?.find((p) => p.name === planet);
  if (!np) return {};
  return { sign: np.rashi as Sign, house: np.house };
}

function classifyD9Dignity(planet: string, d1Sign?: Sign, d9Sign?: Sign): D9Dignity {
  if (!d9Sign) return "unknown";
  if (d1Sign && d9Sign === d1Sign) return "vargottama";
  if (EXALTATION_SIGN[planet] === d9Sign) return "exalted";
  if (OWN_SIGNS[planet]?.includes(d9Sign)) return "own";
  if (DEBILITATION_SIGN[planet] === d9Sign) return "debilitated";
  const d9Lord = SIGN_LORD[d9Sign];
  if (d9Lord === planet) return "own"; // defensive (should have been caught above)
  if (PLANET_FRIENDS[planet]?.includes(d9Lord)) return "friendly";
  if (PLANET_ENEMIES[planet]?.includes(d9Lord)) return "enemy";
  return "neutral";
}

/**
 * Compute D9 dignity for a set of planets and produce an overall verdict.
 * Pass the full ChartResponse — this function reads from `chart.planets`
 * (D1 signs) and `chart.navamsa_planets` (D9 positions).
 */
export function computeD9Analysis(
  chart: ChartResponse,
  planetNames: string[],
): D9Analysis {
  const planets: D9PlanetStrength[] = planetNames.map((name) => {
    const d1Sign = planetSign(chart, name) ?? undefined;
    const { sign: d9Sign, house: d9House } = getD9Position(chart, name);
    const dignity = classifyD9Dignity(name, d1Sign, d9Sign);
    return {
      planet: name,
      d1Sign,
      d9Sign,
      d9House,
      dignity,
      score: D9_DIGNITY_SCORE[dignity],
      note: d9Sign
        ? `${name}: D1 ${d1Sign ?? "?"} \u2192 D9 ${d9Sign} (H${d9House ?? "?"}) \u2014 ${D9_DIGNITY_LABEL[dignity]}`
        : `${name}: D9 position unavailable`,
    };
  });

  const totalScore = planets.reduce((sum, p) => sum + p.score, 0);

  // Combustion gap for Sun↔Mercury pair
  let combustionGap: number | undefined;
  let combustionNote: string | undefined;
  const hasSun = planetNames.includes("Sun");
  const hasMercury = planetNames.includes("Mercury");
  if (hasSun && hasMercury) {
    const sun = chart.planets.find((p) => p.name === "Sun");
    const merc = chart.planets.find((p) => p.name === "Mercury");
    if (sun && merc) {
      const gap = Math.abs(sun.longitude - merc.longitude);
      combustionGap = Math.min(gap, 360 - gap);
      if (combustionGap < 6) {
        combustionNote = `Mercury is only ${combustionGap.toFixed(1)}\u00B0 from the Sun \u2014 deeply combust. Classical texts treat this as a "paper yoga" that fails to fructify unless the D9 strongly repairs it.`;
      } else if (combustionGap < 14) {
        combustionNote = `Mercury is ${combustionGap.toFixed(1)}\u00B0 from the Sun \u2014 within the 14\u00B0 combustion zone. The yoga's functional strength is reduced; D9 dignity becomes the deciding factor.`;
      } else {
        combustionNote = `Mercury is ${combustionGap.toFixed(1)}\u00B0 from the Sun \u2014 clear of the 14\u00B0 combustion range. The conjunction holds its functional vitality.`;
      }
    }
  }

  // Overall verdict
  const anyDebilitated = planets.some((p) => p.dignity === "debilitated");
  const deeplyCombust = combustionGap != null && combustionGap < 6;
  const d9Strong = planets.some((p) => p.dignity === "vargottama" || p.dignity === "exalted" || p.dignity === "own");

  let verdict: "strong" | "moderate" | "weak";
  if (anyDebilitated || (deeplyCombust && !d9Strong)) {
    verdict = "weak";
  } else if (totalScore >= 3 && !deeplyCombust) {
    verdict = "strong";
  } else if (totalScore >= 0) {
    verdict = "moderate";
  } else {
    verdict = "weak";
  }

  // Summary line
  const parts: string[] = [];
  const strongOnes = planets.filter((p) => p.score >= 2).map((p) => p.planet);
  const weakOnes = planets.filter((p) => p.score < 0).map((p) => p.planet);
  if (strongOnes.length) parts.push(`${strongOnes.join(", ")} well-dignified in D9`);
  if (weakOnes.length) parts.push(`${weakOnes.join(", ")} compromised in D9`);
  if (!parts.length) parts.push("D9 dignities are neutral");
  let summary = parts.join("; ") + ". ";
  if (verdict === "strong") {
    summary += "The yoga's promise is classically confirmed \u2014 results manifest fully.";
  } else if (verdict === "moderate") {
    summary += "Partial manifestation \u2014 the yoga delivers but not at full classical strength.";
  } else {
    summary += "The yoga may stay as a paper formation \u2014 look for dasha/transit triggers and remedies rather than automatic fruit.";
  }

  return {
    planets,
    totalScore,
    combustionGap,
    combustionNote,
    verdict,
    summary,
  };
}

/**
 * Decide whether a given yoga's detector benefits from a D9 strength check.
 * Structural yogas (nabhasa, kartari, kala sarpa) do not \u2014 they're defined
 * by geometry, not by any single planet's dignity.
 */
function yogaD9Planets(rule: YogaRule, detected: DetectedYoga): string[] | null {
  const det = rule.detector;
  switch (det.type) {
    case "mahapurusha": return [det.planet];
    case "gajakesari": return ["Jupiter", "Moon"];
    case "budhaditya": return ["Sun", "Mercury"];
    case "chandra_mangal": return ["Moon", "Mars"];
    case "planet_conjunction": return [det.planetA, det.planetB];
    case "grahana": return detected.keyPlanets ?? null;
    case "shakata": return ["Moon", "Jupiter"];
    case "kalanidhi": return ["Jupiter", "Mercury", "Venus"];
    case "saraswati": return ["Jupiter", "Venus", "Mercury"];
    case "ascendant_yogakaraka": return [det.planet];
    case "bhava_yoga": return detected.keyPlanets ?? null;
    case "vipareet_raja": return detected.keyPlanets ?? null;
    case "amala": return detected.keyPlanets ?? null;
    case "yogakaraka": return null;
    case "kartari_planet": return [det.planet];
    default: return null;
  }
}

export function detectYogas(chart: ChartResponse, rules: YogaRule[]): DetectedYoga[] {
  const result: DetectedYoga[] = [];
  for (const rule of rules) {
    try {
      const evidence = dispatch(rule.detector, chart);
      if (evidence) {
        const ctx = getChartContext(rule, chart);
        const houseContextNote = ctx.keyHouse != null ? getHouseContextNote(rule, ctx.keyHouse) : undefined;
        const houseVerdict = ctx.keyHouse != null ? getHouseVerdict(rule, ctx.keyHouse) : undefined;
        const detected: DetectedYoga = {
          rule,
          detected: true,
          evidence,
          keyHouse: ctx.keyHouse,
          keyPlanets: ctx.keyPlanets,
          keySign: ctx.keySign,
          formationInChart: ctx.formationInChart,
          houseContextNote,
          houseVerdict,
        };
        const d9Targets = yogaD9Planets(rule, detected);
        if (d9Targets && d9Targets.length > 0) {
          const onlyClassical = d9Targets.filter((n) => CLASSICAL_PLANETS.includes(n));
          if (onlyClassical.length > 0) {
            detected.d9Analysis = computeD9Analysis(chart, onlyClassical);
          }
        }
        result.push(detected);
      }
    } catch {
      // skip broken rules
    }
  }
  // Sort by category, then importance desc
  result.sort((a, b) => {
    if (a.rule.category !== b.rule.category) {
      return a.rule.category.localeCompare(b.rule.category);
    }
    if (a.rule.importance !== b.rule.importance) {
      return b.rule.importance - a.rule.importance;
    }
    return a.rule.sortOrder - b.rule.sortOrder;
  });
  return result;
}
