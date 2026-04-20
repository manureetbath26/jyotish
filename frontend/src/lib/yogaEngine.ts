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
  | { type: "kartari"; benefic: boolean; reference: "lagna" | "moon" }
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
  | { type: "grahana" };

export interface DetectedYoga {
  rule: YogaRule;
  detected: true;
  evidence: string;
}

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

function detectVipareetRaja(houseLorded: 6 | 8 | 12, chart: ChartResponse): string | null {
  const lagna = chart.lagna as Sign;
  const lord = lordOf(houseLorded, lagna);
  const placementHouse = planetHouse(chart, lord);
  if (!placementHouse) return null;
  if (!DUSTHANAS.includes(placementHouse)) return null;
  const yogaName =
    houseLorded === 6 ? "Harsha" : houseLorded === 8 ? "Sarala" : "Vimala";
  return `${yogaName}: ${houseLorded}th lord ${lord} is in the ${placementHouse}th house (a dusthana — the evil houses cancel each other)`;
}

function detectKartari(
  benefic: boolean,
  reference: "lagna" | "moon",
  chart: ChartResponse,
): string | null {
  const refHouse = reference === "lagna" ? 1 : planetHouse(chart, "Moon");
  if (!refHouse) return null;
  const second = ((refHouse + 1 - 1) % 12) + 1;
  const twelfth = ((refHouse - 1 - 1 + 12) % 12) + 1;
  const set = benefic ? BENEFICS : MALEFICS;

  const secondOcc = planetsInHouse(chart, second).filter((p) =>
    reference === "moon" ? p.name !== "Moon" : true,
  );
  const twelfthOcc = planetsInHouse(chart, twelfth).filter((p) =>
    reference === "moon" ? p.name !== "Moon" : true,
  );

  if (secondOcc.length === 0 || twelfthOcc.length === 0) return null;
  const secondMatch = secondOcc.every((p) => set.has(p.name));
  const twelfthMatch = twelfthOcc.every((p) => set.has(p.name));
  if (!secondMatch || !twelfthMatch) return null;

  return `${reference === "lagna" ? "Lagna" : "Moon"} (H${refHouse}) is flanked by ${benefic ? "benefics" : "malefics"}: ${secondOcc.map((p) => p.name).join(",")} in H${second} and ${twelfthOcc.map((p) => p.name).join(",")} in H${twelfth}`;
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
    case "yogakaraka": return detectYogakaraka(chart);
    case "dhana_mutual_aspect": return detectDhanaMutualAspect(chart);
    case "parivartana_general": return detectParivartanaGeneral(chart);
    case "saraswati": return detectSaraswati(chart);
    case "vasumati": return detectVasumati(chart);
    case "planet_conjunction": return detectPlanetConjunction(detector.planetA, detector.planetB, chart);
    case "neecha_bhanga": return detectNeechaBhanga(chart);
    case "akhanda_samrajya": return detectAkhandaSamrajya(chart);
    case "grahana": return detectGrahana(chart);
  }
}

export function detectYogas(chart: ChartResponse, rules: YogaRule[]): DetectedYoga[] {
  const result: DetectedYoga[] = [];
  for (const rule of rules) {
    try {
      const evidence = dispatch(rule.detector, chart);
      if (evidence) {
        result.push({ rule, detected: true, evidence });
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
