/**
 * Window Context Builder
 *
 * Given a resolved QuestionWindow + chart + report + enrichment, produces
 * a WindowContext with exactly the astrological signals that are active
 * inside that window — Vimshottari MD/AD segments, LifeHighlights clipped
 * to the range, slow-planet transits projected from today's positions,
 * Jaimini windows overlapping the range, and per-category house SAV.
 *
 * Transit projection uses analytical mean motion of slow planets (no
 * per-day loop, no backend call beyond the one-shot current-transits
 * snapshot the caller supplies). Retrograde loops are ignored — for the
 * 1-5y windows this tool targets, net sign residency stays close to the
 * mean-motion prediction. We label transits "approximate" internally via
 * the gochara/bav gate so the LLM doesn't overclaim timing.
 */

import type { ChartResponse, CurrentTransitResponse, DashaEntry } from "./api";
import type {
  AshtakvargaAnalysis,
  AshtakvargaPlanet,
} from "./ashtakvargaEngine";
import { ASHTAKVARGA_PLANETS } from "./ashtakvargaEngine";
import { SIGN_INDEX, ZODIAC_ORDER, type Sign } from "./charaDashaEngine";
import type { EnrichedChatContext } from "./chatEnrichment";
import { HOUSE_SIGNIFICATIONS } from "./houseSignifications";
import type {
  DashaPrediction,
  LifeEventsReport,
  LifeHighlight,
} from "./lifeEventsReport";
import type { QuestionWindow } from "./questionWindow";
import { formatMonth, toIsoDate } from "./questionWindow";

// ────────────────────────────────────────────────────────────────────────────
// Gochara thresholds (classical BPHS ch. 70) — duplicated from dailyEngine
// intentionally to avoid a circular import.
// ────────────────────────────────────────────────────────────────────────────
const GOCHARA_THRESHOLD: Record<string, number> = {
  Sun: 4,
  Moon: 4,
  Mars: 3,
  Mercury: 5,
  Jupiter: 5,
  Venus: 4,
  Saturn: 3,
};

const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);

const PLANET_VIBE: Record<string, { positive: string; cautious: string }> = {
  Sun: {
    positive: "recognition, authority, clarity of purpose",
    cautious: "ego friction, clashes with authority",
  },
  Mars: {
    positive: "drive, decisive action, courage",
    cautious: "impatience, conflict, accidents",
  },
  Mercury: {
    positive: "sharp thinking, communication, deals",
    cautious: "over-analysis, miscommunication",
  },
  Jupiter: {
    positive: "expansion, grace, opportunities, wisdom",
    cautious: "overconfidence, over-committing, weight",
  },
  Venus: {
    positive: "harmony, partnerships, artistic flow",
    cautious: "indulgence, relationship drama",
  },
  Saturn: {
    positive: "discipline, structure, slow compounding progress",
    cautious: "delays, fatigue, heavy responsibility",
  },
  Rahu: {
    positive: "unexpected openings, unusual gains, innovation",
    cautious: "confusion, distraction, inflated promises",
  },
  Ketu: {
    positive: "insight, detachment, spiritual clarity",
    cautious: "withdrawal, loss of interest, isolation",
  },
};

// Mean tropical/sidereal motion in degrees per day. Positive = prograde.
// Rahu/Ketu are always retrograde. Mars/Sun included for short windows.
const MEAN_MOTION_DEG_PER_DAY: Record<string, number> = {
  Sun: 0.9856,
  Mars: 0.5240,
  Jupiter: 0.0831,
  Saturn: 0.0335,
  Rahu: -0.0529,
  Ketu: -0.0529,
};

// Which planets we project over a window. Mercury/Venus/Moon change too
// fast to be meaningful mid-window; Sun we include only for short windows.
const WINDOW_TRANSIT_PLANETS = ["Jupiter", "Saturn", "Rahu", "Ketu"];

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface WindowContext {
  window: QuestionWindow;
  dashaSegments: DashaSegment[];
  highlights: WindowHighlight[];
  transits: WindowTransit[];
  jaiminiWindows: JaiminiWindowHit[];
  categoryHouseFocus: HouseFocus[];
  /** Human-readable summary line for the LLM/template to weave in */
  summary: string;
}

