"use client";

import React, { useState } from "react";

interface TransitDetail {
  planet: string;
  influence: "favorable" | "unfavorable";
  transit_rashi: string;
  transit_degree: number;
  natal_house: number;
  reason: string;
}

interface Period {
  start_date: string;
  end_date: string;
  type: "favorable" | "unfavorable" | "neutral";
  duration_days: number;
  strength: "strong" | "moderate" | "weak";
  active_planets: string[];
  description?: string;
  guidance?: string;
  rating?: number;
  rating_label?: string;
  transit_details?: TransitDetail[];
}

interface TransitTimelineProps {
  lifeArea: string;
  periods: Period[];
  summary: string;
}

const LIFE_AREA_LABELS: Record<string, string> = {
  love_life: "💕 Love Life",
  health: "🏥 Health",
  career: "💼 Career",
  finances: "💰 Finances",
  family: "👨‍👩‍👧‍👦 Family",
};

/** 5-point rating config: colors, labels, badge styles */
const RATING_CONFIG: Record<number, { label: string; bg: string; border: string; badge: string; text: string; dot: string }> = {
  5: { label: "Very Good",        bg: "bg-green-950",      border: "border-green-500",  badge: "bg-green-700 text-white",           text: "text-green-400",   dot: "bg-green-500" },
  4: { label: "Good",             bg: "bg-green-950/50",   border: "border-green-700",  badge: "bg-green-800/80 text-green-200",    text: "text-green-500",   dot: "bg-green-600" },
  3: { label: "Neutral",          bg: "bg-slate-800/60",   border: "border-slate-600",  badge: "bg-slate-700 text-slate-200",       text: "text-slate-400",   dot: "bg-slate-400" },
  2: { label: "Challenging",      bg: "bg-red-950/50",     border: "border-red-800",    badge: "bg-red-900/80 text-red-200",        text: "text-red-400",     dot: "bg-red-400" },
  1: { label: "Very Challenging", bg: "bg-red-950",        border: "border-red-500",    badge: "bg-red-700 text-white",             text: "text-red-300",     dot: "bg-red-500" },
};

function getRating(period: Period): number {
  if (period.rating != null) return period.rating;
  // Fallback for old data without rating field
  if (period.type === "favorable") return period.strength === "strong" ? 5 : 4;
  if (period.type === "unfavorable") return period.strength === "strong" ? 1 : 2;
  return 3;
}

/** Small colored dots representing the 5-point scale */
function RatingDots({ rating }: { rating: number }) {
  const colors = [
    rating >= 1 ? RATING_CONFIG[Math.min(rating, 5)]?.dot || "bg-slate-600" : "bg-slate-700",
  ];
  return (
    <div className="flex items-center gap-1" title={RATING_CONFIG[rating]?.label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= rating
              ? RATING_CONFIG[rating]?.dot || "bg-slate-500"
              : "bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

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
            const rating = getRating(period);
            const config = RATING_CONFIG[rating] || RATING_CONFIG[3];
            const ratingLabel = period.rating_label || config.label;
            const daysFromNow = getDaysFromNow(period.start_date, period.duration_days);
            const isNow = daysFromNow <= 0 && daysFromNow > -period.duration_days;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                className={`border rounded-xl overflow-hidden transition-all ${config.bg} ${config.border}`}
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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.badge}`}>
                          {ratingLabel}
                        </span>
                        <RatingDots rating={rating} />
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
                        <span
                          key={planet}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            period.type === "favorable"
                              ? "bg-green-900/60 text-green-200 border-green-800"
                              : period.type === "unfavorable"
                              ? "bg-red-900/60 text-red-200 border-red-800"
                              : "bg-slate-700/60 text-slate-300 border-slate-600"
                          }`}
                        >
                          {planet}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                    {/* Transit Details - per-planet breakdown */}
                    {period.transit_details && period.transit_details.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                          Active Transits
                        </p>
                        <div className="space-y-2">
                          {period.transit_details.map((td, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-3 rounded-lg p-2.5 text-sm ${
                                td.influence === "favorable"
                                  ? "bg-green-900/30 border border-green-800/50"
                                  : "bg-red-900/30 border border-red-800/50"
                              }`}
                            >
                              <span
                                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                  td.influence === "favorable" ? "bg-green-400" : "bg-red-400"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-slate-200">
                                  {td.planet}{" "}
                                  <span className="font-normal text-slate-400">
                                    in {td.transit_rashi} ({td.transit_degree}°)
                                  </span>
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {td.reason} — House {td.natal_house}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                          : period.type === "unfavorable"
                          ? "bg-red-900/40 border border-red-800"
                          : "bg-slate-800 border border-slate-700"
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
