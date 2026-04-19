"use client";

import { useState } from "react";
import {
  ASHTAKVARGA_SOURCES,
  ASHTAKVARGA_PLANETS,
  type AshtakvargaAnalysis,
  type AshtakvargaPlanet,
  type PrastharaChart,
} from "@/lib/ashtakvargaEngine";
import { ZODIAC_ORDER, type Sign } from "@/lib/charaDashaEngine";

const SIGN_ABBREV: Record<Sign, string> = {
  Aries: "Ari",
  Taurus: "Tau",
  Gemini: "Gem",
  Cancer: "Can",
  Leo: "Leo",
  Virgo: "Vir",
  Libra: "Lib",
  Scorpio: "Sco",
  Sagittarius: "Sag",
  Capricorn: "Cap",
  Aquarius: "Aqu",
  Pisces: "Pis",
};

const SIGN_SYMBOL: Record<Sign, string> = {
  Aries: "\u2648",
  Taurus: "\u2649",
  Gemini: "\u264A",
  Cancer: "\u264B",
  Leo: "\u264C",
  Virgo: "\u264D",
  Libra: "\u264E",
  Scorpio: "\u264F",
  Sagittarius: "\u2650",
  Capricorn: "\u2651",
  Aquarius: "\u2652",
  Pisces: "\u2653",
};

const PLANET_EMOJI: Record<AshtakvargaPlanet, string> = {
  Sun: "\u2600\uFE0F",
  Moon: "\u{1F319}",
  Mars: "\u{1F534}",
  Mercury: "\u{1F7E2}",
  Jupiter: "\u{1F7E1}",
  Venus: "\u{1F499}",
  Saturn: "\u{1F5A4}",
};

interface Props {
  analysis: AshtakvargaAnalysis;
}

