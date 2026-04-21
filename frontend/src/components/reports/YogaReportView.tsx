"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartResponse } from "@/lib/api";
import { fetchLifetimeTransits } from "@/lib/api";
import { detectYogas, type DetectedYoga, type YogaRule, type YogaCategory } from "@/lib/yogaEngine";
import { useHouseSignifications } from "@/hooks/useHouseSignifications";
import { ReportShell } from "@/components/ReportShell";

const VERDICT_STYLE: Record<"favorable" | "mixed" | "challenging", { label: string; bg: string; text: string; border: string }> = {
  favorable:   { label: "Favourable placement",  bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  mixed:       { label: "Mixed / often mitigated", bg: "bg-sky-500/10",   text: "text-sky-300",     border: "border-sky-500/30" },
  challenging: { label: "Needs care",           bg: "bg-rose-500/10",   text: "text-rose-300",    border: "border-rose-500/30" },
};

const CATEGORY_LABEL: Record<YogaCategory, string> = {
  mahapurusha: "Pancha Mahapurusha",
  nabhasa: "Nabhasa (Celestial Patterns)",
  chandra: "Chandra (Lunar) Yogas",
  surya: "Surya (Solar) Yogas",
  raja: "Raja Yogas",
  dhana: "Dhana (Wealth) Yogas",
  special: "Special & Named Yogas",
  dosha: "Doshas & Warnings",
};

const CATEGORY_ACCENT: Record<YogaCategory, { badge: string; bar: string; accent: string }> = {
  mahapurusha: { badge: "bg-amber-500/20 text-amber-300 border-amber-500/40", bar: "bg-amber-500", accent: "text-amber-400" },
  nabhasa:     { badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",   bar: "bg-cyan-500",  accent: "text-cyan-400" },
  chandra:     { badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40", bar: "bg-indigo-500", accent: "text-indigo-400" },
  surya:       { badge: "bg-orange-500/20 text-orange-300 border-orange-500/40", bar: "bg-orange-500", accent: "text-orange-400" },
  raja:        { badge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40", bar: "bg-fuchsia-500", accent: "text-fuchsia-400" },
  dhana:       { badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", bar: "bg-emerald-500", accent: "text-emerald-400" },
  special:     { badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",   bar: "bg-blue-500",  accent: "text-blue-400" },
  dosha:       { badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",   bar: "bg-rose-500",  accent: "text-rose-400" },
};

interface Props {
  chart: ChartResponse;
  userName?: string;
  onBack?: () => void;
}

export function YogaReportView({ chart, userName, onBack }: Props) {
  const [rules, setRules] = useState<YogaRule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const HOUSE_SIGNIFICATIONS = useHouseSignifications();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yoga/rules")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setRules(data as YogaRule[]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load yoga rules");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const detected = useMemo<DetectedYoga[]>(() => {
    if (!rules) return [];
    return detectYogas(chart, rules);
  }, [chart, rules]);

  // Display order: positive yogas first, doshas/warnings always last.
  const CATEGORY_DISPLAY_ORDER: YogaCategory[] = [
    "mahapurusha",
    "raja",
    "dhana",
    "nabhasa",
    "chandra",
    "surya",
    "special",
    "dosha",
  ];

  const grouped = useMemo(() => {
    const map = new Map<YogaCategory, DetectedYoga[]>();
    // Pre-seed categories in display order so iteration honours it
    for (const cat of CATEGORY_DISPLAY_ORDER) map.set(cat, []);
    for (const d of detected) {
      const arr = map.get(d.rule.category) ?? [];
      arr.push(d);
      map.set(d.rule.category, arr);
    }
    // Drop empty categories
    for (const [cat, arr] of map) {
      if (arr.length === 0) map.delete(cat);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected]);

  const totalRules = rules?.length ?? 0;
  const detectedCount = detected.length;
  const positiveCount = detected.filter((d) => d.rule.category !== "dosha").length;
  const doshaCount = detected.filter((d) => d.rule.category === "dosha").length;

  return (
    <ReportShell
      onBack={onBack}
      title={`Yoga Report${userName ? ` \u00B7 ${userName}` : ""}`}
      lockReason="Profile switching is disabled while viewing this report. Go back first to switch to another chart."
    >
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u2728"}</span>
          Yoga Report
        </h1>
        <p className="text-sm text-slate-400">
          Classical Vedic planetary combinations (BPHS chapters 34-43)
        </p>
      </div>

      {/* Chart context */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-100 font-semibold">
            {userName || "Chart"} &middot; {chart.lagna} Lagna
          </p>
          <p className="text-xs text-slate-500">
            {chart.date} &middot; {chart.time} &middot; {chart.place?.split(",").slice(0, 2).join(",")}
          </p>
        </div>
      </div>

      {/* Summary */}
      {!loading && !error && rules && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Detected</p>
            <p className="text-2xl font-bold text-amber-400">{detectedCount}</p>
            <p className="text-[10px] text-slate-600">of {totalRules} checked</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wide">Positive</p>
            <p className="text-2xl font-bold text-emerald-400">{positiveCount}</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
            <p className="text-[10px] text-rose-400 uppercase tracking-wide">Doshas</p>
            <p className="text-2xl font-bold text-rose-400">{doshaCount}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Analysing yogas...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && detectedCount === 0 && (
        <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-400">
            No significant yogas detected in this chart from the {totalRules} classical rules currently checked.
          </p>
          <p className="text-[11px] text-slate-600 mt-2">
            This doesn&apos;t mean the chart is &quot;weak&quot; — the full classical library extends to hundreds of yogas; we cover the most significant and reliably-detectable ones.
          </p>
        </div>
      )}

      {/* Per category */}
      {!loading && !error && Array.from(grouped.entries()).map(([cat, yogas]) => {
        const styles = CATEGORY_ACCENT[cat];
        return (
          <div key={cat} className="space-y-2">
            <h2 className={`text-sm font-bold uppercase tracking-wider ${styles.accent}`}>
              {CATEGORY_LABEL[cat]}
              <span className="text-slate-500 font-normal ml-2">({yogas.length})</span>
            </h2>
            <div className="space-y-2">
              {yogas.map((d) => (
                <YogaCard
                  key={d.rule.id}
                  yoga={d}
                  isExpanded={expanded === d.rule.id}
                  onToggle={() => setExpanded(expanded === d.rule.id ? null : d.rule.id)}
                  styles={styles}
                />
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-800/50">
        Source: <em>Brihat Parashara Hora Shastra</em>, chapters 34-43. Each yoga is detected
        from its classical formation rule. Importance ratings guide display order; all detected
        yogas are genuinely present in your chart. Doshas classically carry mitigations — a
        good astrologer reads them in the context of the full chart.
      </p>
    </div>
    </ReportShell>
  );
}

function YogaCard({
  yoga,
  isExpanded,
  onToggle,
  styles,
}: {
  yoga: DetectedYoga;
  isExpanded: boolean;
  onToggle: () => void;
  styles: { badge: string; bar: string; accent: string };
}) {
  // Cached hook — free after the parent's first call since we share a
  // module-level fetch cache.
  const HOUSE_SIGNIFICATIONS = useHouseSignifications();
  return (
    <div className="border border-slate-800 bg-slate-900/60 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex-shrink-0">
          <div className={`w-2 h-2 rounded-full mt-2 ${styles.bar}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-semibold text-slate-100">{yoga.rule.name}</h3>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${styles.badge}`}>
              Ch. {yoga.rule.chapter}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
              {Array.from({ length: yoga.rule.importance }).map((_, i) => (
                <span key={i}>{"\u2605"}</span>
              ))}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{yoga.evidence}</p>
        </div>
        <span className="text-slate-600 text-xs flex-shrink-0">
          {isExpanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-800/50">
          {/* How it forms in THIS chart */}
          {(yoga.formationInChart || yoga.keyPlanets || yoga.keyHouse) && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-md p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 font-semibold">
                {"\uD83D\uDD0D"} How this forms in your chart
              </p>
              {yoga.formationInChart && (
                <p className="text-xs text-slate-200 leading-relaxed">{yoga.formationInChart}</p>
              )}
              {(yoga.keyPlanets?.length || yoga.keyHouse || yoga.keySign) && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {yoga.keyPlanets && yoga.keyPlanets.length > 0 && (
                    <span>Planets: <span className="text-slate-300">{yoga.keyPlanets.join(", ")}</span></span>
                  )}
                  {yoga.keyHouse && (
                    <span>{yoga.keyPlanets?.length ? " \u00B7 " : ""}House: <span className="text-slate-300">{yoga.keyHouse}</span></span>
                  )}
                  {yoga.keySign && (
                    <span>{" \u00B7 "}Sign: <span className="text-slate-300">{yoga.keySign}</span></span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* D9 (Navamsa) strength check */}
          {yoga.d9Analysis && (
            <div className={`border rounded-md p-2.5 ${
              yoga.d9Analysis.verdict === "strong"   ? "bg-emerald-500/10 border-emerald-500/30" :
              yoga.d9Analysis.verdict === "moderate" ? "bg-sky-500/10 border-sky-500/30" :
                                                       "bg-rose-500/10 border-rose-500/30"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-[10px] uppercase tracking-wide font-semibold ${
                  yoga.d9Analysis.verdict === "strong"   ? "text-emerald-300" :
                  yoga.d9Analysis.verdict === "moderate" ? "text-sky-300" :
                                                           "text-rose-300"
                }`}>
                  {"\u2699\uFE0F"} D9 (Navamsa) strength check
                </p>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  yoga.d9Analysis.verdict === "strong"   ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                  yoga.d9Analysis.verdict === "moderate" ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
                                                           "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {yoga.d9Analysis.verdict === "strong" ? "Fructifies fully" :
                   yoga.d9Analysis.verdict === "moderate" ? "Partial manifestation" :
                   "Paper yoga / weak"}
                </span>
              </div>
              <ul className="text-[11px] text-slate-300 leading-relaxed space-y-0.5 mb-1.5">
                {yoga.d9Analysis.planets.map((p) => (
                  <li key={p.planet}>
                    <span className="text-slate-400">{"\u2022"}</span> {p.note}
                  </li>
                ))}
              </ul>
              {yoga.d9Analysis.combustionNote && (
                <p className="text-[11px] text-slate-400 italic mb-1.5">
                  {yoga.d9Analysis.combustionNote}
                </p>
              )}
              <p className="text-xs text-slate-200 leading-relaxed">
                {yoga.d9Analysis.summary}
              </p>
            </div>
          )}

          {/* House-context interpretation */}
          {yoga.keyHouse && yoga.houseContextNote && (
            <div className={`${yoga.houseVerdict ? VERDICT_STYLE[yoga.houseVerdict].bg : "bg-slate-800/40"} border ${yoga.houseVerdict ? VERDICT_STYLE[yoga.houseVerdict].border : "border-slate-700/50"} rounded-md p-2.5`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[10px] uppercase tracking-wide font-semibold ${yoga.houseVerdict ? VERDICT_STYLE[yoga.houseVerdict].text : "text-slate-400"}`}>
                  {"\uD83C\uDFE0"} House {yoga.keyHouse} context &mdash; {HOUSE_SIGNIFICATIONS[yoga.keyHouse]?.name}
                </p>
                {yoga.houseVerdict && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${VERDICT_STYLE[yoga.houseVerdict].bg} ${VERDICT_STYLE[yoga.houseVerdict].text} border ${VERDICT_STYLE[yoga.houseVerdict].border}`}>
                    {VERDICT_STYLE[yoga.houseVerdict].label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 italic mb-1.5">
                {HOUSE_SIGNIFICATIONS[yoga.keyHouse]?.themes}
              </p>
              <p className="text-xs text-slate-200 leading-relaxed">
                {yoga.houseContextNote}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Classical formation rule</p>
            <p className="text-xs text-slate-300 leading-relaxed">{yoga.rule.formation}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Classical effects</p>
            <p className="text-xs text-slate-300 leading-relaxed">{yoga.rule.effects}</p>
          </div>
          {yoga.rule.implications && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5 font-semibold">
                {"\u2728"} How this plays out in life
              </p>
              <p className="text-xs text-slate-200 leading-relaxed">
                {yoga.rule.implications}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Classical source</p>
            <p className="text-[11px] text-slate-400 italic">
              &ldquo;{yoga.rule.classicalText}&rdquo;
              <span className="text-slate-600 ml-1">— {yoga.rule.source}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
