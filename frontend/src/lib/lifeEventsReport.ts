// Life Events Prediction Engine — Vedic (Jyotish) Astrology
// Analyzes birth chart to predict major life events using Vimshottari Dasha,
// house lordships, planetary strengths, and yoga influences.

import { ChartResponse, SlowPlanetSnapshot } from "@/lib/api";

// ─── Exported Interfaces ────────────────────────────────────────────────────

export interface LifeEventsReport {
  chartSummary: ChartSummary;
  houseAnalysis: HouseSignificance[];
  planetaryStrengths: PlanetStrength[];
  eventCategories: EventCategory[];
  dashaPredictions: DashaPrediction[];
  currentPeriodAnalysis: CurrentPeriodDetail;
  pastHighlights: LifeHighlight[];
  upcomingHighlights: LifeHighlight[];
  yogaInfluences: YogaInfluence[];
}

export interface ChartSummary {
  lagna: string;
  lagnaLord: string;
  lagnaLordPlacement: string;
  moonSign: string;
  sunSign: string;
  currentDasha: string;
  currentAntardasha: string;
  description: string;
}

export interface HouseSignificance {
  house: number;
  rashi: string;
  lord: string;
  lordPlacement: string;
  lordDignity: string | null;
  occupants: string[];
  lifeAreas: string[];
  strength: "strong" | "moderate" | "weak";
  interpretation: string;
}

export interface PlanetStrength {
  planet: string;
  rashi: string;
  house: number;
  dignity: string | null;
  isRetrograde: boolean;
  lordOf: number[];
  naturalSignifications: string[];
  strength: "strong" | "moderate" | "weak";
  interpretation: string;
}

export interface EventCategory {
  id: string;
  name: string;
  icon: string;
  type: "positive" | "negative" | "neutral";
  relevantHouses: number[];
  relevantPlanets: string[];
  overallOutlook: "very_favorable" | "favorable" | "mixed" | "challenging" | "needs_care";
  summary: string;
}

export interface DashaPrediction {
  planet: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  planetRole: string;
  housePosition: string;
  dignity: string | null;
  overallNature: "very_favorable" | "favorable" | "mixed" | "challenging";
  themes: string[];
  eventPredictions: EventPrediction[];
  antardashaHighlights: AntardashaHighlight[];
}

export interface EventPrediction {
  category: string;
  likelihood: "very_likely" | "likely" | "possible" | "unlikely";
  timing: string;
  description: string;
  type: "positive" | "negative" | "neutral";
}

export interface AntardashaHighlight {
  planet: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  nature: "very_favorable" | "favorable" | "mixed" | "challenging";
  themes: string[];
  keyPrediction: string;
}

export interface CurrentPeriodDetail {
  mahadasha: string;
  antardasha: string;
  startDate: string;
  endDate: string;
  overallNature: "very_favorable" | "favorable" | "mixed" | "challenging";
  detailedAnalysis: string;
  opportunities: string[];
  cautions: string[];
  remedialSuggestions: string[];
}

export interface LifeHighlight {
  event: string;
  category: string;
  type: "positive" | "negative" | "neutral";
  window: string;
  startDateRaw: string;      // ISO date for sorting (YYYY-MM-DD)
  endDateRaw: string;        // ISO date for past/current/future classification
  dashaContext: string;
  likelihood: "very_likely" | "likely" | "possible";
  score: number;             // raw score for ranking importance
  reasoning: string;
}

