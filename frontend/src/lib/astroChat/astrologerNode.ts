// ─────────────────────────────────────────────────────────────────────────────
// Astrologer Node — generates the final answer with Vedic astrologer persona
//
// Model: GPT-4o (strong reasoning, nuanced prose)
// Output: finalAnswer — full streamed text
// ─────────────────────────────────────────────────────────────────────────────

import { ChatOpenAI } from "@langchain/openai";
import { ZODIAC_ORDER } from "@/lib/charaDashaEngine";
import type { AstroChatStateShape, AstrologyData, Intent } from "./types";
import type { MarriageWindowScan } from "@/lib/jaiminiMarriagePrediction";
import type { CareerWindowScan } from "@/lib/jaiminiCareerPrediction";

export const astrologerLLM = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
  // Tag so streamEvents can filter by this node
  tags: ["astrologer_node"],
});

// ── Persona & methodology ─────────────────────────────────────────────────────

const PERSONA = `You are Jyotish Guru, a Vedic astrologer with 35 years of experience.
You trained at Benares Hindu University under masters of the Parashari and Jaimini traditions.
You also appreciate evidence-based thinking — you speak like a trusted family pandit who has read McKinsey reports.

Your style:
- Warm but direct. Never vague. Never hedging with "it depends on many factors".
- Answer the question first, explain afterward (management consulting pyramid principle).
- Use Vedic terminology naturally but always follow up with plain English: "Jupiter is in the 7th house (house of marriage)".
- For timing: give actual year ranges, not "sometime in the future".
- For strength: give a clear verdict (strong / moderate / challenging), then evidence.
- For remedies: give specific, practical suggestions (which mantra, which day, which gemstone).
- Acknowledge uncertainty with confidence: "The chart suggests X — but final timing depends on your own readiness too."
- Speak with authority. No "I think" or "perhaps" as openers. Lead with the finding.

Structure your answers using this format:
**[Short headline — the direct answer]**

[1-2 sentence verdict expanding the headline]

**Why the chart says this:**
• [Evidence point 1 with house/planet + plain English]
• [Evidence point 2]
• [Evidence point 3 if relevant]

**Timing:**
[Specific windows, dasha periods, or "not a strong timing question"]

**What to do:**
[Practical advice — maximize the good, navigate the difficult]

**A note of honesty:**
[One caveat or limitation]`;

// ── Context builders ─────────────────────────────────────────────────────────

function buildChartContext(data: AstrologyData): string {
  const lines: string[] = [];

  lines.push(`Lagna: ${data.lagna}`);
  lines.push(`Current Dasha: ${data.currentDasha.planet} (until ${data.currentDasha.endDate})`);
  lines.push(`Current Antardasha: ${data.currentDasha.subPlanet} (until ${data.currentDasha.subEndDate})`);

  // Planet placements
  const placements = Object.entries(data.planetHouses)
    .map(([planet, house]) => `${planet} in H${house}`)
    .join(", ");
  lines.push(`Planet placements: ${placements}`);

  // Jaimini key indicators
  const pi = data.predictionInput;
  if (pi.arudhaLagna) {
    lines.push(`Arudha Lagna (AL): ${pi.arudhaLagna.padaSign}`);
  }
  if (pi.upaPada) {
    lines.push(`Upa-Pada (UL): ${pi.upaPada.padaSign}`);
  }

  const atmakaraka = pi.karakas.find((k) => k.role === "Atmakaraka");
  const darakaraka = pi.karakas.find((k) => k.role === "Darakaraka");
  if (atmakaraka) lines.push(`Atmakaraka: ${atmakaraka.planet}`);
  if (darakaraka) lines.push(`Darakaraka (DK): ${darakaraka.planet}`);

  return lines.join("\n");
}

function buildMarriageContext(scan: MarriageWindowScan): string {
  const lines: string[] = ["=== MARRIAGE TIMING ==="];
  lines.push(`7th House Sign: ${scan.seventhHouseSign}`);
  lines.push(`Upa-Pada (UL): ${scan.ulSign}`);
  lines.push(`Arudha Lagna (AL): ${scan.alSign}`);
  lines.push(`Darakaraka: ${scan.darakaraka} in ${scan.darakarakaSign}`);

  if (scan.peakMonth) {
    lines.push(`Peak month: ${scan.peakMonth.date} (rules met: ${scan.peakMonth.rulesSatisfied}/6, strength: ${scan.peakMonth.strength})`);
  }

  if (scan.windows.length > 0) {
    lines.push("Favorable windows (3+ classical rules met):");
    scan.windows.slice(0, 3).forEach((w) => {
      lines.push(`  • ${w.startMonth} to ${w.endMonth} — peak rules met: ${w.peakScore.toFixed(0)}`);
    });
  } else {
    lines.push("No strong marriage windows found in the scan period.");
  }
  return lines.join("\n");
}

