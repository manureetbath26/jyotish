/**
 * Chat engine: classifies user questions and composes answers
 * from the pre-computed LifeEventsReport.
 *
 * The engine does NOT use LLMs — it's a deterministic keyword-matching
 * + template system that extracts relevant sections from the report.
 */

import { ChartResponse } from "@/lib/api";
import {
  LifeEventsReport,
  LifeHighlight,
  EventCategory,
  DashaPrediction,
  HouseSignificance,
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

// ─── Classification ─────────────────────────────────────────────────────────

interface ClassificationResult {
  categories: string[];
  houses: number[];
  planets: string[];
  isGeneral: boolean;
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

  if (matched.length === 0) {
    return { categories: ["general"], houses: [], planets: [], isGeneral: true };
  }

  const categories = [...new Set(matched.map(m => m.id))];
  const houses = [...new Set(matched.flatMap(m => m.houses))];
  const planets = [...new Set(matched.flatMap(m => m.planets))];

  return { categories, houses, planets, isGeneral: false };
}

// ─── Answer Composition ─────────────────────────────────────────────────────

function getRelevantHouseAnalysis(report: LifeEventsReport, houses: number[]): HouseSignificance[] {
  return report.houseAnalysis.filter(h => houses.includes(h.house));
}

function getRelevantPlanets(report: LifeEventsReport, planets: string[]): PlanetStrength[] {
  return report.planetaryStrengths.filter(p => planets.includes(p.planet));
}

function getRelevantCategories(report: LifeEventsReport, categoryIds: string[]): EventCategory[] {
  return report.eventCategories.filter(c => categoryIds.includes(c.id));
}

function getRelevantHighlights(highlights: LifeHighlight[], categoryIds: string[], limit: number = 5): LifeHighlight[] {
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

// ─── Answer Templates ───────────────────────────────────────────────────────

function buildCategoryAnswer(
  report: LifeEventsReport,
  categoryIds: string[],
  houses: number[],
  planets: string[],
): string {
  const sections: string[] = [];

  // 1. Category outlook
  const categories = getRelevantCategories(report, categoryIds);
  if (categories.length > 0) {
    for (const cat of categories) {
      sections.push(`**${cat.icon} ${cat.name} — Overall Outlook: ${formatOutlook(cat.overallOutlook)}**\n${cat.summary}`);
    }
  }

  // 2. House analysis for relevant houses
  const houseInfo = getRelevantHouseAnalysis(report, houses);
  if (houseInfo.length > 0) {
    const houseLines = houseInfo.map(h =>
      `• **House ${h.house}** (${h.rashi}, lord ${h.lord} in ${h.lordPlacement}${h.lordDignity ? `, ${h.lordDignity}` : ""}): ${h.interpretation}`
    );
    sections.push(`**Key Houses:**\n${houseLines.join("\n")}`);
  }

  // 3. Planet strengths
  const planetInfo = getRelevantPlanets(report, planets);
  if (planetInfo.length > 0) {
    const planetLines = planetInfo.map(p =>
      `• **${p.planet}** in ${p.rashi} (House ${p.house}${p.dignity ? `, ${p.dignity}` : ""}): ${p.interpretation}`
    );
    sections.push(`**Key Planets:**\n${planetLines.join("\n")}`);
  }

  // 4. Current period context
  const currentDasha = getCurrentDashaPrediction(report);
  if (currentDasha) {
    const relevantPredictions = currentDasha.eventPredictions
      .filter(ep => categoryIds.includes(ep.category))
      .slice(0, 2);
    if (relevantPredictions.length > 0) {
      const predLines = relevantPredictions.map(p =>
        `• ${p.description} (${p.likelihood}, ${p.timing})`
      );
      sections.push(`**Current ${currentDasha.planet} Mahadasha Context:**\n${predLines.join("\n")}`);
    }
  }

  // 5. Current period opportunities/cautions
  const cpa = report.currentPeriodAnalysis;
  const relevantOpps = cpa.opportunities.filter(o =>
    categoryIds.some(cid => o.toLowerCase().includes(cid.replace("_", " ")))
  );
  const relevantCautions = cpa.cautions.filter(c =>
    categoryIds.some(cid => c.toLowerCase().includes(cid.replace("_", " ")))
  );
  if (relevantOpps.length > 0) {
    sections.push(`**Current Opportunities:**\n${relevantOpps.map(o => `• ${o}`).join("\n")}`);
  }
  if (relevantCautions.length > 0) {
    sections.push(`**Current Cautions:**\n${relevantCautions.map(c => `• ${c}`).join("\n")}`);
  }

  // 6. Upcoming highlights
  const upcoming = getRelevantHighlights(report.upcomingHighlights, categoryIds, 3);
  if (upcoming.length > 0) {
    const lines = upcoming.map(h =>
      `• **${h.event}** (${h.window}, ${h.dashaContext}): ${h.likelihood} — ${h.reasoning}`
    );
    sections.push(`**Upcoming Predictions:**\n${lines.join("\n")}`);
  }

  // 7. Past highlights (for context)
  const past = getRelevantHighlights(report.pastHighlights, categoryIds, 2);
  if (past.length > 0) {
    const lines = past.map(h =>
      `• **${h.event}** (${h.window}, ${h.dashaContext}): ${h.reasoning}`
    );
    sections.push(`**Past Events (for context):**\n${lines.join("\n")}`);
  }

  // 8. Yoga influences
  const yogas = getRelevantYogas(report, houses, planets);
  if (yogas.length > 0) {
    const yogaLines = yogas.map(y =>
      `• **${y.name}** (${y.strength}): ${y.lifeEventImpact}`
    );
    sections.push(`**Yoga Influences:**\n${yogaLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

function buildGeneralAnswer(report: LifeEventsReport): string {
  const sections: string[] = [];

  // Chart summary
  const cs = report.chartSummary;
  sections.push(
    `**Your Chart Overview:**\n` +
    `Lagna (Ascendant): ${cs.lagna} | Lagna Lord: ${cs.lagnaLord} in ${cs.lagnaLordPlacement}\n` +
    `Moon Sign: ${cs.moonSign} | Sun Sign: ${cs.sunSign}\n` +
    `Current Period: ${cs.currentDasha}-${cs.currentAntardasha}\n\n` +
    cs.description
  );

  // Current period
  const cpa = report.currentPeriodAnalysis;
  sections.push(
    `**Current Period: ${cpa.mahadasha}-${cpa.antardasha} (${cpa.startDate} – ${cpa.endDate})**\n` +
    `Nature: ${formatOutlook(cpa.overallNature)}\n\n` +
    cpa.detailedAnalysis
  );

  if (cpa.opportunities.length > 0) {
    sections.push(`**Opportunities:**\n${cpa.opportunities.map(o => `• ${o}`).join("\n")}`);
  }
  if (cpa.cautions.length > 0) {
    sections.push(`**Cautions:**\n${cpa.cautions.map(c => `• ${c}`).join("\n")}`);
  }

  // Top upcoming highlights across all categories
  const topUpcoming = [...report.upcomingHighlights]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (topUpcoming.length > 0) {
    const lines = topUpcoming.map(h =>
      `• **${h.event}** (${h.window}): ${h.likelihood} — ${h.reasoning.slice(0, 150)}${h.reasoning.length > 150 ? "..." : ""}`
    );
    sections.push(`**Top Upcoming Predictions:**\n${lines.join("\n")}`);
  }

  // Yogas
  const activeYogas = report.yogaInfluences.filter(y => y.isPresent);
  if (activeYogas.length > 0) {
    const yogaLines = activeYogas.slice(0, 4).map(y =>
      `• **${y.name}** (${y.strength}): ${y.effect}`
    );
    sections.push(`**Active Yogas in Your Chart:**\n${yogaLines.join("\n")}`);
  }

  sections.push("Feel free to ask about specific life areas like career, marriage, health, wealth, education, or any other topic!");

  return sections.join("\n\n");
}

function buildDashaAnswer(report: LifeEventsReport): string {
  const sections: string[] = [];

  const cpa = report.currentPeriodAnalysis;
  sections.push(
    `**Current Period: ${cpa.mahadasha}-${cpa.antardasha}**\n` +
    `Window: ${cpa.startDate} – ${cpa.endDate}\n` +
    `Nature: ${formatOutlook(cpa.overallNature)}\n\n` +
    cpa.detailedAnalysis
  );

  // Show all mahadasha periods
  const dashaLines = report.dashaPredictions.map(d =>
    `• **${d.planet} Mahadasha** (${d.startDate} – ${d.endDate})${d.isCurrent ? " ← CURRENT" : ""}: ` +
    `${formatOutlook(d.overallNature)} — ${d.themes.slice(0, 3).join(", ")}`
  );
  sections.push(`**Your Dasha Timeline:**\n${dashaLines.join("\n")}`);

  if (cpa.remedialSuggestions.length > 0) {
    sections.push(`**Remedial Suggestions:**\n${cpa.remedialSuggestions.map(r => `• ${r}`).join("\n")}`);
  }

  return sections.join("\n\n");
}

function formatOutlook(outlook: string): string {
  const map: Record<string, string> = {
    very_favorable: "Very Favorable ✨",
    favorable: "Favorable 🟢",
    mixed: "Mixed 🟡",
    challenging: "Challenging 🟠",
    needs_care: "Needs Care 🔴",
  };
  return map[outlook] || outlook;
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
  // Check for dasha/period-specific questions
  const lower = question.toLowerCase();
  const isDashaQuestion = /dasha|period|mahadasha|antardasha|timing|when will/.test(lower);

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
    );

    // If category answer is too thin, append general context
    if (answer.length < 200) {
      answer += "\n\n" + buildGeneralAnswer(report);
    }
  }

  // Add footer
  answer += "\n\n---\n*Analysis based on your Vedic birth chart using Vimshottari dasha system, planetary dignities, house lordships, and transit positions.*";

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