export interface YogaInfluence {
  name: string;
  planets: string[];
  houses: number[];
  effect: string;
  isPresent: boolean;
  strength: "strong" | "moderate" | "weak";
  lifeEventImpact: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RASHIS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const RASHI_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

// For each lagna, which houses does each planet lord?
function getLordships(lagna: string): Record<string, number[]> {
  const lagnaIdx = RASHIS.indexOf(lagna);
  if (lagnaIdx === -1) return {};
  const lordships: Record<string, number[]> = {};
  for (let h = 0; h < 12; h++) {
    const rashiIdx = (lagnaIdx + h) % 12;
    const lord = RASHI_LORDS[RASHIS[rashiIdx]];
    if (!lordships[lord]) lordships[lord] = [];
    lordships[lord].push(h + 1);
  }
  return lordships;
}

const HOUSE_LIFE_AREAS: Record<number, string[]> = {
  1: ["Self", "Health", "Personality", "New Beginnings"],
  2: ["Wealth", "Family", "Speech", "Values"],
  3: ["Courage", "Siblings", "Communication", "Short Travels"],
  4: ["Home", "Mother", "Property", "Mental Peace", "Education"],
  5: ["Children", "Romance", "Creativity", "Intelligence"],
  6: ["Health Issues", "Enemies", "Debts", "Service"],
  7: ["Marriage", "Partnerships", "Business"],
  8: ["Transformation", "Sudden Events", "Inheritance", "Chronic Illness"],
  9: ["Fortune", "Father", "Higher Education", "Long Travels", "Spirituality"],
  10: ["Career", "Status", "Fame", "Authority"],
  11: ["Gains", "Income", "Fulfillment of Desires", "Social Network"],
  12: ["Losses", "Foreign Settlement", "Spirituality", "Hospitalization"],
};

const PLANET_SIGNIFICATIONS: Record<string, string[]> = {
  Sun: ["Soul", "Authority", "Father", "Government", "Vitality"],
  Moon: ["Mind", "Emotions", "Mother", "Public", "Nurturing"],
  Mars: ["Energy", "Courage", "Property", "Siblings", "Action"],
  Mercury: ["Intelligence", "Communication", "Business", "Learning"],
  Jupiter: ["Wisdom", "Fortune", "Children", "Spirituality", "Expansion"],
  Venus: ["Love", "Marriage", "Luxury", "Arts", "Comfort"],
  Saturn: ["Discipline", "Hard Work", "Delays", "Longevity", "Karma"],
  Rahu: ["Foreign", "Unconventional", "Ambition", "Obsession", "Innovation"],
  Ketu: ["Spirituality", "Detachment", "Past Karma", "Mysticism"],
};

const NATURAL_BENEFICS = ["Jupiter", "Venus", "Mercury", "Moon"];
const NATURAL_MALEFICS = ["Saturn", "Mars", "Rahu", "Ketu", "Sun"];

const TRIKONA_HOUSES = [1, 5, 9];
const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIK_HOUSES = [6, 8, 12];
const UPACHAYA_HOUSES = [3, 6, 10, 11];

const EVENT_CATEGORIES_DEF: Array<{
  id: string; name: string; icon: string; type: "positive" | "negative" | "neutral";
  relevantHouses: number[]; relevantPlanets: string[];
}> = [
  { id: "marriage", name: "Marriage & Partnership", icon: "\u{1F48D}", type: "positive", relevantHouses: [7, 2, 11], relevantPlanets: ["Venus", "Jupiter"] },
  { id: "children", name: "Children & Progeny", icon: "\u{1F476}", type: "positive", relevantHouses: [5, 9, 2], relevantPlanets: ["Jupiter"] },
  { id: "romance", name: "Romance & Love", icon: "\u{2764}\uFE0F", type: "positive", relevantHouses: [5, 7, 11], relevantPlanets: ["Venus"] },
  { id: "career_growth", name: "Career Growth", icon: "\u{1F4C8}", type: "positive", relevantHouses: [10, 6, 11], relevantPlanets: ["Sun", "Saturn"] },
  { id: "wealth", name: "Wealth & Prosperity", icon: "\u{1F4B0}", type: "positive", relevantHouses: [2, 11, 9], relevantPlanets: ["Jupiter", "Venus"] },
  { id: "property", name: "Property & Vehicles", icon: "\u{1F3E0}", type: "positive", relevantHouses: [4, 11], relevantPlanets: ["Mars", "Moon"] },
  { id: "foreign_travel", name: "Foreign Travel & Settlement", icon: "\u{2708}\uFE0F", type: "neutral", relevantHouses: [9, 12, 3], relevantPlanets: ["Rahu"] },
  { id: "education", name: "Education & Knowledge", icon: "\u{1F393}", type: "positive", relevantHouses: [4, 5, 9], relevantPlanets: ["Jupiter", "Mercury"] },
  { id: "fame", name: "Fame & Recognition", icon: "\u{1F31F}", type: "positive", relevantHouses: [10, 1, 5], relevantPlanets: ["Sun", "Rahu"] },
  { id: "spiritual_growth", name: "Spiritual Growth", icon: "\u{1F9D8}", type: "positive", relevantHouses: [9, 12, 5], relevantPlanets: ["Jupiter", "Ketu"] },
  { id: "new_business", name: "New Business & Ventures", icon: "\u{1F4BC}", type: "positive", relevantHouses: [7, 10, 3, 11], relevantPlanets: ["Mercury"] },
  { id: "health_issues", name: "Health Concerns", icon: "\u{1FA7A}", type: "negative", relevantHouses: [6, 1, 8], relevantPlanets: ["Saturn", "Mars"] },
  { id: "relationship_conflict", name: "Relationship Challenges", icon: "\u{1F494}", type: "negative", relevantHouses: [7, 6, 12], relevantPlanets: ["Mars", "Saturn", "Rahu"] },
  { id: "financial_loss", name: "Financial Caution", icon: "\u{1F4C9}", type: "negative", relevantHouses: [12, 6, 8], relevantPlanets: ["Rahu", "Saturn"] },
  { id: "legal_issues", name: "Legal Matters", icon: "\u{2696}\uFE0F", type: "negative", relevantHouses: [6, 8], relevantPlanets: ["Saturn", "Mars", "Rahu"] },
  { id: "career_setback", name: "Career Transitions", icon: "\u{1F504}", type: "negative", relevantHouses: [10, 8], relevantPlanets: ["Saturn"] },
  { id: "accidents", name: "Safety & Accidents", icon: "\u{26A0}\uFE0F", type: "negative", relevantHouses: [8, 6], relevantPlanets: ["Mars", "Rahu"] },
  { id: "mental_health", name: "Mental Wellbeing", icon: "\u{1F9E0}", type: "negative", relevantHouses: [4, 5, 1], relevantPlanets: ["Moon", "Mercury"] },
  { id: "family_conflict", name: "Family Harmony", icon: "\u{1F3E1}", type: "negative", relevantHouses: [2, 4], relevantPlanets: ["Mars"] },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function getPlanet(chart: ChartResponse, name: string) {
  return chart.planets.find((p) => p.name === name);
}

function getHouseRashi(chart: ChartResponse, house: number): string {
  const h = chart.houses?.find((h) => h.house_num === house);
  if (h) return h.rashi;
  // Fallback: calculate from lagna
  const lagnaIdx = RASHIS.indexOf(chart.lagna);
  if (lagnaIdx === -1) return "Aries";
  return RASHIS[(lagnaIdx + house - 1) % 12];
}

function getHouseLord(chart: ChartResponse, house: number): string {
  return RASHI_LORDS[getHouseRashi(chart, house)] || "Sun";
}

function getOccupants(chart: ChartResponse, house: number): string[] {
  return chart.planets.filter((p) => p.house === house).map((p) => p.name);
}

function assessPlanetStrength(
  planet: string,
  dignity: string | null,
  house: number,
  isRetrograde: boolean,
  lordships: number[],
  lagna: string
): "strong" | "moderate" | "weak" {
  let score = 0;
  if (dignity === "exalted") score += 3;
  else if (dignity === "own" || dignity === "mooltrikona") score += 2;
  else if (dignity === "debilitated") score -= 2;

  if (KENDRA_HOUSES.includes(house) || TRIKONA_HOUSES.includes(house)) score += 1;
  if (TRIK_HOUSES.includes(house)) score -= 1;

  // Malefics in upachaya houses (3, 6, 10, 11) do well
  if (NATURAL_MALEFICS.includes(planet) && UPACHAYA_HOUSES.includes(house)) score += 1;

  // Yogakaraka bonus
  const hasKendra = lordships.some((h) => KENDRA_HOUSES.includes(h));
  const hasTrikona = lordships.some((h) => TRIKONA_HOUSES.includes(h));
  if (hasKendra && hasTrikona) score += 2;

  // Trik lordship penalty
  if (lordships.some((h) => [6, 8, 12].includes(h))) score -= 1;

  if (score >= 3) return "strong";
  if (score >= 1) return "moderate";
  return "weak";
}

function assessHouseStrength(
  chart: ChartResponse,
  house: number,
  lordships: Record<string, number[]>
): "strong" | "moderate" | "weak" {
  let score = 0;
  const lord = getHouseLord(chart, house);
  const lordPlanet = getPlanet(chart, lord);

  if (lordPlanet) {
    if (lordPlanet.dignity === "exalted" || lordPlanet.dignity === "own" || lordPlanet.dignity === "mooltrikona") score += 2;
    if (lordPlanet.dignity === "debilitated") score -= 2;
    if (KENDRA_HOUSES.includes(lordPlanet.house) || TRIKONA_HOUSES.includes(lordPlanet.house)) score += 1;
    if (TRIK_HOUSES.includes(lordPlanet.house)) score -= 1;
  }

  const occupants = getOccupants(chart, house);
  const beneficOccupants = occupants.filter((p) => NATURAL_BENEFICS.includes(p));
  const maleficOccupants = occupants.filter((p) => NATURAL_MALEFICS.includes(p));
  score += beneficOccupants.length;
  score -= maleficOccupants.length * 0.5;

  // Jupiter aspecting the house is always good
  const jupiter = getPlanet(chart, "Jupiter");
  if (jupiter) {
    const jupAspects = [jupiter.house, (jupiter.house + 4) % 12 || 12, (jupiter.house + 6) % 12 || 12, (jupiter.house + 8) % 12 || 12];
    if (jupAspects.includes(house)) score += 1;
  }

  if (score >= 3) return "strong";
  if (score >= 1) return "moderate";
  return "weak";
}

function getYogakaraka(lagna: string): string | null {
  // Planet that lords both a kendra and trikona
  const map: Record<string, string> = {
    Aries: "Saturn",    // 10th + 11th — actually debated; Mars is lagna lord
    Taurus: "Saturn",   // 9th + 10th
    Cancer: "Mars",     // 5th + 10th
    Leo: "Mars",        // 4th + 9th
    Libra: "Saturn",    // 4th + 5th
    Scorpio: "Jupiter", // 2nd + 5th — debated
    Capricorn: "Venus", // 5th + 10th
    Aquarius: "Venus",  // 4th + 9th
  };
  return map[lagna] || null;
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// Rahu/Ketu act as proxy for the lord of the sign they occupy
function getEffectiveLordships(
  planet: string,
  lordships: number[],
  chart: ChartResponse,
  allLordships: Record<string, number[]>
): number[] {
  if (lordships.length > 0) return lordships;
  // Rahu/Ketu: use dispositor's (sign lord's) lordships as proxy
  if (planet === "Rahu" || planet === "Ketu") {
    const p = getPlanet(chart, planet);
    if (p) {
      const dispositor = RASHI_LORDS[p.rashi];
      if (dispositor && allLordships[dispositor]) {
        return allLordships[dispositor];
      }
    }
  }
  return [];
}

function dashaOverallNature(
  planet: string,
  lordships: number[],
  dignity: string | null,
  house: number,
  lagna: string,
  chart?: ChartResponse,
  allLordships?: Record<string, number[]>
): "very_favorable" | "favorable" | "mixed" | "challenging" {
  let score = 0;

  // For Rahu/Ketu, use dispositor lordships as proxy
  const effectiveLordships = (chart && allLordships)
    ? getEffectiveLordships(planet, lordships, chart, allLordships)
    : lordships;

  // Lordship quality
  const hasTrikona = effectiveLordships.some((h) => TRIKONA_HOUSES.includes(h));
  const hasKendra = effectiveLordships.some((h) => KENDRA_HOUSES.includes(h));
  const hasTrik = effectiveLordships.some((h) => TRIK_HOUSES.includes(h));

  if (hasTrikona && hasKendra) score += 3; // Yogakaraka
  else if (hasTrikona) score += 2;
  else if (hasKendra) score += 1;
  if (hasTrik) score -= 1;
  if (effectiveLordships.includes(8) || effectiveLordships.includes(12)) score -= 1;

  // Dignity
  if (dignity === "exalted") score += 2;
  else if (dignity === "own" || dignity === "mooltrikona") score += 1;
  else if (dignity === "debilitated") score -= 2;

  // House placement
  if (KENDRA_HOUSES.includes(house) || TRIKONA_HOUSES.includes(house)) score += 1;
  if (TRIK_HOUSES.includes(house)) score -= 1;

  // Malefics in upachaya houses (3, 6, 10, 11) do well — especially Rahu, Saturn, Mars
  if (NATURAL_MALEFICS.includes(planet) && UPACHAYA_HOUSES.includes(house)) {
    score += 2; // Malefics thrive in upachaya houses
  }

  // Rahu/Ketu conjunct their dispositor amplifies results
  if ((planet === "Rahu" || planet === "Ketu") && chart) {
    const p = getPlanet(chart, planet);
    if (p) {
      const dispositor = RASHI_LORDS[p.rashi];
      const dispositorP = getPlanet(chart, dispositor);
      if (dispositorP && dispositorP.house === p.house) {
        score += 1; // Conjunct dispositor = amplified results
      }
      // Rahu with Jupiter is generally protective
      if (planet === "Rahu" && dispositor === "Jupiter") score += 1;
    }
  }

  // Yogakaraka bonus
  if (planet === getYogakaraka(lagna)) score += 2;

  if (score >= 5) return "very_favorable";
  if (score >= 2) return "favorable";
  if (score >= 0) return "mixed";
  return "challenging";
}

// ─── Event Category Outlook ─────────────────────────────────────────────────

function assessCategoryOutlook(
  cat: typeof EVENT_CATEGORIES_DEF[0],
  chart: ChartResponse,
  lordshipsMap: Record<string, number[]>
): "very_favorable" | "favorable" | "mixed" | "challenging" | "needs_care" {
  let score = 0;

  for (const house of cat.relevantHouses) {
    const strength = assessHouseStrength(chart, house, lordshipsMap);
    if (strength === "strong") score += 2;
    else if (strength === "moderate") score += 1;
    else score -= 1;
  }

  for (const planetName of cat.relevantPlanets) {
    const p = getPlanet(chart, planetName);
    if (!p) continue;
    if (p.dignity === "exalted" || p.dignity === "own") score += 2;
    else if (p.dignity === "debilitated") score -= 2;
    if (KENDRA_HOUSES.includes(p.house) || TRIKONA_HOUSES.includes(p.house)) score += 1;
  }

  // Flip scoring for negative categories (lower score = needs more care)
  if (cat.type === "negative") {
    // For negative categories, high score means the houses are strong = less risk
    if (score >= 4) return "favorable";
    if (score >= 2) return "mixed";
    if (score >= 0) return "challenging";
    return "needs_care";
  }

  if (score >= 5) return "very_favorable";
  if (score >= 3) return "favorable";
  if (score >= 1) return "mixed";
  if (score >= -1) return "challenging";
  return "needs_care";
}

function buildCategorySummary(
  cat: typeof EVENT_CATEGORIES_DEF[0],
  outlook: string,
  chart: ChartResponse,
  lordshipsMap: Record<string, number[]>
): string {
  const houses = cat.relevantHouses;
  const lord1 = getHouseLord(chart, houses[0]);
  const lord1Planet = getPlanet(chart, lord1);
  const houseRashi = getHouseRashi(chart, houses[0]);

  const base = `Your ${houses[0]}th house is in ${houseRashi}, lorded by ${lord1}`;
  const placement = lord1Planet ? ` placed in house ${lord1Planet.house} (${lord1Planet.rashi})` : "";
  const dignityNote = lord1Planet?.dignity ? ` in ${lord1Planet.dignity}` : "";

  if (cat.type === "positive") {
    if (outlook === "very_favorable" || outlook === "favorable") {
      return `${base}${placement}${dignityNote}. The indicators suggest a supportive foundation for ${cat.name.toLowerCase()}. The planetary alignments in your chart point toward favorable outcomes in this area, though timing through dashas will determine when these potentials are most likely to manifest.`;
    } else if (outlook === "mixed") {
      return `${base}${placement}${dignityNote}. The chart shows a mix of supportive and challenging influences for ${cat.name.toLowerCase()}. With awareness and patience, the positive indicators can be cultivated during favorable dasha periods.`;
    } else {
      return `${base}${placement}${dignityNote}. This area may require extra attention and effort. The chart suggests some challenges, but remember that planetary indicators show tendencies, not certainties. Favorable dasha periods can still bring positive developments.`;
    }
  } else {
    // Negative categories
    if (outlook === "favorable" || outlook === "very_favorable") {
      return `${base}${placement}${dignityNote}. The chart indicates relatively good resilience in this area. While no chart is free from all challenges, your planetary configuration suggests you have protective influences that can help navigate difficulties.`;
    } else if (outlook === "mixed") {
      return `${base}${placement}${dignityNote}. The indicators suggest moderate attention is needed in this area. During certain dasha periods, some challenges may surface, but your chart also shows resources to handle them effectively.`;
    } else {
      return `${base}${placement}${dignityNote}. This is an area where the chart suggests extra mindfulness would be beneficial. Certain planetary periods may bring challenges here, but being aware and proactive can make a meaningful difference. Remedial measures during difficult transits can be helpful.`;
    }
  }
}

// ─── Dasha Predictions ──────────────────────────────────────────────────────

function buildDashaEventPredictions(
  planet: string,
  lordships: number[],
  house: number,
  dignity: string | null,
  chart: ChartResponse,
  allLordships: Record<string, number[]>,
  lagna: string,
  dashaStartDate?: string
): EventPrediction[] {
  const predictions: EventPrediction[] = [];
  const isYogakaraka = planet === getYogakaraka(lagna);
  const isStrong = dignity === "exalted" || dignity === "own" || dignity === "mooltrikona";
  const isWeak = dignity === "debilitated";

  // For Rahu/Ketu, use dispositor lordships
  const effectiveLordships = getEffectiveLordships(planet, lordships, chart, allLordships);
  const isRahuKetu = planet === "Rahu" || planet === "Ketu";
  const dispositorName = isRahuKetu ? RASHI_LORDS[getPlanet(chart, planet)?.rashi || ""] : null;
  const lordLabel = isRahuKetu && dispositorName ? `through ${dispositorName}` : "as lord of";

  // Age-based filtering
  const birthYr = getBirthYear(chart);
  const dashaStartAge = dashaStartDate ? getAgeAtDate(birthYr, dashaStartDate) : 0;

  for (const cat of EVENT_CATEGORIES_DEF) {
    // Skip children/progeny predictions after childbearing age
    if (cat.id === "children" && dashaStartAge > MAX_CHILDBEARING_AGE) continue;

    // Check if this dasha lord is relevant to this category
    const lordsRelevantHouse = effectiveLordships.some((h) => cat.relevantHouses.includes(h));
    const sitsInRelevantHouse = cat.relevantHouses.includes(house);
    const isRelevantPlanet = cat.relevantPlanets.includes(planet);

    if (!lordsRelevantHouse && !sitsInRelevantHouse && !isRelevantPlanet) continue;

    let likelihood: "very_likely" | "likely" | "possible" | "unlikely" = "possible";
    if (lordsRelevantHouse && (isStrong || isYogakaraka)) likelihood = "very_likely";
    else if (lordsRelevantHouse || (sitsInRelevantHouse && isRelevantPlanet)) likelihood = "likely";
    else if (isRelevantPlanet || sitsInRelevantHouse) likelihood = "possible";

    if (isWeak && likelihood === "very_likely") likelihood = "likely";
    if (isWeak && likelihood === "likely") likelihood = "possible";

    const houseNames = lordships.map((h) => HOUSE_LIFE_AREAS[h]?.[0] || `House ${h}`).join(" and ");
    const isPositiveExpression = cat.type === "positive" ? (isStrong || isYogakaraka) : isWeak;

    let description = "";
    if (cat.type === "positive") {
      if (isStrong || isYogakaraka) {
        description = `${planet} ${lordLabel} ${houseNames} in ${getPlanet(chart, planet)?.rashi || "its sign"} carries supportive energy for ${cat.name.toLowerCase()}. Being ${dignity || "well-placed"} in house ${house}, this period holds promising potential for positive developments in this area.`;
      } else if (isWeak) {
        description = `While ${planet} activates themes of ${cat.name.toLowerCase()} ${lordLabel} ${houseNames}, its ${dignity} placement suggests results may come with some delays or require extra effort. Patience and persistence during this period can still yield meaningful outcomes.`;
      } else {
        description = `${planet}'s influence on ${cat.name.toLowerCase()} comes through its connection to ${houseNames}. Moderate indicators suggest possibilities that may unfold gradually. Favorable antardasha sub-periods can enhance the outcomes.`;
      }
    } else {
      // Negative category
      if (lordsRelevantHouse && !isStrong) {
        const activatedHouses = effectiveLordships.filter((h) => cat.relevantHouses.includes(h)).join(", ");
        const viaNote = isRahuKetu && dispositorName ? ` (via ${dispositorName})` : "";
        description = `${planet}${viaNote} activates house(s) ${activatedHouses}, bringing themes related to ${cat.name.toLowerCase()} during this period. This is a time for mindful awareness rather than worry \u2014 being proactive about ${cat.name.toLowerCase().replace("concerns", "care").replace("challenges", "harmony")} can help navigate this energy constructively.`;
      } else if (sitsInRelevantHouse) {
        description = `${planet}'s placement in house ${house} touches on ${cat.name.toLowerCase()} themes. The indicators suggest exercising gentle caution in this area. Remember, awareness itself is a powerful tool for navigating challenging periods.`;
      } else {
        description = `${planet} has an indirect connection to ${cat.name.toLowerCase()} through its natural significations. Minor attention may be warranted, but the influence is not strongly prominent in this period.`;
        likelihood = "possible";
      }
    }

    const evType = cat.type === "positive"
      ? (isStrong || isYogakaraka ? "positive" : "neutral")
      : (lordsRelevantHouse && !isStrong ? "negative" : "neutral");

    predictions.push({
      category: cat.id,
      likelihood,
      timing: "Throughout the period",
      description,
      type: evType as "positive" | "negative" | "neutral",
    });
  }

  // Limit to most relevant predictions (top 5-6)
  predictions.sort((a, b) => {
    const order = { very_likely: 0, likely: 1, possible: 2, unlikely: 3 };
    return order[a.likelihood] - order[b.likelihood];
  });

  return predictions.slice(0, 6);
}

function buildAntardashaHighlights(
  mdPlanet: string,
  antardashas: Array<{ planet: string; start_date: string; end_date: string }>,
  chart: ChartResponse,
  allLordships: Record<string, number[]>,
  lagna: string
): AntardashaHighlight[] {
  const currentADPlanet = chart.current_antardasha?.planet;
  return antardashas.map((ad) => {
    const adPlanet = getPlanet(chart, ad.planet);
    const adLordships = getEffectiveLordships(ad.planet, allLordships[ad.planet] || [], chart, allLordships);
    const adHouse = adPlanet?.house || 1;
    const adDignity = adPlanet?.dignity || null;

    const nature = dashaOverallNature(ad.planet, adLordships, adDignity, adHouse, lagna, chart, allLordships);

    const themes: string[] = [];
    for (const h of adLordships) {
      const areas = HOUSE_LIFE_AREAS[h];
      if (areas) themes.push(areas[0]);
    }
    const houseAreas = HOUSE_LIFE_AREAS[adHouse];
    if (houseAreas && !themes.includes(houseAreas[0])) themes.push(houseAreas[0]);

    const isYogakaraka = ad.planet === getYogakaraka(lagna);
    let keyPrediction = "";

    if (isYogakaraka) {
      keyPrediction = `${mdPlanet}-${ad.planet} is a particularly supportive sub-period. ${ad.planet} as Yogakaraka can bring positive developments in ${themes.slice(0, 2).join(" and ").toLowerCase()}.`;
    } else if (nature === "very_favorable" || nature === "favorable") {
      keyPrediction = `A constructive period where ${ad.planet}'s energy supports themes of ${themes.slice(0, 2).join(" and ").toLowerCase()}. Good time for initiatives in these areas.`;
    } else if (nature === "mixed") {
      keyPrediction = `A mixed sub-period. ${ad.planet} brings attention to ${themes.slice(0, 2).join(" and ").toLowerCase()}. Balanced approach recommended.`;
    } else {
      keyPrediction = `This sub-period calls for extra mindfulness. ${ad.planet}'s influence on ${themes.slice(0, 2).join(" and ").toLowerCase()} may bring challenges that, with awareness, become growth opportunities.`;
    }

    return {
      planet: ad.planet,
      startDate: ad.start_date,
      endDate: ad.end_date,
      isCurrent: ad.planet === currentADPlanet,
      nature,
      themes: themes.slice(0, 3),
      keyPrediction,
    };
  });
}

// ─── Yoga Detection ─────────────────────────────────────────────────────────

function detectYogas(chart: ChartResponse, lordshipsMap: Record<string, number[]>): YogaInfluence[] {
  const yogas: YogaInfluence[] = [];
  const moon = getPlanet(chart, "Moon");
  const sun = getPlanet(chart, "Sun");
  const jupiter = getPlanet(chart, "Jupiter");
  const mercury = getPlanet(chart, "Mercury");
  const venus = getPlanet(chart, "Venus");
  const mars = getPlanet(chart, "Mars");
  const saturn = getPlanet(chart, "Saturn");

  // 1. Gajakesari Yoga: Jupiter in kendra from Moon
  if (moon && jupiter) {
    const moonH = moon.house;
    const jupH = jupiter.house;
    const diff = ((jupH - moonH + 12) % 12);
    const isKendra = [0, 3, 6, 9].includes(diff);
    const strength = isKendra
      ? (jupiter.dignity === "own" || jupiter.dignity === "exalted" ? "strong" : "moderate")
      : "weak";
    yogas.push({
      name: "Gajakesari Yoga",
      planets: ["Jupiter", "Moon"],
      houses: [moonH, jupH],
      effect: "Jupiter in a kendra from Moon bestows wisdom, good reputation, and lasting prosperity.",
      isPresent: isKendra,
      strength: isKendra ? strength : "weak",
      lifeEventImpact: isKendra
        ? "This yoga supports positive outcomes in career, wealth, and social standing. During Jupiter or Moon dashas, its effects are especially pronounced \u2014 look for opportunities in education, children, and spiritual growth."
        : "Jupiter and Moon are not in a kendra relationship, so this yoga is not formed in your chart.",
    });
  }

  // 2. Budhaditya Yoga: Sun + Mercury in same house
  if (sun && mercury && sun.house === mercury.house) {
    const strength = (mercury.dignity === "own" || mercury.dignity === "exalted") ? "strong"
      : (sun.dignity === "debilitated" || mercury.dignity === "debilitated") ? "weak" : "moderate";
    yogas.push({
      name: "Budhaditya Yoga",
      planets: ["Sun", "Mercury"],
      houses: [sun.house],
      effect: "The conjunction of Sun and Mercury enhances intelligence, communication skills, and analytical ability.",
      isPresent: true,
      strength,
      lifeEventImpact: `This yoga strengthens your intellectual and communicative abilities. During Sun or Mercury dashas, expect heightened clarity in decision-making, good results in education, and potential recognition for your ideas and communication.`,
    });
  }

  // 3. Yogakaraka
  const yk = getYogakaraka(chart.lagna);
  if (yk) {
    const ykPlanet = getPlanet(chart, yk);
    const ykLordships = lordshipsMap[yk] || [];
    const isStrong = ykPlanet && (ykPlanet.dignity === "own" || ykPlanet.dignity === "exalted" || ykPlanet.dignity === "mooltrikona");
    const inKendra = ykPlanet && KENDRA_HOUSES.includes(ykPlanet.house);
    const strength = isStrong ? "strong" : (inKendra ? "moderate" : "weak");
    yogas.push({
      name: `Yogakaraka ${yk}`,
      planets: [yk],
      houses: ykLordships,
      effect: `${yk} lords both a kendra and trikona house (houses ${ykLordships.join(" & ")}), making it the most auspicious planet for your ${chart.lagna} ascendant.`,
      isPresent: true,
      strength,
      lifeEventImpact: `${yk}'s dasha and antardasha periods are among the most important in your life. Expect significant positive developments in ${ykLordships.map((h) => HOUSE_LIFE_AREAS[h]?.[0]?.toLowerCase() || "").filter(Boolean).join(", ")} during these times. ${isStrong ? `Being ${ykPlanet?.dignity} in ${ykPlanet?.rashi}, its results are amplified.` : "Strengthening this planet through remedies can enhance its positive effects."}`,
    });
  }

  // 4. Raja Yoga: Kendra lord + Trikona lord connection
  const kendraLords = new Set<string>();
  const trikonaLords = new Set<string>();
  for (const [planet, houses] of Object.entries(lordshipsMap)) {
    if (houses.some((h) => KENDRA_HOUSES.includes(h))) kendraLords.add(planet);
    if (houses.some((h) => TRIKONA_HOUSES.includes(h))) trikonaLords.add(planet);
  }
  // Check for conjunction or mutual aspect
  const rajaYogaPlanets: string[] = [];
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue; // Same planet lorded both = yogakaraka, already covered
      const klP = getPlanet(chart, kl);
      const tlP = getPlanet(chart, tl);
      if (klP && tlP && klP.house === tlP.house) {
        rajaYogaPlanets.push(`${kl}-${tl}`);
      }
    }
  }
  if (rajaYogaPlanets.length > 0) {
    yogas.push({
      name: "Raja Yoga",
      planets: rajaYogaPlanets[0].split("-"),
      houses: [getPlanet(chart, rajaYogaPlanets[0].split("-")[0])?.house || 1],
      effect: "A kendra lord and trikona lord conjoining creates Raja Yoga, indicating authority, success, and elevated status.",
      isPresent: true,
      strength: "moderate",
      lifeEventImpact: `This Raja Yoga formed by ${rajaYogaPlanets[0].replace("-", " and ")} can bring significant career advancement, recognition, and authority during their respective dasha periods. The effects are most noticeable when either planet's dasha or antardasha is active.`,
    });
  }

  // 5. Dhana Yoga: 2nd lord + 11th lord connection
  const lord2 = getHouseLord(chart, 2);
  const lord11 = getHouseLord(chart, 11);
  const lord2P = getPlanet(chart, lord2);
  const lord11P = getPlanet(chart, lord11);
  const dhanaPresent = lord2P && lord11P && (lord2P.house === lord11P.house ||
    lord2P.house === 11 || lord11P.house === 2);
  yogas.push({
    name: "Dhana Yoga",
    planets: [lord2, lord11],
    houses: [2, 11],
    effect: "Connection between the lords of wealth (2nd) and gains (11th) creates potential for financial prosperity.",
    isPresent: !!dhanaPresent,
    strength: dhanaPresent ? (lord2P?.dignity === "own" || lord2P?.dignity === "exalted" ? "strong" : "moderate") : "weak",
    lifeEventImpact: dhanaPresent
      ? `The connection between ${lord2} (2nd lord) and ${lord11} (11th lord) supports wealth accumulation. During their dasha periods, financial opportunities are indicated. This is especially strong if either planet is in dignity.`
      : `The 2nd lord (${lord2}) and 11th lord (${lord11}) don't have a direct connection. Wealth comes through steady effort rather than sudden windfalls.`,
  });

  // 6. Chandra-Mangal Yoga
  if (moon && mars && moon.house === mars.house) {
    yogas.push({
      name: "Chandra-Mangal Yoga",
      planets: ["Moon", "Mars"],
      houses: [moon.house],
      effect: "Moon-Mars conjunction gives financial acumen, entrepreneurial spirit, and material prosperity.",
      isPresent: true,
      strength: "moderate",
      lifeEventImpact: "This combination enhances your ability to take decisive financial actions. During Moon or Mars dashas, business ventures and property matters may be particularly favored.",
    });
  }

  return yogas;
}


// Age cutoff helpers
const MAX_AGE = 100;
const MAX_CHILDBEARING_AGE = 50;

function getBirthYear(chart: ChartResponse): number {
  // chart.date is typically "YYYY-MM-DD" or "DD-MM-YYYY" or similar
  const parts = chart.date.match(/(\d{4})/);
  if (parts) return parseInt(parts[1], 10);
  return new Date().getFullYear() - 30; // fallback
}

function getAgeAtDate(birthYear: number, dateStr: string): number {
  const year = new Date(dateStr).getFullYear();
  return year - birthYear;
}

// ─── Highlight Event Definitions (scoring-based) ───────────────────────────

interface HighlightEventDef {
  id: string;
  event: string;
  category: string;
  type: "positive" | "negative" | "neutral";
  /** Houses that, when lorded or occupied by MD/AD planet, increase relevance */
  relevantHouses: number[];
  /** Natural karaka planets — extra score when they're the MD or AD lord */
  karakaPlanets: string[];
  /** Which house combinations between MD+AD are especially strong */
  powerCombos: number[][];
  /** Minimum score to generate a highlight */
  threshold: number;
  /** If true, only trigger during challenging/mixed nature */
  requiresChallenging?: boolean;
  /** Age cutoff (e.g. children only before 50) */
  maxAge?: number;
  /** Minimum age for this event to be relevant */
  minAge?: number;
}

const HIGHLIGHT_EVENTS: HighlightEventDef[] = [
  {
    id: "marriage", event: "Marriage / Committed Partnership", category: "marriage", type: "positive",
    relevantHouses: [7, 2, 1, 11], karakaPlanets: ["Venus"],
    powerCombos: [[7, 2], [7, 1], [7, 11], [7, 5]], threshold: 4, minAge: 16,
  },
  {
    id: "romance", event: "Romance & Love", category: "romance", type: "positive",
    relevantHouses: [5, 7, 11], karakaPlanets: ["Venus", "Moon"],
    powerCombos: [[5, 7], [5, 11]], threshold: 3, minAge: 14,
  },
  {
    id: "children", event: "Children / Progeny", category: "children", type: "positive",
    relevantHouses: [5, 9, 2], karakaPlanets: ["Jupiter"],
    powerCombos: [[5, 2], [5, 9]], threshold: 4, minAge: 18, maxAge: MAX_CHILDBEARING_AGE,
  },
  {
    id: "career_growth", event: "Career Advancement / Peak", category: "career_growth", type: "positive",
    relevantHouses: [10, 6, 11, 1], karakaPlanets: ["Sun", "Saturn"],
    powerCombos: [[10, 11], [10, 1], [10, 9], [6, 10]], threshold: 4, minAge: 16,
  },
  {
    id: "wealth", event: "Wealth Accumulation", category: "wealth", type: "positive",
    relevantHouses: [2, 11, 9, 5], karakaPlanets: ["Jupiter", "Venus"],
    powerCombos: [[2, 11], [2, 9], [11, 9]], threshold: 4, minAge: 16,
  },
  {
    id: "property", event: "Property / Vehicle Acquisition", category: "property", type: "positive",
    relevantHouses: [4, 11, 2], karakaPlanets: ["Mars", "Moon"],
    powerCombos: [[4, 11], [4, 2]], threshold: 3, minAge: 20,
  },
  {
    id: "education", event: "Education & Knowledge", category: "education", type: "positive",
    relevantHouses: [4, 5, 9], karakaPlanets: ["Jupiter", "Mercury"],
    powerCombos: [[4, 5], [5, 9], [4, 9]], threshold: 3, minAge: 5,
  },
  {
    id: "fame", event: "Fame & Recognition", category: "fame", type: "positive",
    relevantHouses: [10, 1, 5, 11], karakaPlanets: ["Sun", "Rahu"],
    powerCombos: [[10, 1], [10, 5], [1, 11]], threshold: 4, minAge: 16,
  },
  {
    id: "new_business", event: "New Business / Venture", category: "new_business", type: "positive",
    relevantHouses: [7, 10, 3, 11], karakaPlanets: ["Mercury"],
    powerCombos: [[7, 10], [3, 11], [10, 3]], threshold: 4, minAge: 18,
  },
  {
    id: "foreign_travel", event: "Foreign Travel / Opportunity", category: "foreign_travel", type: "positive",
    relevantHouses: [9, 12, 3], karakaPlanets: ["Rahu"],
    powerCombos: [[9, 12], [12, 3]], threshold: 3, minAge: 10,
  },
  {
    id: "spiritual_growth", event: "Spiritual Awakening / Growth", category: "spiritual_growth", type: "positive",
    relevantHouses: [9, 12, 5], karakaPlanets: ["Ketu", "Jupiter"],
    powerCombos: [[9, 12], [5, 9]], threshold: 3, minAge: 12,
  },
  {
    id: "health_issues", event: "Health Awareness Period", category: "health_issues", type: "negative",
    relevantHouses: [6, 8, 1, 12], karakaPlanets: ["Saturn", "Mars", "Rahu"],
    powerCombos: [[6, 8], [8, 12], [1, 6]], threshold: 4, requiresChallenging: true, minAge: 5,
  },
  {
    id: "relationship_conflict", event: "Relationship Challenges", category: "relationship_conflict", type: "negative",
    relevantHouses: [7, 6, 12, 8], karakaPlanets: ["Mars", "Saturn", "Rahu", "Ketu"],
    powerCombos: [[7, 6], [7, 12], [7, 8]], threshold: 4, requiresChallenging: true, minAge: 14,
  },
  {
    id: "financial_loss", event: "Financial Caution Period", category: "financial_loss", type: "negative",
    relevantHouses: [12, 6, 8, 2], karakaPlanets: ["Rahu", "Saturn"],
    powerCombos: [[12, 2], [8, 2], [12, 6]], threshold: 4, requiresChallenging: true, minAge: 16,
  },
  {
    id: "career_setback", event: "Career Transition / Setback", category: "career_setback", type: "negative",
    relevantHouses: [10, 8, 12], karakaPlanets: ["Saturn", "Rahu"],
    powerCombos: [[10, 8], [10, 12]], threshold: 4, requiresChallenging: true, minAge: 18,
  },
];

// ─── Transit Lookup Helper ──────────────────────────────────────────────────

/** Find the snapshot closest to the midpoint of a date range. */
function getTransitSnapshot(
  snapshots: SlowPlanetSnapshot[],
  startDate: string,
  endDate: string
): Record<string, number> | null {
  if (!snapshots || snapshots.length === 0) return null;
  // Compute midpoint as YYYY-MM-DD
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  const mid = new Date((s + e) / 2);
  const midStr = mid.toISOString().slice(0, 10);

  // Binary search for closest snapshot
  let lo = 0, hi = snapshots.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (snapshots[m].date < midStr) lo = m + 1;
    else hi = m;
  }
  // Check lo and lo-1 for closest
  if (lo > 0) {
    const d1 = Math.abs(new Date(snapshots[lo - 1].date).getTime() - mid.getTime());
    const d2 = Math.abs(new Date(snapshots[lo].date).getTime() - mid.getTime());
    if (d1 < d2) lo = lo - 1;
  }
  return snapshots[lo].planets;
}

