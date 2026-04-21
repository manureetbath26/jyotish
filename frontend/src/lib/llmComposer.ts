import OpenAI from "openai";
import type { ChartResponse } from "@/lib/api";
import type { AnswerFacts } from "@/lib/chatEngine";

/**
 * LLM-backed natural-language composer for chat answers.
 *
 * Architecture: the chat engine extracts structured facts from the chart
 * (AnswerFacts). This function passes those facts to an LLM with a strict
 * system prompt that forbids invention — the model only composes prose
 * around the given facts. Fails loudly so the caller can fall back to the
 * deterministic template if needed.
 */

const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function isLlmComposerAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_PROMPT = `You are a warm, thoughtful Vedic astrologer speaking with a client whose chart you've already studied. Your job is to answer THEIR SPECIFIC QUESTION in natural, conversational prose, grounded ONLY in the structured facts provided.

STRICT RULES:
1. ANSWER THE USER'S QUESTION DIRECTLY. Do not recite the full category summary. Select only the facts that genuinely help answer THIS question at its stated time-scope.
2. NEVER invent chart data, planetary positions, houses, dashas, yogas, or windows that aren't in the facts. If the facts don't cover something the user asked about, say so honestly in one line.
3. Do NOT use bullet lists, markdown headers, or bolded field labels ("**Current period:**" etc.). Weave everything into flowing paragraphs.
4. Keep total length under 180 words for focused questions, under 220 for open-ended ones. Two short paragraphs is the usual shape.
5. Plain language. Vedic terms are fine; gloss them briefly when useful. Avoid jargon when the user's phrasing is casual.
6. Vary your openings question-to-question — never start two answers with the same phrase.

TIME-SCOPE RULES:
- If timeScope is "today" AND dailyContext is present, PRIORITISE dailyContext over long-range predictions. Talk about today's Moon, today's active transits, and what's happening for the user right now. The user asked about today — give them today.
- If timeScope is "today" but dailyContext is absent, say honestly that you don't have today's transit detail and offer to give a longer-horizon answer instead.
- If timeScope is "thisWeek"/"thisMonth", blend dailyContext (if any) with the nearest upcoming window.
- If timeScope is "general", use categoryFacts + upcoming windows naturally.
- If asked about a specific past year, address THAT window first.

STRUCTURE for time-scoped answers:
  Open with today's/this-week's pulse (Moon + any active transits).
  Then 1 sentence of standing context (current dasha as background).
  Then the practical takeaway for the stated question.

STRUCTURE for general/category answers:
  Open with a direct take on the user's specific question.
  One sentence on the key planet(s) or current dasha.
  Mention ONE most-relevant upcoming window if and only if the user's question is time-sensitive.
  Optional closing line with one grounded piece of advice.

You are never diagnostic or fatalistic. Tone: a knowledgeable friend who sees the pattern and names it.`;

