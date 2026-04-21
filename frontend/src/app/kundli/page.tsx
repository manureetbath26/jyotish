"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BirthForm } from "@/components/BirthForm";
import { ChartDisplay } from "@/components/ChartDisplay";
import { calculateChart, saveChart, BirthDataInput, ChartResponse } from "@/lib/api";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

/**
 * My Kundli (logged-in workspace).
 *
 * Default behaviour: loads the active profile's chart automatically.
 * A "New Chart" toggle opens the birth-details form inline for computing
 * a one-off chart without disturbing saved profiles. Replaces the root
 * landing page for logged-in users — text/FAQ content now lives on /help.
 */
export default function MyKundliPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { activeProfile, loading: profileLoading } = useActiveProfile();

  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [chartName, setChartName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"profile" | "new">("profile");

  // Guard: logged-out users belong on the marketing root
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Auto-load active profile's chart
  useEffect(() => {
    if (!activeProfile || chart || mode !== "profile") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setChartName(activeProfile.name);
      try {
        const res = await fetch(`/api/profiles/${activeProfile.id}/chart`);
        if (!res.ok) throw new Error(`Chart cache fetch failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) setChart(data.chartData as ChartResponse);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load chart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProfile, mode, chart]);

  const handleSubmit = async (data: BirthDataInput) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    setChart(null);
    setChartName(data.name || "");
    try {
      const result = await calculateChart(data);
      setChart(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!chart || !session) return;
    try {
      const name = chartName || `${chart.place.split(",")[0]} \u2014 ${chart.date}`;
      await saveChart(name, chart, "");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const switchToNewChart = () => {
    setMode("new");
    setChart(null);
    setChartName("");
    setError(null);
    setSaved(false);
  };

  const switchToProfile = () => {
    setMode("profile");
    setChart(null);
    setChartName(activeProfile?.name ?? "");
    setError(null);
    setSaved(false);
  };

  if (status === "loading" || (profileLoading && !activeProfile)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <span className="text-2xl">{"\u2648\uFE0F"}</span>
            My Kundli
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "profile"
              ? activeProfile
                ? `Showing ${activeProfile.name}'s chart`
                : "Pick a profile from the top bar, or enter a new chart"
              : "Enter birth details for a one-off chart"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "new" ? (
            <button
              onClick={switchToProfile}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              {"\u2190"} Back to my chart
            </button>
          ) : (
            <button
              onClick={switchToNewChart}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg"
            >
              {"\u2795"} New chart
            </button>
          )}
        </div>
      </header>

      {/* No profile + profile mode → prompt */}
      {mode === "profile" && !activeProfile && !loading && (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">
            You don&apos;t have a saved profile yet. Save your kundli once and it&apos;ll load
            automatically every time.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link
              href="/profiles"
              className="text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg"
            >
              {"\u2B50"} Add my kundli
            </Link>
            <button
              onClick={switchToNewChart}
              className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-2 rounded-lg"
            >
              or enter a one-off chart
            </button>
          </div>
        </div>
      )}

      {/* New-chart form mode */}
      {mode === "new" && !chart && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BirthForm onSubmit={handleSubmit} loading={loading} />
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 mt-3">
                {error}
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-center h-64 border border-dashed border-slate-800 rounded-2xl text-slate-600">
              Enter birth details to generate a one-off chart
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Calculating planetary positions{"\u2026"}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chart && !loading && (
        <>
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400">
              Chart saved successfully!
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}
          <ChartDisplay chart={chart} onSave={session ? handleSave : undefined} />
        </>
      )}
    </div>
  );
}
