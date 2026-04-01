"use client";
import { PlanetPosition } from "@/lib/api";

interface Props {
  planets: PlanetPosition[];
}

const DIGNITY_BADGE: Record<string, { label: string; className: string }> = {
  exalted:      { label: "Exalted",      className: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  moolatrikona: { label: "Moolatrikona", className: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  own:          { label: "Own Sign",     className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  debilitated:  { label: "Debilitated",  className: "bg-red-500/20 text-red-400 border border-red-500/30" },
};

export function PlanetTable({ planets }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wide">
            <th className="px-3 py-2.5 text-left">Planet</th>
            <th className="px-3 py-2.5 text-left">Sign</th>
            <th className="px-3 py-2.5 text-right">Degree</th>
            <th className="px-3 py-2.5 text-left">Nakshatra</th>
            <th className="px-3 py-2.5 text-center">Pada</th>
            <th className="px-3 py-2.5 text-center">House</th>
            <th className="px-3 py-2.5 text-center">R</th>
            <th className="px-3 py-2.5 text-left">Dignity</th>
            <th className="px-3 py-2.5 text-left">Lords</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((p, idx) => {
            const badge = p.dignity ? DIGNITY_BADGE[p.dignity] : null;
            return (
              <tr
                key={p.name}
                className={`border-t border-slate-800 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
              >
                <td className="px-3 py-2 font-semibold text-slate-200">{p.name}</td>
                <td className="px-3 py-2 text-slate-300">{p.rashi}</td>
                <td className="px-3 py-2 text-right text-slate-400 tabular-nums">
                  {p.degree_in_rashi.toFixed(2)}°
                </td>
                <td className="px-3 py-2 text-slate-300">{p.nakshatra}</td>
                <td className="px-3 py-2 text-center text-slate-400">{p.nakshatra_pada}</td>
                <td className="px-3 py-2 text-center text-slate-400">{p.house}</td>
                <td className="px-3 py-2 text-center text-amber-400">
                  {p.is_retrograde ? "R" : ""}
                </td>
                <td className="px-3 py-2">
                  {badge ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 text-xs">
                  {p.lord_of_houses.join(", ") || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
