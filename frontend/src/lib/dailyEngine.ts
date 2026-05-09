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
import type { ChatRules, MoonTransitRule } from "./rulesServer";

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
    /** Current pratyantardasha planet (sub-sub-period) — may be absent if not computed */
    pratyantardasha?: string;
    pratyantardasha_ends?: string; // YYYY-MM
    /** Current sookshma dasha planet (sub-sub-sub-period) */
    sookshma?: string;
    sookshma_ends?: string; // YYYY-MM-DD
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

// ─── Pratyantardasha + Sookshma Dasha computation ────────────────────────────

const VIMSHOTTARI_YEARS_DAILY: Record<string, number> = {
  Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16,
  Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
};
const VIMSHOTTARI_ORDER_DAILY = [
  "Sun", "Moon", "Mars", "Rahu", "Jupiter",
  "Saturn", "Mercury", "Ketu", "Venus",
];
const VIMSHOTTARI_TOTAL_DAILY = 120;

function computeCurrentPdAndSd(natal: ChartResponse, today: string): {
  pdPlanet?: string;
  pdEnds?: string;
  sdPlanet?: string;
  sdEnds?: string;
} {
  const adPlanet = natal.current_antardasha?.planet;
  const adStartIso = natal.current_antardasha?.start_date;
  const adEndIso = natal.current_antardasha?.end_date;
  if (!adPlanet || !adStartIso || !adEndIso) return {};

  const adStartMs = new Date(adStartIso).getTime();
  const adEndMs = new Date(adEndIso).getTime();
  const adDays = (adEndMs - adStartMs) / 86_400_000;
  const startIdx = VIMSHOTTARI_ORDER_DAILY.indexOf(adPlanet);
  if (startIdx < 0) return {};

  // Find current PD
  let cursorMs = adStartMs;
  for (let i = 0; i < 9; i++) {
    const pdPlanet = VIMSHOTTARI_ORDER_DAILY[(startIdx + i) % 9];
    const pdDays = adDays * (VIMSHOTTARI_YEARS_DAILY[pdPlanet] / VIMSHOTTARI_TOTAL_DAILY);
    const pdStart = new Date(cursorMs).toISOString().slice(0, 10);
    cursorMs += pdDays * 86_400_000;
    const pdEnd = new Date(cursorMs).toISOString().slice(0, 10);
    if (pdStart <= today && today < pdEnd) {
      // Found current PD — now find current SD within it
      const pdStartMs2 = new Date(pdStart).getTime();
      const pdDays2 = (new Date(pdEnd).getTime() - pdStartMs2) / 86_400_000;
      const sdStartIdx = VIMSHOTTARI_ORDER_DAILY.indexOf(pdPlanet);
      let sdCursorMs = pdStartMs2;
      for (let j = 0; j < 9; j++) {
        const sdPlanet = VIMSHOTTARI_ORDER_DAILY[(sdStartIdx + j) % 9];
        const sdDays = pdDays2 * (VIMSHOTTARI_YEARS_DAILY[sdPlanet] / VIMSHOTTARI_TOTAL_DAILY);
        const sdStart = new Date(sdCursorMs).toISOString().slice(0, 10);
        sdCursorMs += sdDays * 86_400_000;
        const sdEnd = new Date(sdCursorMs).toISOString().slice(0, 10);
        if (sdStart <= today && today < sdEnd) {
          return {
            pdPlanet,
            pdEnds: pdEnd.slice(0, 7),
            sdPlanet,
            sdEnds: sdEnd,
          };
        }
      }
      return { pdPlanet, pdEnds: pdEnd.slice(0, 7) };
    }
  }
  return {};
}

// ────────────────────────────────────────────────────────────────────────────
// Moon transit rule helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns the house number (1–12) that transitSign falls in counting from
 * natalMoonSign. Used for classical Gochara (Chandra Gochara) assessment.
 */
function houseFromNatalMoon(transitSign: string, natalMoonSign: string): number {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  const t = signs.indexOf(transitSign);
  const n = signs.indexOf(natalMoonSign);
  if (t < 0 || n < 0) return 0;
  return ((t - n + 12) % 12) + 1;
}

/**
 * Combines sign, lagna-house, and natal-Moon-house rules to produce a
 * rule-based Moon narrative and overall tone for the day.
 *
 * Tone precedence: negative > mixed > neutral > positive.
 * This ensures a hard Ashtama Chandra (H8 from natal Moon) is not masked by
 * a positive sign placement.
 */
