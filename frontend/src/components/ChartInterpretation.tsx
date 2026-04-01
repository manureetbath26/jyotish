"use client";

import { useState } from "react";
import { ChartResponse, PlanetPosition, HouseInfo } from "@/lib/api";
import {
  LAGNA_DESCRIPTIONS,
  PLANET_IN_HOUSE,
  DIGNITY_INTERPRETATIONS,
  LIFE_AREA_CONFIG,
  SIGN_ON_HOUSE_FOR_AREA,
  HOUSE_LORD_IN_HOUSE_FOR_AREA,
  KEY_PLANET_ROLE,
} from "@/lib/interpretations";

interface Props {
  chart: ChartResponse;
}

const DIGNITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  exalted:      { label: "Exalted",      color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30" },
  moolatrikona: { label: "Moolatrikona", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  own:          { label: "Own Sign",     color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/30" },
  debilitated:  { label: "Debilitated",  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
};

const DIGNITY_QUALITY: Record<string, string> = {
  exalted: "strengthening", moolatrikona: "very well-placed",
  own: "comfortable", debilitated: "weakening",
};

function Section({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-slate-200 text-sm">{title}</span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

export function ChartInterpretation({ chart }: Props) {
  const lagna = LAGNA_DESCRIPTIONS[chart.lagna];
  const retrogrades = chart.planets.filter(p => p.is_retrograde);
  const dignified = chart.planets.filter(p => p.dignity && p.dignity !== null);

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-slate-800" />
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Chart Interpretation</p>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      {/* Lagna Overview */}
      {lagna && (
        <Section title={`Ascendant: ${chart.lagna} Lagna`} defaultOpen>
          <p className="text-sm text-slate-300 leading-relaxed">{lagna.overview}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-green-950/40 border border-green-900/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-400 mb-1">Strengths</p>
              <p className="text-xs text-slate-300 leading-relaxed">{lagna.strengths}</p>
            </div>
            <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-400 mb-1">Challenges</p>
              <p className="text-xs text-slate-300 leading-relaxed">{lagna.challenges}</p>
            </div>
            <div className="bg-blue-950/40 border border-blue-900/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-400 mb-1">Health Focus</p>
              <p className="text-xs text-slate-300 leading-relaxed">{lagna.health}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Planetary Dignities */}
      {dignified.length > 0 && (
        <Section title={`Planetary Dignity (${dignified.length} planets)`} defaultOpen>
          <div className="space-y-3">
            {dignified.map(p => {
              const badge = DIGNITY_BADGE[p.dignity!];
              const interp = DIGNITY_INTERPRETATIONS[p.dignity!]?.[p.name];
              return (
                <div key={p.name} className={`border rounded-lg p-3 ${badge.bg} border-current border-opacity-30`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className={`text-sm font-semibold ${badge.color}`}>{p.name}</span>
                    <span className="text-xs text-slate-400">in {p.rashi} · House {p.house}</span>
                  </div>
                  {interp && <p className="text-xs text-slate-300 leading-relaxed">{interp}</p>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Planet-by-planet placement */}
      <Section title="Planet Placements">
        <div className="space-y-4">
          {chart.planets.map(p => {
            const meaning = PLANET_IN_HOUSE[p.name]?.[p.house];
            return (
              <div key={p.name} className="border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                {/* Planet header */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-slate-100">{p.name}</span>
                  <span className="text-xs text-slate-400">
                    {p.rashi} · {p.degree_in_rashi.toFixed(1)}° · House {p.house}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p.nakshatra} pada {p.nakshatra_pada}
                  </span>
                  {p.is_retrograde && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      Retrograde
                    </span>
                  )}
                  {p.dignity && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${DIGNITY_BADGE[p.dignity].bg} ${DIGNITY_BADGE[p.dignity].color}`}>
                      {DIGNITY_BADGE[p.dignity].label}
                    </span>
                  )}
                  {p.lord_of_houses.length > 0 && (
                    <span className="text-xs text-slate-500">
                      Lords: {p.lord_of_houses.map(h => `H${h}`).join(", ")}
                    </span>
                  )}
                </div>
                {/* Interpretation */}
                {meaning && (
                  <p className="text-xs text-slate-400 leading-relaxed">{meaning}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* House Lords */}
      <Section title="House Sign & Lord Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wide border-b border-slate-800">
                <th className="text-left py-2 pr-3">House</th>
                <th className="text-left py-2 pr-3">Sign</th>
                <th className="text-left py-2 pr-3">Lord</th>
                <th className="text-left py-2 pr-3">Lord placed in</th>
                <th className="text-left py-2">Occupants</th>
              </tr>
            </thead>
            <tbody>
              {chart.houses.map(house => {
                const lordPlanet = chart.planets.find(p => p.name === house.lord);
                const lordHouse = lordPlanet ? `House ${lordPlanet.house} (${lordPlanet.rashi})` : "—";
                return (
                  <tr key={house.house_num} className="border-b border-slate-800/40">
                    <td className="py-2 pr-3 font-semibold text-slate-300">{house.house_num}</td>
                    <td className="py-2 pr-3 text-amber-400">{house.rashi}</td>
                    <td className="py-2 pr-3 text-slate-300">{house.lord}</td>
                    <td className="py-2 pr-3 text-slate-400">{lordHouse}</td>
                    <td className="py-2 text-slate-500">{house.occupants.join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Life Area Summary */}
      <Section title="Life Area Overview" defaultOpen>
        <div className="space-y-4">
          {Object.entries(LIFE_AREA_CONFIG).map(([area, config]) => {
            const primaryHouse = chart.houses.find(h => h.house_num === config.primaryHouse);
            const secondaryHouse = chart.houses.find(h => h.house_num === config.secondaryHouse);
            const primaryLordPlanet = chart.planets.find(p => p.name === primaryHouse?.lord);
            const secondaryLordPlanet = chart.planets.find(p => p.name === secondaryHouse?.lord);
            const keyPlanets = chart.planets.filter(p => config.keyPlanets.includes(p.name));
            const planetsInPrimary = chart.planets.filter(p => p.house === config.primaryHouse);
            const planetsInSecondary = chart.planets.filter(p => p.house === config.secondaryHouse);

            const signMeaning = primaryHouse ? SIGN_ON_HOUSE_FOR_AREA[area]?.[primaryHouse.rashi] : null;
            const lordMeaning = primaryLordPlanet ? HOUSE_LORD_IN_HOUSE_FOR_AREA[area]?.[primaryLordPlanet.house] : null;

            return (
              <div key={area} className="border border-slate-800 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/30">
                  <span>{config.icon}</span>
                  <span className="text-sm font-semibold text-slate-100">{area}</span>
                  {primaryHouse && (
                    <span className="ml-auto text-xs text-amber-400 font-medium">{primaryHouse.rashi} on {config.primaryHouse}th</span>
                  )}
                </div>

                <div className="px-4 py-3 space-y-4">
                  {/* 1. Primary house sign reading */}
                  {signMeaning && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        {config.primaryHouseLabel}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">{signMeaning}</p>
                    </div>
                  )}

                  {/* 2. House lord placement — the core interconnection */}
                  {primaryLordPlanet && lordMeaning && (
                    <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg">
                      <p className="text-xs font-semibold text-amber-400 mb-1">
                        {primaryHouse?.lord} (lord of {config.primaryHouse}th) → placed in House {primaryLordPlanet.house} ({primaryLordPlanet.rashi})
                        {primaryLordPlanet.dignity ? ` · ${DIGNITY_QUALITY[primaryLordPlanet.dignity]}` : ""}
                        {primaryLordPlanet.is_retrograde ? " · retrograde" : ""}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">{lordMeaning}</p>
                      {primaryLordPlanet.dignity && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          {primaryLordPlanet.name} is {primaryLordPlanet.dignity} here — {
                            primaryLordPlanet.dignity === "exalted" ? "this powerfully amplifies the above results." :
                            primaryLordPlanet.dignity === "debilitated" ? "this weakens the above results; conscious effort is required." :
                            primaryLordPlanet.dignity === "moolatrikona" ? "this strongly supports the above results." :
                            "this gives comfortable, natural expression to the above results."
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Planets occupying the primary house */}
                  {planetsInPrimary.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Planets in {config.primaryHouse}th house
                      </p>
                      <div className="space-y-2">
                        {planetsInPrimary.map(p => {
                          const badge = p.dignity ? DIGNITY_BADGE[p.dignity] : null;
                          const role = KEY_PLANET_ROLE[area]?.[p.name];
                          return (
                            <div key={p.name} className="flex gap-2">
                              <div className="flex-shrink-0 flex items-center gap-1.5 w-28">
                                <span className="text-xs font-bold text-slate-200">{p.name}</span>
                                {badge && <span className={`text-xs px-1 py-0.5 rounded border ${badge.bg} ${badge.color} leading-none`}>{badge.label[0]}</span>}
                                {p.is_retrograde && <span className="text-xs text-amber-400">℞</span>}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed flex-1">
                                {role
                                  ? role
                                  : `${p.name} in ${p.rashi} directly occupies this house, influencing ${area.toLowerCase()} themes from the ${p.rashi} quality.`}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Secondary house quick note */}
                  {secondaryHouse && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        {config.secondaryHouseLabel}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        <span className="text-slate-400">{secondaryHouse.rashi}</span> sign · Lord {secondaryHouse.lord}
                        {secondaryLordPlanet ? (
                          <> placed in House {secondaryLordPlanet.house} ({secondaryLordPlanet.rashi})
                            {secondaryLordPlanet.dignity ? ` · ${secondaryLordPlanet.dignity}` : ""}
                          </>
                        ) : ""}
                        {planetsInSecondary.length > 0
                          ? ` · Occupied by ${planetsInSecondary.map(p => p.name + (p.dignity ? ` (${p.dignity})` : "")).join(", ")}`
                          : " · Unoccupied"}
                      </p>
                    </div>
                  )}

                  {/* 5. Key planet roles for this area (only those not already shown in primary house) */}
                  {keyPlanets.filter(p => p.house !== config.primaryHouse).length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Key planet influences
                      </p>
                      <div className="space-y-2">
                        {keyPlanets.filter(p => p.house !== config.primaryHouse).map(p => {
                          const badge = p.dignity ? DIGNITY_BADGE[p.dignity] : null;
                          const role = KEY_PLANET_ROLE[area]?.[p.name];
                          return (
                            <div key={p.name} className="flex gap-2">
                              <div className="flex-shrink-0 flex items-center gap-1.5 w-28">
                                <span className="text-xs font-semibold text-slate-300">{p.name}</span>
                                <span className="text-xs text-slate-500">H{p.house}</span>
                                {badge && <span className={`text-xs px-1 rounded border ${badge.bg} ${badge.color} leading-none`}>{badge.label[0]}</span>}
                              </div>
                              <div className="flex-1">
                                {role && <p className="text-xs text-slate-500 leading-relaxed">{role}</p>}
                                <p className="text-xs text-slate-500 mt-0.5">
                                  In {p.rashi} · {PLANET_IN_HOUSE[p.name]?.[p.house]?.split("—")[0]?.split("house")[1]?.trim() ?? `House ${p.house}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Retrograde planets */}
      {retrogrades.length > 0 && (
        <Section title={`Retrograde Planets (${retrogrades.length})`}>
          <p className="text-xs text-slate-400 mb-3">
            Retrograde planets turn their energy inward. Their significations are more subtle, karmic, and require inner work to fully express.
          </p>
          <div className="space-y-2">
            {retrogrades.map(p => (
              <div key={p.name} className="flex items-start gap-3 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                <span className="text-xs font-bold text-amber-400 w-16 flex-shrink-0">{p.name} ℞</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Retrograde in {p.rashi} · House {p.house} — The themes of this planet are internalised, requiring self-reflection.
                  Past-life karma is active through its significations. Results may be delayed but come with depth.
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
