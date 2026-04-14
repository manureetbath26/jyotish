/**
 * Jaimini Marriage Report Generator
 *
 * Takes structured scan results from the marriage prediction engine and
 * produces a client-ready narrative report with sections A–F.
 *
 * Design: template-based natural language generation that reads like an
 * expert Jaimini astrologer — never mentions "rules engine" or "JSON".
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
  MarriageWindowScan,
  MarriageWindow,
  MarriageWindowMonth,
} from "./jaiminiMarriagePrediction";

// ────────────────────────────────────────────────────────────────────────────
// Report types
// ────────────────────────────────────────────────────────────────────────────

export interface MarriageReport {
  summary: ReportSummary;
  keyPeriods: KeyPeriod[];
  /** @deprecated — detailed info merged into keyPeriods */
  detailedAnalysis: never[];
  strongIndicators: string[];
  challenges: string[];
  verdict: ReportVerdict;
  marriageCount: MarriageCountEstimate;
  natalProfile: NatalMarriageProfile;
}

export interface ReportSummary {
  text: string;
  mostLikelyPeriod: string | null;
}

export interface KeyPeriod {
  timeRange: string;
  strength: "Strong" | "Moderate";
  age: number;
  dasha: string;
  /** ISO date string of window start (for chronological sorting & past/future detection) */
  startDate: string;
  /** 1-2 sentence plain-English overview */
  summary: string;
  /** Per-rule Vedic-sourced interpretations (only for rules that are met) */
  interpretations: string[];
  /** Which rules are met in the peak month (for reference) */
  rulesMetList: number[];
  /** What this period likely indicates */
  indicates: {
    meetingPartner: boolean;
    engagement: boolean;
    marriageFinalization: boolean;
  };
}

export interface ReportVerdict {
  topPeriods: string[];
  confidence: "High" | "Medium" | "Low";
  narrative: string;
}

export interface MarriageCountEstimate {
  expected: number;
  explanation: string;
}

export interface NatalMarriageProfile {
  ulSign: Sign;
  ulLord: string;
  ulLordSign: Sign;
  alSign: Sign;
  seventhSign: Sign;
  seventhLord: string;
  dk: string;
  dkSign: Sign;
  karakamsha: string | null;
  beneficsOn7th: string[];
  maleficsOnUL: string[];
  secondFromUL: Sign;
  planetsIn2ndFromUL: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

function planetsInSign(planets: PlanetPosition[], sign: Sign): string[] {
  return planets.filter((p) => p.rashi === sign).map((p) => p.name);
}

const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]);

function isBenefic(name: string): boolean {
  return BENEFICS.has(name);
}

function yearFromDate(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10);
}

/** Age from birth year */
function ageAt(birthYear: number, dateStr: string): number {
  return yearFromDate(dateStr) - birthYear;
}

// ────────────────────────────────────────────────────────────────────────────
// Natal marriage profile builder
// ────────────────────────────────────────────────────────────────────────────

