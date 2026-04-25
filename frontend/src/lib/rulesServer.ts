/**
 * Server-only rules cache for the chat / daily / window engines.
 *
 * Mirrors the shape backend/services/rules.py exposes — both backends
 * consume the same DB tables. 5-minute in-process TTL so admin edits
 * propagate without redeploy. Falls back to a frozen baseline if the
 * DB read fails so engines stay functional.
 *
 * Tables loaded:
 *   PlanetVibe, PlanetNature, HouseSignification, GocharaThreshold,
 *   QuestionCategory, RuleSetting (window_transit_planets,
 *   time_scope_keywords, past_keywords).
 *
 * What's intentionally NOT loaded here (used by transit ingress only,
 * which is computed by the Python backend):
 *   HouseClassification, BhavatBhavam, PlanetSpecialAspect,
 *   LifeAreaHouseRelevance, LifeAreaKaraka, PlanetFavorableHouse,
 *   PlanetAreaInterpretation, PlanetAreaAdvice, Yogakaraka,
 *   LifeAreaLabel.
 */

import { prisma } from "./prisma";

export type Polarity = "positive" | "cautious";
export type PlanetNature = "benefic" | "malefic" | "neutral";

export interface ChatRules {
  /** planet -> {positive, cautious} flavour text (PlanetVibe, 9 rows) */
  planetVibe: Record<string, { positive: string; cautious: string }>;
  /** planet -> "benefic" | "malefic" | "neutral" (PlanetNature, 9 rows) */
  planetNature: Record<string, PlanetNature>;
  /** house -> short theme phrase (HouseSignification, 12 rows) */
  houseSignification: Record<number, string>;
  /** planet -> BAV bindu threshold for active gochara (GocharaThreshold, 7 rows) */
  gocharaThreshold: Record<string, number>;
  /** Chat classifier categories (QuestionCategory, 16 rows) */
  questionCategories: Array<{
    id: string;
    keywords: string[];
    houses: number[];
    planets: string[];
  }>;
  /** Time-scope detector input (RuleSetting, JSON list) */
  timeScopeKeywords: Array<{ scope: string; keywords: string[] }>;
  /** Past-question detector input (RuleSetting, JSON list) */
  pastKeywords: string[];
  /** Slow-planet list for windowContext (RuleSetting, JSON list) */
  windowTransitPlanets: string[];
}

// ── Frozen fallback (only observed if DB unreachable on first load) ─────────
const FALLBACK: ChatRules = {
  planetVibe: {
    Sun:     { positive: "confidence", cautious: "ego friction" },
    Moon:    { positive: "warmth", cautious: "mood swings" },
    Mars:    { positive: "drive", cautious: "impatience" },
    Mercury: { positive: "clarity", cautious: "scatter" },
    Jupiter: { positive: "expansion", cautious: "overreach" },
    Venus:   { positive: "harmony", cautious: "indulgence" },
    Saturn:  { positive: "discipline", cautious: "delay" },
    Rahu:    { positive: "novelty", cautious: "confusion" },
    Ketu:    { positive: "insight", cautious: "withdrawal" },
  },
  planetNature: {
    Sun: "malefic", Moon: "benefic", Mars: "malefic", Mercury: "benefic",
    Jupiter: "benefic", Venus: "benefic", Saturn: "malefic",
    Rahu: "malefic", Ketu: "malefic",
  },
  houseSignification: {
    1:  "self, body, vitality",
    2:  "wealth, speech, family",
    3:  "courage, siblings, skill",
    4:  "home, mother, peace",
    5:  "children, creativity",
    6:  "work, service, health",
    7:  "spouse, partnerships",
    8:  "transformation, hidden",
    9:  "fortune, dharma, father",
    10: "career, public image",
    11: "gains, networks",
    12: "rest, losses, foreign",
  },
  gocharaThreshold: {
    Sun: 4, Moon: 4, Mars: 3, Mercury: 5, Jupiter: 5, Venus: 4, Saturn: 3,
  },
  questionCategories: [],
  timeScopeKeywords: [
    { scope: "today",     keywords: ["today", "tonight", "tomorrow"] },
    { scope: "thisWeek",  keywords: ["this week", "next week"] },
    { scope: "thisMonth", keywords: ["this month", "next month"] },
  ],
  pastKeywords: ["past", "before", "ago", "happened", " did ", " was "],
  windowTransitPlanets: ["Jupiter", "Saturn", "Rahu", "Ketu"],
};

// ── Cache state ─────────────────────────────────────────────────────────────
const TTL_MS = 5 * 60 * 1000;
let cached: ChatRules | null = null;
let loadedAt = 0;
let inFlight: Promise<ChatRules> | null = null;

async function loadFromDb(): Promise<ChatRules> {
  const [
    vibes, natures, houseSigs, thresholds, categories, settings,
  ] = await Promise.all([
    prisma.planetVibe.findMany(),
    prisma.planetNature.findMany(),
    prisma.houseSignification.findMany(),
    prisma.gocharaThreshold.findMany(),
    prisma.questionCategory.findMany(),
    prisma.ruleSetting.findMany({
      where: { key: { in: ["time_scope_keywords", "past_keywords", "window_transit_planets"] } },
    }),
  ]);

  const planetVibe: ChatRules["planetVibe"] = {};
  for (const v of vibes) {
    planetVibe[v.planet] ??= { positive: "", cautious: "" };
    if (v.polarity === "positive") planetVibe[v.planet].positive = v.text;
    else if (v.polarity === "cautious") planetVibe[v.planet].cautious = v.text;
  }

  const planetNature: ChatRules["planetNature"] = {};
  for (const n of natures) {
    planetNature[n.planet] = n.nature as PlanetNature;
  }

  const houseSignification: ChatRules["houseSignification"] = {};
  for (const h of houseSigs) houseSignification[h.house] = h.short;

  const gocharaThreshold: ChatRules["gocharaThreshold"] = {};
  for (const t of thresholds) gocharaThreshold[t.planet] = t.threshold;

  const questionCategories: ChatRules["questionCategories"] = categories.map((c) => ({
    id: c.id,
    keywords: c.keywords,
    houses: c.houses,
    planets: c.planets,
  }));

  // RuleSetting values are JSON columns
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));
  const timeScopeKeywords = (settingMap.get("time_scope_keywords") as ChatRules["timeScopeKeywords"]) ?? FALLBACK.timeScopeKeywords;
  const pastKeywords = (settingMap.get("past_keywords") as string[]) ?? FALLBACK.pastKeywords;
  const windowTransitPlanets = (settingMap.get("window_transit_planets") as string[]) ?? FALLBACK.windowTransitPlanets;

  return {
    planetVibe,
    planetNature,
    houseSignification,
    gocharaThreshold,
    questionCategories,
    timeScopeKeywords,
    pastKeywords,
    windowTransitPlanets,
  };
}

/** Returns the cached ChatRules, refreshing if older than TTL. Concurrent
 *  callers share the in-flight promise. Falls back to FALLBACK on DB error
 *  so engines stay functional in degraded mode. */
export async function getChatRules(): Promise<ChatRules> {
  const now = Date.now();
  if (cached && now - loadedAt < TTL_MS) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      cached = await loadFromDb();
      loadedAt = now;
      return cached;
    } catch (err) {
      console.warn("[rulesServer] DB load failed, using fallback:", err);
      if (!cached) {
        cached = FALLBACK;
        loadedAt = now;
      }
      return cached;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Force the next getChatRules() call to re-fetch from DB. */
export function invalidateChatRules(): void {
  cached = null;
  loadedAt = 0;
}
