"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartResponse } from "@/lib/api";
import {
  generateFinanceReport,
  type FinanceReport,
  type PeriodWealth,
} from "@/lib/financeEngine";
import { computeAshtakvarga, type AshtakvargaRule } from "@/lib/ashtakvargaEngine";
import type { YogaRule } from "@/lib/yogaEngine";
import { ReportShell } from "@/components/ReportShell";

interface Props {
  chart: ChartResponse;
  userName?: string;
  onBack?: () => void;
}

const TONE_STYLE: Record<PeriodWealth["tone"], { label: string; bg: string; text: string; border: string }> = {
  peak:     { label: "Peak",     bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40" },
  strong:   { label: "Strong",   bg: "bg-sky-500/15",     text: "text-sky-300",     border: "border-sky-500/40" },
  moderate: { label: "Moderate", bg: "bg-slate-500/15",   text: "text-slate-300",   border: "border-slate-500/40" },
  mixed:    { label: "Mixed",    bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/40" },
  caution:  { label: "Caution",  bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/40" },
};

const RATING_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "Very Strong": { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40" },
  "Strong":      { bg: "bg-sky-500/15",     text: "text-sky-300",     border: "border-sky-500/40" },
  "Moderate":    { bg: "bg-slate-500/15",   text: "text-slate-300",   border: "border-slate-500/40" },
  "Mixed":       { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/40" },
  "Challenging": { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/40" },
};

export function FinanceReportView({ chart, userName, onBack }: Props) {
  const [yogaRules, setYogaRules] = useState<YogaRule[] | null>(null);
  const [ashtakvargaRules, setAshtakvargaRules] = useState<AshtakvargaRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/yoga/rules").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/ashtakvarga/rules").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([yr, ar]) => {
        if (cancelled) return;
        setYogaRules(yr as YogaRule[]);
        setAshtakvargaRules(ar as AshtakvargaRule[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load rules");
      });
    return () => { cancelled = true; };
  }, []);

  const report = useMemo<FinanceReport | null>(() => {
    if (!yogaRules || !ashtakvargaRules) return null;
    try {
      const av = computeAshtakvarga(chart, ashtakvargaRules);
      return generateFinanceReport(chart, av, yogaRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      return null;
    }
  }, [chart, yogaRules, ashtakvargaRules]);

  if (error) {
    return (
      <ReportShell onBack={onBack} title="Finance Report">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      </ReportShell>
    );
  }

  if (!report) {
    return (
      <ReportShell onBack={onBack} title="Finance Report">
        <div className="flex items-center justify-center gap-3 py-16">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Computing wealth signatures...</span>
        </div>
      </ReportShell>
    );
  }

  const ratingStyle = RATING_STYLE[report.verdict.rating] ?? RATING_STYLE.Moderate;

  return (
    <ReportShell
      onBack={onBack}
      title={`Finance Report${userName ? ` \u00B7 ${userName}` : ""}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-2">
            <span className="text-3xl">{"\u{1F4B0}"}</span>
            5-Year Finance Report
          </h1>
          <p className="text-sm text-slate-400">
            Classical Vedic wealth analysis via Parashari houses, Ashtakvarga, Jaimini Arudhas, and Vimshottari timing
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
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Horizon</p>
            <p className="text-xs text-slate-300">{report.meta.startDate} {"\u2192"} {report.meta.endDate}</p>
          </div>
        </div>

        {/* 1. Verdict */}
        <section className={`border ${ratingStyle.border} ${ratingStyle.bg} rounded-2xl p-5 space-y-2`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Headline verdict</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ratingStyle.border} ${ratingStyle.bg} ${ratingStyle.text}`}>
                {report.verdict.rating}
              </span>
              <span className="text-[10px] text-slate-500">{report.verdict.score}/100</span>
            </div>
          </div>
          <p className="text-sm text-slate-100 leading-relaxed">{report.verdict.summary}</p>
        </section>

        {/* 2. Natal signature */}
        <Section title="Natal Wealth Signature" icon={"\u2728"}>
          <div className="space-y-3">
            {report.natalSignature.dhanaYogas.length === 0 &&
             report.natalSignature.supportingYogas.length === 0 &&
             report.natalSignature.extraSignatures.length === 0 && (
              <p className="text-sm text-slate-400">
                No explicit Dhana yogas detected in this chart. Wealth indicators work through the general chart flow,
                planetary strength, and the timing windows in §6 below.
              </p>
            )}

            {report.natalSignature.dhanaYogas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold mb-2">Dhana yogas detected</p>
                <div className="space-y-2">
                  {report.natalSignature.dhanaYogas.map((y) => (
                    <YogaCard key={y.rule.id} name={y.rule.name} evidence={y.evidence} implication={y.rule.implications} />
                  ))}
                </div>
              </div>
            )}

            {report.natalSignature.supportingYogas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-sky-400 font-semibold mb-2">Supporting wealth yogas</p>
                <div className="space-y-2">
                  {report.natalSignature.supportingYogas.map((y) => (
                    <YogaCard key={y.rule.id} name={y.rule.name} evidence={y.evidence} implication={y.rule.implications} />
                  ))}
                </div>
              </div>
            )}

            {report.natalSignature.extraSignatures.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold mb-2">Other wealth signatures</p>
                <div className="space-y-2">
                  {report.natalSignature.extraSignatures.map((s) => (
                    <div
                      key={s.id}
                      className={`border rounded-lg p-3 ${
                        s.tone === "positive"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-rose-500/5 border-rose-500/20"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${s.tone === "positive" ? "text-emerald-300" : "text-rose-300"}`}>
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{s.description}</p>
                      <p className="text-[10px] text-slate-500 italic mt-1">{s.source}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.natalSignature.warnings.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-rose-400 font-semibold mb-2">Warnings</p>
                <div className="space-y-2">
                  {report.natalSignature.warnings.map((y) => (
                    <YogaCard key={y.rule.id} name={y.rule.name} evidence={y.evidence} implication={y.rule.implications} tone="warn" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 3. House health */}
        <Section title="Wealth-House Ashtakvarga Health" icon={"\u{1F4CA}"}>
          <p className="text-xs text-slate-400 mb-3">{report.houseHealth.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {report.houseHealth.houses.map((h) => (
              <div
                key={h.house}
                className={`border rounded-lg p-2 ${
                  h.classification === "abundant"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : h.classification === "healthy"
                    ? "bg-sky-500/10 border-sky-500/30"
                    : h.classification === "average"
                    ? "bg-slate-800/40 border-slate-700"
                    : "bg-rose-500/10 border-rose-500/30"
                }`}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">H{h.house} — {h.houseName}</p>
                <p className="text-lg font-bold text-slate-100">{h.savBindus}</p>
                <p className="text-[10px] text-slate-400">{h.sign}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              Abundant (≥ 32)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-500/30 border border-sky-500/50" />
              Healthy (28–31)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-700 border border-slate-600" />
              Average (23–27)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500/50" />
              Weak (&lt; 23)
            </span>
          </div>
        </Section>

        {/* 4. Source profile */}
        <Section title="Income Source Profile" icon={"\u{1F4BC}"}>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">{report.sourceProfile.narrative}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold mb-1">Primary sectors</p>
              <ul className="text-xs text-slate-200 space-y-0.5">
                {report.sourceProfile.primarySectors.map((s) => (
                  <li key={s}>{"\u2022"} {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wide text-sky-400 font-semibold mb-1">Supporting sectors</p>
              <ul className="text-xs text-slate-200 space-y-0.5">
                {report.sourceProfile.secondarySectors.map((s) => (
                  <li key={s}>{"\u2022"} {s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 5. Savings vs expenses */}
        <Section title="Savings vs Expenses Axis" icon={"\u2696\uFE0F"}>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">{report.savingsAxis.narrative}</p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wide">Gains</p>
              <p className="text-xl font-bold text-emerald-300">{report.savingsAxis.gainsBindus}</p>
              <p className="text-[10px] text-slate-500">H2 + H11</p>
            </div>
            <div className="text-slate-600 text-xl">{"\u2014"}</div>
            <div className="text-center">
              <p className="text-[10px] text-rose-400 uppercase tracking-wide">Expenses</p>
              <p className="text-xl font-bold text-rose-300">{report.savingsAxis.expenseBindus}</p>
              <p className="text-[10px] text-slate-500">H6 + H12</p>
            </div>
            <div className="text-slate-600 text-xl">{"\u21D2"}</div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Retention</p>
              <p className="text-xl font-bold text-slate-100">{report.savingsAxis.retentionScore > 0 ? "+" : ""}{report.savingsAxis.retentionScore}</p>
            </div>
          </div>
        </Section>

        {/* 6. Arudha */}
        <Section title="Jaimini Arudha Analysis" icon={"\u{1F52E}"}>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">{report.arudhaAnalysis.narrative}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["AL", "Self-image"],
              ["A2", "Wealth-image"],
              ["A10", "Career-image"],
              ["A11", "Gains-image"],
            ] as const).map(([key, label]) => (
              <div key={key} className="bg-slate-800/40 border border-slate-700 rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{key}</p>
                <p className="text-sm font-semibold text-slate-100">{report.arudhaAnalysis.arudhas[key]}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. Current period */}
        <Section title="Current Wealth Period" icon={"\u{1F4CD}"}>
          <PeriodCard p={report.currentPeriod} highlight />
        </Section>

        {/* 8. Peak windows */}
        {report.peakWindows.length > 0 && (
          <Section title="Best Wealth Windows (next 5 years)" icon={"\u{1F31F}"}>
            <div className="space-y-2">
              {report.peakWindows.map((p, i) => (
                <PeriodCard key={`${p.mahadasha}-${p.antardasha}-${i}`} p={p} />
              ))}
            </div>
          </Section>
        )}

        {/* 9. Caution windows */}
        {report.cautionWindows.length > 0 && (
          <Section title="Caution Windows" icon={"\u26A0\uFE0F"}>
            <div className="space-y-2">
              {report.cautionWindows.map((p, i) => (
                <PeriodCard key={`c-${p.mahadasha}-${p.antardasha}-${i}`} p={p} />
              ))}
            </div>
          </Section>
        )}

        {/* 10. Timeline — all periods compact */}
        <Section title="Full 5-Year Timeline" icon={"\u{1F4C5}"}>
          <div className="space-y-1">
            {report.timeline.map((p, i) => (
              <div
                key={`tl-${i}`}
                className={`flex items-center gap-2 text-xs border rounded px-2 py-1.5 ${TONE_STYLE[p.tone].border} ${TONE_STYLE[p.tone].bg}`}
              >
                <span className={`${TONE_STYLE[p.tone].text} font-semibold w-16`}>{TONE_STYLE[p.tone].label}</span>
                <span className="text-slate-300 flex-1">{p.mahadasha}-{p.antardasha}</span>
                <span className="text-slate-500 text-[10px]">{p.startDate.slice(0, 7)} {"\u2192"} {p.endDate.slice(0, 7)}</span>
                <span className="text-slate-400 text-[10px] w-8 text-right">{p.score}/10</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 11. Remedies */}
        {report.remedies.length > 0 && (
          <Section title="Classical Remedies" icon={"\u{1F54A}\uFE0F"}>
            <div className="space-y-2">
              {report.remedies.map((r, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-amber-300">{r.planet}</p>
                  <p className="text-xs text-slate-300">{r.reason}</p>
                  {r.mantra && <p className="text-[11px] text-slate-400"><span className="text-slate-500">Mantra:</span> {r.mantra}</p>}
                  {r.gemstone && <p className="text-[11px] text-slate-400"><span className="text-slate-500">Gemstone:</span> {r.gemstone}</p>}
                  {r.charity && <p className="text-[11px] text-slate-400"><span className="text-slate-500">Charity:</span> {r.charity}</p>}
                  {r.note && <p className="text-[11px] text-slate-500 italic">{r.note}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Citations */}
        <p className="text-[10px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-800/50">
          Sources: {report.citations.join(" \u00B7 ")}
        </p>
      </div>
    </ReportShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function YogaCard({
  name,
  evidence,
  implication,
  tone = "good",
}: {
  name: string;
  evidence: string;
  implication?: string | null;
  tone?: "good" | "warn";
}) {
  const base = tone === "warn"
    ? "bg-rose-500/5 border-rose-500/20"
    : "bg-slate-800/40 border-slate-700";
  return (
    <div className={`border rounded-lg p-3 ${base}`}>
      <p className="text-sm font-semibold text-slate-100">{name}</p>
      <p className="text-xs text-slate-400 mt-1">{evidence}</p>
      {implication && (
        <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">{implication}</p>
      )}
    </div>
  );
}

function PeriodCard({ p, highlight = false }: { p: PeriodWealth; highlight?: boolean }) {
  const t = TONE_STYLE[p.tone];
  return (
    <div className={`border ${t.border} ${highlight ? "ring-1 ring-amber-500/30" : ""} ${t.bg} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-100">
          {p.mahadasha}-{p.antardasha}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${t.border} ${t.text}`}>
            {t.label}
          </span>
          <span className="text-[10px] text-slate-500">{p.score}/10</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        {p.startDate.slice(0, 7)} {"\u2192"} {p.endDate.slice(0, 7)} &middot; {p.years} yr
      </p>
      <p className="text-xs text-slate-300 leading-relaxed">{p.narrative}</p>
      {p.factors.length > 0 && (
        <ul className="text-[11px] text-slate-400 space-y-0.5 mt-1">
          {p.factors.slice(0, 3).map((f, i) => (
            <li key={i}>{"\u2022"} {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
