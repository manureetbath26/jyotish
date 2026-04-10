"use client";

import React, { useState } from "react";
import { ChartResponse } from "@/lib/api";
import {
  LifeEventsReport,
  EventCategory,
  DashaPrediction,
  LifeHighlight,
  YogaInfluence,
} from "@/lib/lifeEventsReport";

interface Props {
  report: LifeEventsReport;
  chart: ChartResponse;
  name?: string;
}

/* ── Shared UI Helpers ────────────────────────────────────────────────────── */

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
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
        <span className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>{"\u25B4"}</span>
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

function NatureBadge({ nature }: { nature: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    very_favorable: { bg: "bg-green-500/10 border-green-500/20", text: "text-green-400", label: "Very Favorable" },
    favorable: { bg: "bg-green-500/10 border-green-500/20", text: "text-green-400", label: "Favorable" },
    mixed: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", label: "Mixed" },
    challenging: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "Challenging" },
    needs_care: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "Needs Care" },
  };
  const s = map[nature] || map.mixed;
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label}</span>;
}

function OutlookBadge({ outlook }: { outlook: string }) {
  const map: Record<string, { color: string; label: string }> = {
    very_favorable: { color: "text-green-400", label: "Very Favorable" },
    favorable: { color: "text-emerald-400", label: "Favorable" },
    mixed: { color: "text-amber-400", label: "Mixed" },
    challenging: { color: "text-orange-400", label: "Challenging" },
    needs_care: { color: "text-red-400", label: "Needs Care" },
  };
  const s = map[outlook] || map.mixed;
  return <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

function LikelihoodBadge({ likelihood }: { likelihood: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    very_likely: { bg: "bg-green-500/10 border-green-500/20", text: "text-green-400", label: "Very Likely" },
    likely: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Likely" },
    possible: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", label: "Possible" },
    unlikely: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", label: "Unlikely" },
  };
  const s = map[likelihood] || map.possible;
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label}</span>;
}

