"use client";
/**
 * North Indian Chart — Diamond-in-Square layout
 *
 * Structure:
 *   1. Outer square
 *   2. Inner diamond (rotated 45°) with vertices at midpoints of outer square sides
 *   3. Two diagonal lines from corner to corner of outer square
 *
 * This creates 12 houses:
 *   - 4 kite-shaped kendra houses (1, 4, 7, 10) at top, left, bottom, right
 *   - 8 triangular houses in the corners
 *
 * House numbering (CCW from top):
 *   H1=top (Lagna), H2=TL upper, H3=TL lower, H4=left,
 *   H5=BL upper, H6=BL lower, H7=bottom, H8=BR lower,
 *   H9=BR upper, H10=right, H11=TR lower, H12=TR upper
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

// Theme-aware chart colors
const CHART_COLORS = {
  dark: {
    bg: "#0f172a",
    stroke: "#475569",
    houseNum: "#334155",
    rashiText: "#475569",
    lagnaAccent: "#fbbf24",
    lagnaFill: "#fbbf2408",
    lordText: "#1e3a5f",
    centerText: "#334155",
    centerSub: "#1e3a5f",
    defaultPlanet: "#94a3b8",
  },
  light: {
    bg: "#FFF7EE",
    stroke: "#C4A882",
    houseNum: "#DBBF9C",
    rashiText: "#96744A",
    lagnaAccent: "#A86010",
    lagnaFill: "#A8601012",
    lordText: "#B89468",
    centerText: "#7A5A32",
    centerSub: "#96744A",
    defaultPlanet: "#5C4020",
  },
};

const SIZE = 420;
const PAD = 10; // padding inside SVG

function buildHousePolygons(s: number, pad: number) {
  const o = pad;               // origin offset (padding)
  const w = s - 2 * pad;       // usable chart width
  const h = w;                 // square chart

  // Outer square corners
  const TL: [number, number] = [o, o];
  const TR: [number, number] = [o + w, o];
  const BR: [number, number] = [o + w, o + h];
  const BL: [number, number] = [o, o + h];

  // Diamond vertices (midpoints of outer square sides)
  const T: [number, number] = [o + w / 2, o];
  const R: [number, number] = [o + w, o + h / 2];
  const B: [number, number] = [o + w / 2, o + h];
  const L: [number, number] = [o, o + h / 2];

  // Center
  const C: [number, number] = [o + w / 2, o + h / 2];

  // Diagonal-diamond intersection points
  // TL→BR diagonal (y=x line relative to origin) meets diamond side T→L at P1
  // TR→BL diagonal meets diamond side T→R at P2, etc.
  const P1: [number, number] = [o + w / 4, o + h / 4];
  const P2: [number, number] = [o + 3 * w / 4, o + h / 4];
  const P3: [number, number] = [o + 3 * w / 4, o + 3 * h / 4];
  const P4: [number, number] = [o + w / 4, o + 3 * h / 4];

  const pts = (...coords: [number, number][]) =>
    coords.map(([x, y]) => `${x},${y}`).join(" ");

  const centroid = (...coords: [number, number][]): [number, number] => [
    coords.reduce((sum, [x]) => sum + x, 0) / coords.length,
    coords.reduce((sum, [, y]) => sum + y, 0) / coords.length,
  ];

  // 12 houses — CCW from H1 at top
  return {
    polygons: [
      // Kendra houses (kite-shaped, 4 vertices)
      { house: 1,  points: pts(T, P2, C, P1),  ...spread(centroid(T, P2, C, P1)),  isKendra: true },
      { house: 4,  points: pts(L, P1, C, P4),  ...spread(centroid(L, P1, C, P4)),  isKendra: true },
      { house: 7,  points: pts(B, P4, C, P3),  ...spread(centroid(B, P4, C, P3)),  isKendra: true },
      { house: 10, points: pts(R, P3, C, P2),  ...spread(centroid(R, P3, C, P2)),  isKendra: true },
      // Triangle houses (3 vertices)
      { house: 2,  points: pts(TL, T, P1),     ...spread(centroid(TL, T, P1)),     isKendra: false },
      { house: 3,  points: pts(TL, P1, L),     ...spread(centroid(TL, P1, L)),     isKendra: false },
      { house: 5,  points: pts(L, P4, BL),     ...spread(centroid(L, P4, BL)),     isKendra: false },
      { house: 6,  points: pts(BL, B, P4),     ...spread(centroid(BL, B, P4)),     isKendra: false },
      { house: 8,  points: pts(B, BR, P3),     ...spread(centroid(B, BR, P3)),     isKendra: false },
      { house: 9,  points: pts(BR, R, P3),     ...spread(centroid(BR, R, P3)),     isKendra: false },
      { house: 11, points: pts(R, TR, P2),     ...spread(centroid(R, TR, P2)),     isKendra: false },
      { house: 12, points: pts(TR, T, P2),     ...spread(centroid(TR, T, P2)),     isKendra: false },
    ],
    // Structural lines to draw
    lines: {
      outerSquare: { x: o, y: o, w, h },
      diagonals: [
        { x1: TL[0], y1: TL[1], x2: BR[0], y2: BR[1] },
        { x1: TR[0], y1: TR[1], x2: BL[0], y2: BL[1] },
      ],
      diamond: [
        { x1: T[0], y1: T[1], x2: R[0], y2: R[1] },
        { x1: R[0], y1: R[1], x2: B[0], y2: B[1] },
        { x1: B[0], y1: B[1], x2: L[0], y2: L[1] },
        { x1: L[0], y1: L[1], x2: T[0], y2: T[1] },
      ],
    },
  };
}

// Helper to spread centroid tuple into {cx, cy}
function spread([cx, cy]: [number, number]) {
  return { cx, cy };
}

export function NorthIndianChart({ lagna, planets, houses }: Props) {
  const { theme } = useTheme();
  const c = theme === "light" ? CHART_COLORS.light : CHART_COLORS.dark;
  const { polygons, lines } = buildHousePolygons(SIZE, PAD);

  // Map house number → planets
  const houseOccupants: Record<number, PlanetPosition[]> = {};
  planets.forEach(p => {
    if (!houseOccupants[p.house]) houseOccupants[p.house] = [];
    houseOccupants[p.house].push(p);
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-md mx-auto"
        style={{ fontFamily: "inherit" }}
      >
        {/* Background */}
        <rect width={SIZE} height={SIZE} fill={c.bg} rx="8" />

        {/* Outer square */}
        <rect
          x={lines.outerSquare.x}
          y={lines.outerSquare.y}
          width={lines.outerSquare.w}
          height={lines.outerSquare.h}
          fill="none"
          stroke={c.stroke}
          strokeWidth="1.5"
        />

        {/* Diagonals (corner to corner) */}
        {lines.diagonals.map((d, i) => (
          <line key={`diag-${i}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={c.stroke} strokeWidth="1" />
        ))}

        {/* Diamond (midpoint to midpoint) */}
        {lines.diamond.map((d, i) => (
          <line key={`diam-${i}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={c.stroke} strokeWidth="1" />
        ))}

        {/* House fills (invisible by default, lagna gets highlight) */}
        {polygons.map(({ house, points }) => (
          <polygon
            key={`fill-${house}`}
            points={points}
            fill={house === 1 ? c.lagnaFill : "transparent"}
            stroke="none"
          />
        ))}

        {/* House content: number, rashi, lord, planets */}
        {polygons.map(({ house, cx, cy, isKendra }) => {
          const houseInfo = houses.find(h => h.house_num === house);
          const occupants = houseOccupants[house] || [];
          const isLagna = house === 1;

          // Text sizes — kendra houses have more room
          const houseNumSize = 7;
          const rashiSize = isKendra ? 9 : 8;
          const planetSize = isKendra ? 10 : 9;

          // Vertical offsets from centroid
          const topOffset = isKendra ? -18 : -10;

          return (
            <g key={`content-${house}`}>
              {/* House number */}
              <text
                x={cx} y={cy + topOffset}
                textAnchor="middle"
                fontSize={houseNumSize}
                fill={c.houseNum}
              >
                {house}
              </text>

              {/* Rashi abbreviation */}
              <text
                x={cx} y={cy + topOffset + 11}
                textAnchor="middle"
                fontSize={rashiSize}
                fill={isLagna ? c.lagnaAccent : c.rashiText}
                fontWeight={isLagna ? "700" : "400"}
              >
                {houseInfo?.rashi.slice(0, 3) ?? ""}
              </text>

              {/* House lord */}
              <text
                x={cx} y={cy + topOffset + 22}
                textAnchor="middle"
                fontSize="7"
                fill={c.lordText}
              >
                {houseInfo?.lord ? `(${PLANET_ABBR[houseInfo.lord] ?? houseInfo.lord.slice(0, 2)})` : ""}
              </text>

              {/* Planets */}
              {occupants.map((p, idx) => {
                const yPos = cy + topOffset + 34 + idx * 12;
                const color = p.dignity ? DIGNITY_COLOR[p.dignity] : c.defaultPlanet;
                return (
                  <text
                    key={p.name}
                    x={cx} y={yPos}
                    textAnchor="middle"
                    fontSize={planetSize}
                    fontWeight="700"
                    fill={color}
                  >
                    {PLANET_ABBR[p.name] ?? p.name.slice(0, 2)}
                    {p.is_retrograde ? "ᴿ" : ""}
                  </text>
                );
              })}
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={SIZE / 2} y={SIZE / 2 - 4}
          textAnchor="middle"
          fontSize="10"
          fill={c.centerText}
          fontWeight="600"
        >
          {lagna}
        </text>
        <text
          x={SIZE / 2} y={SIZE / 2 + 8}
          textAnchor="middle"
          fontSize="8"
          fill={c.centerSub}
        >
          Lagna
        </text>
      </svg>

      {/* Dignity legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {Object.entries(DIGNITY_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-slate-500">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
