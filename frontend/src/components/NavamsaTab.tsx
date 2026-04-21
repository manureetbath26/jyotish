"use client";
import { useState } from "react";
import { NavamsaPosition, PlanetPosition } from "@/lib/api";
import { SouthIndianChart } from "./charts/SouthIndianChart";
import { NorthIndianChart } from "./charts/NorthIndianChart";
import { HouseInfo } from "@/lib/api";
import { NavamsaInterpretation } from "./NavamsaInterpretation";
import { PremiumLock } from "./PremiumLock";

type ChartStyle = "north" | "south";

interface Props {
  navamsaLagna: string;
  navamsaPlanets: NavamsaPosition[];
}

const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_LORDS: Record<number, string> = {
  1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury",
  7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter",
};

export function NavamsaTab({ navamsaLagna, navamsaPlanets }: Props) {
  const [style, setStyle] = useState<ChartStyle>("north");

  // Convert navamsa data to chart-compatible format
  const lagnaRashiNum = RASHI_NAMES.indexOf(navamsaLagna) + 1;

  const planets: PlanetPosition[] = navamsaPlanets.map(p => ({
    name: p.name,
    longitude: (p.rashi_num - 1) * 30 + p.degree_in_rashi,
    rashi: p.rashi,
    rashi_num: p.rashi_num,
    degree_in_rashi: p.degree_in_rashi,
    house: p.house,
    nakshatra: "",
    nakshatra_pada: 1,
    is_retrograde: false,
    dignity: null,
    lord_of_houses: [],
  }));

  // Build houses for navamsa
  const houses: HouseInfo[] = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1;
    const rashiNum = ((lagnaRashiNum - 1 + i) % 12) + 1;
    return {
      house_num: houseNum,
      rashi: RASHI_NAMES[rashiNum - 1],
      rashi_num: rashiNum,
      lord: SIGN_LORDS[rashiNum],
      occupants: navamsaPlanets
        .filter(p => p.house === houseNum)
        .map(p => p.name),
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Navamsa Lagna (D-9)</p>
        <p className="text-xl font-bold text-amber-400">{navamsaLagna}</p>
        <p className="text-xs text-slate-500 mt-1">
          Navamsa reveals soul purpose, spouse, and inner spiritual nature
        </p>
      </div>

      {/* Chart style toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Chart Style:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {(["north", "south"] as ChartStyle[]).map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1 text-xs transition-colors ${
                style === s
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {s === "north" ? "North Indian" : "South Indian"}
            </button>
          ))}
        </div>
      </div>

      {style === "south" ? (
        <SouthIndianChart
          lagna={navamsaLagna}
          lagna_degree={(lagnaRashiNum - 1) * 30}
          planets={planets}
          houses={houses}
        />
      ) : (
        <NorthIndianChart
          lagna={navamsaLagna}
          lagna_degree={(lagnaRashiNum - 1) * 30}
          planets={planets}
          houses={houses}
        />
      )}

      <PremiumLock>
        <NavamsaInterpretation navamsaLagna={navamsaLagna} navamsaPlanets={navamsaPlanets} />
      </PremiumLock>

      {/* Navamsa planet table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left">Planet</th>
              <th className="px-3 py-2.5 text-left">D-9 Sign</th>
              <th className="px-3 py-2.5 text-center">D-9 House</th>
            </tr>
          </thead>
          <tbody>
            {navamsaPlanets.map((p, idx) => (
              <tr
                key={p.name}
                className={`border-t border-slate-800 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
              >
                <td className="px-3 py-2 font-semibold text-slate-200">{p.name}</td>
                <td className="px-3 py-2 text-slate-300">{p.rashi}</td>
                <td className="px-3 py-2 text-center text-slate-400">{p.house}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
