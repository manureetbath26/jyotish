"use client";

import type {
  MarriageAshtakvargaInsights,
  Strength,
  SavSignal,
  BavSignal,
} from "@/lib/marriageAshtakvargaInsights";

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
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bar: "bg-emerald-500",
    accent: "text-emerald-400",
  },
  Excess: {
    badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    bar: "bg-fuchsia-500",
    accent: "text-fuchsia-400",
  },
};

interface Props {
  insights: MarriageAshtakvargaInsights;
}

export function MarriageAshtakvargaPanel({ insights }: Props) {
  const overallStyles = STRENGTH_STYLES[insights.overallRating];

  return (
    <div className="space-y-4">
      {/* Header with overall rating */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <span>{"\u{1F4A0}"}</span>
            Ashtakvarga Marriage Indicators
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bindu signals from the 7th house, Upa-Pada, 2nd-from-UL, and marriage karakas.
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${overallStyles.badge}`}
        >
          {insights.overallRating}
        </span>
      </div>

      {/* Overall narrative */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <p className="text-xs text-slate-300 leading-relaxed italic">
          {insights.overallNarrative}
        </p>
      </div>

      {/* Three SAV signals */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">
          Sarvashtakavarga (house-level support)
        </p>
        <div className="space-y-2">
          <SavRow signal={insights.sevenSav} max={48} />
          <SavRow signal={insights.ulSav} max={48} />
          <SavRow signal={insights.secondFromUlSav} max={48} />
        </div>
      </div>

      {/* Three BAV signals (planet-level in 7th) */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">
          Marriage Karakas in 7th House Sign
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <BavTile signal={insights.venusBav} label="Venus (love karaka)" />
          <BavTile signal={insights.jupiterBav} label="Jupiter (blessing)" />
          <BavTile signal={insights.saturnBav} label="Saturn (delay/endurance)" />
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
// SAV row (horizontal bar for 0-48)
// ────────────────────────────────────────────────────────────────────────────

function SavRow({ signal, max }: { signal: SavSignal; max: number }) {
  const styles = STRENGTH_STYLES[signal.strength];
  const pct = Math.max(4, Math.min(100, (signal.bindus / max) * 100));

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
// BAV tile (0-8)
// ────────────────────────────────────────────────────────────────────────────

function BavTile({ signal, label }: { signal: BavSignal; label: string }) {
  const styles = STRENGTH_STYLES[signal.strength];

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 space-y-1">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
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
