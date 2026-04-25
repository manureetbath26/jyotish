"use client";

import React, { useState, useEffect } from "react";
import { ChartResponse, CurrentTransitResponse, calculateCurrentTransits } from "@/lib/api";
import { TransitTimeline, type IngressEvent } from "./TransitTimeline";
import { NorthIndianChart } from "./charts/NorthIndianChart";
import { PremiumLock, usePremium } from "./PremiumLock";

interface PlanetSnapshot {
  planet: string;
  sign: string;
  sign_num: number;
  degree: number;
  house: number;
  is_retrograde: boolean;
  nakshatra?: string | null;
}

interface TransitData {
  start_date: string;
  end_date: string;
  opening_snapshot: PlanetSnapshot[];
  events_by_area: Record<string, IngressEvent[]>;
}

interface TransitCalculatorProps {
  chart: ChartResponse;
}

const LIFE_AREAS = [
  { id: "love_life", label: "💕 Love Life", description: "Romance, partnerships, relationships" },
  { id: "health", label: "🏥 Health", description: "Physical health and vitality" },
  { id: "career", label: "💼 Career", description: "Work, recognition, advancement" },
  { id: "finances", label: "💰 Finances", description: "Money, wealth, prosperity" },
  { id: "family", label: "👨‍👩‍👧‍👦 Family", description: "Family relationships and harmony" },
  { id: "self_confidence", label: "🦁 Self / Confidence", description: "Self-esteem, courage, personal power" },
];

// Hard ceiling on the analysis window. With ingress-event cards, 1y is the
// right scale: Mars crosses ~8 signs; Jup/Sat/Ra/Ke cross 0-1 each. Keeps
// the per-area card list scannable. Matches the ask-engine's default 1y.
const MAX_WINDOW_YEARS = 1;
const MAX_WINDOW_MS = MAX_WINDOW_YEARS * 365 * 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const PLANET_ABBR: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

