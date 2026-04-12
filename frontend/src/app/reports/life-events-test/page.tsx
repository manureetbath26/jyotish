"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { calculateChart, ChartResponse, fetchLifetimeTransits } from "@/lib/api";
import {
  generateLifeEventsReport,
  LifeEventsReport,
  LifeHighlight,
  EventCategory,
  MaritalStatus,
} from "@/lib/lifeEventsReport";

async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

export default function LifeEventsTestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LifeEventsTestContent />
    </Suspense>
  );
}

/* ── Helper badges ──────────────────────────────────────────────────────── */

function OutlookBadge({ outlook }: { outlook: string }) {
  const color =
    outlook.includes("favorable") ? "bg-green-500/10 text-green-400 border-green-500/20"
    : outlook === "mixed" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
      {outlook.replace(/_/g, " ")}
    </span>
  );
}

function LikelihoodBadge({ likelihood }: { likelihood: string }) {
  const color =
    likelihood === "very_likely" ? "bg-green-500/10 text-green-400"
    : likelihood === "likely" ? "bg-amber-500/10 text-amber-400"
    : "bg-slate-700/50 text-slate-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {likelihood.replace(/_/g, " ")}
    </span>
  );
}

/* ── Main content ───────────────────────────────────────────────────────── */

function LifeEventsTestContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Birth form
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("single");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  // Chart & report
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [report, setReport] = useState<LifeEventsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin gate
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.replace("/reports");
    }
  }, [status, isAdmin, router]);

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

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    setLoading(true);
    setError(null);
    try {
      const result = await calculateChart({ date, time, place });
      setChart(result);
      const birthYear = parseInt(date.split("-")[0], 10);
      const birthMonth = parseInt(date.split("-")[1], 10);
      let transitSnapshots;
      try {
        const transitData = await fetchLifetimeTransits(
          result.ayanamsha_value,
          result.lagna_degree,
          birthYear,
          birthMonth,
        );
        transitSnapshots = transitData.snapshots;
      } catch {
        // Transit data is optional
      }
      const rpt = generateLifeEventsReport(result, transitSnapshots, maritalStatus);
      setReport(rpt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chart calculation failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return null;
  if (!isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Life Events Predictions (Test)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Admin-only testing area for the life events prediction engine.
        </p>
      </div>

      {/* Birth details form */}
      {!report && (
        <form onSubmit={handleCalculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date of Birth *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Time of Birth *</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-1">Place of Birth *</label>
            <input
              type="text"
              value={place}
              onChange={e => { setPlace(e.target.value); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., Mumbai, India"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => { selectedRef.current = true; setPlace(s); setShowSuggestions(false); }}
                    className="px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Marital Status</label>
            <select
              value={maritalStatus}
              onChange={e => setMaritalStatus(e.target.value as MaritalStatus)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !date || !time || !place}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Calculating..." : "Generate Predictions"}
          </button>
        </form>
      )}

      {/* Results */}
      {report && chart && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {name ? `${name} \u00b7 ` : ""}{chart.lagna} Lagna \u00b7 {chart.place.split(",")[0]} \u00b7 {chart.date}
            </p>
            <button
              onClick={() => { setReport(null); setChart(null); }}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              {"\u2190"} New Chart
            </button>
          </div>

          {/* Past highlights */}
          {report.pastHighlights.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-amber-400">Past Life Events</h2>
              <p className="text-xs text-slate-500">
                Events your chart indicated for past periods. Reflect on how these may have manifested.
              </p>
              <div className="space-y-3">
                {report.pastHighlights.map((h: LifeHighlight, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg p-4 border ${
                      h.type === "positive" ? "bg-green-500/5 border-green-500/10"
                      : h.type === "negative" ? "bg-red-500/5 border-red-500/10"
                      : "bg-amber-500/5 border-amber-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-200">{h.event}</span>
                      <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">Past</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                      <span>{h.window}</span>
                      <span className="text-slate-700">|</span>
                      <span>{h.dashaContext}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{h.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming highlights grouped by category */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400">Upcoming Life Event Predictions</h2>
            <p className="text-xs text-slate-500">
              The most significant events indicated by your chart, grouped by life area.
            </p>
            <div className="space-y-6">
              {(() => {
                const grouped = new Map<string, LifeHighlight[]>();
                for (const h of report.upcomingHighlights) {
                  const list = grouped.get(h.category) || [];
                  list.push(h);
                  grouped.set(h.category, list);
                }
                const catOrder = report.eventCategories.map((c: EventCategory) => c.id);
                const sortedCategories = [...grouped.entries()].sort((a, b) => {
                  const ai = catOrder.indexOf(a[0]);
                  const bi = catOrder.indexOf(b[0]);
                  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                });

                return sortedCategories.map(([catId, highlights]) => {
                  const catMeta = report.eventCategories.find((c: EventCategory) => c.id === catId);
                  const icon = catMeta?.icon || "\uD83D\uDD2E";
                  const catName = catMeta?.name || catId.replace(/_/g, " ");
                  const catType = catMeta?.type || highlights[0]?.type || "neutral";

                  const sorted = [...highlights].sort((a, b) =>
                    a.startDateRaw.localeCompare(b.startDateRaw)
                  );

                  const borderClass = catType === "positive"
                    ? "border-green-500/20"
                    : catType === "negative"
                    ? "border-red-500/20"
                    : "border-amber-500/20";

                  return (
                    <div key={catId} className={`border rounded-xl overflow-hidden ${borderClass}`}>
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        catType === "positive" ? "bg-green-500/5"
                        : catType === "negative" ? "bg-red-500/5"
                        : "bg-amber-500/5"
                      }`}>
                        <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          {catName}
                          <span className="text-xs text-slate-500 font-normal">
                            ({sorted.length} prediction{sorted.length !== 1 ? "s" : ""})
                          </span>
                        </span>
                        {catMeta && <OutlookBadge outlook={catMeta.overallOutlook} />}
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {sorted.map((h: LifeHighlight, i: number) => (
                          <div key={i} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-300">{h.event}</span>
                              <LikelihoodBadge likelihood={h.likelihood} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                              <span>{h.window}</span>
                              <span className="text-slate-700">|</span>
                              <span>{h.dashaContext}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{h.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