export function AshtakvargaCharts({ analysis }: Props) {
  const [selectedPlanetIdx, setSelectedPlanetIdx] = useState(0);

  return (
    <div className="space-y-6">
      {/* ── Planet tabs ── */}
      <div className="flex flex-wrap gap-2 items-center border-b border-slate-800 pb-3">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium mr-2">
          Chart:
        </span>
        {ASHTAKVARGA_PLANETS.map((planet, i) => (
          <button
            key={planet}
            type="button"
            onClick={() => setSelectedPlanetIdx(i)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              selectedPlanetIdx === i
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
          onClick={() => setSelectedPlanetIdx(7)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            selectedPlanetIdx === 7
              ? "bg-amber-500 text-black border-amber-500 font-semibold"
              : "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-amber-500/50"
          }`}
        >
          <span className="mr-1">8.</span>
          {"\u2605"} Sarva (Total)
        </button>
      </div>

      {/* ── Selected chart ── */}
      {selectedPlanetIdx < 7 ? (
        <PrastharaChartView chart={analysis.prastharaCharts[selectedPlanetIdx]} />
      ) : (
        <SarvashtakvargaView analysis={analysis} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Prasthara (individual planet) chart
// ────────────────────────────────────────────────────────────────────────────

function PrastharaChartView({ chart }: { chart: PrastharaChart }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-semibold text-amber-400">
          {PLANET_EMOJI[chart.planet]} Prastharashtakvarga of {chart.planet}
        </h3>
        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
          Total: {chart.grandTotal} bindus
        </span>
        <span className="text-xs text-slate-500">
          {chart.planet} is in {chart.planetSign}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800/60 text-slate-300">
              <th className="px-2 py-2 text-left font-medium border-r border-slate-800">
                Source
              </th>
              {ZODIAC_ORDER.map((sign) => (
                <th
                  key={sign}
                  className="px-1.5 py-2 text-center font-medium min-w-[2.5rem]"
                  title={sign}
                >
                  <div className="text-slate-400 text-[10px]">{SIGN_ABBREV[sign]}</div>
                  <div className="text-amber-400 text-sm leading-none mt-0.5">
                    {SIGN_SYMBOL[sign]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASHTAKVARGA_SOURCES.map((source, srcIdx) => {
              const sourceSign = chart.sourcePlacements[source];
              return (
                <tr
                  key={source}
                  className="border-t border-slate-800 hover:bg-slate-800/20"
                >
                  <td className="px-2 py-1.5 border-r border-slate-800 font-medium text-slate-300">
                    {source}
                  </td>
                  {ZODIAC_ORDER.map((sign, signIdx) => {
                    const bindu = chart.matrix[srcIdx][signIdx];
                    const isSourcePlacement = sign === sourceSign;
                    return (
                      <td
                        key={sign}
                        className={`px-1.5 py-1.5 text-center ${
                          isSourcePlacement ? "bg-amber-500/10" : ""
                        }`}
                      >
                        {bindu === 1 ? (
                          <span className="text-amber-400 font-bold">{"\u25CF"}</span>
                        ) : (
                          <span className="text-slate-700">{"\u00B7"}</span>
                        )}
                        {isSourcePlacement && (
                          <span className="text-[9px] text-amber-500/80 ml-0.5">{"\u2217"}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800/40 border-t-2 border-slate-700">
              <td className="px-2 py-2 font-bold text-slate-200 border-r border-slate-800">
                Total
              </td>
              {chart.signTotals.map((total, i) => (
                <td
                  key={i}
                  className={`px-1.5 py-2 text-center font-bold ${
                    total >= 5
                      ? "text-emerald-400"
                      : total >= 3
                        ? "text-amber-400"
                        : total >= 1
                          ? "text-slate-300"
                          : "text-slate-600"
                  }`}
                >
                  {total}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <span className="text-amber-400">{"\u25CF"}</span> bindu (1)
        </span>
        <span className="flex items-center gap-1">
          <span className="text-slate-700">{"\u00B7"}</span> rekha (0)
        </span>
        <span className="flex items-center gap-1">
          <span className="text-amber-500/80">{"\u2217"}</span> source planet&apos;s own sign
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-amber-500/10 px-1">highlighted column</span> = source placement
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sarvashtakvarga (total) chart
// ────────────────────────────────────────────────────────────────────────────

function SarvashtakvargaView({ analysis }: { analysis: AshtakvargaAnalysis }) {
  const sav = analysis.sarvashtakvarga;
  const maxSign = sav.signTotals.indexOf(Math.max(...sav.signTotals));
  const minSign = sav.signTotals.indexOf(Math.min(...sav.signTotals));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-semibold text-amber-400">
          {"\u2605"} Sarvashtakvarga (Total of all)
        </h3>
        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
          Grand total: {sav.grandTotal}
        </span>
        <span className="text-xs text-slate-500">
          (classical maximum is 337)
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800/60 text-slate-300">
              <th className="px-2 py-2 text-left font-medium border-r border-slate-800">
                Planet
              </th>
              {ZODIAC_ORDER.map((sign) => (
                <th
                  key={sign}
                  className="px-1.5 py-2 text-center font-medium min-w-[2.5rem]"
                >
                  <div className="text-slate-400 text-[10px]">{SIGN_ABBREV[sign]}</div>
                  <div className="text-amber-400 text-sm leading-none mt-0.5">
                    {SIGN_SYMBOL[sign]}
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium border-l border-slate-800">
                BAV
              </th>
            </tr>
          </thead>
          <tbody>
            {ASHTAKVARGA_PLANETS.map((planet, pIdx) => {
              const bavTotal = sav.matrix[pIdx].reduce((a, b) => a + b, 0);
              const planetSign = analysis.sourcePlacements[planet];
              return (
                <tr
                  key={planet}
                  className="border-t border-slate-800 hover:bg-slate-800/20"
                >
                  <td className="px-2 py-1.5 border-r border-slate-800 font-medium text-slate-300">
                    {PLANET_EMOJI[planet]} {planet}
                  </td>
                  {ZODIAC_ORDER.map((sign, sIdx) => {
                    const value = sav.matrix[pIdx][sIdx];
                    const isPlanetPlacement = sign === planetSign;
                    return (
                      <td
                        key={sign}
                        className={`px-1.5 py-1.5 text-center ${
                          isPlanetPlacement ? "bg-amber-500/10 font-semibold" : ""
                        } ${
                          value >= 6
                            ? "text-emerald-400"
                            : value >= 4
                              ? "text-amber-400"
                              : value >= 2
                                ? "text-slate-300"
                                : "text-slate-600"
                        }`}
                      >
                        {value}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center font-bold text-amber-400 border-l border-slate-800">
                    {bavTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800/40 border-t-2 border-slate-700">
              <td className="px-2 py-2 font-bold text-slate-200 border-r border-slate-800">
                SAV Total
              </td>
              {sav.signTotals.map((total, i) => (
                <td
                  key={i}
                  className={`px-1.5 py-2 text-center font-bold ${
                    i === maxSign
                      ? "text-emerald-400 bg-emerald-500/10"
                      : i === minSign
                        ? "text-rose-400 bg-rose-500/10"
                        : total >= 30
                          ? "text-amber-400"
                          : "text-slate-300"
                  }`}
                >
                  {total}
                </td>
              ))}
              <td className="px-2 py-2 text-center font-bold text-amber-400 border-l border-slate-800">
                {sav.grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-medium">
            Strongest sign
          </p>
          <p className="text-sm font-semibold text-slate-200">
            {SIGN_SYMBOL[ZODIAC_ORDER[maxSign]]} {ZODIAC_ORDER[maxSign]} — {sav.signTotals[maxSign]} bindus
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Houses and events associated with this sign receive the most planetary support.
          </p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
          <p className="text-[10px] text-rose-400 uppercase tracking-wide font-medium">
            Weakest sign
          </p>
          <p className="text-sm font-semibold text-slate-200">
            {SIGN_SYMBOL[ZODIAC_ORDER[minSign]]} {ZODIAC_ORDER[minSign]} — {sav.signTotals[minSign]} bindus
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Matters governed by this sign may require more conscious effort.
          </p>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
        <p>
          <span className="text-emerald-400">Strong</span> (&ge;30 / col, &ge;6 / cell):
          naturally supported. <span className="text-amber-400">Average</span> (~28). <span className="text-rose-400">Weak</span> (&lt;25 / col): needs effort.
        </p>
        <p>Highlighted cells show each planet&apos;s natal sign.</p>
      </div>
    </div>
  );
}
