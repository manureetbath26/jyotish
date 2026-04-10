"use client";
/**
 * South Indian Chart SVG
 *
 * Fixed rashi grid: always the same 12 cells, rashi positions don't change.
 * Lagna house is marked with a diagonal line in the corner.
 *
 * Grid layout (rashi numbers):
 *   ┌────┬────┬────┬────┐
 *   │ 12 │  1 │  2 │  3 │
 *   ├────┼────┼────┼────┤
 *   │ 11 │         │  4 │
 *   ├────┤  CENTER ├────┤
 *   │ 10 │         │  5 │
 *   ├────┼────┼────┼────┤
 *   │  9 │  8 │  7 │  6 │
 *   └────┴────┴────┴────┘
 *
 * Rashi (sign) positions are FIXED in South Indian style.
 * The Lagna house and planet positions change per chart.
 */

import React from "react";
import { useTheme } from "next-themes";
import { PlanetPosition, HouseInfo } from "@/lib/api";

interface Props {
  lagna: string;
  lagna_degree: number;
  planets: PlanetPosition[];
  houses: HouseInfo[];
}

const PLANET_ABBR: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

const DIGNITY_COLOR: Record<string, string> = {
  exalted:      "#fbbf24",
  moolatrikona: "#a78bfa",
  own:          "#34d399",
  debilitated:  "#f87171",
};

const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const RASHI_SHORT = [
  "Ari", "Tau", "Gem", "Can", "Leo", "Vir",
  "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis",
];

// Fixed South Indian cell positions [col, row] for each rashi (1-indexed)
// Grid is 4 cols × 4 rows (outer ring, center 2×2 is empty/name area)
const RASHI_CELLS: Record<number, { col: number; row: number }> = {
  12: { col: 0, row: 0 }, 1: { col: 1, row: 0 }, 2: { col: 2, row: 0 }, 3: { col: 3, row: 0 },
  11: { col: 0, row: 1 },                                                 4: { col: 3, row: 1 },
  10: { col: 0, row: 2 },                                                 5: { col: 3, row: 2 },
   9: { col: 0, row: 3 }, 8: { col: 1, row: 3 }, 7: { col: 2, row: 3 }, 6: { col: 3, row: 3 },
};

// Theme-aware chart colors
const CHART_COLORS = {
  dark: {
    bg: "#0f172a",
    cellFill: "#0f172a",
    lagnaCell: "#1a1505",
    cellStroke: "#334155",
    centerBox: "#0a0f1a",
    centerStroke: "#1e293b",
    lagnaAccent: "#fbbf24",
    houseNum: "#475569",
    rashiText: "#64748b",
    lordText: "#334155",
    degreeText: "#475569",
    legendText: "#475569",
    defaultPlanet: "#94a3b8",
  },
  light: {
    bg: "#FFF7EE",
    cellFill: "#FFF7EE",
    lagnaCell: "#FFF0D6",
    cellStroke: "#C4A882",
    centerBox: "#FFF3E6",
    centerStroke: "#DBBF9C",
    lagnaAccent: "#A86010",
    houseNum: "#B89468",
    rashiText: "#96744A",
    lordText: "#B89468",
    degreeText: "#96744A",
    legendText: "#96744A",
    defaultPlanet: "#5C4020",
  },
};

const SIZE = 400;
const CELL = SIZE / 4;

