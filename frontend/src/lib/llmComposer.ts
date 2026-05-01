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

// Default to gpt-4o for quality. Override via env var for cost/speed trade-offs.
const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o";

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

const SYSTEM_PROMPT = `You are a warm, thoughtful Vedic astrologer speaking with a client whose chart you've already studied. Your job is to answer THEIR SPECIFIC QUESTION in natural, conversational prose, grounded ONLY in the structured facts provided — and strictly inside the WINDOW specified.

STRICT RULES:
1. ANSWER THE USER'S QUESTION INSIDE THE WINDOW. The WINDOW block at the top of the facts is authoritative — ignore dasha periods, transits, or highlights that fall entirely outside it. If the window was capped (mode: capped), acknowledge the cap in one sentence as the opening line, using the user-facing note verbatim or a close paraphrase.
2. OPEN with the user-facing window note (USER_WINDOW_NOTE) — keep it as the first line of your answer unless the user explicitly gave an absolute range, in which case a tight paraphrase is fine. Never silently drop it.
3. NEVER invent chart data. This is the hardest rule: every planet, house, dignity, yoga, dasha, or transit you mention must appear by name in the facts. If "Moon" is not in KEY NATAL PLANETS, you may not say "Moon in house 7". If a house number is not attached to a planet in the facts, you may not claim that house. When the facts are thin, be thin — say so in one honest line and stop.
4. NEVER invent a house meaning beyond these canonical short glosses: 1=self/body, 2=wealth/speech/family, 3=siblings/courage, 4=home/mother/comforts, 5=children/creativity/purva-punya, 6=health/enemies/service, 7=spouse/partnerships, 8=longevity/transformation/occult, 9=father/fortune/dharma, 10=career/status/karma, 11=gains/elder-siblings/networks, 12=losses/foreign/moksha. Do NOT attach other meanings (e.g. "7th house governs career" is FORBIDDEN — 7th is partnerships).
5. Do NOT use bullet lists, markdown headers, or bolded field labels. Weave everything into flowing paragraphs (the opening window note is the only permitted short line).
6. Keep total length under 180 words for focused questions, under 220 for open-ended ones. Two short paragraphs after the window note is the usual shape.
7. Plain language. Vedic terms are fine; gloss them briefly when useful.
8. Vary your openings question-to-question — but always preserve the window note as line 1.

STRUCTURE:
  Line 1: the USER_WINDOW_NOTE verbatim (or close paraphrase for explicit ranges).
  Paragraph 1: the core answer — the dasha segment(s) active inside the window and what they mean for this question. Weave in the most relevant slow-planet transit inside the window (from WINDOW_TRANSITS) and the single strongest window highlight if any.
  Paragraph 2 (optional): one concrete piece of framing or advice grounded in the window's signals.

WHAT TO IGNORE:
  - Any dasha or highlight outside the window.
  - Muted transits (gochara == "muted") — don't emphasise them even if listed.
  - DAILY_CONTEXT is only relevant when the window spans a single day; for longer windows, WINDOW_TRANSITS is the authoritative transit story.

PAST-DIRECTION WINDOWS (WINDOW.direction == "past"):
  - Use past tense. "You were in Mars-Rahu during 2024" — not "you are in Mars-Rahu until 2027".
  - Do NOT cite the future end-date of a dasha that is still running; the user is asking about a past period, so the end-date outside the window is irrelevant and confusing.
  - Anchor to what ran DURING the window: the included dasha segments, the clipped highlights, the natal planets ruling the affected houses.
  - If highlights in the window are thin, say so honestly and pivot to the natal chart reason (which lord is weak, which yoga was muted, etc.).

You are never diagnostic or fatalistic. Tone: a knowledgeable friend who sees the pattern and names it.`;

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
          `- ${s.mahadasha}-${s.antardasha} from ${s.includedFrom} to ${s.includedTo}${flag}${nature}${themes}`,
        );
        // Pratyantardashas (sub-sub-periods) for near-term segments
        if (s.pratyantardashas?.length) {
          for (const pd of s.pratyantardashas) {
            const pdFlag = pd.isCurrent ? " [CURRENT PD]" : "";
            lines.push(
              `    PD ${s.mahadasha}-${s.antardasha}-${pd.planet}: ${pd.start.slice(0, 7)} → ${pd.end.slice(0, 7)}${pdFlag}`,
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
          `${indent}- ${levelLabel}: ${seg.sign} (lord ${seg.lord}) ${seg.start.slice(0, 7)}–${seg.end.slice(0, 7)}${flag}`,
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
 * Compose a natural-language answer from structured facts. Returns the
 * assistant's text. Throws on API failure — caller should catch and fall
 * back to the deterministic template answer.
 *
 * @param conversationSummary - Compact Q/A summary of the last ~5 exchanges,
 *   appended to the facts prompt so the model can handle follow-up questions.
 */
export async function composeNaturalAnswer(
  facts: AnswerFacts,
  chart: ChartResponse,
  conversationSummary: string = "",
): Promise<string> {
  const openai = getClient();
  let userPrompt = serializeFacts(facts, chart);
  if (conversationSummary) {
    userPrompt =
      `PRIOR CONVERSATION (context for follow-ups — do not repeat unless directly relevant):\n${conversationSummary}\n\n` +
      userPrompt;
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.55,
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