function buildMoonPulseFromRules(
  moonSign: string,
  houseFromLagna: number,
  fromNatalMoon: number,
  rules: MoonTransitRule[],
): { narrative: string; tone: string } {
  const signRule = rules.find(
    (r) => r.ruleType === "sign" && r.position === moonSign,
  );
  const lagnaRule = rules.find(
    (r) => r.ruleType === "from_lagna" && r.position === String(houseFromLagna),
  );
  const moonRule = rules.find(
    (r) => r.ruleType === "from_natal_moon" && r.position === String(fromNatalMoon),
  );

  // Determine overall tone: negative beats mixed beats neutral beats positive
  const toneRank: Record<string, number> = {
    negative: 3,
    mixed: 2,
    neutral: 1,
    positive: 0,
  };
  const tones = [signRule?.tone, lagnaRule?.tone, moonRule?.tone].filter(
    Boolean,
  ) as string[];
  const worstTone = tones.reduce(
    (worst, t) => ((toneRank[t] ?? 0) > (toneRank[worst] ?? 0) ? t : worst),
    "neutral",
  );

  // Build the narrative combining sign + natal-Moon signals (lagna is implicit
  // in the house context already shown by the caller)
  const parts: string[] = [];
  if (signRule) parts.push(signRule.effect);
  if (moonRule) parts.push(`From your natal Moon: ${moonRule.effect}`);

  const narrative = parts.join(" ");
  return { narrative, tone: worstTone };
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
  moonTransitRules?: MoonTransitRule[],
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

  // Build the base narrative (used when rules are unavailable)
  let moonNarrative = moonHouse
    ? `Moon is in ${moonSign}${moonNakshatra ? ` / ${moonNakshatra}` : ""}, your ${moonHouse}${ordinal(moonHouse)} house — the day's pulse tilts toward ${houseTheme(moonHouse)}.`
    : "";

  // Rule-based enrichment: sign tone + Gochara from natal Moon.
  // Also captures the overall tone so the Expect/Be-mindful bullets below
  // can correctly reflect whether the Moon transit is favorable or not.
  // "positive" | "negative" | "mixed" | "neutral" — kept as string to avoid
  // TypeScript control-flow narrowing collapsing the union after the conditional assignment.
  let moonGochara = "neutral";

  if (moonTransitRules && moonTransitRules.length > 0 && moonHouse) {
    const natalMoonPlanet = natal.planets?.find(
      (p: { name: string }) => p.name === "Moon",
    );
    const natalMoonSign = natalMoonPlanet?.rashi ?? "";
    const fromNatal = natalMoonSign
      ? houseFromNatalMoon(moonSign, natalMoonSign)
      : 0;

    if (fromNatal > 0) {
      const { narrative, tone } = buildMoonPulseFromRules(
        moonSign,
        moonHouse,
        fromNatal,
        moonTransitRules,
      );
      moonGochara = tone;
      const toneLabel =
        tone === "negative"
          ? "emotionally heavy day"
          : tone === "positive"
            ? "emotionally supportive day"
            : "emotionally active day";
      const houseContext = `Moon is in ${moonSign}${moonNakshatra ? ` / ${moonNakshatra}` : ""}, your ${moonHouse}${ordinal(moonHouse)} house (${houseTheme(moonHouse)}) — ${toneLabel}.`;
      moonNarrative = narrative ? `${houseContext} ${narrative}` : moonNarrative;
    }
  }

  const moonPulse = {
    sign: moonSign,
    nakshatra: moonNakshatra,
    houseFromLagna: moonHouse,
    houseTheme: houseTheme(moonHouse),
    narrative: moonNarrative,
  };

  // ── Standing context (Vimshottari) ────────────────────────────────────────
  const { mahadasha, antardasha, endsOn } = getCurrentDashaPair(natal);
  const { pdPlanet, pdEnds, sdPlanet, sdEnds } = computeCurrentPdAndSd(natal, today);
  const standingContext = {
    mahadasha,
    antardasha,
    pratyantardasha: pdPlanet,
    pratyantardasha_ends: pdEnds,
    sookshma: sdPlanet,
    sookshma_ends: sdEnds,
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

  // Moon colouring first (everyone has a Moon transit).
  // Use the Gochara tone so the bullet matches the narrative — an unfavorable
  // Moon transit should NOT appear in "Expect: easier flow".
  if (moonPulse.houseTheme) {
    if (moonGochara === "negative") {
      cautiousFlavours.push(
        `emotional pressure around ${moonPulse.houseTheme}`,
      );
    } else if (moonGochara === "mixed") {
      // Mixed: acknowledge the area but temper the language
      supportiveFlavours.push(
        `activity around ${moonPulse.houseTheme} — results vary`,
      );
    } else {
      // positive or neutral (no rules available)
      supportiveFlavours.push(
        `easier flow around ${moonPulse.houseTheme}`,
      );
    }
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
