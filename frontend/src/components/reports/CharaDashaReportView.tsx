"use client";

import { useState, useEffect } from "react";
import type { CharaDashaReport, DashaPeriod, SubPeriod, SubSubPeriod, Sign } from "@/lib/charaDashaEngine";
import type { ChartResponse } from "@/lib/api";
import { fetchLifetimeTransits } from "@/lib/api";
import { preparePredictionInput } from "@/lib/jaiminiPredictiveEngine";
import {
  scanMarriageWindows,
  generateFutureTransitSnapshots,
  type TransitPositions,
} from "@/lib/jaiminiMarriagePrediction";
import {
  generateMarriageReport,
  type MarriageReport,
  type KeyPeriod,
  type DivorceRiskAssessment,
} from "@/lib/jaiminiMarriageReport";
import {
  computeAshtakvarga,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import {
  computeMarriageAshtakvargaInsights,
  type MarriageAshtakvargaInsights,
} from "@/lib/marriageAshtakvargaInsights";
import { MarriageAshtakvargaPanel } from "@/components/MarriageAshtakvargaPanel";

interface Props {
  report: CharaDashaReport;
  chart: ChartResponse;
  onBack?: () => void;
}

// Sign → icon / color for visual distinction
const SIGN_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  Aries:       { icon: "\u2648", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  Taurus:      { icon: "\u2649", color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  Gemini:      { icon: "\u264A", color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  Cancer:      { icon: "\u264B", color: "text-blue-300",    bg: "bg-blue-500/10 border-blue-500/20" },
  Leo:         { icon: "\u264C", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  Virgo:       { icon: "\u264D", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Libra:       { icon: "\u264E", color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
  Scorpio:     { icon: "\u264F", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  Sagittarius: { icon: "\u2650", color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  Capricorn:   { icon: "\u2651", color: "text-slate-300",   bg: "bg-slate-500/10 border-slate-500/20" },
  Aquarius:    { icon: "\u2652", color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  Pisces:      { icon: "\u2653", color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 text-sm">{title}</span>
          {badge && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
              {badge}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

export function CharaDashaReportView({ report, chart, onBack }: Props) {
  const [marriageReport, setMarriageReport] = useState<MarriageReport | null>(null);
  const [marriageLoading, setMarriageLoading] = useState(false);
  const [marriageError, setMarriageError] = useState<string | null>(null);
  const [ashtakvargaInsights, setAshtakvargaInsights] =
    useState<MarriageAshtakvargaInsights | null>(null);


  useEffect(() => {
    let cancelled = false;
    async function run() {
      setMarriageLoading(true);
      setMarriageError(null);
      try {
        const predInput = preparePredictionInput(chart);
        const birthDate = new Date(chart.date + "T00:00:00");
        const birthYear = birthDate.getFullYear();

        // Helper: get natal sign of a planet from the chart
        const getNatalSign = (name: string): Sign => {
          const p = chart.planets.find((pl) => pl.name === name);
          return (p?.rashi || "Aries") as Sign;
        };

        // ── Fetch lifetime transit snapshots ──
        let allSnapshots: { date: string; planets: Record<string, number> }[];

        try {
          const lifetimeData = await fetchLifetimeTransits(
            chart.ayanamsha_value,
            chart.lagna_degree,
            birthYear,
            birthDate.getMonth() + 1,
          );
          allSnapshots = lifetimeData.snapshots;
        } catch {
          // Fallback: generate approximate future snapshots
          console.warn("[Marriage] Lifetime transit API failed, generating estimates");
          const transitPositions: TransitPositions = {
            saturn: getNatalSign("Saturn"),
            mars: getNatalSign("Mars"),
            jupiter: getNatalSign("Jupiter"),
          };
          allSnapshots = generateFutureTransitSnapshots(
            transitPositions,
            chart.lagna as Sign,
            20,
          );
        }

        if (cancelled) return;

        // ── 5-year forward scan from today ──
        const scan = scanMarriageWindows(
          predInput,
          chart,
          allSnapshots,
          5,
          undefined, // default: from today
        );

        if (cancelled) return;

        // ── Generate structured report (future only) ──
        const report = generateMarriageReport(predInput, chart, scan, {
          futureOnly: true,
          birthYear,
        });

        if (!cancelled) setMarriageReport(report);

        // ── Compute Ashtakvarga marriage insights ──
        try {
          const rulesRes = await fetch("/api/ashtakvarga/rules");
          if (rulesRes.ok) {
            const rules: AshtakvargaRule[] = await rulesRes.json();
            const analysis = computeAshtakvarga(chart, rules);
            const insights = computeMarriageAshtakvargaInsights(
              analysis,
              report.natalProfile.ulSign,
            );
            if (!cancelled) setAshtakvargaInsights(insights);
          }
        } catch (err) {
          console.warn("[Marriage] Ashtakvarga insights failed:", err);
        }
      } catch (err) {
        console.error("[Marriage] Unexpected error:", err);
        if (!cancelled) {
          setMarriageError(
            err instanceof Error ? err.message : "Failed to calculate marriage prediction",
          );
        }
      } finally {
        if (!cancelled) setMarriageLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div className="space-y-5">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          {"\u2190"} Back
        </button>
      )}

      {/* Report Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F52E}"}</span>
          Jaimini Chara Dasha
        </h1>
        <p className="text-sm text-slate-400">
          Sign-based planetary period system from Jaimini Sutras
        </p>
      </div>

      {/* Section 1: User Details */}
      <Section title="Birth Details" defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {report.user.name && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
              <p className="text-sm text-slate-200 font-medium">{report.user.name}</p>
            </div>
          )}
          {report.user.gender && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Gender</p>
              <p className="text-sm text-slate-200 capitalize">{report.user.gender}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Date of Birth</p>
            <p className="text-sm text-slate-200">{formatDate(report.user.dateOfBirth)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Time of Birth</p>
            <p className="text-sm text-slate-200">{report.user.timeOfBirth}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Place</p>
            <p className="text-sm text-slate-200 truncate">{report.user.place?.split(",").slice(0, 2).join(",")}</p>
          </div>
          {report.user.maritalStatus && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Marital Status</p>
              <p className="text-sm text-slate-200 capitalize">{report.user.maritalStatus}</p>
            </div>
          )}
        </div>

        {/* Chart summary bar */}
        <div className="flex flex-wrap gap-3 mt-2 pt-3 border-t border-slate-800">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
            <p className="text-xs text-slate-500">Ascendant</p>
            <p className="text-sm font-semibold text-amber-400">{report.chart.ascendant}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
            <p className="text-xs text-slate-500">Direction</p>
            <p className="text-sm font-semibold text-slate-200 capitalize">{report.chart.direction}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
            <p className="text-xs text-slate-500">Total Span</p>
            <p className="text-sm font-semibold text-slate-200">{report.chart.totalYears} years</p>
          </div>
        </div>
      </Section>

      {/* Section 2: Current Dasha Highlight */}
      {report.currentDasha && (
        <CurrentDashaCard dasha={report.currentDasha} planets={chart.planets} />
      )}

      {/* Section 3: Visual Timeline */}
      <Section title="Chara Dasha Timeline" badge="12 Periods" defaultOpen>
        <p className="text-xs text-slate-500 mb-3">
          Each period is ruled by a zodiac sign. The duration is determined by the distance
          from the dasha sign to its lord&apos;s position in your birth chart.
          {report.chart.direction === "forward"
            ? " Signs progress in zodiacal (forward) order from your ascendant."
            : " Signs progress in reverse (backward) order from your ascendant."}
        </p>

        {/* Visual bar timeline */}
        <div className="space-y-1.5 mb-4">
          {report.dashaSequence.map((d) => {
            const style = SIGN_STYLE[d.sign];
            const maxDuration = Math.max(...report.dashaSequence.map((p) => p.duration));
            const widthPct = Math.max(15, (d.duration / maxDuration) * 100);

            return (
              <div key={d.sign} className="flex items-center gap-2">
                <span className={`text-sm w-6 text-center ${style?.color || "text-slate-400"}`}>
                  {style?.icon || ""}
                </span>
                <span className="text-xs text-slate-400 w-24 truncate">{d.sign}</span>
                <div className="flex-1 relative">
                  <div
                    className={`h-6 rounded-md flex items-center px-2 text-xs font-medium transition-all ${
                      d.isCurrentPeriod
                        ? "bg-amber-500/30 border border-amber-500/50 text-amber-300"
                        : `${style?.bg || "bg-slate-800"} border text-slate-300`
                    }`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {d.duration}y
                    {d.isCurrentPeriod && (
                      <span className="ml-1 text-amber-400 text-[10px]">{"\u25CF"} NOW</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-600 w-20 text-right">
                  {d.startYear}–{d.endYear}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detailed table with collapsible sub-periods */}
        <DashaTable dashaSequence={report.dashaSequence} />
      </Section>

      {/* Section 4: Marriage Prediction */}
      <Section title="Life Events (Marriage): Jaimini Chara Dasha" badge="Jaimini" defaultOpen>
        {marriageLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Calculating transit-based prediction...</span>
          </div>
        )}
        {marriageError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            {marriageError}
          </div>
        )}
        {marriageReport && (
          <MarriageReportSection
            report={marriageReport}
            ashtakvargaInsights={ashtakvargaInsights}
          />
        )}
      </Section>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Marriage Report Section (structured narrative)
// ────────────────────────────────────────────────────────────────────────────

function MarriageReportSection({
  report,
  ashtakvargaInsights,
}: {
  report: MarriageReport;
  ashtakvargaInsights: MarriageAshtakvargaInsights | null;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [appendixOpen, setAppendixOpen] = useState(false);

  // Future-only scan — split strong vs moderate, no past timeline
  const allStrong = report.keyPeriods.filter((p) => p.strength === "Strong");
  const allModerate = report.keyPeriods.filter((p) => p.strength === "Moderate");

  // If no strong periods, promote moderate to the main timeline
  const hasStrongPeriods = allStrong.length > 0;
  const timelinePeriods = hasStrongPeriods
    ? allStrong
    : [...allModerate].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const appendixPeriods = hasStrongPeriods ? allModerate : [];

  // Accent colors: green for strong, amber for promoted moderate
  const dotColor = hasStrongPeriods ? "bg-green-500" : "bg-amber-500";
  const cardBorder = hasStrongPeriods ? "border-green-500/30" : "border-amber-500/30";
  const cardBg = hasStrongPeriods ? "bg-green-500/5" : "bg-amber-500/5";

  return (
    <div className="space-y-6">
      {/* ── Final Verdict (top position) ── */}
      <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Verdict</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            report.verdict.confidence === "High"
              ? "bg-green-500/20 text-green-400"
              : report.verdict.confidence === "Medium"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-700 text-slate-400"
          }`}>
            {report.verdict.confidence} Confidence
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{report.verdict.narrative}</p>
        {report.verdict.topPeriods.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {report.verdict.topPeriods.map((p, i) => (
              <span key={i} className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                {i === 0 ? "\u2605 " : ""}{p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Marriage count + natal refs ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex items-center gap-3 sm:flex-1">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400 flex-shrink-0">
            {report.marriageCount.expected}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Expected marriages</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{report.marriageCount.explanation}</p>
          </div>
        </div>
      </div>

      {/* ── B. Vertical Timeline (chronological) ── */}
      {timelinePeriods.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Marriage Timeline — Next 5 Years</p>
            {!hasStrongPeriods && (
              <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded-full px-2 py-0.5">
                Moderate indicators
              </span>
            )}
          </div>
          <div className="relative">
            {/* Central vertical line */}
            <div className="absolute left-[28px] sm:left-1/2 sm:-translate-x-px top-0 bottom-0 w-0.5 bg-slate-700" />

            <div className="space-y-8">
              {/* ── Next 5 years — future periods only ── */}
              {timelinePeriods.map((period, i) => {
                const globalIdx = timelinePeriods.indexOf(period);
                const isRight = globalIdx % 2 === 0;
                const isExpanded = expandedIdx === globalIdx;

                return (
                  <div key={`future-${i}`} className="relative">
                    {/* Mobile */}
                    <div className="flex items-start gap-3 sm:hidden">
                      <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                        <div className={`w-[14px] h-[14px] rounded-full ${dotColor} border-2 border-slate-900 shadow-lg`} />
                      </div>
                      <div className={`flex-1 border ${cardBorder} ${cardBg} rounded-xl p-4`}>
                        <TimelineContent
                          period={period}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                        />
                      </div>
                    </div>
                    {/* Desktop */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_32px_1fr] sm:gap-4 sm:items-start">
                      {isRight ? <div /> : (
                        <div className={`border ${cardBorder} ${cardBg} rounded-xl p-4 text-right`}>
                          <TimelineContent
                            period={period}
                            isExpanded={isExpanded}
                            onToggle={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                            alignRight
                          />
                        </div>
                      )}
                      <div className="flex justify-center pt-1">
                        <div className={`w-4 h-4 rounded-full ${dotColor} border-2 border-slate-900 shadow-lg z-10`} />
                      </div>
                      {isRight ? (
                        <div className={`border ${cardBorder} ${cardBg} rounded-xl p-4`}>
                          <TimelineContent
                            period={period}
                            isExpanded={isExpanded}
                            onToggle={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                          />
                        </div>
                      ) : <div />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500">No marriage periods found in the next 5 years.</p>
        </div>
      )}

      {/* ── Ashtakvarga marriage indicators (natal evidence) ── */}
      {ashtakvargaInsights && (
        <div className="border border-amber-500/20 bg-amber-500/[0.03] rounded-xl p-4 sm:p-5">
          <MarriageAshtakvargaPanel insights={ashtakvargaInsights} />
        </div>
      )}

      {/* ── D. Supporting Indicators ── */}
      {report.strongIndicators.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Supporting Indicators</p>
          <div className="space-y-2">
            {report.strongIndicators.map((ind, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-green-400 mt-0.5 flex-shrink-0">{"\u25CF"}</span>
                <span className="text-slate-300 leading-relaxed">{ind}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── E. Challenges / Delays ── */}
      {report.challenges.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Challenges &amp; Considerations</p>
          <div className="space-y-2">
            {report.challenges.map((ch, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">{"\u25B3"}</span>
                <span className="text-slate-400 leading-relaxed">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── F. Relationship Cautions (Divorce Risk) ── */}
      {report.divorceRisk && (
        <RelationshipCautionsSection assessment={report.divorceRisk} />
      )}

      {/* ── Appendix: Moderate periods (only when strong periods exist) ── */}
      {appendixPeriods.length > 0 && (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
            onClick={() => setAppendixOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Appendix: Additional Supportive Timeframes for Relationships
              </span>
              <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded-full px-1.5 py-0.5 leading-none">
                {appendixPeriods.length}
              </span>
            </div>
            <span className="text-slate-600 text-xs">{appendixOpen ? "\u25B2" : "\u25BC"}</span>
          </button>

          {appendixOpen && (
            <div className="px-4 py-4 space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                These periods show partial alignment of marriage indicators. While not as definitive as the strong periods above,
                they may coincide with meaningful relationship developments, deepening of bonds, or preparatory phases leading to commitment.
              </p>
              {appendixPeriods.map((period, i) => (
                <div
                  key={`mod-${i}`}
                  className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-amber-400">
                      Age {period.age}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Moderate
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{period.timeRange}</p>
                  <p className="text-[10px] text-slate-600 mb-1">{period.dasha}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{period.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footnote ── */}
      <p className="text-[10px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-800/50">
        Scope: forward-looking 5-year window from today. Ashtakvarga indicators reflect natal
        bindu strength — independent of the dasha-transit timing signals above, they describe the
        built-in support (or challenge) your chart brings to marriage.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Relationship Cautions (Divorce Risk) section
// ────────────────────────────────────────────────────────────────────────────

function RelationshipCautionsSection({ assessment }: { assessment: DivorceRiskAssessment }) {
  const [open, setOpen] = useState(false);

  const riskColor =
    assessment.overallRisk === "elevated"
      ? { badge: "bg-rose-500/20 text-rose-400 border-rose-500/30", dot: "text-rose-400", border: "border-rose-500/20" }
      : assessment.overallRisk === "moderate"
        ? { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", dot: "text-amber-400", border: "border-amber-500/20" }
        : assessment.findings.length === 0
          ? { badge: "bg-green-500/20 text-green-400 border-green-500/30", dot: "text-green-400", border: "border-green-500/20" }
          : { badge: "bg-slate-500/20 text-slate-400 border-slate-500/30", dot: "text-slate-400", border: "border-slate-500/20" };

  const riskLabel =
    assessment.overallRisk === "elevated" ? "Needs Attention"
    : assessment.overallRisk === "moderate" ? "Some Cautions"
    : assessment.findings.length === 0 ? "No Concerns"
    : "Minimal";

  const severityIcon = (sev: "high" | "moderate" | "mild") =>
    sev === "high" ? "\u26A0" : sev === "moderate" ? "\u25B3" : "\u25CB";

  const severityColor = (sev: "high" | "moderate" | "mild") =>
    sev === "high"
      ? "text-rose-400"
      : sev === "moderate"
        ? "text-amber-400"
        : "text-slate-500";

  return (
    <div className={`border ${riskColor.border} rounded-xl overflow-hidden bg-slate-900/30`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{"\uD83D\uDCA1"}</span>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Relationship Awareness & Cautions
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${riskColor.badge}`}>
            {riskLabel}
          </span>
        </div>
        <span className="text-slate-600 text-xs">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4">
          {/* Empathetic intro */}
          <div className="bg-slate-800/20 rounded-lg p-3 border border-slate-800/50">
            <p className="text-xs text-slate-400 leading-relaxed italic">
              {assessment.narrative}
            </p>
          </div>

          {/* Individual findings */}
          {assessment.findings.length > 0 ? (
            <div className="space-y-3">
              {assessment.findings.map((finding, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`text-xs mt-0.5 flex-shrink-0 ${severityColor(finding.severity)}`}>
                    {severityIcon(finding.severity)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-slate-300">{finding.rule}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${
                        finding.severity === "high"
                          ? "bg-rose-500/15 text-rose-400"
                          : finding.severity === "moderate"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-slate-500/15 text-slate-500"
                      }`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{finding.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">{"\u2713"}</span>
              <span className="text-slate-400">No classical Jaimini separation indicators were found in this chart. The sustaining houses of marriage are well-supported.</span>
            </div>
          )}

          {/* Reassuring footer */}
          <div className="pt-2 border-t border-slate-800/50">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {assessment.findings.length > 0
                ? "These observations are drawn from Jaimini Sutra principles (1.3.1\u20131.3.5 on Upa-Pada, 1.1.13\u20131.1.21 on Karakas). Astrological indicators reflect tendencies, not fixed destinies. Every relationship is ultimately shaped by the awareness, choices, and love that both partners bring to it."
                : "This assessment evaluates classical Jaimini indicators for marital challenges (Sutra 1.3.1\u20131.3.5 on Upa-Pada, 1.1.13\u20131.1.21 on Karakas). A clean reading here is a positive sign for marital harmony."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline sub-components
// ────────────────────────────────────────────────────────────────────────────

function TimelineContent({
  period,
  isPast,
  isExpanded,
  onToggle,
  alignRight,
}: {
  period: KeyPeriod;
  isPast?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  alignRight?: boolean;
}) {
  const isStrong = period.strength === "Strong";
  // Past: muted but still colored by strength; Future: full color
  const accentText = isPast
    ? (isStrong ? "text-green-600" : "text-amber-600")
    : (isStrong ? "text-green-400" : "text-amber-400");
  const strengthBadge = isPast
    ? (isStrong ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")
    : (isStrong ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400");

  return (
    <div>
      {/* Age + strength */}
      <div className={`flex items-center gap-2 mb-1 ${alignRight ? "justify-end" : ""}`}>
        <span className={`text-lg font-bold ${accentText}`}>
          Age {period.age}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strengthBadge}`}>
          {period.strength}
        </span>
        {isPast && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-500">
            Past
          </span>
        )}
      </div>

      {/* Time range + dasha */}
      <p className={`text-xs ${isPast ? "text-slate-600" : "text-slate-500"}`}>{period.timeRange}</p>
      <p className={`text-[10px] ${isPast ? "text-slate-700" : "text-slate-600"} mb-2`}>{period.dasha}</p>

      {/* Summary */}
      <p className={`text-xs leading-relaxed ${isPast ? "text-slate-500" : "text-slate-300"} ${alignRight ? "text-right" : ""}`}>
        {period.summary}
      </p>

      {/* Indication badges — muted for past, full for future */}
      <div className={`flex flex-wrap gap-1.5 mt-2 ${alignRight ? "justify-end" : ""}`}>
        {period.indicates.meetingPartner && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isPast ? "bg-blue-500/5 border-blue-500/10 text-blue-600" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
            Meeting partner
          </span>
        )}
        {period.indicates.engagement && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isPast ? "bg-purple-500/5 border-purple-500/10 text-purple-600" : "bg-purple-500/10 border-purple-500/20 text-purple-400"}`}>
            Engagement
          </span>
        )}
        {period.indicates.marriageFinalization && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isPast ? "bg-green-500/5 border-green-500/10 text-green-600" : "bg-green-500/10 border-green-500/20 text-green-400"}`}>
            Marriage
          </span>
        )}
      </div>

      {/* Expand for Vedic interpretations */}
      <button
        onClick={onToggle}
        className={`mt-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors ${alignRight ? "ml-auto block" : ""}`}
      >
        {isExpanded ? "\u25B2 Less detail" : "\u25BC What does this mean?"}
      </button>

      {isExpanded && (
        <div className={`mt-3 pt-3 border-t border-slate-700/50 space-y-2 ${alignRight ? "text-right" : ""}`}>
          {period.interpretations.map((interp, j) => (
            <div key={j} className={`flex items-start gap-2 text-[11px] ${alignRight ? "flex-row-reverse" : ""}`}>
              <span className="text-amber-500 mt-0.5 flex-shrink-0">{"\u2022"}</span>
              <span className="text-slate-400 leading-relaxed">{interp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Dasha Table with collapsible sub-periods
// ────────────────────────────────────────────────────────────────────────────

function DashaTable({ dashaSequence }: { dashaSequence: DashaPeriod[] }) {
  const [expandedMD, setExpandedMD] = useState<string | null>(null);
  const [expandedAD, setExpandedAD] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Sign</th>
            <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Lord</th>
            <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Lord In</th>
            <th className="text-center py-2 px-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Duration</th>
            <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Period</th>
          </tr>
        </thead>
        <tbody>
          {dashaSequence.map((d) => {
            const style = SIGN_STYLE[d.sign];
            const isMDExpanded = expandedMD === d.sign;

            return (
              <DashaPeriodRows
                key={d.sign}
                dasha={d}
                style={style}
                isMDExpanded={isMDExpanded}
                onToggleMD={() => {
                  setExpandedMD(isMDExpanded ? null : d.sign);
                  setExpandedAD(null);
                }}
                expandedAD={expandedAD}
                onToggleAD={(key) => setExpandedAD(expandedAD === key ? null : key)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Renders the main dasha row + optional sub-period rows + sub-sub-period rows */
function DashaPeriodRows({
  dasha: d,
  style,
  isMDExpanded,
  onToggleMD,
  expandedAD,
  onToggleAD,
}: {
  dasha: DashaPeriod;
  style: { icon: string; color: string; bg: string } | undefined;
  isMDExpanded: boolean;
  onToggleMD: () => void;
  expandedAD: string | null;
  onToggleAD: (key: string) => void;
}) {
  const hasSubPeriods = d.subPeriods && d.subPeriods.length > 0;

  return (
    <>
      {/* ── Maha Dasha row ── */}
      <tr
        className={`border-b border-slate-800/50 ${
          d.isCurrentPeriod ? "bg-amber-500/5" : "hover:bg-slate-800/30"
        } ${hasSubPeriods ? "cursor-pointer" : ""}`}
        onClick={hasSubPeriods ? onToggleMD : undefined}
      >
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-1.5">
            {hasSubPeriods && (
              <span className="text-slate-600 text-[10px] w-3 flex-shrink-0">
                {isMDExpanded ? "\u25BC" : "\u25B6"}
              </span>
            )}
            <span className={style?.color || "text-slate-400"}>{style?.icon || ""}</span>
            <span className={`font-medium ${d.isCurrentPeriod ? "text-amber-400" : "text-slate-200"}`}>
              {d.sign}
            </span>
            {d.isCurrentPeriod && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
                Current
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-2 text-slate-300">{d.lord}</td>
        <td className="py-2.5 px-2 text-slate-400">{d.lordSign}</td>
        <td className="py-2.5 px-2 text-center">
          <span className="text-slate-200 font-semibold">{d.duration}</span>
          <span className="text-slate-500 text-xs ml-0.5">yrs</span>
        </td>
        <td className="py-2.5 px-2 text-slate-400 text-xs">
          {formatDate(d.startDate)} – {formatDate(d.endDate)}
        </td>
      </tr>

      {/* ── Antar Dasha rows (sub-periods) ── */}
      {isMDExpanded && d.subPeriods?.map((sub, si) => {
        const subStyle = SIGN_STYLE[sub.sign];
        const adKey = `${d.sign}-${sub.sign}-${si}`;
        const isADExpanded = expandedAD === adKey;
        const hasSubSub = sub.subSubPeriods && sub.subSubPeriods.length > 0;

        return (
          <SubPeriodRows
            key={adKey}
            sub={sub}
            subStyle={subStyle}
            parentSign={d.sign}
            adKey={adKey}
            isADExpanded={isADExpanded}
            onToggleAD={() => onToggleAD(adKey)}
            hasSubSub={hasSubSub}
          />
        );
      })}
    </>
  );
}

/** Renders a sub-period row + optional sub-sub-period rows */
function SubPeriodRows({
  sub,
  subStyle,
  parentSign,
  adKey,
  isADExpanded,
  onToggleAD,
  hasSubSub,
}: {
  sub: SubPeriod;
  subStyle: { icon: string; color: string; bg: string } | undefined;
  parentSign: string;
  adKey: string;
  isADExpanded: boolean;
  onToggleAD: () => void;
  hasSubSub: boolean;
}) {
  return (
    <>
      <tr
        className={`border-b border-slate-800/30 ${
          sub.isCurrentPeriod ? "bg-amber-500/5" : "hover:bg-slate-800/20"
        } ${hasSubSub ? "cursor-pointer" : ""}`}
        onClick={hasSubSub ? onToggleAD : undefined}
      >
        <td className="py-2 px-2 pl-8">
          <div className="flex items-center gap-1.5">
            {hasSubSub && (
              <span className="text-slate-600 text-[10px] w-3 flex-shrink-0">
                {isADExpanded ? "\u25BC" : "\u25B6"}
              </span>
            )}
            <span className={`text-xs ${subStyle?.color || "text-slate-500"}`}>{subStyle?.icon || ""}</span>
            <span className={`text-xs ${sub.isCurrentPeriod ? "text-amber-400 font-medium" : "text-slate-400"}`}>
              {parentSign}–{sub.sign}
            </span>
            {sub.isCurrentPeriod && (
              <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1 py-0.5 leading-none">
                Active
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-2 text-xs text-slate-500">{sub.lord}</td>
        <td className="py-2 px-2 text-xs text-slate-500">{sub.lordSign}</td>
        <td className="py-2 px-2 text-center">
          <span className="text-xs text-slate-400">{formatSubDuration(sub.duration)}</span>
        </td>
        <td className="py-2 px-2 text-slate-500 text-[11px]">
          {formatDate(sub.startDate)} – {formatDate(sub.endDate)}
        </td>
      </tr>

      {/* ── Pratyantardasha rows (sub-sub-periods) ── */}
      {isADExpanded && sub.subSubPeriods?.map((ss, ssi) => {
        const ssStyle = SIGN_STYLE[ss.sign];
        return (
          <tr
            key={`${adKey}-${ss.sign}-${ssi}`}
            className={`border-b border-slate-800/20 ${
              ss.isCurrentPeriod ? "bg-amber-500/5" : "hover:bg-slate-800/10"
            }`}
          >
            <td className="py-1.5 px-2 pl-14">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${ssStyle?.color || "text-slate-600"}`}>{ssStyle?.icon || ""}</span>
                <span className={`text-[11px] ${ss.isCurrentPeriod ? "text-amber-400" : "text-slate-500"}`}>
                  {parentSign}–{sub.sign}–{ss.sign}
                </span>
                {ss.isCurrentPeriod && (
                  <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-1 py-0.5 leading-none">
                    Now
                  </span>
                )}
              </div>
            </td>
            <td className="py-1.5 px-2 text-[11px] text-slate-600">{ss.lord}</td>
            <td className="py-1.5 px-2 text-[11px] text-slate-600">{ss.lordSign}</td>
            <td className="py-1.5 px-2 text-center">
              <span className="text-[11px] text-slate-500">{formatSubSubDuration(ss.duration)}</span>
            </td>
            <td className="py-1.5 px-2 text-slate-600 text-[10px]">
              {formatDate(ss.startDate)} – {formatDate(ss.endDate)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

/** Format sub-period duration (years fraction → "X mo") */
function formatSubDuration(years: number): string {
  const months = Math.round(years * 12);
  return months >= 12 ? `${(months / 12).toFixed(0)} yr` : `${months} mo`;
}

/** Format sub-sub-period duration (years fraction → "X days") */
function formatSubSubDuration(years: number): string {
  const days = Math.round(years * 365.25);
  if (days >= 30) {
    const mo = (days / 30.44).toFixed(1);
    return `${mo} mo`;
  }
  return `${days} d`;
}

// ────────────────────────────────────────────────────────────────────────────

function CurrentDashaCard({
  dasha,
  planets,
}: {
  dasha: DashaPeriod;
  planets: ChartResponse["planets"];
}) {
  const style = SIGN_STYLE[dasha.sign];
  const today = new Date();
  const start = new Date(dasha.startDate + "T00:00:00");
  const end = new Date(dasha.endDate + "T00:00:00");
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = today.getTime() - start.getTime();
  const progressPct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const yearsRemaining = Math.max(0, (end.getTime() - today.getTime()) / (365.25 * 86400000));

  // Planets in the current dasha sign
  const occupants = planets.filter((p) => p.rashi === dasha.sign);

  return (
    <div className={`border rounded-xl overflow-hidden ${style?.bg || "bg-slate-800/30 border-slate-700"}`}>
      <div className="px-4 py-3 bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xl ${style?.color || ""}`}>{style?.icon || ""}</span>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Current Period: <span className="text-amber-400">{dasha.sign} Dasha</span>
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(dasha.startDate)} – {formatDate(dasha.endDate)} ({dasha.duration} years)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Remaining</p>
          <p className="text-sm font-semibold text-amber-400">{yearsRemaining.toFixed(1)} yrs</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{dasha.startYear}</span>
            <span>{Math.round(progressPct)}% elapsed</span>
            <span>{dasha.endYear}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Lord & occupants */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
            <p className="text-xs text-slate-500">Sign Lord</p>
            <p className="text-sm font-semibold text-slate-200">{dasha.lord} in {dasha.lordSign}</p>
          </div>
          {occupants.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
              <p className="text-xs text-slate-500">Planets in {dasha.sign}</p>
              <p className="text-sm font-semibold text-slate-200">
                {occupants.map((p) => p.name).join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
