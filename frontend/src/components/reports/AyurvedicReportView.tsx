"use client";

import React, { useState } from "react";
import { ChartResponse } from "@/lib/api";
import { AyurvedicReport } from "@/lib/ayurvedicReport";

interface Props {
  report: AyurvedicReport;
  chart: ChartResponse;
  name?: string;
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          {title}
        </span>
        <span className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          {"\u25B4"}
        </span>
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

function DoshaBar({ dosha, pct, color }: { dosha: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">{dosha}</span>
        <span className="text-slate-400">{pct}%</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StrengthBadge({ strength }: { strength: string }) {
  const cls =
    strength === "strong"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : strength === "moderate"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {strength.charAt(0).toUpperCase() + strength.slice(1)}
    </span>
  );
}

export function AyurvedicReportView({ report, chart, name }: Props) {
  const doshaColors: Record<string, string> = {
    Vata: "bg-blue-500",
    Pitta: "bg-red-500",
    Kapha: "bg-green-500",
  };

  return (
    <div className="space-y-5">
      {/* Report header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
        <p className="text-2xl">{"\u{1F33F}"}</p>
        <h2 className="text-xl font-bold text-amber-400">Ayurvedic Wellness Report</h2>
        <p className="text-sm text-slate-400">
          {name ? `${name} \u00b7 ` : ""}
          {chart.lagna} Lagna \u00b7 {chart.place.split(",")[0]} \u00b7 {chart.date} {chart.time}
        </p>
        <p className="text-xs text-slate-600">
          Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* 1. Dosha Constitution */}
      <Section title="Dosha Constitution (Prakriti)" icon={"\u{2697}\uFE0F"}>
        <div className="space-y-3">
          {[
            { dosha: "Vata", pct: report.doshaConstitution.vata },
            { dosha: "Pitta", pct: report.doshaConstitution.pitta },
            { dosha: "Kapha", pct: report.doshaConstitution.kapha },
          ].map((d) => (
            <DoshaBar
              key={d.dosha}
              dosha={d.dosha}
              pct={d.pct}
              color={doshaColors[d.dosha] || "bg-slate-500"}
            />
          ))}
        </div>
        <div className="bg-slate-800/40 rounded-lg p-4 mt-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your Constitution</p>
          <p className="text-sm text-slate-200 font-medium">
            {report.doshaConstitution.primaryDosha}
            {report.doshaConstitution.secondaryDosha ? `–${report.doshaConstitution.secondaryDosha}` : ""} Prakriti
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {report.doshaConstitution.description}
          </p>
        </div>
      </Section>

      {/* 2. Body Type */}
      <Section title="Body Type Profile" icon={"\u{1F9D8}"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Primary Dosha", value: report.bodyTypeProfile.primaryDosha },
            { label: "Secondary Dosha", value: report.bodyTypeProfile.secondaryDosha },
            { label: "Frame", value: report.bodyTypeProfile.frame },
            { label: "Metabolism", value: report.bodyTypeProfile.metabolism },
            { label: "Skin Type", value: report.bodyTypeProfile.skinType },
            { label: "Hair", value: report.bodyTypeProfile.hair },
            { label: "Digestion Pattern", value: report.bodyTypeProfile.digestionPattern },
            { label: "Sleep Pattern", value: report.bodyTypeProfile.sleepPattern },
            { label: "Energy Pattern", value: report.bodyTypeProfile.energyPattern },
          ].map((attr) => (
            <div key={attr.label} className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{attr.label}</p>
              <p className="text-sm text-slate-200 mt-0.5">{attr.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">{report.bodyTypeProfile.summary}</p>
      </Section>

      {/* 3. Health Planet Analysis */}
      <Section title="Health Planet Analysis" icon={"\u{2B50}"}>
        <div className="space-y-3">
          {report.healthPlanetAnalysis.map((hp) => (
            <div
              key={hp.planet}
              className="bg-slate-800/30 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-200">{hp.planet}</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {hp.rashi} \u00b7 House {hp.house}
                    {hp.dignity ? ` \u00b7 ${hp.dignity}` : ""}
                    {hp.isRetrograde ? " \u00b7 R" : ""}
                  </span>
                </div>
                <StrengthBadge strength={hp.strength} />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{hp.bodyAreas}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{hp.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. House Health Analysis */}
      <Section title="Health House Analysis" icon={"\u{1F3E0}"}>
        <div className="space-y-3">
          {report.houseHealthAnalysis.map((ha) => (
            <div key={ha.house} className="bg-slate-800/30 rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  House {ha.house} {"\u2014"} {ha.title}
                </span>
                <StrengthBadge strength={ha.lordStrength} />
              </div>
              <p className="text-xs text-slate-500">
                {ha.rashi} \u00b7 Lord: {ha.lord} in {ha.lordPlacement}
                {ha.occupants.length > 0 ? ` \u00b7 Occupied by: ${ha.occupants.join(", ")}` : ""}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">{ha.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Vulnerable Body Areas */}
      <Section title="Vulnerable Body Areas" icon={"\u{26A0}\uFE0F"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.vulnerableAreas.map((va, i) => (
            <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200">{va.bodyPart}</p>
              <p className="text-xs text-slate-500">{va.rashi}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{va.reason}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Dietary Recommendations */}
      <Section title="Dietary Recommendations" icon={"\u{1F957}"}>
        <div className="space-y-4">
          {report.dietaryRecommendations.generalGuidance && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">General Guidance</p>
              <p className="text-xs text-slate-400 leading-relaxed">{report.dietaryRecommendations.generalGuidance}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
                Foods to Favor
              </p>
              <ul className="space-y-1">
                {report.dietaryRecommendations.foods.filter((f) => f.action === "favor").map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                    <span>{f.food}{f.reasoning ? ` \u2014 ${f.reasoning}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
                Foods to Reduce
              </p>
              <ul className="space-y-1">
                {report.dietaryRecommendations.foods.filter((f) => f.action === "avoid").map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">{"\u2717"}</span>
                    <span>{f.food}{f.reasoning ? ` \u2014 ${f.reasoning}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {report.dietaryRecommendations.mealTiming && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">Meal Timing</p>
              <p className="text-xs text-slate-400 leading-relaxed">{report.dietaryRecommendations.mealTiming}</p>
            </div>
          )}
          {report.dietaryRecommendations.spices.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">Recommended Spices</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {report.dietaryRecommendations.spices.map((s) => (
                  <span
                    key={s.name}
                    className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5"
                    title={s.benefit}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 7. Yoga & Exercise */}
      <Section title="Yoga & Exercise Recommendations" icon={"\u{1F9D8}\u200D\u2640\uFE0F"}>
        <div className="space-y-3">
          {report.yogaExerciseRecommendations.asanas.map((a, i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200">{a.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.reasoning}</p>
            </div>
          ))}
          {report.yogaExerciseRecommendations.pranayama.length > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                Pranayama
              </p>
              {report.yogaExerciseRecommendations.pranayama.map((p, i) => (
                <div key={i}>
                  <p className="text-xs text-slate-200 font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          )}
          {report.yogaExerciseRecommendations.exerciseType && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">Exercise Type ({report.yogaExerciseRecommendations.intensity})</p>
              <p className="text-xs text-slate-400 leading-relaxed">{report.yogaExerciseRecommendations.exerciseType}</p>
            </div>
          )}
          {report.yogaExerciseRecommendations.bestTimeOfDay && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">Best Time for Exercise</p>
              <p className="text-xs text-slate-400">{report.yogaExerciseRecommendations.bestTimeOfDay}</p>
            </div>
          )}
        </div>
      </Section>

      {/* 8. Lifestyle Recommendations */}
      <Section title="Lifestyle Recommendations" icon={"\u{1F305}"}>
        <div className="space-y-3">
          {report.lifestyleRecommendations.sleepSchedule && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200">Sleep Schedule</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.lifestyleRecommendations.sleepSchedule}</p>
            </div>
          )}
          {report.lifestyleRecommendations.stressManagement && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200">Stress Management</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.lifestyleRecommendations.stressManagement}</p>
            </div>
          )}
          {report.lifestyleRecommendations.seasonalAdvice.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200 mb-2">Seasonal Advice</p>
              {report.lifestyleRecommendations.seasonalAdvice.map((sa, i) => (
                <div key={i} className="mb-1">
                  <span className="text-xs text-amber-400 font-medium">{sa.season}:</span>
                  <span className="text-xs text-slate-400 ml-1">{sa.advice}</span>
                </div>
              ))}
            </div>
          )}
          {report.lifestyleRecommendations.dailyRoutine.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-200 mb-2">Daily Routine</p>
              {report.lifestyleRecommendations.dailyRoutine.map((dr, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <span className="text-xs text-amber-400 font-medium whitespace-nowrap">{dr.time}</span>
                  <span className="text-xs text-slate-400">{dr.activity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 9. Health Period Timeline */}
      <Section title="Health Period Timeline" icon={"\u{1F4C5}"}>
        <div className="space-y-3">
          {report.healthPeriodTimeline.map((hp, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 border ${
                hp.type === "favorable"
                  ? "bg-green-500/5 border-green-500/10"
                  : hp.type === "cautious"
                  ? "bg-amber-500/5 border-amber-500/10"
                  : "bg-red-500/5 border-red-500/10"
              }${hp.isCurrent ? " ring-1 ring-amber-500/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-200">
                  {hp.dashaLord}{hp.isCurrent ? " (Current)" : ""}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    hp.type === "favorable"
                      ? "text-green-400"
                      : hp.type === "cautious"
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {hp.type === "favorable" ? "Favorable" : hp.type === "cautious" ? "Caution" : "Neutral"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{hp.startDate} \u2013 {hp.endDate}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{hp.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 10. Remedies */}
      <Section title="Remedies & Recommendations" icon={"\u{1F48E}"}>
        <div className="space-y-3">
          {report.remedies.map((r, i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">
                  {r.category}
                </span>
                <span className="text-sm font-semibold text-slate-200">{r.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Disclaimer */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Disclaimer:</strong> This report is based on traditional
          Vedic astrology and Ayurvedic principles. It is for informational and wellness purposes only
          and does not constitute medical advice. Always consult qualified healthcare professionals
          for medical decisions.
        </p>
      </div>

      {/* Download PDF button — placeholder, PDF generation will be added */}
      <div className="text-center">
        <button
          onClick={() => window.print()}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {"\u{1F4E5}"} Download / Print Report
        </button>
      </div>
    </div>
  );
}
