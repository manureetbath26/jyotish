"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ChartResponse } from "@/lib/api";
import {
  computeAshtakvarga,
  type AshtakvargaAnalysis,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import { AshtakvargaCharts } from "@/components/AshtakvargaCharts";
import { SarvashtakvargaInterpretation } from "@/components/SarvashtakvargaInterpretation";
import {
  interpretSarvashtakvarga,
  type InterpretationRules,
  type SarvashtakvargaInsights,
} from "@/lib/sarvashtakvargaInterpreter";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

export default function AshtakvargaPage() {
  const { status } = useSession();
  const { activeProfile, loading: profilesLoading, profiles } = useActiveProfile();

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
  const [interpRulesError, setInterpRulesError] = useState<string | null>(null);

  // Pre-fetch bindu rules on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ashtakvarga/rules")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setRules(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Pre-fetch interpretation rules
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ashtakvarga/interpretation-rules")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || !Array.isArray(data.house) || data.house.length === 0) {
          setInterpRulesError(
            "Interpretation rules returned empty. Run: npx tsx scripts/seed-sarvashtakvarga-rules.ts",
          );
          return;
        }
        setInterpretationRules(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setInterpRulesError(
            err instanceof Error ? err.message : "Failed to load interpretation rules",
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Load chart whenever the active profile changes
  useEffect(() => {
    let cancelled = false;

    if (!activeProfile) {
      setChart(null);
      setAnalysis(null);
      setInsights(null);
      return;
    }

    async function run() {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setChart(null);
      setLoadingMsg("Loading saved chart...");

      try {
        const profileId = activeProfile!.id;
        const res = await fetch(`/api/profiles/${profileId}/chart`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;

        if (!data.cached) setLoadingMsg("First-time generation — saving for next visit...");
        setFromCache(!!data.cached);
        setChart(data.chartData);

        // Ensure rules
        let activeRules = rules;
        if (!activeRules) {
          const rulesRes = await fetch("/api/ashtakvarga/rules");
          activeRules = rulesRes.ok ? await rulesRes.json() : [];
          setRules(activeRules);
        }

        const result = computeAshtakvarga(data.chartData, activeRules || []);
        if (!cancelled) setAnalysis(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chart");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  // Compute interpretation when analysis + rules ready
  useEffect(() => {
    if (!analysis || !interpretationRules) {
      setInsights(null);
      return;
    }
    try {
      setInsights(
        interpretSarvashtakvarga(
          analysis.sarvashtakvarga.signTotals,
          analysis.lagnaSign,
          interpretationRules,
        ),
      );
    } catch (err) {
      console.error("[Ashtakvarga] Interpretation failed:", err);
    }
  }, [analysis, interpretationRules]);

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

      {/* Signed-out state */}
      {status === "unauthenticated" && (
        <div className="max-w-xl mx-auto bg-slate-800/40 border border-slate-800 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-300">Sign in to view Ashtakvarga charts for your saved profiles.</p>
          <Link
            href="/auth/signin"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Signed-in but no profiles */}
      {status === "authenticated" && !profilesLoading && profiles.length === 0 && (
        <div className="max-w-xl mx-auto bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-amber-300">You haven&apos;t saved a profile yet</p>
          <p className="text-xs text-slate-400">
            Save your own kundli once, then get Ashtakvarga, charts and reports instantly on every visit.
          </p>
          <Link
            href="/profiles"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Add my kundli
          </Link>
        </div>
      )}

      {/* Loading */}
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
      {!loading && chart && analysis && activeProfile && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-slate-100 font-semibold">
                {activeProfile.name} &middot; {chart.lagna} Lagna
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
              <button
                onClick={async () => {
                  await fetch(`/api/profiles/${activeProfile.id}/chart`, {
                    method: "DELETE",
                  });
                  // Trigger reload
                  window.location.reload();
                }}
                className="text-xs border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                title="Recalculate from scratch"
              >
                {"\u21BB"} Refresh
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <AshtakvargaCharts analysis={analysis} />
          </div>

          {/* BAV totals */}
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

          {/* Interpretation */}
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
