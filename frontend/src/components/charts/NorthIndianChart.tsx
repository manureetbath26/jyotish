"use client";
/**
 * North Indian Chart — Rectangular layout matching traditional style.
 *
 * Rectangle W×H (4:3 landscape). All 12 houses are triangles.
 * Key inner points: P1=(W/4,H/3), P2=(3W/4,H/3), P3=(W/4,2H/3), P4=(3W/4,2H/3)
 * Edge midpoints:   TM=(W/2,0), BM=(W/2,H), LM=(0,H/2), RM=(W,H/2)
 *
 * H1 at top-center, houses progress CCW:
 *  H1(top)→H2(top-L)→H3(L-top corner)→H4(left)→H5(L-bot corner)→H6(bot-L)
 *  →H7(bottom)→H8(bot-R)→H9(R-bot corner)→H10(right)→H11(R-top corner)→H12(top-R)
 */

import React from "react";
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

const W = 400;
const H = 300;

function buildHousePolygons() {
  const pts = (...coords: [number, number][]) =>
    coords.map(([x, y]) => `${x},${y}`).join(" ");
  const cent = (...coords: [number, number][]): [number, number] => [
    coords.reduce((s, [x]) => s + x, 0) / coords.length,
    coords.reduce((s, [, y]) => s + y, 0) / coords.length,
  ];

  // Named key points
  const TL: [number,number] = [0,   0  ];
  const TM: [number,number] = [200, 0  ];
  const TR: [number,number] = [400, 0  ];
  const LM: [number,number] = [0,   150];
  const RM: [number,number] = [400, 150];
  const BL: [number,number] = [0,   300];
  const BM: [number,number] = [200, 300];
  const BR: [number,number] = [400, 300];
  const P1: [number,number] = [100, 100];   // inner upper-left
  const P2: [number,number] = [300, 100];   // inner upper-right
  const P3: [number,number] = [100, 200];   // inner lower-left
  const P4: [number,number] = [300, 200];   // inner lower-right

  return [
    { house: 1,  verts: [TM, P2, P1]  },  // top-center  ▽
    { house: 2,  verts: [TL, TM, P1]  },  // top-left    △
    { house: 3,  verts: [TL, P1, LM]  },  // left-top corner
    { house: 4,  verts: [LM, P1, P3]  },  // left-middle
    { house: 5,  verts: [LM, P3, BL]  },  // left-bot corner
    { house: 6,  verts: [BL, BM, P3]  },  // bottom-left △
    { house: 7,  verts: [BM, P4, P3]  },  // bottom-center ▽
    { house: 8,  verts: [BM, BR, P4]  },  // bottom-right △
    { house: 9,  verts: [BR, P4, RM]  },  // right-bot corner
    { house: 10, verts: [RM, P2, P4]  },  // right-middle
    { house: 11, verts: [RM, TR, P2]  },  // right-top corner
    { house: 12, verts: [TM, TR, P2]  },  // top-right   △
  ].map(({ house, verts }) => ({
    house,
    points: pts(...verts as [number,number][]),
    cx: cent(...verts as [number,number][])[0],
    cy: cent(...verts as [number,number][])[1],
  }));
}

export function NorthIndianChart({ lagna, planets, houses }: Props) {
  const housePolygons = buildHousePolygons();

  // Map house number → planets
  const houseOccupants: Record<number, PlanetPosition[]> = {};
  planets.forEach(p => {
    if (!houseOccupants[p.house]) houseOccupants[p.house] = [];
    houseOccupants[p.house].push(p);
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-lg mx-auto"
        style={{ fontFamily: "inherit" }}
      >
        {/* Background */}
        <rect width={W} height={H} fill="#0f172a" rx="6" />

        {/* 12 house cells */}
        {housePolygons.map(({ house, points, cx, cy }) => {
          const houseInfo  = houses.find(h => h.house_num === house);
          const occupants  = houseOccupants[house] || [];
          const isLagna    = house === 1;

          return (
            <g key={house}>
              <polygon
                points={points}
                fill={isLagna ? "#1c1a04" : "#0f172a"}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* House number — tiny, near centroid */}
              <text
                x={cx} y={cy - 14}
                textAnchor="middle" fontSize="7" fill="#334155"
              >
                {house}
              </text>

              {/* Rashi name (3-char) */}
              <text
                x={cx} y={cy - 3}
                textAnchor="middle"
                fontSize="8"
                fill={isLagna ? "#fbbf24" : "#475569"}
                fontWeight={isLagna ? "700" : "400"}
              >
                {houseInfo?.rashi.slice(0, 3) ?? ""}
              </text>

              {/* House lord */}
              <text
                x={cx} y={cy + 8}
                textAnchor="middle" fontSize="7" fill="#1e3a5f"
              >
                {houseInfo?.lord
                  ? `(${PLANET_ABBR[houseInfo.lord] ?? houseInfo.lord.slice(0, 2)})`
                  : ""}
              </text>

              {/* Planets */}
              {occupants.map((p, idx) => {
                const color = p.dignity ? DIGNITY_COLOR[p.dignity] : "#94a3b8";
                return (
                  <text
                    key={p.name}
                    x={cx}
                    y={cy + 20 + idx * 11}
                    textAnchor="middle"
                    fontSize="9"
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

        {/* Lagna label — subtle centre of chart */}
        <text
          x={W / 2} y={H / 2 - 5}
          textAnchor="middle" fontSize="9" fill="#1e3a5f" fontWeight="600"
        >
          {lagna}
        </text>
        <text
          x={W / 2} y={H / 2 + 7}
          textAnchor="middle" fontSize="7" fill="#1e293b"
        >
          Lagna
        </text>
      </svg>

      {/* Dignity legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {Object.entries(DIGNITY_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="text-xs text-slate-500">
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
