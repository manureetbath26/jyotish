/**
 * Server-only DB-backed accessor for house significations.
 *
 * Lives in its own file so the client bundle never pulls in the prisma
 * import graph. The compile-time constant + type live in
 * ./houseSignifications.ts and are safe for client/server alike.
 */

import {
  HOUSE_SIGNIFICATIONS,
  type HouseSignificationRow,
} from "./houseSignifications";
import { prisma } from "./prisma";

type HouseMap = Record<number, HouseSignificationRow>;

let serverCache: HouseMap | null = null;
let inFlight: Promise<HouseMap> | null = null;

/**
 * Returns the house significations map, preferring any admin-edited rows
 * in the DB over the compile-time constant. Cached for the lifetime of
 * the Node process.
 *
 * Never throws — falls back to HOUSE_SIGNIFICATIONS if the DB is down,
 * empty, or partial.
 */
export async function getHouseSignifications(): Promise<HouseMap> {
  if (serverCache) return serverCache;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
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