function buildNatalProfile(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
): NatalMarriageProfile {
  const lagna = chart.lagna as Sign;
  const ulSign = input.upaPada?.padaSign || signAtOffset(lagna, 12);
  const ulLord = SIGN_LORD[ulSign];
  const ulLordPlanet = chart.planets.find((p) => p.name === ulLord);
  const ulLordSign = (ulLordPlanet?.rashi as Sign) || ulSign;

  const alSign = input.arudhaLagna?.padaSign || lagna;

  const seventhSign = signAtOffset(lagna, 7);
  const seventhLord = SIGN_LORD[seventhSign];

  const dk = input.karakas.find((k) => k.role === "Darakaraka");
  const dkName = dk?.planet || "Venus";
  const dkSign = (dk?.rashi as Sign) || lagna;

  const karakamsha = input.karakamsha?.karakamsha || null;

  // Planets in 7th house
  const planetsIn7th = planetsInSign(chart.planets, seventhSign);
  const beneficsOn7th = planetsIn7th.filter(isBenefic);

  // Malefics on UL
  const planetsOnUL = planetsInSign(chart.planets, ulSign);
  const maleficsOnUL = planetsOnUL.filter((n) => MALEFICS.has(n));

  // 2nd from UL (sustenance of marriage)
  const secondFromUL = signAtOffset(ulSign, 2);
  const planetsIn2nd = planetsInSign(chart.planets, secondFromUL);

  return {
    ulSign,
    ulLord,
    ulLordSign,
    alSign,
    seventhSign,
    seventhLord,
    dk: dkName,
    dkSign,
    karakamsha,
    beneficsOn7th,
    maleficsOnUL,
    secondFromUL,
    planetsIn2ndFromUL: planetsIn2nd,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Marriage count estimator
// ────────────────────────────────────────────────────────────────────────────

function estimateMarriageCount(
  profile: NatalMarriageProfile,
  windows: MarriageWindow[],
  chart: ChartResponse,
): MarriageCountEstimate {
  // Strong windows in distinctly different life phases (3+ years apart)
  const strongWindows = windows.filter((w) => w.peakScore >= 5);
  const distinctPhases: MarriageWindow[] = [];
  for (const w of strongWindows) {
    const wYear = yearFromDate(w.startDate);
    if (distinctPhases.every((d) => Math.abs(yearFromDate(d.startDate) - wYear) >= 5)) {
      distinctPhases.push(w);
    }
  }

  // Natal factors
  const maleficOnUL = profile.maleficsOnUL.length > 0;
  const maleficOn2ndUL = profile.planetsIn2ndFromUL.some((n) => MALEFICS.has(n));
  const beneficOnUL = planetsInSign(chart.planets, profile.ulSign).some(isBenefic);
  const beneficOn2ndUL = profile.planetsIn2ndFromUL.some(isBenefic);

  let count: number;
  let explanation: string;

  if (distinctPhases.length === 0) {
    // No strong windows — check moderate
    const moderateWindows = windows.filter((w) => w.peakScore >= 3);
    if (moderateWindows.length === 0) {
      count = 0;
      explanation =
        "No strong marriage-supportive periods were found in the analysis. Marriage timing may require a deeper look at transits and individual factors, or it may be delayed beyond the typical age range.";
    } else {
      count = 1;
      explanation =
        "The chart shows moderate indications for one marriage. While no overwhelmingly strong period was found, the planetary alignments do support the possibility of a committed relationship.";
    }
  } else if (distinctPhases.length === 1) {
    count = 1;
    explanation = beneficOnUL
      ? "The Upa-Pada (marriage house) is supported by benefic influences, indicating a stable and enduring marriage. One significant, committed partnership is strongly indicated."
      : "One significant marriage period is indicated. The chart supports a single committed partnership.";
  } else {
    // Multiple distinct strong phases
    if (maleficOnUL && maleficOn2ndUL && !beneficOn2ndUL) {
      count = 2;
      explanation =
        "The chart shows multiple strong marriage periods in different life phases. Challenging influences on the Upa-Pada and its sustaining house suggest the possibility of transformation in marital life — the native may experience more than one significant partnership.";
    } else if (maleficOnUL || maleficOn2ndUL) {
      count = 1;
      explanation =
        `Although multiple favorable periods exist, the overall chart structure — including ${
          maleficOnUL ? "challenging influences on the marriage house" : "stresses on the sustaining house"
        } balanced by other positive factors — points toward one primary marriage, with the strongest period being the most likely timing.`;
    } else {
      count = 1;
      explanation =
        "Multiple favorable marriage periods are visible, but the natal chart strongly supports one enduring marriage. The additional windows may coincide with relationship deepening or renewal rather than multiple marriages.";
    }
  }

  return { expected: count, explanation };
}

// ────────────────────────────────────────────────────────────────────────────
// Natural language generators
// ────────────────────────────────────────────────────────────────────────────

function describeDasha(md: string | null, ad: string | null): string {
  if (md && ad) return `${md}–${ad} Chara Dasha`;
  if (md) return `${md} Chara Dasha`;
  return "the active Chara Dasha";
}

/**
 * Vedic-sourced rule interpretations.
 *
 * Based on Jaimini Sutras (Maharishi Jaimini) and standard Jaimini
 * commentaries (Sanjay Rath, P.S. Sastri):
 *
 * - UL (Upa-Pada): Jaimini Sutra 1.3.1–1.3.5 — the pada of the 12th house
 *   reveals marriage, its timing and quality.
 * - DK (Darakaraka): Jaimini Sutra 1.1.13–1.1.21 — the planet with specific
 *   degree qualification signifies the spouse.
 * - AL (Arudha Lagna): Jaimini Sutra 1.1.30 — the image the world perceives;
 *   Jupiter's transit here brings social expansion and visible opportunities.
 * - Chara Dasha: Sign-based dasha described in Jaimini Sutra 2.1 — when a
 *   sign period activates marriage factors, relationship themes dominate.
 * - Argala: Jaimini Sutra 1.2.1–1.2.7 — planetary intervention from the
 *   2nd, 4th, and 11th houses that "pushes" outcomes of a sign.
 * - Jaimini aspects: Rashi drishti — signs of the same type aspect each
 *   other (movable↔fixed except adjacent, dual↔dual).
 */
function buildRuleInterpretations(
  rules: number[],
  profile: NatalMarriageProfile,
  md: string | null,
  ad: string | null,
): string[] {
  const interps: string[] = [];

  if (rules.includes(1)) {
    interps.push(
      `Saturn's transit connects with your marriage house (${profile.ulSign}) and its natal position — this creates the karmic readiness and sense of responsibility needed for a lifelong commitment.`,
    );
  }
  if (rules.includes(2)) {
    interps.push(
      `Mars transits through factors linked to your marriage house, providing the courage, initiative, and decisive energy to move toward formalizing a relationship.`,
    );
  }
  if (rules.includes(3)) {
    interps.push(
      `Jupiter blesses your social image (${profile.alSign}) and partnership house (${profile.seventhSign}) simultaneously — this is considered highly auspicious in Jaimini astrology, as it expands opportunities for meeting a partner and receiving support from family and society.`,
    );
  }
  if (rules.includes(4)) {
    interps.push(
      `Your Darakaraka (${profile.dk} — the planet signifying your spouse) naturally connects with key marriage houses in your birth chart, creating a strong foundational link between you and partnership themes.`,
    );
  }
  if (rules.includes(5)) {
    const dashaLabel = describeDasha(md, ad);
    interps.push(
      `The ${dashaLabel} period activates signs directly connected to marriage, channeling this phase of life toward relationship growth and commitment.`,
    );
  }
  if (rules.includes(6)) {
    interps.push(
      `Strong planetary influence (Argala) from your spouse-significator reinforces the current dasha period, ensuring that marriage themes are actively pushed to the forefront during this time.`,
    );
  }

  return interps;
}

/** Build a 1-2 sentence plain-English summary unique to each window. */
function buildWindowSummary(
  w: MarriageWindow,
  profile: NatalMarriageProfile,
  birthYear: number,
): string {
  const age = ageAt(birthYear, w.startDate);
  const peak = w.months.reduce((best, m) =>
    m.rulesSatisfied > best.rulesSatisfied ? m : best, w.months[0]);
  const rules = peak.rulesMetList;
  const duration = w.months.length;
  const dasha = describeDasha(peak.md, peak.ad);

  // Specific transit planets active in this window
  const hasSaturn = rules.includes(1);
  const hasMars = rules.includes(2);
  const hasJupiter = rules.includes(3);
  const hasDK = rules.includes(4);
  const hasDashaLink = rules.includes(5);
  const hasArgala = rules.includes(6);

  // Build transit clause (which specific planets are active)
  const transitPlanets: string[] = [];
  if (hasSaturn) transitPlanets.push("Saturn");
  if (hasMars) transitPlanets.push("Mars");
  if (hasJupiter) transitPlanets.push("Jupiter");

  // Build the specific dasha reference
  const dashaClause = hasDashaLink
    ? `the ${dasha} period activates marriage-connected signs`
    : hasArgala
      ? `the ${dasha} period receives strong planetary intervention (Argala) from your spouse-significator`
      : null;

  // Build the DK clause
  const dkClause = hasDK
    ? `your Darakaraka (${profile.dk}) links natively to key marriage houses`
    : null;

  // ── Assemble unique description ──

  // All three transits present
  if (transitPlanets.length === 3 && dashaClause) {
    const durNote = duration >= 4 ? ` This alignment sustains across ${duration} months, which is unusually long.` : "";
    return `During the ${dasha} around age ${age}, Saturn, Mars, and Jupiter all simultaneously activate your marriage house (${profile.ulSign}) and partnership factors.${dkClause ? ` Additionally, ${dkClause}.` : ""}${durNote}`;
  }

  if (transitPlanets.length === 3) {
    return `Around age ${age}, all three key transit planets — Saturn, Mars, and Jupiter — converge on your marriage and partnership houses at once, a rare triple activation of ${profile.ulSign} and ${profile.seventhSign}.`;
  }

  // Two transits + dasha
  if (transitPlanets.length === 2 && dashaClause) {
    return `Around age ${age}, ${transitPlanets.join(" and ")} both transit marriage-sensitive positions while ${dashaClause}, creating a focused window for commitment during a ${duration}-month span.`;
  }

  // Two transits + DK
  if (transitPlanets.length === 2 && dkClause) {
    return `At age ${age}, ${transitPlanets.join(" and ")} activate your Upa-Pada (${profile.ulSign}) and 7th house, and ${dkClause} — transit energy meets natal promise.`;
  }

  // Two transits alone
  if (transitPlanets.length === 2) {
    return `Around age ${age}, ${transitPlanets.join(" and ")} simultaneously connect with your marriage house (${profile.ulSign}), providing both ${transitPlanets[0] === "Saturn" ? "commitment readiness" : "initiative"} and ${transitPlanets[1] === "Jupiter" ? "auspicious expansion" : "decisive energy"}.`;
  }

  // Single transit + dasha + DK/Argala
  if (transitPlanets.length === 1 && dashaClause) {
    const transitRole = transitPlanets[0] === "Saturn" ? "karmic maturity" : transitPlanets[0] === "Jupiter" ? "auspicious blessing" : "active drive";
    return `At age ${age}, ${transitPlanets[0]} brings ${transitRole} to your marriage factors while ${dashaClause}${hasArgala ? ", reinforced by Argala from your spouse-significator" : ""}.`;
  }

  // Dasha + DK + Argala (no transits)
  if (dashaClause && dkClause) {
    return `Around age ${age}, ${dashaClause}, and ${dkClause} — the dasha period and natal chart factors together emphasize partnership themes even without strong transit triggers.`;
  }

  // Dasha-centric
  if (dashaClause) {
    return `At age ${age}, ${dashaClause}. This ${duration >= 3 ? `extended ${duration}-month` : "focused"} period channels life energy toward relationship growth and commitment.`;
  }

  // Fallback with whatever specifics we have
  if (transitPlanets.length > 0) {
    return `Around age ${age}, ${transitPlanets.join(" and ")} activate${transitPlanets.length === 1 ? "s" : ""} marriage-related positions in your chart, opening a ${duration}-month window for relationship developments.`;
  }

  return `Around age ${age}, your chart's marriage factors align through the ${dasha} period, supporting partnership and commitment themes.`;
}

function determineIndications(
  w: MarriageWindow,
): { meetingPartner: boolean; engagement: boolean; marriageFinalization: boolean } {
  const peak = w.peakScore;
  const duration = w.months.length;

  return {
    meetingPartner: peak >= 3,
    engagement: peak >= 4 && duration >= 2,
    marriageFinalization: peak >= 5 && duration >= 3,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Strong indicators / challenges builders
// ────────────────────────────────────────────────────────────────────────────

function buildStrongIndicators(
  profile: NatalMarriageProfile,
  chart: ChartResponse,
  windows: MarriageWindow[],
): string[] {
  const indicators: string[] = [];

  // DK analysis
  const dkAspectsUL =
    profile.dkSign === profile.ulSign || hasJaiminiAspect(profile.dkSign, profile.ulSign);
  const dkAspects7th =
    profile.dkSign === profile.seventhSign || hasJaiminiAspect(profile.dkSign, profile.seventhSign);

  if (dkAspectsUL) {
    indicators.push(
      `The Darakaraka (${profile.dk}) directly influences the Upa-Pada (${profile.ulSign}), creating a strong natal link between the significator of spouse and the marriage house.`,
    );
  }
  if (dkAspects7th) {
    indicators.push(
      `The Darakaraka (${profile.dk}) aspects the 7th house (${profile.seventhSign}), reinforcing partnership themes in the birth chart.`,
    );
  }

  // Benefics on 7th
  if (profile.beneficsOn7th.length > 0) {
    indicators.push(
      `Benefic planet${profile.beneficsOn7th.length > 1 ? "s" : ""} ${profile.beneficsOn7th.join(" and ")} in the 7th house support a harmonious and auspicious partnership.`,
    );
  }

  // UL lord well-placed
  const ulLordInKendra = [1, 4, 7, 10].some(
    (h) => signAtOffset(chart.lagna as Sign, h) === profile.ulLordSign,
  );
  if (ulLordInKendra) {
    indicators.push(
      `The lord of the Upa-Pada (${profile.ulLord}) is placed in a strong angular position (${profile.ulLordSign}), giving stability and visibility to marriage prospects.`,
    );
  }

  // Strong windows exist
  const strongCount = windows.filter((w) => w.peakScore >= 5).length;
  if (strongCount > 0) {
    indicators.push(
      `${strongCount} strongly favorable marriage period${strongCount > 1 ? "s" : ""} found — multiple planetary factors align simultaneously, which is a clear positive signal.`,
    );
  }

  // Karakamsha
  if (profile.karakamsha) {
    const kmSign = profile.karakamsha as Sign;
    const venusInKM = chart.planets.find(
      (p) => p.name === "Venus" && (p.rashi === kmSign || hasJaiminiAspect(p.rashi as Sign, kmSign)),
    );
    if (venusInKM) {
      indicators.push(
        `Venus influences the Karakamsha (${profile.karakamsha}), indicating that matters of love and partnership are central to the native's soul-level purpose.`,
      );
    }
  }

  return indicators;
}

function buildChallenges(
  profile: NatalMarriageProfile,
  chart: ChartResponse,
  windows: MarriageWindow[],
): string[] {
  const challenges: string[] = [];

  // Malefics on UL
  if (profile.maleficsOnUL.length > 0) {
    challenges.push(
      `${profile.maleficsOnUL.join(" and ")} influence${profile.maleficsOnUL.length === 1 ? "s" : ""} the Upa-Pada (${profile.ulSign}). This may create some delays, intensity, or transformative experiences in the journey toward marriage — not a denial, but rather a deepening of the process.`,
    );
  }

  // 2nd from UL affliction
  const maleficsIn2nd = profile.planetsIn2ndFromUL.filter((n) => MALEFICS.has(n));
  if (maleficsIn2nd.length > 0) {
    challenges.push(
      `The 2nd house from Upa-Pada (${profile.secondFromUL}) has ${maleficsIn2nd.join(" and ")}, which can indicate challenges in sustaining early relationships. Patience and maturity will be key strengths.`,
    );
  }

  // No strong windows
  const strongWindows = windows.filter((w) => w.peakScore >= 5);
  if (strongWindows.length === 0) {
    const moderateCount = windows.filter((w) => w.peakScore >= 3).length;
    if (moderateCount > 0) {
      challenges.push(
        "No overwhelmingly strong marriage period was found, though moderate windows exist. This suggests marriage may require more conscious effort or may come through a gradual, steady connection rather than a dramatic turning point.",
      );
    } else {
      challenges.push(
        "The transit alignments during the analyzed period show limited simultaneous activation of marriage factors. Marriage timing may extend beyond the typical range, or the native's path may involve a non-traditional timeline.",
      );
    }
  }

  // 7th lord in 6/8/12 (dusthana)
  const lagna = chart.lagna as Sign;
  const dusthanas = [6, 8, 12].map((h) => signAtOffset(lagna, h));
  if (dusthanas.includes(chart.planets.find((p) => p.name === profile.seventhLord)?.rashi as Sign)) {
    challenges.push(
      `The 7th house lord (${profile.seventhLord}) is placed in a challenging position, which can introduce obstacles or delays. However, this often resolves when strong transit triggers activate during a favorable dasha period.`,
    );
  }

  return challenges;
}

// ────────────────────────────────────────────────────────────────────────────
// Summary generator
// ────────────────────────────────────────────────────────────────────────────

function generateSummary(
  windows: MarriageWindow[],
  profile: NatalMarriageProfile,
  birthYear: number,
  isFutureOnly: boolean,
  todayStr?: string,
): ReportSummary {
  const today = todayStr || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const strongWindows = windows.filter((w) => w.peakScore >= 5);
  const moderateWindows = windows.filter((w) => w.peakScore >= 3 && w.peakScore < 5);
  const bestWindow = windows.length > 0
    ? windows.reduce((a, b) => (a.peakScore > b.peakScore ? a : b))
    : null;

  if (!bestWindow) {
    return {
      text:
        "Based on the Jaimini Chara Dasha analysis of your chart, no strong marriage windows are currently visible in the analyzed period. This does not deny marriage — it suggests the timing may unfold later or through subtle planetary activations that become clearer with time.",
      mostLikelyPeriod: null,
    };
  }

  const bestAge = ageAt(birthYear, bestWindow.startDate);
  const bestIsPast = bestWindow.endDate < today;

  // ── Best period is in the past → marriage has likely already occurred ──
  if (bestIsPast && strongWindows.length > 0) {
    const best = strongWindows.sort((a, b) => b.peakScore - a.peakScore)[0];
    const bestPastAge = ageAt(birthYear, best.startDate);
    const range = `${best.months[0].month}–${best.months[best.months.length - 1].month}`;

    // Check if there are also future strong windows
    const futureStrong = strongWindows.filter((w) => w.endDate >= today);
    const futureNote = futureStrong.length > 0
      ? ` Looking ahead, ${futureStrong.length} additional strong period${futureStrong.length > 1 ? "s" : ""} appear${futureStrong.length === 1 ? "s" : ""} in the future, which may indicate relationship renewal, deepening, or a significant new chapter.`
      : "";

    return {
      text:
        `Your Jaimini analysis indicates that the strongest marriage window in your chart occurred around age ${bestPastAge} (${range}). During this period, multiple planetary factors aligned simultaneously on your marriage house — this is a classical signature for the timing of marriage. If you are already married, this confirms strong astrological support for the union during that phase.${futureNote}`,
      mostLikelyPeriod: `${best.months[0].month} – ${best.months[best.months.length - 1].month}`,
    };
  }

  // ── Best period is in the past but only moderate ──
  if (bestIsPast && moderateWindows.length > 0) {
    const best = moderateWindows[0];
    const bestPastAge = ageAt(birthYear, best.startDate);
    const futureModerate = moderateWindows.filter((w) => w.endDate >= today);
    const futureNote = futureModerate.length > 0
      ? ` ${futureModerate.length} upcoming period${futureModerate.length > 1 ? "s" : ""} with moderate support may bring further relationship developments.`
      : "";

    return {
      text:
        `The most supportive marriage period in your chart was around age ${bestPastAge} (${best.months[0].month}–${best.months[best.months.length - 1].month}), when several planetary factors partially aligned with your marriage house. If you entered a committed relationship during this phase, the chart supports that timing.${futureNote}`,
      mostLikelyPeriod: `${best.months[0].month} – ${best.months[best.months.length - 1].month}`,
    };
  }

  // ── Best period is in the future ──
  if (strongWindows.length > 0) {
    const futureStrong = strongWindows.filter((w) => w.endDate >= today).sort((a, b) => b.peakScore - a.peakScore);
    const best = futureStrong.length > 0 ? futureStrong[0] : strongWindows[0];
    const age = ageAt(birthYear, best.startDate);
    const bestPeak = best.months.reduce((a, m) =>
      m.rulesSatisfied > a.rulesSatisfied ? m : a, best.months[0]);
    const hasAllTransits = [1, 2, 3].every((r) => bestPeak.rulesMetList.includes(r));
    const hasDashaSupport = bestPeak.rulesMetList.includes(5);

    let detail: string;
    if (hasAllTransits && hasDashaSupport) {
      detail = "During this time, Saturn, Mars, and Jupiter all activate your marriage house and partnership factors, while your Jaimini Dasha period directly supports relationship themes.";
    } else if (hasAllTransits) {
      detail = "All three key transit planets — Saturn, Mars, and Jupiter — simultaneously activate marriage-related positions in your chart.";
    } else {
      detail = "Key planetary transits align with your birth chart's marriage factors, while your current life period supports commitment and partnership.";
    }

    // Note past strong windows too
    const pastStrong = strongWindows.filter((w) => w.endDate < today);
    const pastNote = pastStrong.length > 0
      ? ` Your chart also shows ${pastStrong.length} strong period${pastStrong.length > 1 ? "s" : ""} in the past — if you experienced significant relationship milestones then, the chart confirms that timing.`
      : "";

    return {
      text:
        `Your Jaimini analysis reveals a strongly favorable upcoming marriage period around age ${age} (${best.months[0].month}–${best.months[best.months.length - 1].month}). ${detail}${pastNote}` +
        (moderateWindows.length > 0
          ? ` ${moderateWindows.length} additional period${moderateWindows.length > 1 ? "s" : ""} with moderate support also exist.`
          : " This is a clear and auspicious indication for marriage."),
      mostLikelyPeriod: `${best.months[0].month} – ${best.months[best.months.length - 1].month}`,
    };
  }

  // Only moderate windows — best is future
  const best = moderateWindows.filter((w) => w.endDate >= today)[0] || moderateWindows[0];
  const age = ageAt(birthYear, best.startDate);
  return {
    text:
      `Your chart shows ${moderateWindows.length} period${moderateWindows.length > 1 ? "s" : ""} with moderate marriage support. The best upcoming opportunity is around age ${age} (${best.months[0].month}–${best.months[best.months.length - 1].month}), when planetary transits and dasha conditions partially align with your marriage house. While not the strongest configuration, these periods carry genuine potential — especially if supported by personal readiness.`,
    mostLikelyPeriod: `${best.months[0].month} – ${best.months[best.months.length - 1].month}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Verdict generator
// ────────────────────────────────────────────────────────────────────────────

function generateVerdict(
  windows: MarriageWindow[],
  profile: NatalMarriageProfile,
  birthYear: number,
  todayStr?: string,
): ReportVerdict {
  const today = todayStr || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

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
        "The current analysis does not reveal a high-confidence marriage period. This is not a denial but an indication that the timing may depend on subtler astrological factors or may manifest beyond the analyzed timeframe. Revisiting the analysis when major planetary transits shift could reveal new windows.",
    };
  }

  const topLabels = topWindows.map(
    (w) => `${w.months[0].month} – ${w.months[w.months.length - 1].month}`,
  );

  const confidence: "High" | "Medium" | "Low" =
    strongWindows.length >= 2 ? "High"
    : strongWindows.length === 1 ? "High"
    : moderateWindows.length >= 2 ? "Medium"
    : "Low";

  const best = topWindows[0];
  const bestAge = ageAt(birthYear, best.startDate);
  const bestIsPast = best.endDate < today;

  let narrative: string;

  if (bestIsPast && confidence === "High") {
    // Strongest period is in the past — marriage likely happened
    narrative = `The strongest marriage period in your chart was ${topLabels[0]} (around age ${bestAge}). The planetary conditions during this time closely matched classical Jaimini indicators for marriage — if you married during or near this period, the chart strongly confirms that timing. `;
    const futureTop = topWindows.filter((w) => w.endDate >= today);
    if (futureTop.length > 0) {
      const futureAge = ageAt(birthYear, futureTop[0].startDate);
      const futureLabel = `${futureTop[0].months[0].month} – ${futureTop[0].months[futureTop[0].months.length - 1].month}`;
      narrative += `Looking ahead, ${futureLabel} (age ${futureAge}) also shows favorable conditions, which may relate to a deepening of the existing relationship or a new significant chapter.`;
    }
  } else if (bestIsPast) {
    narrative = `The most supportive marriage period was ${topLabels[0]} (around age ${bestAge}). If a committed relationship began during this phase, the chart supports that timing. `;
    const futureTop = topWindows.filter((w) => w.endDate >= today);
    if (futureTop.length > 0) {
      const futureAge = ageAt(birthYear, futureTop[0].startDate);
      narrative += `A future period around age ${futureAge} also shows moderate alignment for relationship milestones.`;
    } else {
      narrative += "Future periods with additional support may emerge as planetary transits shift.";
    }
  } else if (confidence === "High") {
    narrative = `The most probable marriage period is ${topLabels[0]} (around age ${bestAge}), with strong convergence of transit, dasha, and natal factors. `;
    if (topWindows.length > 1) {
      const secondAge = ageAt(birthYear, topWindows[1].startDate);
      narrative += `A secondary favorable period around ${topLabels[1]} (age ${secondAge}) also deserves attention. `;
    }
    narrative +=
      "The confidence level is high — the planetary conditions during this period closely match the classical Jaimini indicators for marriage.";
  } else {
    narrative = `The most favorable period identified is ${topLabels[0]} (around age ${bestAge}), though the alignment is moderate rather than strong. `;
    narrative +=
      "With conscious effort and openness to partnership during this time, marriage remains well within possibility. Consulting with transit updates as the period approaches can refine the timing further.";
  }

  return { topPeriods: topLabels, confidence, narrative };
}

// ────────────────────────────────────────────────────────────────────────────
// Main report generator
// ────────────────────────────────────────────────────────────────────────────

export function generateMarriageReport(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
  scan: MarriageWindowScan,
  options: {
    /** Only include future windows (default: true) */
    futureOnly?: boolean;
    /** Birth year for age calculation */
    birthYear?: number;
  } = {},
): MarriageReport {
  const futureOnly = options.futureOnly ?? true;
  const birthYear = options.birthYear ?? yearFromDate(chart.date);

  const profile = buildNatalProfile(input, chart);

  // Filter windows — future only for end users, all for admin
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const windows = futureOnly
    ? scan.windows.filter((w) => w.endDate >= todayStr)
    : scan.windows;

  // ── Section A: Summary ──
  const summary = generateSummary(windows, profile, birthYear, futureOnly, todayStr);

  // ── Section B: Key Periods (chronological) ──
  const keyPeriods: KeyPeriod[] = windows
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((w) => {
      const peak = w.months.reduce((best, m) =>
        m.rulesSatisfied > best.rulesSatisfied ? m : best, w.months[0]);
      const age = ageAt(birthYear, w.startDate);
      const strength: "Strong" | "Moderate" = w.peakScore >= 5 ? "Strong" : "Moderate";
      const dashaLabel = describeDasha(peak.md, peak.ad);

      return {
        timeRange: w.startMonth === w.endMonth
          ? w.startMonth
          : `${w.startMonth} – ${w.endMonth}`,
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

  // detailedAnalysis is deprecated — all info is now in keyPeriods
  const detailedAnalysis: never[] = [];

  // ── Section D: Strong Indicators ──
  const strongIndicators = buildStrongIndicators(profile, chart, windows);

  // ── Section E: Challenges ──
  const challenges = buildChallenges(profile, chart, windows);

  // ── Section F: Verdict ──
  const verdict = generateVerdict(windows, profile, birthYear, todayStr);

  // ── Marriage count ──
  const marriageCount = estimateMarriageCount(profile, windows, chart);

  return {
    summary,
    keyPeriods,
    detailedAnalysis,
    strongIndicators,
    challenges,
    verdict,
    marriageCount,
    natalProfile: profile,
  };
}
