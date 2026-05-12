// ─────────────────────────────────────────────────────────────────────────────
// Interpreter Node — extracts structured intent from the user's question
//
// Model: GPT-4o-mini (fast, cheap, JSON-only)
// Output: Intent JSON stored in state.intent
// ─────────────────────────────────────────────────────────────────────────────

import { ChatOpenAI } from "@langchain/openai";
import type { AstroChatStateShape, Intent, LifeTheme, Tense } from "./types";

const interpreterLLM = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert intent classifier for a Vedic astrology chatbot.
Extract the user's intent and return ONLY valid JSON matching this exact schema:

{
  "lifeTheme": one of: "marriage" | "career" | "finances" | "health" | "children" | "foreign_travel" | "property" | "spirituality" | "general" | "dasha" | "yoga" | "transit",
  "tense": "past" | "present" | "future",
  "wantsTiming": boolean,
  "wantsStrength": boolean,
  "wantsRemedies": boolean,
  "questionSummary": "one concise sentence restating what was asked",
  "yearsToScan": number or null
}

Rules:
- wantsTiming=true when user asks "when", "which year", "how long"
- wantsStrength=true when user asks about yogas, strength, chances, "is my chart good for X"
- wantsRemedies=true when user asks for remedies, gemstones, mantras, solutions
- yearsToScan: if user asks "next 5 years" use 5; if they say "when will I get married" default to 7; null for present/past
- tense=past for "why did X happen", present for "what is happening now", future for predictions
- For marriage questions: always lifeTheme="marriage"
- For job/promotion/business: lifeTheme="career"
- Return ONLY JSON. No explanation, no markdown, no code fences.`;

function parseIntentSafe(raw: string): Intent {
  try {
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      lifeTheme:       (parsed.lifeTheme ?? "general") as LifeTheme,
      tense:           (parsed.tense ?? "future") as Tense,
      wantsTiming:     Boolean(parsed.wantsTiming),
      wantsStrength:   Boolean(parsed.wantsStrength),
      wantsRemedies:   Boolean(parsed.wantsRemedies),
      questionSummary: String(parsed.questionSummary ?? "General astrology question"),
      yearsToScan:     typeof parsed.yearsToScan === "number" ? parsed.yearsToScan : 7,
    };
  } catch {
    return {
      lifeTheme:       "general",
      tense:           "future",
      wantsTiming:     true,
      wantsStrength:   false,
      wantsRemedies:   false,
      questionSummary: "General astrology question",
      yearsToScan:     7,
    };
  }
}

export async function interpreterNode(
  state: AstroChatStateShape,
): Promise<Partial<AstroChatStateShape>> {
  try {
    const chartSummary = `Lagna: ${state.chart.lagna}, Current Dasha: ${state.chart.current_dasha?.planet}, Sub-dasha: ${state.chart.current_antardasha?.planet}`;

    const response = await interpreterLLM.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Chart context: ${chartSummary}\n\nUser question: "${state.userMessage}"`,
      },
    ]);

    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const intent = parseIntentSafe(content);
    return { intent };
  } catch (err) {
    return {
      error: `Interpreter failed: ${err instanceof Error ? err.message : String(err)}`,
      intent: {
        lifeTheme:       "general",
        tense:           "future",
        wantsTiming:     true,
        wantsStrength:   false,
        wantsRemedies:   false,
        questionSummary: state.userMessage,
        yearsToScan:     7,
      },
    };
  }
}
