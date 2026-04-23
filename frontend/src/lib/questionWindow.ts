/**
 * Question Window Resolver
 *
 * Parses a natural-language question into a concrete {start, end} window
 * that the ask engine focuses on. The resolver is a small hand-written
 * parser — no LLM round-trip — so behaviour is deterministic and cheap.
 *
 * Resolution order (first match wins):
 *   1. Explicit year range: "between 2024 and 2028", "2024-2028", "2025 to 2027"
 *   2. Explicit single year: "in 2027", "during 2026", "for 2028"
 *   3. "by YYYY": from now through end of that year
 *   4. Relative future duration: "next 3 years", "over the next 6 months"
 *   5. Relative past duration: "last 2 years", "past 6 months", "3 years ago"
 *   6. Named periods: "this year", "next year", "last year", "this month" etc.
 *   7. Legacy daily phrases: "today", "tonight", "tomorrow", "this week"
 *   8. Default — past-oriented phrasing → [now-1y, now]; else → [now, now+1y]
 *
 * Every result is clamped to a MAX_WINDOW_YEARS span. When clamped, the
 * resolver returns `mode: "capped"` and a user-facing sentence explaining
 * the truncation — this is what the chat surfaces to the user.
 */

export type WindowMode =
  | "explicit" // user supplied a concrete range/year
  | "default-future" // forward 1y fallback
  | "default-past" // backward 1y fallback (past-oriented phrasing)
  | "capped"; // user asked >5y, we truncated

export interface QuestionWindow {
  start: Date;
  end: Date;
  mode: WindowMode;
  /** Human-readable label e.g. "Apr 2026 – Apr 2027" */
  label: string;
  /** One-line note shown to user at top of answer */
  userNote: string;
  /** Populated when mode === "capped": what the user originally asked for */
  originalStart?: Date;
  originalEnd?: Date;
  /** True when window is <=7 days and overlaps today → fetch daily context */
  isDaily: boolean;
  /** True when window.end <= today (no transit projection possible) */
  isPurePast: boolean;
  /** Coarse direction label, handy for prompt framing */
  direction: "past" | "future" | "crossing";
}

export const MAX_WINDOW_YEARS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Public entry point ─────────────────────────────────────────────────────

export function resolveQuestionWindow(
  question: string,
  now: Date = new Date(),
): QuestionWindow {
  const q = question.toLowerCase();

  // Order matters — range before single-year before "by YYYY" etc.
  const parsed =
    parseYearRange(q) ??
    parseBy(q, now) ??
    parseSingleYear(q, now) ??
    parseRelativeFuture(q, now) ??
    parseRelativePast(q, now) ??
    parseNamedPeriod(q, now) ??
    parseDailyScope(q, now);

  if (parsed) return finalize(parsed, now);

  // ── Default fallback ──
  if (isPastOriented(q)) {
    const end = now;
    const start = addYears(now, -1);
    return finalize({ start, end, mode: "default-past" }, now);
  }
  const start = now;
  const end = addYears(now, 1);
  return finalize({ start, end, mode: "default-future" }, now);
}

// ─── Parsers ────────────────────────────────────────────────────────────────

interface RawParsed {
  start: Date;
  end: Date;
  mode: WindowMode;
}

function parseYearRange(q: string): RawParsed | null {
  // "between 2024 and 2028" | "from 2025 to 2027" | "2024-2028" | "2024 to 2028"
  const patterns: RegExp[] = [
    /\b(19|20)(\d{2})\s*(?:-|–|—|to|through|until)\s*(19|20)(\d{2})\b/,
    /\bbetween\s+(19|20)(\d{2})\s+and\s+(19|20)(\d{2})\b/,
    /\bfrom\s+(19|20)(\d{2})\s+(?:to|through|until)\s+(19|20)(\d{2})\b/,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m) {
      const a = Number(m[1] + m[2]);
      const b = Number(m[3] + m[4]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return {
        start: new Date(Date.UTC(lo, 0, 1)),
        end: new Date(Date.UTC(hi, 11, 31, 23, 59, 59)),
        mode: "explicit",
      };
    }
  }
  return null;
}

function parseBy(q: string, now: Date): RawParsed | null {
  const m = q.match(/\bby\s+(19|20)(\d{2})\b/);
  if (!m) return null;
  const year = Number(m[1] + m[2]);
  return {
    start: now,
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    mode: "explicit",
  };
}