export function TransitCalculator({ chart }: TransitCalculatorProps) {
  const { transitAccessUntil } = usePremium();

  const [startDate, setStartDate] = useState(isoDate(new Date()));

  // Effective max end-date = min(start + 5y, subscription ceiling, default 1y)
  const maxEndDate = (() => {
    const fiveYearsFromStart = isoDate(new Date(new Date(startDate).getTime() + MAX_WINDOW_MS));
    const subscriptionCap = transitAccessUntil ? isoDate(new Date(transitAccessUntil)) : null;
    if (subscriptionCap && subscriptionCap < fiveYearsFromStart) return subscriptionCap;
    return fiveYearsFromStart;
  })();

  const defaultEnd = transitAccessUntil
    ? isoDate(new Date(transitAccessUntil))
    : isoDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(
    defaultEnd > maxEndDate ? maxEndDate : defaultEnd,
  );
  // Categories start de-selected — user must pick at least one before
  // the Calculate button activates. Forces intentional scoping.
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Current transit chart state
  const [currentTransit, setCurrentTransit] = useState<CurrentTransitResponse | null>(null);
  const [transitChartLoading, setTransitChartLoading] = useState(true);

  useEffect(() => {
    calculateCurrentTransits(chart.ayanamsha_value, chart.lagna_degree)
      .then(setCurrentTransit)
      .catch(() => {})
      .finally(() => setTransitChartLoading(false));
  }, [chart.ayanamsha_value, chart.lagna_degree]);

  // Keep endDate within the rolling 5-year ceiling whenever startDate moves
  useEffect(() => {
    if (endDate > maxEndDate) setEndDate(maxEndDate);
  }, [startDate, maxEndDate, endDate]);

  const handleAreaToggle = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start date must be before end date");
      return;
    }

    if (selectedAreas.length === 0) {
      setError("Please select at least one life area");
      return;
    }

    // Clamp end date to whichever ceiling is tighter — the 5-year analysis
    // window or the user's subscription transit-access limit.
    let effectiveEndDate = endDate;
    if (effectiveEndDate > maxEndDate) effectiveEndDate = maxEndDate;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chart/transit-ingresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart_data: chart,
          start_date: startDate,
          end_date: effectiveEndDate,
          life_areas: selectedAreas,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to calculate transits");
      }

      const data = (await response.json()) as TransitData;
      setTransitData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Transit Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-1">🌍 Current Transit Chart</h3>
        <p className="text-xs text-slate-500 mb-4">
          Planet positions for today ({currentTransit?.transit_date ?? "loading..."}) in your natal house framework
        </p>

        {transitChartLoading && (
          <div className="flex items-center justify-center h-40 text-slate-500">
            <div className="text-center space-y-3">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Calculating current transits…</p>
            </div>
          </div>
        )}

        {currentTransit && !transitChartLoading && (
          <div className="space-y-4">
            <NorthIndianChart
              lagna={currentTransit.lagna}
              lagna_degree={currentTransit.lagna_degree}
              planets={currentTransit.planets}
              houses={currentTransit.houses}
            />

            {/* Planet position summary grid — sign + degree + house from natal lagna */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {currentTransit.planets.map(p => (
                <div
                  key={p.name}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1.5 text-center"
                >
                  <p className="text-xs font-bold text-slate-300">
                    {PLANET_ABBR[p.name] ?? p.name}{p.is_retrograde ? " ᴿ" : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.rashi.slice(0, 3)} {p.degree_in_rashi.toFixed(1)}°
                  </p>
                  <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">
                    H{p.house}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Panel — Premium */}
      <PremiumLock>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        {/* Date Range */}
        <div>
          <h3 className="text-sm font-semibold text-amber-400 mb-3">📅 Select Date Range</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                max={maxEndDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Analysis window is capped at{" "}
            <span className="text-slate-300 font-medium">
              {MAX_WINDOW_YEARS === 1 ? "1 year" : `${MAX_WINDOW_YEARS} years`}
            </span>{" "}
            from the start date — keeps the ingress timeline scannable.
            {transitAccessUntil && (
              <>
                {" "}Your plan covers transits until{" "}
                <span className="text-slate-300 font-medium">
                  {new Date(transitAccessUntil).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>.{" "}
                <a href="/subscribe" className="text-amber-400 hover:text-amber-300 underline">
                  Top up for more
                </a>
              </>
            )}
          </p>
        </div>

        {/* Life Areas Selection */}
        <div>
          <h3 className="text-sm font-semibold text-amber-400 mb-3">
            🎯 Select Life Areas
            {selectedAreas.length === 0 && (
              <span className="ml-2 text-xs font-normal text-amber-500/80">
                pick at least one to enable Calculate
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIFE_AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => handleAreaToggle(area.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selectedAreas.includes(area.id)
                    ? "bg-amber-900/30 border-amber-600 ring-1 ring-amber-500/50"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="font-medium text-slate-200">{area.label}</div>
                <div className="text-xs text-slate-400 mt-1">{area.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-300">⚠️ {error}</p>
          </div>
        )}

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading || selectedAreas.length === 0}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculating Transits...
            </span>
          ) : (
            "Calculate Transit Periods ✨"
          )}
        </button>
      </div>

      {/* Results */}
      {transitData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-amber-400 mb-1">Transit Analysis Results</h2>
            <p className="text-sm text-slate-400">
              Window: {new Date(transitData.start_date).toLocaleDateString("en-IN")} →{" "}
              {new Date(transitData.end_date).toLocaleDateString("en-IN")}
            </p>
          </div>

          {/* Opening snapshot — every planet's position at start_date */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-amber-400 mb-1">
              📍 Where the planets sit on {new Date(transitData.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              House numbers are from your natal lagna. Use this as the baseline for the
              ingress events below.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {transitData.opening_snapshot.map(p => (
                <div
                  key={p.planet}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1.5 text-center"
                >
                  <p className="text-xs font-bold text-slate-300">
                    {PLANET_ABBR[p.planet] ?? p.planet}{p.is_retrograde ? " ᴿ" : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.sign.slice(0, 3)} {p.degree.toFixed(1)}°
                  </p>
                  <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">
                    H{p.house}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-area ingress timelines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedAreas.map(areaId => (
              <div
                key={areaId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <TransitTimeline
                  lifeArea={areaId}
                  events={transitData.events_by_area[areaId] ?? []}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </PremiumLock>
    </div>
  );
}
