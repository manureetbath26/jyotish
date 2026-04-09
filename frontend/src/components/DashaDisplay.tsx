"use client";
import { useState } from "react";
import { DashaEntry, AntardhashaEntry, PlanetPosition } from "@/lib/api";
import {
  DASHA_LORD_GENERAL,
  DASHA_LORD_IN_HOUSE,
  ANTARDASHA_COMBINATIONS,
} from "@/lib/dashaInterpretations";

interface Props {
  currentDasha: DashaEntry;
  currentAntardasha: AntardhashaEntry;
  dashaSequence: DashaEntry[];
  planets: PlanetPosition[];
  lagna: string;
}

const PLANET_COLORS: Record<string, string> = {
  Sun:     "text-amber-400",
  Moon:    "text-blue-300",
  Mars:    "text-red-400",
  Mercury: "text-emerald-400",
  Jupiter: "text-yellow-400",
  Venus:   "text-pink-400",
  Saturn:  "text-slate-400",
  Rahu:    "text-purple-400",
  Ketu:    "text-orange-400",
};

const HOUSE_SIGNIFICATIONS: Record<number, string> = {
  1:  "self, body, personality",
  2:  "wealth, speech, family",
  3:  "courage, siblings, communication",
  4:  "home, mother, happiness",
  5:  "children, creativity, intelligence",
  6:  "enemies, debts, health issues",
  7:  "marriage, partnerships, business",
  8:  "transformation, longevity, hidden matters",
  9:  "fortune, dharma, higher learning",
  10: "career, status, public image",
  11: "gains, income, aspirations",
  12: "losses, spirituality, foreign lands",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export function DashaDisplay({
  currentDasha, currentAntardasha, dashaSequence, planets, lagna
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(currentDasha.start_date);

  // Helper: get natal planet data
  const getNatalPlanet = (name: string) => planets.find(p => p.name === name);

  return (
    <div className="space-y-4">
      {/* Current dasha/antardasha banner */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Mahadasha</p>
          <p className={`text-xl font-bold ${PLANET_COLORS[currentDasha.planet] ?? "text-white"}`}>
            {currentDasha.planet}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatDate(currentDasha.start_date)} → {formatDate(currentDasha.end_date)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Antardasha</p>
          <p className={`text-xl font-bold ${PLANET_COLORS[currentAntardasha.planet] ?? "text-white"}`}>
            {currentAntardasha.planet}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatDate(currentAntardasha.start_date)} → {formatDate(currentAntardasha.end_date)}
          </p>
        </div>
      </div>

      {/* Full sequence with interpretations */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
          Vimshottari Sequence · {lagna} Lagna
        </p>

        {dashaSequence.map(dasha => {
          const isActive = dasha.planet === currentDasha.planet &&
                           dasha.start_date === currentDasha.start_date;
          const isExpanded = expanded === dasha.start_date;
          const natalP = getNatalPlanet(dasha.planet);
          const general = DASHA_LORD_GENERAL[dasha.planet];
          const houseInterp = natalP ? DASHA_LORD_IN_HOUSE[dasha.planet]?.[natalP.house] : null;

          return (
            <div key={dasha.start_date} className={`rounded-lg border ${isActive ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-900"}`}>
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                onClick={() => setExpanded(isExpanded ? null : dasha.start_date)}
              >
                <div className="flex items-center gap-3">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  <span className={`font-semibold ${PLANET_COLORS[dasha.planet] ?? "text-slate-200"}`}>
                    {dasha.planet}
                  </span>
                  <span className="text-xs text-slate-500">{dasha.years.toFixed(1)}y</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    {formatDate(dasha.start_date)} – {formatDate(dasha.end_date)}
                  </span>
                  <span className="text-slate-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded: Chart-specific implications + Antardashas */}
              {isExpanded && (
                <div className="border-t border-slate-800">
                  {/* ── Implications for this dasha based on chart ── */}
                  <div className="px-4 py-3 space-y-3">
                    {/* Overview */}
                    {general && (
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {general.overview}
                      </p>
                    )}

                    {/* Chart-specific: house lordship + placement */}
                    {natalP && (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                          Impact on Your Chart
                        </p>

                        {/* House lordship */}
                        {natalP.lord_of_houses.length > 0 && (
                          <p className="text-sm text-slate-300 leading-relaxed">
                            <span className={`font-semibold ${PLANET_COLORS[dasha.planet] || ""}`}>
                              {dasha.planet}
                            </span>{" "}
                            rules house{natalP.lord_of_houses.length > 1 ? "s" : ""}{" "}
                            {natalP.lord_of_houses.map((h, i) => (
                              <span key={h}>
                                {i > 0 && " & "}
                                <span className="font-semibold text-amber-400">{h}</span>
                                <span className="text-slate-500"> ({HOUSE_SIGNIFICATIONS[h]})</span>
                              </span>
                            ))}
                            {" "}in your chart. This dasha activates these life themes prominently.
                          </p>
                        )}

                        {/* Natal placement */}
                        <p className="text-sm text-slate-300 leading-relaxed">
                          Placed in house{" "}
                          <span className="font-semibold text-amber-400">{natalP.house}</span>{" "}
                          ({natalP.rashi}
                          {natalP.dignity && <>, <span className="capitalize text-amber-400">{natalP.dignity}</span></>}
                          ) — {HOUSE_SIGNIFICATIONS[natalP.house]}.
                        </p>

                        {/* House-specific interpretation */}
                        {houseInterp && (
                          <p className="text-sm text-slate-400 leading-relaxed italic">
                            {houseInterp}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Life area impact cards */}
                    {general && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["career", "relationships", "health", "finances"] as const).map(area => (
                          <div key={area} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-2.5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                              {area === "relationships" ? "💕 Relationships" :
                               area === "career" ? "💼 Career" :
                               area === "health" ? "🏥 Health" : "💰 Finances"}
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {general[area]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Antardasha sub-periods ── */}
                  {dasha.antardashas && dasha.antardashas.length > 0 && (
                    <div className="border-t border-slate-800/60">
                      <p className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Antardasha Periods
                      </p>
                      <div className="divide-y divide-slate-800/50">
                        {dasha.antardashas.map(ad => {
                          const isActiveAD = isActive && ad.planet === currentAntardasha.planet &&
                                             ad.start_date === currentAntardasha.start_date;
                          const combo = ANTARDASHA_COMBINATIONS[dasha.planet]?.[ad.planet];
                          const adNatalP = getNatalPlanet(ad.planet);

                          return (
                            <div
                              key={ad.start_date}
                              className={`px-4 py-2 ${isActiveAD ? "bg-amber-500/10" : ""}`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                  {isActiveAD && <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
                                  <span className={`text-sm font-semibold ${PLANET_COLORS[ad.planet] ?? "text-slate-300"}`}>
                                    {ad.planet}
                                  </span>
                                  {adNatalP && (
                                    <span className="text-xs text-slate-600">
                                      H{adNatalP.house} · {adNatalP.rashi.slice(0, 3)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">
                                  {formatDate(ad.start_date)} – {formatDate(ad.end_date)}
                                </span>
                              </div>
                              {combo && (
                                <p className="text-xs text-slate-400 leading-relaxed pl-3">
                                  {combo}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
