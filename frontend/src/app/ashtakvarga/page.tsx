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
import { SarvashtakvargaInterpretation } from "@/components/SarvashtakvargaInterpretation";
import {
  interpretSarvashtakvarga,
  type InterpretationRules,
  type SarvashtakvargaInsights,
} from "@/lib/sarvashtakvargaInterpreter";

async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

export default function AshtakvargaPage() {
  // Profile
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfileName, setSelectedProfileName] = useState<string>("");

  // Manual entry form
  const [manualMode, setManualMode] = useState(false);
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
  const [interpretationRules, setInterpretationRules] = useState<InterpretationRules | null>(null);
  const [analysis, setAnalysis] = useState<AshtakvargaAnalysis | null>(null);
  const [insights, setInsights] = useState<SarvashtakvargaInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Loading chart...");
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Pre-fetch bindu rules on mount (small payload, cached)
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

  // Pre-fetch interpretation rules
  const [interpRulesError, setInterpRulesError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ashtakvarga/interpretation-rules")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          // Validate shape
          if (!data || !Array.isArray(data.house) || data.house.length === 0) {
            setInterpRulesError(
              "Interpretation rules returned empty. Run: npx tsx scripts/seed-sarvashtakvarga-rules.ts",
            );
            return;
          }
          setInterpretationRules(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setInterpRulesError(
            err instanceof Error ? err.message : "Failed to load interpretation rules",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute interpretation whenever analysis + interpretation rules are ready
  useEffect(() => {
    if (!analysis || !interpretationRules) {
      setInsights(null);
      return;
    }
    try {
      const result = interpretSarvashtakvarga(
        analysis.sarvashtakvarga.signTotals,
        analysis.lagnaSign,
        interpretationRules,
      );
      setInsights(result);
    } catch (err) {
      console.error("[Ashtakvarga] Interpretation failed:", err);
    }
  }, [analysis, interpretationRules]);

  const loadForProfile = async (profileId: string, profileName: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setChart(null);
    setLoadingMsg("Loading saved chart...");
    setSelectedProfileName(profileName);

    try {
      // Try cached endpoint first — computes on backend if needed
      const res = await fetch(`/api/profiles/${profileId}/chart`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      if (!data.cached) {
        setLoadingMsg("First-time generation — saving for next visit...");
      }
      setFromCache(!!data.cached);
      setChart(data.chartData);

      // Load rules if not yet
      let activeRules = rules;
      if (!activeRules) {
        const rulesRes = await fetch("/api/ashtakvarga/rules");
        activeRules = rulesRes.ok ? await rulesRes.json() : [];
        setRules(activeRules);
      }

      const result = computeAshtakvarga(data.chartData, activeRules || []);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (sel: SelectedSource) => {
    if (sel.kind === "profile") {
      setSelectedProfileId(sel.profile.id);
      setManualMode(false);
      // Pre-fill manual form in case user switches
      setName(sel.profile.name);
      setDate(sel.profile.dateOfBirth);
      setTime(sel.profile.timeOfBirth);
      setPlace(sel.profile.placeOfBirth);
      // Auto-load the chart
      loadForProfile(sel.profile.id, sel.profile.name);
    } else {
      setSelectedProfileId(null);
      setManualMode(true);
      setAnalysis(null);
      setChart(null);
      setName("");
      setDate("");
      setTime("");
      setPlace("");
    }
  };

  // Place autocomplete for manual mode
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

  const handleManualCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    setLoading(true);
    setLoadingMsg("Calculating chart...");
    setError(null);
    setFromCache(false);
    setSelectedProfileName(name || "Manual entry");
    try {
      const result = await calculateChart({ date, time, place });
      setChart(result);

      let activeRules = rules;
      if (!activeRules) {
        const res = await fetch("/api/ashtakvarga/rules");
        activeRules = res.ok ? await res.json() : [];
        setRules(activeRules);
      }

      const analysisResult = computeAshtakvarga(result, activeRules || []);
      setAnalysis(analysisResult);
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
        <p className="text-[10px] text-slate-500 mt-1">
          Based on bindu contribution tables from M.S. Mehta&apos;s <em>Jyotish Ashtakavarga</em>
        </p>
      </header>

      {/* Profile selector — always visible at top */}
      <div className="max-w-2xl mx-auto">
        <ProfileSelector
          accent="amber"
          selectedProfileId={selectedProfileId}
          onSelect={handleProfileSelect}
        />
      </div>

      {/* Manual entry form — only when "Enter manually" is active */}
      {manualMode && !analysis && (
        <form
          onSubmit={handleManualCalculate}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 max-w-2xl mx-auto"
        >
          <h2 className="text-lg font-semibold text-amber-400">Enter Birth Details</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Chart computed on-the-fly. Save as a profile to avoid re-entering next time.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Calculating..." : "Generate Charts"}
          </button>
        </form>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">{loadingMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Charts */}
      {!loading && chart && analysis && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-slate-100 font-semibold">
                {selectedProfileName || "Chart"} &middot; {chart.lagna} Lagna
              </p>
              <p className="text-xs text-slate-500">
                {chart.date} &middot; {chart.time} &middot; {chart.place?.split(",").slice(0, 2).join(",")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {fromCache && (
                <span
                  className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5"
                  title="Loaded from saved chart (no recomputation)"
                >
                  {"\u26A1"} Saved
                </span>
              )}
              {selectedProfileId && (
                <button
                  onClick={async () => {
                    // Force regenerate
                    await fetch(`/api/profiles/${selectedProfileId}/chart`, {
                      method: "DELETE",
                    });
                    loadForProfile(selectedProfileId, selectedProfileName);
                  }}
                  className="text-xs border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                  title="Recalculate from scratch"
                >
                  {"\u21BB"} Refresh
                </button>
              )}
            </div>
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
            <p className="text-[10px] text-slate-500 mt-2">
              Classical maxima: Sun 48 &middot; Moon 49 &middot; Mars 39 &middot; Mercury 54 &middot;
              Jupiter 56 &middot; Venus 52 &middot; Saturn 39 &middot; SAV 337
            </p>
          </div>

          {/* Sarvashtakvarga interpretation panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>{"\u{1F4D6}"}</span>
                Sarvashtakavarga Interpretation
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                House-by-house impacts, 4-pillar analysis, and practical decision rules based on
                classical Sarvashtakavarga thresholds.
              </p>
            </div>
            {insights ? (
              <SarvashtakvargaInterpretation insights={insights} />
            ) : interpRulesError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                Could not load interpretation rules: {interpRulesError}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                Loading interpretation rules...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
