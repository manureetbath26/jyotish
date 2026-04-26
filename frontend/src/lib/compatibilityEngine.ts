/**
 * Vedic Compatibility Engine — Ashtakoot (8-fold) Guna Milan
 *
 * The traditional system scores compatibility across 8 factors (koots)
 * totalling 36 points. Generally:
 *   - 18+ = acceptable
 *   - 24+ = good
 *   - 30+ = excellent
 *
 * Also includes synastry analysis: planet-to-planet house relationships.
 */

import type { ChartResponse, PlanetPosition } from "./api";

// ---------------------------------------------------------------------------
// Nakshatra data needed for Guna matching
// ---------------------------------------------------------------------------
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Nakshatra → Varna (caste): 1=Brahmin, 2=Kshatriya, 3=Vaishya, 4=Shudra
const NAKSHATRA_VARNA = [
  1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3,
];

// Nakshatra → Vashya group: 0=Chatushpada, 1=Manava, 2=Jalachara, 3=Vanachara, 4=Keeta
const RASHI_VASHYA = [
  0, 0, 1, 2, 0, 1, 1, 4, 2, 1, 1, 1, // Aries-Pisces
];

// Nakshatra → Tara group (just nakshatra number mod 9)
// Nakshatra → Yoni (animal) pairs for sexual compatibility
const NAKSHATRA_YONI: [string, "M" | "F"][] = [
  ["Horse", "M"], ["Elephant", "M"], ["Sheep", "F"], ["Serpent", "M"],
  ["Serpent", "F"], ["Dog", "F"], ["Cat", "F"], ["Sheep", "M"],
  ["Cat", "M"], ["Rat", "M"], ["Rat", "F"], ["Cow", "M"],
  ["Buffalo", "F"], ["Tiger", "F"], ["Buffalo", "M"], ["Tiger", "M"],
  ["Deer", "F"], ["Deer", "M"], ["Dog", "M"], ["Monkey", "M"],
  ["Mongoose", "M"], ["Monkey", "F"], ["Lion", "M"], ["Horse", "F"],
  ["Lion", "F"], ["Cow", "F"], ["Elephant", "F"],
];

// Enemy yoni pairs
const YONI_ENEMIES: [string, string][] = [
  ["Horse", "Buffalo"], ["Elephant", "Lion"], ["Sheep", "Monkey"],
  ["Serpent", "Mongoose"], ["Dog", "Deer"], ["Cat", "Rat"],
  ["Cow", "Tiger"],
];

// Nakshatra → Gana: 0=Deva, 1=Manushya, 2=Rakshasa
const NAKSHATRA_GANA = [
  0, 1, 2, 0, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
];

// Rashi → Graha Maitri lord: Su=0, Mo=1, Ma=2, Me=3, Ju=4, Ve=5, Sa=6
const RASHI_LORD = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
const LORD_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// Graha Maitri friendship table (lord index → lord index → relationship)
// 2=friend, 1=neutral, 0=enemy
const FRIENDSHIP: number[][] = [
  // Su  Mo  Ma  Me  Ju  Ve  Sa
  [  1,  2,  2,  0,  2,  0,  0 ], // Sun
  [  2,  1,  1,  2,  1,  1,  1 ], // Moon
  [  2,  2,  1,  0,  2,  0,  0 ], // Mars
  [  2,  1,  0,  1,  1,  2,  0 ], // Mercury
  [  2,  2,  2,  1,  1,  0,  0 ], // Jupiter
  [  0,  1,  0,  2,  1,  1,  2 ], // Venus
  [  0,  1,  0,  2,  0,  2,  1 ], // Saturn
];

// Rashi → Nadi: 0=Aadi, 1=Madhya, 2=Antya
const NAKSHATRA_NADI = [
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2,
];

// ---------------------------------------------------------------------------
// Koot scoring functions
// ---------------------------------------------------------------------------
export interface KootScore {
  name: string;
  maxPoints: number;
  score: number;
  description: string;
}

/**
 * One item in a classical qualitative checklist.
 * Status is derived directly from classical rules — no invented point weights.
 * Used for business partner and sibling relationship types.
 */
export interface ChecklistItem {
  name: string;
  /** green = favourable, amber = mixed/caution, red = risk indicator present */
  status: "green" | "amber" | "red";
  /** Short label shown inline, e.g. "Strong", "Mixed", "High risk" */
  label: string;
  description: string;
  /** The classical text this rule comes from */
  source: string;
}

export interface CompatibilityResult {
  person1: { name: string; moonRashi: string; moonNakshatra: string; lagna: string };
  person2: { name: string; moonRashi: string; moonNakshatra: string; lagna: string };
  relationship: string;
  koots: KootScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  verdict: string;
  verdictColor: string;
  synastry: SynastryAspect[];
  summary: string;
  /**
   * Qualitative classical rule checklist — no invented weights.
   * Present for: business partner (8 items), sibling (6 items).
   * Absent for: romantic (full Ashtakoot is authentic), friend/parent/child/other
   * (only Graha Maitri is classically applicable to these).
   */
  checklist?: ChecklistItem[];
  /**
   * For friend/parent/child/other — explains why only Graha Maitri is scored.
   * Absent for relationship types with a full classical framework.
   */
  classicalNote?: string;
}

export interface SynastryAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  nature: "harmonious" | "challenging" | "neutral";
  description: string;
}

function getMoonNakshatraIndex(chart: ChartResponse): number {
  const moonP = chart.planets.find(p => p.name === "Moon");
  if (!moonP) return 0;
  const idx = NAKSHATRAS.indexOf(moonP.nakshatra);
  return idx >= 0 ? idx : 0;
}

function getMoonRashiIndex(chart: ChartResponse): number {
  const moonP = chart.planets.find(p => p.name === "Moon");
  if (!moonP) return 0;
  return (moonP.rashi_num - 1);
}

// 1. Varna Koot (1 point) — spiritual compatibility
function scoreVarna(nak1: number, nak2: number): KootScore {
  const v1 = NAKSHATRA_VARNA[nak1];
  const v2 = NAKSHATRA_VARNA[nak2];
  // Boy's varna >= girl's varna (or we just check closeness for general use)
  const score = v1 >= v2 ? 1 : 0;
  return {
    name: "Varna",
    maxPoints: 1,
    score,
    description: score === 1
      ? "Spiritual and ego compatibility is harmonious. Both individuals operate at compatible levels of consciousness."
      : "Some friction in spiritual outlook and ego expression. Different approaches to life's deeper questions may require understanding.",
  };
}

// 2. Vashya Koot (2 points) — mutual attraction / dominance
function scoreVashya(rashi1: number, rashi2: number): KootScore {
  const v1 = RASHI_VASHYA[rashi1];
  const v2 = RASHI_VASHYA[rashi2];
  let score = 0;
  if (v1 === v2) score = 2;
  else if ((v1 === 1 && v2 !== 4) || (v2 === 1 && v1 !== 4)) score = 1;
  else score = 0;
  return {
    name: "Vashya",
    maxPoints: 2,
    score,
    description: score === 2
      ? "Strong mutual attraction and natural influence over each other. The relationship flows with ease and mutual respect."
      : score === 1
      ? "Moderate attraction. One person may have more influence in the relationship, but balance is achievable."
      : "Weak natural attraction. The relationship requires conscious effort to maintain mutual interest and respect.",
  };
}

// 3. Tara Koot (3 points) — destiny compatibility
function scoreTara(nak1: number, nak2: number): KootScore {
  const diff = ((nak2 - nak1 + 27) % 27);
  const tara = (diff % 9) + 1;
  // Favorable taras: 1(Janma), 2(Sampat), 4(Kshema), 6(Sadhana), 8(Mitra), 9(Parama Mitra)
  const favorable = [1, 2, 4, 6, 8, 9].includes(tara);
  const score = favorable ? 3 : 0;
  return {
    name: "Tara",
    maxPoints: 3,
    score,
    description: score === 3
      ? "Excellent destiny compatibility. Life events and fortune align naturally, supporting each other's growth and well-being."
      : "Destiny patterns may create friction. Some life phases may be challenging together, requiring patience and mutual support.",
  };
}

// 4. Yoni Koot (4 points) — physical/sexual compatibility
function scoreYoni(nak1: number, nak2: number): KootScore {
  const [animal1] = NAKSHATRA_YONI[nak1];
  const [animal2] = NAKSHATRA_YONI[nak2];
  let score = 0;
  if (animal1 === animal2) {
    score = 4;
  } else {
    const isEnemy = YONI_ENEMIES.some(
      ([a, b]) => (a === animal1 && b === animal2) || (b === animal1 && a === animal2)
    );
    score = isEnemy ? 0 : 2;
  }
  return {
    name: "Yoni",
    maxPoints: 4,
    score,
    description: score === 4
      ? "Excellent physical and temperamental compatibility. Natural understanding of each other's needs and instincts."
      : score >= 2
      ? "Moderate physical compatibility. Different temperaments but no fundamental conflict. Adjustment leads to harmony."
      : "Challenging physical compatibility. Fundamentally different instincts and temperaments require conscious effort to bridge.",
  };
}

