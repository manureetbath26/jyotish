/**
 * Jaimini Career Report Generator
 *
 * Takes structured scan results from the career prediction engine and
 * produces a client-ready narrative report.
 *
 * Sections:
 * A. Career Verdict (top-level confidence + top periods)
 * B. Career Timeline (key growth / stagnation periods)
 * C. Natal Career Profile (career nature, sectors, business vs job)
 * D. Strong Growth Indicators
 * E. Career Challenges & Stagnation Risks
 * F. Career Nature & Sector Analysis
 *
 * Sources: Jaimini Sutras, K.N. Rao method, Sanjay Rath commentaries
 */

import type { ChartResponse, PlanetPosition } from "./api";
import {
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  hasJaiminiAspect,
  type Sign,
} from "./charaDashaEngine";
import type { JaiminiPredictionInput } from "./jaiminiPredictiveEngine";
import type {
  CareerWindowScan,
  CareerWindow,
  CareerWindowMonth,
} from "./jaiminiCareerPrediction";

// ────────────────────────────────────────────────────────────────────────────
// Report types
// ────────────────────────────────────────────────────────────────────────────

export interface CareerReport {
  verdict: CareerVerdict;
  keyPeriods: CareerKeyPeriod[];
  strongIndicators: string[];
  challenges: string[];
  careerNature: CareerNatureAnalysis;
  natalProfile: NatalCareerProfile;
  // Enhanced analysis sections
  successAssessment: CareerSuccessAssessment;
  directionAnalysis: CareerDirectionAnalysis;
  growthPotential: GrowthPotential;
  sectorDeepDive: SectorDeepDive;
}

// ─── Career success ────────────────────────────────────────────────────────

export interface CareerSuccessAssessment {
  rating: "Exceptional" | "Strong" | "Good" | "Moderate" | "Gradual";
  score: number; // 0-100
  narrative: string;
  strengths: string[];
  successFactors: { factor: string; impact: "high" | "medium" | "low" }[];
}

// ─── Career direction ─────────────────────────────────────────────────────

export interface CareerDirectionAnalysis {
  /** 2-4 specific career paths ranked by chart fit */
  optimalPaths: OptimalPath[];
  leadership: LeadershipProfile;
  workStyle: WorkStyleProfile;
  collaborationStyle: string;
  collaborationReasoning: string;
}

export interface OptimalPath {
  title: string;           // e.g. "Advisory / Consulting"
  fit: "Best fit" | "Excellent fit" | "Strong fit";
  reasoning: string;       // why this chart supports this path
  specificRoles: string[]; // e.g. ["Management consultant", "Financial advisor"]
}

export interface LeadershipProfile {
  rating: "High" | "Moderate" | "Supportive";
  narrative: string;
  strengths: string[];
}

export interface WorkStyleProfile {
  environment: string;     // e.g. "Structured corporate" | "Flexible/creative"
  environmentReasoning: string;
  pace: string;            // e.g. "Steady", "High-tempo", "Deep-focus"
  paceReasoning: string;
}

// ─── Growth potential ─────────────────────────────────────────────────────

export interface GrowthPotential {
  trajectory: "Early bloomer" | "Steady climb" | "Mid-life peak" | "Late bloomer" | "Uneven";
  trajectoryNarrative: string;
  peakDecades: PeakDecade[];
  accelerators: string[];
  ceilingFactors: string[];
  ceilingNarrative: string;
}

export interface PeakDecade {
  ageRange: string;   // e.g. "Late 30s to Mid 40s"
  intensity: "Peak" | "High" | "Moderate";
  themes: string;     // what characterizes this phase
}

// ─── Sector deep dive ─────────────────────────────────────────────────────

export interface SectorDeepDive {
  topSectors: SectorFit[];
  organizationSize: string;       // "Large corporate", "Mid-size", "Startup/SME", "Solo practice"
  sizeReasoning: string;
  incomeStability: "Stable" | "Variable with upside" | "Mixed";
  incomeNarrative: string;
  wealthAccumulation: "Strong" | "Moderate" | "Gradual";
}

export interface SectorFit {
  sector: string;
  fit: "Perfect fit" | "Excellent fit" | "Strong fit" | "Good fit";
  specificRoles: string[];
  reasoning: string;
}

export interface CareerVerdict {
  topPeriods: string[];
  confidence: "High" | "Medium" | "Low";
  narrative: string;
}

export interface CareerKeyPeriod {
  timeRange: string;
  strength: "Strong" | "Moderate";
  age: number;
  dasha: string;
  startDate: string;
  summary: string;
  interpretations: string[];
  rulesMetList: number[];
  indicates: {
    promotion: boolean;
    jobChange: boolean;
    businessLaunch: boolean;
    recognition: boolean;
    stagnation: boolean;
  };
}

export interface NatalCareerProfile {
  tenthSign: Sign;
  tenthLord: string;
  tenthLordSign: Sign;
  alSign: Sign;
  a10Sign: Sign;
  a10Lord: string;
  a10LordSign: Sign;
  amk: string;
  amkSign: Sign;
  karakamsha: string | null;
  tenthFromKarakamsha: Sign | null;
  planetsIn10thFromKarakamsha: string[];
  beneficsOn10th: string[];
  maleficsOn10th: string[];
  planetsOnA10: string[];
  /** Business partnership indicator: DK connection to AmK */
  dkAmkConnected: boolean;
  dk: string;
  dkSign: Sign;
}

export interface CareerNatureAnalysis {
  /** "Job/Service" | "Business/Entrepreneurship" | "Independent Profession" | "Mixed" */
  primaryMode: string;
  modeExplanation: string;
  /** Sectors suggested by AmK planet + 10th house sign */
  sectors: string[];
  sectorExplanation: string;
  /** Sign-based career themes for current dasha */
  currentDashaTheme: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]);

/** Exaltation/debilitation signs */
const EXALTATION: Record<string, string> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
};
const DEBILITATION: Record<string, string> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
};

/** Own signs for dignity checks */
const OWN_SIGNS: Record<string, Sign[]> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
};

/** Specific roles by AmK planet (deeper than sectors) */
const AMK_SPECIFIC_ROLES: Record<string, string[]> = {
  Sun: ["Civil servant / bureaucrat", "Political leader", "Senior management / CEO", "Medical doctor", "Administrator"],
  Moon: ["Nursing / caregiving", "Hospitality manager", "Psychologist / therapist", "Public relations", "Food industry"],
  Mars: ["Engineer", "Surgeon", "Military officer", "Real estate developer", "Sports professional", "Fitness coach"],
  Mercury: ["Writer / journalist", "Accountant / CPA", "Software engineer", "Trader / broker", "Analyst", "Publisher"],
  Jupiter: ["Management consultant", "Lawyer / legal counsel", "University professor", "Financial advisor", "Spiritual teacher", "Judge"],
  Venus: ["Artist / designer", "Actor / entertainer", "Fashion designer", "Luxury brand manager", "Beauty industry", "Hospitality"],
  Saturn: ["Construction / project manager", "Manufacturing leader", "Agricultural business", "Mining / oil & gas", "Long-term service professional"],
  Rahu: ["Tech entrepreneur", "Foreign trade / export", "Cryptocurrency / fintech", "Research scientist", "Film industry"],
  Ketu: ["Spiritual counselor", "Alternative healer", "Astrologer / occultist", "Software engineer (deep tech)", "Researcher"],
};

/** Career sectors by AmK planet */
const AMK_SECTORS: Record<string, string[]> = {
  Sun: ["Government", "Administration", "Leadership", "Politics", "Authority roles"],
  Moon: ["Public service", "Hospitality", "Healthcare", "Psychology", "Nurturing professions"],
  Mars: ["Military", "Engineering", "Surgery", "Sports", "Competitive fields", "Real estate"],
  Mercury: ["Writing", "Accounting", "Communication", "Commerce", "Technology", "Analysis"],
  Jupiter: ["Teaching", "Law", "Advisory", "Spiritual leadership", "Counseling", "Finance"],
  Venus: ["Arts", "Entertainment", "Luxury goods", "Fashion", "Beauty", "Hospitality"],
  Saturn: ["Labor", "Construction", "Agriculture", "Mining", "Structured service", "Manufacturing"],
  Rahu: ["Technology", "Foreign trade", "Unconventional fields", "Research", "Innovation"],
  Ketu: ["Spiritual work", "Alternative healing", "Research", "Occult sciences", "Software"],
};

/** Career themes by sign of 10th house */
const SIGN_CAREER_THEMES: Record<string, string> = {
  Aries: "Initiative-driven roles, leadership, entrepreneurship, competitive industries",
  Taurus: "Finance, luxury brands, beauty industry, agriculture, hospitality, music/arts",
  Gemini: "Communication, media, teaching, writing, multiple income streams, networking",
  Cancer: "Real estate, hospitality, caretaking, home-based business, food industry",
  Leo: "Government, creative industries, management, entertainment, public recognition roles",
  Virgo: "Healthcare, analysis, service industries, detailed/precision work, quality control",
  Libra: "Law, diplomacy, partnership business, art/design, fashion, negotiation",
  Scorpio: "Research, investigation, crisis management, finance/insurance, transformation roles",
  Sagittarius: "Teaching, publishing, international business, travel, higher education, advisory",
  Capricorn: "Corporate leadership, traditional industries, government, structured authority roles",
  Aquarius: "Technology, innovation, social causes, networking, humanitarian organizations",
  Pisces: "Creative industries, healthcare, spiritual professions, foreign connections, counseling",
};

