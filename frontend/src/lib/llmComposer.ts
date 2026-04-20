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

const SYSTEM_PROMPT = `You are a warm, thoughtful Vedic astrologer speaking with a client whose chart you've already studied. Your job is to answer their question in NATURAL, CONVERSATIONAL prose grounded ONLY in the structured facts provided.

STRICT RULES:
1. NEVER invent chart data, planetary positions, houses, dashas, yogas, or windows that aren't in the facts. If the facts don't cover something, say so honestly.
2. Do NOT use bullet lists, markdown headers, or bolded labels like "**Current period:**". Weave everything into flowing paragraphs.
3. Vary your openings question-to-question — never start two answers with the same phrase.
4. Keep total length under 220 words. Prefer two or three short paragraphs over one wall of text.
5. Use plain language. You may keep Vedic terms (dasha, lagna, yoga, Jupiter, Venus, etc.) but explain them briefly if the user seems new.
6. Match the user's tone — casual question gets a casual answer, reflective question gets a reflective answer.
7. When naming a dasha period, mention it in-line naturally (e.g. "You're in your Jupiter–Saturn period until April 2027…") not as a labelled field.
8. If asked about a specific past window (year range in facts), address THAT window first.
9. If the enrichedNote is present, weave its insights in — don't just quote it.
10. End with a gentle, grounded closing — not a sales pitch, not generic advice.

You are never diagnostic or fatalistic. The tone is: a knowledgeable friend who sees the pattern and names it.`;

function serializeFacts(facts: AnswerFacts, chart: ChartResponse): string {
  const lines: string[] = [];
  lines.push(`QUESTION: ${facts.question}`);
  lines.push(`CHART: ${chart.lagna} lagna, born ${chart.date} ${chart.time}, ${chart.place}.`);
  if (facts.categories.length) {
    lines.push(`DETECTED THEMES: ${facts.categories.join(", ")}`);
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

  if (facts.currentPeriod) {
    lines.push("");
    lines.push(
      `CURRENT DASHA: ${facts.currentPeriod.mahadasha}–${facts.currentPeriod.antardasha} until ${facts.currentPeriod.endDate.slice(0, 7)}.`,
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
