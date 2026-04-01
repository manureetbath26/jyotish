"use client";

import React, { useState } from "react";
import { ChartResponse } from "@/lib/api";
import { TransitTimeline } from "./TransitTimeline";

interface TransitData {
  start_date: string;
  end_date: string;
  timelines: Record<string, any[]>;
  major_transits: any[];
  summary: Record<string, string>;
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
];

export function TransitCalculator({ chart }: TransitCalculatorProps) {
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    LIFE_AREAS.map(a => a.id)
  );
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chart/transits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart_data: chart,
          start_date: startDate,
          end_date: endDate,
          life_areas: selectedAreas,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate transits");
      }

      const data = await response.json();
      setTransitData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
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
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Life Areas Selection */}
        <div>
          <h3 className="text-sm font-semibold text-amber-400 mb-3">🎯 Select Life Areas</h3>
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
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
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
            <h2 className="text-xl font-bold text-amber-400 mb-2">Transit Analysis Results</h2>
            <p className="text-sm text-slate-400">
              Analysis period: {new Date(transitData.start_date).toLocaleDateString("en-IN")} to{" "}
              {new Date(transitData.end_date).toLocaleDateString("en-IN")}
            </p>
          </div>

          {/* Timeline for each life area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedAreas.map(areaId => (
              <div
                key={areaId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <TransitTimeline
                  lifeArea={areaId}
                  periods={transitData.timelines[areaId] || []}
                  summary={transitData.summary[areaId] || ""}
                />
              </div>
            ))}
          </div>

          {/* Major Transit Events */}
          {transitData.major_transits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">
                🌙 Major Transit Events
              </h3>
              <div className="space-y-3">
                {transitData.major_transits.slice(0, 10).map((transit, idx) => (
                  <div key={idx} className="border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-200">{transit.planet} Conjunction</p>
                      <p className="text-xs text-slate-400">
                        Transiting {transit.transit_position.toFixed(1)}° meets natal {transit.natal_position.toFixed(1)}°
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-400">
                      {new Date(transit.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))}
                {transitData.major_transits.length > 10 && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    +{transitData.major_transits.length - 10} more events
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