/** Dasha sign career themes (brief) */
const DASHA_SIGN_THEMES: Record<string, string> = {
  Aries: "A period of initiative, new beginnings, and entrepreneurial energy in your career. Leadership opportunities and bold career moves are favored.",
  Taurus: "Financial stability and material growth become central. Career in arts, luxury, hospitality, or finance-related fields thrives.",
  Gemini: "Communication-driven opportunities, networking, learning, and versatile career paths. Multiple projects or roles may emerge simultaneously.",
  Cancer: "Focus shifts to nurturing, emotionally fulfilling work. Real estate, hospitality, or home-based ventures may gain prominence.",
  Leo: "A period of recognition, visibility, and creative expression in your career. Government or managerial roles are highlighted.",
  Virgo: "Precision, analysis, and service-oriented work intensifies. Healthcare, quality assurance, or detailed technical roles are favored.",
  Libra: "Partnership-based business thrives. Law, diplomacy, arts, and negotiation-heavy careers see positive developments.",
  Scorpio: "Deep research, transformation, and crisis management themes dominate. Finance, insurance, or investigative careers advance.",
  Sagittarius: "International opportunities, higher education, teaching, and advisory roles gain momentum. Travel-related career growth.",
  Capricorn: "Career ambitions reach peak intensity. Hard work in structured, traditional industries receives recognition and authority.",
  Aquarius: "Innovation, technology, and humanitarian pursuits take center stage. Unconventional career paths become viable and rewarding.",
  Pisces: "Creative, spiritual, and healing professions flourish. Foreign connections or behind-the-scenes work brings career fulfillment.",
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

function planetsInSign(planets: PlanetPosition[], sign: Sign): string[] {
  return planets.filter((p) => p.rashi === sign).map((p) => p.name);
}

function isBenefic(name: string): boolean {
  return BENEFICS.has(name);
}

function yearFromDate(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10);
}

function ageAt(birthYear: number, dateStr: string): number {
  return yearFromDate(dateStr) - birthYear;
}

// ────────────────────────────────────────────────────────────────────────────
// Natal career profile builder
// ────────────────────────────────────────────────────────────────────────────

