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

  return {
    verdict,
    keyPeriods,
    strongIndicators,
    challenges,
    careerNature,
    natalProfile: profile,
  };
}
