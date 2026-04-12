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
// Synastry: planet-to-planet house analysis
// ---------------------------------------------------------------------------
function computeSynastry(chart1: ChartResponse, chart2: ChartResponse, name1: string, name2: string, relationship: string): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  // [planet1, planet2, theme, filter: "all" | "romantic" | "sibling"]
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
  ];

  const isRomantic = relationship === "romantic";
  const isSibling = relationship === "sibling";
  const keyPairs = allPairs
    .filter(([,,,filter]) => {
      if (filter === "all") return true;
      if (filter === "romantic") return isRomantic;
      if (filter === "sibling") return isSibling;
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

  // Build koot list based on relationship type
  let allKoots: KootScore[];
  let maxScore: number;

  if (isSibling) {
    // Sibling compatibility: Ashtakoot core (minus Yoni/Nadi) + 6 sibling-specific dimensions
    allKoots = [
      // Ashtakoot core (24 pts)
      scoreVarna(nak1, nak2),
      scoreVashya(rashi1, rashi2),
      scoreTara(nak1, nak2),
      scoreGrahaMaitri(rashi1, rashi2),
      scoreGana(nak1, nak2),
      scoreBhakoot(rashi1, rashi2),
      // Sibling-specific dimensions (22 pts)
      scoreSahajaBhava(chart1, chart2),
      scoreMarsKaraka(chart1, chart2),
      scoreMoonAxis(chart1, chart2),
      score3rdLordCrossChart(chart1, chart2),
      scoreMercuryBond(chart1, chart2),
      score11thHouseSupport(chart1, chart2),
    ];
    maxScore = 46;
  } else {
    // Yoni (physical/sexual) and Nadi (progeny/genetic) are only relevant for romantic relationships
    allKoots = [
      scoreVarna(nak1, nak2),
      scoreVashya(rashi1, rashi2),
      scoreTara(nak1, nak2),
      ...(isRomantic ? [scoreYoni(nak1, nak2)] : []),
      scoreGrahaMaitri(rashi1, rashi2),
      scoreGana(nak1, nak2),
      scoreBhakoot(rashi1, rashi2),
      ...(isRomantic ? [scoreNadi(nak1, nak2)] : []),
    ];
    maxScore = isRomantic ? 36 : 24;
  }

  const koots = allKoots;
  const totalScore = koots.reduce((s, k) => s + k.score, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  let verdict = "";
  let verdictColor = "";

  if (isSibling) {
    // Sibling-specific thresholds (out of 46)
    if (percentage >= 75)      { verdict = "Excellent Sibling Bond"; verdictColor = "text-green-400"; }
    else if (percentage >= 58) { verdict = "Good Sibling Compatibility"; verdictColor = "text-emerald-400"; }
    else if (percentage >= 42) { verdict = "Moderate — Some Friction Areas"; verdictColor = "text-amber-400"; }
    else if (percentage >= 28) { verdict = "Below Average — Requires Patience"; verdictColor = "text-orange-400"; }
    else                       { verdict = "Challenging — Significant Differences"; verdictColor = "text-red-400"; }
  } else {
    if (totalScore >= 28)      { verdict = "Excellent Compatibility"; verdictColor = "text-green-400"; }
    else if (totalScore >= 21) { verdict = "Good Compatibility"; verdictColor = "text-emerald-400"; }
    else if (totalScore >= 18) { verdict = "Acceptable Compatibility"; verdictColor = "text-amber-400"; }
    else if (totalScore >= 12) { verdict = "Below Average — Requires Effort"; verdictColor = "text-orange-400"; }
    else                       { verdict = "Challenging — Significant Differences"; verdictColor = "text-red-400"; }
  }

  const synastry = computeSynastry(chart1, chart2, name1, name2, relationship);

  const harmonious = synastry.filter(a => a.nature === "harmonious").length;
  const challenging = synastry.filter(a => a.nature === "challenging").length;

  let summary = "";

  if (isSibling) {
    summary = `Sibling compatibility score: ${totalScore}/${maxScore} (${percentage}%). `;
    const sahaja = koots.find(k => k.name === "Sahaja Bhava")?.score ?? 0;
    const marsK = koots.find(k => k.name === "Mars Karaka")?.score ?? 0;
    const moonAx = koots.find(k => k.name === "Moon Axis")?.score ?? 0;

    if (percentage >= 75) {
      summary += "A naturally strong sibling bond — charts reinforce mutual support, communication, and emotional understanding. ";
    } else if (percentage >= 50) {
      summary += "A solid sibling connection with some areas that need attention. Conscious effort in weaker areas deepens the bond. ";
    } else {
      summary += "Charts show significant friction areas in the sibling dynamic. Patience, empathy, and deliberate communication are essential. ";
    }

    // Highlight strongest/weakest sibling dimensions
    if (sahaja >= 4) summary += "Strong 3rd houses in both charts provide an excellent foundation. ";
    else if (sahaja <= 1) summary += "Weak 3rd house conditions suggest the sibling bond needs extra nurturing. ";
    if (marsK >= 3) summary += "Mars (sibling karaka) is well-aligned — protective loyalty is natural. ";
    if (moonAx >= 3) summary += "Moons are harmoniously placed — emotional resonance is strong. ";
    else if (moonAx === 0) summary += "Moon axis is challenging — emotional misunderstandings need awareness. ";
  } else {
    summary = `Ashtakoot score: ${totalScore}/${maxScore} (${percentage}%). `;
    if (totalScore >= 24) {
      summary += `This is a strong match with natural compatibility across most life areas. `;
    } else if (totalScore >= 18) {
      summary += `This is a workable match with some areas of natural harmony and others requiring attention. `;
    } else {
      summary += `This match has significant areas of difference that require conscious effort and mutual understanding. `;
    }

    if (isRomantic) {
      const yoniScore = koots.find(k => k.name === "Yoni")?.score ?? 0;
      const nadiScore = koots.find(k => k.name === "Nadi")?.score ?? 0;
      if (yoniScore >= 3 && nadiScore >= 8) summary += "Physical and health compatibility are strong — excellent for long-term partnership. ";
      else if (nadiScore === 0) summary += "Nadi Dosha is present — health of children and constitutional compatibility need attention. Vedic remedies are recommended. ";
    }
  }

  if (harmonious > challenging) summary += `Synastry shows ${harmonious} harmonious and ${challenging} challenging planetary connections — overall supportive energy.`;
  else if (challenging > harmonious) summary += `Synastry shows ${challenging} challenging and ${harmonious} harmonious planetary connections — growth through friction.`;
  else summary += `Synastry shows balanced planetary connections — neither overwhelmingly easy nor difficult.`;

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
  };
}