// 5. Graha Maitri (5 points) — mental compatibility (Moon sign lords)
function scoreGrahaMaitri(rashi1: number, rashi2: number): KootScore {
  const lord1 = RASHI_LORD[rashi1];
  const lord2 = RASHI_LORD[rashi2];
  const f1 = FRIENDSHIP[lord1][lord2];
  const f2 = FRIENDSHIP[lord2][lord1];
  const sum = f1 + f2;
  let score = 0;
  if (sum >= 4) score = 5; // both friends
  else if (sum === 3) score = 4; // one friend, one neutral
  else if (sum === 2) score = 2; // both neutral or one friend one enemy
  else score = 0; // enemy involved
  return {
    name: "Graha Maitri",
    maxPoints: 5,
    score,
    description: score >= 4
      ? `Moon sign lords (${LORD_NAMES[lord1]} & ${LORD_NAMES[lord2]}) are friendly — excellent mental wavelength compatibility. Thinking patterns and emotional responses naturally harmonize.`
      : score >= 2
      ? `Moon sign lords (${LORD_NAMES[lord1]} & ${LORD_NAMES[lord2]}) are neutral — adequate mental compatibility. Communication requires some conscious effort but no fundamental barriers.`
      : `Moon sign lords (${LORD_NAMES[lord1]} & ${LORD_NAMES[lord2]}) are inimical — mental wavelengths differ significantly. Misunderstandings are likely without active, empathetic communication.`,
  };
}

// 6. Gana Koot (6 points) — temperament
function scoreGana(nak1: number, nak2: number): KootScore {
  const g1 = NAKSHATRA_GANA[nak1];
  const g2 = NAKSHATRA_GANA[nak2];
  const gNames = ["Deva (divine)", "Manushya (human)", "Rakshasa (intense)"];
  let score = 0;
  if (g1 === g2) score = 6;
  else if ((g1 === 0 && g2 === 1) || (g1 === 1 && g2 === 0)) score = 5;
  else if ((g1 === 1 && g2 === 2) || (g1 === 2 && g2 === 1)) score = 1;
  else score = 0; // Deva-Rakshasa
  return {
    name: "Gana",
    maxPoints: 6,
    score,
    description: score >= 5
      ? `Both have compatible temperaments (${gNames[g1]} & ${gNames[g2]}). Natural emotional understanding and shared approach to life's pleasures and challenges.`
      : score >= 1
      ? `Different temperaments (${gNames[g1]} & ${gNames[g2]}). One is gentler, the other more intense — this can be complementary with mutual respect.`
      : `Opposing temperaments (${gNames[g1]} & ${gNames[g2]}). Fundamental differences in emotional expression and life approach. Requires significant compromise and understanding.`,
  };
}

// 7. Bhakoot Koot (7 points) — emotional compatibility & prosperity
function scoreBhakoot(rashi1: number, rashi2: number): KootScore {
  const diff = ((rashi2 - rashi1 + 12) % 12) + 1;
  const revDiff = ((rashi1 - rashi2 + 12) % 12) + 1;
  // Unfavorable: 2/12, 5/9, 6/8
  const bad = (
    (diff === 2 || diff === 12) ||
    (diff === 6 || diff === 8) ||
    (diff === 5 || diff === 9)
  );
  const score = bad ? 0 : 7;
  return {
    name: "Bhakoot",
    maxPoints: 7,
    score,
    description: score === 7
      ? `Moon signs are in a harmonious relationship (${RASHI_NAMES[rashi1]} & ${RASHI_NAMES[rashi2]}). This supports emotional bonding, shared prosperity, and mutual well-being.`
      : `Moon signs form a ${diff}/${revDiff} axis (${RASHI_NAMES[rashi1]} & ${RASHI_NAMES[rashi2]}) — traditionally challenging for emotional harmony and shared finances. Awareness and effort can mitigate this.`,
  };
}

// 8. Nadi Koot (8 points) — health & genetic compatibility
function scoreNadi(nak1: number, nak2: number): KootScore {
  const n1 = NAKSHATRA_NADI[nak1];
  const n2 = NAKSHATRA_NADI[nak2];
  const nNames = ["Aadi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"];
  const score = n1 !== n2 ? 8 : 0;
  return {
    name: "Nadi",
    maxPoints: 8,
    score,
    description: score === 8
      ? `Different Nadis (${nNames[n1]} & ${nNames[n2]}) — excellent health compatibility. Children's health and genetic vitality are well-supported. Physical constitutions complement each other.`
      : `Same Nadi (${nNames[n1]}) — this is the most critical dosha in matching. Same Nadi can indicate health challenges for offspring and constitutional imbalance. Nadi Dosha remedies are recommended if other scores are strong.`,
  };
}

// ---------------------------------------------------------------------------
// Sibling-specific scoring dimensions
// ---------------------------------------------------------------------------

const BENEFICS = ["Jupiter", "Venus"];
const MALEFICS_3H = ["Saturn", "Rahu", "Ketu"]; // malefics that specifically harm 3rd house

/** Helper: classify a house distance as harmonious/neutral/challenging for siblings */
function siblingHouseNature(houseDiff: number): "good" | "neutral" | "bad" {
  if ([1, 3, 5, 9, 11].includes(houseDiff)) return "good";
  if ([6, 8, 12].includes(houseDiff)) return "bad";
  return "neutral";
}

/**
 * 1. Sahaja Bhava (3rd House) Strength — 5 points
 * Evaluates each person's 3rd house: benefics in it, lord strength, malefic affliction.
 * Averaged across both charts.
 */
function scoreSahajaBhava(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluate3rdHouse(chart: ChartResponse): number {
    const house3 = chart.houses.find(h => h.house_num === 3);
    if (!house3) return 2; // neutral fallback
    let pts = 2; // baseline

    // Benefics in 3rd house: +1 each (max +2)
    const occupants = house3.occupants || [];
    const beneficCount = occupants.filter(p => BENEFICS.includes(p)).length;
    pts += Math.min(beneficCount, 2);

    // Malefics in 3rd house: -1 each
    const maleficCount = occupants.filter(p => MALEFICS_3H.includes(p)).length;
    pts -= maleficCount;

    // 3rd lord dignity
    const lord3Planet = chart.planets.find(p => p.name === house3.lord);
    if (lord3Planet) {
      if (lord3Planet.dignity === "exalted" || lord3Planet.dignity === "own" || lord3Planet.dignity === "mooltrikona") {
        pts += 1;
      } else if (lord3Planet.dignity === "debilitated") {
        pts -= 1;
      }
      // 3rd lord in dusthana (6/8/12) = strained
      if ([6, 8, 12].includes(lord3Planet.house)) pts -= 1;
      // 3rd lord in 1st = strong bond indicator
      if (lord3Planet.house === 1) pts += 1;
    }

    return Math.max(0, Math.min(5, pts));
  }

  const score1 = evaluate3rdHouse(chart1);
  const score2 = evaluate3rdHouse(chart2);
  const score = Math.round((score1 + score2) / 2);

  return {
    name: "Sahaja Bhava",
    maxPoints: 5,
    score,
    description: score >= 4
      ? "Both charts show strong 3rd houses with benefic support — the foundation for sibling bonding is naturally strong. Mutual courage, support, and easy communication."
      : score >= 2
      ? "Mixed 3rd house indications. Some natural affinity exists, but certain planetary influences may create occasional friction or distance between siblings."
      : "Challenging 3rd house placements in one or both charts. Malefic influences on the sibling house suggest karmic lessons in patience, communication, and understanding.",
  };
}

/**
 * 2. Mars Karaka Harmony — 4 points
 * Mars is the primary karaka for siblings. Compare Mars-to-Mars house
 * relationship between charts + Mars dignity.
 */
function scoreMarsKaraka(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  const mars1 = chart1.planets.find(p => p.name === "Mars");
  const mars2 = chart2.planets.find(p => p.name === "Mars");
  if (!mars1 || !mars2) return { name: "Mars Karaka", maxPoints: 4, score: 2, description: "Mars data unavailable — using neutral score." };

  let score = 0;

  // Mars-to-Mars house relationship (0-2 pts)
  const houseDiff = ((mars2.rashi_num - mars1.rashi_num + 12) % 12) + 1;
  const nature = siblingHouseNature(houseDiff);
  if (nature === "good") score += 2;
  else if (nature === "neutral") score += 1;

  // Mars dignity in each chart (0-2 pts, 1 per chart)
  for (const mars of [mars1, mars2]) {
    if (mars.dignity === "exalted" || mars.dignity === "own" || mars.dignity === "mooltrikona") {
      score += 1;
    }
    // Debilitated Mars: no point but no penalty (already 0)
  }

  return {
    name: "Mars Karaka",
    maxPoints: 4,
    score: Math.min(4, score),
    description: score >= 3
      ? `Mars (sibling karaka) is well-placed in both charts and harmoniously connected (${houseDiff}th from each other). Strong protective instinct and natural loyalty between siblings.`
      : score >= 2
      ? `Mars shows moderate harmony between the charts. The sibling bond has a solid foundation but may need conscious effort during competitive or stressful periods.`
      : `Mars placements create friction — the sibling karaka is either weak or in a challenging cross-chart position. Rivalry and ego clashes may surface, requiring patience.`,
  };
}