function parseSingleYear(q: string, now: Date): RawParsed | null {
  // "in 2027" | "during 2026" | "for 2028"
  const m = q.match(/\b(?:in|during|for)\s+(19|20)(\d{2})\b/);
  if (!m) {
    // Bare year mentioned with year context — only match if year is
    // different from current (to avoid "house 2" style false positives,
    // we require the "in/during/for" prefix above).
    return null;
  }
  const year = Number(m[1] + m[2]);
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  // If "in 2025" and today is 2026, it's purely past — honour it.
  void now;
  return { start, end, mode: "explicit" };
}

const NUM_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function wordToInt(s: string): number | null {
  if (/^\d+$/.test(s)) return Number(s);
  const n = NUM_WORDS[s];
  return n ?? null;
}

function parseRelativeFuture(q: string, now: Date): RawParsed | null {
  // "next 3 years", "next 6 months", "in the next 2 years",
  // "over the next 18 months", "in 3 years" (not to be confused with "in 2027")
  const re =
    /\b(?:(?:in|over)\s+the\s+)?next\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(month|months|year|years)\b/;
  const m = q.match(re);
  if (m) {
    const n = wordToInt(m[1]);
    if (n === null) return null;
    const unit = m[2].startsWith("year") ? "year" : "month";
    const end = unit === "year" ? addYears(now, n) : addMonths(now, n);
    return { start: now, end, mode: "explicit" };
  }
  // "in 3 years" / "in 6 months" — but NOT "in 2027"
  const m2 = q.match(
    /\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(month|months|year|years)\b/,
  );
  if (m2) {
    const n = wordToInt(m2[1]);
    if (n === null) return null;
    const unit = m2[2].startsWith("year") ? "year" : "month";
    const end = unit === "year" ? addYears(now, n) : addMonths(now, n);
    return { start: now, end, mode: "explicit" };
  }
  return null;
}

function parseRelativePast(q: string, now: Date): RawParsed | null {
  // "last 2 years", "past 6 months", "in the past year"
  const re =
    /\b(?:(?:in|over)\s+the\s+)?(?:last|past)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(month|months|year|years)\b/;
  const m = q.match(re);
  if (m) {
    const n = m[1] ? wordToInt(m[1]) : 1;
    if (n === null) return null;
    const unit = m[2].startsWith("year") ? "year" : "month";
    const start = unit === "year" ? addYears(now, -n) : addMonths(now, -n);
    return { start, end: now, mode: "explicit" };
  }
  // "3 years ago" / "2 months ago" — anchor at that point ± 6 months
  const m2 = q.match(
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(month|months|year|years)\s+ago\b/,
  );
  if (m2) {
    const n = wordToInt(m2[1]);
    if (n === null) return null;
    const unit = m2[2].startsWith("year") ? "year" : "month";
    const anchor = unit === "year" ? addYears(now, -n) : addMonths(now, -n);
    const start = addMonths(anchor, -6);
    const end = addMonths(anchor, 6);
    return { start, end, mode: "explicit" };
  }
  return null;
}

function parseNamedPeriod(q: string, now: Date): RawParsed | null {
  if (/\bthis\s+year\b/.test(q)) {
    const y = now.getUTCFullYear();
    return {
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      mode: "explicit",
    };
  }
  if (/\bnext\s+year\b/.test(q)) {
    const y = now.getUTCFullYear() + 1;
    return {
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      mode: "explicit",
    };
  }
  if (/\blast\s+year\b/.test(q)) {
    const y = now.getUTCFullYear() - 1;
    return {
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      mode: "explicit",
    };
  }
  if (/\brest\s+of\s+(?:this\s+)?year\b/.test(q)) {
    const y = now.getUTCFullYear();
    return {
      start: now,
      end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      mode: "explicit",
    };
  }
  if (/\bthis\s+month\b/.test(q)) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)),
      mode: "explicit",
    };
  }
  if (/\bnext\s+month\b/.test(q)) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)),
      mode: "explicit",
    };
  }
  return null;
}

