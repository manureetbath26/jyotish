"use client";

import { useState, useEffect } from "react";
import type { CharaDashaReport, DashaPeriod, Sign } from "@/lib/charaDashaEngine";
import type { ChartResponse } from "@/lib/api";
import { calculateCurrentTransits } from "@/lib/api";
import { preparePredictionInput } from "@/lib/jaiminiPredictiveEngine";
import {
  predictMarriage,
  type MarriagePredictionReport,
  type TransitPositions,
  type RuleResult,
} from "@/lib/jaiminiMarriagePrediction";

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
  const [marriageReport, setMarriageReport] = useState<MarriagePredictionReport | null>(null);
  const [marriageLoading, setMarriageLoading] = useState(false);
  const [marriageError, setMarriageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setMarriageLoading(true);
      setMarriageError(null);
      try {
        // Fetch current transits
        const transits = await calculateCurrentTransits(
          chart.ayanamsha_value,
          chart.lagna_degree,
        );

        // Extract Saturn, Mars, Jupiter transit signs
        const findSign = (name: string): Sign => {
          const p = transits.planets.find((pl) => pl.name === name);
          return (p?.rashi || "Aries") as Sign;
        };

        const transitPositions: TransitPositions = {
          saturn: findSign("Saturn"),
          mars: findSign("Mars"),
          jupiter: findSign("Jupiter"),
        };

        // Build prediction input and run marriage prediction
        const predInput = preparePredictionInput(chart);
        const mReport = predictMarriage(predInput, chart, transitPositions);

        if (!cancelled) setMarriageReport(mReport);
      } catch (err) {
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

        {/* Detailed table */}
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
              {report.dashaSequence.map((d) => {
                const style = SIGN_STYLE[d.sign];
                return (
                  <tr
                    key={d.sign}
                    className={`border-b border-slate-800/50 ${
                      d.isCurrentPeriod ? "bg-amber-500/5" : "hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 4: Marriage Prediction */}
      <Section title="Life Event: Marriage Prediction" badge="Jaimini">
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
        {marriageReport && <MarriagePredictionSection report={marriageReport} />}
      </Section>

      {/* Section 5: Interpretation placeholder */}
      <Section title="Interpretations" badge="Coming Soon">
        <div className="text-center py-8 space-y-3">
          <p className="text-slate-500 text-sm">
            Detailed sign-wise Chara Dasha interpretations will be available here soon.
          </p>
          <p className="text-xs text-slate-600">
            This section will include period-specific predictions for career, relationships,
            health, and finances based on the activated sign, its lord, and the planets
            occupying and aspecting it.
          </p>
        </div>
      </Section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Marriage Prediction Section
// ────────────────────────────────────────────────────────────────────────────

function MarriagePredictionSection({ report }: { report: MarriagePredictionReport }) {
  const strengthColors: Record<string, string> = {
    strong: "text-green-400 bg-green-500/10 border-green-500/30",
    moderate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    weak: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    "not indicated": "text-slate-400 bg-slate-800/60 border-slate-700",
  };

  return (
    <div className="space-y-4">
      {/* Overall assessment banner */}
      <div className={`border rounded-xl p-4 ${strengthColors[report.strength] || strengthColors["not indicated"]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              Marriage Indication: {report.isMarriageIndicated ? "Yes" : "No"}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              {report.rulesSatisfied} of {report.totalRules} rules satisfied — Strength: {report.strength.toUpperCase()}
            </p>
          </div>
          <div className="text-2xl">
            {report.strength === "strong" ? "\u2714" : report.strength === "moderate" ? "\u26A0" : "\u2012"}
          </div>
        </div>
      </div>

      {/* Key reference points */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Key Reference Points</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ReferenceChip label="UL (Upa-Pada)" value={report.ulSign} />
          <ReferenceChip label="AL (Arudha Lagna)" value={report.alSign} />
          <ReferenceChip label="7th House" value={report.seventhHouseSign} />
          <ReferenceChip label={`DK (${report.darakaraka})`} value={report.darakarakaSign} />
        </div>
      </div>

      {/* Current transits */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Current Transits</p>
        <div className="flex flex-wrap gap-2">
          <TransitChip planet="Saturn" sign={report.transit.saturn} natal={report.natalSaturnSign} />
          <TransitChip planet="Mars" sign={report.transit.mars} natal={report.natalMarsSign} />
          <TransitChip planet="Jupiter" sign={report.transit.jupiter} natal={report.natalJupiterSign} />
        </div>
      </div>

      {/* Current Dasha */}
      {(report.currentMD || report.currentAD) && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Current Chara Dasha</p>
          <div className="flex gap-2">
            {report.currentMD && <ReferenceChip label="Maha Dasha" value={report.currentMD} />}
            {report.currentAD && <ReferenceChip label="Antar Dasha" value={report.currentAD} />}
          </div>
        </div>
      )}

      {/* Rule-by-rule evaluation */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Rule Evaluation</p>
        <div className="space-y-2">
          {report.rules.map((rule) => (
            <RuleCard key={rule.ruleNumber} rule={rule} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReferenceChip({ label, value }: { label: string; value: string }) {
  const style = SIGN_STYLE[value];
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${style?.color || "text-slate-200"}`}>
        {style?.icon || ""} {value}
      </p>
    </div>
  );
}

function TransitChip({
  planet,
  sign,
  natal,
}: {
  planet: string;
  sign: string;
  natal: string;
}) {
  const style = SIGN_STYLE[sign];
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5 flex-1 min-w-[120px]">
      <p className="text-[10px] text-slate-500">Transit {planet}</p>
      <p className={`text-sm font-semibold ${style?.color || "text-slate-200"}`}>
        {style?.icon || ""} {sign}
      </p>
      <p className="text-[10px] text-slate-600">Natal: {natal}</p>
    </div>
  );
}

function RuleCard({ rule }: { rule: RuleResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        rule.isSatisfied
          ? "border-green-500/20 bg-green-500/5"
          : "border-slate-800 bg-slate-800/20"
      }`}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span
          className={`text-sm font-bold w-5 text-center ${
            rule.isSatisfied ? "text-green-400" : "text-slate-600"
          }`}
        >
          {rule.isSatisfied ? "\u2713" : "\u2717"}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${rule.isSatisfied ? "text-green-300" : "text-slate-400"}`}>
            Rule {rule.ruleNumber}: {rule.ruleName}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{rule.explanation}</p>
        </div>
        <span className="text-slate-600 text-xs flex-shrink-0">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800/50">
          <p className="text-[11px] text-slate-500 mb-2">{rule.description}</p>
          <div className="space-y-1">
            {rule.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className={check.met ? "text-green-500" : "text-slate-700"}>
                  {check.met ? "\u25CF" : "\u25CB"}
                </span>
                <div>
                  <span className={check.met ? "text-slate-300" : "text-slate-600"}>
                    {check.condition}
                  </span>
                  <p className="text-slate-600 text-[10px]">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