/**
 * Score transit contribution for an event.
 * Checks if slow planets (Jupiter, Saturn, Rahu, Ketu) are transiting
 * houses relevant to the event during the antardasha window.
 */
function scoreTransits(
  transitHouses: Record<string, number>,
  relevantHouses: number[],
): { transitScore: number; transitReasons: string[] } {
  let transitScore = 0;
  const transitReasons: string[] = [];
  const TRANSIT_PLANETS = ["Jupiter", "Saturn", "Rahu", "Ketu"];

  const transiting: string[] = [];
  for (const planet of TRANSIT_PLANETS) {
    const house = transitHouses[planet];
    if (house && relevantHouses.includes(house)) {
      // Jupiter and Saturn get +2, Rahu/Ketu get +1
      const pts = (planet === "Jupiter" || planet === "Saturn") ? 2 : 1;
      transitScore += pts;
      transitReasons.push(`Transit ${planet} in ${ordinal(house)} house`);
      transiting.push(planet);
    }
  }

  // Double transit bonus: Jupiter + Saturn both in relevant houses
  if (transiting.includes("Jupiter") && transiting.includes("Saturn")) {
    transitScore += 2;
    transitReasons.push("Double transit (Jupiter + Saturn) confirms event");
  }

  return { transitScore, transitReasons };
}

