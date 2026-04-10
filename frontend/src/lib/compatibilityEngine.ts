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
// Synastry: planet-to-planet house analysis
// ---------------------------------------------------------------------------
function computeSynastry(chart1: ChartResponse, chart2: ChartResponse, name1: string, name2: string, relationship: string): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  const allPairs: [string, string, string, boolean][] = [
    ["Sun", "Sun", "ego & identity", false],
    ["Moon", "Moon", "emotional connection", false],
    ["Venus", "Mars", "romantic & physical chemistry", true],  // romantic only
    ["Jupiter", "Moon", "emotional growth & wisdom", false],
    ["Saturn", "Moon", "emotional responsibility & karmic bond", false],
    ["Venus", "Jupiter", "love, generosity & shared values", false],
    ["Sun", "Moon", "masculine-feminine energy balance", false],
  ];

  // Filter out romantic-only pairs for non-romantic relationships
  const isRomantic = relationship === "romantic";
  const keyPairs = allPairs
    .filter(([,,,romanticOnly]) => !romanticOnly || isRomantic)
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

  // Yoni (physical/sexual) and Nadi (progeny/genetic) are only relevant for romantic relationships
  const allKoots: KootScore[] = [
    scoreVarna(nak1, nak2),
    scoreVashya(rashi1, rashi2),
    scoreTara(nak1, nak2),
    ...(isRomantic ? [scoreYoni(nak1, nak2)] : []),
    scoreGrahaMaitri(rashi1, rashi2),
    scoreGana(nak1, nak2),
    scoreBhakoot(rashi1, rashi2),
    ...(isRomantic ? [scoreNadi(nak1, nak2)] : []),
  ];

  const koots = allKoots;
  const totalScore = koots.reduce((s, k) => s + k.score, 0);
  const maxScore = isRomantic ? 36 : 24; // 36 - Yoni(4) - Nadi(8) = 24
  const percentage = Math.round((totalScore / maxScore) * 100);

  let verdict = "";
  let verdictColor = "";
  if (totalScore >= 28) { verdict = "Excellent Compatibility"; verdictColor = "text-green-400"; }
  else if (totalScore >= 21) { verdict = "Good Compatibility"; verdictColor = "text-emerald-400"; }
  else if (totalScore >= 18) { verdict = "Acceptable Compatibility"; verdictColor = "text-amber-400"; }
  else if (totalScore >= 12) { verdict = "Below Average — Requires Effort"; verdictColor = "text-orange-400"; }
  else { verdict = "Challenging — Significant Differences"; verdictColor = "text-red-400"; }

  const synastry = computeSynastry(chart1, chart2, name1, name2, relationship);

  const harmonious = synastry.filter(a => a.nature === "harmonious").length;
  const challenging = synastry.filter(a => a.nature === "challenging").length;

  let summary = `Ashtakoot score: ${totalScore}/36 (${percentage}%). `;
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
