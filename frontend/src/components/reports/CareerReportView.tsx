"use client";

import { useState, useEffect } from "react";
import type { ChartResponse } from "@/lib/api";
import { fetchLifetimeTransits } from "@/lib/api";
import { preparePredictionInput } from "@/lib/jaiminiPredictiveEngine";
import {
  scanCareerWindows,
} from "@/lib/jaiminiCareerPrediction";
import {
  generateFutureTransitSnapshots,
  type TransitPositions,
} from "@/lib/jaiminiMarriagePrediction";
import {
  generateCareerReport,
  type CareerReport,
  type CareerKeyPeriod,
} from "@/lib/jaiminiCareerReport";
import type { Sign } from "@/lib/charaDashaEngine";

interface Props {
  chart: ChartResponse;
  userName?: string;
  onBack?: () => void;
}

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
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-1.5 py-0.5 leading-none">
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

export function CareerReportView({ chart, userName, onBack }: Props) {
  const [report, setReport] = useState<CareerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const predInput = preparePredictionInput(chart);
        const birthDate = new Date(chart.date + "T00:00:00");
        const birthYear = birthDate.getFullYear();

        const getNatalSign = (name: string): Sign => {
          const p = chart.planets.find((pl) => pl.name === name);
          return (p?.rashi || "Aries") as Sign;
        };

        // Fetch lifetime transit snapshots
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
          console.warn("[Career] Lifetime transit API failed, generating estimates");
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

        const scan = scanCareerWindows(
          predInput,
          chart,
          allSnapshots,
          80,
          chart.date,
        );

        if (cancelled) return;

        const careerRpt = generateCareerReport(predInput, chart, scan, {
          futureOnly: false,
          birthYear,
        });

        if (!cancelled) setReport(careerRpt);
      } catch (err) {
        console.error("[Career] Unexpected error:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to calculate career prediction",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div className="space-y-5">
      {/* Back */}
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          {"\u2190"} Back
        </button>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F4BC}"}</span>
          Career Report
        </h1>
        <p className="text-sm text-slate-400">
          Jaimini Chara Dasha Career Analysis
        </p>
      </div>

      {/* Birth details */}
      <Section title="Birth Details" defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {userName && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
              <p className="text-sm text-slate-200 font-medium">{userName}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Date of Birth</p>
            <p className="text-sm text-slate-200">{formatDate(chart.date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Time of Birth</p>
            <p className="text-sm text-slate-200">{chart.time}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Place</p>
            <p className="text-sm text-slate-200 truncate">{chart.place?.split(",").slice(0, 2).join(",")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Ascendant</p>
            <p className="text-sm font-semibold text-blue-400">{chart.lagna}</p>
          </div>
        </div>
      </Section>

      {/* Main report */}
      <Section title="Career Outlook" badge="Jaimini Chara Dasha" defaultOpen>
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Analyzing career indicators...</span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {report && <CareerReportContent report={report} />}
      </Section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Career Report Content
// ────────────────────────────────────────────────────────────────────────────

function CareerReportContent({ report }: { report: CareerReport }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [appendixOpen, setAppendixOpen] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  // Split into strong / moderate
  const allStrong = report.keyPeriods.filter((p) => p.strength === "Strong");
  const allModerate = report.keyPeriods.filter((p) => p.strength === "Moderate");
  const hasStrongPeriods = allStrong.length > 0;
  const timelinePeriods = hasStrongPeriods
    ? allStrong
    : [...allModerate].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const appendixPeriods = hasStrongPeriods ? allModerate : [];
  const pastTimeline = timelinePeriods.filter((p) => p.startDate < todayStr);
  const futureTimeline = timelinePeriods.filter((p) => p.startDate >= todayStr);

  // Theme colors
  const dotColor = hasStrongPeriods ? "bg-blue-500" : "bg-cyan-500";
  const cardBorder = hasStrongPeriods ? "border-blue-500/30" : "border-cyan-500/30";
  const cardBg = hasStrongPeriods ? "bg-blue-500/5" : "bg-cyan-500/5";
  const confColor =
    report.verdict.confidence === "High"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : report.verdict.confidence === "Medium"
        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        : "bg-slate-500/20 text-slate-400 border-slate-500/30";

  const indicationIcons = (period: CareerKeyPeriod) => {
    const items: { icon: string; label: string }[] = [];
    if (period.indicates.promotion) items.push({ icon: "\u2B06", label: "Promotion" });
    if (period.indicates.jobChange) items.push({ icon: "\u{1F504}", label: "Job Change" });
    if (period.indicates.businessLaunch) items.push({ icon: "\u{1F680}", label: "Business Launch" });
    if (period.indicates.recognition) items.push({ icon: "\u2B50", label: "Recognition" });
    return items;
  };

  return (
    <div className="space-y-5">
      {/* ── Career Verdict ── */}
      <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{"\u{1F3AF}"}</span>
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
            Career Verdict
          </h3>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${confColor}`}>
            {report.verdict.confidence} Confidence
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{report.verdict.narrative}</p>
        {report.verdict.topPeriods.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {report.verdict.topPeriods.map((p, i) => (
              <span
                key={i}
                className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full px-2 py-0.5"
              >
                {i === 0 ? "\u2B50 " : ""}{p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Career Nature & Sectors ── */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{"\u{1F4BC}"}</span>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Career Nature & Sectors
          </h4>
          <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full px-1.5 py-0.5">
            {report.careerNature.primaryMode}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {report.careerNature.modeExplanation}
        </p>

        {/* Sector chips */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Suggested Sectors</p>
          <div className="flex flex-wrap gap-1.5">
            {report.careerNature.sectors.map((s, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/30 rounded-full px-2 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          {report.careerNature.sectorExplanation}
        </p>

        {/* Current dasha theme */}
        {report.careerNature.currentDashaTheme && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mt-2">
            <p className="text-[10px] text-blue-400 uppercase tracking-wide font-medium mb-1">
              Current Dasha Career Theme
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {report.careerNature.currentDashaTheme}
            </p>
          </div>
        )}
      </div>

      {/* ── Career Natal Profile ── */}
      <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">Natal Career Factors</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-600">10th House: </span>
            <span className="text-slate-300 font-medium">{report.natalProfile.tenthSign}</span>
          </div>
          <div>
            <span className="text-slate-600">10th Lord: </span>
            <span className="text-slate-300 font-medium">{report.natalProfile.tenthLord} in {report.natalProfile.tenthLordSign}</span>
          </div>
          <div>
            <span className="text-slate-600">AmK: </span>
            <span className="text-blue-400 font-medium">{report.natalProfile.amk} in {report.natalProfile.amkSign}</span>
          </div>
          <div>
            <span className="text-slate-600">A10 (Rajya): </span>
            <span className="text-slate-300 font-medium">{report.natalProfile.a10Sign}</span>
          </div>
          <div>
            <span className="text-slate-600">AL: </span>
            <span className="text-slate-300 font-medium">{report.natalProfile.alSign}</span>
          </div>
          {report.natalProfile.karakamsha && (
            <div>
              <span className="text-slate-600">Karakamsha: </span>
              <span className="text-slate-300 font-medium">{report.natalProfile.karakamsha}</span>
            </div>
          )}
          {report.natalProfile.tenthFromKarakamsha && (
            <div>
              <span className="text-slate-600">10th from KM: </span>
              <span className="text-slate-300 font-medium">{report.natalProfile.tenthFromKarakamsha}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Career Timeline ── */}
      {(pastTimeline.length > 0 || futureTimeline.length > 0) && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
            Career Growth Timeline
          </p>

          {/* Past */}
          {pastTimeline.length > 0 && (
            <div className="space-y-2 mb-3">
              {pastTimeline.map((period, i) => {
                const globalIdx = timelinePeriods.indexOf(period);
                return (
                  <CareerCard
                    key={`past-${i}`}
                    period={period}
                    isPast
                    isExpanded={expandedIdx === globalIdx}
                    onToggle={() => setExpandedIdx(expandedIdx === globalIdx ? null : globalIdx)}
                    icons={indicationIcons(period)}
                    dotColor={dotColor}
                    cardBorder={cardBorder}
                    cardBg={cardBg}
                  />
                );
              })}
            </div>
          )}

          {/* Now marker */}
          {pastTimeline.length > 0 && futureTimeline.length > 0 && (
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-blue-500/30" />
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Now
              </span>
              <div className="flex-1 h-px bg-blue-500/30" />
            </div>
          )}

          {/* Future */}
          {futureTimeline.length > 0 && (
            <div className="space-y-2">
              {futureTimeline.map((period, i) => {
                const globalIdx = timelinePeriods.indexOf(period);
                return (
                  <CareerCard
                    key={`future-${i}`}
                    period={period}
                    isPast={false}
                    isExpanded={expandedIdx === globalIdx}
                    onToggle={() => setExpandedIdx(expandedIdx === globalIdx ? null : globalIdx)}
                    icons={indicationIcons(period)}
                    dotColor={dotColor}
                    cardBorder={cardBorder}
                    cardBg={cardBg}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {timelinePeriods.length === 0 && (
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500">No significant career periods found in the analyzed timeframe.</p>
        </div>
      )}

      {/* ── Growth Indicators ── */}
      {report.strongIndicators.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Growth Indicators</p>
          <div className="space-y-2">
            {report.strongIndicators.map((ind, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">{"\u25CF"}</span>
                <span className="text-slate-300 leading-relaxed">{ind}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Challenges ── */}
      {report.challenges.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
            Career Challenges &amp; Stagnation Risks
          </p>
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

      {/* ── Appendix ── */}
      {appendixPeriods.length > 0 && (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
            onClick={() => setAppendixOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Appendix: Additional Career Windows
              </span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-500 border border-cyan-500/20 rounded-full px-1.5 py-0.5 leading-none">
                {appendixPeriods.length}
              </span>
            </div>
            <span className="text-slate-600 text-xs">{appendixOpen ? "\u25B2" : "\u25BC"}</span>
          </button>

          {appendixOpen && (
            <div className="px-4 py-4 space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                These periods show partial alignment of career indicators. While not as definitive as the strong periods above,
                they may coincide with incremental career developments, skill building, or preparatory phases.
              </p>
              {appendixPeriods.map((period, i) => {
                const isPast = period.startDate < todayStr;
                return (
                  <div
                    key={`cmod-${i}`}
                    className={`border border-cyan-500/20 bg-cyan-500/5 rounded-lg p-3 ${isPast ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold ${isPast ? "text-slate-500" : "text-cyan-400"}`}>
                        Age {period.age}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                        Moderate
                      </span>
                      {isPast && <span className="text-[10px] text-slate-600 italic">Past</span>}
                    </div>
                    <p className="text-xs text-slate-500">{period.timeRange}</p>
                    <p className="text-[10px] text-slate-600 mb-1">{period.dasha}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{period.summary}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Footnote ── */}
      <p className="text-[10px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-800/50">
        Career analysis based on Jaimini Chara Dasha principles (10th house, Amatya Karaka, A10 Rajya Pada, Karakamsha).
        Planetary alignments before age 16 have been excluded. Transit positions are approximate for distant future periods.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Career Card
// ────────────────────────────────────────────────────────────────────────────

function CareerCard({
  period,
  isPast,
  isExpanded,
  onToggle,
  icons,
  dotColor,
  cardBorder,
  cardBg,
}: {
  period: CareerKeyPeriod;
  isPast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  icons: { icon: string; label: string }[];
  dotColor: string;
  cardBorder: string;
  cardBg: string;
}) {
  const isStrong = period.strength === "Strong";
  const accentText = isPast
    ? (isStrong ? "text-blue-600" : "text-cyan-600")
    : (isStrong ? "text-blue-400" : "text-cyan-400");
  const strengthBadge = isPast
    ? (isStrong ? "bg-blue-500/10 text-blue-600" : "bg-cyan-500/10 text-cyan-600")
    : (isStrong ? "bg-blue-500/20 text-blue-400" : "bg-cyan-500/20 text-cyan-400");

  return (
    <div
      className={`border ${isPast ? "border-slate-700/50" : cardBorder} ${isPast ? "bg-slate-800/20" : cardBg} rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-slate-800/40`}
      onClick={onToggle}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${isPast ? "bg-slate-600" : dotColor}`} />
          <span className={`text-sm font-bold ${accentText}`}>Age {period.age}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strengthBadge}`}>
            {period.strength}
          </span>
          {isPast && <span className="text-[10px] text-slate-600 italic">Past</span>}
          {icons.map((ic, j) => (
            <span
              key={j}
              className={`text-[9px] px-1 py-0.5 rounded ${
                isPast ? "bg-slate-700/50 text-slate-500" : "bg-blue-500/10 text-blue-300"
              }`}
            >
              {ic.icon} {ic.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500">{period.timeRange}</p>
        <p className="text-[10px] text-slate-600">{period.dasha}</p>
        <p className="text-xs text-slate-400 leading-relaxed mt-1">{period.summary}</p>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-800/50 pt-2">
          {period.interpretations.map((interp, k) => (
            <div key={k} className="flex items-start gap-2 text-[11px]">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">{"\u25B8"}</span>
              <span className="text-slate-400 leading-relaxed">{interp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