// ─── Upcoming Highlights Builder (Scoring-Based) ───────────────────────────

function buildUpcomingHighlights(
  dashaPredictions: DashaPrediction[],
  chart: ChartResponse,
  lordshipsMap: Record<string, number[]>,
  lagna: string,
  transitSnapshots?: SlowPlanetSnapshot[]
): LifeHighlight[] {
  const highlights: LifeHighlight[] = [];
  const birthYr = getBirthYear(chart);
  const maxYear = birthYr + MAX_AGE;
  const yogakaraka = getYogakaraka(lagna);

  for (const dp of dashaPredictions) {
    // MD lordships (effective — handles Rahu/Ketu)
    const mdLordships = getEffectiveLordships(
      dp.planet, lordshipsMap[dp.planet] || [], chart, lordshipsMap
    );
    const mdPlanet = getPlanet(chart, dp.planet);
    const mdHouse = mdPlanet?.house || 1;
    const mdDignity = mdPlanet?.dignity || null;
    const mdIsStrong = mdDignity === "exalted" || mdDignity === "own" || mdDignity === "mooltrikona";

    for (const ad of dp.antardashaHighlights) {
      const adStartYear = new Date(ad.startDate).getFullYear();
      if (adStartYear > maxYear) continue;
      const adAge = adStartYear - birthYr;

      // AD lordships (effective — handles Rahu/Ketu)
      const adLordships = getEffectiveLordships(
        ad.planet, lordshipsMap[ad.planet] || [], chart, lordshipsMap
      );
      const adPlanetData = getPlanet(chart, ad.planet);
      const adHouse = adPlanetData?.house || 1;
      const adDignity = adPlanetData?.dignity || null;
      const adIsStrong = adDignity === "exalted" || adDignity === "own" || adDignity === "mooltrikona";

      // Combined lordship set for this MD-AD pair
      const combinedHouses = new Set([...mdLordships, ...adLordships]);

      // For Rahu/Ketu, get dispositor name for reasoning text
      const mdDispositor = (dp.planet === "Rahu" || dp.planet === "Ketu")
        ? RASHI_LORDS[mdPlanet?.rashi || ""] || null : null;
      const adDispositor = (ad.planet === "Rahu" || ad.planet === "Ketu")
        ? RASHI_LORDS[adPlanetData?.rashi || ""] || null : null;

      for (const evt of HIGHLIGHT_EVENTS) {
        // Age cutoffs
        if (evt.maxAge && adAge > evt.maxAge) continue;
        if (evt.minAge && adAge < evt.minAge) continue;

        // For negative events: allow if AD nature is challenging/mixed,
        // OR if either MD/AD lords a dusthana (6/8/12) that overlaps with
        // this event's relevant houses ("negative pathway").
        // A planet lording both a positive house and a dusthana delivers
        // different results depending on which lordship the event activates.
        if (evt.requiresChallenging && ad.nature !== "challenging" && ad.nature !== "mixed") {
          const dusthanaPathway = [...mdLordships, ...adLordships]
            .filter(h => TRIK_HOUSES.includes(h))
            .some(h => evt.relevantHouses.includes(h));
          if (!dusthanaPathway) continue;
        }

        // ── SCORING ──
        let score = 0;
        const reasons: string[] = [];

        // 1. Lordship relevance: +2 for each relevant house lorded by MD or AD
        const mdRelevantHouses = mdLordships.filter(h => evt.relevantHouses.includes(h));
        const adRelevantHouses = adLordships.filter(h => evt.relevantHouses.includes(h));
        for (const h of mdRelevantHouses) {
          score += 2;
          reasons.push(mdDispositor
            ? `${dp.planet} (via ${mdDispositor}) activates the ${ordinal(h)} house`
            : `${dp.planet} lords the ${ordinal(h)} house`);
        }
        for (const h of adRelevantHouses) {
          score += 2;
          reasons.push(adDispositor
            ? `${ad.planet} (via ${adDispositor}) activates the ${ordinal(h)} house`
            : `${ad.planet} lords the ${ordinal(h)} house`);
        }

        // 2. Occupancy: +1 if MD or AD planet sits in a relevant house
        if (evt.relevantHouses.includes(mdHouse)) {
          score += 1;
          reasons.push(`${dp.planet} placed in ${ordinal(mdHouse)} house`);
        }
        if (evt.relevantHouses.includes(adHouse)) {
          score += 1;
          reasons.push(`${ad.planet} placed in ${ordinal(adHouse)} house`);
        }

        // 3. Natural karaka bonus: +2 if either planet is a karaka for this event
        if (evt.karakaPlanets.includes(dp.planet)) {
          score += 2;
          reasons.push(`${dp.planet} is natural significator`);
        }
        if (evt.karakaPlanets.includes(ad.planet)) {
          score += 2;
          reasons.push(`${ad.planet} is natural significator`);
        }

        // 4. Power combo bonus: +2 if MD+AD lordships together cover a power combo
        for (const combo of evt.powerCombos) {
          const coversAll = combo.every(h => combinedHouses.has(h));
          if (coversAll) {
            score += 2;
            reasons.push(`${combo.map(h => ordinal(h)).join(" + ")} lord combination activated`);
            break; // Only count one power combo
          }
        }

        // 5. Dignity bonus: +1 for each strong planet
        if (mdIsStrong && mdRelevantHouses.length > 0) {
          score += 1;
          reasons.push(`${dp.planet} in ${mdDignity}`);
        }
        if (adIsStrong && adRelevantHouses.length > 0) {
          score += 1;
          reasons.push(`${ad.planet} in ${adDignity}`);
        }

        // 6. Yogakaraka: +2 for positive events (amplifies), -2 for negative (protects)
        if (dp.planet === yogakaraka || ad.planet === yogakaraka) {
          const ykPlanet = dp.planet === yogakaraka ? dp.planet : ad.planet;
          if (evt.type === "negative") {
            score -= 2;
            reasons.push(`${ykPlanet} (Yogakaraka) provides protection`);
          } else {
            score += 2;
            reasons.push(`${ykPlanet} is Yogakaraka`);
          }
        }

        // 7. Debilitation penalty: -1 for weakened planets
        if (mdDignity === "debilitated" && mdRelevantHouses.length > 0) score -= 1;
        if (adDignity === "debilitated" && adRelevantHouses.length > 0) score -= 1;

        // 8. Favorable period bonus: +1 for very_favorable AD nature
        if (ad.nature === "very_favorable" && evt.type === "positive") score += 1;
        if (ad.nature === "challenging" && evt.type === "negative") score += 1;

        // 9. Transit confirmation: slow planets transiting relevant houses
        if (transitSnapshots && transitSnapshots.length > 0) {
          const transitHouses = getTransitSnapshot(transitSnapshots, ad.startDate, ad.endDate);
          if (transitHouses) {
            const { transitScore, transitReasons } = scoreTransits(transitHouses, evt.relevantHouses);
            score += transitScore;
            reasons.push(...transitReasons);
          }
        }

        // ── Check threshold
        if (score < evt.threshold) continue;

        // ── Determine likelihood from score
        let likelihood: "very_likely" | "likely" | "possible" = "possible";
        if (score >= evt.threshold + 4) likelihood = "very_likely";
        else if (score >= evt.threshold + 2) likelihood = "likely";

        // ── Build rich reasoning (like the manual demo analysis)
        const mdHouseParts = mdLordships.map(h => ordinal(h)).join("+");
        const mdHouseStr = mdLordships.length > 0
          ? (mdDispositor ? `via ${mdDispositor}, ${mdHouseParts} lord` : `${mdHouseParts} lord`)
          : `placed in house ${mdHouse}`;
        const adHouseParts = adLordships.map(h => ordinal(h)).join("+");
        const adHouseStr = adLordships.length > 0
          ? (adDispositor ? `via ${adDispositor}, ${adHouseParts} lord` : `${adHouseParts} lord`)
          : `placed in house ${adHouse}`;

        let reasoning = `${dp.planet} (${mdHouseStr}) with ${ad.planet} (${adHouseStr})`;

        // Add dignity info
        if (mdIsStrong) reasoning += ` \u2014 ${dp.planet} in ${mdDignity}`;
        if (adIsStrong) reasoning += ` \u2014 ${ad.planet} in ${adDignity}`;

        // Add the key reason
        const uniqueReasons = [...new Set(reasons)];
        if (uniqueReasons.length > 0) {
          reasoning += `. ${uniqueReasons.slice(0, 3).join("; ")}`;
        }

        // Add event-specific interpretation
        reasoning += `. ${getEventInterpretation(evt, score, dp.planet, ad.planet)}`;

        highlights.push({
          event: evt.event,
          category: evt.category,
          type: evt.type,
          window: `${formatDate(ad.startDate)} \u2013 ${formatDate(ad.endDate)}`,
          startDateRaw: ad.startDate,
          endDateRaw: ad.endDate,
          dashaContext: `${dp.planet}-${ad.planet} period`,
          likelihood,
          score,
          reasoning,
        });
      }
    }
  }

  // Deduplicate by category+window, keep highest score
  const seen = new Map<string, LifeHighlight>();
  for (const h of highlights) {
    const key = `${h.category}-${h.window}`;
    const existing = seen.get(key);
    if (!existing || h.score > existing.score) {
      seen.set(key, h);
    }
  }

  // Also deduplicate by category+dashaContext to avoid repeating same event in same MD-AD
  const seen2 = new Map<string, LifeHighlight>();
  for (const [, h] of seen) {
    const key = `${h.category}-${h.dashaContext}`;
    const existing = seen2.get(key);
    if (!existing || h.score > existing.score) {
      seen2.set(key, h);
    }
  }

  // Resolve conflicting pairs: when a positive and negative event target the
  // same life theme in the same MD-AD period, keep only one. The period's
  // overall nature decides: favorable → positive wins, challenging → negative.
  const CONFLICT_PAIRS: [string, string][] = [
    ["marriage", "relationship_conflict"],
    ["career_growth", "career_setback"],
    ["wealth", "financial_loss"],
  ];

  const afterConflict = Array.from(seen2.values());
  const toRemove = new Set<string>();

  for (const [positiveCat, negativeCat] of CONFLICT_PAIRS) {
    // Group by dashaContext (MD-AD period)
    const positiveByPeriod = new Map<string, LifeHighlight>();
    const negativeByPeriod = new Map<string, LifeHighlight>();

    for (const h of afterConflict) {
      if (h.category === positiveCat) positiveByPeriod.set(h.dashaContext, h);
      if (h.category === negativeCat) negativeByPeriod.set(h.dashaContext, h);
    }

    for (const [period] of positiveByPeriod) {
      const neg = negativeByPeriod.get(period);
      if (!neg) continue; // No conflict
      const pos = positiveByPeriod.get(period)!;

      // Determine which to remove based on the period's dasha nature:
      // If the reasoning mentions "Yogakaraka provides protection" → favor positive
      // Otherwise compare scores; if equal, check if the period context leans positive/negative
      // Simple heuristic: higher score wins; on tie, positive wins
      if (pos.score >= neg.score) {
        toRemove.add(`${neg.category}-${neg.dashaContext}`);
      } else {
        toRemove.add(`${pos.category}-${pos.dashaContext}`);
      }
    }
  }

  const deduped = afterConflict.filter(
    h => !toRemove.has(`${h.category}-${h.dashaContext}`)
  );

  // Sort chronologically by startDateRaw, then by likelihood
  deduped.sort((a, b) => {
    const cmp = a.startDateRaw.localeCompare(b.startDateRaw);
    if (cmp !== 0) return cmp;
    const order = { very_likely: 0, likely: 1, possible: 2 };
    return order[a.likelihood] - order[b.likelihood];
  });

  return deduped;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getEventInterpretation(
  evt: HighlightEventDef,
  score: number,
  mdPlanet: string,
  adPlanet: string,
): string {
  const strong = score >= evt.threshold + 4;
  const moderate = score >= evt.threshold + 2;

  switch (evt.id) {
    case "marriage":
      if (strong) return "This is a STRONG marriage indicator \u2014 multiple house activations create a compelling window for committed partnership or marriage.";
      if (moderate) return "This combination creates a supportive window for committed relationships or marriage.";
      return "Partnership themes are activated during this period, with possibilities for deeper commitment.";

    case "romance":
      if (strong) return "A particularly romantic period with strong 5th house activation \u2014 love, attraction, and emotional bonding are strongly indicated.";
      return "Romance and emotional connections are highlighted during this window.";

    case "children":
      if (strong) return "Very strong indicators for children/progeny \u2014 the 5th house activation combined with Jupiter's blessing creates ideal conditions.";
      if (moderate) return "The 5th house of children is well-activated, creating a supportive window for progeny.";
      return "The lordship connections to the 5th house create possibilities for children during this period.";

    case "career_growth":
      if (strong) return "An exceptional period for career \u2014 10th house activation with gains (11th) suggests major professional advancement, promotion, or recognition.";
      if (moderate) return "Career growth is well-supported with 10th house activation \u2014 good time for initiatives and taking on greater responsibility.";
      return "Professional themes are activated, with gradual progress likely during this window.";

    case "wealth":
      if (strong) return "A powerful wealth combination \u2014 2nd (wealth) and 11th (gains) lord activation creates strong indicators for financial growth and prosperity.";
      if (moderate) return "Financial matters are well-supported during this window, with good potential for income growth.";
      return "Moderate financial improvements are indicated as wealth houses are activated.";

    case "property":
      if (strong) return "Strong indicators for property acquisition or vehicle purchase \u2014 4th house activation with supporting factors.";
      return "Property and fixed asset themes are activated during this window.";

    case "education":
      if (strong) return "Excellent period for learning, higher education, or academic achievement.";
      return "Educational pursuits and knowledge acquisition are favored during this period.";

    case "fame":
      if (strong) return "A powerful period for public recognition, fame, and social status elevation.";
      return "Opportunities for recognition and visibility are indicated.";

    case "new_business":
      if (strong) return "Strong indicators for launching new ventures or business expansion.";
      return "Entrepreneurial themes are activated \u2014 consider new initiatives carefully.";

    case "foreign_travel":
      if (strong) return "Very strong indicators for foreign travel, overseas opportunities, or international connections.";
      return "Foreign connections and travel opportunities are indicated during this window.";

    case "spiritual_growth":
      if (strong) return "A profound period for spiritual development, inner growth, and transcendental experiences.";
      return "Inner growth and spiritual awareness are highlighted during this period.";

    case "health_issues":
      return "This is simply a call for mindfulness about health \u2014 regular check-ups and self-care during this window can be beneficial. This is not a prediction of illness, but an indicator for preventive awareness.";

    case "relationship_conflict":
      return "Relationship dynamics may require extra patience and communication during this period. Awareness itself is a powerful tool for maintaining harmony.";

    case "financial_loss":
      return "Exercise prudence with financial decisions during this window. Avoid speculative investments and focus on preserving what you have.";

    case "career_setback":
      return "Career transitions or temporary setbacks are possible. This can also be a period of meaningful professional reinvention if approached with openness.";

    default:
      return "This period activates relevant themes \u2014 stay mindful and proactive.";
  }
}

function splitHighlights(
  allHighlights: LifeHighlight[]
): { past: LifeHighlight[]; upcoming: LifeHighlight[] } {
  const now = new Date().toISOString().slice(0, 10);
  const past: LifeHighlight[] = [];
  const upcoming: LifeHighlight[] = [];

  for (const h of allHighlights) {
    // Only classify as past if the period has fully ended
    if (h.endDateRaw < now) {
      past.push(h);
    } else {
      upcoming.push(h);
    }
  }

  // Past: sort by score (strongest first), then by date (most recent first)
  past.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.startDateRaw.localeCompare(a.startDateRaw);
  });

  // Diversity limit: max 2 per category for past, max 3 for upcoming
  // This ensures important events from different categories surface
  const diversifyList = (list: LifeHighlight[], maxPerCategory: number, maxTotal: number): LifeHighlight[] => {
    const catCount = new Map<string, number>();
    const result: LifeHighlight[] = [];
    for (const h of list) {
      const count = catCount.get(h.category) || 0;
      if (count >= maxPerCategory) continue;
      catCount.set(h.category, count + 1);
      result.push(h);
      if (result.length >= maxTotal) break;
    }
    return result;
  };

  return {
    past: diversifyList(past, 2, 15),
    upcoming: diversifyList(upcoming, 3, 15),
  };
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function generateLifeEventsReport(
  chart: ChartResponse,
  transitSnapshots?: SlowPlanetSnapshot[]
): LifeEventsReport {
  const lagna = chart.lagna;
  const lordshipsMap = getLordships(lagna);
  const yogakaraka = getYogakaraka(lagna);
  const birthYear = getBirthYear(chart);

  // ── Chart Summary
  const lagnaLord = RASHI_LORDS[lagna] || "Sun";
  const lagnaLordPlanet = getPlanet(chart, lagnaLord);
  const moonPlanet = getPlanet(chart, "Moon");
  const sunPlanet = getPlanet(chart, "Sun");
  const currentDasha = chart.current_dasha;
  const currentAD = chart.current_antardasha;

  const chartSummary: ChartSummary = {
    lagna,
    lagnaLord,
    lagnaLordPlacement: lagnaLordPlanet ? `House ${lagnaLordPlanet.house} in ${lagnaLordPlanet.rashi}` : "Unknown",
    moonSign: moonPlanet?.rashi || "Unknown",
    sunSign: sunPlanet?.rashi || "Unknown",
    currentDasha: currentDasha?.planet || "Unknown",
    currentAntardasha: currentAD?.planet || "Unknown",
    description: `You have a ${lagna} ascendant with ${lagnaLord} as your chart ruler, placed in ${lagnaLordPlanet?.rashi || "its sign"} (house ${lagnaLordPlanet?.house || "?"}${lagnaLordPlanet?.dignity ? `, ${lagnaLordPlanet.dignity}` : ""}). Your Moon is in ${moonPlanet?.rashi || "?"} (house ${moonPlanet?.house || "?"}), shaping your emotional nature and public interactions. ${yogakaraka ? `${yogakaraka} serves as your Yogakaraka \u2014 the most auspicious planet \u2014 whose periods tend to bring the most positive life developments.` : ""} You are currently running ${currentDasha?.planet || "?"} Mahadasha with ${currentAD?.planet || "?"} antardasha, which colors your present life themes.`,
  };

  // ── House Analysis
  const houseAnalysis: HouseSignificance[] = [];
  for (let h = 1; h <= 12; h++) {
    const rashi = getHouseRashi(chart, h);
    const lord = getHouseLord(chart, h);
    const lordP = getPlanet(chart, lord);
    const occupants = getOccupants(chart, h);
    const strength = assessHouseStrength(chart, h, lordshipsMap);
    const lifeAreas = HOUSE_LIFE_AREAS[h] || [];

    let interpretation = `House ${h} (${lifeAreas.join(", ")}) is in ${rashi}, ruled by ${lord}`;
    if (lordP) {
      interpretation += ` placed in house ${lordP.house} (${lordP.rashi})`;
      if (lordP.dignity) interpretation += ` in ${lordP.dignity}`;
    }
    interpretation += ". ";
    if (occupants.length > 0) {
      const benefics = occupants.filter((o) => NATURAL_BENEFICS.includes(o));
      const malefics = occupants.filter((o) => NATURAL_MALEFICS.includes(o));
      if (benefics.length > 0) interpretation += `Benefic presence of ${benefics.join(", ")} brings supportive energy. `;
      if (malefics.length > 0) interpretation += `${malefics.join(", ")} here adds intensity and may require mindful navigation. `;
    }
    if (strength === "strong") interpretation += "Overall, this house is well-supported in your chart.";
    else if (strength === "moderate") interpretation += "This house has moderate support, with results depending on dasha timing.";
    else interpretation += "This house may need extra attention \u2014 remedial measures during relevant dashas can help.";

    houseAnalysis.push({
      house: h,
      rashi,
      lord,
      lordPlacement: lordP ? `House ${lordP.house} in ${lordP.rashi}` : "Unknown",
      lordDignity: lordP?.dignity || null,
      occupants,
      lifeAreas,
      strength,
      interpretation,
    });
  }

  // ── Planetary Strengths
  const planetaryStrengths: PlanetStrength[] = [];
  const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  for (const pName of PLANETS) {
    const p = getPlanet(chart, pName);
    if (!p) continue;
    const pLordships = lordshipsMap[pName] || [];
    const strength = assessPlanetStrength(pName, p.dignity, p.house, p.is_retrograde, pLordships, lagna);

    let interpretation = `${pName} in ${p.rashi} (house ${p.house})`;
    if (p.dignity) interpretation += ` is ${p.dignity}`;
    if (p.is_retrograde) interpretation += `, retrograde`;
    interpretation += `. `;
    if (pLordships.length > 0) {
      interpretation += `As lord of house(s) ${pLordships.join(" and ")}, ${pName} governs ${pLordships.map((h) => HOUSE_LIFE_AREAS[h]?.[0]?.toLowerCase() || "").filter(Boolean).join(" and ")} in your life. `;
    }
    if (pName === yogakaraka) {
      interpretation += `As your Yogakaraka, ${pName}'s periods are among the most auspicious for you. `;
    }
    if (strength === "strong") interpretation += "This planet is well-positioned to deliver positive results.";
    else if (strength === "moderate") interpretation += "Results are mixed but can be enhanced during favorable sub-periods.";
    else interpretation += "This planet may underdeliver or bring challenges \u2014 but awareness and remedies can help.";

    planetaryStrengths.push({
      planet: pName,
      rashi: p.rashi,
      house: p.house,
      dignity: p.dignity,
      isRetrograde: p.is_retrograde,
      lordOf: pLordships,
      naturalSignifications: PLANET_SIGNIFICATIONS[pName] || [],
      strength,
      interpretation,
    });
  }

  // ── Event Categories
  const eventCategories: EventCategory[] = EVENT_CATEGORIES_DEF.map((cat) => {
    const outlook = assessCategoryOutlook(cat, chart, lordshipsMap);
    const summary = buildCategorySummary(cat, outlook, chart, lordshipsMap);
    return { ...cat, overallOutlook: outlook, summary };
  });

  // ── Dasha Predictions (clipped at age 100)
  const dashaPredictions: DashaPrediction[] = [];
  const dashaSequence = chart.dasha_sequence || [];
  const maxYear = birthYear + MAX_AGE;

  for (const dasha of dashaSequence) {
    // Skip dashas that start entirely after age 100
    const dashaStartYear = new Date(dasha.start_date).getFullYear();
    if (dashaStartYear > maxYear) continue;
    const dp = getPlanet(chart, dasha.planet);
    const dLordships = lordshipsMap[dasha.planet] || [];
    const dEffective = getEffectiveLordships(dasha.planet, dLordships, chart, lordshipsMap);
    const dHouse = dp?.house || 1;
    const dDignity = dp?.dignity || null;
    const dIsRahuKetu = dasha.planet === "Rahu" || dasha.planet === "Ketu";
    const dDispositor = dIsRahuKetu ? RASHI_LORDS[dp?.rashi || ""] : null;

    const overallNature = dashaOverallNature(dasha.planet, dLordships, dDignity, dHouse, lagna, chart, lordshipsMap);

    const themes: string[] = [];
    for (const h of dEffective) {
      const areas = HOUSE_LIFE_AREAS[h];
      if (areas) themes.push(areas[0]);
    }
    const houseAreas = HOUSE_LIFE_AREAS[dHouse];
    if (houseAreas && !themes.includes(houseAreas[0])) themes.push(houseAreas[0]);

    const eventPredictions = buildDashaEventPredictions(
      dasha.planet, dLordships, dHouse, dDignity, chart, lordshipsMap, lagna, dasha.start_date
    );

    // Filter antardashas to age 100 cutoff
    const filteredAntardashas = (dasha.antardashas || []).filter(
      (ad) => new Date(ad.start_date).getFullYear() <= maxYear
    );
    const antardashaHighlights = buildAntardashaHighlights(
      dasha.planet, filteredAntardashas, chart, lordshipsMap, lagna
    );

    dashaPredictions.push({
      planet: dasha.planet,
      startDate: dasha.start_date,
      endDate: dasha.end_date,
      isCurrent: dasha.planet === currentDasha?.planet,
      planetRole: dIsRahuKetu && dDispositor
        ? `Via ${dDispositor} — activates house(s) ${dEffective.join(" & ")}`
        : `Lord of house(s) ${dEffective.join(" & ")}`,
      housePosition: `House ${dHouse} (${dp?.rashi || "?"})`,
      dignity: dDignity,
      overallNature,
      themes: themes.slice(0, 4),
      eventPredictions,
      antardashaHighlights,
    });
  }

  // ── Current Period Analysis
  const currentMD = currentDasha?.planet || "Unknown";
  const currentADPlanet = currentAD?.planet || "Unknown";
  const mdPlanet = getPlanet(chart, currentMD);
  const adPlanet = getPlanet(chart, currentADPlanet);
  const mdLordships = lordshipsMap[currentMD] || [];
  const adLordships = lordshipsMap[currentADPlanet] || [];

  const currentNature = dashaOverallNature(
    currentADPlanet,
    adLordships,
    adPlanet?.dignity || null,
    adPlanet?.house || 1,
    lagna,
    chart,
    lordshipsMap
  );

  const mdThemes = mdLordships.map((h) => HOUSE_LIFE_AREAS[h]?.[0]?.toLowerCase()).filter(Boolean);
  const adThemes = adLordships.map((h) => HOUSE_LIFE_AREAS[h]?.[0]?.toLowerCase()).filter(Boolean);

  const opportunities: string[] = [];
  const cautions: string[] = [];
  const remedialSuggestions: string[] = [];

  // Build opportunities and cautions based on lordships
  for (const h of [...mdLordships, ...adLordships]) {
    if (TRIKONA_HOUSES.includes(h) || h === 11) {
      const area = HOUSE_LIFE_AREAS[h]?.[0] || "";
      opportunities.push(`${area}-related matters may see positive developments during this period`);
    }
    if (TRIK_HOUSES.includes(h)) {
      const area = HOUSE_LIFE_AREAS[h]?.[0] || "";
      cautions.push(`Be mindful of ${area.toLowerCase()}-related matters \u2014 awareness and prevention go a long way`);
    }
  }

  if (currentMD === yogakaraka || currentADPlanet === yogakaraka) {
    opportunities.push(`Your Yogakaraka ${yogakaraka} is active \u2014 this is one of your most supportive periods`);
  }

  // Remedies based on current planets
  if (adPlanet) {
    if (NATURAL_MALEFICS.includes(currentADPlanet)) {
      remedialSuggestions.push(`Chant the ${currentADPlanet} mantra regularly to harmonize its energy`);
      if (currentADPlanet === "Saturn") remedialSuggestions.push("Light a sesame oil lamp on Saturdays");
      if (currentADPlanet === "Mars") remedialSuggestions.push("Recite Hanuman Chalisa on Tuesdays for Mars pacification");
      if (currentADPlanet === "Rahu") remedialSuggestions.push("Donate to the less fortunate on Saturdays to pacify Rahu");
      if (currentADPlanet === "Ketu") remedialSuggestions.push("Practice meditation regularly \u2014 Ketu rewards spiritual effort");
    }
    if (adPlanet.dignity === "debilitated") {
      remedialSuggestions.push(`Consider wearing a gemstone for ${currentADPlanet} after consulting a qualified astrologer`);
    }
    remedialSuggestions.push("Maintain a regular daily routine (dinacharya) for overall balance");
  }

  const currentPeriodAnalysis: CurrentPeriodDetail = {
    mahadasha: currentMD,
    antardasha: currentADPlanet,
    startDate: currentAD?.start_date || "",
    endDate: currentAD?.end_date || "",
    overallNature: currentNature,
    detailedAnalysis: `You are currently in ${currentMD} Mahadasha and ${currentADPlanet} Antardasha (${currentAD ? `${formatDate(currentAD.start_date)} to ${formatDate(currentAD.end_date)}` : "dates unknown"}). ${currentMD} as lord of houses ${mdLordships.join(" and ")} brings focus to ${mdThemes.join(", ")} themes in your life. The ${currentADPlanet} sub-period, ruling houses ${adLordships.join(" and ")}, channels this energy through ${adThemes.join(", ")} matters. ${currentNature === "very_favorable" || currentNature === "favorable" ? "The overall energy of this period is supportive \u2014 a good time to pursue your goals with confidence while remaining grounded." : currentNature === "mixed" ? "This period carries both opportunities and challenges \u2014 staying balanced and making thoughtful decisions will help you make the most of this time." : "This period calls for patience and mindfulness. Challenges that arise are opportunities for growth \u2014 focus on what you can control and let go of what you cannot."}`,
    opportunities: [...new Set(opportunities)].slice(0, 4),
    cautions: [...new Set(cautions)].slice(0, 4),
    remedialSuggestions: [...new Set(remedialSuggestions)].slice(0, 4),
  };

  // ── Life Highlights (past + upcoming, sorted chronologically)
  const allHighlights = buildUpcomingHighlights(dashaPredictions, chart, lordshipsMap, lagna, transitSnapshots);
  const { past: pastHighlights, upcoming: upcomingHighlights } = splitHighlights(allHighlights);

  // ── Yoga Influences
  const yogaInfluences = detectYogas(chart, lordshipsMap);

  return {
    chartSummary,
    houseAnalysis,
    planetaryStrengths,
    eventCategories,
    dashaPredictions,
    currentPeriodAnalysis,
    pastHighlights,
    upcomingHighlights,
    yogaInfluences,
  };
}
