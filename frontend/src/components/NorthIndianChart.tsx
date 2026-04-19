"use client";

import { SIGN_INDEX, ZODIAC_ORDER, type Sign } from "@/lib/charaDashaEngine";

/**
 * North Indian diamond chart with Lagna (H1) at the TOP inner diamond.
 *
 * Layout (SVG viewBox 0 0 200 200):
 *   Outer square + inscribed diamond + both outer diagonals → 12 regions.
 *   Houses run counter-clockwise from H1 (top inner):
 *     H1  = top inner diamond
 *     H2  = top-left UPPER sub (closer to top edge)
 *     H3  = top-left LOWER sub (closer to left edge)
 *     H4  = left inner diamond
 *     H5  = bottom-left UPPER sub (closer to left edge)
 *     H6  = bottom-left LOWER sub (closer to bottom edge)
 *     H7  = bottom inner diamond
 *     H8  = bottom-right LOWER sub (closer to bottom edge)
 *     H9  = bottom-right UPPER sub (closer to right edge)
 *     H10 = right inner diamond
 *     H11 = top-right LOWER sub (closer to right edge)
 *     H12 = top-right UPPER sub (closer to top edge)
 *
 * Small numbers displayed inside each house are RASHI NUMBERS (1-12,
 * Aries=1 .. Pisces=12), not house numbers. The rashi that sits in each
 * house is computed from the Lagna sign.
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

// Centroid for the main VALUE label (large number)
const VALUE_POS: [number, number][] = [
  [100, 38],   // H1 — upper part of top diamond
  [50, 18],    // H2
  [18, 50],    // H3
  [38, 100],   // H4 — left part of left diamond
  [18, 150],   // H5
  [50, 182],   // H6
  [100, 162],  // H7 — lower part of bottom diamond
  [150, 182],  // H8
  [182, 150],  // H9
  [162, 100],  // H10 — right part of right diamond
  [182, 50],   // H11
  [150, 18],   // H12
];

// Small RASHI number label position — near the inner meeting point of
// each region (where the 4 inner diamond tips converge visually)
const RASHI_POS: [number, number][] = [
  [100, 82],   // H1 — near bottom of top diamond (close to center)
  [62, 40],    // H2 — near (50,50) inward
  [40, 62],    // H3 — near (50,50) inward
  [82, 100],   // H4 — right side of left diamond (close to center)
  [40, 138],   // H5 — near (50,150) inward
  [62, 160],   // H6 — near (50,150) inward
  [100, 118],  // H7 — near top of bottom diamond (close to center)
  [138, 160],  // H8
  [160, 138],  // H9
  [118, 100],  // H10 — left side of right diamond
  [160, 62],   // H11
  [138, 40],   // H12
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

  // Accent color mappings
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

  // Per-house data
  const houses = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    const signIdx = (lagnaIdx + i) % 12;
    return {
      house: h,
      signIdx,
      sign: ZODIAC_ORDER[signIdx],
      rashiNumber: signIdx + 1, // 1-12
      value: signTotals[signIdx] ?? 0,
    };
  });

  return (
    <div className="inline-flex flex-col items-center">
      {title && (
        <h3 className={`text-base font-bold mb-2 ${titleColor}`}>{title}</h3>
      )}
      {/* Text color via currentColor — text-slate-100 auto-adapts per theme
          (near-white in dark mode, near-black in light mode via inverted scale) */}
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="max-w-full text-slate-100"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Highlight layer */}
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

        {/* Large value numbers (theme-aware) */}
        {houses.map((h) => {
          const [cx, cy] = VALUE_POS[h.house - 1];
          return (
            <text
              key={`v-${h.house}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="700"
              fill="currentColor"
            >
              {h.value}
            </text>
          );
        })}

        {/* Small rashi numbers (accent color) */}
        {houses.map((h) => {
          const [rx, ry] = RASHI_POS[h.house - 1];
          return (
            <text
              key={`r-${h.house}`}
              x={rx}
              y={ry}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="7"
              fontWeight="500"
              fill={strokeColor}
              opacity="0.85"
            >
              {h.rashiNumber}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
