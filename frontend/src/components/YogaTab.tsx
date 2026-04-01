"use client";
import { useState } from "react";
import { YogaEntry } from "@/lib/api";

interface Props {
  yogas: YogaEntry[];
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  mahapurusha: { label: "Pancha Mahapurusha",  color: "amber",   icon: "👑" },
  raja:        { label: "Raja Yoga",            color: "violet",  icon: "⚜️" },
  conjunction: { label: "Conjunction Yoga",     color: "sky",     icon: "☌" },
  dhana:       { label: "Dhana Yoga",           color: "emerald", icon: "💰" },
  moon:        { label: "Moon Yoga",            color: "blue",    icon: "☽" },
  solar:       { label: "Solar Yoga",           color: "orange",  icon: "☀" },
  exchange:    { label: "Parivartana",          color: "teal",    icon: "⇄" },
  benefic:     { label: "Benefic Yoga",         color: "green",   icon: "✦" },
  other:       { label: "Other",                color: "slate",   icon: "◈" },
};

const STRENGTH_META = {
  strong:   { label: "Strong",   dot: "bg-emerald-400", text: "text-emerald-400" },
  moderate: { label: "Moderate", dot: "bg-amber-400",   text: "text-amber-400"  },
  weak:     { label: "Weak",     dot: "bg-slate-500",   text: "text-slate-500"  },
};

const COLOR_CLASSES: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  amber:   { border: "border-amber-500/30",   bg: "bg-amber-500/5",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",   text: "text-amber-300"   },
  violet:  { border: "border-violet-500/30",  bg: "bg-violet-500/5",  badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",  text: "text-violet-300"  },
  sky:     { border: "border-sky-500/30",     bg: "bg-sky-500/5",     badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",          text: "text-sky-300"     },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", text: "text-emerald-300" },
  blue:    { border: "border-blue-500/30",    bg: "bg-blue-500/5",    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",        text: "text-blue-300"    },
  orange:  { border: "border-orange-500/30",  bg: "bg-orange-500/5",  badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",  text: "text-orange-300"  },
  teal:    { border: "border-teal-500/30",    bg: "bg-teal-500/5",    badge: "bg-teal-500/20 text-teal-300 border-teal-500/30",        text: "text-teal-300"    },
  green:   { border: "border-green-500/30",   bg: "bg-green-500/5",   badge: "bg-green-500/20 text-green-300 border-green-500/30",     text: "text-green-300"   },
  slate:   { border: "border-slate-600/30",   bg: "bg-slate-800/30",  badge: "bg-slate-700/50 text-slate-400 border-slate-600/30",     text: "text-slate-400"   },
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿",
  Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

// Categories shown in filter bar (order matters)
const FILTER_CATEGORIES = [
  "all", "mahapurusha", "raja", "conjunction", "dhana", "moon", "solar", "exchange", "benefic"
];

export function YogaTab({ yogas }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? yogas : yogas.filter(y => y.category === filter);
  const strongCount   = yogas.filter(y => y.strength === "strong").length;
  const moderateCount = yogas.filter(y => y.strength === "moderate").length;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{yogas.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Yogas</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{strongCount}</p>
          <p className="text-xs text-slate-500 mt-1">Strong Yogas</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{moderateCount}</p>
          <p className="text-xs text-slate-500 mt-1">Moderate Yogas</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_CATEGORIES.map(cat => {
          const meta = cat === "all" ? null : CATEGORY_META[cat];
          const isActive = filter === cat;
          const count = cat === "all" ? yogas.length : yogas.filter(y => y.category === cat).length;
          if (cat !== "all" && count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                isActive
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {meta ? `${meta.icon} ${meta.label}` : "All"} ({count})
            </button>
          );
        })}
      </div>

      {/* No yogas */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-xl">
          No yogas found in this category.
        </div>
      )}

      {/* Yoga cards */}
      <div className="space-y-2">
        {filtered.map(yoga => {
          const catMeta   = CATEGORY_META[yoga.category] ?? CATEGORY_META.other;
          const strMeta   = STRENGTH_META[yoga.strength];
          const colors    = COLOR_CLASSES[catMeta.color];
          const isOpen    = expanded === yoga.name;

          return (
            <div
              key={yoga.name}
              className={`rounded-xl border transition-colors ${colors.border} ${colors.bg}`}
            >
              {/* Header row */}
              <button
                className="w-full flex items-start justify-between px-4 py-3 text-left gap-3"
                onClick={() => setExpanded(isOpen ? null : yoga.name)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-lg mt-0.5 shrink-0">{catMeta.icon}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold text-sm ${colors.text}`}>
                        {yoga.name}
                      </span>
                      {/* Strength indicator */}
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${strMeta.dot}`} />
                        <span className={`text-xs ${strMeta.text}`}>{strMeta.label}</span>
                      </span>
                    </div>
                    {/* Planets involved */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {yoga.planets_involved.map(p => (
                        <span
                          key={p}
                          className={`text-xs px-1.5 py-0.5 rounded border ${colors.badge}`}
                        >
                          {PLANET_SYMBOLS[p] ?? ""} {p}
                        </span>
                      ))}
                      {yoga.houses.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60 text-slate-500">
                          H{yoga.houses.join(",")}
                        </span>
                      )}
                    </div>
                    {/* Effects one-liner */}
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {yoga.effects}
                    </p>
                  </div>
                </div>
                <span className="text-slate-600 text-xs shrink-0 mt-1">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded interpretation */}
              {isOpen && (
                <div className={`px-4 pb-4 pt-1 border-t ${colors.border}`}>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {yoga.interpretation}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 uppercase tracking-wide">
                    {catMeta.label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-700 text-center pt-2">
        Yoga strength depends on overall chart context, planet dignity, and dasha periods.
        Consult a qualified Jyotishi for personalised interpretation.
      </p>
    </div>
  );
}
