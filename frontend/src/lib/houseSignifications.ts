/**
 * Single source of truth for house significations.
 *
 * Exports:
 *   - HOUSE_SIGNIFICATIONS (sync constant) — the 12 rows hardcoded here.
 *     Imported by client + server engines alike. This is the compile-time
 *     baseline.
 *   - getHouseSignifications() (async, server-only) — reads the DB so
 *     admins can override the constant without a redeploy. Falls back to
 *     HOUSE_SIGNIFICATIONS if the DB is unreachable or empty.
 *
 * Consumers:
 *   - yogaEngine.ts (detection + house-context narrative)
 *   - dailyEngine.ts (moon pulse + transit house themes)
 *   - financeEngine.ts (wealth-house health labels)
 *   - YogaReportView.tsx (display)
 */

export interface HouseSignificationRow {
  house: number;
  /** Classical Sanskrit name + English gloss, e.g. "Lagna (Self)" */
  name: string;
  /** Short daily-pulse phrase, e.g. "self, body, vitality" */
  short: string;
  /** Fuller significations list */
  themes: string;
}

type HouseMap = Record<number, HouseSignificationRow>;

// ────────────────────────────────────────────────────────────────────────────
// Compile-time constant — THE baseline. Must be kept in sync with
// scripts/seed-house-significations.ts (the latter feeds the DB with the
// same rows). Client code imports this directly; server code can use the
// async helper below to pick up admin-edited DB overrides.
// ────────────────────────────────────────────────────────────────────────────

export const HOUSE_SIGNIFICATIONS: HouseMap = {
  1:  { house: 1,  name: "Lagna (Self)",                         short: "self, body, vitality",                    themes: "self, body, vitality, personality, head, overall life direction" },
  2:  { house: 2,  name: "Dhana Bhava (Wealth)",                 short: "wealth, speech, family",                  themes: "wealth, family, speech, food, values, face" },
  3:  { house: 3,  name: "Sahaja (Siblings & Effort)",           short: "courage, siblings, skill, short travel",  themes: "courage, younger siblings, skills, short travel, self-effort, communication" },
  4:  { house: 4,  name: "Sukha (Home & Comfort)",               short: "home, mother, peace, property",           themes: "home, mother, vehicles, inner peace, property, early education" },
  5:  { house: 5,  name: "Putra (Children & Creativity)",        short: "children, creativity, intelligence, romance", themes: "children, intelligence, creativity, romance, speculation, past-life merit (poorva punya)" },
  6:  { house: 6,  name: "Ripu (Debts, Disease, Service)",       short: "work, service, enemies, health",          themes: "enemies, debts, disease, daily work, service, obstacles overcome" },
  7:  { house: 7,  name: "Yuvati (Marriage & Partnerships)",     short: "marriage, partnerships, open dealings",   themes: "spouse, marriage, business partnerships, public dealings, open enemies" },
  8:  { house: 8,  name: "Ayu (Longevity & Transformation)",     short: "transformation, research, hidden matters", themes: "longevity, transformation, secrets, inheritance, occult, sudden events, in-laws" },
  9:  { house: 9,  name: "Dharma (Fortune & Guru)",              short: "fortune, dharma, father, higher learning", themes: "dharma, fortune, father, higher learning, long journeys, guru, spirituality" },
  10: { house: 10, name: "Karma (Career & Status)",              short: "career, public image, authority",         themes: "career, public image, status, authority, action in the world" },
  11: { house: 11, name: "Labha (Gains & Networks)",             short: "gains, networks, elder siblings",         themes: "gains, friends, elder siblings, fulfilment of desires, networks" },
  12: { house: 12, name: "Vyaya (Losses & Moksha)",              short: "rest, losses, foreign, moksha, privacy",  themes: "expenses, foreign lands, moksha, seclusion, bed pleasures, hidden enemies" },
};

// ────────────────────────────────────────────────────────────────────────────
// Server-side DB-backed accessor with module-level cache.
// This import is deferred so that client bundles don't pull in prisma.
// ────────────────────────────────────────────────────────────────────────────

let serverCache: HouseMap | null = null;
let inFlight: Promise<HouseMap> | null = null;

/**
 * SERVER ONLY. Returns the house significations map, preferring any
 * admin-edited rows in the DB over the compile-time constant. Cached
 * for the lifetime of the Node process.
 *
 * Never throws — falls back to HOUSE_SIGNIFICATIONS if the DB is down,
 * empty, or partial.
 */
export async function getHouseSignifications(): Promise<HouseMap> {
  if (serverCache) return serverCache;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      // Dynamic import so the constant-only client bundle stays lean
      const { prisma } = await import("@/lib/prisma");
      const rows = await prisma.houseSignification.findMany();
      if (rows.length !== 12) {
        console.warn(
          `[houseSignifications] DB has ${rows.length}/12 rows; using compile-time constant`,
        );
        serverCache = HOUSE_SIGNIFICATIONS;
        return HOUSE_SIGNIFICATIONS;
      }
      const map: HouseMap = {};
      for (const r of rows) {
        map[r.house] = { house: r.house, name: r.name, short: r.short, themes: r.themes };
      }
      serverCache = map;
      return map;
    } catch (err) {
      console.warn("[houseSignifications] DB fetch failed, using constant:", err);
      serverCache = HOUSE_SIGNIFICATIONS;
      return HOUSE_SIGNIFICATIONS;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Bust the server cache (e.g. after admin edits). */
export function refreshHouseSignifications(): void {
  serverCache = null;
  inFlight = null;
}