function serializeFacts(facts: AnswerFacts, chart: ChartResponse): string {
  const lines: string[] = [];
  lines.push(`QUESTION: ${facts.question}`);
  lines.push(`CHART: ${chart.lagna} lagna, born ${chart.date} ${chart.time}, ${chart.place}.`);
  if (facts.categories.length) {
    lines.push(`DETECTED THEMES: ${facts.categories.join(", ")}`);
  }
  lines.push(`TIME SCOPE: ${facts.timeScope}`);
  if (facts.timeScope === "today" && !facts.dailyContext) {
    lines.push(
      `(User asked about today but today's transit data could not be computed; answer briefly and honestly.)`,
    );
  }
  if (facts.isDashaQuestion) {
    lines.push(`USER IS ASKING ABOUT TIMING / DASHAS.`);
  }
  if (facts.askingAboutPast) {
    lines.push(
      `USER IS ASKING ABOUT THE PAST${
        facts.yearRange?.start
          ? ` (specifically ${facts.yearRange.start}${
              facts.yearRange.end && facts.yearRange.end !== facts.yearRange.start
                ? `-${facts.yearRange.end}`
                : ""
            })`
          : ""
      }.`,
    );
  }

  if (facts.categoryFacts.length) {
    lines.push("");
    lines.push("CATEGORY OUTLOOK (from the user's pre-computed Life Events Report):");
    for (const c of facts.categoryFacts) {
      lines.push(`- ${c.name}: overall outlook "${c.outlook}". ${c.summary}`);
    }
  }

  if (facts.dailyContext) {
    const dc = facts.dailyContext;
    lines.push("");
    lines.push(`TODAY (${dc.date}) — USE THIS FIRST when timeScope is "today":`);
    lines.push(
      `- Moon is in ${dc.moonSign}${dc.moonNakshatra ? ` / ${dc.moonNakshatra}` : ""}, the user's ${dc.moonHouseFromLagna}th house (${dc.moonHouseTheme}). This is the day's emotional pulse.`,
    );
    if (dc.activeTransits.length > 0) {
      lines.push("  Active transits today (passed BAV gochara threshold):");
      for (const t of dc.activeTransits.slice(0, 5)) {
        lines.push(
          `    - ${t.planet} transiting ${t.transitSign} (user's ${t.houseFromLagna}th, ${t.houseTheme}) \u2014 ${t.nature} \u2014 ${t.effect}`,
        );
      }
    } else {
      lines.push("  No transits above BAV threshold today \u2014 a quiet day.");
    }
  }

  if (facts.currentPeriod) {
    lines.push("");
    lines.push(
      `CURRENT DASHA (standing background, not today-specific): ${facts.currentPeriod.mahadasha}\u2013${facts.currentPeriod.antardasha} until ${facts.currentPeriod.endDate.slice(0, 7)}.`,
    );
    if (facts.currentPeriod.themes) lines.push(`  Themes: ${facts.currentPeriod.themes}`);
    if (facts.currentPeriod.relevantPredictions.length) {
      lines.push("  Relevant predictions for this period:");
      facts.currentPeriod.relevantPredictions.forEach((p) => lines.push(`    · ${p}`));
    }
  }

  if (facts.relevantPlanets.length) {
    lines.push("");
    lines.push("KEY PLANETS FOR THIS QUESTION:");
    for (const p of facts.relevantPlanets.slice(0, 3)) {
      lines.push(
        `- ${p.name} in house ${p.house}${p.dignity ? ` (${p.dignity})` : ""}: ${p.interpretation}`,
      );
    }
  }

  if (facts.upcomingWindows.length) {
    lines.push("");
    lines.push("UPCOMING WINDOWS (next ~5 years):");
    for (const w of facts.upcomingWindows) {
      lines.push(`- ${w.window} (${w.dashaContext}) — ${w.likelihood}. ${w.reasoning}`);
    }
  }

  if (facts.pastWindows.length) {
    lines.push("");
    lines.push("RELEVANT PAST WINDOWS:");
    for (const w of facts.pastWindows) {
      lines.push(`- ${w.window} (${w.dashaContext}): ${w.reasoning}`);
    }
  }

  if (facts.relevantYogas.length) {
    lines.push("");
    lines.push("RELEVANT YOGAS IN THE CHART:");
    for (const y of facts.relevantYogas) {
      lines.push(`- ${y.name}: ${y.impact}`);
    }
  }

  if (facts.enrichedNote) {
    lines.push("");
    lines.push("JAIMINI + ASHTAKVARGA INSIGHT (already computed, weave naturally):");
    lines.push(facts.enrichedNote.replace(/\*\*/g, ""));
  }

  if (facts.generalSnapshot) {
    lines.push("");
    lines.push(
      `CHART SNAPSHOT: ${facts.generalSnapshot.lagna} lagna. Strongest planets: ${facts.generalSnapshot.topStrengths
        .map((s) => s.planet)
        .join(", ") || "(none flagged strong)"}.`,
    );
  }

  return lines.join("\n");
}

/**
 * Compose a natural-language answer from structured facts. Returns the
 * assistant's text. Throws on API failure — caller should catch and fall
 * back to the deterministic template answer.
 */
export async function composeNaturalAnswer(
  facts: AnswerFacts,
  chart: ChartResponse,
): Promise<string> {
  const openai = getClient();
  const userPrompt = serializeFacts(facts, chart);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 420,
    presence_penalty: 0.3,
    frequency_penalty: 0.3,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }
  return content;
}