/**
 * 3. Moon Axis Compatibility — 4 points
 * Moon-to-Moon house position determines emotional resonance.
 * 3/5/9/11 = full, 1/2/4/7/10 = partial, 6/8/12 = 0
 */
function scoreMoonAxis(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  const moon1 = chart1.planets.find(p => p.name === "Moon");
  const moon2 = chart2.planets.find(p => p.name === "Moon");
  if (!moon1 || !moon2) return { name: "Moon Axis", maxPoints: 4, score: 2, description: "Moon data unavailable." };

  const houseDiff = ((moon2.rashi_num - moon1.rashi_num + 12) % 12) + 1;
  let score = 0;
  let quality = "";

  if ([3, 5, 9, 11].includes(houseDiff)) {
    score = 4;
    quality = "ideal sibling position";
  } else if ([1].includes(houseDiff)) {
    score = 3;
    quality = "same sign — deep emotional mirror";
  } else if ([2, 4, 7, 10].includes(houseDiff)) {
    score = 2;
    quality = "moderate emotional connection";
  } else {
    // 6, 8, 12
    score = 0;
    quality = "challenging emotional axis";
  }

  return {
    name: "Moon Axis",
    maxPoints: 4,
    score,
    description: score >= 3
      ? `Moons are in the ${houseDiff}th from each other (${quality}) — emotional wavelengths align naturally. Siblings intuitively understand each other's moods and needs.`
      : score >= 2
      ? `Moons are in the ${houseDiff}th from each other (${quality}). Emotional understanding exists but requires effort — different emotional rhythms that can complement with awareness.`
      : `Moons are in the ${houseDiff}th from each other (${quality}). Emotional misunderstandings are likely — what soothes one may irritate the other. Empathy and space are key.`,
  };
}

/**
 * 4. 3rd Lord Cross-Chart — 3 points
 * Where Person A's 3rd lord falls in Person B's chart (by rashi) and vice versa.
 * If it lands in a supportive house (1/3/5/9/11), that's positive.
 */
function score3rdLordCrossChart(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function get3rdLord(chart: ChartResponse): PlanetPosition | undefined {
    const house3 = chart.houses.find(h => h.house_num === 3);
    if (!house3) return undefined;
    return chart.planets.find(p => p.name === house3.lord);
  }

  const lord3_A = get3rdLord(chart1);
  const lord3_B = get3rdLord(chart2);

  if (!lord3_A || !lord3_B) return { name: "3rd Lord Link", maxPoints: 3, score: 1, description: "Insufficient data for cross-chart 3rd lord analysis." };

  let score = 0;
  const details: string[] = [];

  // Where A's 3rd lord rashi falls relative to B's lagna
  const moon_B = chart2.planets.find(p => p.name === "Moon");
  const moon_A = chart1.planets.find(p => p.name === "Moon");

  // Check A's 3rd lord vs B's Moon sign (house distance)
  if (moon_B) {
    const diff = ((lord3_A.rashi_num - moon_B.rashi_num + 12) % 12) + 1;
    if ([1, 3, 5, 9, 11].includes(diff)) {
      score += 1.5;
      details.push(`Person 1's 3rd lord connects favourably to Person 2's Moon`);
    } else if ([6, 8, 12].includes(diff)) {
      details.push(`Person 1's 3rd lord is in a tense position relative to Person 2's Moon`);
    } else {
      score += 0.5;
    }
  }

  // Check B's 3rd lord vs A's Moon sign
  if (moon_A) {
    const diff = ((lord3_B.rashi_num - moon_A.rashi_num + 12) % 12) + 1;
    if ([1, 3, 5, 9, 11].includes(diff)) {
      score += 1.5;
      details.push(`Person 2's 3rd lord connects favourably to Person 1's Moon`);
    } else if ([6, 8, 12].includes(diff)) {
      details.push(`Person 2's 3rd lord is in a tense position relative to Person 1's Moon`);
    } else {
      score += 0.5;
    }
  }

  const finalScore = Math.min(3, Math.round(score));

  return {
    name: "3rd Lord Link",
    maxPoints: 3,
    score: finalScore,
    description: finalScore >= 2
      ? `The 3rd lords (sibling significators) connect positively across both charts. ${details.join(". ")}. This creates a natural bridge — each person's sibling house "reaches" the other's emotional core.`
      : finalScore >= 1
      ? `Partial cross-chart connection between 3rd lords. ${details.length ? details.join(". ") + "." : ""} The sibling bond exists but the charts don't strongly reinforce each other's sibling houses.`
      : `The 3rd lords fall in difficult positions relative to each other's charts. ${details.length ? details.join(". ") + "." : ""} The sibling connection requires more conscious nurturing.`,
  };
}

/**
 * 5. Communication Bond (Mercury) — 3 points
 * Mercury governs communication between siblings (especially sisters).
 * Mercury-to-Mercury house relationship + Mercury condition.
 */
function scoreMercuryBond(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  const merc1 = chart1.planets.find(p => p.name === "Mercury");
  const merc2 = chart2.planets.find(p => p.name === "Mercury");
  if (!merc1 || !merc2) return { name: "Communication", maxPoints: 3, score: 1, description: "Mercury data unavailable." };

  let score = 0;

  // Mercury-to-Mercury house relationship (0-2 pts)
  const houseDiff = ((merc2.rashi_num - merc1.rashi_num + 12) % 12) + 1;
  const nature = siblingHouseNature(houseDiff);
  if (nature === "good") score += 2;
  else if (nature === "neutral") score += 1;

  // Mercury dignity bonus (best of both, 0-1 pt)
  const anyStrong = [merc1, merc2].some(m =>
    m.dignity === "exalted" || m.dignity === "own" || m.dignity === "mooltrikona"
  );
  if (anyStrong) score += 1;

  return {
    name: "Communication",
    maxPoints: 3,
    score: Math.min(3, score),
    description: score >= 2
      ? `Mercury (communication karaka) is harmoniously linked across both charts (${houseDiff}th from each other). Siblings communicate easily, resolve misunderstandings quickly, and enjoy intellectual rapport.`
      : score >= 1
      ? `Mercury shows a moderate communication link. Conversations flow in familiar topics but can stall on sensitive matters — active listening strengthens the bond.`
      : `Mercury placements suggest communication gaps. Misinterpretation and assumptions may cause unnecessary friction — written or structured communication may help.`,
  };
}

/**
 * 6. 11th House Support — 3 points
 * The 11th house represents elder siblings and gains through siblings.
 * Evaluates both charts' 11th house condition.
 */
function score11thHouseSupport(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluate11th(chart: ChartResponse): number {
    const house11 = chart.houses.find(h => h.house_num === 11);
    if (!house11) return 1;
    let pts = 1; // baseline

    const occupants = house11.occupants || [];
    // Benefics in 11th: +1
    if (occupants.some(p => BENEFICS.includes(p))) pts += 1;
    // Jupiter in 11th is especially good (native is eldest / protective)
    if (occupants.includes("Jupiter")) pts += 0.5;

    // Malefics alone in 11th: reduced gains from siblings
    if (occupants.some(p => MALEFICS_3H.includes(p)) && !occupants.some(p => BENEFICS.includes(p))) {
      pts -= 1;
    }

    // 11th lord dignity
    const lord11 = chart.planets.find(p => p.name === house11.lord);
    if (lord11) {
      if (lord11.dignity === "exalted" || lord11.dignity === "own" || lord11.dignity === "mooltrikona") pts += 0.5;
      if (lord11.dignity === "debilitated") pts -= 0.5;
    }

    return Math.max(0, Math.min(3, pts));
  }

  const s1 = evaluate11th(chart1);
  const s2 = evaluate11th(chart2);
  const score = Math.min(3, Math.round((s1 + s2) / 2));

  return {
    name: "11th House Support",
    maxPoints: 3,
    score,
    description: score >= 2
      ? "Both charts show strong 11th houses — gains through siblings are indicated. The elder-younger dynamic is supportive, with mutual benefit and generosity flowing naturally."
      : score >= 1
      ? "Moderate 11th house indications. Siblings can support each other but the dynamic may be uneven — one sibling may give more than they receive at times."
      : "Weak 11th house conditions suggest limited material or practical support between siblings. The bond may be more emotional than tangible.",
  };
}

// ---------------------------------------------------------------------------
// Business Partner-specific scoring dimensions
// (Classical sources: BPHS, Phaladeepika, Uttara Kalamrita, Jaimini Sutras)
// ---------------------------------------------------------------------------

