"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChartDisplay } from "@/components/ChartDisplay";
import { ChartResponse } from "@/lib/api";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

export default function ChartsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile, profiles, loading: profilesLoading } = useActiveProfile();

  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Load the active profile's chart (uses the cached chart endpoint)
  useEffect(() => {
    let cancelled = false;
    if (!activeProfile) {
      setChart(null);
      return;
    }
    setLoading(true);
    setError(null);
    setChart(null);
    fetch(`/api/profiles/${activeProfile.id}/chart`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setChart(data.chartData as ChartResponse);
        setFromCache(!!data.cached);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [activeProfile?.id]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">My Kundli</h1>
        <p className="text-slate-500 text-sm mt-1">
          {activeProfile
            ? `Viewing chart for ${activeProfile.name}`
            : "Select or add a profile to view a kundli"}
        </p>
      </div>

      {/* No profiles yet */}
      {!profilesLoading && profiles.length === 0 && (
        <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-amber-300">You haven&apos;t saved a profile yet</p>
          <p className="text-xs text-slate-400">
            Save your own kundli once, then view it here instantly on every visit.
          </p>
          <Link
            href="/profiles"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Add my kundli
          </Link>
        </div>
      )}

      {/* Has profiles but none active */}
      {!profilesLoading && profiles.length > 0 && !activeProfile && (
        <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-400">
            Pick a profile from the tab strip above to view its kundli.
          </p>
        </div>
      )}

      {/* Profile header */}
      {activeProfile && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              {activeProfile.isOwn && <span className="text-amber-400">{"\u2B50"}</span>}
              <p className="text-sm font-semibold text-slate-100">{activeProfile.name}</p>
              {activeProfile.relationship && activeProfile.relationship !== "self" && (
                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded-full px-1.5 py-0.5 capitalize">
                  {activeProfile.relationship}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeProfile.dateOfBirth} &middot; {activeProfile.timeOfBirth} &middot;{" "}
              {activeProfile.placeOfBirth.split(",").slice(0, 2).join(",")}
              {chart && (
                <> &middot; <span className="text-amber-400">{chart.lagna} Lagna</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fromCache && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">
                {"\u26A1"} Saved
              </span>
            )}
            <button
              onClick={async () => {
                if (!activeProfile) return;
                await fetch(`/api/profiles/${activeProfile.id}/chart`, {
                  method: "DELETE",
                });
                window.location.reload();
              }}
              className="text-xs border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-lg transition-colors"
              title="Recalculate chart"
            >
              {"\u21BB"} Refresh
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading chart...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Full chart */}
      {!loading && chart && <ChartDisplay chart={chart} />}
    </div>
  );
}
