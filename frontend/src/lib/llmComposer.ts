import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartResponse } from "@/lib/api";
import type { AnswerFacts } from "@/lib/chatEngine";

/**
 * LLM-backed natural-language composer for chat answers.
 *
 * Architecture: the chart engines extract structured facts (dasha timing,
 * transits, natal placements, Ashtakvarga bindus). This composer passes those
 * facts to an LLM playing the role of a 35-year experienced Vedic astrologer,
 * who interprets and synthesises them into a direct, personal answer.
 *
 * Provider priority:
 *   1. Anthropic Claude  (ANTHROPIC_API_KEY)
 *   2. OpenAI            (OPENAI_API_KEY)
 *
 * Falls back loudly so the caller can use the deterministic template.
 */

// ── Provider clients ──────────────────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Default to claude-3-5-sonnet for quality. Override via env var.
const CLAUDE_MODEL = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-3-5-sonnet-20241022";

let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// Default to gpt-4o for quality. Override via env var.
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o";

export function isLlmComposerAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function preferredProvider(): "anthropic" | "openai" {
  // Claude first — better at nuanced synthesis; falls back to OpenAI.
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";
}

const SYSTEM_PROMPT = `You are a Vedic astrologer with 35+ years of practice in Jyotish. Your reputation is built on synthesis: you see exactly how Vimshottari dasha timing, current planetary transits, natal placements with their dignities, and Ashtakvarga strength indicators combine to speak directly to a person's situation.

Your engines have already computed the raw signals. Your job: interpret them for the user's specific question — not list them, not summarise them, but explain what they MEAN for this person right now. Speak the way you would in a real consultation: direct, warm, specific.

═══ NON-NEGOTIABLE RULES ═══

NEVER INVENT.
Every planet, house, yoga, dasha, or transit you mention must appear in the facts below. If "Moon" is not listed under KEY NATAL PLANETS, you cannot say "Moon in H7". When facts are thin, say so in one honest sentence — don't pad.

ANSWER FIRST.
After the window note, your very first sentence must address the question directly. Do not open with a generic chart overview or "Looking at your chart…" filler.

INTERPRET, DON'T DESCRIBE.
"Mars is in H6" is a fact. "Mars in the 6th can surface health friction or conflict with colleagues — watch for that especially when Mars itself is dasha-active" is interpretation. Always aim for the second form.

SYNTHESISE ACROSS LAYERS.
Connect the dasha + transit + natal picture. Example: "You're in Mars–Rahu (May 2026) — Mars rules your 7th natally, and Rahu in 5th creates urgency in close bonds. Jupiter transiting H9 with strong Ashtakvarga (5/5) is the counterbalance: the friction is real, but there's a grounding, expansive force available if you reach for it."

DATE EVERY PERIOD.
Name a dasha, antardasha, or pratyantardasha → always follow immediately with its date range in parentheses, e.g. "Mars–Rahu (May 2026)" or "the Rahu pratyantardasha (Mar–May 2026)". NEVER name a period without its dates.

HOUSE MEANINGS (use only these):
1=self/body · 2=wealth/speech/family · 3=siblings/courage · 4=home/mother/comforts · 5=children/creativity/purva-punya · 6=health/enemies/service · 7=spouse/partnerships · 8=longevity/transformation/occult · 9=father/fortune/dharma · 10=career/status/karma · 11=gains/networks · 12=losses/foreign/moksha.

WINDOW.
Open with USER_WINDOW_NOTE as the first line. Stay strictly inside the window — ignore dashas or highlights outside it. For past windows, use past tense throughout.

FORMAT.
Flowing prose only — no bullet points, no markdown headers, no bold field labels. Two paragraphs after the window note is the ideal shape.

LENGTH.
180–280 words. A skilled astrologer is thorough but not verbose. Every sentence should carry information.

TONE.
You are a trusted guide — specific enough to be useful, honest when signals are mixed, never fatalistic.`;

/** Format an ISO date string (YYYY-MM-DD or YYYY-MM) to "D Mon YYYY" or "Mon YYYY". */
function fmtDate(iso: string): string {
  // Full date: 2026-05-15 → "15 May 2026"
  const full = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (full) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = parseInt(full[3], 10);
    const m = parseInt(full[2], 10) - 1;
    const y = full[1];
    return `${d} ${months[m]} ${y}`;
  }
  // Year-month only: 2026-05 → "May 2026"
  const ym = /^(\d{4})-(\d{2})/.exec(iso);
  if (ym) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = parseInt(ym[2], 10) - 1;
    return `${months[m]} ${ym[1]}`;
  }
  return iso;
}

