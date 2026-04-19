"use client";

import { useState } from "react";
import type {
  SarvashtakvargaInsights,
  HouseInterpretation,
  TrikonaInterpretation,
  ComparisonInterpretation,
  Strength,
} from "@/lib/sarvashtakvargaInterpreter";

interface Props {
  insights: SarvashtakvargaInsights;
}

const STRENGTH_STYLES: Record<Strength, { badge: string; bar: string; accent: string }> = {
  weak: {
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    bar: "bg-rose-500",
    accent: "text-rose-400",
  },
  average: {
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    bar: "bg-amber-500",
    accent: "text-amber-400",
  },
  strong: {
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    bar: "bg-emerald-500",
    accent: "text-emerald-400",
  },
  excess: {
    badge: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40",
    bar: "bg-fuchsia-500",
    accent: "text-fuchsia-400",
  },
};

export function SarvashtakvargaInterpretation({ insights }: Props) {
  const [openHouse, setOpenHouse] = useState<number | null>(null);

  const { summary, houses, trikonas, comparisons } = insights;

  return (
    <div className="space-y-5">
      {/* ── Summary ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">
            Sarva Total
          </p>
          <p className="text-2xl font-bold text-amber-400">{summary.grandTotal}</p>
          <p className="text-[10px] text-slate-500">classical max 337</p>
        </div>
        <div className="border-l border-slate-700 pl-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg per house</p>
          <p className="text-xl font-bold text-slate-100">{summary.averageBindus}</p>
        </div>
        <div className="border-l border-slate-700 pl-4">
          <p className="text-[10px] text-emerald-400 uppercase tracking-wide">Strongest</p>
          <p className="text-sm font-bold text-slate-100">
            H{summary.strongestHouse.house} &middot; {summary.strongestHouse.bindus}
          </p>
          <p className="text-[10px] text-slate-500">{summary.strongestHouse.themes.split(",")[0]}</p>
        </div>
        <div className="border-l border-slate-700 pl-4">
          <p className="text-[10px] text-rose-400 uppercase tracking-wide">Weakest</p>
          <p className="text-sm font-bold text-slate-100">
            H{summary.weakestHouse.house} &middot; {summary.weakestHouse.bindus}
          </p>
          <p className="text-[10px] text-slate-500">{summary.weakestHouse.themes.split(",")[0]}</p>
        </div>
      </div>

      {/* ── House-wise interpretation ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <span>{"\u{1F3E0}"}</span>
          House-wise Interpretation
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Each house&apos;s bindu count indicates how supported that life area is. Tap a row for details and remedies.
        </p>
        <div className="space-y-1.5">
          {houses.map((h) => (
            <HouseRow
              key={h.house}
              house={h}
              isOpen={openHouse === h.house}
              onToggle={() => setOpenHouse(openHouse === h.house ? null : h.house)}
            />
          ))}
        </div>
      </div>

      {/* ── Trikona (4-pillar) analysis ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <span>{"\u{1F54C}"}</span>
          Four-Pillar Life Analysis (Trikona)
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Dharma, Artha, Kama, Moksha — the four primary aims of life, each represented by three houses.
          A pillar is strong when the average bindu count of its houses is &ge;28.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trikonas.map((t) => (
            <TrikonaCard key={t.id} trikona={t} />
          ))}
        </div>
      </div>

      {/* ── Practical comparisons ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <span>{"\u{1F4CA}"}</span>
          Practical Decision Rules
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Classical rules compare specific house pairs to guide major life decisions.
        </p>
        <div className="space-y-2">
          {comparisons.map((c) => (
            <ComparisonCard key={c.id} comparison={c} />
          ))}
        </div>
      </div>

      <p className="text-[9px] text-slate-600 italic pt-2 border-t border-slate-800/50">
        Interpretation rules sourced from Sarvashtakavarga classical texts via{" "}
        <span className="text-slate-500">shilaavinyaas.com</span>. Remedies are traditional suggestions —
        use them as guidance alongside practical action.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// House row with expandable detail
// ────────────────────────────────────────────────────────────────────────────

function HouseRow({
  house,
  isOpen,
  onToggle,
}: {
  house: HouseInterpretation;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const styles = STRENGTH_STYLES[house.strength];
  // Percentage for bar: normalize against reasonable range (say 40 bindus max visually)
  const pct = Math.max(5, Math.min(100, (house.bindus / 40) * 100));

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-800/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-[11px] font-bold text-slate-300">{house.house}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-100 truncate">{house.title}</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${styles.badge}`}>
              {house.strengthLabel}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{house.themes}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-lg font-bold ${styles.accent}`}>{house.bindus}</p>
          <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden mt-0.5">
            <div className={`h-full ${styles.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-slate-600 text-[10px] flex-shrink-0 ml-1">
          {isOpen ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/50">
          <p className="text-[11px] text-slate-500">
            <span className="text-slate-600">Sign in this house: </span>
            <span className="text-slate-400 font-medium">
              {house.sign} ({house.signNumber})
            </span>
          </p>
          <div className="bg-slate-800/40 rounded p-2.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Reading</p>
            <p className="text-xs text-slate-300 leading-relaxed">{house.interpretation}</p>
          </div>
          {house.marakaNote && (
            <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded p-2.5">
              <p className="text-[10px] text-fuchsia-400 uppercase tracking-wide mb-1">
                Maraka note
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{house.marakaNote}</p>
            </div>
          )}
          {house.remedy && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2.5">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-1">
                {"\u{1FA94}"} Suggested remedies
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{house.remedy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Trikona card
// ────────────────────────────────────────────────────────────────────────────

function TrikonaCard({ trikona }: { trikona: TrikonaInterpretation }) {
  const accent = trikona.isStrong
    ? {
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/5",
        text: "text-emerald-400",
      }
    : trikona.averageBindus >= 24
      ? {
          border: "border-amber-500/30",
          bg: "bg-amber-500/5",
          text: "text-amber-400",
        }
      : {
          border: "border-rose-500/30",
          bg: "bg-rose-500/5",
          text: "text-rose-400",
        };

  return (
    <div className={`border ${accent.border} ${accent.bg} rounded-lg p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{trikona.name}</h4>
          <p className="text-[10px] text-slate-500">
            Houses {trikona.houses.join(", ")} &middot; {trikona.meaning}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${accent.text}`}>{trikona.averageBindus}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">avg</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{trikona.verdict}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Comparison card
// ────────────────────────────────────────────────────────────────────────────

function ComparisonCard({ comparison }: { comparison: ComparisonInterpretation }) {
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
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">H{comparison.houseA}</p>
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
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">H{comparison.houseB}</p>
          <p className={`text-lg font-bold ${bWins ? "text-blue-400" : "text-slate-300"}`}>
            {comparison.valueB}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{comparison.verdict}</p>
    </div>
  );
}
