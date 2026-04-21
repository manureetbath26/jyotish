/**
 * Daily Perspective Engine
 *
 * Deterministic fact extraction for today's reading. Combines:
 *   - Today's transit positions (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn
 *     + Rahu/Ketu) relative to the natal lagna
 *   - Moon's current nakshatra as the "pulse" of the day
 *   - Current Vimshottari mahadasha + antardasha (standing theme)
 *   - Ashtakvarga gochara check — a transiting planet is flagged "active"
 *     only if its BAV in the transit sign meets the classical threshold
 *   - Panchang snapshot for today (tithi, nakshatra, yoga, karana, vara)
 *
 * Returns a plain-JSON `DailyFacts` object consumed by the LLM composer.
 * Never invents — every field is either chart data or a classical lookup.
 */

import type { ChartResponse, CurrentTransitResponse } from "./api";
import type { AshtakvargaAnalysis } from "./ashtakvargaEngine";
import { SIGN_INDEX } from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// House & planet significations
// ────────────────────────────────────────────────────────────────────────────

const HOUSE_THEMES: Record<number, string> = {
  1: "self, body, vitality",
  2: "wealth, speech, family",
  3: "courage, siblings, skill, short travel",
  4: "home, mother, peace, property",
  5: "children, creativity, intelligence, romance",
  6: "work, service, enemies, health",
  7: "marriage, partnerships, open dealings",
  8: "transformation, research, hidden matters",
  9: "fortune, dharma, father, higher learning",
  10: "career, public image, authority",
  11: "gains, networks, elder siblings",
  12: "rest, losses, foreign, moksha, privacy",
};

