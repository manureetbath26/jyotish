"use client";

import { SIGN_INDEX, ZODIAC_ORDER, type Sign } from "@/lib/charaDashaEngine";

/**
 * North Indian diamond chart for displaying 12 values (one per house).
 *
 * Layout (all coords in SVG viewBox 0 0 200 200):
 *   - Outer square (0,0) - (200,200)
 *   - Inner diamond with vertices at midpoints of outer sides: T(100,0),
 *     R(200,100), B(100,200), L(0,100)
 *   - Both outer-square diagonals drawn, crossing at center C(100,100)
 *   - Outer diagonals intersect the diamond edges at (50,50), (150,50),
 *     (150,150), (50,150) — these 4 points + the 4 diamond vertices
 *     divide the space into 12 regions
 *
 * Houses are arranged counter-clockwise starting from the BOTTOM inner
 * diamond (H1), matching the screenshot convention provided:
 *   - Inner diamond triangles: H1 bottom, H4 right, H7 top, H10 left
 *   - Corner sub-triangles: pairs {H2,H3} BR, {H5,H6} TR, {H8,H9} TL, {H11,H12} BL
 */

// Polygon coordinates for each of the 12 houses (index = house - 1)
const HOUSE_POLYGONS: string[] = [
  "100,100 150,150 100,200 50,150", // H1  bottom inner diamond
  "150,150 100,200 200,200",         // H2  BR inner sub (closer to H1)
  "150,150 200,200 200,100",         // H3  BR outer sub (closer to H4)
  "100,100 150,50 200,100 150,150",  // H4  right inner diamond
  "150,50 200,100 200,0",            // H5  TR outer sub (closer to H4)
  "150,50 200,0 100,0",              // H6  TR inner sub (closer to H7)
  "100,100 50,50 100,0 150,50",      // H7  top inner diamond
  "50,50 100,0 0,0",                 // H8  TL inner sub (closer to H7)
  "50,50 0,0 0,100",                 // H9  TL outer sub (closer to H10)
  "100,100 50,150 0,100 50,50",      // H10 left inner diamond
  "50,150 0,100 0,200",              // H11 BL outer sub (closer to H10)
  "50,150 0,200 100,200",            // H12 BL inner sub (closer to H1)
];

// Centroids for value labels
const HOUSE_CENTROIDS: [number, number][] = [
  [100, 160],  // H1 (adjusted down from center)
  [150, 185],  // H2
  [182, 152],  // H3
  [150, 100],  // H4
  [182, 48],   // H5
  [150, 15],   // H6
  [100, 40],   // H7 (adjusted up from center)
  [50, 15],    // H8
  [18, 48],    // H9
  [50, 100],   // H10
  [18, 152],   // H11
  [50, 185],   // H12
];

// Positions for small house-number labels (closer to the inner meeting point)
const HOUSE_LABEL_POS: [number, number][] = [
  [100, 115],  // H1 — near top of bottom diamond
  [135, 182],  // H2
  [170, 138],  // H3
  [140, 105],  // H4 — left of center
  [170, 60],   // H5
  [135, 20],   // H6
  [100, 85],   // H7 — below top of diamond
  [65, 20],    // H8
  [30, 60],    // H9
  [60, 105],   // H10 — right of center
  [30, 138],   // H11
  [65, 182],   // H12
];

interface Props {
  /** 12 values indexed by sign (0 = Aries, 1 = Taurus, ..., 11 = Pisces) */
  signTotals: number[];
  lagnaSign: Sign;
  title?: string;
  /** Planets placed at each sign (for rendering symbols inside houses) */
  planetsBySign?: Record<string, string[]>;
  /** Optional: highlight a specific house (1-12) */
  highlightHouse?: number;
  /** Color theme — border + text */
  accent?: "amber" | "blue" | "emerald";
  /** SVG size in px (the component stays square) */
  size?: number;
}

export function NorthIndianChart({
  signTotals,
  lagnaSign,
  title,
  highlightHouse,
  accent = "amber",
  size = 360,
}: Props) {
  const lagnaIdx = SIGN_INDEX[lagnaSign];

  const accentClasses: Record<string, { stroke: string; text: string; highlight: string; title: string }> = {
    amber: {
      stroke: "#f59e0b",
      text: "#e2e8f0",
      highlight: "rgba(245, 158, 11, 0.15)",
      title: "text-amber-400",
    },
    blue: {
      stroke: "#3b82f6",
      text: "#e2e8f0",
      highlight: "rgba(59, 130, 246, 0.15)",
      title: "text-blue-400",
    },
    emerald: {
      stroke: "#10b981",
      text: "#e2e8f0",
      highlight: "rgba(16, 185, 129, 0.15)",
      title: "text-emerald-400",
    },
  };
  const cls = accentClasses[accent];

  // For each house 1-12, determine sign and value
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIdx = (lagnaIdx + i) % 12;
    return {
      house: i + 1,
      signIdx,
      sign: ZODIAC_ORDER[signIdx],
      value: signTotals[signIdx] ?? 0,
    };
  });

  return (
    <div className="inline-flex flex-col items-center">
      {title && (
        <h3 className={`text-base font-bold mb-2 ${cls.title}`}>{title}</h3>
      )}
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="max-w-full"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Highlight layer — only for the highlighted house */}
        {highlightHouse && highlightHouse >= 1 && highlightHouse <= 12 && (
          <polygon
            points={HOUSE_POLYGONS[highlightHouse - 1]}
            fill={cls.highlight}
          />
        )}

        {/* Chart outlines */}
        {HOUSE_POLYGONS.map((poly, i) => (
          <polygon
            key={i}
            points={poly}
            fill="none"
            stroke={cls.stroke}
            strokeWidth={0.8}
          />
        ))}

        {/* Values — centered in each region */}
        {houses.map((h) => {
          const [cx, cy] = HOUSE_CENTROIDS[h.house - 1];
          return (
            <text
              key={`v-${h.house}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="600"
              fill={cls.text}
            >
              {h.value}
            </text>
          );
        })}

        {/* Small house-number labels */}
        {houses.map((h) => {
          const [lx, ly] = HOUSE_LABEL_POS[h.house - 1];
          return (
            <text
              key={`h-${h.house}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="6.5"
              fill={cls.stroke}
              opacity="0.9"
            >
              {h.house}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