export interface DashaSegment {
  mahadasha: string;
  antardasha: string;
  /** ISO YYYY-MM-DD of full MD-AD start */
  startDate: string;
  endDate: string;
  /** Clipped to window */
  includedFrom: string;
  includedTo: string;
  isCurrent: boolean;
  /** Derived from report.dashaPredictions when available */
  nature?: "very_favorable" | "favorable" | "mixed" | "challenging";
  themes?: string[];
}

export interface WindowHighlight {
  event: string;
  window: string;
  dashaContext: string;
  likelihood: string;
  reasoning: string;
  category: string;
  direction: "past" | "upcoming";
  score: number;
}

export interface WindowTransit {
  planet: string;
  /** Sign at window start (today's projection). Omitted for pure-past windows. */
  startSign: string;
  /** Sign at window end. */
  endSign: string;
  startHouseFromLagna: number;
  endHouseFromLagna: number;
  /** Sign-changes crossing during the window (max ~5 for 5y slow planets). */
  ingresses: { date: string; sign: string; houseFromLagna: number }[];
  /** BAV of transiting planet in its mid-window sign (0 for nodes — no chart) */
  midBav: number;
  threshold: number;
  gochara: "active" | "muted" | "nodal";
  houseTheme: string;
  nature: "benefic" | "malefic";
  effect: string;
}

export interface JaiminiWindowHit {
  kind: "marriage" | "career";
  startMonth: string;
  endMonth: string;
  peakScore: number;
  rating: "strong" | "moderate";
}

