"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChartResponse, BirthDataInput, calculateChart } from "@/lib/api";
import { calculateCompatibility, type CompatibilityResult } from "@/lib/compatibilityEngine";
import jsPDF from "jspdf";

interface Props {
  /** The primary chart (the user's own chart currently displayed). Optional for standalone page. */
  chart?: ChartResponse;
}

interface SavedChart {
  id: string;
  name: string;
  chartData: ChartResponse;
}

type InputMode = "saved" | "manual";

const RELATIONSHIPS = [
  { id: "romantic", label: "Romantic Partner / Spouse", icon: "💕" },
  { id: "friend", label: "Friend", icon: "🤝" },
  { id: "parent", label: "Parent", icon: "👪" },
  { id: "child", label: "Child", icon: "👶" },
  { id: "sibling", label: "Sibling", icon: "👫" },
  { id: "business", label: "Business Partner", icon: "💼" },
  { id: "other", label: "Other", icon: "🔗" },
];

// Simple place autocomplete (same as BirthForm)
async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

function ScoreBar({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-10 text-right">{score}/{max}</span>
    </div>
  );
}

export function CompatibilityTab({ chart: chartProp }: Props) {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // "Your chart" selection — if chartProp not provided, user selects or enters own chart
  const [ownMode, setOwnMode] = useState<InputMode>(chartProp ? "saved" : "saved");
  const [ownSavedChartId, setOwnSavedChartId] = useState("");
  const [ownName, setOwnName] = useState("");
  const [ownDate, setOwnDate] = useState("");
  const [ownTime, setOwnTime] = useState("");
  const [ownPlace, setOwnPlace] = useState("");
  const [ownChart, setOwnChart] = useState<ChartResponse | null>(chartProp ?? null);

  // Resolved primary chart (from prop or user selection)
  const chart = chartProp ?? ownChart;

  // Person entries (can add more than 1)
  const [entries, setEntries] = useState<{
    id: number;
    mode: InputMode;
    savedChartId: string;
    name: string;
    date: string;
    time: string;
    place: string;
    relationship: string;
    chart: ChartResponse | null;
  }[]>([
    { id: 1, mode: "manual", savedChartId: "", name: "", date: "", time: "", place: "", relationship: "romantic", chart: null },
  ]);

  const [results, setResults] = useState<CompatibilityResult[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Place suggestions per entry (entryId = -1 means own chart)
  const [activeSuggestions, setActiveSuggestions] = useState<{ entryId: number; suggestions: string[] } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOwnPlaceInput = (value: string) => {
    setOwnPlace(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      if (results.length > 0) setActiveSuggestions({ entryId: -1, suggestions: results });
      else setActiveSuggestions(null);
    }, 350);
  };

  // Fetch saved charts
  useEffect(() => {
    setLoadingCharts(true);
    fetch("/api/charts")
      .then(r => r.ok ? r.json() : [])
      .then((data: SavedChart[]) => setSavedCharts(data))
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  }, []);

  const updateEntry = (id: number, updates: Partial<(typeof entries)[0]>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addEntry = () => {
    const nextId = Math.max(...entries.map(e => e.id), 0) + 1;
    setEntries(prev => [...prev, {
      id: nextId, mode: "manual", savedChartId: "", name: "", date: "", time: "", place: "", relationship: "friend", chart: null,
    }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handlePlaceInput = (entryId: number, value: string) => {
    updateEntry(entryId, { place: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      if (results.length > 0) setActiveSuggestions({ entryId, suggestions: results });
      else setActiveSuggestions(null);
    }, 350);
  };

  const downloadPdf = useCallback((result: CompatibilityResult) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxW = W - margin * 2;
    let y = 20;

    const colors = {
      bg: [15, 23, 42] as [number, number, number],
      text: [226, 232, 240] as [number, number, number],
      amber: [245, 158, 11] as [number, number, number],
      gray: [148, 163, 184] as [number, number, number],
      green: [74, 222, 128] as [number, number, number],
      red: [248, 113, 113] as [number, number, number],
    };

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (needed: number) => { if (y + needed > 275) addPage(); };

    const bodyText = (text: string) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.gray);
      const lines = doc.splitTextToSize(text, maxW - 4);
      for (const line of lines) {
        checkPage(4);
        doc.text(line, margin + 2, y);
        y += 3.5;
      }
    };

    // Background
    doc.setFillColor(...colors.bg);
    doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text("Compatibility Report", margin, y);
    y += 8;

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    const relLabel = RELATIONSHIPS.find(r => r.id === result.relationship)?.label ?? result.relationship;
    doc.text(`${result.person1.name} & ${result.person2.name}  (${relLabel})`, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text(
      `${result.person1.lagna} Lagna · ${result.person1.moonRashi} Moon  ↔  ${result.person2.lagna} Lagna · ${result.person2.moonRashi} Moon`,
      margin, y,
    );
    y += 8;

    // Score & Verdict
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text(`${result.totalScore} / ${result.maxScore}  (${result.percentage}%)`, margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(result.verdict, margin, y);
    y += 8;

    // Divider
    doc.setDrawColor(100, 116, 139);
    doc.line(margin, y, W - margin, y);
    y += 6;

    // Score Breakdown
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text(`${result.relationship === "sibling" ? "Sibling Compatibility" : "Ashtakoot"} Score Breakdown`, margin, y);
    y += 6;

    for (const k of result.koots) {
      checkPage(14);
      const pct = k.maxPoints > 0 ? k.score / k.maxPoints : 0;
      const barColor = pct >= 0.7 ? colors.green : pct >= 0.3 ? colors.amber : colors.red;
      const strength = pct >= 0.7 ? "Strong" : pct >= 0.3 ? "Moderate" : "Weak";

      // Label + score
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.text);
      doc.text(k.name, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.gray);
      doc.text(`${k.score}/${k.maxPoints} — ${strength}`, margin + 45, y);
      y += 3.5;

      // Bar background
      const barX = margin;
      const barW = maxW;
      const barH = 2.5;
      doc.setFillColor(51, 65, 85);
      doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
      // Bar fill
      doc.setFillColor(...barColor);
      const fillW = Math.max(2, barW * pct);
      doc.roundedRect(barX, y, fillW, barH, 1, 1, "F");
      y += 4.5;

      // Description
      bodyText(k.description);
      y += 2;
    }

    // Synastry
    if (result.synastry.length > 0) {
      y += 3;
      checkPage(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.amber);
      doc.text("Planetary Synastry", margin, y);
      y += 6;

      for (const s of result.synastry) {
        checkPage(14);
        const sColor = s.nature === "harmonious" ? colors.green : s.nature === "challenging" ? colors.red : colors.gray;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...sColor);
        doc.text(`${s.planet1} ↔ ${s.planet2}`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.gray);
        doc.text(`(${s.aspect} — ${s.nature})`, margin + 55, y);
        y += 4;
        bodyText(s.description);
        y += 2;
      }
    }

    // Summary
    y += 3;
    checkPage(15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text("Summary", margin, y);
    y += 5;
    bodyText(result.summary);

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Background for added pages
      if (i > 1) {
        doc.setFillColor(...colors.bg);
        doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
      }
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Generated by Jyotish — Vedic Astrology", margin, 290);
      doc.text(`Page ${i} of ${totalPages}`, W - margin - 20, 290);
    }

    const safeName = `${result.person1.name}_${result.person2.name}`.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Compatibility_${safeName}.pdf`);
  }, []);

  const handleCalculate = async () => {
    setError(null);
    setResults([]);
    setCalculating(true);

    try {
      // Resolve own chart if not provided via prop
      let primaryChart = chart;
      let primaryName = "You";
      if (!chartProp) {
        if (ownMode === "saved") {
          const saved = savedCharts.find(c => c.id === ownSavedChartId);
          if (!saved) throw new Error("Please select your own chart first.");
          primaryChart = saved.chartData as ChartResponse;
          primaryName = saved.name || "You";
          setOwnChart(primaryChart);
        } else {
          if (!ownDate || !ownTime || !ownPlace) throw new Error("Please fill in your own birth details.");
          primaryChart = await calculateChart({ date: ownDate, time: ownTime, place: ownPlace });
          primaryName = ownName || "You";
          setOwnChart(primaryChart);
        }
      }
      if (!primaryChart) throw new Error("No primary chart available.");

      const resolvedEntries: { name: string; chart: ChartResponse; relationship: string }[] = [];

      for (const entry of entries) {
        if (entry.mode === "saved") {
          const saved = savedCharts.find(c => c.id === entry.savedChartId);
          if (!saved) throw new Error(`Please select a saved chart for "${entry.name || "Person"}"`);
          resolvedEntries.push({
            name: saved.name,
            chart: saved.chartData as ChartResponse,
            relationship: entry.relationship,
          });
        } else {
          if (!entry.date || !entry.time || !entry.place) {
            throw new Error(`Please fill in all birth details for "${entry.name || "Person"}"`);
          }
          const calcChart = await calculateChart({
            date: entry.date,
            time: entry.time,
            place: entry.place,
          });
          resolvedEntries.push({
            name: entry.name || `Person ${entry.id + 1}`,
            chart: calcChart,
            relationship: entry.relationship,
          });
        }
      }

      // Compare each person against the primary chart
      const allResults: CompatibilityResult[] = [];
      for (const re of resolvedEntries) {
        const result = calculateCompatibility(primaryChart, re.chart, primaryName, re.name, re.relationship);
        allResults.push(result);
      }

      setResults(allResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400">Compatibility Analysis</h3>
        <p className="text-xs text-slate-500 mt-1">
          {chart
            ? <>Compare your chart ({chart.lagna} Lagna · {chart.place.split(",")[0]}) against friends, family, or partners using <strong className="text-slate-400">Ashtakoot Guna Milan</strong> and planetary synastry. Sibling analysis includes dedicated 3rd/11th house and Mars karaka scoring.</>
            : <>Select or enter your chart, then add people to compare using <strong className="text-slate-400">Ashtakoot Guna Milan</strong> and planetary synastry. Sibling analysis includes dedicated 3rd/11th house and Mars karaka scoring.</>
          }
        </p>
      </div>

      {/* Your Chart section (only shown when no chart prop) */}
      {!chartProp && (
        <div className="border border-amber-500/30 rounded-xl p-4 space-y-3 bg-amber-500/5">
          <p className="text-sm font-semibold text-amber-400">Your Chart</p>

          {/* Input mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700 w-fit">
            {(["saved", "manual"] as InputMode[]).map(m => (
              <button
                key={m}
                onClick={() => setOwnMode(m)}
                className={`px-3 py-1 text-xs transition-colors ${
                  ownMode === m
                    ? "bg-amber-500 text-black font-medium"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "saved" ? "From My Charts" : "Enter Details"}
              </button>
            ))}
          </div>

          {ownMode === "saved" ? (
            <div>
              <select
                value={ownSavedChartId}
                onChange={e => {
                  setOwnSavedChartId(e.target.value);
                  const sc = savedCharts.find(c => c.id === e.target.value);
                  if (sc) { setOwnChart(sc.chartData as ChartResponse); setOwnName(sc.name); }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">— Select your chart —</option>
                {savedCharts.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} ({(sc.chartData as ChartResponse).lagna} Lagna)
                  </option>
                ))}
              </select>
              {loadingCharts && <p className="text-xs text-slate-500 mt-1">Loading saved charts...</p>}
              {!loadingCharts && savedCharts.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No saved charts. Switch to &quot;Enter Details&quot; to enter your birth info.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={ownName}
                  onChange={e => setOwnName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={ownDate}
                  onChange={e => setOwnDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Time of Birth</label>
                <input
                  type="time"
                  value={ownTime}
                  onChange={e => setOwnTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="relative">
                <label className="text-xs text-slate-500 block mb-1">Place of Birth</label>
                <input
                  type="text"
                  value={ownPlace}
                  onChange={e => handleOwnPlaceInput(e.target.value)}
                  onFocus={() => { if (activeSuggestions?.entryId !== -1) setActiveSuggestions(null); }}
                  placeholder="e.g. Mumbai, India"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {activeSuggestions?.entryId === -1 && activeSuggestions.suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {activeSuggestions.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setOwnPlace(s);
                          setActiveSuggestions(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show resolved own chart info */}
          {ownChart && (
            <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
              ✓ {ownChart.lagna} Lagna · {ownChart.place.split(",")[0]} · {ownChart.date}
            </div>
          )}
        </div>
      )}

      {/* Entry forms */}
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">
                Person {idx + 1}
              </p>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Input mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700 w-fit">
              {(["saved", "manual"] as InputMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => updateEntry(entry.id, { mode: m })}
                  className={`px-3 py-1 text-xs transition-colors ${
                    entry.mode === m
                      ? "bg-amber-500 text-black font-medium"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "saved" ? "From My Charts" : "Enter Details"}
                </button>
              ))}
            </div>

            {entry.mode === "saved" ? (
              <div>
                <select
                  value={entry.savedChartId}
                  onChange={e => updateEntry(entry.id, { savedChartId: e.target.value, name: savedCharts.find(c => c.id === e.target.value)?.name || "" })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">— Select a saved chart —</option>
                  {savedCharts.map(sc => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({(sc.chartData as ChartResponse).lagna} Lagna)
                    </option>
                  ))}
                </select>
                {loadingCharts && <p className="text-xs text-slate-500 mt-1">Loading saved charts...</p>}
                {!loadingCharts && savedCharts.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No saved charts. Switch to &quot;Enter Details&quot; or save some charts first.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Name</label>
                  <input
                    type="text"
                    value={entry.name}
                    onChange={e => updateEntry(entry.id, { name: e.target.value })}
                    placeholder="e.g. Priya"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={e => updateEntry(entry.id, { date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Time of Birth</label>
                  <input
                    type="time"
                    value={entry.time}
                    onChange={e => updateEntry(entry.id, { time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="relative">
                  <label className="text-xs text-slate-500 block mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={entry.place}
                    onChange={e => handlePlaceInput(entry.id, e.target.value)}
                    onFocus={() => { if (activeSuggestions?.entryId !== entry.id) setActiveSuggestions(null); }}
                    placeholder="e.g. Mumbai, India"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {activeSuggestions?.entryId === entry.id && activeSuggestions.suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {activeSuggestions.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            updateEntry(entry.id, { place: s });
                            setActiveSuggestions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Relationship selector */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Relationship to You</label>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIPS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => updateEntry(entry.id, { relationship: r.id })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      entry.relationship === r.id
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400 font-medium"
                        : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                    }`}
                  >
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add person + Calculate */}
      <div className="flex items-center gap-3">
        <button
          onClick={addEntry}
          className="text-xs text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-500/30 rounded-lg px-3 py-1.5 transition-colors"
        >
          + Add Another Person
        </button>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {calculating ? "Calculating..." : "Calculate Compatibility"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Results */}
      {results.map((result, idx) => (
        <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden">
          {/* Result header */}
          <div className="px-5 py-4 bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                You & {result.person2.name}
                <span className="text-xs text-slate-500 ml-2">
                  ({RELATIONSHIPS.find(r => r.id === result.relationship)?.label ?? result.relationship})
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {result.person1.lagna} Lagna · {result.person1.moonRashi} Moon
                {" ↔ "}
                {result.person2.lagna} Lagna · {result.person2.moonRashi} Moon
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${result.verdictColor}`}>
                {result.totalScore}<span className="text-base text-slate-500">/{result.maxScore}</span>
              </p>
              <p className={`text-xs font-semibold ${result.verdictColor}`}>{result.verdict}</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Score breakdown */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                {result.relationship === "sibling" ? "Sibling Compatibility" : "Ashtakoot"} Score Breakdown ({result.percentage}%)
              </p>
              <div className="space-y-2.5">
                {result.koots.map(k => (
                  <ScoreBar key={k.name} score={k.score} max={k.maxPoints} label={k.name} />
                ))}
              </div>
            </div>

            {/* Koot details — collapsible */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Detailed Analysis
              </p>
              {result.koots.map(k => (
                <div
                  key={k.name}
                  className={`rounded-lg border p-3 ${
                    k.score >= k.maxPoints * 0.7
                      ? "border-green-900/40 bg-green-950/20"
                      : k.score >= k.maxPoints * 0.3
                      ? "border-amber-900/30 bg-amber-950/10"
                      : "border-red-900/30 bg-red-950/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      {k.name} <span className="text-slate-500">({k.score}/{k.maxPoints})</span>
                    </span>
                    <span className={`text-xs font-semibold ${
                      k.score >= k.maxPoints * 0.7 ? "text-green-400" :
                      k.score >= k.maxPoints * 0.3 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {k.score >= k.maxPoints * 0.7 ? "Strong" :
                       k.score >= k.maxPoints * 0.3 ? "Moderate" : "Weak"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{k.description}</p>
                </div>
              ))}
            </div>

            {/* Synastry */}
            {result.synastry.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Planetary Synastry
                </p>
                {result.synastry.map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      s.nature === "harmonious" ? "border-green-900/40 bg-green-950/20" :
                      s.nature === "challenging" ? "border-red-900/30 bg-red-950/10" :
                      "border-slate-800 bg-slate-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        s.nature === "harmonious" ? "bg-green-400" :
                        s.nature === "challenging" ? "bg-red-400" : "bg-slate-400"
                      }`} />
                      <span className="text-xs font-semibold text-slate-200">
                        {s.planet1} ↔ {s.planet2}
                      </span>
                      <span className="text-xs text-slate-500">{s.aspect}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-400 mb-1">Summary</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => downloadPdf(result)}
                className="flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                </svg>
                Save PDF
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium px-4 py-2 rounded-lg transition-colors print:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
