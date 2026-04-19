"use client";

import { useState } from "react";
import {
  ASHTAKVARGA_PLANETS,
  type AshtakvargaAnalysis,
  type AshtakvargaPlanet,
} from "@/lib/ashtakvargaEngine";
import { SIGN_INDEX, ZODIAC_ORDER } from "@/lib/charaDashaEngine";
import { NorthIndianChart } from "@/components/NorthIndianChart";
import { SouthIndianChart } from "@/components/SouthIndianChart";

const PLANET_EMOJI: Record<AshtakvargaPlanet, string> = {
  Sun: "\u2600\uFE0F",
  Moon: "\u{1F319}",
  Mars: "\u{1F534}",
  Mercury: "\u{1F7E2}",
  Jupiter: "\u{1F7E1}",
  Venus: "\u{1F499}",
  Saturn: "\u{1F5A4}",
};

const PLANET_MAX_BAV: Record<AshtakvargaPlanet, number> = {
  Sun: 48,
  Moon: 49,
  Mars: 39,
  Mercury: 54,
  Jupiter: 56,
  Venus: 52,
  Saturn: 39,
};

type ChartStyle = "north" | "south" | "both";

interface Props {
  analysis: AshtakvargaAnalysis;
}

export function AshtakvargaCharts({ analysis }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [style, setStyle] = useState<ChartStyle>("both");

  const isSarva = selectedIdx === 7;

  // Values to plot: per-sign totals (for planet tabs) or SAV totals (for tab 8)
  const signTotals = isSarva
    ? analysis.sarvashtakvarga.signTotals
    : analysis.prastharaCharts[selectedIdx].signTotals;

  const title = isSarva
    ? "Sarvashtakvarga (Total of All)"
    : `Ashtakvarga of ${ASHTAKVARGA_PLANETS[selectedIdx]}`;

  const grandTotal = isSarva
    ? analysis.sarvashtakvarga.grandTotal
    : analysis.prastharaCharts[selectedIdx].grandTotal;

  const maxExpected = isSarva ? 337 : PLANET_MAX_BAV[ASHTAKVARGA_PLANETS[selectedIdx]];

  return (
    <div className="space-y-5">
      {/* ── Chart tabs ── */}
      <div className="flex flex-wrap gap-2 items-center border-b border-slate-800 pb-3">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium mr-2">
          Chart:
        </span>
        {ASHTAKVARGA_PLANETS.map((planet, i) => (
          <button
            key={planet}
            type="button"
            onClick={() => setSelectedIdx(i)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              selectedIdx === i
                ? "bg-amber-500 text-black border-amber-500 font-semibold"
                : "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-amber-500/50"
            }`}
          >
            <span className="mr-1">{i + 1}.</span>
            {PLANET_EMOJI[planet]} {planet}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedIdx(7)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            selectedIdx === 7
              ? "bg-amber-500 text-black border-amber-500 font-semibold"
              : "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-amber-500/50"
          }`}
        >
          <span className="mr-1">8.</span>
          {"\u2605"} Sarva (Total)
        </button>
      </div>

      {/* ── Style toggle + summary ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500">
            Grand total: <span className="text-amber-400 font-semibold">{grandTotal}</span>
            <span className="text-slate-600"> / {maxExpected}</span>
            <span className="mx-2 text-slate-700">{"\u00B7"}</span>
            Lagna: <span className="text-slate-300">{analysis.lagnaSign}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
          {(["north", "south", "both"] as ChartStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`text-xs px-2.5 py-1 rounded ${
                style === s
                  ? "bg-amber-500 text-black font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s === "north" ? "North" : s === "south" ? "South" : "Both"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div
          className={`flex flex-wrap justify-center gap-6 ${
            style === "both" ? "sm:gap-10" : ""
          }`}
        >
          {(style === "north" || style === "both") && (
            <NorthIndianChart
              signTotals={signTotals}
              lagnaSign={analysis.lagnaSign}
              title="North Indian"
              accent="amber"
              size={style === "both" ? 320 : 420}
            />
          )}
          {(style === "south" || style === "both") && (
            <SouthIndianChart
              signTotals={signTotals}
              lagnaSign={analysis.lagnaSign}
              title="South Indian"
              accent="amber"
              size={style === "both" ? 320 : 420}
            />
          )}
        </div>
      </div>

      {/* ── For Sarva: strongest/weakest sign ── */}
      {isSarva && (
        <SarvaInsights analysis={analysis} />
      )}

      {/* ── For planets: reference totals ── */}
      {!isSarva && (
        <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <span className="text-slate-500">Reading: </span>
            Each number in the chart above is the count of benefic bindus {ASHTAKVARGA_PLANETS[selectedIdx]}
            &apos;s Ashtakvarga places in that sign. Maximum possible per sign = 8.
            Values &ge;5 indicate strong support for {ASHTAKVARGA_PLANETS[selectedIdx]}-governed
            matters when that sign is activated (by transit, dasha, or natal placement).
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sarva insights: strongest + weakest signs
// ────────────────────────────────────────────────────────────────────────────

function SarvaInsights({ analysis }: { analysis: AshtakvargaAnalysis }) {
  const totals = analysis.sarvashtakvarga.signTotals;

  const maxIdx = totals.indexOf(Math.max(...totals));
  const minIdx = totals.indexOf(Math.min(...totals));
  const lagnaIdx = SIGN_INDEX[analysis.lagnaSign];
  const lagnaValue = totals[lagnaIdx];

  const houseOfSign = (sIdx: number) => ((sIdx - lagnaIdx + 12) % 12) + 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
        <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-medium">
          Strongest sign
        </p>
        <p className="text-sm font-semibold text-slate-200">
          {ZODIAC_ORDER[maxIdx]} (House {houseOfSign(maxIdx)})
        </p>
        <p className="text-lg font-bold text-emerald-400">{totals[maxIdx]} bindus</p>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <p className="text-[10px] text-amber-400 uppercase tracking-wide font-medium">
          Lagna strength
        </p>
        <p className="text-sm font-semibold text-slate-200">
          {analysis.lagnaSign} (House 1)
        </p>
        <p className="text-lg font-bold text-amber-400">{lagnaValue} bindus</p>
      </div>
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
        <p className="text-[10px] text-rose-400 uppercase tracking-wide font-medium">
          Weakest sign
        </p>
        <p className="text-sm font-semibold text-slate-200">
          {ZODIAC_ORDER[minIdx]} (House {houseOfSign(minIdx)})
        </p>
        <p className="text-lg font-bold text-rose-400">{totals[minIdx]} bindus</p>
      </div>
    </div>
  );
}