const BENEFICS_7H = ["Jupiter", "Venus", "Mercury"];
// Sun included per Phaladeepika: ego-clashes in 7th harm partnerships
const MALEFICS_7H = ["Mars", "Saturn", "Rahu", "Sun"];

/** Get 0-based rashi index of a chart's lagna (for house-position arithmetic) */
function getLagnaRashiIndex(chart: ChartResponse): number {
  const idx = RASHI_NAMES.indexOf(chart.lagna);
  return idx >= 0 ? idx : 0;
}

/** Fetch the planet object that rules a given house number */
function getHouseLordPlanet(chart: ChartResponse, houseNum: number): PlanetPosition | undefined {
  const house = chart.houses.find(h => h.house_num === houseNum);
  if (!house) return undefined;
  return chart.planets.find(p => p.name === house.lord);
}

/**
 * 1. 7th House (Partnership House) Strength — 5 points
 *
 * Classical basis: BPHS Chapters 18-20 (Yuvati Bhava); Phaladeepika Ch. 10.
 * A strong 7th house with benefic support and a dignified 7th lord indicates
 * natural aptitude for successful partnerships. Malefics in the 7th — Mars,
 * Saturn, Rahu, Sun — create conflict, rigidity, or ego-clashes (per BPHS).
 * 7th lord in dusthana (6/8/12) strains the partnership; in 10th/11th it
 * channels partnership energy directly into career and gains.
 */
function score7thHouseStrength(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluate7th(chart: ChartResponse): number {
    const house7 = chart.houses.find(h => h.house_num === 7);
    if (!house7) return 2;
    let pts = 2; // baseline

    const occupants = house7.occupants || [];
    const beneficCount = occupants.filter(p => BENEFICS_7H.includes(p)).length;
    pts += Math.min(beneficCount, 2) * 0.5;
    const maleficCount = occupants.filter(p => MALEFICS_7H.includes(p)).length;
    pts -= maleficCount * 0.5;

    const lord7 = chart.planets.find(p => p.name === house7.lord);
    if (lord7) {
      if (["exalted", "own", "mooltrikona"].includes(lord7.dignity ?? "")) pts += 1;
      else if (lord7.dignity === "debilitated") pts -= 1;
      if ([6, 8, 12].includes(lord7.house)) pts -= 0.75; // dusthana = strained
      if ([10, 11].includes(lord7.house)) pts += 0.75;   // 10th/11th = career/gains via partnership
      if (lord7.house === 7) pts += 0.5;                 // own house = stable
    }
    return Math.max(0, Math.min(5, pts));
  }

  const s1 = evaluate7th(chart1);
  const s2 = evaluate7th(chart2);
  const score = Math.min(5, Math.round((s1 + s2) / 2));

  return {
    name: "7th House (Partnership)",
    maxPoints: 5,
    score,
    description: score >= 4
      ? "Both charts show strong 7th houses — the partnership house carries benefic support and a dignified 7th lord. Per BPHS, this indicates that both individuals are naturally inclined to successful, harmonious partnerships. A solid classical foundation."
      : score >= 2
      ? "Mixed 7th house conditions. One or both charts carry planetary challenges in the partnership house. Awareness of specific friction points and clear roles will help the partnership thrive."
      : "Weak 7th house conditions in one or both charts. Malefic influence in the partnership house suggests conflicts, power imbalances, or hidden tensions. Formal legal agreements and defined responsibilities are strongly advisable before committing.",
  };
}

/**
 * 2. Mercury Alignment (Commerce Karaka) — 4 points
 *
 * Classical basis: BPHS — Mercury is the Vyapara Karaka (significator of
 * trade, commerce, accounting, and negotiations). Mercury-to-Mercury house
 * relationship governs how the two partners' business minds connect — whether
 * negotiations, contracts, and financial discussions flow naturally or clash.
 * Trine (1/5/9) and the 11th (gains) are most favourable.
 */
function scoreMercuryAlignmentBusiness(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  const merc1 = chart1.planets.find(p => p.name === "Mercury");
  const merc2 = chart2.planets.find(p => p.name === "Mercury");
  if (!merc1 || !merc2) {
    return { name: "Mercury (Commerce)", maxPoints: 4, score: 2, description: "Mercury data unavailable — neutral score applied." };
  }

  let score = 0;
  const houseDiff = ((merc2.rashi_num - merc1.rashi_num + 12) % 12) + 1;

  if ([1, 5, 9, 11].includes(houseDiff)) score += 2;      // trine / gains axis
  else if ([2, 3, 10].includes(houseDiff)) score += 1;    // supportive

  const anyStrong = [merc1, merc2].some(m => ["exalted", "own", "mooltrikona"].includes(m.dignity ?? ""));
  if (anyStrong) score += 1;
  const bothStrong = [merc1, merc2].every(m => ["exalted", "own", "mooltrikona"].includes(m.dignity ?? ""));
  if (bothStrong) score += 1;

  return {
    name: "Mercury (Commerce)",
    maxPoints: 4,
    score: Math.min(4, score),
    description: score >= 3
      ? `Mercury (Vyapara Karaka per BPHS) is well-aligned between both charts (${houseDiff}th from each other). Business communication, negotiation, and financial thinking flow naturally. Contracts and commercial discussions will be productive territory for this partnership.`
      : score >= 2
      ? `Mercury shows moderate alignment (${houseDiff}th position). Business communication generally works but may hit friction in complex negotiations or financial discussions. Written agreements and clearly documented terms are recommended.`
      : `Mercury alignment is weak (${houseDiff}th position). Significant differences in commercial thinking and communication style. Assign clear separate roles aligned to each partner's strengths; avoid verbal-only agreements.`,
  };
}

/**
 * 3. 11th House Gains (Labha Bhava) — 4 points
 *
 * Classical basis: BPHS and Saravali — the 11th house governs income,
 * gains, and fulfilment of ambitions through partnerships and collaborations.
 * Strong 11th houses in both charts, especially with Jupiter (its karaka),
 * indicate the partnership can generate lasting and growing income.
 * If the 11th lord sits in the 7th, gains come specifically through
 * partnerships — an excellent classical indicator for joint ventures.
 */
function score11thHouseGains(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluate11th(chart: ChartResponse): number {
    const house11 = chart.houses.find(h => h.house_num === 11);
    if (!house11) return 1;
    let pts = 1;

    const occupants = house11.occupants || [];
    if (occupants.some(p => BENEFICS_7H.includes(p))) pts += 1;
    if (occupants.includes("Jupiter")) pts += 0.5;
    if (occupants.some(p => MALEFICS_7H.includes(p)) && !occupants.some(p => BENEFICS_7H.includes(p))) {
      pts -= 0.5;
    }

    const lord11 = chart.planets.find(p => p.name === house11.lord);
    if (lord11) {
      if (["exalted", "own", "mooltrikona"].includes(lord11.dignity ?? "")) pts += 0.5;
      if (lord11.dignity === "debilitated") pts -= 0.5;
      if (lord11.house === 7) pts += 0.5;  // 11th lord in 7th = gains specifically via partnerships
      if (lord11.house === 2) pts += 0.25; // 11th lord in 2nd = gains flow into wealth
    }
    return Math.max(0, Math.min(4, pts));
  }

  const s1 = evaluate11th(chart1);
  const s2 = evaluate11th(chart2);
  const score = Math.min(4, Math.round((s1 + s2) / 2));

  return {
    name: "11th House (Gains)",
    maxPoints: 4,
    score,
    description: score >= 3
      ? "Both charts show strong Labha Bhava (11th house) — gains, income, and fulfilment of ambitions through joint ventures are well-supported. Per BPHS, this is a strong foundation for financial success in a partnership. The venture has genuine earning potential."
      : score >= 2
      ? "Moderate 11th house conditions. Partnership gains are possible but may require sustained effort. One partner may generate more income — equitable financial arrangements should be agreed upfront."
      : "Weak 11th house conditions in one or both charts. Material returns from this specific partnership may be limited or delayed. Consider whether the venture is more rewarding experientially than financially.",
  };
}

/**
 * 4. 7th Lord Cross-Chart Placement — 4 points
 *
 * Classical basis: Bhavat Bhavam principle (Uttara Kalamrita) and
 * Graha Maitri synastry analysis. Where Person A's 7th lord's rashi falls
 * in Person B's house system shows how A's "partnership energy" resonates
 * with B's chart. If it lands in B's 1st/7th/10th/11th houses — the four
 * most powerful positions for business — it is a strong indicator of mutual
 * reinforcement. Applied in both directions and combined.
 */
