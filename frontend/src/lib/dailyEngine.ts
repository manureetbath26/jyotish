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
import type { ChatRules } from "./rulesServer";

// ────────────────────────────────────────────────────────────────────────────
// All interpretive constants (PLANET_VIBE, GOCHARA_THRESHOLD, BENEFIC /
// MALEFIC sets, house theme phrases) are now loaded from Postgres via
// rulesServer.ts and passed in via the `rules` parameter on extractDailyFacts.
// ────────────────────────────────────────────────────────────────────────────

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

function classifyDasha(rules: ChatRules, md: string, ad: string): string {
  // Short, honest hint based on benefic/malefic flavour of the pair
  const mdNature = rules.planetNature[md] ?? "neutral";
  const adNature = rules.planetNature[ad] ?? "neutral";
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
  rules: ChatRules,
  panchang?: PanchangSnapshot,
): DailyFacts {
  const natalLagna = natal.lagna;
  const today = transits.transit_date.slice(0, 10);
  const houseTheme = (h: number) => rules.houseSignification[h] ?? "";
  const isBenefic = (name: string) => rules.planetNature[name] === "benefic";

  // ── Moon pulse ────────────────────────────────────────────────────────────
  const transitMoon = transits.planets.find((p) => p.name === "Moon");
  const moonSign = transitMoon?.rashi ?? "";
  const moonNakshatra = transitMoon?.nakshatra ?? "";
  const moonHouse = transitMoon ? houseFromLagna(moonSign, natalLagna) : 0;
  const moonPulse = {
    sign: moonSign,
    nakshatra: moonNakshatra,
    houseFromLagna: moonHouse,
    houseTheme: houseTheme(moonHouse),
    narrative: moonHouse
      ? `Moon is in ${moonSign}${moonNakshatra ? ` / ${moonNakshatra}` : ""}, your ${moonHouse}${ordinal(moonHouse)} house — the day's pulse tilts toward ${houseTheme(moonHouse)}.`
      : "",
  };

  // ── Standing context (Vimshottari) ────────────────────────────────────────
  const { mahadasha, antardasha, endsOn } = getCurrentDashaPair(natal);
  const standingContext = {
    mahadasha,
    antardasha,
    endsOn,
    themeHint: classifyDasha(rules, mahadasha, antardasha),
  };

  // ── Active vs quiet transits (by BAV threshold) ───────────────────────────
  const active: ActiveTransit[] = [];
  const quiet: QuietTransit[] = [];
  for (const p of transits.planets) {
    if (p.name === "Moon") continue; // covered in moonPulse
    const vibe = rules.planetVibe[p.name];
    if (!vibe) continue;
    const house = houseFromLagna(p.rashi, natalLagna);
    const signIdx = SIGN_INDEX[p.rashi as keyof typeof SIGN_INDEX] ?? 0;
    const thresh = rules.gocharaThreshold[p.name] ?? 0;
    // Rahu/Ketu don't have their own Prastara chart; use Sarva as proxy / skip
    const bav = thresh ? bavForPlanetInSign(ashtakvarga, p.name, signIdx) : 0;

    if (thresh && bav >= thresh) {
      active.push({
        planet: p.name,
        transitSign: p.rashi,
        houseFromLagna: house,
        houseTheme: houseTheme(house),
        bav,
        threshold: thresh,
        nature: isBenefic(p.name) ? "benefic" : "malefic",
        effectIfActive: isBenefic(p.name) ? vibe.positive : vibe.cautious,
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
        houseTheme: houseTheme(house),
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
