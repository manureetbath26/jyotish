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
} from "@/lib/jaiminiCareerReport";
import {
  computeAshtakvarga,
  type AshtakvargaRule,
} from "@/lib/ashtakvargaEngine";
import {
  computeCareerAshtakvargaInsights,
  type CareerAshtakvargaInsights,
} from "@/lib/careerAshtakvargaInsights";
import { CareerAshtakvargaPanel } from "@/components/CareerAshtakvargaPanel";
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
  const [ashtakvargaInsights, setAshtakvargaInsights] =
    useState<CareerAshtakvargaInsights | null>(null);
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

        // ── 5-year forward scan from today ──
        const scan = scanCareerWindows(
          predInput,
          chart,
          allSnapshots,
          5,
          undefined, // default: from today
        );

        if (cancelled) return;

        const careerRpt = generateCareerReport(predInput, chart, scan, {
          futureOnly: true,
          birthYear,
        });

        if (!cancelled) setReport(careerRpt);

        // ── Compute Ashtakvarga career insights ──
        try {
          const rulesRes = await fetch("/api/ashtakvarga/rules");
          if (rulesRes.ok) {
            const rules: AshtakvargaRule[] = await rulesRes.json();
            const analysis = computeAshtakvarga(chart, rules);
            const insights = computeCareerAshtakvargaInsights(
              analysis,
              careerRpt.natalProfile.a10Sign,
              careerRpt.natalProfile.amk,
            );
            if (!cancelled) setAshtakvargaInsights(insights);
          }
        } catch (err) {
          console.warn("[Career] Ashtakvarga insights failed:", err);
        }
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
        {report && (
          <CareerReportContent
            report={report}
            ashtakvargaInsights={ashtakvargaInsights}
          />
        )}
      </Section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Career Report Content
// ────────────────────────────────────────────────────────────────────────────