function score7thLordCrossChart(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function get7thLord(chart: ChartResponse): PlanetPosition | undefined {
    return getHouseLordPlanet(chart, 7);
  }

  const lord7_A = get7thLord(chart1);
  const lord7_B = get7thLord(chart2);
  const lagnaB0 = getLagnaRashiIndex(chart2);
  const lagnaA0 = getLagnaRashiIndex(chart1);

  let score = 0;
  const details: string[] = [];

  if (lord7_A) {
    const rashi0 = lord7_A.rashi_num - 1;
    const houseInB = ((rashi0 - lagnaB0 + 12) % 12) + 1;
    if ([1, 7, 10, 11].includes(houseInB)) {
      score += 2;
      details.push(`Person 1's 7th lord activates house ${houseInB} of Person 2's chart (strongly supportive)`);
    } else if ([2, 5, 9].includes(houseInB)) {
      score += 1;
      details.push(`Person 1's 7th lord activates house ${houseInB} of Person 2's chart (supportive)`);
    } else if ([6, 8, 12].includes(houseInB)) {
      details.push(`Person 1's 7th lord falls in house ${houseInB} of Person 2's chart (challenging)`);
    } else {
      score += 0.5;
    }
  }

  if (lord7_B) {
    const rashi0 = lord7_B.rashi_num - 1;
    const houseInA = ((rashi0 - lagnaA0 + 12) % 12) + 1;
    if ([1, 7, 10, 11].includes(houseInA)) {
      score += 2;
      details.push(`Person 2's 7th lord activates house ${houseInA} of Person 1's chart (strongly supportive)`);
    } else if ([2, 5, 9].includes(houseInA)) {
      score += 1;
      details.push(`Person 2's 7th lord activates house ${houseInA} of Person 1's chart (supportive)`);
    } else if ([6, 8, 12].includes(houseInA)) {
      details.push(`Person 2's 7th lord falls in house ${houseInA} of Person 1's chart (challenging)`);
    } else {
      score += 0.5;
    }
  }

  const finalScore = Math.min(4, Math.round(score));

  return {
    name: "7th Lord Cross-Chart",
    maxPoints: 4,
    score: finalScore,
    description: finalScore >= 3
      ? `The 7th lords (partnership significators) are mutually supportive across both charts. ${details.join(". ")}. Each person's partnership energy strengthens the other's chart — a classical indicator of a productive business alliance per the Bhavat Bhavam principle.`
      : finalScore >= 2
      ? `Partial cross-chart 7th lord support. ${details.length ? details.join(". ") + "." : ""} The partnership connection is present but asymmetric. One partner may naturally drive the venture more — assign that person the primary business development role.`
      : `The 7th lords create tension across the charts. ${details.length ? details.join(". ") + "." : ""} Formal agreements, defined roles, and periodic review of the partnership terms are strongly advisable.`,
  };
}

/**
 * 5. Career-Partnership Connection (10th-7th Lord Link) — 3 points
 *
 * Classical basis: BPHS — when the 7th lord and 10th lord are connected
 * in a chart (conjunction, mutual full aspect, or one in the other's house),
 * the native's karma/profession (10th) is fulfilled through partnerships (7th).
 * This is the classical indicator that someone is suited for partnership-based
 * business rather than solo enterprise. Evaluated per chart; 1.5 pts each.
 */
function score10th7thConnection(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluateConnection(chart: ChartResponse): number {
    const lord7 = getHouseLordPlanet(chart, 7);
    const lord10 = getHouseLordPlanet(chart, 10);
    if (!lord7 || !lord10) return 0.5;

    // Conjunction: same rashi
    if (lord7.rashi_num === lord10.rashi_num) return 1.5;
    // 7th lord sitting in 10th house, or 10th lord sitting in 7th house
    if (lord7.house === 10 || lord10.house === 7) return 1.5;
    // Full mutual aspect (7th from each other)
    const diff = ((lord10.rashi_num - lord7.rashi_num + 12) % 12) + 1;
    if (diff === 7) return 1.5;
    // Trine: supporting but not direct
    if ([1, 5, 9].includes(diff)) return 0.75;
    return 0;
  }

  const s1 = evaluateConnection(chart1);
  const s2 = evaluateConnection(chart2);
  const score = Math.min(3, Math.round(s1 + s2));

  return {
    name: "Career-Partnership Link",
    maxPoints: 3,
    score,
    description: score >= 2
      ? "Strong 7th-10th lord connection in one or both charts — a classical BPHS indicator that the person's karma (career) is fulfilled through partnerships. At least one partner is chart-destined for partnership-based business. An excellent base for a joint venture."
      : score >= 1
      ? "Some 7th-10th lord connection exists. At least one partner shows a chart pattern that supports business partnerships. The venture can work well with one partner taking the lead in business decisions and external relationships."
      : "Limited 7th-10th connection in both charts. Neither chart strongly indicates a partnership-oriented career path. Clear demarcation of independent roles within the venture — rather than deeply intertwined decision-making — will produce better results.",
  };
}

/**
 * 6. Jupiter Support (Dharmic Gains & Ethics) — 3 points
 *
 * Classical basis: BPHS — Jupiter is the karaka of the 11th house (gains
 * and fulfilment). Its strength determines whether partnership gains are
 * lasting and ethically obtained. Jupiter-to-Jupiter alignment shows shared
 * values and growth philosophy; Jupiter aspecting the 7th or 11th house in
 * either chart adds benefic protection to the partnership and its profits.
 */
function scoreJupiterSupport(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  const jup1 = chart1.planets.find(p => p.name === "Jupiter");
  const jup2 = chart2.planets.find(p => p.name === "Jupiter");
  if (!jup1 || !jup2) {
    return { name: "Jupiter (Growth & Ethics)", maxPoints: 3, score: 1, description: "Jupiter data unavailable — neutral score applied." };
  }

  let score = 0;
  const houseDiff = ((jup2.rashi_num - jup1.rashi_num + 12) % 12) + 1;

  if ([1, 5, 9].includes(houseDiff)) score += 1.5;       // trine = shared values
  else if ([2, 11].includes(houseDiff)) score += 1;      // upachaya = grows over time
  else if (![6, 8, 12].includes(houseDiff)) score += 0.5; // neutral

  // Jupiter's special aspects (5th, 7th, 9th from its house) hitting 7th or 11th
  for (const jup of [jup1, jup2]) {
    const aspectedHouses = [
      ((jup.house - 1 + 4) % 12) + 1,
      ((jup.house - 1 + 6) % 12) + 1,
      ((jup.house - 1 + 8) % 12) + 1,
    ];
    if (aspectedHouses.includes(7) || aspectedHouses.includes(11)) score += 0.5;
    if (["exalted", "own", "mooltrikona"].includes(jup.dignity ?? "")) score += 0.25;
  }

  const finalScore = Math.min(3, Math.round(score));

  return {
    name: "Jupiter (Growth & Ethics)",
    maxPoints: 3,
    score: finalScore,
    description: finalScore >= 2
      ? `Jupiter (karaka of gains and dharmic success per BPHS) is well-aligned between both charts (${houseDiff}th from each other). This partnership is likely to grow steadily over time and maintain ethical business practices. Shared values and a common vision for growth are natural assets.`
      : finalScore >= 1
      ? `Jupiter shows moderate alignment (${houseDiff}th position). The partnership can generate growth but may face occasional philosophical disagreements about direction, ethics, or profit distribution. Regular value-alignment conversations are advisable.`
      : `Jupiter alignment is weak (${houseDiff}th position). Risk of misaligned expectations about the partnership's purpose and ethics. Clearly define the vision, values, and financial terms in writing before committing — this protects both partners.`,
  };
}

/**
 * 7. Partnership Stability (Dissolution Risk) — 4 points
 *
 * Classical basis: BPHS & Phaladeepika — the 6th house (disputes, enemies,
 * legal battles) and 8th house (hidden things, sudden endings, joint liabilities)
 * are the two dusthanas that directly threaten 7th house partnerships.
 * When their lords occupy or aspect the 7th house, or conjoin the 7th lord,
 * they inject conflict, hidden agendas, or sudden dissolution into the partnership.
 * Parasara's rule: "Separation is indicated when the 7th lord receives aspects
 * from malefic planets" — the 6th and 8th lords are the primary malefic threats
 * to the partnership house. Evaluated per chart; Jupiter's protective aspect
 * on the 7th partially offsets this risk.
 */
