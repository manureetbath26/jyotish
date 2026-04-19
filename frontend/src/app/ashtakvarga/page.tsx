"use client";

import { useEffect, useRef, useState } from "react";
import { calculateChart, type ChartResponse } from "@/lib/api";
import {
  computeAshtakvarga,
  type AshtakvargaAnalysis,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import { AshtakvargaCharts } from "@/components/AshtakvargaCharts";
import { ProfileSelector, type SelectedSource } from "@/components/ProfileSelector";

async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

type Step = "birth" | "charts";

export default function AshtakvargaPage() {
  const [step, setStep] = useState<Step>("birth");

  // Profile
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Birth form
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  // Chart & analysis
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [rules, setRules] = useState<AshtakvargaRule[] | null>(null);
  const [analysis, setAnalysis] = useState<AshtakvargaAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSelect = (sel: SelectedSource) => {
    if (sel.kind === "profile") {
      const p = sel.profile;
      setSelectedProfileId(p.id);
      setName(p.name);
      setDate(p.dateOfBirth);
      setTime(p.timeOfBirth);
      setPlace(p.placeOfBirth);
    } else {
      setSelectedProfileId(null);
      setName("");
      setDate("");
      setTime("");
      setPlace("");
    }
  };

  // Place autocomplete
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(place);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [place]);

  // Pre-fetch rules on mount (small payload, cached)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ashtakvarga/rules")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setRules(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    setLoading(true);
    setError(null);
    try {
      const result = await calculateChart({ date, time, place });
      setChart(result);

      // Load rules if not yet loaded
      let activeRules = rules;
      if (!activeRules) {
        const res = await fetch("/api/ashtakvarga/rules");
        activeRules = res.ok ? await res.json() : [];
        setRules(activeRules);
      }

      const result2 = computeAshtakvarga(result, activeRules || []);
      setAnalysis(result2);
      setStep("charts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u2728"}</span>
          Ashtakvarga Charts
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Eight classical charts showing planetary bindu distributions across the zodiac
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Based on bindu contribution tables from M.S. Mehta&apos;s <em>Jyotish Ashtakavarga</em>
        </p>
      </header>

      {step === "birth" && (
        <form
          onSubmit={handleCalculate}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 max-w-2xl mx-auto"
        >
          <ProfileSelector
            accent="amber"
            selectedProfileId={selectedProfileId}
            onSelect={handleProfileSelect}
          />

          <h2 className="text-lg font-semibold text-amber-400">
            {selectedProfileId ? "Confirm Birth Details" : "Enter Birth Details"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Accurate birth details determine planetary positions, which drive all 8 Ashtakvarga charts.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For your reference"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Date of Birth
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Time of Birth
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Place of Birth
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => {
                setPlace(e.target.value);
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. Mumbai, India"
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => {
                      selectedRef.current = true;
                      setPlace(s);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer truncate"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Calculating charts..." : "Generate Ashtakvarga Charts"}
          </button>
        </form>
      )}

      {step === "charts" && chart && analysis && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-slate-200 font-semibold">
                {name || "Chart"} &middot; {chart.lagna} Lagna
              </p>
              <p className="text-xs text-slate-500">
                {chart.date} &middot; {chart.time} &middot; {chart.place?.split(",").slice(0, 2).join(",")}
              </p>
            </div>
            <button
              onClick={() => {
                setStep("birth");
                setAnalysis(null);
                setChart(null);
              }}
              className="text-xs border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              {"\u2190"} New chart
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <AshtakvargaCharts analysis={analysis} />
          </div>

          {/* Summary of BAV totals */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
              Bhinnashtakvarga Totals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs">
              {analysis.prastharaCharts.map((p) => (
                <div
                  key={p.planet}
                  className="bg-slate-800/30 border border-slate-800 rounded-lg p-2 text-center"
                >
                  <p className="text-[10px] text-slate-500">{p.planet}</p>
                  <p className="text-lg font-bold text-amber-400">{p.grandTotal}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Classical maxima: Sun 48 &middot; Moon 49 &middot; Mars 39 &middot; Mercury 54 &middot;
              Jupiter 56 &middot; Venus 52 &middot; Saturn 39 &middot; SAV 337
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