const PLANET_VIBE: Record<string, { positive: string; cautious: string }> = {
  Sun: {
    positive: "confidence, recognition, clarity of purpose",
    cautious: "ego friction, clashes with authority",
  },
  Moon: {
    positive: "emotional openness, comfort, social warmth",
    cautious: "mood volatility, over-sensitivity",
  },
  Mars: {
    positive: "drive, productivity, courage to act",
    cautious: "impatience, conflict, accidents",
  },
  Mercury: {
    positive: "sharp thinking, good communication, deals",
    cautious: "over-analysis, miscommunication",
  },
  Jupiter: {
    positive: "good counsel, expansion, grace, opportunities",
    cautious: "overconfidence, over-committing",
  },
  Venus: {
    positive: "harmony, pleasure, artistic flow, good relationships",
    cautious: "indulgence, relationship drama",
  },
  Saturn: {
    positive: "discipline, structure, slow steady progress",
    cautious: "delays, fatigue, cold interactions",
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

// Classical benefic/malefic flavour for simple tone shading
const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

// ────────────────────────────────────────────────────────────────────────────
// Ashtakvarga gochara thresholds (classical, BPHS ch 70)
// A transiting planet is "active" when its BAV in the transit sign meets
// these thresholds. Mnemonic: high benefics need to be well-supported to
// actually deliver; malefics' thresholds are lower because they assert
// themselves more easily.
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

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface DailyFacts {
  date: string; // YYYY-MM-DD
  profileName: string;
  lagna: string;
  moonPulse: {
    sign: string;
    nakshatra: string;
    houseFromLagna: number;
    houseTheme: string;
    narrative: string;
  };
  standingContext: {
    mahadasha: string;
    antardasha: string;
    endsOn: string; // YYYY-MM
    themeHint: string;
  };
  activeTransits: ActiveTransit[];
  quietTransits: QuietTransit[];
  panchang?: PanchangSnapshot;
  supportiveFlavours: string[]; // 2-3 concise "expect X" bullets
  cautiousFlavours: string[]; // 1-2 "be mindful of Y" bullets
}

export interface ActiveTransit {
  planet: string;
  transitSign: string;
  houseFromLagna: number;
  houseTheme: string;
  bav: number;
  threshold: number;
  nature: "benefic" | "malefic";
  effectIfActive: string;
}

export interface QuietTransit {
  planet: string;
  transitSign: string;
  houseFromLagna: number;
  bav: number;
  threshold: number;
  note: string;
}

export interface PanchangSnapshot {
  tithi?: string;
  vara?: string;
  nakshatra?: string;
  yoga?: string;
  karana?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function houseFromLagna(transitSign: string, natalLagna: string): number {
  const t = SIGN_INDEX[transitSign as keyof typeof SIGN_INDEX] ?? 0;
  const l = SIGN_INDEX[natalLagna as keyof typeof SIGN_INDEX] ?? 0;
  return ((t - l + 12) % 12) + 1;
}

function getCurrentDashaPair(natal: ChartResponse): {
  mahadasha: string;
  antardasha: string;
  endsOn: string;
} {
  const md = natal.current_dasha?.planet ?? "";
  const ad = natal.current_antardasha?.planet ?? "";
  const endsOn = (natal.current_antardasha?.end_date ?? "").slice(0, 7);
  return { mahadasha: md, antardasha: ad, endsOn };
}

function classifyDasha(md: string, ad: string): string {
  // Short, honest hint based on benefic/malefic flavour of the pair
  const mdNature = BENEFICS.has(md) ? "benefic" : MALEFICS.has(md) ? "malefic" : "mixed";
  const adNature = BENEFICS.has(ad) ? "benefic" : MALEFICS.has(ad) ? "malefic" : "mixed";
  if (mdNature === "benefic" && adNature === "benefic") {
    return "an expansive, supportive background phase";
  }
  if (mdNature === "malefic" && adNature === "malefic") {
    return "a demanding phase that rewards discipline";
  }
  return "a mixed phase — look to the daily transits for the fine-grain tone";
}

function bavForPlanetInSign(
  ashtakvarga: AshtakvargaAnalysis,
  planet: string,
  transitSignIdx: number,
): number {
  const chart = ashtakvarga.prastharaCharts.find((p) => p.planet === planet);
  if (!chart) return 0;
  return chart.signTotals[transitSignIdx] ?? 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────────────────────

export function extractDailyFacts(
  natal: ChartResponse,
  transits: CurrentTransitResponse,
  ashtakvarga: AshtakvargaAnalysis,
  profileName: string,
  panchang?: PanchangSnapshot,
): DailyFacts {
  const natalLagna = natal.lagna;
  const today = transits.transit_date.slice(0, 10);

  // ── Moon pulse ────────────────────────────────────────────────────────────
  const transitMoon = transits.planets.find((p) => p.name === "Moon");
  const moonSign = transitMoon?.rashi ?? "";
  const moonNakshatra = transitMoon?.nakshatra ?? "";
  const moonHouse = transitMoon ? houseFromLagna(moonSign, natalLagna) : 0;
  const moonPulse = {
    sign: moonSign,
    nakshatra: moonNakshatra,
    houseFromLagna: moonHouse,
    houseTheme: HOUSE_THEMES[moonHouse] ?? "",
    narrative: moonHouse
      ? `Moon is in ${moonSign}${moonNakshatra ? ` / ${moonNakshatra}` : ""}, your ${moonHouse}${ordinal(moonHouse)} house — the day's pulse tilts toward ${HOUSE_THEMES[moonHouse]}.`
      : "",
  };

  // ── Standing context (Vimshottari) ────────────────────────────────────────
  const { mahadasha, antardasha, endsOn } = getCurrentDashaPair(natal);
  const standingContext = {
    mahadasha,
    antardasha,
    endsOn,
    themeHint: classifyDasha(mahadasha, antardasha),
  };

  // ── Active vs quiet transits (by BAV threshold) ───────────────────────────
  const active: ActiveTransit[] = [];
  const quiet: QuietTransit[] = [];
  for (const p of transits.planets) {
    if (p.name === "Moon") continue; // covered in moonPulse
    const vibe = PLANET_VIBE[p.name];
    if (!vibe) continue;
    const house = houseFromLagna(p.rashi, natalLagna);
    const signIdx = SIGN_INDEX[p.rashi as keyof typeof SIGN_INDEX] ?? 0;
    const thresh = GOCHARA_THRESHOLD[p.name] ?? 0;
    // Rahu/Ketu don't have their own Prastara chart; use Sarva as proxy / skip
    const bav = thresh ? bavForPlanetInSign(ashtakvarga, p.name, signIdx) : 0;

    if (thresh && bav >= thresh) {
      active.push({
        planet: p.name,
        transitSign: p.rashi,
        houseFromLagna: house,
        houseTheme: HOUSE_THEMES[house] ?? "",
        bav,
        threshold: thresh,
        nature: BENEFICS.has(p.name) ? "benefic" : "malefic",
        effectIfActive:
          BENEFICS.has(p.name) ? vibe.positive : vibe.cautious,
      });
    } else if (thresh) {
      quiet.push({
        planet: p.name,
        transitSign: p.rashi,
        houseFromLagna: house,
        bav,
        threshold: thresh,
        note: `${p.name} transiting ${p.rashi} (H${house}) but BAV ${bav}/${thresh} — classically below threshold, muted today.`,
      });
    } else {
      // Nodes: no BAV chart; include as always-present shadow influences
      active.push({
        planet: p.name,
        transitSign: p.rashi,
        houseFromLagna: house,
        houseTheme: HOUSE_THEMES[house] ?? "",
        bav: 0,
        threshold: 0,
        nature: "malefic",
        effectIfActive: vibe.cautious,
      });
    }
  }

  // ── Narrative bullets for expect / be mindful ─────────────────────────────
  const supportiveFlavours: string[] = [];
  const cautiousFlavours: string[] = [];

  // Moon colouring first (everyone has a Moon transit)
  if (moonPulse.houseTheme) {
    supportiveFlavours.push(
      `easier flow around ${moonPulse.houseTheme}`,
    );
  }

  // Top 2 active benefics → expect
  const beneficsActive = active.filter((a) => a.nature === "benefic");
  for (const a of beneficsActive.slice(0, 2)) {
    supportiveFlavours.push(
      `${a.planet} in your ${a.houseFromLagna}${ordinal(a.houseFromLagna)} (${a.houseTheme}) supports ${a.effectIfActive}`,
    );
  }

  // Top 2 active malefics → be mindful
  const maleficsActive = active.filter((a) => a.nature === "malefic");
  for (const a of maleficsActive.slice(0, 2)) {
    cautiousFlavours.push(
      `${a.planet} in your ${a.houseFromLagna}${ordinal(a.houseFromLagna)} (${a.houseTheme}) can pull toward ${a.effectIfActive}`,
    );
  }

  return {
    date: today,
    profileName,
    lagna: natalLagna,
    moonPulse,
    standingContext,
    activeTransits: active,
    quietTransits: quiet,
    panchang,
    supportiveFlavours,
    cautiousFlavours,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
