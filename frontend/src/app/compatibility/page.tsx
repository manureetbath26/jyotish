"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompatibilityTab } from "@/components/CompatibilityTab";
import { PremiumLock } from "@/components/PremiumLock";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import type { ChartResponse } from "@/lib/api";

export default function CompatibilityPage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile } = useActiveProfile();

  const [primaryChart, setPrimaryChart] = useState<ChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Auto-load active profile's chart so "your chart" is always pre-filled
  useEffect(() => {
    let cancelled = false;
    if (!activeProfile) {
      setPrimaryChart(null);
      return;
    }
    setChartLoading(true);
    fetch(`/api/profiles/${activeProfile.id}/chart`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPrimaryChart(data.chartData as ChartResponse);
      })
      .catch(() => {})
      .finally(() => !cancelled && setChartLoading(false));
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Compatibility</h1>
        <p className="text-slate-500 text-sm mt-1">
          Friends, Partners &amp; Family Compatibility Analysis
        </p>
      </div>

      {activeProfile && primaryChart && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
          <span className="text-sm">{"\u26A1"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300">
              <span className="font-semibold">Your chart pre-loaded:</span> {activeProfile.name}{" "}
              <span className="text-slate-500">
                ({primaryChart.lagna} Lagna &middot; {activeProfile.dateOfBirth})
              </span>
            </p>
          </div>
        </div>
      )}

      {chartLoading && (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          Loading your chart...
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <PremiumLock>
          <CompatibilityTab chart={primaryChart || undefined} />
        </PremiumLock>
      </div>
    </div>
  );
}