export function SouthIndianChart({ lagna, planets, houses }: Props) {
  const { theme } = useTheme();
  const c = theme === "light" ? CHART_COLORS.light : CHART_COLORS.dark;
  // Find lagna rashi number
  const lagnaRashiNum = RASHI_NAMES.indexOf(lagna) + 1;

  // Build rashi → planet list
  const rashiPlanets: Record<number, PlanetPosition[]> = {};
  planets.forEach(p => {
    const rn = p.rashi_num;
    if (!rashiPlanets[rn]) rashiPlanets[rn] = [];
    rashiPlanets[rn].push(p);
  });

  // Get house number for a rashi (house relative to lagna)
  const rashiToHouse = (rashiNum: number): number =>
    ((rashiNum - lagnaRashiNum + 12) % 12) + 1;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-md mx-auto"
      style={{ fontFamily: "inherit" }}
    >
      {/* Background */}
      <rect width={SIZE} height={SIZE} fill={c.bg} rx="8" />

      {/* Center label */}
      <text x={SIZE / 2} y={SIZE / 2 - 8} textAnchor="middle" fontSize="12" fill={c.rashiText} fontWeight="600">
        {lagna}
      </text>
      <text x={SIZE / 2} y={SIZE / 2 + 8} textAnchor="middle" fontSize="10" fill={c.lordText}>
        Lagna
      </text>

      {/* Render 12 outer cells */}
      {Object.entries(RASHI_CELLS).map(([rashiStr, { col, row }]) => {
        const rashiNum = parseInt(rashiStr);
        const x = col * CELL;
        const y = row * CELL;
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;

        const isLagna = rashiNum === lagnaRashiNum;
        const houseNum = rashiToHouse(rashiNum);
        const houseInfo = houses.find(h => h.house_num === houseNum);
        const occupants = rashiPlanets[rashiNum] || [];

        return (
          <g key={rashiNum}>
            <rect
              x={x + 0.5}
              y={y + 0.5}
              width={CELL - 1}
              height={CELL - 1}
              fill={isLagna ? c.lagnaCell : c.cellFill}
              stroke={c.cellStroke}
              strokeWidth="1"
            />

            {/* Lagna diagonal mark */}
            {isLagna && (
              <line
                x1={x + 2} y1={y + 2}
                x2={x + 14} y2={y + 2}
                stroke={c.lagnaAccent}
                strokeWidth="1.5"
              />
            )}
            {isLagna && (
              <line
                x1={x + 2} y1={y + 2}
                x2={x + 2} y2={y + 14}
                stroke={c.lagnaAccent}
                strokeWidth="1.5"
              />
            )}

            {/* House number */}
            <text x={x + 6} y={y + 13} fontSize="9" fill={c.houseNum}>
              {houseNum}
            </text>

            {/* Rashi abbreviation */}
            <text
              x={cx}
              y={y + 18}
              textAnchor="middle"
              fontSize="9"
              fill={isLagna ? c.lagnaAccent : c.rashiText}
              fontWeight={isLagna ? "700" : "400"}
            >
              {RASHI_SHORT[rashiNum - 1]}
            </text>

            {/* House lord */}
            <text
              x={cx}
              y={y + 28}
              textAnchor="middle"
              fontSize="8"
              fill={c.lordText}
            >
              {houseInfo?.lord ? `(${PLANET_ABBR[houseInfo.lord] ?? houseInfo.lord.slice(0,2)})` : ""}
            </text>

            {/* Planets */}
            {occupants.map((p, idx) => {
              const yPos = y + 40 + idx * 12;
              const color = p.dignity ? DIGNITY_COLOR[p.dignity] : c.defaultPlanet;
              const deg = `${Math.floor(p.degree_in_rashi)}°`;
              return (
                <g key={p.name}>
                  <text
                    x={cx - 6}
                    y={yPos}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight="700"
                    fill={color}
                  >
                    {PLANET_ABBR[p.name] ?? p.name.slice(0, 2)}
                    {p.is_retrograde ? "ᴿ" : ""}
                  </text>
                  <text
                    x={cx - 4}
                    y={yPos}
                    textAnchor="start"
                    fontSize="8"
                    fill={c.degreeText}
                  >
                    {deg}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Inner border lines to form the center 2×2 box */}
      <rect
        x={CELL}
        y={CELL}
        width={CELL * 2}
        height={CELL * 2}
        fill={c.centerBox}
        stroke={c.centerStroke}
        strokeWidth="1"
      />

      {/* Legend */}
      <g transform={`translate(8,${SIZE - 42})`}>
        <text x="0" y="-2" fontSize="8" fill={c.legendText}>Dignity: </text>
        {Object.entries(DIGNITY_COLOR).map(([d, clr], i) => (
          <g key={d} transform={`translate(${i * 90 + 40},0)`}>
            <circle cx="4" cy="-4" r="3.5" fill={clr} />
            <text x="10" y="-1" fontSize="8" fill={c.legendText}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
