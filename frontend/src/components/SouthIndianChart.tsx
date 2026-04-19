"use client";

import { SIGN_INDEX, type Sign } from "@/lib/charaDashaEngine";

/**
 * South Indian chart — 4x4 grid with fixed sign positions:
 *
 *   Pisces  | Aries  | Taurus | Gemini
 *   Aquarius|        |        | Cancer
 *   Capricn.|        |        | Leo
 *   Saggit. | Scorpio| Libra  | Virgo
 *
 * The Lagna cell is highlighted. Signs are FIXED in their grid positions.
 */

const SIGN_GRID_POSITION: Record<Sign, [number, number]> = {
  // [col, row] — row 0 top, col 0 left
  Pisces:      [0, 0],
  Aries:       [1, 0],
  Taurus:      [2, 0],
  Gemini:      [3, 0],
  Aquarius:    [0, 1],
  Cancer:      [3, 1],
  Capricorn:   [0, 2],
  Leo:         [3, 2],
  Sagittarius: [0, 3],
  Scorpio:     [1, 3],
  Libra:       [2, 3],
  Virgo:       [3, 3],
};

const SIGN_ABBR: Record<Sign, string> = {
  Aries: "Ari", Taurus: "Tau", Gemini: "Gem", Cancer: "Can",
  Leo: "Leo", Virgo: "Vir", Libra: "Lib", Scorpio: "Sco",
  Sagittarius: "Sag", Capricorn: "Cap", Aquarius: "Aqu", Pisces: "Pis",
};

interface Props {
  signTotals: number[];
  lagnaSign: Sign;
  title?: string;
  highlightSign?: Sign;
  accent?: "amber" | "blue" | "emerald";
  size?: number;
}

export function SouthIndianChart({
  signTotals,
  lagnaSign,
  title,
  accent = "amber",
  size = 360,
}: Props) {
  const accentClasses: Record<string, { border: string; title: string; lagnaBg: string; lagnaText: string; valueText: string }> = {
    amber: {
      border: "border-amber-500/40",
      title: "text-amber-400",
      lagnaBg: "bg-amber-500/20",
      lagnaText: "text-amber-300",
      valueText: "text-slate-100",
    },
    blue: {
      border: "border-blue-500/40",
      title: "text-blue-400",
      lagnaBg: "bg-blue-500/20",
      lagnaText: "text-blue-300",
      valueText: "text-slate-100",
    },
    emerald: {
      border: "border-emerald-500/40",
      title: "text-emerald-400",
      lagnaBg: "bg-emerald-500/20",
      lagnaText: "text-emerald-300",
      valueText: "text-slate-100",
    },
  };
  const cls = accentClasses[accent];

  return (
    <div className="inline-flex flex-col items-center">
      {title && <h3 className={`text-base font-bold mb-2 ${cls.title}`}>{title}</h3>}
      <div
        className={`grid grid-cols-4 grid-rows-4 border ${cls.border} bg-slate-900/30`}
        style={{ width: size, height: size }}
      >
        {Array.from({ length: 16 }, (_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);

          // Center 2x2 is empty
          if ((col === 1 || col === 2) && (row === 1 || row === 2)) {
            // Put the chart title label in the center (spans 2x2)
            if (col === 1 && row === 1) {
              return (
                <div
                  key={i}
                  className="row-span-2 col-span-2 flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-wider"
                >
                  Rashi
                </div>
              );
            }
            return null;
          }

          // Find which sign is at this grid position
          const sign = (Object.keys(SIGN_GRID_POSITION) as Sign[]).find((s) => {
            const [c, r] = SIGN_GRID_POSITION[s];
            return c === col && r === row;
          });
          if (!sign) return <div key={i} className={`border ${cls.border}`} />;

          const signIdx = SIGN_INDEX[sign];
          const value = signTotals[signIdx];
          const isLagna = sign === lagnaSign;

          return (
            <div
              key={i}
              className={`border ${cls.border} p-1.5 flex flex-col justify-between relative ${
                isLagna ? cls.lagnaBg : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                  {SIGN_ABBR[sign]}
                </span>
                {isLagna && (
                  <span className={`text-[8px] font-bold ${cls.lagnaText}`}>
                    LG
                  </span>
                )}
              </div>
              <div
                className={`text-xl font-bold text-center ${cls.valueText}`}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
