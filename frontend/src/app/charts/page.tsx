"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChartDisplay } from "@/components/ChartDisplay";
import { ChartResponse } from "@/lib/api";

interface SavedChart {
  id: string;
  name: string;
  createdAt: string;
  chartData: ChartResponse;
}

export default function ChartsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [selected, setSelected] = useState<SavedChart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/charts")
      .then(r => r.json())
      .then(data => { setCharts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/charts?id=${id}`, { method: "DELETE" });
    setCharts(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">My Charts</h1>
        <p className="text-slate-500 text-sm mt-1">
          {charts.length} saved {charts.length === 1 ? "chart" : "charts"}
        </p>
      </div>

      {charts.length === 0 ? (
        <div className="text-center py-16 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
          No charts saved yet. Calculate a chart from the home page to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart list */}
          <div className="space-y-2">
            {charts.map(c => (
              <div
                key={c.id}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-colors ${
                  selected?.id === c.id ? "border-amber-500/50" : "border-slate-800 hover:border-slate-700"
                }`}
                onClick={() => setSelected(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-200 text-sm">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    <p className="text-xs text-amber-500 mt-1">
                      Lagna: {c.chartData.lagna}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Chart detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <ChartDisplay chart={selected.chartData} />
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm">
                Select a chart to view
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
