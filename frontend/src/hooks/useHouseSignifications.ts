"use client";

import { useEffect, useState } from "react";
import {
  HOUSE_SIGNIFICATIONS,
  type HouseSignificationRow,
} from "@/lib/houseSignifications";

type HouseMap = Record<number, HouseSignificationRow>;

// Process-wide (tab-wide) cache so repeated hook uses share one network fetch
let cache: HouseMap | null = null;
let inFlight: Promise<HouseMap> | null = null;

async function fetchOnce(): Promise<HouseMap> {
  if (cache) return cache;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/house-significations", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as HouseSignificationRow[];
      if (!Array.isArray(rows) || rows.length !== 12) {
        cache = HOUSE_SIGNIFICATIONS;
        return cache;
      }
      const map: HouseMap = {};
      for (const r of rows) map[r.house] = r;
      cache = map;
      return map;
    } catch {
      cache = HOUSE_SIGNIFICATIONS;
      return cache;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Returns the house-signification map, preferring admin-edited DB rows
 * when available. Synchronously returns the compile-time constant on
 * first render so the UI never flashes blank; swaps in the DB version
 * when the fetch resolves.
 */
export function useHouseSignifications(): HouseMap {
  const [map, setMap] = useState<HouseMap>(cache ?? HOUSE_SIGNIFICATIONS);
  useEffect(() => {
    if (cache) {
      setMap(cache);
      return;
    }
    let cancelled = false;
    fetchOnce().then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return map;
}

/** Bust the client cache — call after admin edits to force a refetch. */
export function bustHouseSignificationsCache(): void {
  cache = null;
  inFlight = null;
}