function scorePartnershipStability(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluateStability(chart: ChartResponse): number {
    let pts = 2; // baseline (no interference = stable)

    const house7 = chart.houses.find(h => h.house_num === 7);
    const house6 = chart.houses.find(h => h.house_num === 6);
    const house8 = chart.houses.find(h => h.house_num === 8);
    if (!house7) return pts;

    const lord7 = chart.planets.find(p => p.name === house7.lord);
    const lord6 = house6 ? chart.planets.find(p => p.name === house6.lord) : undefined;
    const lord8 = house8 ? chart.planets.find(p => p.name === house8.lord) : undefined;

    // 8th lord in 7th: hidden liabilities, trust issues, sudden dissolution
    if (lord8 && lord8.house === 7) pts -= 1.5;
    // 6th lord in 7th: disputes, legal battles, partner becomes adversary
    if (lord6 && lord6.house === 7) pts -= 1.5;

    // 8th lord conjunct 7th lord (same rashi): subtle undermining of partnership
    if (lord8 && lord7 && lord8.rashi_num === lord7.rashi_num) pts -= 1;
    // 6th lord conjunct 7th lord: open conflict within the partnership
    if (lord6 && lord7 && lord6.rashi_num === lord7.rashi_num) pts -= 1;

    // 8th or 6th lord's 7th aspect landing on the 7th house
    for (const lord of [lord6, lord8]) {
      if (!lord) continue;
      const seventhAspectHouse = ((lord.house - 1 + 6) % 12) + 1;
      if (seventhAspectHouse === 7) pts -= 0.75;
    }

    // Jupiter aspecting 7th provides classical protective cover (partial offset)
    const jup = chart.planets.find(p => p.name === "Jupiter");
    if (jup) {
      const jupAspects = [
        ((jup.house - 1 + 4) % 12) + 1, // 5th from Jupiter
        ((jup.house - 1 + 6) % 12) + 1, // 7th from Jupiter
        ((jup.house - 1 + 8) % 12) + 1, // 9th from Jupiter
      ];
      if (jupAspects.includes(7)) pts += 0.5;
    }

    return Math.max(0, Math.min(4, pts));
  }

  const s1 = evaluateStability(chart1);
  const s2 = evaluateStability(chart2);
  const score = Math.min(4, Math.round((s1 + s2) / 2));

  return {
    name: "Partnership Stability",
    maxPoints: 4,
    score,
    description: score >= 3
      ? "Neither chart shows significant 6th or 8th lord interference with the 7th house — the classical dissolution indicators are absent or weak. The partnership is unlikely to be derailed by hidden liabilities, legal disputes, or sudden betrayals."
      : score >= 2
      ? "Some 6th or 8th lord influence on the 7th house is present in one chart. Moderate risk of disputes or hidden complications. Formal legal agreements, financial transparency, and clearly defined exit terms are recommended precautions."
      : "Significant 6th or 8th lord interference with the partnership house detected in one or both charts. Per BPHS, this is a classical indicator of hidden conflicts, trust issues, legal disputes, or sudden dissolution. Proceed only with full legal protection, transparent financial arrangements, and explicit exit clauses in the partnership deed.",
  };
}

/**
 * 8. 3rd House Initiative (Entrepreneurial Drive) — 3 points
 *
 * Classical basis: BPHS — the 3rd house (Sahaja Bhava) governs initiative,
 * courage, perseverance, and communication capacity. A business partnership
 * requires both partners to sustain effort and drive the venture forward
 * over time. A weak 3rd house (malefics, debilitated lord in dusthana)
 * signals a partner who may struggle to maintain initiative. Note: Mars in
 * the 3rd, though a natural malefic, is an exception — Mars is the karaka
 * of 3rd house courage and is actually strengthening here.
 */
function score3rdHouseInitiative(chart1: ChartResponse, chart2: ChartResponse): KootScore {
  function evaluate3rd(chart: ChartResponse): number {
    const house3 = chart.houses.find(h => h.house_num === 3);
    if (!house3) return 1;
    let pts = 1; // baseline

    const occupants = house3.occupants || [];
    const beneficCount = occupants.filter(p => BENEFICS_7H.includes(p)).length;
    pts += Math.min(beneficCount, 1) * 0.75;

    // Mars in 3rd = classical strength for courage and drive (karaka of 3rd)
    if (occupants.includes("Mars")) pts += 0.5;

    // Saturn/Rahu/Ketu in 3rd without benefic: dampens initiative
    const driveKillers = ["Saturn", "Rahu", "Ketu"];
    if (
      occupants.some(p => driveKillers.includes(p)) &&
      !occupants.some(p => BENEFICS_7H.includes(p))
    ) pts -= 0.5;

    const lord3 = chart.planets.find(p => p.name === house3.lord);
    if (lord3) {
      if (["exalted", "own", "mooltrikona"].includes(lord3.dignity ?? "")) pts += 0.75;
      else if (lord3.dignity === "debilitated") pts -= 0.5;
      if ([6, 8, 12].includes(lord3.house)) pts -= 0.5; // dusthana = weakened drive
      if (lord3.house === 10) pts += 0.25;              // initiative channeled into career
    }

    return Math.max(0, Math.min(3, pts));
  }

  const s1 = evaluate3rd(chart1);
  const s2 = evaluate3rd(chart2);
  const score = Math.min(3, Math.round((s1 + s2) / 2));

  return {
    name: "3rd House Initiative",
    maxPoints: 3,
    score,
    description: score >= 2
      ? "Both charts show strong 3rd houses — both partners have the initiative, courage, and communication capacity to sustain a business venture through its challenges. Entrepreneurial drive is naturally present in both."
      : score >= 1
      ? "Mixed 3rd house conditions. One partner may carry more initiative and drive. Define workload and decision-making responsibilities clearly to avoid one partner feeling consistently over-stretched."
      : "Weak 3rd house conditions in one or both charts. Sustained effort and follow-through may be a recurring challenge in this partnership. External accountability structures, a third team member, or a business coach may help compensate.",
  };
}

// ---------------------------------------------------------------------------
// Synastry: planet-to-planet house analysis
// ---------------------------------------------------------------------------
function computeSynastry(chart1: ChartResponse, chart2: ChartResponse, name1: string, name2: string, relationship: string): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  // [planet1, planet2, theme, filter: "all" | "romantic" | "sibling" | "business"]
  const allPairs: [string, string, string, string][] = [
    ["Sun", "Sun", "ego & identity", "all"],
    ["Moon", "Moon", "emotional connection", "all"],
    ["Venus", "Mars", "romantic & physical chemistry", "romantic"],
    ["Jupiter", "Moon", "emotional growth & wisdom", "all"],
    ["Saturn", "Moon", "emotional responsibility & karmic bond", "all"],
    ["Venus", "Jupiter", "love, generosity & shared values", "all"],
    ["Sun", "Moon", "masculine-feminine energy balance", "all"],
    // Sibling-specific pairs
    ["Mars", "Mars", "sibling karaka alignment & protective instinct", "sibling"],
    ["Mercury", "Mercury", "communication & intellectual rapport", "sibling"],
    ["Jupiter", "Jupiter", "shared values, mentorship & elder guidance", "sibling"],
    // Business partner-specific pairs (classical karaka alignment)
    ["Mercury", "Mercury", "commerce, negotiation & business acumen", "business"],
    ["Saturn", "Saturn", "discipline, long-term planning & karmic contract", "business"],
    ["Jupiter", "Jupiter", "shared values, ethics & growth philosophy", "business"],
    ["Sun", "Saturn", "authority, structure & leadership alignment", "business"],
    ["Mercury", "Jupiter", "business intelligence & strategic growth thinking", "business"],
    ["Mars", "Mercury", "initiative, execution & decisive action", "business"],
  ];

  const isRomantic = relationship === "romantic";
  const isSibling = relationship === "sibling";
  const isBusinessPartner = relationship === "business";
  const keyPairs = allPairs
    .filter(([,,,filter]) => {
      if (filter === "all") return true;
      if (filter === "romantic") return isRomantic;
      if (filter === "sibling") return isSibling;
      if (filter === "business") return isBusinessPartner;
      return false;
    })
    .map(([a, b, c]) => [a, b, c] as [string, string, string]);

  for (const [p1Name, p2Name, theme] of keyPairs) {
    const p1 = chart1.planets.find(p => p.name === p1Name);
    const p2 = chart2.planets.find(p => p.name === p2Name);
    if (!p1 || !p2) continue;

    const houseDiff = ((p2.rashi_num - p1.rashi_num + 12) % 12) + 1;
    let nature: "harmonious" | "challenging" | "neutral" = "neutral";
    let desc = "";

    if ([1, 5, 9].includes(houseDiff)) {
      nature = "harmonious";
      desc = `${name1}'s ${p1Name} and ${name2}'s ${p2Name} are in trine (${houseDiff}th from each other) — a deeply harmonious aspect for ${theme}. Natural flow, mutual understanding, and effortless support.`;
    } else if ([4, 7, 10].includes(houseDiff)) {
      nature = "neutral";
      desc = `${name1}'s ${p1Name} and ${name2}'s ${p2Name} are in kendra (${houseDiff}th from each other) — a dynamic, action-oriented aspect for ${theme}. Creates energy and motivation but can also generate tension that drives growth.`;
    } else if ([6, 8, 12].includes(houseDiff)) {
      nature = "challenging";
      desc = `${name1}'s ${p1Name} and ${name2}'s ${p2Name} are in a dusthana relationship (${houseDiff}th) — a challenging aspect for ${theme}. Requires conscious effort, empathy, and patience to navigate differences.`;
    } else if ([2, 11].includes(houseDiff)) {
      nature = "harmonious";
      desc = `${name1}'s ${p1Name} and ${name2}'s ${p2Name} are in an upachaya relationship (${houseDiff}th) — a supportive aspect for ${theme} that improves over time. The connection deepens and strengthens with shared experience.`;
    } else {
      nature = "neutral";
      desc = `${name1}'s ${p1Name} and ${name2}'s ${p2Name} are in a ${houseDiff}th relationship — a moderate connection for ${theme}.`;
    }

    aspects.push({
      planet1: `${name1}'s ${p1Name}`,
      planet2: `${name2}'s ${p2Name}`,
      aspect: `${houseDiff}th house`,
      nature,
      description: desc,
    });
  }

  return aspects;
}

