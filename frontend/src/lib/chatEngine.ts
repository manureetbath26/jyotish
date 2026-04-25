/**
 * Chat engine: classifies user questions and composes natural,
 * conversational answers from the pre-computed LifeEventsReport.
 *
 * No LLMs — deterministic keyword matching + conversational templates.
 */

import { ChartResponse } from "@/lib/api";
import {
  LifeEventsReport,
  LifeHighlight,
  EventCategory,
  DashaPrediction,
  PlanetStrength,
  YogaInfluence,
} from "@/lib/lifeEventsReport";
import type { EnrichedChatContext } from "@/lib/chatEnrichment";
import type { QuestionWindow } from "@/lib/questionWindow";
import type { WindowContext } from "@/lib/windowContext";
import type { ChatRules } from "@/lib/rulesServer";

// ─── Question Classification ────────────────────────────────────────────────
//
// QUESTION_CATEGORIES (16 rows), TIME_SCOPE_KEYWORDS, and PAST_KEYWORDS now
// live in the Postgres rules tables (QuestionCategory + RuleSetting). Loaded
// via rulesServer.getChatRules() and passed in via the `rules` parameter.

interface QuestionCategory {
  id: string;
  keywords: string[];
  houses: number[];
  planets: string[];
}

// Detect explicit year / year-range references (e.g. "2015", "2015-2020", "between 2015 and 2020")
const YEAR_RANGE_RE = /\b(19|20)\d{2}\b/g;

function extractYearRange(question: string): { start?: number; end?: number } | null {
  const matches = question.match(YEAR_RANGE_RE);
  if (!matches || matches.length === 0) return null;
  const years = matches.map(y => parseInt(y, 10)).sort((a, b) => a - b);
  return { start: years[0], end: years[years.length - 1] };
}

function highlightsInYearRange(highlights: LifeHighlight[], range: { start?: number; end?: number }): LifeHighlight[] {
  if (!range.start) return highlights;
  return highlights.filter(h => {
    const years = (h.window || "").match(YEAR_RANGE_RE);
    if (!years) return false;
    const hStart = parseInt(years[0], 10);
    const hEnd = parseInt(years[years.length - 1], 10);
    // overlap test
    return hEnd >= (range.start ?? 0) && hStart <= (range.end ?? 9999);
  });
}

// ─── Classification ─────────────────────────────────────────────────────────

export type TimeScope = "today" | "thisWeek" | "thisMonth" | "general";

function detectTimeScope(rules: ChatRules, question: string): TimeScope {
  const lower = question.toLowerCase();
  for (const { scope, keywords } of rules.timeScopeKeywords) {
    if (keywords.some((k) => lower.includes(k))) return scope as TimeScope;
  }
  return "general";
}

export interface ClassificationResult {
  categories: string[];
  houses: number[];
  planets: string[];
  isGeneral: boolean;
  askingAboutPast: boolean;
  yearRange?: { start?: number; end?: number };
  timeScope: TimeScope;
}

export function classifyQuestion(rules: ChatRules, question: string): ClassificationResult {
  const lower = question.toLowerCase();
  // Pad with spaces so keywords like " did " with word boundaries match at start/end
  const padded = ` ${lower} `;
  const matched: QuestionCategory[] = [];

  for (const cat of rules.questionCategories) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        matched.push(cat);
        break;
      }
    }
  }

  const yearRange = extractYearRange(lower) ?? undefined;
  const currentYear = new Date().getFullYear();
  const yearSuggestsPast = !!(yearRange && yearRange.start && yearRange.start < currentYear);
  const askingAboutPast = yearSuggestsPast || rules.pastKeywords.some(kw => padded.includes(kw));
  const timeScope = detectTimeScope(rules, question);

  if (matched.length === 0) {
    return { categories: ["general"], houses: [], planets: [], isGeneral: true, askingAboutPast, yearRange, timeScope };
  }

  const categories = [...new Set(matched.map(m => m.id))];
  const houses = [...new Set(matched.flatMap(m => m.houses))];
  const planets = [...new Set(matched.flatMap(m => m.planets))];

  return { categories, houses, planets, isGeneral: false, askingAboutPast, yearRange, timeScope };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRelevantCategories(report: LifeEventsReport, categoryIds: string[]): EventCategory[] {
  return report.eventCategories.filter(c => categoryIds.includes(c.id));
}

