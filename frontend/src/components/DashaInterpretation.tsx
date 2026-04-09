"use client";

import React, { useState } from "react";
import { ChartResponse } from "@/lib/api";
import {
  DASHA_LORD_GENERAL,
  DASHA_LORD_IN_HOUSE,
  ANTARDASHA_COMBINATIONS,
} from "@/lib/dashaInterpretations";

interface Props {
  chart: ChartResponse;
}

const PLANET_COLORS: Record<string, string> = {
  Sun:     "text-amber-400",
  Moon:    "text-blue-300",
  Mars:    "text-red-400",
  Mercury: "text-emerald-400",
  Jupiter: "text-yellow-400",
  Venus:   "text-pink-400",
  Saturn:  "text-slate-400",
  Rahu:    "text-purple-400",
  Ketu:    "text-orange-400",
};

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-amber-400">{title}</span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function DashaInterpretation({ chart }: Props) {
  const dashaLord = chart.current_dasha.planet;
  const adLord = chart.current_antardasha.planet;

  // Find natal planet data
  const natalDashaP = chart.planets.find(p => p.name === dashaLord);
  const natalAdP = chart.planets.find(p => p.name === adLord);

  const generalInfo = DASHA_LORD_GENERAL[dashaLord];
  const dashaHouseInterp = natalDashaP
    ? DASHA_LORD_IN_HOUSE[dashaLord]?.[natalDashaP.house]
    : null;
  const adCombo = ANTARDASHA_COMBINATIONS[dashaLord]?.[adLord];
  const adHouseInterp = natalAdP
    ? DASHA_LORD_IN_HOUSE[adLord]?.[natalAdP.house]
    : null;

  // All antardashas for the current mahadasha
  const antardashas = chart.current_dasha.antardashas || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-amber-400">
        Dasha Interpretations
      </h3>
      <p className="text-xs text-slate-500">
        Based on your {chart.lagna} Lagna chart
      </p>

      {/* Current Mahadasha */}
      <Section
        title={`Current Mahadasha: ${dashaLord} (${chart.current_dasha.years.toFixed(1)} years)`}
        defaultOpen
      >
        {generalInfo && (
          <>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Overview
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {generalInfo.overview}
              </p>
            </div>

            {/* House lordship context */}
            {natalDashaP && natalDashaP.lord_of_houses.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  In Your Chart
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className={`font-semibold ${PLANET_COLORS[dashaLord] || ""}`}>
                    {dashaLord}
                  </span>{" "}
                  rules house{natalDashaP.lord_of_houses.length > 1 ? "s" : ""}{" "}
                  <span className="font-semibold text-amber-400">
                    {natalDashaP.lord_of_houses.join(" & ")}
                  </span>{" "}
                  and is placed in house{" "}
                  <span className="font-semibold text-amber-400">{natalDashaP.house}</span>{" "}
                  ({natalDashaP.rashi})
                  {natalDashaP.dignity && (
                    <span className="text-xs ml-1">
                      — <span className="capitalize">{natalDashaP.dignity}</span>
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Planet in house interpretation */}
            {dashaHouseInterp && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  {dashaLord} in House {natalDashaP?.house}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dashaHouseInterp}
                </p>
              </div>
            )}

            {/* Life area cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["career", "relationships", "health", "finances"] as const).map(area => (
                <div key={area} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    {area === "relationships" ? "💕 Relationships" :
                     area === "career" ? "💼 Career" :
                     area === "health" ? "🏥 Health" : "💰 Finances"}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {generalInfo[area]}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Current Antardasha */}
      <Section
        title={`Current Antardasha: ${adLord} in ${dashaLord} Mahadasha`}
        defaultOpen
      >
        <p className="text-xs text-slate-500 mb-2">
          {formatDate(chart.current_antardasha.start_date)} → {formatDate(chart.current_antardasha.end_date)}
        </p>

        {adCombo && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {dashaLord}–{adLord} Period
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{adCombo}</p>
          </div>
        )}

        {natalAdP && adHouseInterp && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {adLord} in House {natalAdP.house} ({natalAdP.rashi})
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{adHouseInterp}</p>
          </div>
        )}
      </Section>

      {/* All Antardasha Periods */}
      <Section title={`All Antardasha Periods in ${dashaLord} Mahadasha`}>
        <div className="space-y-2">
          {antardashas.map(ad => {
            const isActive =
              ad.planet === chart.current_antardasha.planet &&
              ad.start_date === chart.current_antardasha.start_date;
            const combo = ANTARDASHA_COMBINATIONS[dashaLord]?.[ad.planet];

            return (
              <div
                key={ad.start_date}
                className={`rounded-lg border p-3 ${
                  isActive
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    <span className={`text-sm font-semibold ${PLANET_COLORS[ad.planet] || "text-slate-200"}`}>
                      {ad.planet}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDate(ad.start_date)} – {formatDate(ad.end_date)}
                  </span>
                </div>
                {combo && (
                  <p className="text-xs text-slate-400 leading-relaxed">{combo}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
