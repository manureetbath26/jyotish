"use client";

import { useState, useEffect } from "react";
import type { CharaKarakaRole, NaisargikaKaraka } from "@/lib/karakaInterpretations";

// ---------------------------------------------------------------------------
// Raw row from the API
// ---------------------------------------------------------------------------
interface InterpretationRow {
  id: string;
  category: string;
  key1: string;
  key2: string | null;
  content: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------------------------------------------------------------------------
// Parsed output shape
// ---------------------------------------------------------------------------
export interface KarakaInterpretations {
  /** 7 Chara Karaka role definitions, keyed by role id (AK, AmK, etc.) */
  charaRoles: CharaKarakaRole[];
  /** charaByPlanet[roleId][planet] → interpretation text */
  charaByPlanet: Record<string, Record<string, string>>;
  /** charaLordship[roleId][houseNum] → interpretation text */
  charaLordship: Record<string, Record<number, string>>;
  /** 9 Naisargika Karaka definitions */
  naisargikaKarakas: NaisargikaKaraka[];
  /** naisargikaInHouse[planet][houseNum] → interpretation text */
  naisargikaInHouse: Record<string, Record<number, string>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useKarakaInterpretations() {
  const [data, setData] = useState<KarakaInterpretations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch all 5 categories in parallel
        const [rolesRes, byPlanetRes, lordshipRes, nkRes, nkHouseRes] = await Promise.all([
          fetch("/api/interpretations?category=chara_role"),
          fetch("/api/interpretations?category=chara_by_planet"),
          fetch("/api/interpretations?category=chara_lordship"),
          fetch("/api/interpretations?category=naisargika"),
          fetch("/api/interpretations?category=naisargika_in_house"),
        ]);

        if (!rolesRes.ok || !byPlanetRes.ok || !lordshipRes.ok || !nkRes.ok || !nkHouseRes.ok) {
          throw new Error("Failed to fetch interpretation data");
        }

        const [rolesRows, byPlanetRows, lordshipRows, nkRows, nkHouseRows]: InterpretationRow[][] =
          await Promise.all([
            rolesRes.json(),
            byPlanetRes.json(),
            lordshipRes.json(),
            nkRes.json(),
            nkHouseRes.json(),
          ]);

        if (cancelled) return;

        // Parse chara roles — content is the full role object
        const charaRoles: CharaKarakaRole[] = rolesRows
          .map((r) => r.content as CharaKarakaRole)
          .sort((a, b) => {
            const order = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
            return order.indexOf(a.id) - order.indexOf(b.id);
          });

        // Parse chara by planet
        const charaByPlanet: Record<string, Record<string, string>> = {};
        for (const row of byPlanetRows) {
          if (!charaByPlanet[row.key1]) charaByPlanet[row.key1] = {};
          charaByPlanet[row.key1][row.key2!] = (row.content as { text: string }).text;
        }

        // Parse chara lordship
        const charaLordship: Record<string, Record<number, string>> = {};
        for (const row of lordshipRows) {
          if (!charaLordship[row.key1]) charaLordship[row.key1] = {};
          charaLordship[row.key1][parseInt(row.key2!)] = (row.content as { text: string }).text;
        }

        // Parse naisargika karakas
        const naisargikaKarakas: NaisargikaKaraka[] = nkRows.map(
          (r) => r.content as NaisargikaKaraka,
        );

        // Parse naisargika in house
        const naisargikaInHouse: Record<string, Record<number, string>> = {};
        for (const row of nkHouseRows) {
          if (!naisargikaInHouse[row.key1]) naisargikaInHouse[row.key1] = {};
          naisargikaInHouse[row.key1][parseInt(row.key2!)] = (row.content as { text: string }).text;
        }

        setData({
          charaRoles,
          charaByPlanet,
          charaLordship,
          naisargikaKarakas,
          naisargikaInHouse,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