function buildCareerContext(scan: CareerWindowScan): string {
  const lines: string[] = ["=== CAREER TIMING ==="];
  lines.push(`10th House Sign: ${scan.tenthSign}`);
  lines.push(`Arudha Lagna (AL): ${scan.alSign}`);
  lines.push(`A10 (Rajya Pada): ${scan.a10Sign}`);
  lines.push(`Amatya Karaka (AmK): ${scan.amk} in ${scan.amkSign}`);

  if (scan.peakMonth) {
    lines.push(`Peak month: ${scan.peakMonth.date} (rules met: ${scan.peakMonth.rulesSatisfied}/6, strength: ${scan.peakMonth.strength})`);
  }

  if (scan.windows.length > 0) {
    lines.push("Favorable windows:");
    scan.windows.slice(0, 3).forEach((w) => {
      lines.push(`  • ${w.startMonth} to ${w.endMonth} — peak rules met: ${w.peakScore.toFixed(0)}`);
    });
  } else {
    lines.push("No strong career windows found in the scan period.");
  }
  return lines.join("\n");
}

function buildAshtakvargaContext(data: AstrologyData): string {
  if (!data.ashtakvarga) return "";
  const sarva = data.ashtakvarga.sarvashtakvarga;
  const lines = ["=== ASHTAKVARGA (SAV by sign) ==="];
  sarva.signTotals.forEach((score: number, idx: number) => {
    const sign = ZODIAC_ORDER[idx] as string;
    lines.push(`  ${sign}: ${score} bindus`);
  });
  lines.push(`Grand total: ${sarva.grandTotal} bindus`);
  return lines.join("\n");
}

function buildD9Context(data: AstrologyData): string {
  if (!data.d9) return "";
  return `=== D9 NAVAMSA STRENGTH ===\nVerdict: ${data.d9.verdict}\n${data.d9.summary}`;
}

function buildYogaContext(data: AstrologyData): string {
  if (!data.yogas || data.yogas.length === 0) return "";
  const lines = ["=== RELEVANT YOGAS ==="];
  data.yogas.slice(0, 6).forEach((yoga) => {
    lines.push(`• ${yoga.rule.name}: ${yoga.evidence}`);
  });
  return lines.join("\n");
}

// ── Full prompt assembly ──────────────────────────────────────────────────────

function buildUserPrompt(
  question: string,
  intent: Intent,
  data: AstrologyData,
  birthData: { name?: string; date: string; place: string },
): string {
  const parts: string[] = [];

  parts.push(`Native: ${birthData.name ?? "the native"}, born ${birthData.date} in ${birthData.place}`);
  parts.push("");
  parts.push("=== NATAL CHART DATA ===");
  parts.push(buildChartContext(data));

  if (data.marriageScan) {
    parts.push("");
    parts.push(buildMarriageContext(data.marriageScan));
  }

  if (data.careerScan) {
    parts.push("");
    parts.push(buildCareerContext(data.careerScan));
  }

  if (data.ashtakvarga) {
    parts.push("");
    parts.push(buildAshtakvargaContext(data));
  }

  if (data.d9) {
    parts.push("");
    parts.push(buildD9Context(data));
  }

  if (data.yogas && data.yogas.length > 0) {
    parts.push("");
    parts.push(buildYogaContext(data));
  }

  parts.push("");
  parts.push("=== QUESTION ===");
  parts.push(question);
  parts.push("");
  parts.push(`Intent classification: ${intent.questionSummary}`);
  parts.push(`Life theme: ${intent.lifeTheme}, Tense: ${intent.tense}`);
  if (intent.wantsTiming) parts.push("User specifically wants timing.");
  if (intent.wantsStrength) parts.push("User wants to know chart strength.");
  if (intent.wantsRemedies) parts.push("User wants remedies/solutions.");

  return parts.join("\n");
}

// ── Node export ───────────────────────────────────────────────────────────────

export async function astrologerNode(
  state: AstroChatStateShape,
): Promise<Partial<AstroChatStateShape>> {
  if (!state.intent || !state.astrologyData) {
    return {
      finalAnswer: "I'm unable to generate a reading without your chart data. Please try again.",
    };
  }

  const userPrompt = buildUserPrompt(
    state.userMessage,
    state.intent,
    state.astrologyData,
    state.birthData,
  );

  try {
    const response = await astrologerLLM.invoke([
      { role: "system", content: PERSONA },
      { role: "user", content: userPrompt },
    ]);

    const finalAnswer = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    return { finalAnswer };
  } catch (err) {
    return {
      error: `Astrologer failed: ${err instanceof Error ? err.message : String(err)}`,
      finalAnswer: "I encountered an error generating your reading. Please try again.",
    };
  }
}

/** Build the full prompt for streaming use (called directly by the API route) */
export function buildAstrologerMessages(
  state: AstroChatStateShape,
): Array<{ role: string; content: string }> {
  if (!state.intent || !state.astrologyData) return [];
  const userPrompt = buildUserPrompt(
    state.userMessage,
    state.intent,
    state.astrologyData,
    state.birthData,
  );
  return [
    { role: "system", content: PERSONA },
    { role: "user", content: userPrompt },
  ];
}
