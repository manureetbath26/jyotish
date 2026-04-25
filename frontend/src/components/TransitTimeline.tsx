"use client";

import React from "react";

/**
 * Transit Timeline — ingress-event view.
 *
 * Shape rewritten Apr 2026: replaces the old favorability-period cards
 * with a chronological list of sign-change (ingress) events for the
 * tracked planets, framed for one life area.
 */

export interface IngressEvent {
  date: string;
  planet: string;
  from_sign: string;
  to_sign: string;
  from_house: number;
  to_house: number;
  is_retrograde: boolean;
  duration_days: number;
  next_ingress_date: string | null;
  classification: "favorable" | "unfavorable" | "neutral";
  /** Composed interpretation: house theme + planet vibe + area-specific lens.
   *  House-aware — H6 vs H7 read different. */
  interpretation: string;
  life_area: string;
  /** True for the "currently here" card — planet's most recent ingress
   *  prior to start_date, so the user sees what's active right now. */
  is_current?: boolean;
}

interface TransitTimelineProps {
  lifeArea: string;
  events: IngressEvent[];
}

const AREA_LABELS: Record<string, string> = {
  love_life: "💕 Love Life",
  health: "🏥 Health",
  career: "💼 Career",
  finances: "💰 Finances",
  family: "👨‍👩‍👧‍👦 Family",
  self_confidence: "🦁 Self / Confidence",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `~${Math.round(days / 7)} weeks`;
  return `~${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? "" : "s"}`;
}

function classificationStyles(c: IngressEvent["classification"]) {
  if (c === "favorable") {
    return {
      bg: "bg-green-900/20 border-green-800/50",
      dot: "bg-green-400",
      label: "text-green-400",
      labelText: "FAVORABLE",
    };
  }
  if (c === "unfavorable") {
    return {
      bg: "bg-red-900/20 border-red-800/50",
      dot: "bg-red-400",
      label: "text-red-400",
      labelText: "CHALLENGING",
    };
  }
  return {
    bg: "bg-slate-800/40 border-slate-700/50",
    dot: "bg-slate-400",
    label: "text-slate-400",
    labelText: "NEUTRAL",
  };
}

export function TransitTimeline({ lifeArea, events }: TransitTimelineProps) {
  const label = AREA_LABELS[lifeArea] ?? lifeArea;

  return (
    <div>
      <h3 className="text-lg font-semibold text-amber-400 mb-1">{label}</h3>
      <p className="text-xs text-slate-500 mb-4">
        Each card is a transit ingress — when a tracked planet moves into a new
        sign / house. Mars and the four slow planets (Jupiter, Saturn, Rahu, Ketu)
        are tracked.
      </p>

      {events.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-800/30 border border-slate-800 rounded-lg p-4">
          No ingress events for this area in the selected window. The slow planets
          can take years to move signs — try widening the start date or another area.
        </div>
      ) : (
        <ol className="space-y-3">
          {events.map((e, i) => {
            const styles = classificationStyles(e.classification);
            const isCurrent = e.is_current === true;

            return (
              <li
                key={`${e.planet}-${e.date}-${i}`}
                className={`rounded-lg border p-3.5 ${styles.bg} ${
                  isCurrent ? "ring-1 ring-amber-500/40" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">
                        {e.planet}
                        {e.is_retrograde ? " ᴿ" : ""}
                      </span>
                      <span className="text-xs text-slate-400">
                        {e.from_sign} (H{e.from_house}) → {e.to_sign} (H{e.to_house})
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold tracking-wide text-amber-400">
                          CURRENTLY HERE
                        </span>
                      )}
                      <span className={`text-[10px] font-bold tracking-wide ${styles.label}`}>
                        {styles.labelText}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-slate-300 font-medium">
                        {isCurrent ? `since ${formatDate(e.date)}` : formatDate(e.date)}
                      </span>
                      {" · stays "}
                      {formatDuration(e.duration_days)}
                      {e.next_ingress_date && (
                        <> (until {formatDate(e.next_ingress_date)})</>
                      )}
                      {!e.next_ingress_date && <> (continues past window)</>}
                    </p>

                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">{e.interpretation}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

