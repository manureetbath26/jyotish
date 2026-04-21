import OpenAI from "openai";
import type { DailyFacts } from "./dailyEngine";

/**
 * Daily Perspective composer — LLM prose layer sitting on top of the
 * deterministic dailyEngine facts. Tone is user-selectable; prompt
 * forbids invention so no chart data can be hallucinated.
 */

export type DailyTone = "thoughtful" | "coffee" | "classical";

const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function isDailyComposerAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const TONE_INSTRUCTIONS: Record<DailyTone, string> = {
  thoughtful: `Warm, thoughtful-friend register. Direct but caring. Speak like someone who has read this person's chart carefully and is sharing what they see, in plain language. Avoid jargon; if you use a Vedic term, gloss it briefly.`,
  coffee: `Casual, light, morning-coffee register. Short sentences, punchy, low-jargon. No lectures. Think: a quick read you'd enjoy with your first cup.`,
  classical: `Measured classical-astrologer register. You may use Sanskrit terms (dasha, lagna, gochara) with brief parenthetical glosses. More formal cadence than the other tones; still warm and human, not dry.`,
};

const SYSTEM_PROMPT_BASE = `You are composing a one-day Vedic astrology reading for a specific person, based on structured facts pre-computed from their natal chart and today's sky.

STRICT RULES:
1. NEVER invent chart placements, yogas, dashas, or transit positions that aren't in the facts.
2. Use the exact "expect / be mindful" structure described below.
3. Keep total length between 140 and 220 words.
4. Do NOT use markdown headers (##) or heavy bold. Two short-label subheadings "Expect:" and "Be mindful of:" are fine on their own lines.
5. Always end with one short sentence that names the standing dasha context.
6. Never be fatalistic or scary. Offer framing, not doom.
7. If the facts list is thin (e.g. no active transits), say so honestly rather than padding.

OUTPUT STRUCTURE:
Line 1: A one-line "pulse" of today (from Moon sign + nakshatra + the house it transits the native's lagna).
Paragraph: 1-2 sentences of context.
"Expect:" — then 2-3 lines starting with "- ", each naming a concrete area where flow is easier today.
"Be mindful of:" — then 1-2 lines starting with "- ", each naming one real friction to watch.
Closing sentence: the standing dasha phase in one line.`;

function serializeFacts(facts: DailyFacts): string {
  const lines: string[] = [];
  lines.push(`DATE: ${facts.date}`);
  lines.push(`PERSON: ${facts.profileName} (${facts.lagna} lagna)`);
  lines.push("");
  lines.push(`MOON PULSE: ${facts.moonPulse.narrative || "(Moon position unavailable)"}`);
  lines.push("");
  lines.push(
    `STANDING DASHA: ${facts.standingContext.mahadasha}-${facts.standingContext.antardasha} until ${facts.standingContext.endsOn} \u2014 ${facts.standingContext.themeHint}.`,
  );
  lines.push("");
  if (facts.activeTransits.length > 0) {
    lines.push("ACTIVE TRANSITS TODAY (passed BAV threshold):");
    for (const t of facts.activeTransits) {
      lines.push(
        `- ${t.planet} in ${t.transitSign}, your ${t.houseFromLagna}th (${t.houseTheme})${t.threshold ? `, BAV ${t.bav}/${t.threshold}` : ""} \u2014 ${t.effectIfActive}`,
      );
    }
  } else {
    lines.push("ACTIVE TRANSITS TODAY: none above BAV threshold \u2014 a quiet day.");
  }
  if (facts.quietTransits.length > 0) {
    lines.push("");
    lines.push("MUTED TRANSITS (below BAV threshold, do not emphasise):");
    for (const q of facts.quietTransits.slice(0, 3)) lines.push(`- ${q.note}`);
  }
  if (facts.supportiveFlavours.length > 0) {
    lines.push("");
    lines.push("SUPPORTIVE FLAVOURS (weave into Expect):");
    for (const s of facts.supportiveFlavours) lines.push(`- ${s}`);
  }
  if (facts.cautiousFlavours.length > 0) {
    lines.push("");
    lines.push("CAUTIOUS FLAVOURS (weave into Be mindful):");
    for (const c of facts.cautiousFlavours) lines.push(`- ${c}`);
  }
  if (facts.panchang) {
    lines.push("");
    const bits: string[] = [];
    if (facts.panchang.tithi) bits.push(`tithi ${facts.panchang.tithi}`);
    if (facts.panchang.nakshatra) bits.push(`nakshatra ${facts.panchang.nakshatra}`);
    if (facts.panchang.yoga) bits.push(`yoga ${facts.panchang.yoga}`);
    if (facts.panchang.vara) bits.push(`vara ${facts.panchang.vara}`);
    if (bits.length) lines.push(`PANCHANG: ${bits.join(", ")}`);
  }
  return lines.join("\n");
}

export async function composeDailyReading(
  facts: DailyFacts,
  tone: DailyTone,
): Promise<string> {
  const openai = getClient();
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nTONE: ${TONE_INSTRUCTIONS[tone]}`;
  const userPrompt = serializeFacts(facts);
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
    max_tokens: 380,
    presence_penalty: 0.25,
    frequency_penalty: 0.3,
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty daily response from OpenAI");
  return content;
}

/**
 * Template fallback for environments without an API key or on LLM error.
 * Not as natural as the LLM version but still useful.
 */
export function composeDailyTemplate(facts: DailyFacts): string {
  const lines: string[] = [];
  if (facts.moonPulse.narrative) lines.push(facts.moonPulse.narrative);
  lines.push("");
  if (facts.supportiveFlavours.length > 0) {
    lines.push("Expect:");
    for (const s of facts.supportiveFlavours) lines.push(`- ${s}`);
  }
  if (facts.cautiousFlavours.length > 0) {
    lines.push("");
    lines.push("Be mindful of:");
    for (const c of facts.cautiousFlavours) lines.push(`- ${c}`);
  }
  lines.push("");
  lines.push(
    `Running in the background: your ${facts.standingContext.mahadasha}-${facts.standingContext.antardasha} period (until ${facts.standingContext.endsOn}) \u2014 ${facts.standingContext.themeHint}.`,
  );
  return lines.join("\n");
}
