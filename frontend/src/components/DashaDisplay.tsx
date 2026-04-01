"use client";
import { useState } from "react";
import { DashaEntry, AntardhashaEntry } from "@/lib/api";

interface Props {
  currentDasha: DashaEntry;
  currentAntardasha: AntardhashaEntry;
  dashaSequence: DashaEntry[];
}

const PLANET_COLORS: Record<string, string> = {
  Sun:     "text-amber-400",
  Moon:    "text-blue-300",
  Mars:    "text-red-400",
  Mercury: "text-emerald-400",
  Jupiter: "text-yellow-400",
  Venus:   "text-pink-400",
  Saturn:  "text-slate-400",
  Rahu:    "text-purple-400",
  Ketu:    "text-orange-400",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export function DashaDisplay({ currentDasha, currentAntardasha, dashaSequence }: Props) {
  const [expanded, setExpanded] = useState<string | null>(currentDasha.planet);

  return (
    <div className="space-y-4">
      {/* Current dasha/antardasha banner */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Mahadasha</p>
          <p className={`text-xl font-bold ${PLANET_COLORS[currentDasha.planet] ?? "text-white"}`}>
            {currentDasha.planet}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatDate(currentDasha.start_date)} → {formatDate(currentDasha.end_date)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Antardasha</p>
          <p className={`text-xl font-bold ${PLANET_COLORS[currentAntardasha.planet] ?? "text-white"}`}>
            {currentAntardasha.planet}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatDate(currentAntardasha.start_date)} → {formatDate(currentAntardasha.end_date)}
          </p>
        </div>
      </div>

      {/* Full sequence */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Vimshottari Sequence (120 years)</p>
        {dashaSequence.map(dasha => {
          const isActive = dasha.planet === currentDasha.planet &&
                           dasha.start_date === currentDasha.start_date;
          const isExpanded = expanded === dasha.start_date;

          return (
            <div key={dasha.start_date} className={`rounded-lg border ${isActive ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-900"}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                onClick={() => setExpanded(isExpanded ? null : dasha.start_date)}
              >
                <div className="flex items-center gap-3">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  <span className={`font-semibold ${PLANET_COLORS[dasha.planet] ?? "text-slate-200"}`}>
                    {dasha.planet}
                  </span>
                  <span className="text-xs text-slate-500">{dasha.years.toFixed(1)}y</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    {formatDate(dasha.start_date)} – {formatDate(dasha.end_date)}
                  </span>
                  <span className="text-slate-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && dasha.antardashas && (
                <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                  {dasha.antardashas.map(ad => {
                    const isActiveAD = isActive && ad.planet === currentAntardasha.planet &&
                                       ad.start_date === currentAntardasha.start_date;
                    return (
                      <div
                        key={ad.start_date}
                        className={`flex items-center justify-between px-6 py-1.5 ${isActiveAD ? "bg-amber-500/10" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {isActiveAD && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                          <span className={`text-sm ${PLANET_COLORS[ad.planet] ?? "text-slate-300"}`}>
                            {ad.planet}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDate(ad.start_date)} – {formatDate(ad.end_date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
