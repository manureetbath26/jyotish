/**
 * 5-Year Finance Report Engine
 *
 * Produces a deterministic, classically-grounded finance report by
 * combining the chart's natal wealth signature with Vimshottari dasha
 * timing over the next five years.
 *
 * Natal sources:
 *   - Parashari house lords of 2, 5, 9, 11 (Dhana axis) + 6, 8, 12 (debt/loss)
 *   - Dhana yogas detected via the yoga engine (`category: "dhana"`)
 *   - Kubera signature (Venus in 11 in own/exalted/friendly)
 *   - Lakshmi, Kalanidhi, Parvata, Vasumati, Akhanda Samrajya etc.
 *   - Ashtakvarga: H2 & H11 bindus, H2+H11 vs H6+H12 balance, classical >164 prosperity rule
 *   - Jaimini Arudha Padas: A2 (visible wealth) + A11 (visible gains) and any planet influencing them
 *
 * Timing sources:
 *   - Vimshottari MD/AD windows over the next 5 years
 *   - Per-window wealth score: MD lord owns 2/5/9/11? Placed there? Part of a
 *     dhana yoga? Debilitated? Combust? (BPHS ch 48-50; Phaladeepika ch 24)
 *
 * Classical references:
 *   - BPHS ch 7, 34-36, 41, 48-50, 69, 70
 *   - Phaladeepika ch 14, 24
 *   - Jaimini Upadesa Sutras ch 1, 2
 */

import type { ChartResponse, DashaEntry, AntardhashaEntry } from "./api";
import type { AshtakvargaAnalysis } from "./ashtakvargaEngine";
import type { DetectedYoga, YogaRule } from "./yogaEngine";
import { detectYogas } from "./yogaEngine";
import { ZODIAC_ORDER, SIGN_INDEX, SIGN_LORD, type Sign } from "./charaDashaEngine";
import { computeAllArudhas, type ArudhaSet } from "./arudhaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Report types
// ────────────────────────────────────────────────────────────────────────────

export interface FinanceReport {
  /** Headline verdict */
  verdict: FinanceVerdict;
  /** Natal wealth signature — Dhana yogas and their implications */
  natalSignature: NatalSignature;
  /** Wealth-house health (Ashtakvarga-driven) */
  houseHealth: HouseHealth;
  /** Source-of-income classification */
  sourceProfile: SourceProfile;
  /** Savings vs expense axis */
  savingsAxis: SavingsAxis;
  /** Jaimini Arudha analysis */
  arudhaAnalysis: ArudhaAnalysis;
  /** Current period (Vimshottari) wealth assessment */
  currentPeriod: PeriodWealth;
  /** 5-year forward timeline — Vimshottari sub-periods scored */
  timeline: PeriodWealth[];
  /** Picked peak windows (3-5) */
  peakWindows: PeriodWealth[];
  /** Picked caution windows */
  cautionWindows: PeriodWealth[];
  /** Remedies for weak wealth indicators */
  remedies: Remedy[];
  /** Classical sources cited per section */
  citations: string[];
  /** Meta */
  meta: {
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
}

export interface FinanceVerdict {
  rating: "Very Strong" | "Strong" | "Moderate" | "Mixed" | "Challenging";
  /** 0-100 composite score */
  score: number;
  /** 2-3 sentence narrative */
  summary: string;
}

export interface NatalSignature {
  /** Dhana yogas detected (from yoga engine, category == "dhana") */
  dhanaYogas: DetectedYoga[];
  /** Supporting Raja / wealth yogas (Lakshmi, Kubera, etc.) */
  supportingYogas: DetectedYoga[];
  /** Warnings (Daridra, 2L/11L in dusthana etc.) */
  warnings: DetectedYoga[];
  /** Extra signatures computed inline (not in yoga DB) */
  extraSignatures: InlineSignature[];
}

export interface InlineSignature {
  id: string;
  name: string;
  tone: "positive" | "caution";
  description: string;
  source: string;
}

export interface HouseHealth {
  /** Per-house bindu data for H2, H5, H9, H11, H6, H8, H12 */
  houses: HouseBinduEntry[];
  /** H2 + H11 vs H6 + H12 */
  netWealthAxis: number;
  /** Sum of (H1+H2+H4+H9+H10+H11) — classical >164 rule */
  prosperityTotal: number;
  prosperityMeetsClassicalThreshold: boolean;
  /** H11 vs H12 — gains vs expenses */
  gainsExceedExpenses: boolean;
  /** Narrative summary */
  summary: string;
}

export interface HouseBinduEntry {
  house: number;
  houseName: string;
  sign: Sign;
  savBindus: number;
  classification: "abundant" | "healthy" | "average" | "weak";
  note: string;
}

export interface SourceProfile {
  /** Primary income sectors inferred from chart */
  primarySectors: string[];
  /** Secondary / supporting sectors */
  secondarySectors: string[];
  /** Business vs job lean based on SAV(H11) vs SAV(H10) */
  businessVsJob: "business" | "job" | "balanced";
  narrative: string;
}

export interface SavingsAxis {
  /** Gains vs expenses bindu comparison */
  gainsBindus: number;
  expenseBindus: number;
  retentionScore: number; // -10 to +10
  narrative: string;
}

export interface ArudhaAnalysis {
  /** Full Arudha set */
  arudhas: ArudhaSet;
  /** Planets in/aspecting A2 */
  a2Influences: ArudhaInfluence[];
  /** Planets in/aspecting A11 */
  a11Influences: ArudhaInfluence[];
  /** Synthesised wealth-perception note */
  narrative: string;
}

export interface ArudhaInfluence {
  planet: string;
  nature: "benefic" | "malefic";
  mode: "conjunct" | "aspect";
  note: string;
}

export interface PeriodWealth {
  /** Mahadasha lord */
  mahadasha: string;
  /** Antardasha lord */
  antardasha: string;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  /** Duration in years (rough) */
  years: number;
  /** Composite score 0-10 */
  score: number;
  /** Tone bucket */
  tone: "peak" | "strong" | "moderate" | "mixed" | "caution";
  /** Contributing factors */
  factors: string[];
  /** One-line narrative */
  narrative: string;
}

export interface Remedy {
  planet: string;
  reason: string;
  mantra?: string;
  gemstone?: string;
  charity?: string;
  note: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const HOUSE_NAMES: Record<number, string> = {
  1: "Lagna",
  2: "Dhana (Wealth)",
  3: "Siblings/Effort",
  4: "Home/Assets",
  5: "Creativity/Speculation",
  6: "Debts/Service",
  7: "Partnerships",
  8: "Inheritance/Hidden",
  9: "Fortune",
  10: "Career",
  11: "Gains",
  12: "Losses",
};

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

const PLANET_FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};

const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

const CITATIONS = [
  "BPHS ch 7, 34-36, 41, 48-50, 69, 70",
  "Phaladeepika (Mantreswara) ch 14, 24",
  "Jaimini Upadesa Sutras ch 1 (Arudha Padas), ch 2",
  "Uttara Kalamrita ch 4 (house significations)",
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtHouse(lagna: Sign, house: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[lagna] + house - 1) % 12];
}

