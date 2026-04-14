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
  detailedAnalysis: DetailedWindow[];
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
  dasha: string;
  explanation: string;
}

export interface DetailedWindow {
  windowLabel: string;
  timeRange: string;
  peakScore: number;
  peakMonth: string;
  dasha: string;
  astrologicalNarrative: string;
  whyMarriage: string;
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

function describeTransit(month: MarriageWindowMonth): string {
  const parts: string[] = [];
  if (month.transit.saturn) parts.push(`Saturn in ${month.transit.saturn}`);
  if (month.transit.jupiter) parts.push(`Jupiter in ${month.transit.jupiter}`);
  if (month.transit.mars) parts.push(`Mars in ${month.transit.mars}`);
  return parts.join(", ");
}

function windowNarrative(
  w: MarriageWindow,
  profile: NatalMarriageProfile,
  birthYear: number,
): { astro: string; whyMarriage: string } {
  const peak = w.months.reduce((best, m) =>
    m.rulesSatisfied > best.rulesSatisfied ? m : best, w.months[0]);

  const rules = peak.rulesMetList;
  const age = ageAt(birthYear, w.startDate);

  const astroParts: string[] = [];
  const whyParts: string[] = [];

  // Transit-based narratives (rules 1-3)
  if (rules.includes(1)) {
    astroParts.push(
      `Transit Saturn activates the Upa-Pada (${profile.ulSign}) and connects with natal planetary positions, creating the foundational karmic trigger for marriage.`,
    );
    whyParts.push(
      "Saturn's transit alignment with the marriage house provides the necessary karmic readiness and commitment energy.",
    );
  }
  if (rules.includes(2)) {
    astroParts.push(
      `Transit Mars energizes the Upa-Pada factors, adding initiative and drive toward formalizing a relationship.`,
    );
    whyParts.push(
      "Mars provides the action-oriented energy needed to move from intention to commitment.",
    );
  }
  if (rules.includes(3)) {
    astroParts.push(
      `Transit Jupiter blesses both the Arudha Lagna (${profile.alSign}) and the 7th house (${profile.seventhSign}), expanding partnership opportunities and social visibility.`,
    );
    whyParts.push(
      "Jupiter's grace on the partnership house brings auspicious timing and social support for marriage.",
    );
  }

  // Natal/dasha narratives (rules 4-6)
  if (rules.includes(4)) {
    astroParts.push(
      `The Darakaraka (${profile.dk}) is natally connected to marriage-significator houses, maintaining a constant supportive link to partnership themes.`,
    );
    whyParts.push(
      "The relationship-karaka's natal placement naturally supports marriage formation in this chart.",
    );
  }
  if (rules.includes(5)) {
    astroParts.push(
      `The ${describeDasha(peak.md, peak.ad)} directly activates marriage-related signs and their lords, channeling the period's energy toward partnership.`,
    );
    whyParts.push(
      "The running dasha period aligns with marriage factors, making this a karmically ripe time for commitment.",
    );
  }
  if (rules.includes(6)) {
    astroParts.push(
      `Argala (planetary intervention) from the Darakaraka and associated lords influences the running dasha, pushing the period's outcomes toward relationship milestones.`,
    );
    whyParts.push(
      "Strong argala on the dasha period from relationship planets ensures marriage themes cannot be bypassed.",
    );
  }

  // Add age context
  if (age >= 18 && age <= 28) {
    astroParts.push(
      `At approximately age ${age}, this falls within the socially typical window for first marriage.`,
    );
  } else if (age >= 29 && age <= 38) {
    astroParts.push(
      `At approximately age ${age}, this period represents a mature and deliberate timing for marriage.`,
    );
  } else if (age > 38) {
    astroParts.push(
      `At approximately age ${age}, this is a later-life window — often associated with deeper emotional readiness.`,
    );
  }

  return {
    astro: astroParts.join(" "),
    whyMarriage: whyParts.join(" "),
  };
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
): ReportSummary {
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
  const futureLabel = isFutureOnly ? "upcoming" : "lifetime";

  if (strongWindows.length > 0) {
    const best = strongWindows[0];
    return {
      text:
        `Your Jaimini chart reveals ${strongWindows.length} strongly favorable marriage period${strongWindows.length > 1 ? "s" : ""} in the ${futureLabel} analysis. The most powerful alignment occurs around ${best.months[0].month}–${best.months[best.months.length - 1].month} (approximately age ${bestAge}), when ${best.peakScore} out of 6 key astrological conditions converge simultaneously. ` +
        (moderateWindows.length > 0
          ? `Additionally, ${moderateWindows.length} moderately favorable period${moderateWindows.length > 1 ? "s" : ""} offer secondary windows.`
          : "This is a clear and auspicious indication for marriage."),
      mostLikelyPeriod: `${best.months[0].month} – ${best.months[best.months.length - 1].month}`,
    };
  }

  // Only moderate windows
  const best = moderateWindows[0];
  return {
    text:
      `Your chart shows ${moderateWindows.length} moderately favorable marriage period${moderateWindows.length > 1 ? "s" : ""}. The best alignment occurs around ${best.months[0].month}–${best.months[best.months.length - 1].month} (approximately age ${bestAge}), with ${best.peakScore} of 6 conditions active. While not overwhelmingly strong, these periods carry genuine potential — especially if supported by individual effort and readiness.`,
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
): ReportVerdict {
  const strongWindows = windows
    .filter((w) => w.peakScore >= 5)
    .sort((a, b) => b.peakScore - a.peakScore || b.avgScore - a.avgScore);

  const moderateWindows = windows
    .filter((w) => w.peakScore >= 3 && w.peakScore < 5)
    .sort((a, b) => b.peakScore - a.peakScore);

  const topWindows = [...strongWindows, ...moderateWindows].slice(0, 2);

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

  let narrative: string;
  if (confidence === "High") {
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
  const summary = generateSummary(windows, profile, birthYear, futureOnly);

  // ── Section B: Key Periods ──
  const keyPeriods: KeyPeriod[] = windows
    .sort((a, b) => b.peakScore - a.peakScore || b.avgScore - a.avgScore)
    .map((w) => {
      const peak = w.months.reduce((best, m) =>
        m.rulesSatisfied > best.rulesSatisfied ? m : best, w.months[0]);
      const age = ageAt(birthYear, w.startDate);
      const strength: "Strong" | "Moderate" = w.peakScore >= 5 ? "Strong" : "Moderate";
      const dashaLabel = describeDasha(peak.md, peak.ad);

      let explanation: string;
      if (w.peakScore >= 5) {
        explanation = `A powerful convergence of ${w.peakScore} marriage indicators activates during the ${dashaLabel} period. Transit planets align with your marriage house and partnership factors, creating an auspicious window around age ${age}.`;
      } else {
        explanation = `A moderate alignment of ${w.peakScore} indicators emerges during the ${dashaLabel} period. While not the strongest configuration, this period around age ${age} carries genuine potential for relationship progress.`;
      }

      return {
        timeRange: w.startMonth === w.endMonth
          ? w.startMonth
          : `${w.startMonth} – ${w.endMonth}`,
        strength,
        dasha: dashaLabel,
        explanation,
      };
    });

  // ── Section C: Detailed Analysis (strong windows only) ──
  const detailedAnalysis: DetailedWindow[] = windows
    .filter((w) => w.peakScore >= 4)
    .sort((a, b) => b.peakScore - a.peakScore)
    .map((w) => {
      const peak = w.months.reduce((best, m) =>
        m.rulesSatisfied > best.rulesSatisfied ? m : best, w.months[0]);
      const { astro, whyMarriage } = windowNarrative(w, profile, birthYear);
      const indicates = determineIndications(w);

      return {
        windowLabel:
          w.startMonth === w.endMonth ? w.startMonth : `${w.startMonth} – ${w.endMonth}`,
        timeRange: `${w.startDate} to ${w.endDate}`,
        peakScore: w.peakScore,
        peakMonth: peak.month,
        dasha: describeDasha(peak.md, peak.ad),
        astrologicalNarrative: astro,
        whyMarriage,
        indicates,
      };
    });

  // ── Section D: Strong Indicators ──
  const strongIndicators = buildStrongIndicators(profile, chart, windows);

  // ── Section E: Challenges ──
  const challenges = buildChallenges(profile, chart, windows);

  // ── Section F: Verdict ──
  const verdict = generateVerdict(windows, profile, birthYear);

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