export interface HouseFocus {
  house: number;
  sign: string;
  bindus: number;
  strength: string;
  theme: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────────────────────

export interface BuildWindowContextOptions {
  chart: ChartResponse;
  report: LifeEventsReport;
  window: QuestionWindow;
  categories: string[]; // from classifyQuestion
  houses: number[];
  enriched?: EnrichedChatContext;
  /** Current transits — when omitted, window transits are skipped. */
  currentTransits?: CurrentTransitResponse;
  /** Ashtakvarga analysis — optional; without it BAV gating is skipped. */
  ashtakvarga?: AshtakvargaAnalysis;
  now?: Date;
}

export function buildWindowContext(
  opts: BuildWindowContextOptions,
): WindowContext {
  const { chart, report, window, categories, houses, enriched } = opts;
  const now = opts.now ?? new Date();

  const dashaSegments = sliceDashas(chart, report, window);
  const highlights = clipHighlights(report, window, categories);
  const transits =
    opts.currentTransits && !window.isPurePast
      ? projectWindowTransits(
          chart,
          opts.currentTransits,
          opts.ashtakvarga,
          window,
          now,
        )
      : [];
  const jaiminiWindows = clipJaiminiWindows(enriched, window);
  const categoryHouseFocus = collectHouseFocus(enriched, houses, chart.lagna as Sign);

  const summary = buildSummary(
    window,
    dashaSegments,
    transits,
    highlights,
  );

  return {
    window,
    dashaSegments,
    highlights,
    transits,
    jaiminiWindows,
    categoryHouseFocus,
    summary,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Dasha slicing
// ────────────────────────────────────────────────────────────────────────────

function sliceDashas(
  chart: ChartResponse,
  report: LifeEventsReport,
  window: QuestionWindow,
): DashaSegment[] {
  const segments: DashaSegment[] = [];
  const windowStart = window.start;
  const windowEnd = window.end;
  const todayIso = toIsoDate(new Date());

  // Build a lookup from MD planet → DashaPrediction for nature/themes
  const predByPlanet = new Map<string, DashaPrediction>();
  for (const p of report.dashaPredictions) predByPlanet.set(p.planet, p);

  for (const md of chart.dasha_sequence) {
    const mdStart = parseIso(md.start_date);
    const mdEnd = parseIso(md.end_date);
    if (!mdStart || !mdEnd) continue;
    if (mdEnd < windowStart || mdStart > windowEnd) continue;

    const pred = predByPlanet.get(md.planet);

    for (const ad of md.antardashas ?? []) {
      const adStart = parseIso(ad.start_date);
      const adEnd = parseIso(ad.end_date);
      if (!adStart || !adEnd) continue;
      if (adEnd < windowStart || adStart > windowEnd) continue;

      const clippedStart = adStart < windowStart ? windowStart : adStart;
      const clippedEnd = adEnd > windowEnd ? windowEnd : adEnd;

      segments.push({
        mahadasha: md.planet,
        antardasha: ad.planet,
        startDate: ad.start_date,
        endDate: ad.end_date,
        includedFrom: toIsoDate(clippedStart),
        includedTo: toIsoDate(clippedEnd),
        isCurrent: ad.start_date <= todayIso && todayIso <= ad.end_date,
        nature: pred?.overallNature,
        themes: pred?.themes?.slice(0, 3),
      });
    }
  }
  return segments;
}

// ────────────────────────────────────────────────────────────────────────────
// Highlight clipping
// ────────────────────────────────────────────────────────────────────────────

function clipHighlights(
  report: LifeEventsReport,
  window: QuestionWindow,
  categories: string[],
): WindowHighlight[] {
  // For general ("no specific category") questions, don't filter by
  // category — the user is asking broadly, so window-scoped top highlights
  // across all categories is the right answer.
  const isGeneric =
    categories.length === 0 ||
    (categories.length === 1 && categories[0] === "general");
  const catSet = new Set(categories);
  const startIso = toIsoDate(window.start);
  const endIso = toIsoDate(window.end);

  const test = (h: LifeHighlight): boolean => {
    if (h.endDateRaw < startIso) return false;
    if (h.startDateRaw > endIso) return false;
    if (!isGeneric && catSet.size && !catSet.has(h.category)) return false;
    return true;
  };

  const upcoming = (report.upcomingHighlights ?? []).filter(test).map(
    (h) =>
      ({
        event: h.event,
        window: h.window,
        dashaContext: h.dashaContext,
        likelihood: h.likelihood,
        reasoning: h.reasoning,
        category: h.category,
        direction: "upcoming",
        score: h.score,
      }) as WindowHighlight,
  );
  const past = (report.pastHighlights ?? []).filter(test).map(
    (h) =>
      ({
        event: h.event,
        window: h.window,
        dashaContext: h.dashaContext,
        likelihood: h.likelihood,
        reasoning: h.reasoning,
        category: h.category,
        direction: "past",
        score: h.score,
      }) as WindowHighlight,
  );

  return [...past, ...upcoming].sort((a, b) => b.score - a.score).slice(0, 6);
}

// ────────────────────────────────────────────────────────────────────────────
// Transit projection
// ────────────────────────────────────────────────────────────────────────────

function projectWindowTransits(
  chart: ChartResponse,
  transits: CurrentTransitResponse,
  ashtakvarga: AshtakvargaAnalysis | undefined,
  window: QuestionWindow,
  now: Date,
): WindowTransit[] {
  const natalLagna = chart.lagna as Sign;
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  const spanDays = (endMs - startMs) / 86_400_000;

  const planets = [...WINDOW_TRANSIT_PLANETS];
  // For short windows (≤ 60 days) include faster planets too so the
  // answer has real daily-granularity signals.
  if (spanDays <= 60) planets.push("Mars", "Sun");

  const out: WindowTransit[] = [];
  for (const name of planets) {
    const tp = transits.planets.find((p) => p.name === name);
    if (!tp) continue;
    const motion = MEAN_MOTION_DEG_PER_DAY[name];
    if (motion === undefined) continue;

    const nowMs = now.getTime();
    const daysToStart = (startMs - nowMs) / 86_400_000;
    const daysToEnd = (endMs - nowMs) / 86_400_000;

    const startLon = normalizeDeg(tp.longitude + motion * daysToStart);
    const endLon = normalizeDeg(tp.longitude + motion * daysToEnd);
    const midLon = normalizeDeg(tp.longitude + motion * ((daysToStart + daysToEnd) / 2));

    const startSign = ZODIAC_ORDER[Math.floor(startLon / 30)];
    const endSign = ZODIAC_ORDER[Math.floor(endLon / 30)];
    const midSignIdx = Math.floor(midLon / 30);
    const midSign = ZODIAC_ORDER[midSignIdx];

    const ingresses = computeIngresses(
      tp.longitude,
      motion,
      nowMs,
      startMs,
      endMs,
      natalLagna,
    );

    const threshold = GOCHARA_THRESHOLD[name] ?? 0;
    const isNode = name === "Rahu" || name === "Ketu";
    const midBav =
      ashtakvarga && !isNode
        ? bavForPlanetInSign(ashtakvarga, name, midSignIdx)
        : 0;

    let gochara: WindowTransit["gochara"];
    if (isNode) gochara = "nodal";
    else if (threshold && midBav >= threshold) gochara = "active";
    else gochara = "muted";

    const nature = BENEFICS.has(name) ? "benefic" : "malefic";
    const vibe = PLANET_VIBE[name];
    const effect = vibe
      ? nature === "benefic"
        ? vibe.positive
        : vibe.cautious
      : "";

    out.push({
      planet: name,
      startSign,
      endSign,
      startHouseFromLagna: houseFromLagna(startSign, natalLagna),
      endHouseFromLagna: houseFromLagna(endSign, natalLagna),
      ingresses,
      midBav,
      threshold,
      gochara,
      houseTheme: houseTheme(houseFromLagna(midSign, natalLagna)),
      nature,
      effect,
    });
  }
  return out;
}

/**
 * Analytical sign-boundary crossings between [startMs, endMs], given the
 * planet's longitude at nowMs + constant motion. Caps at 12 to avoid
 * pathological inputs.
 */
function computeIngresses(
  lonNow: number,
  motionDegPerDay: number,
  nowMs: number,
  startMs: number,
  endMs: number,
  natalLagna: Sign,
): { date: string; sign: string; houseFromLagna: number }[] {
  if (motionDegPerDay === 0) return [];
  const out: { date: string; sign: string; houseFromLagna: number }[] = [];
  // Sign boundaries are multiples of 30°. Walk them in the direction of motion.
  let lon = normalizeDeg(lonNow + motionDegPerDay * ((startMs - nowMs) / 86_400_000));
  let tMs = startMs;
  const dir = motionDegPerDay > 0 ? 1 : -1;

  while (tMs < endMs && out.length < 12) {
    const nextBoundaryDeg =
      dir > 0
        ? Math.floor(lon / 30) * 30 + 30
        : Math.ceil(lon / 30) * 30 - 30;
    // Wrap safely
    const delta =
      dir > 0
        ? (nextBoundaryDeg - lon + 360) % 360 || 360
        : -(((lon - nextBoundaryDeg) + 360) % 360 || 360);
    const daysToBoundary = delta / motionDegPerDay;
    const nextMs = tMs + daysToBoundary * 86_400_000;
    if (nextMs > endMs) break;

    const newLon = normalizeDeg(lon + delta);
    const signIdx = Math.floor(newLon / 30) % 12;
    const sign = ZODIAC_ORDER[signIdx];
    out.push({
      date: toIsoDate(new Date(nextMs)),
      sign,
      houseFromLagna: houseFromLagna(sign, natalLagna),
    });
    lon = newLon + dir * 0.001; // nudge past the boundary
    tMs = nextMs;
  }
  return out;
}

function bavForPlanetInSign(
  ashtakvarga: AshtakvargaAnalysis,
  planet: string,
  signIdx: number,
): number {
  const planetIdx = ASHTAKVARGA_PLANETS.indexOf(planet as AshtakvargaPlanet);
  if (planetIdx < 0) return 0;
  return ashtakvarga.prastharaCharts[planetIdx]?.signTotals[signIdx] ?? 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Jaimini window clipping
// ────────────────────────────────────────────────────────────────────────────

function clipJaiminiWindows(
  enriched: EnrichedChatContext | undefined,
  window: QuestionWindow,
): JaiminiWindowHit[] {
  if (!enriched) return [];
  const hits: JaiminiWindowHit[] = [];

  const add = (
    kind: "marriage" | "career",
    list:
      | { startMonth: string; endMonth: string; peakScore: number }[]
      | undefined,
  ) => {
    if (!list) return;
    for (const w of list) {
      const ws = monthToDate(w.startMonth);
      const we = monthToDate(w.endMonth, true);
      if (!ws || !we) continue;
      if (we < window.start || ws > window.end) continue;
      hits.push({
        kind,
        startMonth: w.startMonth,
        endMonth: w.endMonth,
        peakScore: w.peakScore,
        rating: w.peakScore >= 5 ? "strong" : "moderate",
      });
    }
  };

  add("marriage", enriched.marriage?.upcomingWindows);
  add("career", enriched.career?.upcomingWindows);
  return hits;
}

// ────────────────────────────────────────────────────────────────────────────
// Category house focus
// ────────────────────────────────────────────────────────────────────────────

function collectHouseFocus(
  enriched: EnrichedChatContext | undefined,
  houses: number[],
  lagnaSign: Sign,
): HouseFocus[] {
  if (!enriched || enriched.houseSav.length === 0 || houses.length === 0)
    return [];
  const out: HouseFocus[] = [];
  for (const h of houses.slice(0, 3)) {
    const row = enriched.houseSav.find((r) => r.house === h);
    if (!row) {
      // Derive sign from lagna if no SAV row present
      const signIdx = (SIGN_INDEX[lagnaSign] + h - 1) % 12;
      out.push({
        house: h,
        sign: ZODIAC_ORDER[signIdx],
        bindus: 0,
        strength: "Unknown",
        theme: houseTheme(h),
      });
      continue;
    }
    out.push({
      house: h,
      sign: row.sign,
      bindus: row.bindus,
      strength: row.strength,
      theme: houseTheme(h),
    });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Summary line
// ────────────────────────────────────────────────────────────────────────────

function buildSummary(
  window: QuestionWindow,
  segments: DashaSegment[],
  transits: WindowTransit[],
  highlights: WindowHighlight[],
): string {
  const bits: string[] = [];
  if (segments.length > 0) {
    const dashaNames = Array.from(
      new Set(segments.map((s) => `${s.mahadasha}-${s.antardasha}`)),
    ).slice(0, 3);
    bits.push(`Dashas in window: ${dashaNames.join(", ")}`);
  }
  const activeTransits = transits.filter((t) => t.gochara === "active");
  if (activeTransits.length > 0) {
    bits.push(
      `Active transits: ${activeTransits
        .map((t) => `${t.planet} → H${t.endHouseFromLagna}`)
        .join(", ")}`,
    );
  }
  if (highlights.length > 0) {
    bits.push(`${highlights.length} highlight(s) in window`);
  }
  if (bits.length === 0) {
    return `No strong pre-computed signals inside ${window.label} — lean on the standing chart interpretation.`;
  }
  return bits.join(" · ");
}

// ────────────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────────────

function houseFromLagna(transitSign: string, natalLagna: Sign): number {
  const t = SIGN_INDEX[transitSign as Sign] ?? 0;
  const l = SIGN_INDEX[natalLagna] ?? 0;
  return ((t - l + 12) % 12) + 1;
}

function houseTheme(house: number): string {
  return HOUSE_SIGNIFICATIONS[house]?.short ?? "";
}

function normalizeDeg(d: number): number {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

function parseIso(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function monthToDate(month: string, endOfMonth = false): Date | null {
  // Accepts "Apr 2026" or "2026-04" or similar; returns first/last-of-month.
  // Tolerant — falls back to null if unparseable.
  const ym = /^(\d{4})-(\d{1,2})/.exec(month);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]) - 1;
    return endOfMonth
      ? new Date(Date.UTC(y, m + 1, 0, 23, 59, 59))
      : new Date(Date.UTC(y, m, 1));
  }
  const alpha =
    /^([A-Za-z]{3,})\s+(\d{4})/.exec(month) ??
    /^([A-Za-z]{3,})\.?\s+(\d{4})/.exec(month);
  if (alpha) {
    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const idx = monthNames.indexOf(alpha[1].slice(0, 3).toLowerCase());
    if (idx < 0) return null;
    const y = Number(alpha[2]);
    return endOfMonth
      ? new Date(Date.UTC(y, idx + 1, 0, 23, 59, 59))
      : new Date(Date.UTC(y, idx, 1));
  }
  return null;
}

export function describeWindowTransit(t: WindowTransit): string {
  const ingressBit =
    t.ingresses.length > 0
      ? ` (moves ${t.ingresses.map((i) => `→ ${i.sign} on ${i.date}`).join(" ")})`
      : "";
  const bavBit =
    t.gochara === "nodal"
      ? ""
      : `, BAV ${t.midBav}/${t.threshold} at midpoint (${t.gochara})`;
  return `${t.planet}: ${t.startSign} → ${t.endSign}, H${t.startHouseFromLagna}→H${t.endHouseFromLagna}${ingressBit}${bavBit} — ${t.effect}`;
}

// ensure the eagerly-imported formatters aren't tree-shaken in types
void formatMonth;
