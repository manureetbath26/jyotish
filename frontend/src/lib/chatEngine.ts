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

// ─── Question Classification ────────────────────────────────────────────────

interface QuestionCategory {
  id: string;
  keywords: string[];
  houses: number[];
  planets: string[];
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    id: "marriage",
    keywords: ["marriage", "marry", "married", "wedding", "spouse", "husband", "wife", "partner", "partnership", "soulmate", "life partner", "shaadi", "vivah"],
    houses: [7, 2, 11],
    planets: ["Venus", "Jupiter"],
  },
  {
    id: "romance",
    keywords: ["love", "romance", "romantic", "relationship", "dating", "boyfriend", "girlfriend", "attraction", "pyaar"],
    houses: [5, 7, 11],
    planets: ["Venus", "Moon"],
  },
  {
    id: "children",
    keywords: ["children", "child", "kids", "baby", "pregnancy", "pregnant", "son", "daughter", "progeny", "conceive", "fertility", "santan"],
    houses: [5, 9, 2],
    planets: ["Jupiter"],
  },
  {
    id: "career_growth",
    keywords: ["career", "job", "work", "profession", "promotion", "professional", "salary", "boss", "office", "employment", "naukri"],
    houses: [10, 6, 11, 1],
    planets: ["Sun", "Saturn"],
  },
  {
    id: "wealth",
    keywords: ["money", "wealth", "rich", "income", "financial", "finance", "earn", "earnings", "prosperity", "dhan", "paisa"],
    houses: [2, 11, 9, 5],
    planets: ["Jupiter", "Venus"],
  },
  {
    id: "property",
    keywords: ["property", "house", "home", "flat", "apartment", "land", "vehicle", "car", "real estate", "ghar", "plot"],
    houses: [4, 11, 2],
    planets: ["Mars", "Moon"],
  },
  {
    id: "education",
    keywords: ["education", "study", "studies", "exam", "academic", "college", "university", "degree", "learn", "school", "padhai"],
    houses: [4, 5, 9],
    planets: ["Jupiter", "Mercury"],
  },
  {
    id: "fame",
    keywords: ["fame", "famous", "recognition", "reputation", "status", "public", "celebrity", "influence", "social media"],
    houses: [10, 1, 5, 11],
    planets: ["Sun", "Rahu"],
  },
  {
    id: "new_business",
    keywords: ["business", "startup", "venture", "entrepreneurship", "self-employed", "company", "enterprise", "vyapar"],
    houses: [7, 10, 3, 11],
    planets: ["Mercury"],
  },
  {
    id: "foreign_travel",
    keywords: ["foreign", "abroad", "travel", "overseas", "immigration", "visa", "settle abroad", "videsh"],
    houses: [9, 12, 3],
    planets: ["Rahu"],
  },
  {
    id: "spiritual_growth",
    keywords: ["spiritual", "spirituality", "meditation", "moksha", "enlightenment", "guru", "dharma", "temple", "prayer", "adhyatm"],
    houses: [9, 12, 5],
    planets: ["Jupiter", "Ketu"],
  },
  {
    id: "health_issues",
    keywords: ["health", "illness", "disease", "sick", "hospital", "surgery", "medical", "doctor", "fitness", "body", "rogam", "bimari"],
    houses: [6, 8, 1, 12],
    planets: ["Saturn", "Mars", "Rahu"],
  },
  {
    id: "relationship_conflict",
    keywords: ["divorce", "separation", "breakup", "conflict", "fight", "argument", "dispute", "cheating", "toxicity"],
    houses: [7, 6, 12, 8],
    planets: ["Mars", "Saturn", "Rahu", "Ketu"],
  },
  {
    id: "financial_loss",
    keywords: ["loss", "debt", "loan", "bankrupt", "poverty", "expense", "waste", "fraud", "scam"],
    houses: [12, 6, 8, 2],
    planets: ["Rahu", "Saturn"],
  },
  {
    id: "career_setback",
    keywords: ["fired", "layoff", "terminated", "job loss", "demoted", "unemployed", "resign"],
    houses: [10, 8, 12],
    planets: ["Saturn", "Rahu"],
  },
  {
    id: "protective_disruption",
    keywords: ["redirect", "protection", "purpose", "disruption for good", "blessing in disguise", "life change", "transformation"],
    houses: [1, 8],
    planets: ["Ketu"],
  },
];

// Past-specific keywords — only show past events if user explicitly asks
const PAST_KEYWORDS = ["past", "before", "earlier", "previous", "ago", "happened", "did i", "was there", "last year", "back then", "history", "already"];

// ─── Classification ─────────────────────────────────────────────────────────

interface ClassificationResult {
  categories: string[];
  houses: number[];
  planets: string[];
  isGeneral: boolean;
  askingAboutPast: boolean;
}