function serializeFacts(facts: AnswerFacts, chart: ChartResponse): string {
  const lines: string[] = [];
  lines.push(`QUESTION: ${facts.question}`);
  lines.push(`CHART: ${chart.lagna} lagna, born ${chart.date} ${chart.time}, ${chart.place}.`);
  if (facts.categories.length) {
    lines.push(`DETECTED THEMES: ${facts.categories.join(", ")}`);
  }

  // ── WINDOW block (authoritative framing) ─────────────────────────────────
  if (facts.window) {
    lines.push("");
    lines.push(
      `WINDOW: ${facts.window.label} (mode: ${facts.window.mode}, direction: ${facts.window.direction})`,
    );
    lines.push(`USER_WINDOW_NOTE: ${facts.window.userNote}`);
    if (facts.window.mode === "capped" && facts.window.originalStart && facts.window.originalEnd) {
      lines.push(
        `(User originally asked a wider span — ACKNOWLEDGE the cap in your opening line.)`,
      );
    }
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

  // ── Window-scoped signals (dasha segments, transits, clipped highlights) ─
  if (facts.windowContext) {
    const wc = facts.windowContext;
    if (wc.dashaSegments.length) {
      lines.push("");
      lines.push("DASHA SEGMENTS INSIDE WINDOW (authoritative timing story):");
      for (const s of wc.dashaSegments.slice(0, 4)) {
        const flag = s.isCurrent ? " [CURRENT]" : "";
        const nature = s.nature ? ` nature=${s.nature}` : "";
        const themes = s.themes?.length ? ` themes=${s.themes.join(", ")}` : "";
        lines.push(
          `- ${s.mahadasha}-${s.antardasha} (${fmtDate(s.includedFrom)} – ${fmtDate(s.includedTo)})${flag}${nature}${themes}`,
        );
        // Pratyantardashas (sub-sub-periods) for near-term segments
        if (s.pratyantardashas?.length) {
          for (const pd of s.pratyantardashas) {
            const pdFlag = pd.isCurrent ? " [CURRENT PD]" : "";
            lines.push(
              `    PD ${s.mahadasha}-${s.antardasha}-${pd.planet}: ${fmtDate(pd.start)} – ${fmtDate(pd.end)}${pdFlag}`,
            );
          }
        }
      }
    }

    // Chara Dasha (Jaimini sign-based dasha system)
    if (wc.charaDasha?.length) {
      lines.push("");
      lines.push("CHARA DASHA (Jaimini sign-based — cross-check timing with Vimshottari above):");
      for (const seg of wc.charaDasha) {
        const flag = seg.isCurrent ? " [CURRENT]" : "";
        const indent = seg.level === "major" ? "" : seg.level === "sub" ? "  " : "    ";
        const levelLabel = seg.level === "major" ? "Major" : seg.level === "sub" ? "Sub" : "Sub-sub";
        lines.push(
          `${indent}- ${levelLabel}: ${seg.sign} (lord ${seg.lord}) ${fmtDate(seg.start)} – ${fmtDate(seg.end)}${flag}`,
        );
      }
    }

    // Planet BAV — gochara gate for each transiting planet
    if (wc.planetBav?.length) {
      lines.push("");
      lines.push("PLANET BAV IN CURRENT TRANSIT SIGN (gochara gate — active means full effect):");
      for (const pb of wc.planetBav) {
        const bavStr = pb.gate === "nodal" ? "nodal" : `${pb.bav}/${pb.threshold} bindus`;
        lines.push(`- ${pb.planet} in ${pb.transitSign} H${pb.houseFromLagna}: ${bavStr} [${pb.gate}]`);
      }
    }
    if (wc.transits.length) {
      lines.push("");
      lines.push(
        "SLOW-PLANET TRANSITS PROJECTED ACROSS WINDOW (approximate; mean-motion, ignores retrograde loops):",
      );
      for (const t of wc.transits) {
        const ingressText = t.ingresses.length
          ? ` ingresses: ${t.ingresses.map((i) => `${i.date}→${i.sign}(H${i.houseFromLagna})`).join("; ")}`
          : " stays in sign";
        const bavText =
          t.gochara === "nodal"
            ? " [nodal — no BAV]"
            : ` BAV ${t.midBav}/${t.threshold} [${t.gochara}]`;
        lines.push(
          `- ${t.planet}: ${t.startSign} H${t.startHouseFromLagna} → ${t.endSign} H${t.endHouseFromLagna}${bavText}${ingressText}. Effect if active: ${t.effect}.`,
        );
      }
      lines.push(
        "(Only weave in transits marked [active] or [nodal]. Skip [muted].)",
      );
    }
    if (wc.highlights.length) {
      lines.push("");
      lines.push("HIGHLIGHTS CLIPPED TO WINDOW (past ◀ and upcoming ▶):");
      for (const h of wc.highlights.slice(0, 5)) {
        const arrow = h.direction === "past" ? "◀" : "▶";
        lines.push(
          `- ${arrow} ${h.window} (${h.dashaContext}) — ${h.likelihood} — ${h.reasoning}`,
        );
      }
    }
    if (wc.jaiminiWindows.length) {
      lines.push("");
      lines.push("JAIMINI WINDOWS OVERLAPPING RANGE:");
      for (const j of wc.jaiminiWindows) {
        lines.push(
          `- ${j.kind} peak ${j.startMonth} → ${j.endMonth} (${j.peakScore}/6, ${j.rating})`,
        );
      }
    }
    if (wc.categoryHouseFocus.length) {
      lines.push("");
      lines.push("HOUSE SAV FOCUS FOR THIS QUESTION:");
      for (const h of wc.categoryHouseFocus) {
        lines.push(
          `- ${h.house}th (${h.sign}, ${h.theme}): ${h.bindus} bindus (${h.strength})`,
        );
      }
    }
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

  // When a windowContext is present, it is the single source of truth for
  // dasha timing and event windows — suppress the legacy unfiltered blocks
  // so the LLM doesn't conflate the window with the full 5-year horizon or
  // cite the future end-date of a still-running dasha in a past question.
  const hasWindow = Boolean(facts.windowContext);

  if (facts.currentPeriod && !hasWindow) {
    lines.push("");
    lines.push(
      `CURRENT DASHA (standing background, not today-specific): ${facts.currentPeriod.mahadasha}\u2013${facts.currentPeriod.antardasha} until ${fmtDate(facts.currentPeriod.endDate)}.`,
    );
    if (facts.currentPeriod.themes) lines.push(`  Themes: ${facts.currentPeriod.themes}`);
    if (facts.currentPeriod.relevantPredictions.length) {
      lines.push("  Relevant predictions for this period:");
      facts.currentPeriod.relevantPredictions.forEach((p) => lines.push(`    · ${p}`));
    }
  }

  if (facts.relevantPlanets.length) {
    lines.push("");
    lines.push("KEY NATAL PLANETS FOR THIS QUESTION (chart-level, time-independent):");
    for (const p of facts.relevantPlanets.slice(0, 3)) {
      lines.push(
        `- ${p.name} in house ${p.house}${p.dignity ? ` (${p.dignity})` : ""}: ${p.interpretation}`,
      );
    }
  }

  if (facts.upcomingWindows.length && !hasWindow) {
    lines.push("");
    lines.push("UPCOMING WINDOWS (next ~5 years):");
    for (const w of facts.upcomingWindows) {
      lines.push(`- ${w.window} (${w.dashaContext}) — ${w.likelihood}. ${w.reasoning}`);
    }
  }

  if (facts.pastWindows.length && !hasWindow) {
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
 * Build a compact conversation summary from prior messages.
 * Q truncated to 100 chars, A to 150 chars — enough for the model to
 * understand follow-up context without bloating the prompt.
 */
export function buildConversationSummary(
  messages: Array<{ role: string; content: string }>,
): string {
  if (messages.length === 0) return "";
  const lines = messages.map((m) => {
    const isUser = m.role === "user";
    const limit = isUser ? 100 : 150;
    const text = m.content.replace(/\n+/g, " ").slice(0, limit);
    const ellipsis = m.content.length > limit ? "…" : "";
    return `${isUser ? "Q" : "A"}: ${text}${ellipsis}`;
  });
  return lines.join("\n");
}

/**
 * Compose a natural-language answer from structured facts.
 * Prefers Anthropic Claude; falls back to OpenAI if only that key is present.
 * Throws on API failure — caller catches and uses the deterministic template.
 *
 * @param conversationSummary - Compact Q/A summary of the last ~5 exchanges,
 *   prepended to the facts so the model can handle follow-up questions.
 */
export async function composeNaturalAnswer(
  facts: AnswerFacts,
  chart: ChartResponse,
  conversationSummary: string = "",
): Promise<string> {
  let userPrompt = serializeFacts(facts, chart);
  if (conversationSummary) {
    userPrompt =
      `PRIOR CONVERSATION (context for follow-ups — do not repeat unless directly relevant):\n${conversationSummary}\n\n` +
      userPrompt;
  }

  const provider = preferredProvider();

  if (provider === "anthropic") {
    return composeWithClaude(userPrompt);
  } else {
    return composeWithOpenAI(userPrompt);
  }
}

async function composeWithClaude(userPrompt: string): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 650,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = response.content[0];
  if (block.type !== "text" || !block.text.trim()) {
    throw new Error("Empty response from Anthropic");
  }
  return block.text.trim();
}

async function composeWithOpenAI(userPrompt: string): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.55,
    max_tokens: 650,
    presence_penalty: 0.3,
    frequency_penalty: 0.3,
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}
