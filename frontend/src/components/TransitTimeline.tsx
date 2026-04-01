"use client";

import React, { useState } from "react";

interface Period {
  start_date: string;
  end_date: string;
  type: "favorable" | "unfavorable" | "neutral";
  duration_days: number;
  strength: "strong" | "moderate" | "weak";
  active_planets: string[];
  description?: string;
  guidance?: string;
}

interface TransitTimelineProps {
  lifeArea: string;
  periods: Period[];
  summary: string;
}

const STRENGTH_STARS = { strong: "⭐⭐⭐", moderate: "⭐⭐", weak: "⭐" };

const LIFE_AREA_LABELS: Record<string, string> = {
  love_life: "💕 Love Life",
  health: "🏥 Health",
  career: "💼 Career",
  finances: "💰 Finances",
  family: "👨‍👩‍👧‍👦 Family",
};

export function TransitTimeline({ lifeArea, periods, summary }: TransitTimelineProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  const formatDuration = (days: number) => {
    if (days >= 30) return `~${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? "s" : ""}`;
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  const getDaysFromNow = (startStr: string, durationDays: number) => {
    const start = new Date(startStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  };

  const containerColor = (type: string, strength: string) => {
    if (type === "favorable") {
      if (strength === "strong")   return "bg-green-950 border-green-600";
      if (strength === "moderate") return "bg-green-950/70 border-green-700";
      return "bg-green-950/40 border-green-800";
    }
    if (type === "unfavorable") {
      if (strength === "strong")   return "bg-red-950 border-red-600";
      if (strength === "moderate") return "bg-red-950/70 border-red-700";
      return "bg-red-950/40 border-red-800";
    }
    return "bg-slate-800 border-slate-700";
  };

  const badgeColor = (type: string) =>
    type === "favorable"
      ? "bg-green-600 text-white"
      : type === "unfavorable"
      ? "bg-red-600 text-white"
      : "bg-slate-700 text-slate-200";

  const planetBadgeColor = (type: string) =>
    type === "favorable"
      ? "bg-green-900/60 text-green-200 border border-green-800"
      : "bg-red-900/60 text-red-200 border border-red-800";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-1">
          {LIFE_AREA_LABELS[lifeArea] || lifeArea}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">{summary}</p>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
          No significant transits detected in this period
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period, idx) => {
            const daysFromNow = getDaysFromNow(period.start_date, period.duration_days);
            const isNow = daysFromNow <= 0 && daysFromNow > -period.duration_days;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                className={`border rounded-xl overflow-hidden transition-all ${containerColor(period.type, period.strength)}`}
              >
                {/* Clickable summary row */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: badge + dates */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${badgeColor(period.type)}`}>
                          {period.type === "favorable" ? "✓ Favorable" : "⚠ Challenging"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {STRENGTH_STARS[period.strength]}
                        </span>
                        {isNow && (
                          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            ● Happening now
                          </span>
                        )}
                        {!isNow && daysFromNow > 0 && daysFromNow <= 30 && (
                          <span className="text-xs text-amber-400">
                            in {daysFromNow} days
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200">
                        {formatDate(period.start_date)} — {formatDate(period.end_date)}
                      </p>
                    </div>

                    {/* Right: duration + expand toggle */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-300">
                        {formatDuration(period.duration_days)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {isExpanded ? "▲ less" : "▼ more"}
                      </p>
                    </div>
                  </div>

                  {/* Planet tags always visible */}
                  {period.active_planets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {period.active_planets.map((planet) => (
                        <span key={planet} className={`text-xs px-2 py-0.5 rounded-full ${planetBadgeColor(period.type)}`}>
                          {planet}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                    {/* Description */}
                    {period.description && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          What this means
                        </p>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {period.description}
                        </div>
                      </div>
                    )}

                    {/* Guidance */}
                    {period.guidance && (
                      <div className={`rounded-lg p-3 ${
                        period.type === "favorable"
                          ? "bg-green-900/40 border border-green-800"
                          : "bg-red-900/40 border border-red-800"
                      }`}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          {period.type === "favorable" ? "✦ How to make the most of it" : "✦ How to navigate this period"}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {period.guidance}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