function getRelevantHighlights(highlights: LifeHighlight[], categoryIds: string[], limit: number = 3): LifeHighlight[] {
  return highlights
    .filter(h => categoryIds.includes(h.category))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getRelevantYogas(report: LifeEventsReport, houses: number[], planets: string[]): YogaInfluence[] {
  return report.yogaInfluences.filter(y =>
    y.isPresent && (
      y.houses.some(h => houses.includes(h)) ||
      y.planets.some(p => planets.includes(p))
    )
  );
}

function getCurrentDashaPrediction(report: LifeEventsReport): DashaPrediction | undefined {
  return report.dashaPredictions.find(d => d.isCurrent);
}

function getRelevantPlanets(report: LifeEventsReport, planets: string[]): PlanetStrength[] {
  return report.planetaryStrengths.filter(p => planets.includes(p.planet));
}

function outlookWord(outlook: string): string {
  const map: Record<string, string> = {
    very_favorable: "really strong",
    favorable: "quite positive",
    mixed: "mixed — there are both opportunities and things to watch out for",
    challenging: "a bit challenging, but awareness is power",
    needs_care: "something you'll want to be mindful about",
  };
  return map[outlook] || outlook;
}

function likelihoodWord(likelihood: string): string {
  const map: Record<string, string> = {
    very_likely: "strong indicators",
    likely: "good indicators",
    possible: "some indicators",
  };
  return map[likelihood] || likelihood;
}

// ─── Conversational Answer Builders ─────────────────────────────────────────

function buildCategoryAnswer(
  report: LifeEventsReport,
  categoryIds: string[],
  houses: number[],
  planets: string[],
  askingAboutPast: boolean,
  enriched?: EnrichedChatContext,
  yearRange?: { start?: number; end?: number },
  windowContext?: WindowContext,
): string {
  const parts: string[] = [];
  const categories = getRelevantCategories(report, categoryIds);
  const currentDasha = getCurrentDashaPrediction(report);
  const cpa = report.currentPeriodAnalysis;

  // Window banner — always the first line so user knows the focus
  if (windowContext) {
    parts.push(windowContext.window.userNote);
  }

  // Opening — warm, direct summary
  if (categories.length > 0) {
    const cat = categories[0];
    const outlookDesc = outlookWord(cat.overallOutlook);
    parts.push(`Looking at your chart, ${cat.name.toLowerCase()} is ${outlookDesc} for you overall. ${cat.summary}`);
  }

  // Dasha segments inside the window — prefer the window-scoped list over
  // the single "current" MD-AD when we have a real range to cover.
  if (windowContext && windowContext.dashaSegments.length > 0) {
    const segs = windowContext.dashaSegments.slice(0, 3);
    const segLines = segs.map((s) => {
      const flag = s.isCurrent ? " ← you are here" : "";
      const themes = s.themes?.length ? ` — themes: ${s.themes.join(", ")}` : "";
      const monthRange = `${s.includedFrom.slice(0, 7)} → ${s.includedTo.slice(0, 7)}`;
      return `• **${s.mahadasha}-${s.antardasha}** (${monthRange})${flag}${themes}`;
    });
    parts.push(`Dasha periods inside this window:\n${segLines.join("\n")}`);
  } else if (currentDasha) {
    const relevantPreds = currentDasha.eventPredictions
      .filter((ep) => categoryIds.includes(ep.category))
      .slice(0, 2);
    if (relevantPreds.length > 0) {
      parts.push(`Right now, you're running **${cpa.mahadasha}-${cpa.antardasha}** (until ${cpa.endDate.slice(0, 7).replace("-", "/")}). ${relevantPreds.map((p) => p.description).join(" ")}`);
    } else {
      parts.push(`You're currently in **${cpa.mahadasha}-${cpa.antardasha}** period. While this period's main themes don't directly focus on this area, the underlying chart strengths still apply.`);
    }
  }

  // Key natal planetary influences — the chart-level story
  const relevantPlanets = getRelevantPlanets(report, planets);
  if (relevantPlanets.length > 0) {
    const planetNotes = relevantPlanets.slice(0, 2).map((p) => {
      const dignityNote = p.dignity ? ` (in ${p.dignity})` : "";
      return `**${p.planet}**${dignityNote} sitting in house ${p.house}`;
    });
    parts.push(`The key natal planets here are ${planetNotes.join(" and ")}. ${relevantPlanets[0].interpretation}`);
  }

  // Transits projected across the window — active ones only
  if (windowContext && windowContext.transits.length > 0) {
    const active = windowContext.transits.filter(
      (t) => t.gochara === "active" || t.gochara === "nodal",
    );
    if (active.length > 0) {
      const lines = active.slice(0, 4).map((t) => {
        const ingressBit = t.ingresses.length
          ? ` — moves to ${t.ingresses[0].sign} (H${t.ingresses[0].houseFromLagna}) around ${t.ingresses[0].date.slice(0, 7)}`
          : ` (stays in ${t.endSign}, H${t.endHouseFromLagna})`;
        const bavBit =
          t.gochara === "active" ? ` · BAV ${t.midBav}/${t.threshold}` : "";
        return `• **${t.planet}**${bavBit} ${ingressBit} — ${t.effect}`;
      });
      parts.push(`Transit movements over this window (approximate):\n${lines.join("\n")}`);
    }
  }

  // Highlights (upcoming + past) that fall inside the window
  if (windowContext && windowContext.highlights.length > 0) {
    const windowHl = windowContext.highlights.slice(0, 5);
    const lines = windowHl.map((h) => {
      const indicator = likelihoodWord(h.likelihood);
      const arrow = h.direction === "past" ? "◀" : "▶";
      return `${arrow} **${h.window}** (${h.dashaContext}) — ${indicator}. ${trimReasoning(h.reasoning)}`;
    });
    parts.push(`Key windows inside this range:\n${lines.join("\n")}`);
  } else if (!windowContext) {
    // Legacy path — only runs when called without a windowContext
    const upcoming = getRelevantHighlights(report.upcomingHighlights, categoryIds, 3);
    if (upcoming.length > 0) {
      const windowTexts = upcoming.map((h) => {
        const indicator = likelihoodWord(h.likelihood);
        return `• **${h.window}** (${h.dashaContext}) — ${indicator}. ${trimReasoning(h.reasoning)}`;
      });
      parts.push(`Here are your best upcoming windows:\n${windowTexts.join("\n")}`);
    }
    if (askingAboutPast) {
      let pastPool = report.pastHighlights;
      if (yearRange && yearRange.start) {
        const filtered = highlightsInYearRange(pastPool, yearRange);
        if (filtered.length > 0) pastPool = filtered;
      }
      const limit = yearRange ? 5 : 2;
      const past = getRelevantHighlights(pastPool, categoryIds, limit);
      if (past.length > 0) {
        const rangeLabel = yearRange && yearRange.start
          ? (yearRange.end && yearRange.end !== yearRange.start
              ? ` between ${yearRange.start}-${yearRange.end}`
              : ` around ${yearRange.start}`)
          : "";
        const pastTexts = past.map((h) =>
          `• **${h.window}** (${h.dashaContext}) — ${trimReasoning(h.reasoning)}`
        );
        parts.push(`Looking back at past periods${rangeLabel}:\n${pastTexts.join("\n")}`);
      }
    }
  }

  // Yoga mention if relevant — brief
  const yogas = getRelevantYogas(report, houses, planets);
  if (yogas.length > 0) {
    const topYoga = yogas[0];
    parts.push(`Worth noting — you have **${topYoga.name}** in your chart, which ${topYoga.lifeEventImpact.charAt(0).toLowerCase()}${topYoga.lifeEventImpact.slice(1)}`);
  }

  // Enriched insights from Jaimini + Ashtakvarga engines
  if (enriched) {
    const enrichedSection = buildEnrichedSection(enriched, categoryIds, houses);
    if (enrichedSection) parts.push(enrichedSection);
  }

  return parts.join("\n\n");
}

// ─── Enriched Insights (Jaimini + Ashtakvarga) ──────────────────────────────

/**
 * Build a "From Jaimini & Ashtakvarga" section that corroborates the main
 * answer with insights from the specialized engines. Picks the right
 * signals for each question category.
 */
function buildEnrichedSection(
  enriched: EnrichedChatContext,
  categoryIds: string[],
  houses: number[],
): string {
  const lines: string[] = [];

  // Marriage / romance — Jaimini marriage windows + 7th house SAV + karaka BAV
  if (
    (categoryIds.includes("marriage") || categoryIds.includes("romance")) &&
    enriched.marriage
  ) {
    const m = enriched.marriage;
    const parts: string[] = [];

    if (m.peakWindow) {
      const pw = m.peakWindow;
      parts.push(
        `Jaimini engine: peak marriage window is **${pw.startMonth} – ${pw.endMonth}** (${pw.peakScore}/6 rules met — ${pw.peakScore >= 5 ? "strong" : "moderate"}).`,
      );
      if (m.upcomingWindows.length > 1) {
        parts.push(
          `${m.upcomingWindows.length} supportive windows sighted in the next 5 years.`,
        );
      }
    } else {
      parts.push("Jaimini engine: no strong marriage window in the next 5 years; natal factors matter more than transits here.");
    }

    const sevenLabel =
      m.seventhSav > 28 ? "well-supported (maraka — ideal range 23-28)"
      : m.seventhSav >= 23 ? "balanced (ideal range for a maraka house)"
      : "below threshold";
    parts.push(
      `Ashtakvarga: 7th house ${m.seventhSav} bindus (${sevenLabel}), Upa-Pada ${m.ulSav}, 2nd-from-UL ${m.secondFromUlSav}. Venus ${m.venusIn7}/8 & Jupiter ${m.jupiterIn7}/8 in the 7th sign. Overall natal rating: **${m.overallNatal}**.`,
    );

    if (m.saturnIn7 >= 5) {
      parts.push("Saturn is strong in the 7th sign — expect timing to unfold later rather than earlier, with enduring bonds once formed.");
    }

    lines.push(`**Jaimini + Ashtakvarga check:**\n${parts.join(" ")}`);
  }

  // Career / new_business / wealth — Jaimini career + 10th/11th/A10 SAV + AmK
  if (
    (categoryIds.includes("career_growth") ||
      categoryIds.includes("new_business") ||
      categoryIds.includes("wealth")) &&
    enriched.career
  ) {
    const c = enriched.career;
    const parts: string[] = [];

    if (c.peakWindow) {
      parts.push(
        `Jaimini engine: peak career window is **${c.peakWindow.startMonth} – ${c.peakWindow.endMonth}** (${c.peakWindow.peakScore}/6 rules — ${c.peakWindow.peakScore >= 5 ? "strong" : "moderate"}).`,
      );
    }
    parts.push(
      `Ashtakvarga: 10th house ${c.tenthSav} bindus, 11th ${c.eleventhSav}, A10 (reputation) ${c.a10Sav}. Overall natal: **${c.overallNatal}**.`,
    );

    if (c.businessVsJob > 0) {
      parts.push(
        `Classical rule: 11th (${c.eleventhSav}) > 10th (${c.tenthSav}) — business/entrepreneurial paths are well-supported.`,
      );
    } else if (c.businessVsJob < 0) {
      parts.push(
        `Classical rule: 10th (${c.tenthSav}) > 11th (${c.eleventhSav}) — structured employment path recommended.`,
      );
    }

    parts.push(
      `Your Amatya Karaka is **${c.amkPlanet}** (${c.amkIn10}/8 bindus in 10th sign).`,
    );

    lines.push(`**Jaimini + Ashtakvarga check:**\n${parts.join(" ")}`);
  }

  // Generic house-level SAV for other categories (children, property, education, etc.)
  if (lines.length === 0 && enriched.houseSav.length > 0 && houses.length > 0) {
    const primary = houses[0];
    const row = enriched.houseSav.find((h) => h.house === primary);
    if (row) {
      const descriptor =
        row.strength === "Strong"
          ? "strongly supported — this house carries solid natal blessings"
          : row.strength === "Average"
            ? "balanced — neither strained nor overflowing"
            : "below the classical threshold — this life area benefits from conscious effort and favourable transits";
      lines.push(
        `**Ashtakvarga check:** Your ${primary}${ord(primary)} house (${row.sign}) has **${row.bindus} bindus**, which is ${descriptor}.`,
      );
    }
  }

  return lines.join("\n\n");
}

function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function buildGeneralAnswer(
  report: LifeEventsReport,
  windowContext?: WindowContext,
): string {
  const parts: string[] = [];
  const cs = report.chartSummary;
  const cpa = report.currentPeriodAnalysis;

  // Warm opening
  parts.push(`You have a **${cs.lagna}** ascendant with ${cs.lagnaLord} as your lagna lord, placed in ${cs.lagnaLordPlacement}. ${cs.description}`);

  // Current period — what matters NOW
  parts.push(`Right now you're in **${cpa.mahadasha}-${cpa.antardasha}** period (until ${cpa.endDate.slice(0, 7).replace("-", "/")}), which is ${outlookWord(cpa.overallNature)}. ${cpa.detailedAnalysis}`);

  // Quick opportunities + cautions
  if (cpa.opportunities.length > 0) {
    parts.push(`Some things working in your favour right now:\n${cpa.opportunities.slice(0, 3).map(o => `• ${o}`).join("\n")}`);
  }
  if (cpa.cautions.length > 0) {
    parts.push(`Things to be mindful about:\n${cpa.cautions.slice(0, 2).map(c => `• ${c}`).join("\n")}`);
  }

  // Window-scoped highlights if we have them — otherwise fall back to the
  // top 3 upcoming from the full report.
  if (windowContext && windowContext.highlights.length > 0) {
    const lines = windowContext.highlights.slice(0, 4).map((h) => {
      const arrow = h.direction === "past" ? "◀" : "▶";
      return `${arrow} **${h.event}** around ${h.window} — ${likelihoodWord(h.likelihood)}`;
    });
    parts.push(`Key things inside this window:\n${lines.join("\n")}`);
  } else {
    const topUpcoming = [...report.upcomingHighlights]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (topUpcoming.length > 0) {
      const lines = topUpcoming.map((h) =>
        `• **${h.event}** around ${h.window} — ${likelihoodWord(h.likelihood)}`,
      );
      parts.push(`Some key things coming up for you:\n${lines.join("\n")}`);
    }
  }

  // Active transits inside the window — short, only when present
  if (windowContext && windowContext.transits.length > 0) {
    const active = windowContext.transits.filter((t) => t.gochara === "active");
    if (active.length > 0) {
      const lines = active.slice(0, 3).map((t) =>
        `• **${t.planet}** moves through your ${t.endHouseFromLagna}th house (${t.houseTheme}) — ${t.effect}`,
      );
      parts.push(`Transit movements in this window:\n${lines.join("\n")}`);
    }
  }

  parts.push("Feel free to ask me about anything specific — career, marriage, health, money, travel, or any other area of life!");

  return parts.join("\n\n");
}

function buildDashaAnswer(report: LifeEventsReport): string {
  const parts: string[] = [];
  const cpa = report.currentPeriodAnalysis;

  parts.push(`You're currently running **${cpa.mahadasha}-${cpa.antardasha}** (${cpa.startDate.slice(0, 7).replace("-", "/")} to ${cpa.endDate.slice(0, 7).replace("-", "/")}). This period is ${outlookWord(cpa.overallNature)}.`);
  parts.push(cpa.detailedAnalysis);

  // Brief timeline of major periods
  const dashaLines = report.dashaPredictions.map(d => {
    const current = d.isCurrent ? " ← **you are here**" : "";
    return `• **${d.planet}** (${d.startDate.slice(0, 4)}–${d.endDate.slice(0, 4)})${current} — ${outlookWord(d.overallNature)}, themes: ${d.themes.slice(0, 3).join(", ")}`;
  });
  parts.push(`Your major life periods:\n${dashaLines.join("\n")}`);

  if (cpa.remedialSuggestions.length > 0) {
    parts.push(`Some supportive remedies for this period:\n${cpa.remedialSuggestions.map(r => `• ${r}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

// Trim reasoning to be more concise — remove the technical prefix
function trimReasoning(reasoning: string): string {
  // The reasoning often starts with "Planet (Xth lord) with Planet (Yth lord)."
  // Keep it but trim if too long
  if (reasoning.length > 200) {
    const firstSentenceEnd = reasoning.indexOf(". ", 100);
    if (firstSentenceEnd > 0 && firstSentenceEnd < 250) {
      return reasoning.slice(0, firstSentenceEnd + 1);
    }
    return reasoning.slice(0, 200) + "...";
  }
  return reasoning;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export interface ChatAnswer {
  answer: string;
  metadata: {
    categories: string[];
    houses: number[];
    planets: string[];
    isGeneral: boolean;
  };
}

export function answerAstrologyQuestion(
  question: string,
  chart: ChartResponse,
  report: LifeEventsReport,
  rules: ChatRules,
  enriched?: EnrichedChatContext,
  windowContext?: WindowContext,
): ChatAnswer {
  const lower = question.toLowerCase();
  const isDashaQuestion = /dasha|period|mahadasha|antardasha|timing|when will|how long/.test(lower);

  const classification = classifyQuestion(rules, question);

  let answer: string;

  if (classification.isGeneral && !isDashaQuestion) {
    // General questions still get the window note if present, but the body
    // is the chart snapshot + window-scoped highlights/transits.
    const general = buildGeneralAnswer(report, windowContext);
    answer = windowContext
      ? `${windowContext.window.userNote}\n\n${general}`
      : general;
  } else if (isDashaQuestion && classification.isGeneral) {
    const dasha = buildDashaAnswer(report);
    answer = windowContext
      ? `${windowContext.window.userNote}\n\n${dasha}`
      : dasha;
  } else {
    answer = buildCategoryAnswer(
      report,
      classification.categories,
      classification.houses,
      classification.planets,
      classification.askingAboutPast,
      enriched,
      classification.yearRange,
      windowContext,
    );

    // If answer is too thin, add a gentle general nudge
    if (answer.length < 150) {
      answer += "\n\nI don't have very strong indicators in your chart for this specific area. Would you like me to look at something else — like career, relationships, or your current dasha period?";
    }
  }

  return {
    answer,
    metadata: {
      categories: classification.categories,
      houses: classification.houses,
      planets: classification.planets,
      isGeneral: classification.isGeneral,
    },
  };
}

// ─── Fact Extraction (for LLM composer) ─────────────────────────────────────

/**
 * Structured, JSON-friendly facts about the user's chart relevant to the
 * question. The LLM composer serializes these into its prompt — the model
 * ONLY uses these facts (never invents) and composes natural prose around them.
 */
export interface AnswerFacts {
  question: string;
  askingAboutPast: boolean;
  yearRange?: { start?: number; end?: number };
  isDashaQuestion: boolean;
  isGeneral: boolean;
  timeScope: TimeScope;
  /**
   * Today's transit-level context. Populated by the route (not this
   * function) when timeScope is "today" or "thisWeek" — requires a backend
   * call for current transits. Absent for general/historical questions.
   */
  dailyContext?: DailyContext;
  categories: string[];
  categoryFacts: {
    id: string;
    name: string;
    outlook: string;
    summary: string;
  }[];
  currentPeriod?: {
    mahadasha: string;
    antardasha: string;
    endDate: string;
    themes: string;
    relevantPredictions: string[];
  };
  relevantPlanets: {
    name: string;
    house: number;
    dignity?: string | null;
    interpretation: string;
  }[];
  upcomingWindows: {
    window: string;
    dashaContext: string;
    likelihood: string;
    reasoning: string;
    category: string;
  }[];
  pastWindows: {
    window: string;
    dashaContext: string;
    reasoning: string;
    category: string;
  }[];
  relevantYogas: {
    name: string;
    impact: string;
  }[];
  enrichedNote?: string;
  generalSnapshot?: {
    lagna: string;
    lagnaLord: string;
    topStrengths: { planet: string; note: string }[];
  };
  /**
   * Resolved time window for this question. Always present when the route
   * invokes the window resolver. The LLM composer uses this as the primary
   * framing for every answer (not the legacy timeScope enum).
   */
  window?: QuestionWindow;
  /**
   * Window-scoped signals: dasha segments, clipped highlights, slow-planet
   * transits projected across the range, Jaimini hits, house SAV focus.
   */
  windowContext?: WindowContext;
}

export interface DailyContext {
  date: string;
  moonSign: string;
  moonNakshatra?: string;
  moonHouseFromLagna: number;
  moonHouseTheme: string;
  activeTransits: {
    planet: string;
    transitSign: string;
    houseFromLagna: number;
    houseTheme: string;
    nature: "benefic" | "malefic";
    effect: string;
    bav?: number;
    threshold?: number;
  }[];
}

export function extractAnswerFacts(
  question: string,
  chart: ChartResponse,
  report: LifeEventsReport,
  rules: ChatRules,
  enriched?: EnrichedChatContext,
  window?: QuestionWindow,
  windowContext?: WindowContext,
): AnswerFacts {
  const lower = question.toLowerCase();
  const isDashaQuestion = /dasha|period|mahadasha|antardasha|timing|when will|how long/.test(lower);
  const classification = classifyQuestion(rules, question);

  const categoryIds = classification.categories;
  const categories = getRelevantCategories(report, categoryIds);
  const currentDashaPred = getCurrentDashaPrediction(report);
  const cpa = report.currentPeriodAnalysis;
  const relevantPlanets = getRelevantPlanets(report, classification.planets);

  const upcoming = getRelevantHighlights(report.upcomingHighlights, categoryIds, 4);

  let pastPool = report.pastHighlights;
  if (classification.yearRange?.start) {
    const filtered = highlightsInYearRange(pastPool, classification.yearRange);
    if (filtered.length > 0) pastPool = filtered;
  }
  const past = classification.askingAboutPast
    ? getRelevantHighlights(pastPool, categoryIds, classification.yearRange ? 5 : 3)
    : [];

  const yogas = getRelevantYogas(report, classification.houses, classification.planets);

  const enrichedNote = enriched
    ? buildEnrichedSection(enriched, categoryIds, classification.houses) || undefined
    : undefined;

  const currentPeriod = cpa
    ? {
        mahadasha: cpa.mahadasha,
        antardasha: cpa.antardasha,
        endDate: cpa.endDate,
        themes: Array.isArray(currentDashaPred?.themes)
          ? currentDashaPred?.themes.join(", ") ?? ""
          : (currentDashaPred?.themes as unknown as string) ?? "",
        relevantPredictions: (currentDashaPred?.eventPredictions ?? [])
          .filter((ep) => categoryIds.includes(ep.category))
          .slice(0, 3)
          .map((ep) => ep.description),
      }
    : undefined;

  // General snapshot for open-ended questions
  const generalSnapshot = classification.isGeneral
    ? {
        lagna: chart.lagna,
        lagnaLord: report.planetaryStrengths[0]?.planet ?? "",
        topStrengths: report.planetaryStrengths
          .filter((p) => p.strength === "strong")
          .slice(0, 3)
          .map((p) => ({ planet: p.planet, note: p.interpretation })),
      }
    : undefined;

  return {
    question,
    askingAboutPast: classification.askingAboutPast,
    yearRange: classification.yearRange,
    isDashaQuestion,
    isGeneral: classification.isGeneral,
    timeScope: classification.timeScope,
    categories: categoryIds,
    categoryFacts: categories.map((c) => ({
      id: c.id,
      name: c.name,
      outlook: c.overallOutlook,
      summary: c.summary,
    })),
    currentPeriod,
    relevantPlanets: relevantPlanets.map((p) => ({
      name: p.planet,
      house: p.house,
      dignity: p.dignity ?? null,
      interpretation: p.interpretation,
    })),
    upcomingWindows: upcoming.map((h) => ({
      window: h.window,
      dashaContext: h.dashaContext,
      likelihood: h.likelihood,
      reasoning: trimReasoning(h.reasoning),
      category: h.category,
    })),
    pastWindows: past.map((h) => ({
      window: h.window,
      dashaContext: h.dashaContext,
      reasoning: trimReasoning(h.reasoning),
      category: h.category,
    })),
    relevantYogas: yogas.slice(0, 3).map((y) => ({
      name: y.name,
      impact: y.lifeEventImpact,
    })),
    enrichedNote,
    generalSnapshot,
    window,
    windowContext,
  };
}