function StrengthBar({ strength }: { strength: string }) {
  const colors: Record<string, string> = {
    strong: "bg-green-500",
    moderate: "bg-amber-500",
    weak: "bg-red-500",
  };
  const widths: Record<string, string> = { strong: "100%", moderate: "60%", weak: "30%" };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[strength] || "bg-slate-500"}`} style={{ width: widths[strength] || "50%" }} />
      </div>
      <span className="text-xs text-slate-500 capitalize">{strength}</span>
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/* ── PDF Download ─────────────────────────────────────────────────────────── */

async function downloadReportPdf(report: LifeEventsReport, chart: ChartResponse, name?: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const colors = {
    gold: [212, 175, 55] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    text: [40, 40, 50] as [number, number, number],
    gray: [120, 120, 140] as [number, number, number],
    green: [22, 163, 74] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
    amber: [217, 119, 6] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    line: [200, 200, 210] as [number, number, number],
  };

  function footer() {
    doc.setFontSize(7);
    doc.setTextColor(...colors.gray);
    doc.text("Generated by Jyotish — Vedic Astrology", pageW / 2, pageH - 8, { align: "center" });
  }

  function checkPage(needed: number) {
    if (y + needed > pageH - 18) {
      footer();
      doc.addPage();
      y = margin;
    }
  }

  function sectionTitle(title: string) {
    checkPage(16);
    y += 4;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y - 5, contentW, 10, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 1.5);
    y += 10;
  }

  function bodyText(text: string) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin, y);
      y += 4;
    }
  }

  // === HEADER ===
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, pageW, 42, "F");
  doc.setFontSize(22);
  doc.setTextColor(...colors.gold);
  doc.setFont("helvetica", "bold");
  doc.text("Life Events Prediction Report", pageW / 2, 16, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 220);
  doc.setFont("helvetica", "normal");
  const sub = `${name ? name + " | " : ""}${chart.lagna} Lagna | ${chart.place.split(",")[0]} | ${chart.date} ${chart.time}`;
  doc.text(sub, pageW / 2, 26, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 160);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, pageW / 2, 35, { align: "center" });
  y = 50;

  // === CHART SUMMARY ===
  sectionTitle("Chart Summary");
  bodyText(report.chartSummary.description);
  y += 2;

  // === EVENT CATEGORIES ===
  sectionTitle("Life Area Outlook");
  for (const cat of report.eventCategories) {
    checkPage(12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.text);
    doc.text(`${cat.icon} ${cat.name}`, margin, y);
    const outlookColor = cat.overallOutlook.includes("favorable") ? colors.green : cat.overallOutlook === "mixed" ? colors.amber : colors.red;
    doc.setTextColor(...outlookColor);
    doc.setFontSize(8);
    doc.text(`[${cat.overallOutlook.replace(/_/g, " ").toUpperCase()}]`, margin + 60, y);
    y += 4.5;
    bodyText(cat.summary);
    y += 2;
  }

  // === PAST HIGHLIGHTS ===
  if (report.pastHighlights && report.pastHighlights.length > 0) {
    sectionTitle("Past Life Events - Looking Back");
    for (const h of report.pastHighlights) {
      checkPage(14);
      const evColor = h.type === "positive" ? colors.green : h.type === "negative" ? colors.red : colors.amber;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...evColor);
      doc.text(h.event, margin, y);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.gray);
      doc.text(`${h.window} | ${h.dashaContext} | [Past]`, margin, y + 4);
      y += 8.5;
      bodyText(h.reasoning);
      y += 2;
    }
  }

  // === UPCOMING HIGHLIGHTS ===
  sectionTitle("Upcoming Life Event Predictions");
  for (const h of report.upcomingHighlights) {
    checkPage(14);
    const evColor = h.type === "positive" ? colors.green : h.type === "negative" ? colors.red : colors.amber;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...evColor);
    doc.text(h.event, margin, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.gray);
    doc.text(`${h.window} | ${h.dashaContext} | ${h.likelihood.replace(/_/g, " ")}`, margin, y + 4);
    y += 8.5;
    bodyText(h.reasoning);
    y += 2;
  }

  // === DASHA PREDICTIONS ===
  sectionTitle("Dasha Timeline Predictions");
  for (const dp of report.dashaPredictions) {
    checkPage(16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.text);
    doc.text(`${dp.planet} Mahadasha${dp.isCurrent ? " (Current)" : ""}`, margin, y);
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text(`${dp.startDate.slice(0, 7)} to ${dp.endDate.slice(0, 7)} | ${dp.planetRole}`, margin, y + 4.5);
    y += 9;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text(`Themes: ${dp.themes.join(", ")}`, margin, y);
    y += 5;
    for (const ep of dp.eventPredictions) {
      checkPage(10);
      const epColor = ep.type === "positive" ? colors.green : ep.type === "negative" ? colors.red : colors.amber;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...epColor);
      doc.text(`[${ep.likelihood.replace(/_/g, " ").toUpperCase()}]`, margin + 2, y);
      doc.setTextColor(...colors.text);
      const descLines = doc.splitTextToSize(ep.description, contentW - 30);
      doc.text(descLines[0] || "", margin + 25, y);
      y += 4;
      for (let li = 1; li < descLines.length; li++) {
        checkPage(4);
        doc.text(descLines[li], margin + 25, y);
        y += 4;
      }
    }
    y += 3;
  }

  // === CURRENT PERIOD ===
  sectionTitle("Current Period Analysis");
  bodyText(report.currentPeriodAnalysis.detailedAnalysis);
  y += 2;
  if (report.currentPeriodAnalysis.opportunities.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.green);
    doc.text("Opportunities:", margin, y);
    y += 5;
    for (const opp of report.currentPeriodAnalysis.opportunities) {
      checkPage(5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      doc.text(`+ ${opp}`, margin + 3, y);
      y += 4;
    }
    y += 2;
  }
  if (report.currentPeriodAnalysis.cautions.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.amber);
    doc.text("Points of Mindfulness:", margin, y);
    y += 5;
    for (const c of report.currentPeriodAnalysis.cautions) {
      checkPage(5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      doc.text(`- ${c}`, margin + 3, y);
      y += 4;
    }
    y += 2;
  }

  // === YOGA INFLUENCES ===
  if (report.yogaInfluences.length > 0) {
    sectionTitle("Key Yoga Influences");
    for (const yoga of report.yogaInfluences) {
      if (!yoga.isPresent) continue;
      checkPage(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.text);
      doc.text(yoga.name, margin, y);
      doc.setFontSize(8);
      doc.setTextColor(...colors.gray);
      doc.text(`[${yoga.strength.toUpperCase()}]`, margin + doc.getTextWidth(yoga.name + "  ") + 1, y);
      y += 4.5;
      bodyText(yoga.lifeEventImpact);
      y += 2;
    }
  }

  // === DISCLAIMER ===
  checkPage(24);
  y += 4;
  doc.setDrawColor(...colors.line);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.amber);
  doc.text("Important Disclaimer", margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...colors.gray);
  const disc = "This report presents astrological indicators based on the Vedic (Jyotish) tradition. These are tendencies and possibilities — not certainties. Life events are shaped by countless factors including personal choices, environment, and circumstances that no astrological system can fully account for. Please use this report as a reflective tool for self-awareness, not as a definitive prediction of your future. For important life decisions, always rely on your own judgment and consult qualified professionals. We share these insights with deep respect for the tradition and with care for your wellbeing.";
  const discLines = doc.splitTextToSize(disc, contentW);
  for (const line of discLines) {
    checkPage(4);
    doc.text(line, margin, y);
    y += 3.5;
  }

  footer();
  const fileName = `Life-Events-Report${name ? `-${name.replace(/\s+/g, "-")}` : ""}-${chart.date}.pdf`;
  doc.save(fileName);
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export function LifeEventsReportView({ report, chart, name }: Props) {
  return (
    <div className="space-y-5">
      {/* Report header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
        <p className="text-2xl">{"\u{1F52E}"}</p>
        <h2 className="text-xl font-bold text-amber-400">Life Events Prediction Report</h2>
        <p className="text-sm text-slate-400">
          {name ? `${name} · ` : ""}
          {chart.lagna} Lagna · {chart.place.split(",")[0]} · {chart.date} {chart.time}
        </p>
        <p className="text-xs text-slate-600">
          Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Empathetic disclaimer at top */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-xs text-amber-400/90 leading-relaxed">
          <strong>{"\u{1F64F}"} A gentle note:</strong> This report presents astrological <em>indicators</em> and
          tendencies based on the Vedic tradition — not certainties. Life is beautifully complex, shaped by your
          choices, circumstances, and countless factors beyond any chart. Please treat these insights as a reflective
          guide for self-awareness, and always trust your own wisdom for important decisions. We share this with care
          and respect for both the tradition and your journey.
        </p>
      </div>

      {/* 1. Chart Summary */}
      <Section title="Chart Summary" icon={"\u{1F4CB}"}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Ascendant</p>
            <p className="text-sm font-semibold text-slate-200">{report.chartSummary.lagna}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Lagna Lord</p>
            <p className="text-sm font-semibold text-slate-200">{report.chartSummary.lagnaLord}</p>
            <p className="text-xs text-slate-500">{report.chartSummary.lagnaLordPlacement}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Moon Sign</p>
            <p className="text-sm font-semibold text-slate-200">{report.chartSummary.moonSign}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Current Dasha</p>
            <p className="text-sm font-semibold text-slate-200">{report.chartSummary.currentDasha}</p>
            <p className="text-xs text-slate-500">{report.chartSummary.currentAntardasha} AD</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">{report.chartSummary.description}</p>
      </Section>

      {/* 2. Life Area Outlook (Event Categories) */}
      <Section title="Life Area Outlook" icon={"\u{1F3AF}"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.eventCategories.map((cat: EventCategory) => (
            <div
              key={cat.id}
              className={`rounded-lg p-4 border ${
                cat.type === "positive"
                  ? "bg-slate-800/20 border-slate-700/50"
                  : cat.type === "negative"
                  ? "bg-red-500/5 border-red-500/10"
                  : "bg-slate-800/20 border-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.name}
                </span>
                <OutlookBadge outlook={cat.overallOutlook} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{cat.summary}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 3a. Past Life Events */}
      {report.pastHighlights && report.pastHighlights.length > 0 && (
        <Section title="Past Life Events — Looking Back" icon={"\u{1F550}"}>
          <p className="text-xs text-slate-500 mb-3">
            These are significant events your chart indicated for past periods. Reflect on how these
            planetary influences may have already manifested in your life — this can help you understand
            how dasha patterns work for you personally.
          </p>
          <div className="space-y-3">
            {report.pastHighlights.map((h: LifeHighlight, i: number) => (
              <div
                key={i}
                className={`rounded-lg p-4 border opacity-80 ${
                  h.type === "positive"
                    ? "bg-green-500/5 border-green-500/10"
                    : h.type === "negative"
                    ? "bg-red-500/5 border-red-500/10"
                    : "bg-amber-500/5 border-amber-500/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-200">{h.event}</span>
                  <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">Past</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  <span>{h.window}</span>
                  <span className="text-slate-700">|</span>
                  <span>{h.dashaContext}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{h.reasoning}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3b. Upcoming Life Highlights */}
      <Section title="Upcoming Life Event Predictions" icon={"\u{2B50}"}>
        <p className="text-xs text-slate-500 mb-3">
          The most significant events indicated by your chart, sorted by timeline. Remember, these are
          astrological indicators — your choices and actions always play the central role.
        </p>
        <div className="space-y-3">
          {report.upcomingHighlights.map((h: LifeHighlight, i: number) => (
            <div
              key={i}
              className={`rounded-lg p-4 border ${
                h.type === "positive"
                  ? "bg-green-500/5 border-green-500/10"
                  : h.type === "negative"
                  ? "bg-red-500/5 border-red-500/10"
                  : "bg-amber-500/5 border-amber-500/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-200">{h.event}</span>
                <LikelihoodBadge likelihood={h.likelihood} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span>{h.window}</span>
                <span className="text-slate-700">|</span>
                <span>{h.dashaContext}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{h.reasoning}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Current Period Deep Dive */}
      <Section title="Current Period Analysis" icon={"\u{1F4CD}"}>
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {report.currentPeriodAnalysis.mahadasha}-{report.currentPeriodAnalysis.antardasha} Period
              </p>
              <p className="text-xs text-slate-500">
                {formatDateRange(report.currentPeriodAnalysis.startDate, report.currentPeriodAnalysis.endDate)}
              </p>
            </div>
            <NatureBadge nature={report.currentPeriodAnalysis.overallNature} />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{report.currentPeriodAnalysis.detailedAnalysis}</p>
        </div>

        {report.currentPeriodAnalysis.opportunities.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
              {"\u2728"} Opportunities to Watch For
            </p>
            <ul className="space-y-1.5">
              {report.currentPeriodAnalysis.opportunities.map((o: string, i: number) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.currentPeriodAnalysis.cautions.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
              {"\u{1F9E1}"} Points of Mindfulness
            </p>
            <ul className="space-y-1.5">
              {report.currentPeriodAnalysis.cautions.map((c: string, i: number) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">{"\u25CB"}</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.currentPeriodAnalysis.remedialSuggestions.length > 0 && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
              {"\u{1F48E}"} Supportive Remedies
            </p>
            <ul className="space-y-1.5">
              {report.currentPeriodAnalysis.remedialSuggestions.map((r: string, i: number) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">{"\u2022"}</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* 5. Dasha Timeline */}
      <Section title="Dasha Timeline Predictions" icon={"\u{1F4C5}"} defaultOpen={false}>
        <p className="text-xs text-slate-500 mb-3">
          Each Mahadasha (major planetary period) activates specific life themes based on the planet{"’"}s
          lordship and placement in your chart.
        </p>
        <div className="space-y-4">
          {report.dashaPredictions.map((dp: DashaPrediction) => (
            <div
              key={dp.planet + dp.startDate}
              className={`rounded-xl border overflow-hidden ${
                dp.isCurrent ? "border-amber-500/30 ring-1 ring-amber-500/20" : "border-slate-800"
              }`}
            >
              {/* Dasha header */}
              <div className="bg-slate-800/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-200">
                      {dp.planet} Mahadasha
                      {dp.isCurrent && (
                        <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateRange(dp.startDate, dp.endDate)} · {dp.planetRole}
                    </p>
                  </div>
                  <NatureBadge nature={dp.overallNature} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dp.themes.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-slate-700/50 text-slate-300 rounded-full px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Event predictions */}
              <div className="px-4 py-3 space-y-2">
                {dp.eventPredictions.map((ep, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 text-xs ${
                        ep.type === "positive"
                          ? "text-green-400"
                          : ep.type === "negative"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {ep.type === "positive" ? "\u25B2" : ep.type === "negative" ? "\u25BC" : "\u25C6"}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <LikelihoodBadge likelihood={ep.likelihood} />
                        <span className="text-xs text-slate-500">{ep.timing}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ep.description}</p>
                    </div>
                  </div>
                ))}

                {/* Antardasha highlights */}
                {dp.antardashaHighlights.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                      View antardasha breakdown ({dp.antardashaHighlights.length} sub-periods)
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-2 border-l border-slate-800">
                      {dp.antardashaHighlights.map((ad, i) => (
                        <div key={i} className="pl-3 py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-300">
                              {dp.planet}-{ad.planet}
                              {ad.isCurrent && (
                                <span className="ml-1 text-amber-400 text-xs">*</span>
                              )}
                            </span>
                            <NatureBadge nature={ad.nature} />
                            <span className="text-xs text-slate-600">
                              {formatDateRange(ad.startDate, ad.endDate)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{ad.keyPrediction}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Planetary Strengths */}
      <Section title="Planetary Strengths" icon={"\u{1FA90}"} defaultOpen={false}>
        <div className="space-y-3">
          {report.planetaryStrengths.map((ps) => (
            <div key={ps.planet} className="bg-slate-800/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-200">{ps.planet}</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {ps.rashi} · House {ps.house}
                    {ps.dignity ? ` · ${ps.dignity}` : ""}
                    {ps.isRetrograde ? " · R" : ""}
                  </span>
                </div>
              </div>
              <StrengthBar strength={ps.strength} />
              <p className="text-xs text-slate-500">
                Lord of: {ps.lordOf.map((h) => `House ${h}`).join(", ")} ·{" "}
                {ps.naturalSignifications.join(", ")}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{ps.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. House Analysis */}
      <Section title="House Analysis" icon={"\u{1F3E0}"} defaultOpen={false}>
        <div className="space-y-3">
          {report.houseAnalysis.map((ha) => (
            <div key={ha.house} className="bg-slate-800/30 rounded-lg p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  House {ha.house} — {ha.lifeAreas.join(", ")}
                </span>
              </div>
              <StrengthBar strength={ha.strength} />
              <p className="text-xs text-slate-500">
                {ha.rashi} · Lord: {ha.lord} ({ha.lordPlacement})
                {ha.occupants.length > 0 ? ` · Occupied: ${ha.occupants.join(", ")}` : ""}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{ha.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 8. Yoga Influences */}
      {report.yogaInfluences.filter((y) => y.isPresent).length > 0 && (
        <Section title="Key Yoga Influences" icon={"\u{1F31F}"} defaultOpen={false}>
          <div className="space-y-3">
            {report.yogaInfluences
              .filter((y: YogaInfluence) => y.isPresent)
              .map((yoga: YogaInfluence, i: number) => (
                <div key={i} className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">{yoga.name}</span>
                    <NatureBadge
                      nature={yoga.strength === "strong" ? "very_favorable" : yoga.strength === "moderate" ? "favorable" : "mixed"}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Planets: {yoga.planets.join(", ")} · Houses: {yoga.houses.join(", ")}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{yoga.effect}</p>
                  <p className="text-xs text-amber-400/80 leading-relaxed">{yoga.lifeEventImpact}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Bottom disclaimer */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-amber-400">{"\u{1F64F}"} Important Disclaimer</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          This report presents astrological <em>indicators</em> based on the Vedic (Jyotish) tradition. These are
          tendencies and possibilities — not certainties. Life events are shaped by countless factors including
          personal choices, environment, and circumstances that no astrological system can fully account for.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Please use this report as a reflective tool for self-awareness, not as a definitive prediction of your future.
          For important life decisions — whether related to health, relationships, career, or finances — always
          rely on your own judgment and consult qualified professionals. We share these insights with deep respect for
          the tradition and with care for your wellbeing.
        </p>
        <p className="text-xs text-slate-600 italic">
          {"\u201C"}The stars incline, they do not compel.{"\u201D"}
        </p>
      </div>

      {/* Download buttons */}
      <div className="text-center space-x-3">
        <button
          onClick={() => downloadReportPdf(report, chart, name)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {"\u{1F4E5}"} Save as PDF
        </button>
        <button
          onClick={() => window.print()}
          className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-5 py-2.5 rounded-lg transition-colors"
        >
          {"\u{1F5A8}\uFE0F"} Print
        </button>
      </div>
    </div>
  );
}
