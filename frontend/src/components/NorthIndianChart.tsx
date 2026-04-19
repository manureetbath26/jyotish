"use client";

import { SIGN_INDEX, ZODIAC_ORDER, type Sign } from "@/lib/charaDashaEngine";

/**
 * North Indian diamond chart with Lagna (H1) at the TOP inner diamond.
 *
 * Houses counter-clockwise from H1 (top inner):
 *   H1 top-inner, H2 TL-upper, H3 TL-lower, H4 left-inner,
 *   H5 BL-upper, H6 BL-lower, H7 bottom-inner, H8 BR-lower,
 *   H9 BR-upper, H10 right-inner, H11 TR-lower, H12 TR-upper
 *
 * Small numbers are RASHI numbers (1=Aries .. 12=Pisces) of the sign
 * occupying each house, computed from the Lagna sign.
 *
 * Text uses a paint-order halo so values do not visually collide with
 * the chart's diagonal lines — the halo colour matches the card bg
 * (var(--color-slate-900)) and adapts to light/dark themes.
 */

// Polygon coords — index = house - 1
const HOUSE_POLYGONS: string[] = [
  "50,50 100,0 150,50 100,100",      // H1  top inner diamond
  "0,0 100,0 50,50",                 // H2  TL UPPER sub
  "0,0 0,100 50,50",                 // H3  TL LOWER sub
  "50,50 0,100 50,150 100,100",      // H4  left inner diamond
  "0,200 0,100 50,150",              // H5  BL UPPER sub (closer to left)
  "0,200 100,200 50,150",            // H6  BL LOWER sub (closer to bottom)
  "50,150 100,200 150,150 100,100",  // H7  bottom inner diamond
  "200,200 100,200 150,150",         // H8  BR LOWER sub (closer to bottom)
  "200,200 200,100 150,150",         // H9  BR UPPER sub (closer to right)
  "150,50 200,100 150,150 100,100",  // H10 right inner diamond
  "200,0 200,100 150,50",            // H11 TR LOWER sub (closer to right)
  "200,0 100,0 150,50",              // H12 TR UPPER sub (closer to top)
];

// Positions for the main VALUE label
// Chosen to sit well inside each region, away from the diagonals
const VALUE_POS: [number, number][] = [
  [100, 30],   // H1  top inner
  [50, 20],    // H2  TL upper
  [20, 50],    // H3  TL lower
  [30, 100],   // H4  left inner
  [20, 150],   // H5  BL upper
  [50, 180],   // H6  BL lower
  [100, 170],  // H7  bottom inner
  [150, 180],  // H8  BR lower
  [180, 150],  // H9  BR upper
  [170, 100],  // H10 right inner
  [180, 50],   // H11 TR lower
  [150, 20],   // H12 TR upper
];

// Small RASHI number — near the inner meeting point of each region,
// positioned to stay safely within the polygon
const RASHI_POS: [number, number][] = [
  [100, 72],   // H1
  [48, 38],    // H2
  [38, 48],    // H3
  [72, 100],   // H4
  [38, 152],   // H5
  [62, 165],   // H6
  [100, 128],  // H7
  [138, 165],  // H8
  [162, 152],  // H9
  [128, 100],  // H10
  [162, 48],   // H11
  [138, 38],   // H12
];

interface Props {
  /** 12 values indexed by sign (0 = Aries ... 11 = Pisces) */
  signTotals: number[];
  lagnaSign: Sign;
  title?: string;
  /** Optional: highlight a specific house (1-12) */
  highlightHouse?: number;
  accent?: "amber" | "blue" | "emerald";
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

  const strokeColor =
    accent === "blue" ? "#3b82f6"
    : accent === "emerald" ? "#10b981"
    : "#f59e0b";
  const highlightFill =
    accent === "blue" ? "rgba(59, 130, 246, 0.12)"
    : accent === "emerald" ? "rgba(16, 185, 129, 0.12)"
    : "rgba(245, 158, 11, 0.12)";
  const titleColor =
    accent === "blue" ? "text-blue-400"
    : accent === "emerald" ? "text-emerald-400"
    : "text-amber-400";

  // Halo colour matches the card background (adapts to theme)
  const haloStyle = {
    paintOrder: "stroke" as const,
    stroke: "var(--color-slate-900)",
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
  };
  const haloStyleSmall = {
    paintOrder: "stroke" as const,
    stroke: "var(--color-slate-900)",
    strokeWidth: 2,
    strokeLinejoin: "round" as const,
  };

  const houses = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    const signIdx = (lagnaIdx + i) % 12;
    return {
      house: h,
      signIdx,
      sign: ZODIAC_ORDER[signIdx],
      rashiNumber: signIdx + 1,
      value: signTotals[signIdx] ?? 0,
    };
  });

  return (
    <div className="inline-flex flex-col items-center">
      {title && (
        <h3 className={`text-base font-bold mb-2 ${titleColor}`}>{title}</h3>
      )}
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="max-w-full text-slate-100"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Per-house highlight */}
        {highlightHouse && highlightHouse >= 1 && highlightHouse <= 12 && (
          <polygon
            points={HOUSE_POLYGONS[highlightHouse - 1]}
            fill={highlightFill}
          />
        )}

        {/* Chart outlines */}
        {HOUSE_POLYGONS.map((poly, i) => (
          <polygon
            key={i}
            points={poly}
            fill="none"
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        ))}

        {/* Large value numbers (with halo so they don't visually clash with lines) */}
        {houses.map((h) => {
          const [cx, cy] = VALUE_POS[h.house - 1];
          return (
            <text
              key={`v-${h.house}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill="currentColor"
              style={haloStyle}
            >
              {h.value}
            </text>
          );
        })}

        {/* Small rashi numbers (also haloed so they stay crisp) */}
        {houses.map((h) => {
          const [rx, ry] = RASHI_POS[h.house - 1];
          return (
            <text
              key={`r-${h.house}`}
              x={rx}
              y={ry}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="6.5"
              fontWeight="600"
              fill={strokeColor}
              style={haloStyleSmall}
            >
              {h.rashiNumber}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