function classifyQuestion(question: string): ClassificationResult {
  const lower = question.toLowerCase();
  const matched: QuestionCategory[] = [];

  for (const cat of QUESTION_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        matched.push(cat);
        break;
      }
    }
  }

  const askingAboutPast = PAST_KEYWORDS.some(kw => lower.includes(kw));

  if (matched.length === 0) {
    return { categories: ["general"], houses: [], planets: [], isGeneral: true, askingAboutPast };
  }

  const categories = [...new Set(matched.map(m => m.id))];
  const houses = [...new Set(matched.flatMap(m => m.houses))];
  const planets = [...new Set(matched.flatMap(m => m.planets))];

  return { categories, houses, planets, isGeneral: false, askingAboutPast };
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
): string {
  const parts: string[] = [];
  const categories = getRelevantCategories(report, categoryIds);
  const currentDasha = getCurrentDashaPrediction(report);
  const cpa = report.currentPeriodAnalysis;

  // Opening — warm, direct summary
  if (categories.length > 0) {
    const cat = categories[0];
    const outlookDesc = outlookWord(cat.overallOutlook);
    parts.push(`Looking at your chart, ${cat.name.toLowerCase()} is ${outlookDesc} for you overall. ${cat.summary}`);
  }

  // What's relevant RIGHT NOW — current period context
  if (currentDasha) {
    const relevantPreds = currentDasha.eventPredictions
      .filter(ep => categoryIds.includes(ep.category))
      .slice(0, 2);
    if (relevantPreds.length > 0) {
      parts.push(`Right now, you're running **${cpa.mahadasha}-${cpa.antardasha}** (until ${cpa.endDate.slice(0, 7).replace("-", "/")}). ${relevantPreds.map(p => p.description).join(" ")}`);
    } else {
      parts.push(`You're currently in **${cpa.mahadasha}-${cpa.antardasha}** period. While this period's main themes don't directly focus on this area, the underlying chart strengths still apply.`);
    }
  }

  // Key planetary influences — woven naturally
  const relevantPlanets = getRelevantPlanets(report, planets);
  if (relevantPlanets.length > 0) {
    const planetNotes = relevantPlanets.slice(0, 2).map(p => {
      const dignityNote = p.dignity ? ` (in ${p.dignity})` : "";
      return `**${p.planet}**${dignityNote} sitting in house ${p.house}`;
    });
    parts.push(`The key planets here are ${planetNotes.join(" and ")}. ${relevantPlanets[0].interpretation}`);
  }

  // Upcoming windows — the most actionable part
  const upcoming = getRelevantHighlights(report.upcomingHighlights, categoryIds, 3);
  if (upcoming.length > 0) {
    const windowTexts = upcoming.map(h => {
      const indicator = likelihoodWord(h.likelihood);
      return `• **${h.window}** (${h.dashaContext}) — ${indicator}. ${trimReasoning(h.reasoning)}`;
    });
    parts.push(`Here are your best upcoming windows:\n${windowTexts.join("\n")}`);
  }

  // Past — ONLY if user explicitly asked
  if (askingAboutPast) {
    const past = getRelevantHighlights(report.pastHighlights, categoryIds, 2);
    if (past.length > 0) {
      const pastTexts = past.map(h =>
        `• **${h.window}** (${h.dashaContext}) — ${trimReasoning(h.reasoning)}`
      );
      parts.push(`Looking back at past periods:\n${pastTexts.join("\n")}`);
    }
  }

  // Yoga mention if relevant — brief
  const yogas = getRelevantYogas(report, houses, planets);
  if (yogas.length > 0) {
    const topYoga = yogas[0];
    parts.push(`Worth noting — you have **${topYoga.name}** in your chart, which ${topYoga.lifeEventImpact.charAt(0).toLowerCase()}${topYoga.lifeEventImpact.slice(1)}`);
  }

  return parts.join("\n\n");
}

function buildGeneralAnswer(report: LifeEventsReport): string {
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

  // Top upcoming — just a taste
  const topUpcoming = [...report.upcomingHighlights]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (topUpcoming.length > 0) {
    const lines = topUpcoming.map(h =>
      `• **${h.event}** around ${h.window} — ${likelihoodWord(h.likelihood)}`
    );
    parts.push(`Some key things coming up for you:\n${lines.join("\n")}`);
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
): ChatAnswer {
  const lower = question.toLowerCase();
  const isDashaQuestion = /dasha|period|mahadasha|antardasha|timing|when will|how long/.test(lower);

  const classification = classifyQuestion(question);

  let answer: string;

  if (classification.isGeneral && !isDashaQuestion) {
    answer = buildGeneralAnswer(report);
  } else if (isDashaQuestion && classification.isGeneral) {
    answer = buildDashaAnswer(report);
  } else {
    answer = buildCategoryAnswer(
      report,
      classification.categories,
      classification.houses,
      classification.planets,
      classification.askingAboutPast,
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