function lordOfHouse(lagna: Sign, house: number): string {
  return SIGN_LORD[signAtHouse(lagna, house)];
}

function planetSign(chart: ChartResponse, name: string): Sign | null {
  const p = chart.planets.find((pl) => pl.name === name);
  return p ? (p.rashi as Sign) : null;
}

function planetHouse(chart: ChartResponse, name: string): number | null {
  const p = chart.planets.find((pl) => pl.name === name);
  return p ? p.house : null;
}

function isDebilitated(planet: string, sign: Sign): boolean {
  return DEBILITATION_SIGN[planet] === sign;
}

function isOwnOrExalted(planet: string, sign: Sign): boolean {
  return (
    EXALTATION_SIGN[planet] === sign ||
    (OWN_SIGNS[planet]?.includes(sign) ?? false)
  );
}

function houseOfSign(sign: Sign, lagna: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
}

function savBindusAtHouse(
  chart: ChartResponse,
  ashtakvarga: AshtakvargaAnalysis,
  house: number,
): number {
  const sign = signAtHouse(chart.lagna as Sign, house);
  const idx = SIGN_INDEX[sign];
  return ashtakvarga.sarvashtakvarga.signTotals[idx] ?? 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────────────────────

export function generateFinanceReport(
  chart: ChartResponse,
  ashtakvarga: AshtakvargaAnalysis,
  yogaRules: YogaRule[],
): FinanceReport {
  const lagna = chart.lagna as Sign;
  const allYogas = detectYogas(chart, yogaRules);

  // 1. Natal signature (yogas + inline wealth checks)
  const natalSignature = buildNatalSignature(chart, allYogas);

  // 2. House health (Ashtakvarga-driven)
  const houseHealth = buildHouseHealth(chart, ashtakvarga);

  // 3. Source profile
  const sourceProfile = buildSourceProfile(chart, ashtakvarga, lagna);

  // 4. Savings vs expense axis
  const savingsAxis = buildSavingsAxis(chart, ashtakvarga);

  // 5. Arudha analysis
  const arudhaAnalysis = buildArudhaAnalysis(chart);

  // 6-8. Timeline, current period, peaks, cautions
  const { currentPeriod, timeline, peakWindows, cautionWindows } =
    buildTimeline(chart, allYogas);

  // 9. Remedies
  const remedies = buildRemedies(chart, natalSignature, houseHealth);

  // 10. Verdict
  const verdict = buildVerdict(
    natalSignature,
    houseHealth,
    savingsAxis,
    currentPeriod,
    peakWindows,
  );

  // Meta window
  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 5);

  return {
    verdict,
    natalSignature,
    houseHealth,
    sourceProfile,
    savingsAxis,
    arudhaAnalysis,
    currentPeriod,
    timeline,
    peakWindows,
    cautionWindows,
    remedies,
    citations: CITATIONS,
    meta: {
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      generatedAt: now.toISOString(),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Section builders
// ────────────────────────────────────────────────────────────────────────────

function buildNatalSignature(
  chart: ChartResponse,
  allYogas: DetectedYoga[],
): NatalSignature {
  const dhanaYogas = allYogas.filter((y) => y.rule.category === "dhana");
  const supportingYogas = allYogas.filter((y) => {
    const id = y.rule.slug.toLowerCase();
    return (
      y.rule.category !== "dhana" &&
      (id.includes("lakshmi") ||
        id.includes("kalanidhi") ||
        id.includes("parvata") ||
        id.includes("vasumati") ||
        id.includes("akhanda") ||
        id.includes("budhaditya") ||
        id.includes("chandra-mangal") ||
        id.includes("chandra_mangal") ||
        id.includes("saraswati") ||
        id.includes("chamara"))
    );
  });
  const warnings = allYogas.filter((y) => {
    const id = y.rule.slug.toLowerCase();
    return (
      id.includes("daridra") ||
      id.includes("kemadruma") ||
      (y.rule.category === "dosha" && id.includes("shakata"))
    );
  });
  const extraSignatures = buildExtraSignatures(chart);
  return { dhanaYogas, supportingYogas, warnings, extraSignatures };
}

function buildExtraSignatures(chart: ChartResponse): InlineSignature[] {
  const lagna = chart.lagna as Sign;
  const out: InlineSignature[] = [];

  // Kubera yoga: Venus in 11th in own/exalted/friendly
  const venusH = planetHouse(chart, "Venus");
  const venusS = planetSign(chart, "Venus");
  if (venusH === 11 && venusS) {
    const eleventhLord = lordOfHouse(lagna, 11);
    const friendly = PLANET_FRIENDS["Venus"]?.includes(eleventhLord) ?? false;
    const dignified = isOwnOrExalted("Venus", venusS);
    if (dignified || friendly) {
      out.push({
        id: "kubera",
        name: "Kubera signature",
        tone: "positive",
        description: `Venus sits in your 11th house (${venusS}) ${dignified ? "in its own/exalted sign" : "in a friendly sign"} — the classical signature of Kubera's grace. Gains are amplified and often come through art, beauty, luxury, or relationship-driven networks.`,
        source: "Phaladeepika ch 14; classical Kubera yoga (later compilation).",
      });
    }
  }

  // Jupiter in H2 or H11 — direct Dhana-karaka placement
  const jupH = planetHouse(chart, "Jupiter");
  const jupS = planetSign(chart, "Jupiter");
  if (jupS && (jupH === 2 || jupH === 11 || jupH === 5 || jupH === 9)) {
    const dignified = isOwnOrExalted("Jupiter", jupS);
    const debil = isDebilitated("Jupiter", jupS);
    out.push({
      id: "jupiter-dhana-placement",
      name: `Jupiter in ${HOUSE_NAMES[jupH]}`,
      tone: debil ? "caution" : "positive",
      description: debil
        ? `Jupiter is debilitated in your ${jupH}${ordinal(jupH)} — a weakened Dhana-karaka; look for Neecha Bhanga or strong remedies.`
        : `Jupiter — the natural Dhana-karaka — sits in your ${jupH}${ordinal(jupH)} house${dignified ? " in its own/exalted sign" : ""}. Classically one of the strongest signatures for a wealthy chart.`,
      source: "BPHS ch 34 (Jupiter as Dhana-karaka).",
    });
  }

  // 2L in 11 or 11L in 2 — classical wealth connection even without a full yoga
  const twoLord = lordOfHouse(lagna, 2);
  const elevenLord = lordOfHouse(lagna, 11);
  const twoLordH = planetHouse(chart, twoLord);
  const elevenLordH = planetHouse(chart, elevenLord);
  if (twoLordH === 11 || elevenLordH === 2) {
    out.push({
      id: "dhana-axis",
      name: "2L–11L axis activated",
      tone: "positive",
      description: `The 2nd and 11th house lords (${twoLord}, ${elevenLord}) are exchanged across the wealth axis — a direct Parashari signature of earning and retaining wealth.`,
      source: "BPHS ch 41 (wealth combinations).",
    });
  }

  // Weak 2L or 11L in dusthana
  if (twoLordH && [6, 8, 12].includes(twoLordH)) {
    out.push({
      id: "two-lord-dusthana",
      name: `2nd lord in ${HOUSE_NAMES[twoLordH]}`,
      tone: "caution",
      description: `Your 2nd lord (${twoLord}) sits in the ${twoLordH}${ordinal(twoLordH)} — a dusthana. Classical reading: income flows may be disrupted or diverted; look for Vipareet Raja cancellations in the chart.`,
      source: "BPHS ch 50.",
    });
  }
  if (elevenLordH && [6, 8, 12].includes(elevenLordH)) {
    out.push({
      id: "eleven-lord-dusthana",
      name: `11th lord in ${HOUSE_NAMES[elevenLordH]}`,
      tone: "caution",
      description: `Your 11th lord (${elevenLord}) sits in the ${elevenLordH}${ordinal(elevenLordH)} — a dusthana. Classical reading: gains may come through struggle or transformation rather than smoothly.`,
      source: "BPHS ch 41.",
    });
  }

  return out;
}

function buildHouseHealth(
  chart: ChartResponse,
  ashtakvarga: AshtakvargaAnalysis,
): HouseHealth {
  const lagna = chart.lagna as Sign;
  const houses = [1, 2, 4, 5, 6, 8, 9, 10, 11, 12];
  const entries: HouseBinduEntry[] = houses.map((h) => {
    const sign = signAtHouse(lagna, h);
    const bindus = savBindusAtHouse(chart, ashtakvarga, h);
    const classification =
      bindus >= 32 ? "abundant" :
      bindus >= 28 ? "healthy" :
      bindus >= 23 ? "average" :
      "weak";
    return {
      house: h,
      houseName: HOUSE_NAMES[h],
      sign,
      savBindus: bindus,
      classification,
      note: houseHealthNote(h, bindus, classification),
    };
  });

  const sav = ashtakvarga.sarvashtakvarga.signTotals;
  const two = sav[SIGN_INDEX[signAtHouse(lagna, 2)]] ?? 0;
  const eleven = sav[SIGN_INDEX[signAtHouse(lagna, 11)]] ?? 0;
  const six = sav[SIGN_INDEX[signAtHouse(lagna, 6)]] ?? 0;
  const twelve = sav[SIGN_INDEX[signAtHouse(lagna, 12)]] ?? 0;

  const prosperityTotal =
    [1, 2, 4, 9, 10, 11].reduce(
      (sum, h) => sum + (sav[SIGN_INDEX[signAtHouse(lagna, h)]] ?? 0),
      0,
    );

  const netWealthAxis = two + eleven - (six + twelve);

  const summary =
    `H2 bindus = ${two}, H11 = ${eleven} (both ≥ 28 means solid earning support; ≥ 32 is abundant). ` +
    `H11 ${eleven > twelve ? "exceeds" : "does not exceed"} H12 (${twelve}) — gains are ${eleven > twelve ? "classically greater than expenses" : "classically below expense levels, signalling debt-proneness"}. ` +
    `Net wealth axis (H2+H11 − H6−H12) = ${netWealthAxis}. ` +
    `Classical prosperity sum (H1+H2+H4+H9+H10+H11) = ${prosperityTotal} ${prosperityTotal > 164 ? "(meets the BPHS > 164 threshold — wealthy chart)" : "(below the classical 164 threshold; wealth comes through other signatures)"}.`;

  return {
    houses: entries,
    netWealthAxis,
    prosperityTotal,
    prosperityMeetsClassicalThreshold: prosperityTotal > 164,
    gainsExceedExpenses: eleven > twelve,
    summary,
  };
}

function houseHealthNote(house: number, bindus: number, cls: string): string {
  const hn = HOUSE_NAMES[house];
  switch (cls) {
    case "abundant":
      return `${hn} at ${bindus} bindus — exceptionally well-supported; results flow easily through this house.`;
    case "healthy":
      return `${hn} at ${bindus} bindus — above the 28-bindu cosmic mean; dependable support.`;
    case "average":
      return `${hn} at ${bindus} bindus — functional but not outstanding; timing (dasha/transit) matters more to activate results.`;
    default:
      return `${hn} at ${bindus} bindus — below the 23-bindu weakness line; this house needs conscious effort or remedy.`;
  }
}

function buildSourceProfile(
  chart: ChartResponse,
  ashtakvarga: AshtakvargaAnalysis,
  lagna: Sign,
): SourceProfile {
  const sav = ashtakvarga.sarvashtakvarga.signTotals;
  const ten = sav[SIGN_INDEX[signAtHouse(lagna, 10)]] ?? 0;
  const eleven = sav[SIGN_INDEX[signAtHouse(lagna, 11)]] ?? 0;

  const businessVsJob: "business" | "job" | "balanced" =
    eleven - ten >= 4 ? "business" :
    ten - eleven >= 4 ? "job" :
    "balanced";

  const { primary, secondary } = sectorInferenceByLagna(chart, lagna);

  const narrative =
    `Primary sectors: ${primary.join(", ")}. ` +
    `${businessVsJob === "business" ? "The 11th house (gains) outscores the 10th (employment) in Ashtakvarga, which classically favours entrepreneurial / business paths over structured salaried work." : businessVsJob === "job" ? "The 10th house outscores the 11th in Ashtakvarga — a signature for steady structured employment as the dominant income channel." : "The 10th and 11th are close in bindu strength — both a structured role and an entrepreneurial path will work; choose by temperament rather than chart pressure."}`;

  return {
    primarySectors: primary,
    secondarySectors: secondary,
    businessVsJob,
    narrative,
  };
}

function sectorInferenceByLagna(
  chart: ChartResponse,
  lagna: Sign,
): { primary: string[]; secondary: string[] } {
  // For each lagna, pre-tabulate the functional-benefic planets and their
  // classical sectoral flavours. This is a compact table; refined over time.
  const tenLord = lordOfHouse(lagna, 10);
  const twoLord = lordOfHouse(lagna, 2);
  const elevenLord = lordOfHouse(lagna, 11);

  const planetSectors: Record<string, string[]> = {
    Sun: ["government", "authority roles", "medicine", "energy/utilities"],
    Moon: ["mass-market products", "hospitality", "food & beverage", "public communication"],
    Mars: ["real estate", "defence/security", "engineering", "competitive sports"],
    Mercury: ["technology / software", "analytics", "writing / publishing", "trade / commerce"],
    Jupiter: ["education", "finance / banking", "law", "advisory / consulting"],
    Venus: ["arts", "luxury goods", "entertainment", "design / fashion", "beauty / wellness"],
    Saturn: ["heavy industry", "infrastructure", "long-cycle research", "mining / extraction"],
  };

  const primarySet = new Set<string>();
  const secondarySet = new Set<string>();
  for (const s of planetSectors[tenLord] ?? []) primarySet.add(s);
  for (const s of planetSectors[twoLord] ?? []) primarySet.add(s);
  for (const s of planetSectors[elevenLord] ?? []) secondarySet.add(s);

  // Boost: planets in 10th house themselves add strong sector hints
  const tenthOccupants = chart.planets.filter((p) => p.house === 10);
  for (const p of tenthOccupants) {
    for (const s of planetSectors[p.name] ?? []) primarySet.add(s);
  }

  return {
    primary: Array.from(primarySet).slice(0, 5),
    secondary: Array.from(secondarySet).slice(0, 4),
  };
}

function buildSavingsAxis(
  chart: ChartResponse,
  ashtakvarga: AshtakvargaAnalysis,
): SavingsAxis {
  const lagna = chart.lagna as Sign;
  const sav = ashtakvarga.sarvashtakvarga.signTotals;
  const two = sav[SIGN_INDEX[signAtHouse(lagna, 2)]] ?? 0;
  const eleven = sav[SIGN_INDEX[signAtHouse(lagna, 11)]] ?? 0;
  const six = sav[SIGN_INDEX[signAtHouse(lagna, 6)]] ?? 0;
  const twelve = sav[SIGN_INDEX[signAtHouse(lagna, 12)]] ?? 0;

  const gains = two + eleven;
  const expenses = six + twelve;
  // Retention score: classical reading is simply gains − expenses.
  // Clamped to [-10, +10] for display, but the sign always matches the
  // direction of gains vs expenses.
  const rawDelta = gains - expenses;
  const retentionScore = Math.max(-10, Math.min(10, rawDelta));

  const narrative =
    rawDelta >= 10
      ? `Strong retention: gains (H2+H11 = ${gains}) significantly exceed expense/debt potential (H6+H12 = ${expenses}) by ${rawDelta} bindus. Wealth accumulates rather than drains.`
      : rawDelta > 0
      ? `Net-positive axis: gains (${gains}) outpace expenses (${expenses}) by ${rawDelta} bindus. Retention works with discipline; watch lifestyle inflation in strong dasha periods.`
      : rawDelta === 0
      ? `Balanced axis: gains (${gains}) equal expenses (${expenses}). Cash flow is in equilibrium; small habit changes shift the balance either way.`
      : `Expense-heavy axis: expenses (H6+H12 = ${expenses}) exceed gains (H2+H11 = ${gains}) by ${Math.abs(rawDelta)} bindus. Classical reading: conscious budgeting and debt control are the most impactful financial habits for you, not aggressive earning.`;

  return { gainsBindus: gains, expenseBindus: expenses, retentionScore, narrative };
}

function buildArudhaAnalysis(chart: ChartResponse): ArudhaAnalysis {
  const arudhas = computeAllArudhas(chart);
  const a2 = arudhas.A2;
  const a11 = arudhas.A11;
  const a2Influences = influencersOfSign(chart, a2);
  const a11Influences = influencersOfSign(chart, a11);

  const narrative = buildArudhaNarrative(a2, a11, a2Influences, a11Influences);

  return { arudhas, a2Influences, a11Influences, narrative };
}

function influencersOfSign(chart: ChartResponse, sign: Sign): ArudhaInfluence[] {
  const out: ArudhaInfluence[] = [];
  for (const p of chart.planets) {
    if ((p.rashi as Sign) === sign) {
      out.push({
        planet: p.name,
        nature: BENEFICS.has(p.name) ? "benefic" : "malefic",
        mode: "conjunct",
        note: `${p.name} sits in the sign of this Arudha.`,
      });
    }
  }
  return out;
}

function buildArudhaNarrative(
  a2: Sign,
  a11: Sign,
  a2Inf: ArudhaInfluence[],
  a11Inf: ArudhaInfluence[],
): string {
  const parts: string[] = [];
  parts.push(
    `Your A2 (Dhana-Pada) — how wealth shows up externally — sits in ${a2}, and your A11 (Labha-Pada) — how gains are perceived — in ${a11}.`,
  );
  const a11Benefics = a11Inf.filter((i) => i.nature === "benefic");
  const a11Malefics = a11Inf.filter((i) => i.nature === "malefic");
  if (a11Benefics.length) {
    parts.push(
      `${a11Benefics.map((i) => i.planet).join(", ")} ${a11Benefics.length > 1 ? "sit" : "sits"} in your A11 — classically, wealth comes through virtuous, above-board channels (Jaimini Upadesa Sutras 1.2.74).`,
    );
  }
  if (a11Malefics.length && !a11Benefics.length) {
    parts.push(
      `${a11Malefics.map((i) => i.planet).join(", ")} in A11 — classically signals gains from more unconventional or struggle-based channels. Scale can be high, but the path is less smooth.`,
    );
  }
  if (!a11Inf.length) {
    parts.push(
      `A11 is uninhabited — gains follow the general chart flow rather than being dominated by a single signature. Wealth image depends on the A11 sign-lord's strength.`,
    );
  }
  return parts.join(" ");
}

// ────────────────────────────────────────────────────────────────────────────
// Timeline
// ────────────────────────────────────────────────────────────────────────────

function buildTimeline(
  chart: ChartResponse,
  allYogas: DetectedYoga[],
): {
  currentPeriod: PeriodWealth;
  timeline: PeriodWealth[];
  peakWindows: PeriodWealth[];
  cautionWindows: PeriodWealth[];
} {
  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setFullYear(horizonEnd.getFullYear() + 5);

  const all: PeriodWealth[] = [];
  for (const md of chart.dasha_sequence ?? []) {
    const mdStart = new Date(md.start_date);
    const mdEnd = new Date(md.end_date);
    if (mdEnd < now) continue;
    if (mdStart > horizonEnd) break;
    for (const ad of md.antardashas ?? []) {
      const adStart = new Date(ad.start_date);
      const adEnd = new Date(ad.end_date);
      if (adEnd < now || adStart > horizonEnd) continue;
      all.push(scorePeriod(chart, md, ad, allYogas));
    }
  }

  // Find the period containing "now"
  const currentPeriod =
    all.find((p) => new Date(p.startDate) <= now && now <= new Date(p.endDate)) ??
    all[0];

  // Pick peak windows (top 5 by score where tone ≥ strong)
  const peakWindows = [...all]
    .filter((p) => p.tone === "peak" || p.tone === "strong")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Pick caution windows (lowest scoring periods)
  const cautionWindows = [...all]
    .filter((p) => p.tone === "caution" || p.tone === "mixed")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return { currentPeriod, timeline: all, peakWindows, cautionWindows };
}

function scorePeriod(
  chart: ChartResponse,
  md: DashaEntry,
  ad: AntardhashaEntry,
  allYogas: DetectedYoga[],
): PeriodWealth {
  const lagna = chart.lagna as Sign;
  const factors: string[] = [];
  let score = 5; // neutral baseline out of 10

  const mdLord = md.planet;
  const adLord = ad.planet;

  // MD lord ownership of 2/5/9/11
  const mdLordHouses = houseLordshipsOf(mdLord, lagna);
  if (mdLordHouses.some((h) => [2, 5, 9, 11].includes(h))) {
    score += 2;
    factors.push(
      `${mdLord} lords wealth house(s) ${mdLordHouses.filter((h) => [2, 5, 9, 11].includes(h)).join(", ")} — direct wealth activation.`,
    );
  }

  // MD lord placed in 2/5/9/11
  const mdLordPlacement = planetHouse(chart, mdLord);
  if (mdLordPlacement && [2, 5, 9, 11].includes(mdLordPlacement)) {
    score += 1;
    factors.push(`${mdLord} is placed in H${mdLordPlacement} — a Dhana-sthana.`);
  }

  // MD lord in a Dhana yoga
  const mdInDhanaYoga = allYogas.some(
    (y) =>
      y.rule.category === "dhana" &&
      (y.keyPlanets?.includes(mdLord) ?? false),
  );
  if (mdInDhanaYoga) {
    score += 2;
    factors.push(`${mdLord} is part of a detected Dhana yoga in your chart.`);
  }

  // AD lord relationship to MD lord
  const adLordH = planetHouse(chart, adLord);
  if (adLordH && [2, 5, 9, 11].includes(adLordH)) {
    score += 1;
    factors.push(`${adLord} (antardasha) also sits in a Dhana-sthana (H${adLordH}).`);
  }
  const adLordHouses = houseLordshipsOf(adLord, lagna);
  if (adLordHouses.some((h) => [2, 5, 9, 11].includes(h))) {
    score += 1;
    factors.push(`${adLord} lords wealth house ${adLordHouses.filter((h) => [2, 5, 9, 11].includes(h)).join(",")}.`);
  }

  // MD lord debilitated?
  const mdSign = planetSign(chart, mdLord);
  if (mdSign && isDebilitated(mdLord, mdSign)) {
    score -= 2;
    factors.push(`${mdLord} is debilitated in ${mdSign} — results are compromised unless cancellation applies.`);
  }

  // MD lord in dusthana without Vipareet
  if (mdLordPlacement && [6, 8, 12].includes(mdLordPlacement)) {
    const vipareet = allYogas.some(
      (y) =>
        y.rule.slug.toLowerCase().includes("vipareet") &&
        (y.keyPlanets?.includes(mdLord) ?? false),
    );
    if (!vipareet) {
      score -= 1;
      factors.push(`${mdLord} sits in a dusthana (H${mdLordPlacement}); no Vipareet Raja cancellation detected.`);
    } else {
      score += 1;
      factors.push(`${mdLord} in dusthana with Vipareet Raja activation — reversal signature.`);
    }
  }

  // Yogakaraka bonus: planet lords both a kendra and a kona
  const kendras = [1, 4, 7, 10];
  const konas = [1, 5, 9];
  if (
    mdLordHouses.some((h) => kendras.includes(h)) &&
    mdLordHouses.some((h) => konas.includes(h)) &&
    !mdLordHouses.every((h) => h === 1) // lagna lord alone isn't yogakaraka
  ) {
    score += 2;
    factors.push(`${mdLord} is Yogakaraka — lords both kendra and trikona for this lagna.`);
  }

  // Clamp
  score = Math.max(0, Math.min(10, score));

  const tone: PeriodWealth["tone"] =
    score >= 8 ? "peak" :
    score >= 6 ? "strong" :
    score >= 4 ? "moderate" :
    score >= 2 ? "mixed" :
    "caution";

  const years = roughYears(md.start_date, md.end_date, ad.start_date, ad.end_date);

  return {
    mahadasha: mdLord,
    antardasha: adLord,
    startDate: ad.start_date,
    endDate: ad.end_date,
    years,
    score,
    tone,
    factors,
    narrative: buildPeriodNarrative(mdLord, adLord, tone, factors),
  };
}

function houseLordshipsOf(planet: string, lagna: Sign): number[] {
  // Rahu/Ketu don't lord any house in the standard Parashari framework
  if (planet === "Rahu" || planet === "Ketu") return [];
  const owned = OWN_SIGNS[planet] ?? [];
  return owned.map((s) => houseOfSign(s, lagna));
}

function roughYears(
  _mdStart: string,
  _mdEnd: string,
  adStart: string,
  adEnd: string,
): number {
  const ms = new Date(adEnd).getTime() - new Date(adStart).getTime();
  return Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

function buildPeriodNarrative(
  mdLord: string,
  adLord: string,
  tone: PeriodWealth["tone"],
  factors: string[],
): string {
  const opener = mdLord === adLord
    ? `${mdLord} runs both mahadasha and antardasha here`
    : `${mdLord}–${adLord}`;
  const toneText: Record<PeriodWealth["tone"], string> = {
    peak: "a peak wealth window in the 5-year horizon",
    strong: "a strong window with multiple supporting signatures",
    moderate: "a moderate period — gains come with effort",
    mixed: "a mixed period with both opening and friction",
    caution: "a caution window where wealth may stall or expenses dominate",
  };
  const tail = factors.slice(0, 2).join(" ");
  return `${opener}: ${toneText[tone]}. ${tail}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Remedies
// ────────────────────────────────────────────────────────────────────────────

function buildRemedies(
  chart: ChartResponse,
  sig: NatalSignature,
  health: HouseHealth,
): Remedy[] {
  const out: Remedy[] = [];
  const lagna = chart.lagna as Sign;

  // Generic Jupiter remedy if H2 or H11 is weak
  const h2 = health.houses.find((h) => h.house === 2);
  const h11 = health.houses.find((h) => h.house === 11);
  if ((h2 && h2.classification === "weak") || (h11 && h11.classification === "weak")) {
    out.push({
      planet: "Jupiter",
      reason: "Strengthening the natural Dhana-karaka when a wealth house is under-supported.",
      mantra: "Om Gram Greem Graum Sah Gurave Namah",
      gemstone: "Yellow sapphire (with professional guidance and D9/BAV check)",
      charity: "Yellow food (turmeric, chickpeas, bananas) on Thursdays; teach or sponsor learning.",
      note: "Thursday fasts and support to teachers / elders are the classical low-cost remedy.",
    });
  }

  // Remedy for weak/debilitated 2L or 11L
  const twoLord = lordOfHouse(lagna, 2);
  const elevenLord = lordOfHouse(lagna, 11);
  const twoLordSign = planetSign(chart, twoLord);
  const elevenLordSign = planetSign(chart, elevenLord);
  if (twoLordSign && isDebilitated(twoLord, twoLordSign)) {
    out.push({
      planet: twoLord,
      reason: `${twoLord} (2nd lord) is debilitated — direct wealth lord needs strengthening.`,
      mantra: planetMantra(twoLord),
      note: "Check for Neecha Bhanga Raja Yoga before gemstones.",
    });
  }
  if (elevenLordSign && isDebilitated(elevenLord, elevenLordSign)) {
    out.push({
      planet: elevenLord,
      reason: `${elevenLord} (11th lord) is debilitated — gains-lord needs strengthening.`,
      mantra: planetMantra(elevenLord),
      note: "Check for Neecha Bhanga Raja Yoga before gemstones.",
    });
  }

  // Warning-driven remedies
  for (const w of sig.warnings) {
    if (w.rule.slug.toLowerCase().includes("daridra")) {
      out.push({
        planet: "Lakshmi",
        reason: "Daridra (poverty) signature flagged in chart.",
        charity: "Friday evening Lakshmi puja; feed the poor on Fridays; maintain a clean Ishan corner at home.",
        note: "Classical remedy: sincere Sri Sukta recitation on Fridays.",
      });
    }
    if (w.rule.slug.toLowerCase().includes("kemadruma")) {
      out.push({
        planet: "Moon",
        reason: "Kema Druma yoga detected — emotional and liquidity isolation signature.",
        mantra: "Om Som Somaya Namah",
        charity: "White foods (milk, rice) to the elderly on Mondays.",
        note: "Building close supportive relationships is itself a remedy for Kema Druma.",
      });
    }
  }

  return out;
}

function planetMantra(planet: string): string {
  const map: Record<string, string> = {
    Sun: "Om Hram Hrim Hraum Sah Suryaya Namah",
    Moon: "Om Shram Shrim Shraum Sah Chandraya Namah",
    Mars: "Om Kram Krim Kraum Sah Bhaumaya Namah",
    Mercury: "Om Bram Brim Braum Sah Budhaya Namah",
    Jupiter: "Om Gram Greem Graum Sah Gurave Namah",
    Venus: "Om Dram Drim Draum Sah Shukraya Namah",
    Saturn: "Om Pram Prim Praum Sah Shanaye Namah",
  };
  return map[planet] ?? "";
}

// ────────────────────────────────────────────────────────────────────────────
// Verdict
// ────────────────────────────────────────────────────────────────────────────

function buildVerdict(
  sig: NatalSignature,
  health: HouseHealth,
  savings: SavingsAxis,
  current: PeriodWealth,
  peaks: PeriodWealth[],
): FinanceVerdict {
  let score = 50;

  // Yogas
  score += sig.dhanaYogas.length * 6;
  score += sig.supportingYogas.length * 3;
  score -= sig.warnings.length * 7;

  // House health
  const h2 = health.houses.find((h) => h.house === 2);
  const h11 = health.houses.find((h) => h.house === 11);
  if (h2?.classification === "abundant") score += 6;
  else if (h2?.classification === "healthy") score += 3;
  else if (h2?.classification === "weak") score -= 5;
  if (h11?.classification === "abundant") score += 6;
  else if (h11?.classification === "healthy") score += 3;
  else if (h11?.classification === "weak") score -= 5;
  if (health.prosperityMeetsClassicalThreshold) score += 5;
  if (!health.gainsExceedExpenses) score -= 5;

  // Savings axis
  score += savings.retentionScore;

  // Current period + peaks
  score += Math.max(-5, current.score - 5);
  score += Math.min(10, peaks.length * 2);

  score = Math.max(0, Math.min(100, score));

  const rating: FinanceVerdict["rating"] =
    score >= 80 ? "Very Strong" :
    score >= 65 ? "Strong" :
    score >= 50 ? "Moderate" :
    score >= 35 ? "Mixed" :
    "Challenging";

  const parts: string[] = [];
  parts.push(
    `${rating} wealth chart (${score}/100).`,
  );
  if (sig.dhanaYogas.length > 0) {
    parts.push(
      `${sig.dhanaYogas.length} classical Dhana yoga${sig.dhanaYogas.length > 1 ? "s" : ""} detected — the chart carries explicit wealth signatures.`,
    );
  }
  if (peaks.length > 0) {
    const top = peaks[0];
    parts.push(
      `Best wealth window in the next 5 years is the ${top.mahadasha}-${top.antardasha} period starting ${top.startDate.slice(0, 7)}.`,
    );
  }

  return { rating, score, summary: parts.join(" ") };
}

// ────────────────────────────────────────────────────────────────────────────
// Small utilities
// ────────────────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