function CareerReportContent({
  report,
  ashtakvargaInsights,
}: {
  report: CareerReport;
  ashtakvargaInsights: CareerAshtakvargaInsights | null;
}) {
  const confColor =
    report.verdict.confidence === "High"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : report.verdict.confidence === "Medium"
        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        : "bg-slate-500/20 text-slate-400 border-slate-500/30";

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

      {/* ── Career Success Assessment ── */}
      <CareerSuccessSection assessment={report.successAssessment} />

      {/* ── Career Direction ── */}
      <CareerDirectionSection analysis={report.directionAnalysis} />

      {/* ── Sector Deep Dive ── */}
      <SectorDeepDiveSection dive={report.sectorDeepDive} />

      {/* ── Growth Potential ── */}
      <GrowthPotentialSection growth={report.growthPotential} />

      {/* ── Ashtakvarga career indicators (natal evidence) ── */}
      {ashtakvargaInsights && (
        <div className="border border-blue-500/20 bg-blue-500/[0.03] rounded-xl p-4 sm:p-5">
          <CareerAshtakvargaPanel insights={ashtakvargaInsights} />
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

      {/* ── Footnote ── */}
      <p className="text-[10px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-800/50">
        Scope: forward-looking 5-year window from today. Based on Jaimini Chara Dasha
        principles (10th house, Amatya Karaka, A10 Rajya Pada, Karakamsha). Ashtakvarga
        indicators reflect natal bindu strength — independent of the dasha-transit timing
        signals above, they describe the built-in support your chart brings to career.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Career Success Assessment
// ────────────────────────────────────────────────────────────────────────────

function CareerSuccessSection({ assessment }: { assessment: CareerReport["successAssessment"] }) {
  const ratingColor: Record<string, string> = {
    Exceptional: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Strong: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Good: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    Moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Gradual: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  const barColor: Record<string, string> = {
    Exceptional: "bg-emerald-500",
    Strong: "bg-blue-500",
    Good: "bg-cyan-500",
    Moderate: "bg-amber-500",
    Gradual: "bg-slate-500",
  };
  const impactColor = (impact: "high" | "medium" | "low") =>
    impact === "high" ? "text-emerald-400"
    : impact === "medium" ? "text-blue-400"
    : "text-slate-500";

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">{"\u{1F3C6}"}</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Career Success Potential</h4>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ratingColor[assessment.rating]}`}>
          {assessment.rating}
        </span>
        <span className="text-[10px] text-slate-500 ml-auto">{assessment.score}/100</span>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor[assessment.rating]} transition-all`}
          style={{ width: `${assessment.score}%` }}
        />
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{assessment.narrative}</p>

      {assessment.strengths.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Natal Strengths</p>
          <div className="space-y-1.5">
            {assessment.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">{"\u2713"}</span>
                <span className="text-slate-400 leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assessment.successFactors.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Contributing Factors</p>
          <div className="flex flex-wrap gap-1.5">
            {assessment.successFactors.map((f, i) => (
              <span
                key={i}
                className={`text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/30 ${impactColor(f.impact)}`}
              >
                {f.factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Career Direction
// ────────────────────────────────────────────────────────────────────────────

function CareerDirectionSection({ analysis }: { analysis: CareerReport["directionAnalysis"] }) {
  const leadershipColor: Record<string, string> = {
    High: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Moderate: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Supportive: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };
  const fitColor: Record<string, string> = {
    "Best fit": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "Excellent fit": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "Strong fit": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{"\u{1F9ED}"}</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Career Direction & Strategy</h4>
      </div>

      {/* Optimal Paths */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Optimal Career Paths</p>
        {analysis.optimalPaths.map((path, i) => (
          <div key={i} className="border border-slate-800 bg-slate-800/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-200">{path.title}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${fitColor[path.fit]}`}>
                {path.fit}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{path.reasoning}</p>
            {path.specificRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {path.specificRoles.map((r, j) => (
                  <span
                    key={j}
                    className="text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/30 rounded-full px-2 py-0.5"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Leadership */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs">{"\u{1F451}"}</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Leadership Profile</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${leadershipColor[analysis.leadership.rating]}`}>
            {analysis.leadership.rating}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.leadership.narrative}</p>
        {analysis.leadership.strengths.length > 0 && (
          <ul className="space-y-1">
            {analysis.leadership.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">{"\u25B8"}</span>
                <span className="text-slate-400 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Work style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Work Environment</p>
          <p className="text-xs font-semibold text-slate-200 mb-1">{analysis.workStyle.environment}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.workStyle.environmentReasoning}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Pace & Rhythm</p>
          <p className="text-xs font-semibold text-slate-200 mb-1">{analysis.workStyle.pace}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.workStyle.paceReasoning}</p>
        </div>
      </div>

      {/* Collaboration */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Collaboration Style</p>
        <p className="text-xs font-semibold text-slate-200 mb-1">{analysis.collaborationStyle}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.collaborationReasoning}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sector Deep Dive
// ────────────────────────────────────────────────────────────────────────────

function SectorDeepDiveSection({ dive }: { dive: CareerReport["sectorDeepDive"] }) {
  const fitColor: Record<string, string> = {
    "Perfect fit": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "Excellent fit": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "Strong fit": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    "Good fit": "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  const stabilityColor: Record<string, string> = {
    Stable: "text-emerald-400",
    "Variable with upside": "text-blue-400",
    Mixed: "text-amber-400",
  };
  const wealthColor: Record<string, string> = {
    Strong: "text-emerald-400",
    Moderate: "text-blue-400",
    Gradual: "text-amber-400",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{"\u{1F3E2}"}</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sectors & Industries Deep Dive</h4>
      </div>

      {/* Top sectors */}
      <div className="space-y-2">
        {dive.topSectors.map((s, i) => (
          <div key={i} className="border border-slate-800 bg-slate-800/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-200">{s.sector}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${fitColor[s.fit]}`}>
                {s.fit}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{s.reasoning}</p>
            {s.specificRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.specificRoles.map((r, j) => (
                  <span
                    key={j}
                    className="text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/30 rounded-full px-2 py-0.5"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Organization size + wealth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Organization Size Fit</p>
          <p className="text-xs font-semibold text-slate-200 mb-1">{dive.organizationSize}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">{dive.sizeReasoning}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Income & Wealth</p>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${stabilityColor[dive.incomeStability]}`}>
              {dive.incomeStability}
            </span>
            <span className="text-slate-600 text-[10px]">{"\u00B7"}</span>
            <span className={`text-[10px] font-semibold ${wealthColor[dive.wealthAccumulation]}`}>
              {dive.wealthAccumulation} accumulation
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{dive.incomeNarrative}</p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Growth Potential
// ────────────────────────────────────────────────────────────────────────────

function GrowthPotentialSection({ growth }: { growth: CareerReport["growthPotential"] }) {
  const trajectoryColor: Record<string, string> = {
    "Early bloomer": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "Steady climb": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "Mid-life peak": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "Late bloomer": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "Uneven": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  const intensityColor: Record<string, string> = {
    Peak: "bg-emerald-500/20 text-emerald-300",
    High: "bg-blue-500/20 text-blue-300",
    Moderate: "bg-cyan-500/20 text-cyan-300",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">{"\u{1F4C8}"}</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Growth Potential & Trajectory</h4>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${trajectoryColor[growth.trajectory]}`}>
          {growth.trajectory}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{growth.trajectoryNarrative}</p>

      {/* Peak decades */}
      {growth.peakDecades.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Peak Life Phases for Career</p>
          <div className="space-y-2">
            {growth.peakDecades.map((d, i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-800/30 border border-slate-800 rounded-lg p-2.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${intensityColor[d.intensity]} flex-shrink-0`}>
                  {d.intensity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{d.ageRange}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{d.themes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accelerators */}
      {growth.accelerators.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Growth Accelerators</p>
          <div className="space-y-1.5">
            {growth.accelerators.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">{"\u21E1"}</span>
                <span className="text-slate-400 leading-relaxed">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ceiling factors */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Ceiling Factors & Limits</p>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{growth.ceilingNarrative}</p>
        {growth.ceilingFactors.length > 0 && (
          <div className="space-y-1.5">
            {growth.ceilingFactors.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">{"\u21E3"}</span>
                <span className="text-slate-400 leading-relaxed">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