function buildNatalProfile(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
): NatalCareerProfile {
  const lagna = chart.lagna as Sign;

  // 10th house
  const tenthSign = signAtOffset(lagna, 10);
  const tenthLord = SIGN_LORD[tenthSign];
  const tenthLordPlanet = chart.planets.find((p) => p.name === tenthLord);
  const tenthLordSign = (tenthLordPlanet?.rashi as Sign) || tenthSign;

  // AL
  const alSign = input.arudhaLagna?.padaSign || lagna;

  // A10 (Rajya Pada)
  const a10Pada = input.allPadas.find((p) => p.house === 10);
  const a10Sign = a10Pada?.padaSign || tenthSign;
  const a10Lord = SIGN_LORD[a10Sign];
  const a10LordPlanet = chart.planets.find((p) => p.name === a10Lord);
  const a10LordSign = (a10LordPlanet?.rashi as Sign) || a10Sign;

  // AmK (Amatya Karaka)
  const amk = input.karakas.find((k) => k.role === "Amatyakaraka");
  const amkName = amk?.planet || "Mercury";
  const amkSign = (amk?.rashi as Sign) || lagna;

  // Karakamsha + 10th from Karakamsha
  const karakamsha = input.karakamsha?.karakamsha || null;
  let tenthFromKarakamsha: Sign | null = null;
  let planetsIn10thFromKarakamsha: string[] = [];
  if (karakamsha) {
    tenthFromKarakamsha = signAtOffset(karakamsha as Sign, 10);
    planetsIn10thFromKarakamsha = planetsInSign(chart.planets, tenthFromKarakamsha);
  }

  // Planets in 10th house
  const planetsIn10th = planetsInSign(chart.planets, tenthSign);
  const beneficsOn10th = planetsIn10th.filter(isBenefic);
  const maleficsOn10th = planetsIn10th.filter((n) => MALEFICS.has(n));

  // Planets on A10
  const planetsOnA10 = planetsInSign(chart.planets, a10Sign);

  // DK (for business partnership analysis)
  const dk = input.karakas.find((k) => k.role === "Darakaraka");
  const dkName = dk?.planet || "Venus";
  const dkSign = (dk?.rashi as Sign) || lagna;

  // DK ↔ AmK connection (business partnership indicator)
  const dkAmkConnected =
    dkSign === amkSign || hasJaiminiAspect(dkSign, amkSign);

  return {
    tenthSign,
    tenthLord,
    tenthLordSign,
    alSign,
    a10Sign,
    a10Lord,
    a10LordSign,
    amk: amkName,
    amkSign,
    karakamsha,
    tenthFromKarakamsha,
    planetsIn10thFromKarakamsha,
    beneficsOn10th,
    maleficsOn10th,
    planetsOnA10,
    dkAmkConnected,
    dk: dkName,
    dkSign,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Career nature analysis
// ────────────────────────────────────────────────────────────────────────────

function analyzeCareerNature(
  profile: NatalCareerProfile,
  input: JaiminiPredictionInput,
  chart: ChartResponse,
): CareerNatureAnalysis {
  const lagna = chart.lagna as Sign;

  // ── Determine primary mode: Job vs Business vs Independent ──
  let primaryMode: string;
  let modeExplanation: string;

  // Check for business indicators
  const businessFactors: string[] = [];
  if (profile.dkAmkConnected) {
    businessFactors.push("Darakaraka connects with Amatya Karaka (partnership in career)");
  }
  // Kendra placement of DK
  const kendras = [1, 4, 7, 10].map((h) => signAtOffset(lagna, h));
  if (kendras.includes(profile.dkSign)) {
    businessFactors.push("Darakaraka in a kendra house (strong partnership potential)");
  }
  // Fire/Air 10th sign = entrepreneurial
  const fireAir = ["Aries", "Leo", "Sagittarius", "Gemini", "Libra", "Aquarius"];
  if (fireAir.includes(profile.tenthSign)) {
    businessFactors.push(`10th house in ${profile.tenthSign} (entrepreneurial/independent energy)`);
  }
  // Sun or Mars in 10th
  if (profile.maleficsOn10th.includes("Sun") || profile.maleficsOn10th.includes("Mars")) {
    businessFactors.push("Sun/Mars in 10th house (leadership-driven career)");
  }

  // Check for service/job indicators
  const jobFactors: string[] = [];
  const earthWater = ["Taurus", "Virgo", "Capricorn", "Cancer", "Scorpio", "Pisces"];
  if (earthWater.includes(profile.tenthSign)) {
    jobFactors.push(`10th house in ${profile.tenthSign} (structured/service-oriented energy)`);
  }
  if (profile.maleficsOn10th.includes("Saturn")) {
    jobFactors.push("Saturn in 10th (service, labor, disciplined work structure)");
  }
  // 6th house connection (service)
  const sixthSign = signAtOffset(lagna, 6);
  const amkIn6th = profile.amkSign === sixthSign;
  if (amkIn6th) {
    jobFactors.push("Amatya Karaka in 6th house (service-oriented career)");
  }

  if (businessFactors.length >= 3) {
    primaryMode = "Business/Entrepreneurship";
    modeExplanation = `Your chart has strong entrepreneurial indicators: ${businessFactors.slice(0, 2).join("; ")}. Business ventures and self-directed career paths are naturally supported.`;
  } else if (businessFactors.length >= 2 && jobFactors.length <= 1) {
    primaryMode = "Independent Profession";
    modeExplanation = `Your chart suggests a self-directed or independent professional path rather than traditional employment. ${businessFactors[0]}.`;
  } else if (jobFactors.length >= 2) {
    primaryMode = "Job/Service";
    modeExplanation = `Your chart supports structured, service-oriented career paths: ${jobFactors.slice(0, 2).join("; ")}. Salaried positions or organized work environments bring stability.`;
  } else {
    primaryMode = "Mixed";
    modeExplanation = `Your chart shows both entrepreneurial and service-oriented tendencies. Career may alternate between employment and independent ventures at different life stages.`;
  }

  // ── Sectors from AmK planet + 10th house sign ──
  const amkSectors = AMK_SECTORS[profile.amk] || ["General professional services"];
  const signTheme = SIGN_CAREER_THEMES[profile.tenthSign] || "";

  // Combine AmK sectors with 10th house theme
  const sectorExplanation =
    `Your Amatya Karaka (${profile.amk} — primary career significator) suggests aptitude for ${amkSectors.slice(0, 3).join(", ").toLowerCase()}. ` +
    `The 10th house in ${profile.tenthSign} adds themes of ${signTheme.toLowerCase()}.` +
    (profile.tenthFromKarakamsha
      ? ` The 10th from your Karakamsha (${profile.tenthFromKarakamsha}) reveals your soul's deeper professional calling${
          profile.planetsIn10thFromKarakamsha.length > 0
            ? `, influenced by ${profile.planetsIn10thFromKarakamsha.join(" and ")}`
            : ""
        }.`
      : "");

  // ── Current dasha career theme ──
  const currentDashaSign = input.currentDasha?.sign || null;
  const currentDashaTheme = currentDashaSign
    ? DASHA_SIGN_THEMES[currentDashaSign] || null
    : null;

  return {
    primaryMode,
    modeExplanation,
    sectors: amkSectors,
    sectorExplanation,
    currentDashaTheme,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Natural language generators
// ────────────────────────────────────────────────────────────────────────────

function describeDasha(md: string | null, ad: string | null): string {
  if (md && ad) return `${md}\u2013${ad} Chara Dasha`;
  if (md) return `${md} Chara Dasha`;
  return "the active Chara Dasha";
}

/**
 * Career-specific rule interpretations, Vedic-sourced.
 */
function buildRuleInterpretations(
  rules: number[],
  profile: NatalCareerProfile,
  md: string | null,
  ad: string | null,
): string[] {
  const interps: string[] = [];

  if (rules.includes(1)) {
    interps.push(
      `Saturn's transit activates your career house (${profile.tenthSign}) and its natal position \u2014 this creates the structural readiness for career consolidation, promotions, or taking on greater responsibility.`,
    );
  }
  if (rules.includes(2)) {
    interps.push(
      `Jupiter blesses your career house and social image (${profile.alSign}) simultaneously \u2014 this is highly auspicious in Jaimini astrology, expanding professional opportunities, visibility, and support from mentors or authority figures.`,
    );
  }
  if (rules.includes(3)) {
    interps.push(
      `Mars transits through career-connected positions (${profile.tenthSign}/${profile.a10Sign}), providing the drive, initiative, and decisive energy needed for bold career moves or launches.`,
    );
  }
  if (rules.includes(4)) {
    interps.push(
      `Your Amatya Karaka (${profile.amk} \u2014 the planet signifying your profession) naturally connects with key career houses, creating a strong foundational link between your skills and career opportunities.`,
    );
  }
  if (rules.includes(5)) {
    const dashaLabel = describeDasha(md, ad);
    interps.push(
      `The ${dashaLabel} period activates signs directly connected to your career house, channeling this phase of life toward professional growth, recognition, and achievement.`,
    );
  }
  if (rules.includes(6)) {
    interps.push(
      `Strong planetary influence (Argala) from career significators reinforces the current dasha period, ensuring that professional themes \u2014 promotions, new roles, or recognition \u2014 are actively pushed to the forefront.`,
    );
  }

  return interps;
}

/** Build unique per-window career summary */
function buildWindowSummary(
  w: CareerWindow,
  profile: NatalCareerProfile,
  birthYear: number,
): string {
  const age = ageAt(birthYear, w.startDate);
  const peak = w.months.reduce(
    (best, m) => (m.rulesSatisfied > best.rulesSatisfied ? m : best),
    w.months[0],
  );
  const rules = peak.rulesMetList;
  const duration = w.months.length;
  const dasha = describeDasha(peak.md, peak.ad);

  const hasSaturn = rules.includes(1);
  const hasJupiter = rules.includes(2);
  const hasMars = rules.includes(3);
  const hasAmK = rules.includes(4);
  const hasDashaLink = rules.includes(5);
  const hasArgala = rules.includes(6);

  const transitPlanets: string[] = [];
  if (hasSaturn) transitPlanets.push("Saturn");
  if (hasJupiter) transitPlanets.push("Jupiter");
  if (hasMars) transitPlanets.push("Mars");

  const dashaClause = hasDashaLink
    ? `the ${dasha} period activates career-connected signs`
    : hasArgala
      ? `the ${dasha} period receives Argala from career significators`
      : null;

  // All three transits
  if (transitPlanets.length === 3 && dashaClause) {
    const durNote =
      duration >= 4
        ? ` This alignment sustains across ${duration} months, creating an extended window of professional opportunity.`
        : "";
    return `Around age ${age}, Saturn, Jupiter, and Mars all simultaneously activate your career house (${profile.tenthSign}) and professional reputation factors during the ${dasha}.${durNote}`;
  }

  if (transitPlanets.length === 3) {
    return `Around age ${age}, all three key transit planets converge on your career houses \u2014 a rare triple activation of ${profile.tenthSign} and ${profile.a10Sign} that signals major professional developments.`;
  }

  if (transitPlanets.length === 2 && dashaClause) {
    return `Around age ${age}, ${transitPlanets.join(" and ")} both transit career-sensitive positions while ${dashaClause}, creating a focused window for professional advancement across ${duration} months.`;
  }

  if (transitPlanets.length === 2) {
    return `At age ${age}, ${transitPlanets.join(" and ")} activate your 10th house (${profile.tenthSign}) and career reputation, providing both ${transitPlanets[0] === "Saturn" ? "structural maturity" : transitPlanets[0] === "Jupiter" ? "expansion" : "initiative"} and ${transitPlanets[1] === "Jupiter" ? "auspicious growth" : "decisive energy"}.`;
  }

  if (transitPlanets.length === 1 && dashaClause) {
    const role =
      transitPlanets[0] === "Saturn"
        ? "career structuring and responsibility"
        : transitPlanets[0] === "Jupiter"
          ? "expansion and recognition"
          : "initiative and action";
    return `At age ${age}, ${transitPlanets[0]} brings ${role} to your professional life while ${dashaClause}${hasArgala ? ", reinforced by Argala from career significators" : ""}.`;
  }

  if (dashaClause && hasAmK) {
    return `Around age ${age}, ${dashaClause}, and your Amatya Karaka (${profile.amk}) natively connects to career houses \u2014 dasha and natal factors together emphasize strong professional themes.`;
  }

  if (dashaClause) {
    return `At age ${age}, ${dashaClause}. This ${duration >= 3 ? `extended ${duration}-month` : "focused"} period channels energy toward career growth, new opportunities, or professional recognition.`;
  }

  if (transitPlanets.length > 0) {
    return `Around age ${age}, ${transitPlanets.join(" and ")} activate${transitPlanets.length === 1 ? "s" : ""} career-related positions, opening a ${duration}-month window for professional developments.`;
  }

  return `Around age ${age}, your chart's career factors align through the ${dasha} period, supporting professional growth and achievement themes.`;
}

function determineIndications(w: CareerWindow): CareerKeyPeriod["indicates"] {
  const peak = w.peakScore;
  const duration = w.months.length;
  const peakMonth = w.months.reduce(
    (best, m) => (m.rulesSatisfied > best.rulesSatisfied ? m : best),
    w.months[0],
  );
  const rules = peakMonth.rulesMetList;

  const hasJupiter = rules.includes(2);
  const hasMars = rules.includes(3);
  const hasSaturn = rules.includes(1);

  return {
    promotion: peak >= 4 && hasJupiter,
    jobChange: peak >= 3 && (hasMars || hasSaturn),
    businessLaunch: peak >= 4 && hasMars && duration >= 3,
    recognition: peak >= 5 && hasJupiter,
    stagnation: false, // Growth windows are never stagnation
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Strong indicators / challenges builders
// ────────────────────────────────────────────────────────────────────────────

function buildStrongIndicators(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  windows: CareerWindow[],
): string[] {
  const indicators: string[] = [];
  const lagna = chart.lagna as Sign;

  // AmK analysis
  const amkAspects10th =
    profile.amkSign === profile.tenthSign ||
    hasJaiminiAspect(profile.amkSign, profile.tenthSign);
  if (amkAspects10th) {
    indicators.push(
      `The Amatya Karaka (${profile.amk}) directly influences the 10th house (${profile.tenthSign}), creating a strong natal link between professional capability and career opportunities.`,
    );
  }

  // Benefics on 10th
  if (profile.beneficsOn10th.length > 0) {
    indicators.push(
      `Benefic planet${profile.beneficsOn10th.length > 1 ? "s" : ""} ${profile.beneficsOn10th.join(" and ")} in the 10th house support a harmonious, growth-oriented, and ethically aligned career path.`,
    );
  }

  // Strong A10 lord
  const a10Kendras = [1, 4, 7, 10].some(
    (h) => signAtOffset(lagna, h) === profile.a10LordSign,
  );
  if (a10Kendras) {
    indicators.push(
      `The lord of A10 / Rajya Pada (${profile.a10Lord}) is in a strong angular position (${profile.a10LordSign}), giving stability and public visibility to your professional reputation.`,
    );
  }

  // 10th lord well-placed
  const tenthLordInKendra = [1, 4, 7, 10].some(
    (h) => signAtOffset(lagna, h) === profile.tenthLordSign,
  );
  if (tenthLordInKendra) {
    indicators.push(
      `The 10th house lord (${profile.tenthLord}) occupies a kendra position (${profile.tenthLordSign}), providing strong foundational support for career achievement and authority.`,
    );
  }

  // Benefics in 10th from Karakamsha
  if (profile.planetsIn10thFromKarakamsha.some(isBenefic)) {
    const benefics = profile.planetsIn10thFromKarakamsha.filter(isBenefic);
    indicators.push(
      `${benefics.join(" and ")} in the 10th from Karakamsha indicates a career aligned with your soul's purpose \u2014 work that feels deeply meaningful and naturally fulfilling.`,
    );
  }

  // DK-AmK connection (business partnership)
  if (profile.dkAmkConnected) {
    indicators.push(
      `Your Darakaraka (${profile.dk}) connects with the Amatya Karaka (${profile.amk}), suggesting career advancement through partnerships, collaborations, or a spouse/partner who supports your professional growth.`,
    );
  }

  // Strong windows exist
  const strongCount = windows.filter((w) => w.peakScore >= 5).length;
  if (strongCount > 0) {
    indicators.push(
      `${strongCount} strongly favorable career period${strongCount > 1 ? "s" : ""} found \u2014 multiple planetary factors align simultaneously, creating powerful windows for professional breakthroughs.`,
    );
  }

  return indicators;
}

function buildChallenges(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  windows: CareerWindow[],
): string[] {
  const challenges: string[] = [];
  const lagna = chart.lagna as Sign;

  // Malefics on 10th
  if (profile.maleficsOn10th.length > 0) {
    const maleficNames = profile.maleficsOn10th;
    if (maleficNames.includes("Saturn") && maleficNames.includes("Rahu")) {
      challenges.push(
        `Saturn and Rahu in the 10th house can bring career intensity \u2014 periods of heavy workload, unconventional roles, or pressure from authority. These often lead to eventual mastery but require patience.`,
      );
    } else if (maleficNames.length > 1) {
      challenges.push(
        `${maleficNames.join(" and ")} in the 10th house may bring periods of professional challenges, power struggles, or demanding responsibilities. These influences often forge resilience and depth of experience.`,
      );
    } else {
      const roleMap: Record<string, string> = {
        Saturn: "delays, heavy responsibility, and a slower but steadier career trajectory",
        Mars: "competitive pressures, conflicts with authority, or frequent changes in direction",
        Rahu: "unconventional career paths, sudden shifts, or periods of confusion about professional direction",
        Ketu: "detachment from worldly career ambitions or lack of recognition despite effort",
        Sun: "ego-driven conflicts with superiors or authority figures",
      };
      challenges.push(
        `${maleficNames[0]} in the 10th house may introduce ${roleMap[maleficNames[0]] || "challenging professional dynamics"}. Awareness of this tendency helps navigate it constructively.`,
      );
    }
  }

  // 10th lord in dusthana
  const dusthanas = [6, 8, 12].map((h) => signAtOffset(lagna, h));
  if (dusthanas.includes(profile.tenthLordSign)) {
    const dusthanaHouse = dusthanas.indexOf(profile.tenthLordSign);
    const dusthanaLabels = ["6th (service/competition)", "8th (transformation/hidden)", "12th (foreign/loss)"];
    challenges.push(
      `The 10th house lord (${profile.tenthLord}) is placed in the ${dusthanaLabels[dusthanaHouse]}, which can introduce career obstacles, unexpected changes, or a need to work harder for recognition. This often resolves during favorable dasha periods.`,
    );
  }

  // No strong windows
  const strongWindows = windows.filter((w) => w.peakScore >= 5);
  if (strongWindows.length === 0) {
    const moderateCount = windows.filter((w) => w.peakScore >= 3).length;
    if (moderateCount > 0) {
      challenges.push(
        "No overwhelmingly strong career periods were found, though moderate windows exist. Career growth may come through steady, incremental progress rather than dramatic breakthroughs.",
      );
    } else {
      challenges.push(
        "The transit alignments during the analyzed period show limited simultaneous activation of career factors. Major career shifts may extend beyond the typical timeframe or require more conscious effort.",
      );
    }
  }

  // Malefics affecting A10 (reputation challenges)
  const maleficsOnA10 = profile.planetsOnA10.filter((n) => MALEFICS.has(n));
  if (maleficsOnA10.length > 0) {
    challenges.push(
      `${maleficsOnA10.join(" and ")} ${maleficsOnA10.length === 1 ? "influences" : "influence"} your A10 / Rajya Pada (${profile.a10Sign}), suggesting potential challenges to professional reputation or public image at certain phases. Maintaining integrity and patience builds lasting recognition.`,
    );
  }

  return challenges;
}

// ────────────────────────────────────────────────────────────────────────────
// Verdict generator
// ────────────────────────────────────────────────────────────────────────────

function generateVerdict(
  windows: CareerWindow[],
  profile: NatalCareerProfile,
  birthYear: number,
  todayStr: string,
): CareerVerdict {
  const strongWindows = windows
    .filter((w) => w.peakScore >= 5)
    .sort((a, b) => b.peakScore - a.peakScore || b.avgScore - a.avgScore);

  const moderateWindows = windows
    .filter((w) => w.peakScore >= 3 && w.peakScore < 5)
    .sort((a, b) => b.peakScore - a.peakScore);

  const topWindows = [...strongWindows, ...moderateWindows].slice(0, 3);

  if (topWindows.length === 0) {
    return {
      topPeriods: [],
      confidence: "Low",
      narrative:
        "The current analysis does not reveal a high-confidence career breakthrough period. This does not deny professional success \u2014 it suggests that career growth may come through subtle activations, steady effort, or timing beyond the analyzed range.",
    };
  }

  const topLabels = topWindows.map(
    (w) => `${w.months[0].month} \u2013 ${w.months[w.months.length - 1].month}`,
  );

  const confidence: "High" | "Medium" | "Low" =
    strongWindows.length >= 2
      ? "High"
      : strongWindows.length === 1
        ? "High"
        : moderateWindows.length >= 2
          ? "Medium"
          : "Low";

  const best = topWindows[0];
  const bestAge = ageAt(birthYear, best.startDate);
  const bestIsPast = best.endDate < todayStr;

  let narrative: string;

  if (bestIsPast && confidence === "High") {
    narrative = `The strongest career period in your chart was ${topLabels[0]} (around age ${bestAge}). The planetary conditions during this time closely matched classical Jaimini indicators for major professional advancement. If you experienced career milestones during or near this period, the chart strongly confirms that timing.`;
    const futureTop = topWindows.filter((w) => w.endDate >= todayStr);
    if (futureTop.length > 0) {
      const futureAge = ageAt(birthYear, futureTop[0].startDate);
      const futureLabel = `${futureTop[0].months[0].month} \u2013 ${futureTop[0].months[futureTop[0].months.length - 1].month}`;
      narrative += ` Looking ahead, ${futureLabel} (age ${futureAge}) also shows favorable conditions for the next phase of professional growth.`;
    }
  } else if (bestIsPast) {
    narrative = `The most supportive career period was ${topLabels[0]} (around age ${bestAge}). If career advances occurred during this phase, the chart supports that timing.`;
    const futureTop = topWindows.filter((w) => w.endDate >= todayStr);
    if (futureTop.length > 0) {
      const futureAge = ageAt(birthYear, futureTop[0].startDate);
      narrative += ` A future period around age ${futureAge} also shows alignment for professional milestones.`;
    }
  } else if (confidence === "High") {
    narrative = `The most probable career breakthrough period is ${topLabels[0]} (around age ${bestAge}), with strong convergence of transit, dasha, and natal career factors. `;
    if (topWindows.length > 1) {
      const secondAge = ageAt(birthYear, topWindows[1].startDate);
      narrative += `A secondary favorable period around ${topLabels[1]} (age ${secondAge}) also deserves attention. `;
    }
    narrative +=
      "The confidence level is high \u2014 the planetary conditions closely match classical Jaimini indicators for significant career advancement.";
  } else {
    narrative = `The most favorable career period identified is ${topLabels[0]} (around age ${bestAge}), though the alignment is moderate rather than overwhelming. `;
    narrative +=
      "With focused effort, skill development, and openness to opportunities during this time, meaningful career progress is well within reach.";
  }

  return { topPeriods: topLabels, confidence, narrative };
}

// ────────────────────────────────────────────────────────────────────────────
// Career Success Assessment
// ────────────────────────────────────────────────────────────────────────────

function assessCareerSuccess(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  scanWindowCount: { strong: number; moderate: number },
): CareerSuccessAssessment {
  const lagna = chart.lagna as Sign;
  let score = 50; // baseline
  const strengths: string[] = [];
  const successFactors: { factor: string; impact: "high" | "medium" | "low" }[] = [];

  // ── AmK dignity ──
  const amkSign = profile.amkSign;
  if (OWN_SIGNS[profile.amk]?.includes(amkSign)) {
    score += 15;
    strengths.push(`Amatya Karaka ${profile.amk} in own sign (${amkSign}) — exceptional natural aptitude for career`);
    successFactors.push({ factor: `AmK ${profile.amk} in own sign`, impact: "high" });
  } else if (EXALTATION[profile.amk] === amkSign) {
    score += 18;
    strengths.push(`Amatya Karaka ${profile.amk} exalted in ${amkSign} — rare and powerful career significator`);
    successFactors.push({ factor: `AmK ${profile.amk} exalted`, impact: "high" });
  } else if (DEBILITATION[profile.amk] === amkSign) {
    score -= 10;
    successFactors.push({ factor: `AmK ${profile.amk} debilitated`, impact: "high" });
  }

  // ── AmK house placement ──
  const amkHouse = ((SIGN_INDEX[amkSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
  if ([1, 4, 7, 10].includes(amkHouse)) {
    score += 8;
    strengths.push(`Amatya Karaka in kendra (${amkHouse}th house) — career drive and visibility supported`);
    successFactors.push({ factor: `AmK in kendra`, impact: "medium" });
  } else if ([5, 9].includes(amkHouse)) {
    score += 10;
    strengths.push(`Amatya Karaka in trikona (${amkHouse}th house) — fortune and dharma aligned with career`);
    successFactors.push({ factor: `AmK in trikona`, impact: "high" });
  } else if ([6, 8, 12].includes(amkHouse)) {
    score -= 5;
    successFactors.push({ factor: `AmK in dusthana (${amkHouse}th)`, impact: "medium" });
  }

  // ── 10th lord placement ──
  const tenthLordHouse = ((SIGN_INDEX[profile.tenthLordSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
  if ([1, 4, 7, 10].includes(tenthLordHouse)) {
    score += 7;
    strengths.push(`10th lord ${profile.tenthLord} in kendra (${tenthLordHouse}th) — strong foundation for career authority`);
    successFactors.push({ factor: `10th lord in kendra`, impact: "medium" });
  } else if ([5, 9].includes(tenthLordHouse)) {
    score += 8;
    strengths.push(`10th lord ${profile.tenthLord} in trikona (${tenthLordHouse}th) — career aligned with fortune and dharma`);
    successFactors.push({ factor: `10th lord in trikona`, impact: "medium" });
  } else if ([6, 8, 12].includes(tenthLordHouse)) {
    score -= 8;
    successFactors.push({ factor: `10th lord in dusthana`, impact: "medium" });
  }

  // ── Planets on 10th ──
  if (profile.beneficsOn10th.length > 0) {
    score += 5 * profile.beneficsOn10th.length;
    strengths.push(`${profile.beneficsOn10th.join(", ")} in 10th house — blessed with benefic support for career recognition`);
    successFactors.push({ factor: `Benefic${profile.beneficsOn10th.length > 1 ? "s" : ""} in 10th`, impact: "medium" });
  }
  if (profile.maleficsOn10th.length > 0) {
    score -= 3 * profile.maleficsOn10th.length;
    successFactors.push({ factor: `Malefic${profile.maleficsOn10th.length > 1 ? "s" : ""} in 10th`, impact: "medium" });
  }

  // ── A10 benefics ──
  const beneficsOnA10 = profile.planetsOnA10.filter(isBenefic);
  if (beneficsOnA10.length > 0) {
    score += 4 * beneficsOnA10.length;
    strengths.push(`${beneficsOnA10.join(", ")} on A10 / Rajya Pada — favorable professional reputation`);
  }

  // ── DK-AmK business partnership ──
  if (profile.dkAmkConnected) {
    score += 5;
    strengths.push(`Darakaraka connects with Amatya Karaka — partnerships amplify career growth`);
    successFactors.push({ factor: `DK-AmK connection`, impact: "medium" });
  }

  // ── Benefics in 10th from Karakamsha ──
  const beneficsKM = profile.planetsIn10thFromKarakamsha.filter(isBenefic);
  if (beneficsKM.length > 0) {
    score += 6;
    strengths.push(`${beneficsKM.join(", ")} in 10th from Karakamsha — soul-level alignment with chosen career path`);
    successFactors.push({ factor: `Benefics in 10th from KM`, impact: "high" });
  }

  // ── Strong windows factor ──
  if (scanWindowCount.strong >= 5) {
    score += 8;
    successFactors.push({ factor: `${scanWindowCount.strong} strong career windows`, impact: "high" });
  } else if (scanWindowCount.strong >= 2) {
    score += 4;
    successFactors.push({ factor: `${scanWindowCount.strong} strong career windows`, impact: "medium" });
  }

  // ── Clamp & rate ──
  score = Math.max(15, Math.min(100, score));

  let rating: CareerSuccessAssessment["rating"];
  if (score >= 85) rating = "Exceptional";
  else if (score >= 70) rating = "Strong";
  else if (score >= 55) rating = "Good";
  else if (score >= 40) rating = "Moderate";
  else rating = "Gradual";

  // ── Narrative ──
  const narrativeMap: Record<typeof rating, string> = {
    Exceptional: `Your chart shows an exceptional foundation for career success. Multiple classical Jaimini strength indicators align to create rare professional potential. The combination of ${strengths.slice(0, 2).join(" and ").toLowerCase()} creates conditions where ambitious goals are achievable with disciplined execution.`,
    Strong: `Your chart carries strong career success indicators. The Amatya Karaka and 10th house factors are well-supported, giving you a durable foundation for professional achievement. Expect meaningful recognition and stable upward mobility when you align effort with your natural aptitudes.`,
    Good: `Your chart supports a solid career path with good growth potential. While not every indicator is maximally strong, the core career factors are balanced — your success will come through consistent effort, strategic timing, and playing to your documented strengths rather than overnight breakthroughs.`,
    Moderate: `Your chart shows moderate career support — meaningful success is achievable through disciplined, focused effort. Some factors are strong while others require compensation through hard work and skill-building. Choosing the right field (aligned with your Amatya Karaka) is especially important for this chart.`,
    Gradual: `Your chart indicates a gradual career trajectory. Success is attainable but unfolds over time rather than through rapid ascent. Patience, niche expertise, and strategic partnerships are key. Don't measure yourself against fast-climbers — your career rewards depth and endurance.`,
  } as Record<string, string>;

  return {
    rating,
    score,
    narrative: narrativeMap[rating],
    strengths,
    successFactors,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Career Direction Analysis
// ────────────────────────────────────────────────────────────────────────────

function analyzeCareerDirection(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  input: JaiminiPredictionInput,
): CareerDirectionAnalysis {
  const lagna = chart.lagna as Sign;

  // ── Optimal paths ──
  const optimalPaths: OptimalPath[] = [];

  // Primary path: AmK-dominant
  const amkRoles = AMK_SPECIFIC_ROLES[profile.amk] || [];
  optimalPaths.push({
    title: `${AMK_SECTORS[profile.amk]?.[0] || "Professional Services"} & ${AMK_SECTORS[profile.amk]?.[2] || "Advisory"}`,
    fit: "Best fit",
    reasoning: `Your Amatya Karaka ${profile.amk} in ${profile.amkSign} is the strongest career signal in your chart. Professions governed by ${profile.amk} align most deeply with your natural aptitudes and soul's direction. This planet's nature defines your core professional identity.`,
    specificRoles: amkRoles.slice(0, 4),
  });

  // Second path: based on 10th house sign
  const tenthSignRoles: Record<string, string[]> = {
    Aries: ["Entrepreneur / founder", "Sales leader", "Sports/fitness professional", "Military/defense"],
    Taurus: ["Financial services", "Luxury goods / retail", "Arts & design", "Hospitality"],
    Gemini: ["Writer / journalist", "Marketing / PR", "Teacher / trainer", "Communications strategist"],
    Cancer: ["Real estate", "Hospitality / F&B", "Healthcare (caregiving)", "Home services"],
    Leo: ["Senior management", "Entertainment industry", "Government leadership", "Brand-building roles"],
    Virgo: ["Healthcare / medicine", "Analyst / consultant", "Quality / compliance", "Research"],
    Libra: ["Law / legal advisory", "Diplomacy / negotiation", "Design / aesthetics", "Partnership businesses"],
    Scorpio: ["Finance / investment banking", "Research / investigation", "Insurance / risk", "Crisis management"],
    Sagittarius: ["Higher education", "Publishing", "International business", "Law / advisory"],
    Capricorn: ["Corporate executive", "Government / civil service", "Traditional manufacturing", "Long-term institutions"],
    Aquarius: ["Technology / software", "Innovation / R&D", "Social enterprise", "Network-driven roles"],
    Pisces: ["Creative / healing professions", "Spirituality / wellness", "Film / media", "Foreign / pharma"],
  };

  optimalPaths.push({
    title: `Fields connected to ${profile.tenthSign}`,
    fit: "Excellent fit",
    reasoning: `The 10th house (karma sthana) in ${profile.tenthSign} shapes how your career expresses publicly. This sign's qualities — ${SIGN_CAREER_THEMES[profile.tenthSign].toLowerCase()} — are where your career energies naturally flow.`,
    specificRoles: (tenthSignRoles[profile.tenthSign] || []).slice(0, 4),
  });

  // Third path: 10th from Karakamsha (soul direction)
  if (profile.tenthFromKarakamsha) {
    optimalPaths.push({
      title: `Soul-aligned: ${profile.tenthFromKarakamsha} themes`,
      fit: "Strong fit",
      reasoning: `The 10th from Karakamsha reveals your soul's deeper professional calling. ${profile.tenthFromKarakamsha} here suggests that work involving ${SIGN_CAREER_THEMES[profile.tenthFromKarakamsha].toLowerCase()} carries dharmic meaning for you — not just a job, but a calling.${profile.planetsIn10thFromKarakamsha.length > 0 ? ` Influenced by ${profile.planetsIn10thFromKarakamsha.join(" and ")}.` : ""}`,
      specificRoles: (tenthSignRoles[profile.tenthFromKarakamsha] || []).slice(0, 3),
    });
  }

  // ── Leadership ──
  const sunSign = chart.planets.find((p) => p.name === "Sun")?.rashi as Sign;
  const marsSign = chart.planets.find((p) => p.name === "Mars")?.rashi as Sign;
  const sunHouse = sunSign ? ((SIGN_INDEX[sunSign] - SIGN_INDEX[lagna] + 12) % 12) + 1 : 0;
  const sunOnAL = sunSign === profile.alSign;
  const sunOnA10 = sunSign === profile.a10Sign;
  const sunIn10th = sunHouse === 10;
  const marsIn10th = marsSign ? ((SIGN_INDEX[marsSign] - SIGN_INDEX[lagna] + 12) % 12) + 1 === 10 : false;
  const sunAspects10th = sunSign ? hasJaiminiAspect(sunSign, profile.tenthSign) : false;
  const marsAspects10th = marsSign ? hasJaiminiAspect(marsSign, profile.tenthSign) : false;

  const leadershipStrengths: string[] = [];
  let leadershipScore = 0;

  if (sunIn10th) { leadershipScore += 3; leadershipStrengths.push("Sun in 10th house — natural authority and visibility"); }
  if (marsIn10th) { leadershipScore += 3; leadershipStrengths.push("Mars in 10th — drive and decisive action in career"); }
  if (sunOnAL || sunOnA10) { leadershipScore += 2; leadershipStrengths.push(`Sun on ${sunOnAL ? "Arudha Lagna" : "A10"} — public recognition and authority`); }
  if (sunAspects10th) { leadershipScore += 1; leadershipStrengths.push("Sun aspects 10th house — authority shapes your career expression"); }
  if (marsAspects10th) { leadershipScore += 1; leadershipStrengths.push("Mars aspects 10th house — courage and initiative in professional life"); }
  if (profile.beneficsOn10th.includes("Jupiter")) { leadershipScore += 1; leadershipStrengths.push("Jupiter influence on career — wise, mentorship-style leadership"); }

  let leadershipRating: LeadershipProfile["rating"];
  let leadershipNarrative: string;
  if (leadershipScore >= 5) {
    leadershipRating = "High";
    leadershipNarrative = "Your chart indicates strong leadership capacity. You have the natal fire to command rooms, drive decisions, and take frontline authority. CEO-track, founder, or senior executive roles are natural fits.";
  } else if (leadershipScore >= 2) {
    leadershipRating = "Moderate";
    leadershipNarrative = "Your chart shows balanced leadership potential. You can lead effectively but don't need the top chair to thrive — often better as a senior expert, trusted deputy, or team lead than as ultimate authority. Influence through expertise beats command through hierarchy.";
  } else {
    leadershipRating = "Supportive";
    leadershipNarrative = "Your chart favors a supportive or advisory stance over frontline leadership. This is not a weakness — some of the most respected professionals are specialists, deputies, or trusted advisors whose influence runs deeper than any title. Play to this strength rather than forcing yourself into visibility roles.";
  }

  // ── Work style ──
  const saturnSign = chart.planets.find((p) => p.name === "Saturn")?.rashi as Sign;
  const saturnInfluences10th =
    saturnSign === profile.tenthSign ||
    (saturnSign && hasJaiminiAspect(saturnSign, profile.tenthSign));
  const jupiterInfluences10th =
    chart.planets.find((p) => p.name === "Jupiter")?.rashi === profile.tenthSign ||
    hasJaiminiAspect(
      chart.planets.find((p) => p.name === "Jupiter")?.rashi as Sign,
      profile.tenthSign,
    );

  const earthSigns: Sign[] = ["Taurus", "Virgo", "Capricorn"];
  const fireSigns: Sign[] = ["Aries", "Leo", "Sagittarius"];
  const airSigns: Sign[] = ["Gemini", "Libra", "Aquarius"];

  let environment: string;
  let environmentReasoning: string;
  if (earthSigns.includes(profile.tenthSign) || saturnInfluences10th) {
    environment = "Structured / established organizations";
    environmentReasoning = `Your 10th house in ${profile.tenthSign}${saturnInfluences10th ? " with Saturn influence" : ""} suggests you thrive in established, rule-based environments — traditional corporations, government, or long-established institutions where processes are clear.`;
  } else if (fireSigns.includes(profile.tenthSign)) {
    environment = "Fast-moving / entrepreneurial";
    environmentReasoning = `Your 10th house in ${profile.tenthSign} (a fire sign) indicates you thrive in dynamic, high-energy environments — startups, founder-led companies, or sales-driven cultures where speed and bold action matter.`;
  } else if (airSigns.includes(profile.tenthSign)) {
    environment = "Network / collaboration-driven";
    environmentReasoning = `Your 10th house in ${profile.tenthSign} (an air sign) thrives in networked, idea-driven environments — consultancies, media, technology, or any role where communication and horizontal collaboration matter more than rigid hierarchy.`;
  } else {
    environment = "Mission-driven / relational";
    environmentReasoning = `Your 10th house in ${profile.tenthSign} (a water sign) draws you to work with emotional meaning — healthcare, hospitality, creative industries, or purpose-driven organizations where people matter as much as process.`;
  }

  let pace: string;
  let paceReasoning: string;
  if (saturnInfluences10th && !jupiterInfluences10th) {
    pace = "Deep-focus, long-horizon";
    paceReasoning = "Saturn's influence rewards patience and depth over sprinting. Long-cycle projects, research, and craft-mastery pay off more than rapid-fire task completion.";
  } else if (jupiterInfluences10th) {
    pace = "Expansive, opportunity-driven";
    paceReasoning = "Jupiter's influence favors working where you can keep growing — roles that let you learn, teach, expand scope, and take on increasingly larger responsibilities over time.";
  } else if (marsIn10th || marsAspects10th) {
    pace = "High-tempo, action-oriented";
    paceReasoning = "Mars's influence on career makes you thrive when there's movement, competition, and clear wins to chase. Low-energy environments drain you.";
  } else {
    pace = "Steady, rhythmic";
    paceReasoning = "Your chart favors a balanced pace — not too frantic, not too slow. Roles with predictable rhythms and clear deliverables suit you best.";
  }

  // ── Collaboration style ──
  let collaborationStyle: string;
  let collaborationReasoning: string;
  if (profile.dkAmkConnected) {
    collaborationStyle = "Partnership-driven";
    collaborationReasoning = `Your Darakaraka ${profile.dk} connects with Amatya Karaka ${profile.amk} — your best career outcomes come through co-founders, trusted partners, or close working relationships rather than solo pursuits. A strong anchor relationship multiplies your career trajectory.`;
  } else {
    // Check DK placement
    const dkHouse = ((SIGN_INDEX[profile.dkSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(dkHouse)) {
      collaborationStyle = "Collaborative with anchor partners";
      collaborationReasoning = `Darakaraka in kendra (${dkHouse}th house) suggests partnerships support career but aren't strictly required. You can go solo but do better with a close collaborator or spouse who supports your professional path.`;
    } else {
      collaborationStyle = "Independent / self-directed";
      collaborationReasoning = "Your chart favors self-driven career rhythms. You don't need a partner to execute — in fact, freedom to operate on your own terms often produces better results than forced collaboration.";
    }
  }

  return {
    optimalPaths,
    leadership: {
      rating: leadershipRating,
      narrative: leadershipNarrative,
      strengths: leadershipStrengths,
    },
    workStyle: {
      environment,
      environmentReasoning,
      pace,
      paceReasoning,
    },
    collaborationStyle,
    collaborationReasoning,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Growth Potential
// ────────────────────────────────────────────────────────────────────────────

function analyzeGrowthPotential(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  windows: CareerWindow[],
  birthYear: number,
): GrowthPotential {
  // ── Bucket windows by life decade ──
  const bucketScores: Record<string, number> = {
    "teens": 0, "20s": 0, "30s": 0, "40s": 0, "50s": 0, "60s+": 0,
  };
  for (const w of windows) {
    const age = yearFromDate(w.startDate) - birthYear;
    const score = w.peakScore;
    if (age < 20) bucketScores["teens"] += score;
    else if (age < 30) bucketScores["20s"] += score;
    else if (age < 40) bucketScores["30s"] += score;
    else if (age < 50) bucketScores["40s"] += score;
    else if (age < 60) bucketScores["50s"] += score;
    else bucketScores["60s+"] += score;
  }

  // ── Identify peak decades ──
  const sorted = Object.entries(bucketScores).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).filter(([, v]) => v > 0);

  const decadeToAge: Record<string, string> = {
    "teens": "Teens",
    "20s": "20s",
    "30s": "30s",
    "40s": "40s",
    "50s": "50s",
    "60s+": "60s and beyond",
  };

  const decadeThemes: Record<string, string> = {
    "teens": "foundational skills, education, early identity formation",
    "20s": "establishing career, building craft, exploring directions",
    "30s": "acceleration, senior roles, defining professional identity",
    "40s": "leadership, mastery, authority, peak influence",
    "50s": "recognition, consolidation, legacy-building",
    "60s+": "advisory roles, wisdom-sharing, mentorship, reduced intensity",
  };

  const peakDecades: PeakDecade[] = top3.map(([bucket, score], i) => ({
    ageRange: decadeToAge[bucket],
    intensity: i === 0 ? "Peak" : i === 1 ? "High" : "Moderate",
    themes: decadeThemes[bucket],
  }));

  // ── Determine trajectory ──
  const earlyScore = bucketScores["teens"] + bucketScores["20s"];
  const midScore = bucketScores["30s"] + bucketScores["40s"];
  const lateScore = bucketScores["50s"] + bucketScores["60s+"];

  let trajectory: GrowthPotential["trajectory"];
  let trajectoryNarrative: string;

  if (earlyScore > midScore * 1.3 && earlyScore > lateScore) {
    trajectory = "Early bloomer";
    trajectoryNarrative = "Your chart shows the strongest career activation in your teens and 20s — early success is well-supported. Leverage this by committing to your field early, building a reputation young, and compounding that momentum into later decades.";
  } else if (midScore > earlyScore * 1.2 && midScore > lateScore * 1.2) {
    trajectory = "Mid-life peak";
    trajectoryNarrative = "Your chart concentrates career strength in your 30s and 40s — this is when you'll hit your stride. Don't judge yourself harshly against early-bloomer peers; your runway is longer and the peak altitude is higher. Use earlier years to build depth, relationships, and craft.";
  } else if (lateScore > earlyScore * 1.2 && lateScore > midScore * 0.9) {
    trajectory = "Late bloomer";
    trajectoryNarrative = "Your chart favors later-life achievement. Major recognition, authority, and the most meaningful work often arrive in your 50s and beyond. Patience is not optional — it's your superpower. Many of the most respected late-career figures have this pattern.";
  } else if (midScore > 0 && earlyScore > 0 && lateScore > 0 &&
    Math.max(earlyScore, midScore, lateScore) < Math.min(earlyScore, midScore, lateScore) * 1.8) {
    trajectory = "Steady climb";
    trajectoryNarrative = "Your chart shows balanced career support across decades — no dramatic spike, no crash, just steady progression. This is a deeply favorable pattern for long-term stability: each decade builds on the previous one.";
  } else {
    trajectory = "Uneven";
    trajectoryNarrative = "Your chart shows uneven career rhythm — strong windows interspersed with quieter phases. Learn to ride the high-intensity periods hard and use quieter phases for consolidation and skill-building rather than forcing growth when conditions aren't supportive.";
  }

  // ── Accelerators ──
  const accelerators: string[] = [];
  if (OWN_SIGNS[profile.amk]?.includes(profile.amkSign) || EXALTATION[profile.amk] === profile.amkSign) {
    accelerators.push(`Amatya Karaka ${profile.amk} is at dignity — strong natural talent accelerates career rise`);
  }
  if (profile.dkAmkConnected) {
    accelerators.push("Darakaraka-Amatya Karaka connection — right partnerships dramatically speed up growth");
  }
  if (profile.beneficsOn10th.length > 0) {
    accelerators.push(`Benefic${profile.beneficsOn10th.length > 1 ? "s" : ""} on 10th house (${profile.beneficsOn10th.join(", ")}) — smoothes path to recognition and advancement`);
  }
  if (profile.planetsIn10thFromKarakamsha.some(isBenefic)) {
    accelerators.push(`Benefic in 10th from Karakamsha — working in a field aligned with your soul's purpose amplifies growth substantially`);
  }
  const strongWindows = windows.filter((w) => w.peakScore >= 5).length;
  if (strongWindows >= 3) {
    accelerators.push(`${strongWindows} strong career windows across your lifetime — multiple major opportunities for meaningful leaps`);
  }
  if (accelerators.length === 0) {
    accelerators.push("Consistent effort, skill-building, and right timing (during favorable dasha-transit alignments) will be your primary accelerators");
  }

  // ── Ceiling factors ──
  const ceilingFactors: string[] = [];
  if (profile.maleficsOn10th.length >= 2) {
    ceilingFactors.push(`Multiple malefics (${profile.maleficsOn10th.join(", ")}) in 10th house — career can be intense but volatile; some roles may hit ceilings faster than expected`);
  } else if (profile.maleficsOn10th.length === 1) {
    ceilingFactors.push(`${profile.maleficsOn10th[0]} in 10th house — expect periodic tests of patience and conflict with authority that shape the pace of your rise`);
  }
  const tenthLordHouse = ((SIGN_INDEX[profile.tenthLordSign] - SIGN_INDEX[chart.lagna as Sign] + 12) % 12) + 1;
  if ([6, 8, 12].includes(tenthLordHouse)) {
    ceilingFactors.push(`10th lord in ${tenthLordHouse}th house (dusthana) — career may require more effort for recognition than your peers; rewards often delayed or hidden`);
  }
  if (DEBILITATION[profile.amk] === profile.amkSign) {
    ceilingFactors.push(`Amatya Karaka ${profile.amk} debilitated — strongly consider choosing a field that works WITH ${profile.amk}'s natural themes rather than against them; mismatch creates ceiling`);
  }
  if (profile.planetsOnA10.filter((n) => MALEFICS.has(n)).length > 0) {
    ceilingFactors.push(`Malefic(s) on A10 — public reputation faces periodic challenges; protect your professional brand actively`);
  }

  let ceilingNarrative: string;
  if (ceilingFactors.length === 0) {
    ceilingNarrative = "Your chart shows no major ceiling factors — the sky is genuinely the limit for disciplined effort. Few structural barriers exist in your career arc.";
  } else if (ceilingFactors.length <= 2) {
    ceilingNarrative = "Your chart has a few ceiling factors to be aware of. These are not barriers to success — they're tendencies that, once recognized, can be worked around or even turned into strengths.";
  } else {
    ceilingNarrative = "Your chart has several ceiling factors that shape the rate and pattern of career growth. Understanding them is the first step to navigating around them effectively. None are absolute blocks — they're shaping forces.";
  }

  return {
    trajectory,
    trajectoryNarrative,
    peakDecades,
    accelerators,
    ceilingFactors,
    ceilingNarrative,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Sector Deep Dive
// ────────────────────────────────────────────────────────────────────────────

function deepDiveSectors(
  profile: NatalCareerProfile,
  chart: ChartResponse,
  input: JaiminiPredictionInput,
): SectorDeepDive {
  const lagna = chart.lagna as Sign;

  // ── Build top sectors combining AmK + 10th house + 10th from KM ──
  const amkSectors = AMK_SECTORS[profile.amk] || [];
  const amkRoles = AMK_SPECIFIC_ROLES[profile.amk] || [];

  const topSectors: SectorFit[] = [];

  // Perfect fit: AmK-aligned
  if (amkSectors.length > 0) {
    topSectors.push({
      sector: amkSectors.slice(0, 2).join(" / "),
      fit: "Perfect fit",
      specificRoles: amkRoles.slice(0, 3),
      reasoning: `Your Amatya Karaka is ${profile.amk}, the natural significator for these fields. ${OWN_SIGNS[profile.amk]?.includes(profile.amkSign) ? "Its placement in own sign makes this alignment especially powerful." : EXALTATION[profile.amk] === profile.amkSign ? "Its exaltation amplifies natural aptitude in these fields." : DEBILITATION[profile.amk] === profile.amkSign ? "Despite debilitation, working in these AmK-governed fields is still your best alignment — the challenge itself refines mastery." : "These fields draw on your natal aptitudes most directly."}`,
    });
  }

  // Excellent fit: 10th house themes
  const tenthHouseRoles: Record<string, string[]> = {
    Aries: ["Founder/entrepreneur", "Sales leader", "Defense/security"],
    Taurus: ["Finance/banking", "Luxury retail", "Arts management"],
    Gemini: ["Journalism/media", "Training/education", "Marketing"],
    Cancer: ["Real estate", "Hospitality management", "Healthcare"],
    Leo: ["Executive/C-suite", "Entertainment", "Government"],
    Virgo: ["Medicine/healthcare", "Audit/compliance", "Analytics"],
    Libra: ["Law/advocacy", "Design", "HR/mediation"],
    Scorpio: ["Investment/finance", "Research", "Insurance"],
    Sagittarius: ["Higher education", "International trade", "Publishing"],
    Capricorn: ["Corporate management", "Public sector", "Industrial"],
    Aquarius: ["Technology", "R&D", "Non-profit"],
    Pisces: ["Creative/arts", "Pharmaceuticals", "Spiritual/wellness"],
  };
  topSectors.push({
    sector: `${profile.tenthSign}-themed fields`,
    fit: "Excellent fit",
    specificRoles: tenthHouseRoles[profile.tenthSign] || [],
    reasoning: `The 10th house (karma sthana) in ${profile.tenthSign} shapes how career expresses publicly. These fields carry the signature energy of ${profile.tenthSign} and will feel naturally aligned with how you want to show up professionally.`,
  });

  // Strong fit: 10th from Karakamsha
  if (profile.tenthFromKarakamsha && profile.tenthFromKarakamsha !== profile.tenthSign) {
    topSectors.push({
      sector: `Soul calling: ${profile.tenthFromKarakamsha} fields`,
      fit: "Strong fit",
      specificRoles: tenthHouseRoles[profile.tenthFromKarakamsha] || [],
      reasoning: `The 10th from Karakamsha reveals your soul's deeper professional calling${profile.planetsIn10thFromKarakamsha.length > 0 ? `, with ${profile.planetsIn10thFromKarakamsha.join(" and ")} shaping it` : ""}. Work in this direction carries meaning beyond income — it aligns with your dharmic purpose.`,
    });
  }

  // Good fit: DK-driven partnership business
  if (profile.dkAmkConnected) {
    topSectors.push({
      sector: `Partnership-based ventures`,
      fit: "Good fit",
      specificRoles: ["Co-founded ventures", "Partnership firms", "Joint advisory practice"],
      reasoning: `Your Darakaraka ${profile.dk} connects with Amatya Karaka ${profile.amk}. Partnerships and collaborative businesses across any of the above fields amplify outcomes compared to solo pursuits.`,
    });
  }

  // ── Organization size ──
  const saturnSign = chart.planets.find((p) => p.name === "Saturn")?.rashi as Sign;
  const saturnHouse = saturnSign ? ((SIGN_INDEX[saturnSign] - SIGN_INDEX[lagna] + 12) % 12) + 1 : 0;
  const marsSign = chart.planets.find((p) => p.name === "Mars")?.rashi as Sign;
  const marsInKendra = marsSign ? [1, 4, 7, 10].some((h) => ((SIGN_INDEX[marsSign] - SIGN_INDEX[lagna] + 12) % 12) + 1 === h) : false;

  let organizationSize: string;
  let sizeReasoning: string;
  const earthSigns: Sign[] = ["Taurus", "Virgo", "Capricorn"];

  if (saturnHouse === 10 || (saturnSign && earthSigns.includes(profile.tenthSign))) {
    organizationSize = "Large corporate / established institutions";
    sizeReasoning = "Saturn's career influence favors scale and structure. Large corporations, government, or long-established institutions provide the rigour and predictability that match your chart's rhythm.";
  } else if (marsInKendra && profile.dkAmkConnected) {
    organizationSize = "Mid-size / startup / partnership firm";
    sizeReasoning = "Strong Mars and partnership indicators favor agile environments — mid-size firms, growth-stage startups, or small partnership practices where you can have outsized impact.";
  } else if (profile.maleficsOn10th.includes("Rahu") || profile.maleficsOn10th.includes("Ketu")) {
    organizationSize = "Innovative / unconventional organizations";
    sizeReasoning = "Rahu/Ketu influence on career draws you toward unconventional or cutting-edge organizations — early-stage tech, creative studios, or foreign multinationals rather than traditional domestic firms.";
  } else {
    organizationSize = "Mid-size to solo practice";
    sizeReasoning = "Your chart fits mid-size organizations where you can be a meaningful voice, or eventually a solo/boutique practice where you control the terms.";
  }

  // ── Income stability ──
  const secondSign = signAtOffset(lagna, 2);
  const eleventhSign = signAtOffset(lagna, 11);
  const secondLord = SIGN_LORD[secondSign];
  const eleventhLord = SIGN_LORD[eleventhSign];
  const secondLordSign = (chart.planets.find((p) => p.name === secondLord)?.rashi as Sign) || secondSign;
  const eleventhLordSign = (chart.planets.find((p) => p.name === eleventhLord)?.rashi as Sign) || eleventhSign;
  const secondLordHouse = ((SIGN_INDEX[secondLordSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
  const eleventhLordHouse = ((SIGN_INDEX[eleventhLordSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
  const beneficsIn2nd = planetsInSign(chart.planets, secondSign).filter(isBenefic);
  const beneficsIn11th = planetsInSign(chart.planets, eleventhSign).filter(isBenefic);

  let incomeStability: SectorDeepDive["incomeStability"];
  let incomeNarrative: string;
  let wealthAccumulation: SectorDeepDive["wealthAccumulation"];

  const stableFactors = [
    [1, 4, 7, 10].includes(secondLordHouse),
    [1, 4, 7, 10].includes(eleventhLordHouse),
    beneficsIn2nd.length > 0,
    beneficsIn11th.length > 0,
  ].filter(Boolean).length;

  if (stableFactors >= 3) {
    incomeStability = "Stable";
    wealthAccumulation = "Strong";
    incomeNarrative = "Your 2nd and 11th houses (wealth and gains) are well-supported. Expect stable income with solid capacity for wealth accumulation. Career choices that compound earnings over time (equity, seniority, built reputation) work well here.";
  } else if (stableFactors >= 2) {
    incomeStability = "Variable with upside";
    wealthAccumulation = "Moderate";
    incomeNarrative = "Income flow may have some variability but has real upside potential. A mix of stable base (salary, retainer) with variable components (bonuses, equity, project fees) fits your chart well.";
  } else {
    incomeStability = "Mixed";
    wealthAccumulation = "Gradual";
    incomeNarrative = "Income patterns in your chart require more active management — diversify income sources, protect against lean phases, and focus on gradually building wealth rather than expecting rapid capital accumulation.";
  }

  return {
    topSectors,
    organizationSize,
    sizeReasoning,
    incomeStability,
    incomeNarrative,
    wealthAccumulation,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main report generator
// ────────────────────────────────────────────────────────────────────────────

const MIN_CAREER_AGE = 16;

export function generateCareerReport(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
  scan: CareerWindowScan,
  options: {
    futureOnly?: boolean;
    birthYear?: number;
  } = {},
): CareerReport {
  const futureOnly = options.futureOnly ?? false;
  const birthYear = options.birthYear ?? yearFromDate(chart.date);

  const profile = buildNatalProfile(input, chart);

  // Filter windows
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const windows = (futureOnly
    ? scan.windows.filter((w) => w.endDate >= todayStr)
    : scan.windows
  ).filter((w) => ageAt(birthYear, w.startDate) >= MIN_CAREER_AGE);

  // ── Key Periods (chronological) ──
  const keyPeriods: CareerKeyPeriod[] = windows
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((w) => {
      const peak = w.months.reduce(
        (best, m) => (m.rulesSatisfied > best.rulesSatisfied ? m : best),
        w.months[0],
      );
      const age = ageAt(birthYear, w.startDate);
      const strength: "Strong" | "Moderate" =
        w.peakScore >= 5 ? "Strong" : "Moderate";
      const dashaLabel = describeDasha(peak.md, peak.ad);

      return {
        timeRange:
          w.startMonth === w.endMonth
            ? w.startMonth
            : `${w.startMonth} \u2013 ${w.endMonth}`,
        strength,
        age,
        startDate: w.startDate,
        dasha: dashaLabel,
        summary: buildWindowSummary(w, profile, birthYear),
        interpretations: buildRuleInterpretations(
          peak.rulesMetList,
          profile,
          peak.md,
          peak.ad,
        ),
        rulesMetList: peak.rulesMetList,
        indicates: determineIndications(w),
      };
    });

  // ── Strong Indicators ──
  const strongIndicators = buildStrongIndicators(profile, chart, windows);

  // ── Challenges ──
  const challenges = buildChallenges(profile, chart, windows);

  // ── Verdict ──
  const verdict = generateVerdict(windows, profile, birthYear, todayStr);

  // ── Career Nature ──
  const careerNature = analyzeCareerNature(profile, input, chart);

  // ── Enhanced analysis ──
  const windowCount = {
    strong: windows.filter((w) => w.peakScore >= 5).length,
    moderate: windows.filter((w) => w.peakScore >= 3 && w.peakScore < 5).length,
  };
  const successAssessment = assessCareerSuccess(profile, chart, windowCount);
  const directionAnalysis = analyzeCareerDirection(profile, chart, input);
  const growthPotential = analyzeGrowthPotential(profile, chart, windows, birthYear);
  const sectorDeepDive = deepDiveSectors(profile, chart, input);

  return {
    verdict,
    keyPeriods,
    strongIndicators,
    challenges,
    careerNature,
    natalProfile: profile,
    successAssessment,
    directionAnalysis,
    growthPotential,
    sectorDeepDive,
  };
}
