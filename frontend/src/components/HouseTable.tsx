"use client";
import { HouseInfo } from "@/lib/api";

interface Props {
  houses: HouseInfo[];
}

export function HouseTable({ houses }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wide">
            <th className="px-3 py-2.5 text-left">House</th>
            <th className="px-3 py-2.5 text-left">Sign (Rashi)</th>
            <th className="px-3 py-2.5 text-left">Lord</th>
            <th className="px-3 py-2.5 text-left">Occupants</th>
          </tr>
        </thead>
        <tbody>
          {houses.map((h, idx) => (
            <tr
              key={h.house_num}
              className={`border-t border-slate-800 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
            >
              <td className="px-3 py-2 font-semibold text-amber-400">{h.house_num}</td>
              <td className="px-3 py-2 text-slate-200">{h.rashi}</td>
              <td className="px-3 py-2 text-slate-300">{h.lord}</td>
              <td className="px-3 py-2 text-slate-400">
                {h.occupants.length > 0 ? h.occupants.join(", ") : <span className="text-slate-700">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
