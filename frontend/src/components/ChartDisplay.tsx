"use client";
import { useState, useEffect } from "react";
import { ChartResponse, PanchangResponse, calculatePanchang } from "@/lib/api";
import { NorthIndianChart } from "./charts/NorthIndianChart";
import { SouthIndianChart } from "./charts/SouthIndianChart";
import { PlanetTable } from "./PlanetTable";
import { HouseTable } from "./HouseTable";
import { DashaDisplay } from "./DashaDisplay";
import { NavamsaTab } from "./NavamsaTab";
import { YogaTab } from "./YogaTab";
import { TransitCalculator } from "./TransitCalculator";
import { ChartInterpretation } from "./ChartInterpretation";
import { PanchangTab } from "./PanchangTab";

interface Props {
  chart: ChartResponse;
  onSave?: () => void;
}

type TabId = "panchang" | "chart" | "planets" | "houses" | "dasha" | "navamsa" | "yogas" | "transits";
type ChartStyle = "north" | "south";

const TABS: { id: TabId; label: string }[] = [
  { id: "panchang", label: "Panchang ✦" },
  { id: "chart",   label: "Chart" },
  { id: "planets", label: "Planets" },
  { id: "houses",  label: "Houses" },
  { id: "dasha",   label: "Dasha" },
  { id: "navamsa", label: "Navamsa (D-9)" },
  { id: "yogas",   label: "Yogas" },
  { id: "transits",  label: "Transits 🌙" },
];

export function ChartDisplay({ chart, onSave }: Props) {
  const [tab, setTab] = useState<TabId>("panchang");
  const [style, setStyle] = useState<ChartStyle>("south");
  const [panchang, setPanchang] = useState<PanchangResponse | null>(null);
  const [panchangLoading, setPanchangLoading] = useState(false);
  const [panchangError, setPanchangError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "panchang" && !panchang && !panchangLoading) {
      setPanchangLoading(true);
      setPanchangError(null);
      calculatePanchang({
        date: chart.date,
        time: chart.time,
        place: chart.place,
        ayanamsha: chart.ayanamsha,
      })
        .then(setPanchang)
        .catch(e => setPanchangError(e instanceof Error ? e.message : "Failed to load panchang"))
        .finally(() => setPanchangLoading(false));
    }
  }, [tab, chart, panchang, panchangLoading]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Birth Chart</p>
          <h2 className="text-lg font-semibold text-slate-100">
            {chart.place} · {chart.date} {chart.time}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lagna: <span className="text-amber-400 font-medium">{chart.lagna}</span>
            {" · "}Ayanamsha: <span className="text-slate-300">{chart.ayanamsha_value.toFixed(4)}°</span>
            {" · "}<span className="capitalize">{chart.ayanamsha}</span>
            {" · "}TZ: {chart.timezone}
          </p>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Save Chart
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === t.id
                ? "border-amber-500 text-amber-400 font-medium"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.id === "yogas" && chart.yogas?.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
                {chart.yogas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "panchang" && (
          <div>
            {panchangLoading && (
              <div className="flex items-center justify-center h-40 text-slate-500">
                <div className="text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm">Calculating Panchang…</p>
                </div>
              </div>
            )}
            {panchangError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                {panchangError}
              </div>
            )}
            {panchang && !panchangLoading && <PanchangTab panchang={panchang} />}
          </div>
        )}

        {tab === "chart" && (
          <div className="space-y-4">
            {/* Style toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Chart Style:</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                {(["north", "south"] as ChartStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1 text-xs transition-colors ${
                      style === s
                        ? "bg-amber-500 text-black font-medium"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s === "north" ? "North Indian" : "South Indian"}
                  </button>
                ))}
              </div>
            </div>

            {style === "south" ? (
              <SouthIndianChart
                lagna={chart.lagna}
                lagna_degree={chart.lagna_degree}
                planets={chart.planets}
                houses={chart.houses}
              />
            ) : (
              <NorthIndianChart
                lagna={chart.lagna}
                lagna_degree={chart.lagna_degree}
                planets={chart.planets}
                houses={chart.houses}
              />
            )}
            <ChartInterpretation chart={chart} />
          </div>
        )}

        {tab === "planets" && <PlanetTable planets={chart.planets} />}
        {tab === "houses"  && <HouseTable houses={chart.houses} />}

        {tab === "dasha" && (
          <DashaDisplay
            currentDasha={chart.current_dasha}
            currentAntardasha={chart.current_antardasha}
            dashaSequence={chart.dasha_sequence}
            planets={chart.planets}
            lagna={chart.lagna}
          />
        )}

        {tab === "navamsa" && (
          <NavamsaTab
            navamsaLagna={chart.navamsa_lagna}
            navamsaPlanets={chart.navamsa_planets}
          />
        )}

        {tab === "yogas" && (
          <YogaTab yogas={chart.yogas ?? []} />
        )}

        {tab === "transits" && (
          <TransitCalculator chart={chart} />
        )}
      </div>
    </div>
  );
}