function parseDailyScope(q: string, now: Date): RawParsed | null {
  if (/\b(?:today|tonight|right now)\b/.test(q)) {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
      mode: "explicit",
    };
  }
  if (/\btomorrow\b/.test(q)) {
    const t = addDays(now, 1);
    return { start: startOfDay(t), end: endOfDay(t), mode: "explicit" };
  }
  if (/\byesterday\b/.test(q)) {
    const t = addDays(now, -1);
    return { start: startOfDay(t), end: endOfDay(t), mode: "explicit" };
  }
  if (/\bthis\s+week\b|\bthis\s+coming\s+week\b|\bnext\s+few\s+days\b/.test(q)) {
    return { start: now, end: addDays(now, 7), mode: "explicit" };
  }
  return null;
}

const PAST_KEYWORDS =
  /\b(?:did|was|were|had|been|have\s+i|has\s+there|previously|earlier|before|in\s+the\s+past|when\s+did|when\s+was|used\s+to)\b/;

function isPastOriented(q: string): boolean {
  return PAST_KEYWORDS.test(q);
}

// ─── Finalize: cap, label, notify ───────────────────────────────────────────

function finalize(raw: RawParsed, now: Date): QuestionWindow {
  const { start: rawStart, end: rawEnd } = raw;
  const start = rawStart <= rawEnd ? rawStart : rawEnd;
  const end = rawStart <= rawEnd ? rawEnd : rawStart;

  const spanDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  const maxSpanMs = MAX_WINDOW_YEARS * 365.25 * MS_PER_DAY;

  let finalStart = start;
  let finalEnd = end;
  let mode = raw.mode;
  let originalStart: Date | undefined;
  let originalEnd: Date | undefined;

  if (end.getTime() - start.getTime() > maxSpanMs) {
    originalStart = start;
    originalEnd = end;
    // When capping, anchor to whichever end is closer to "now" so the
    // kept window is the most actionable 5 years.
    if (start >= now) {
      // Pure-future over-5y — keep the first 5 years.
      finalEnd = addYears(start, MAX_WINDOW_YEARS);
    } else if (end <= now) {
      // Pure-past over-5y — keep the most recent 5 years.
      finalStart = addYears(end, -MAX_WINDOW_YEARS);
    } else {
      // Crossing — keep 2.5y back and 2.5y forward from now.
      finalStart = addYears(now, -MAX_WINDOW_YEARS / 2);
      finalEnd = addYears(now, MAX_WINDOW_YEARS / 2);
    }
    mode = "capped";
  }

  const label = formatLabel(finalStart, finalEnd);
  const direction: QuestionWindow["direction"] =
    finalEnd <= now ? "past" : finalStart >= now ? "future" : "crossing";
  const isDaily = spanDays <= 7 && finalEnd >= now && finalStart <= now;
  const isPurePast = finalEnd <= now;

  return {
    start: finalStart,
    end: finalEnd,
    mode,
    label,
    userNote: buildUserNote(
      mode,
      direction,
      label,
      originalStart,
      originalEnd,
    ),
    originalStart,
    originalEnd,
    isDaily,
    isPurePast,
    direction,
  };
}

function buildUserNote(
  mode: WindowMode,
  direction: "past" | "future" | "crossing",
  label: string,
  originalStart?: Date,
  originalEnd?: Date,
): string {
  if (mode === "capped" && originalStart && originalEnd) {
    const orig = formatLabel(originalStart, originalEnd);
    return `That's a wide span (${orig}) — I'll focus on **${label}**, where this chart's timing signals are strongest. Ask about a specific year if you want a different slice.`;
  }
  if (mode === "default-future") {
    return `Focusing on the next 12 months (**${label}**). Say "next 3 years" or "in 2028" if you'd like a different window.`;
  }
  if (mode === "default-past") {
    return `Focusing on the past 12 months (**${label}**). Mention a specific year if you'd like to explore further back.`;
  }
  // explicit
  if (direction === "past") return `Looking at **${label}** for this question.`;
  if (direction === "future") return `Looking at **${label}** for this question.`;
  return `Looking at **${label}** (spanning now) for this question.`;
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCFullYear(r.getUTCFullYear() + n);
  return r;
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59),
  );
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(d: Date): string {
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatLabel(start: Date, end: Date): string {
  const sameDay =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate();
  if (sameDay) return formatDay(start);

  const spanDays = Math.round(
    (end.getTime() - start.getTime()) / MS_PER_DAY,
  );
  if (spanDays <= 31) {
    return `${formatDay(start)} – ${formatDay(end)}`;
  }
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

function formatDay(d: Date): string {
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** ISO date (YYYY-MM-DD) for JSON serialization + LifeHighlight comparisons. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