// ---------------------------------------------------------------------------
// Business checklist helper — converts a KootScore into a status item
// without contributing to a numeric score total.
// ---------------------------------------------------------------------------
function makeCheckItem(
  koot: KootScore,
  greenMin: number,
  amberMin: number,
  labels: { green: string; amber: string; red: string },
  source: string,
): ChecklistItem {
  const status: "green" | "amber" | "red" =
    koot.score >= greenMin ? "green" : koot.score >= amberMin ? "amber" : "red";
  return { name: koot.name, status, label: labels[status], description: koot.description, source };
}

// ---------------------------------------------------------------------------
// Main compatibility calculation
// ---------------------------------------------------------------------------
export function calculateCompatibility(
  chart1: ChartResponse,
  chart2: ChartResponse,
  name1: string,
  name2: string,
  relationship: string,
): CompatibilityResult {
  const nak1 = getMoonNakshatraIndex(chart1);
  const nak2 = getMoonNakshatraIndex(chart2);
  const rashi1 = getMoonRashiIndex(chart1);
  const rashi2 = getMoonRashiIndex(chart2);

  const moonP1 = chart1.planets.find(p => p.name === "Moon");
  const moonP2 = chart2.planets.find(p => p.name === "Moon");

  const isRomantic = relationship === "romantic";
  const isSibling = relationship === "sibling";
  const isBusinessPartner = relationship === "business";

  // Build koot list based on relationship type
  let allKoots: KootScore[];
  let maxScore: number;

  // Checklist built outside the koots array — populated for business and sibling
  let checklist: ChecklistItem[] | undefined;

  if (isBusinessPartner) {
    // Scored portion: only the 4 Ashtakoot koots whose weights come directly
    // from BPHS (the only authentic classical source for point values).
    // 5 + 6 + 7 + 3 = 21 points total — no invented weights.
    allKoots = [
      scoreGrahaMaitri(rashi1, rashi2), // 5 — mental wavelength (BPHS)
      scoreGana(nak1, nak2),             // 6 — temperament (BPHS)
      scoreBhakoot(rashi1, rashi2),      // 7 — shared prosperity (BPHS)
      scoreTara(nak1, nak2),             // 3 — destiny/longevity (BPHS)
    ];
    maxScore = 21;

    // Qualitative checklist — classical rules evaluated as green/amber/red,
    // not as points. Each item cites the classical source for its rule.
    checklist = [
      makeCheckItem(
        score7thHouseStrength(chart1, chart2), 4, 2,
        { green: "Strong — partnership house well-supported", amber: "Mixed — some planetary friction", red: "Weak — legal protection strongly advised" },
        "BPHS Ch. 18-20 (Yuvati Bhava)",
      ),
      makeCheckItem(
        scoreMercuryAlignmentBusiness(chart1, chart2), 3, 2,
        { green: "Commerce well-aligned", amber: "Moderate — document all agreements", red: "Misaligned — written contracts essential" },
        "BPHS — Mercury as Vyapara Karaka",
      ),
      makeCheckItem(
        score11thHouseGains(chart1, chart2), 3, 2,
        { green: "Good earning potential", amber: "Moderate — plan finances carefully", red: "Limited material returns likely" },
        "BPHS, Saravali — Labha Bhava",
      ),
      makeCheckItem(
        score7thLordCrossChart(chart1, chart2), 3, 2,
        { green: "Mutually supportive across charts", amber: "Partial — one partner drives more", red: "Tension across charts — define roles formally" },
        "Uttara Kalamrita — Bhavat Bhavam",
      ),
      makeCheckItem(
        score10th7thConnection(chart1, chart2), 2, 1,
        { green: "Partnership-suited (7th-10th linked)", amber: "Partially suited — one partner chart-aligned", red: "Neither chart strongly partnership-oriented" },
        "BPHS — 7th-10th lord connection",
      ),
      makeCheckItem(
        scoreJupiterSupport(chart1, chart2), 2, 1,
        { green: "Shared values & growth vision", amber: "Moderate — discuss goals explicitly", red: "Misaligned values — clarify terms before committing" },
        "BPHS — Jupiter as 11th house karaka",
      ),
      makeCheckItem(
        scorePartnershipStability(chart1, chart2), 3, 2,
        { green: "Stable — dissolution indicators absent", amber: "Moderate risk — agree exit terms in writing", red: "⚠ High risk — full legal deed with exit clauses required" },
        "BPHS — 6th/8th lord Parasara dissolution rule",
      ),
      makeCheckItem(
        score3rdHouseInitiative(chart1, chart2), 2, 1,
        { green: "Both partners show strong drive", amber: "Uneven initiative — define responsibilities", red: "Low initiative — add external accountability structures" },
        "BPHS — Sahaja Bhava (3rd house)",
      ),
    ];
  } else if (isSibling) {
    // Scored portion: only the 6 Ashtakoot koots with BPHS-authentic weights.
    // Yoni (physical) and Nadi (genetic) are marriage-specific and excluded.
    // 1+2+3+5+6+7 = 24 points — no invented weights.
    allKoots = [
      scoreVarna(nak1, nak2),          // 1 — spiritual/ego compatibility (BPHS)
      scoreVashya(rashi1, rashi2),     // 2 — mutual influence (BPHS)
      scoreTara(nak1, nak2),           // 3 — destiny alignment (BPHS)
      scoreGrahaMaitri(rashi1, rashi2),// 5 — mental wavelength (BPHS)
      scoreGana(nak1, nak2),           // 6 — temperament (BPHS)
      scoreBhakoot(rashi1, rashi2),    // 7 — shared prosperity (BPHS)
    ];
    maxScore = 24;

    // Qualitative checklist for sibling-specific classical rules.
    // These dimensions have no BPHS point values — evaluated as green/amber/red only.
    checklist = [
      makeCheckItem(
        scoreSahajaBhava(chart1, chart2), 4, 2,
        { green: "Strong sibling-house foundation", amber: "Mixed — bond needs nurturing", red: "Weak — karmic friction in sibling house" },
        "BPHS — 3rd house (Sahaja Bhava)",
      ),
      makeCheckItem(
        scoreMarsKaraka(chart1, chart2), 3, 2,
        { green: "Protective loyalty — sibling karaka aligned", amber: "Moderate — may need effort under stress", red: "Rivalry risk — ego clashes likely" },
        "BPHS — Mars as sibling karaka",
      ),
      makeCheckItem(
        scoreMoonAxis(chart1, chart2), 3, 2,
        { green: "Strong emotional resonance", amber: "Moderate — different rhythms, manageable", red: "Emotional misalignment — empathy and space needed" },
        "BPHS — Moon cross-chart position",
      ),
      makeCheckItem(
        score3rdLordCrossChart(chart1, chart2), 2, 1,
        { green: "Natural sibling bridge across charts", amber: "Partial connection — one side stronger", red: "Charts don't reinforce each other's sibling house" },
        "BPHS — 3rd lord cross-chart (Bhavat Bhavam)",
      ),
      makeCheckItem(
        scoreMercuryBond(chart1, chart2), 2, 1,
        { green: "Easy communication and rapport", amber: "Moderate — active listening helps", red: "Communication gaps — structured dialogue advised" },
        "BPHS — Mercury as communication karaka",
      ),
      makeCheckItem(
        score11thHouseSupport(chart1, chart2), 2, 1,
        { green: "Mutual material support — gains through sibling", amber: "Uneven support — one gives more", red: "Limited practical support between siblings" },
        "BPHS — 11th house (Labha / elder sibling)",
      ),
    ];
  } else if (isRomantic) {
    // Full authentic Ashtakoot — all 8 koots with BPHS-defined weights.
    // This is the only relationship type the classical system was designed for.
    allKoots = [
      scoreVarna(nak1, nak2),
      scoreVashya(rashi1, rashi2),
      scoreTara(nak1, nak2),
      scoreYoni(nak1, nak2),
      scoreGrahaMaitri(rashi1, rashi2),
      scoreGana(nak1, nak2),
      scoreBhakoot(rashi1, rashi2),
      scoreNadi(nak1, nak2),
    ];
    maxScore = 36;
  } else {
    // Friend / Parent / Child / Other:
    // Classical texts (BPHS, Phaladeepika) define Ashtakoot exclusively for
    // marriage. Applying it to other relationships has no classical basis.
    // Only Graha Maitri — Moon sign lord friendship — is cited by classical
    // authors as a general interpersonal compatibility metric.
    allKoots = [scoreGrahaMaitri(rashi1, rashi2)]; // 5 pts — the one classically applicable koot
    maxScore = 5;
  }

  const koots = allKoots;
  const totalScore = koots.reduce((s, k) => s + k.score, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  let verdict = "";
  let verdictColor = "";

  if (isBusinessPartner) {
    // Proportional to classical marriage thresholds (18/36=50%, 24/36=67%, 28/36=78%)
    // applied to the 21-point authentic business Ashtakoot.
    if (totalScore >= 16)      { verdict = "Strong Ashtakoot Alignment"; verdictColor = "text-green-400"; }
    else if (totalScore >= 14) { verdict = "Good Ashtakoot Alignment"; verdictColor = "text-emerald-400"; }
    else if (totalScore >= 11) { verdict = "Acceptable — Proceed with Awareness"; verdictColor = "text-amber-400"; }
    else if (totalScore >= 7)  { verdict = "Below Average — Significant Differences"; verdictColor = "text-orange-400"; }
    else                       { verdict = "Challenging Ashtakoot Match"; verdictColor = "text-red-400"; }
  } else if (isSibling) {
    // Proportional to classical marriage thresholds applied to the 24-point sibling Ashtakoot.
    // 50%=12, 67%=16, 78%=19
    if (totalScore >= 19)      { verdict = "Strong Sibling Ashtakoot"; verdictColor = "text-green-400"; }
    else if (totalScore >= 16) { verdict = "Good Sibling Alignment"; verdictColor = "text-emerald-400"; }
    else if (totalScore >= 12) { verdict = "Acceptable — Some Friction Areas"; verdictColor = "text-amber-400"; }
    else if (totalScore >= 8)  { verdict = "Below Average — Requires Patience"; verdictColor = "text-orange-400"; }
    else                       { verdict = "Challenging Ashtakoot Match"; verdictColor = "text-red-400"; }
  } else if (isRomantic) {
    // Full 36-point Ashtakoot — BPHS classical thresholds.
    if (totalScore >= 28)      { verdict = "Excellent Compatibility"; verdictColor = "text-green-400"; }
    else if (totalScore >= 21) { verdict = "Good Compatibility"; verdictColor = "text-emerald-400"; }
    else if (totalScore >= 18) { verdict = "Acceptable Compatibility"; verdictColor = "text-amber-400"; }
    else if (totalScore >= 12) { verdict = "Below Average — Requires Effort"; verdictColor = "text-orange-400"; }
    else                       { verdict = "Challenging — Significant Differences"; verdictColor = "text-red-400"; }
  } else {
    // Friend/Parent/Child/Other — only Graha Maitri (5 pts).
    if (totalScore >= 5)       { verdict = "Strong Mental Wavelength"; verdictColor = "text-green-400"; }
    else if (totalScore >= 4)  { verdict = "Good Mental Alignment"; verdictColor = "text-emerald-400"; }
    else if (totalScore >= 2)  { verdict = "Moderate — Some Effort Needed"; verdictColor = "text-amber-400"; }
    else                       { verdict = "Challenging Mental Wavelength"; verdictColor = "text-red-400"; }
  }

  const synastry = computeSynastry(chart1, chart2, name1, name2, relationship);

  const harmonious = synastry.filter(a => a.nature === "harmonious").length;
  const challenging = synastry.filter(a => a.nature === "challenging").length;

  let summary = "";

  if (isBusinessPartner) {
    // Summary is based only on the authentic 21-point Ashtakoot score.
    // The classical checklist items are surfaced separately in the UI.
    summary = `Ashtakoot score (BPHS-authentic): ${totalScore}/${maxScore} (${percentage}%). `;

    if (totalScore >= 16) {
      summary += "Strong mental wavelength, temperament, and prosperity alignment between these charts — a solid classical foundation for a business partnership. Review the classical checklist below for house-level risk indicators before committing.";
    } else if (totalScore >= 14) {
      summary += "Good overall alignment. The core compatibility is there. The classical checklist below will surface any specific house-level concerns that need addressing through agreements or role definition.";
    } else if (totalScore >= 11) {
      summary += "Acceptable alignment but notable differences in mental approach, temperament, or financial outlook. These are manageable with clear structure — use the classical checklist below to identify which specific areas need formal agreements.";
    } else {
      summary += "Significant differences in mental wavelength, temperament, or prosperity alignment. Shared business goals may be harder to sustain long-term. The classical checklist below will identify the specific risk areas — factor these carefully before committing capital or time.";
    }

    // Flag any red checklist items in the summary as a quick signal
    const redItems = checklist?.filter(c => c.status === "red") ?? [];
    if (redItems.length > 0) {
      summary += ` ⚠ ${redItems.length} classical risk indicator${redItems.length > 1 ? "s" : ""} detected (${redItems.map(c => c.name).join(", ")}) — see checklist below.`;
    }
  } else if (isSibling) {
    summary = `Ashtakoot score (BPHS-authentic): ${totalScore}/${maxScore} (${percentage}%). `;

    if (totalScore >= 19) {
      summary += "Strong Ashtakoot alignment — mental wavelength, temperament, and prosperity patterns are naturally compatible between these siblings. Review the classical checklist below for house-level nuances.";
    } else if (totalScore >= 16) {
      summary += "Good overall alignment across the core Ashtakoot factors. The sibling bond has a solid foundation — the classical checklist below surfaces any specific friction areas.";
    } else if (totalScore >= 12) {
      summary += "Acceptable alignment but notable differences in temperament or shared prosperity patterns. The sibling bond requires conscious effort — see the checklist below for specifics.";
    } else {
      summary += "Significant Ashtakoot differences. The sibling dynamic carries inherent friction in mental wavelength or temperament. Patience and deliberate communication are essential — review the checklist below.";
    }

    const redItems = checklist?.filter(c => c.status === "red") ?? [];
    if (redItems.length > 0) {
      summary += ` ⚠ ${redItems.length} classical concern${redItems.length > 1 ? "s" : ""} flagged (${redItems.map(c => c.name).join(", ")}) — see checklist below.`;
    }
  } else if (isRomantic) {
    summary = `Ashtakoot score: ${totalScore}/${maxScore} (${percentage}%). `;
    if (totalScore >= 28) {
      summary += "Excellent match across all 8 classical compatibility factors. ";
    } else if (totalScore >= 21) {
      summary += "Good match with natural harmony across most life areas. ";
    } else if (totalScore >= 18) {
      summary += "Acceptable match — some areas of harmony, others needing conscious attention. ";
    } else {
      summary += "Significant differences across multiple compatibility factors — requires ongoing effort and mutual understanding. ";
    }
    const yoniScore = koots.find(k => k.name === "Yoni")?.score ?? 0;
    const nadiScore = koots.find(k => k.name === "Nadi")?.score ?? 0;
    if (yoniScore >= 3 && nadiScore >= 8) summary += "Physical and health compatibility are strong — excellent for long-term partnership. ";
    else if (nadiScore === 0) summary += "Nadi Dosha is present — health of children and constitutional compatibility need attention. Vedic remedies are recommended. ";
  } else {
    // Friend/Parent/Child/Other — Graha Maitri only (5 pts)
    summary = `Graha Maitri (Moon sign lord compatibility): ${totalScore}/5. `;
    if (totalScore >= 5) {
      summary += "Strong mental wavelength — Moon sign lords are friendly, meaning thought patterns, emotional responses, and communication styles align naturally.";
    } else if (totalScore >= 4) {
      summary += "Good mental alignment — one lord is friendly, the other neutral. Communication generally flows well with minor effort.";
    } else if (totalScore >= 2) {
      summary += "Moderate mental wavelength — neutral relationship between Moon sign lords. Conscious communication and empathy bridge the differences.";
    } else {
      summary += "Challenging mental wavelength — Moon sign lords are inimical. Fundamentally different thought patterns; misunderstandings are likely without deliberate effort.";
    }
  }

  if (harmonious > challenging) summary += `Synastry shows ${harmonious} harmonious and ${challenging} challenging planetary connections — overall supportive energy.`;
  else if (challenging > harmonious) summary += `Synastry shows ${challenging} challenging and ${harmonious} harmonious planetary connections — growth through friction.`;
  else summary += `Synastry shows balanced planetary connections — neither overwhelmingly easy nor difficult.`;

  const classicalNote = (!isRomantic && !isSibling && !isBusinessPartner)
    ? "Classical texts (BPHS, Phaladeepika) define the Ashtakoot system exclusively for marriage compatibility. Applying it to friend, parent, child, or other relationships has no classical basis. Only Graha Maitri — Moon sign lord friendship — is cited by classical authors as a general interpersonal compatibility metric, so that is the only factor scored here."
    : undefined;

  return {
    person1: {
      name: name1,
      moonRashi: moonP1?.rashi ?? "Unknown",
      moonNakshatra: moonP1?.nakshatra ?? "Unknown",
      lagna: chart1.lagna,
    },
    person2: {
      name: name2,
      moonRashi: moonP2?.rashi ?? "Unknown",
      moonNakshatra: moonP2?.nakshatra ?? "Unknown",
      lagna: chart2.lagna,
    },
    relationship,
    koots,
    totalScore,
    maxScore,
    percentage,
    verdict,
    verdictColor,
    synastry,
    summary,
    checklist,
    classicalNote,
  };
}
