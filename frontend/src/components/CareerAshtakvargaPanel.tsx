"use client";

import type {
  CareerAshtakvargaInsights,
  CareerSavSignal,
  CareerBavSignal,
  CareerComparison,
  Strength,
} from "@/lib/careerAshtakvargaInsights";

const STRENGTH_STYLES: Record<Strength, { badge: string; bar: string; accent: string }> = {
  Weak: {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    bar: "bg-rose-500",
    accent: "text-rose-400",
  },
  Average: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    bar: "bg-amber-500",
    accent: "text-amber-400",
  },
  Strong: {
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    bar: "bg-blue-500",
    accent: "text-blue-400",
  },
};

interface Props {
  insights: CareerAshtakvargaInsights;
}

export function CareerAshtakvargaPanel({ insights }: Props) {
  const overallStyles = STRENGTH_STYLES[insights.overallRating];

  return (
    <div className="space-y-4">
      {/* Header with overall rating */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
            <span>{"\u{1F4A0}"}</span>
            Ashtakvarga Career Indicators
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Natal bindu signals from the 10th, 11th, A10, and career karakas.
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${overallStyles.badge}`}
        >
          {insights.overallRating}
        </span>
      </div>

      {/* Overall narrative */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-slate-300 leading-relaxed italic">
          {insights.overallNarrative}
        </p>
      </div>

      {/* SAV signals */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">
          Sarvashtakavarga (house-level support)
        </p>
        <div className="space-y-2">
          <SavRow signal={insights.tenthSav} />
          <SavRow signal={insights.a10Sav} />
          <SavRow signal={insights.eleventhSav} />
        </div>
      </div>

      {/* BAV signals */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">
          Career Karakas in 10th House Sign
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <BavTile signal={insights.amkBav} />
          <BavTile signal={insights.sunBav} />
          <BavTile signal={insights.saturnBav} />
          <BavTile signal={insights.jupiterBav} />
        </div>
      </div>

      {/* Comparisons */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">
          Classical Decision Rules
        </p>
        <div className="space-y-2">
          {insights.comparisons.map((c, i) => (
            <ComparisonCard key={i} comparison={c} />
          ))}
        </div>
      </div>

      <p className="text-[9px] text-slate-600 italic pt-1 border-t border-slate-800/50">
        SAV thresholds: &lt;22 weak &middot; 23-28 average &middot; &gt;28 strong. Per-planet bindus per sign
        range 0-8.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function SavRow({ signal }: { signal: CareerSavSignal }) {
  const styles = STRENGTH_STYLES[signal.strength];
  const pct = Math.max(4, Math.min(100, (signal.bindus / 48) * 100));

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-100">{signal.label}</p>
          <p className="text-[10px] text-slate-500">
            {signal.sign} (rashi {signal.signNumber})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${styles.accent}`}>{signal.bindus}</span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${styles.badge}`}
          >
            {signal.strength}
          </span>
        </div>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
        <div
          className={`h-full ${styles.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{signal.interpretation}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function BavTile({ signal }: { signal: CareerBavSignal }) {
  const styles = STRENGTH_STYLES[signal.strength];

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate flex-1">
          {signal.planet} &middot; {signal.role}
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${styles.accent}`}>{signal.bindus}</span>
        <span className="text-[10px] text-slate-600">/ 8</span>
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${styles.badge} ml-auto`}
        >
          {signal.strength}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{signal.interpretation}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function ComparisonCard({ comparison }: { comparison: CareerComparison }) {
  const aWins = comparison.valueA > comparison.valueB;
  const bWins = comparison.valueB > comparison.valueA;

  return (
    <div className="border border-slate-800 bg-slate-800/20 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-xs font-semibold text-slate-100">{comparison.title}</h4>
        <span className="text-[10px] text-slate-500">&middot; {comparison.themes}</span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex-1 rounded p-2 text-center ${
            aWins
              ? "bg-blue-500/15 border border-blue-500/30"
              : "bg-slate-800/40 border border-slate-800"
          }`}
        >
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">{comparison.labelA}</p>
          <p className={`text-lg font-bold ${aWins ? "text-blue-400" : "text-slate-300"}`}>
            {comparison.valueA}
          </p>
        </div>
        <span className="text-slate-600 text-xs">vs</span>
        <div
          className={`flex-1 rounded p-2 text-center ${
            bWins
              ? "bg-blue-500/15 border border-blue-500/30"
              : "bg-slate-800/40 border border-slate-800"
          }`}
        >
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">{comparison.labelB}</p>
          <p className={`text-lg font-bold ${bWins ? "text-blue-400" : "text-slate-300"}`}>
            {comparison.valueB}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{comparison.verdict}</p>
    </div>
  );
}
