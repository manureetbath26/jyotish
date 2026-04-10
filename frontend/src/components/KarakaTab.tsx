"use client";

import { useState } from "react";
import { PlanetPosition } from "@/lib/api";
import {
  CHARA_KARAKA_ROLES,
  CHARA_KARAKA_BY_PLANET,
  CHARA_KARAKA_LORDSHIP,
  NAISARGIKA_KARAKAS,
  NAISARGIKA_KARAKA_IN_HOUSE,
  KARAKA_PLANET_COLORS,
  KARAKA_PLANET_BG,
  type CharaKarakaRole,
} from "@/lib/karakaInterpretations";

interface Props {
  planets: PlanetPosition[];
  lagna: string;
}

// Planets eligible for Chara Karaka assignment (Jaimini system: 7 planets, exclude Ketu)
const CHARA_ELIGIBLE = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"];

interface CharaAssignment extends CharaKarakaRole {
  planet: string;
  degree: number;
  rashi: string;
  house: number;
  dignity: string | null;
  is_retrograde: boolean;
}

/**
 * Compute Chara Karakas by sorting eligible planets by degree within rashi (descending).
 * Highest degree_in_rashi = Atmakaraka, 2nd highest = Amatyakaraka, etc.
 * Rahu uses (30 - degree) per Jaimini convention.
 */
function computeCharaKarakas(planets: PlanetPosition[]): CharaAssignment[] {
  const eligible = planets
    .filter(p => CHARA_ELIGIBLE.includes(p.name))
    .map(p => ({
      ...p,
      sortDegree: p.name === "Rahu" ? 30 - p.degree_in_rashi : p.degree_in_rashi,
    }))
    .sort((a, b) => b.sortDegree - a.sortDegree);

  return CHARA_KARAKA_ROLES.map((role, i) => {
    const p = eligible[i];
    if (!p) return null;
    return {
      ...role,
      planet: p.name,
      degree: p.degree_in_rashi,
      rashi: p.rashi,
      house: p.house,
      dignity: p.dignity,
      is_retrograde: p.is_retrograde,
    };
  }).filter(Boolean) as CharaAssignment[];
}

function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 text-sm">{title}</span>
          {badge && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
              {badge}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

const DIGNITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  exalted:      { label: "Exalted",      color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
  moolatrikona: { label: "Moolatrikona", color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30" },
  own:          { label: "Own Sign",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  debilitated:  { label: "Debilitated",  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
};

export function KarakaTab({ planets, lagna }: Props) {
  const charaKarakas = computeCharaKarakas(planets);
  const [expandedChara, setExpandedChara] = useState<string | null>("AK");
  const [expandedNaisargika, setExpandedNaisargika] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div>
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-amber-400 font-semibold">Karakas</span> are significators — planets that represent specific people, themes, and life areas in your chart.
          The <strong className="text-slate-300">Chara (variable)</strong> karakas are unique to your chart, assigned by planetary degrees.
          The <strong className="text-slate-300">Naisargika (natural)</strong> karakas are universal, based on each planet&apos;s inherent nature.
        </p>
      </div>

      {/* ── Chara Karakas (Jaimini) ── */}
      <Section title="Chara Karakas (Jaimini)" badge={`${lagna} Lagna`} defaultOpen>
        <p className="text-xs text-slate-500 mb-3">
          Assigned by descending degree within rashi. The planet at the highest degree becomes your Atmakaraka (soul significator), and so on.
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {charaKarakas.map(ck => {
            const color = KARAKA_PLANET_COLORS[ck.planet] || "text-slate-200";
            const bg = KARAKA_PLANET_BG[ck.planet] || "bg-slate-800/30 border-slate-700";
            const dignity = ck.dignity ? DIGNITY_BADGE[ck.dignity] : null;

            return (
              <button
                key={ck.id}
                onClick={() => setExpandedChara(expandedChara === ck.id ? null : ck.id)}
                className={`text-left border rounded-xl p-3 transition-all ${
                  expandedChara === ck.id
                    ? `${bg} ring-1 ring-amber-500/30`
                    : "border-slate-800 bg-slate-900/50 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{ck.icon}</span>
                  <span className="text-xs font-bold text-amber-400">{ck.shortName}</span>
                  <span className={`text-sm font-semibold ${color}`}>{ck.planet}</span>
                  {ck.is_retrograde && <span className="text-xs text-amber-400">℞</span>}
                </div>
                <p className="text-xs text-slate-400">{ck.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {ck.rashi} · {ck.degree.toFixed(1)}° · House {ck.house}
                  {dignity && (
                    <span className={`ml-1 ${dignity.color}`}>· {dignity.label}</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>

        {/* Expanded detail for selected Chara Karaka */}
        {expandedChara && (() => {
          const ck = charaKarakas.find(c => c.id === expandedChara);
          if (!ck) return null;
          const color = KARAKA_PLANET_COLORS[ck.planet] || "text-slate-200";
          const dignity = ck.dignity ? DIGNITY_BADGE[ck.dignity] : null;
          const planetRoleInterp = CHARA_KARAKA_BY_PLANET[ck.id]?.[ck.planet];
          const natalP = planets.find(p => p.name === ck.planet);

          return (
            <div className="border border-slate-700 rounded-xl overflow-hidden mt-2">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-800/50 flex items-center gap-3">
                <span className="text-xl">{ck.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {ck.planet} as {ck.name}{" "}
                    <span className="text-xs text-slate-500">({ck.shortName})</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className={color}>{ck.planet}</span> in {ck.rashi} · House {ck.house} · {ck.degree.toFixed(1)}°
                    {dignity && (
                      <span className={`ml-1 ${dignity.color}`}>· {dignity.label}</span>
                    )}
                    {ck.is_retrograde && <span className="text-amber-400 ml-1">· Retrograde</span>}
                  </p>
                </div>
              </div>

              <div className="px-4 py-4 space-y-4">
                {/* Primary: Planet-specific role interpretation */}
                {planetRoleInterp && (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-400 mb-1.5">
                      What {ck.planet} as Your {ck.name} Means
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed">{planetRoleInterp}</p>
                  </div>
                )}

                {/* Lordship — what houses this karaka rules and what that means */}
                {natalP && natalP.lord_of_houses.length > 0 && (
                  <div className="space-y-2">
                    {natalP.lord_of_houses.map(h => {
                      const lordInterp = CHARA_KARAKA_LORDSHIP[ck.id]?.[h];
                      return lordInterp ? (
                        <div key={h} className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-300 mb-1">
                            {ck.shortName} rules House {h}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">{lordInterp}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Life themes */}
                <div className="flex flex-wrap gap-1.5">
                  {ck.lifeThemes.map(theme => (
                    <span
                      key={theme}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                {/* Dignity / retrograde assessment */}
                {dignity && (
                  <div className={`border rounded-lg p-3 ${dignity.bg}`}>
                    <p className={`text-xs font-semibold ${dignity.color} mb-1`}>
                      {ck.planet} is {dignity.label}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ck.dignity === "exalted"
                        ? `${ck.planet} as your ${ck.name} is exalted in ${ck.rashi} — its ${ck.meaning.toLowerCase()} significations operate at peak power. The qualities ${ck.planet} brings to this role manifest with exceptional strength and natural authority.`
                        : ck.dignity === "debilitated"
                        ? `${ck.planet} as your ${ck.name} is debilitated in ${ck.rashi} — its ${ck.meaning.toLowerCase()} significations face karmic challenges. The themes governed by this role require conscious effort and remedial measures to reach their potential.`
                        : ck.dignity === "moolatrikona"
                        ? `${ck.planet} as your ${ck.name} is in moolatrikona in ${ck.rashi} — very strongly placed. Its ${ck.meaning.toLowerCase()} significations express naturally and powerfully.`
                        : `${ck.planet} as your ${ck.name} is in its own sign ${ck.rashi} — comfortable and steady. Its ${ck.meaning.toLowerCase()} significations manifest naturally without strain.`}
                    </p>
                  </div>
                )}

                {ck.is_retrograde && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-400 mb-1">
                      {ck.planet} Retrograde as {ck.shortName}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ck.planet}&apos;s retrograde motion turns the {ck.meaning.toLowerCase()} themes inward. The qualities {ck.planet} brings — {ck.planet === "Sun" ? "authority and leadership" : ck.planet === "Moon" ? "emotional depth" : ck.planet === "Mars" ? "courage and drive" : ck.planet === "Mercury" ? "intelligence and communication" : ck.planet === "Jupiter" ? "wisdom and faith" : ck.planet === "Venus" ? "love and beauty" : ck.planet === "Saturn" ? "discipline and karma" : "ambition and worldly desire"} — operate on a deeper, more introspective level. Past-life connections to this karaka role are active, and results may be delayed but carry profound inner significance.
                    </p>
                  </div>
                )}

                {/* Strong / Weak general outcomes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-green-950/30 border border-green-900/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-400 mb-1">When Strong</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{ck.strongPlacement}</p>
                  </div>
                  <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-400 mb-1">When Afflicted</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{ck.weakPlacement}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* ── Naisargika Karakas (Natural) ── */}
      <Section title="Naisargika Karakas (Natural Significators)" defaultOpen>
        <p className="text-xs text-slate-500 mb-3">
          Each planet permanently signifies certain people, body parts, and life themes.
          Below, each planet&apos;s karaka role is interpreted <em>through</em> its actual house placement in your chart — showing what those significations concretely mean for you.
        </p>

        <div className="space-y-2">
          {NAISARGIKA_KARAKAS.map(nk => {
            const natalP = planets.find(p => p.name === nk.planet);
            const isExpanded = expandedNaisargika === nk.planet;
            const color = KARAKA_PLANET_COLORS[nk.planet] || "text-slate-200";
            const bg = KARAKA_PLANET_BG[nk.planet] || "bg-slate-800/30 border-slate-700";
            const dignity = natalP?.dignity ? DIGNITY_BADGE[natalP.dignity] : null;
            const houseInterp = natalP ? NAISARGIKA_KARAKA_IN_HOUSE[nk.planet]?.[natalP.house] : null;

            // Find this planet's chara karaka role, if any
            const charaRole = charaKarakas.find(ck => ck.planet === nk.planet);

            return (
              <div key={nk.planet} className={`border rounded-xl overflow-hidden ${isExpanded ? bg : "border-slate-800"}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedNaisargika(isExpanded ? null : nk.planet)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-sm font-bold ${color} w-16 flex-shrink-0`}>{nk.planet}</span>
                    {natalP && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {natalP.rashi} · H{natalP.house}
                        {dignity && <span className={` ${dignity.color}`}> · {dignity.label}</span>}
                        {natalP.is_retrograde && <span className="text-amber-400"> · ℞</span>}
                      </span>
                    )}
                    {charaRole && (
                      <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
                        {charaRole.shortName}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {nk.significations.slice(0, 4).map(s => (
                        <span key={s} className="text-xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded hidden sm:inline">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs ml-2">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60">
                    {/* Signification tags */}
                    <div className="pt-3 flex flex-wrap gap-1.5">
                      {nk.significations.map(s => (
                        <span
                          key={s}
                          className={`text-xs px-2 py-0.5 rounded-full border ${bg}`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* ── Primary: Integrated karaka-in-house interpretation ── */}
                    {natalP && houseInterp && (
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-amber-400 mb-1.5">
                          {nk.planet} as Karaka of{" "}
                          {nk.significations.slice(0, 3).join(", ")} → House {natalP.house} ({natalP.rashi}
                          {natalP.dignity && <>, <span className="capitalize">{natalP.dignity}</span></>}
                          {natalP.is_retrograde && <>, retrograde</>})
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed">{houseInterp}</p>

                        {/* Lordship context — what houses this planet rules adds another layer */}
                        {natalP.lord_of_houses.length > 0 && (
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Additionally, {nk.planet} rules house{natalP.lord_of_houses.length > 1 ? "s" : ""}{" "}
                            <span className="font-semibold text-amber-400">{natalP.lord_of_houses.join(" & ")}</span>{" "}
                            in your chart — connecting its karaka significations ({nk.significations.slice(0, 2).join(", ").toLowerCase()}) with the themes of those houses.
                          </p>
                        )}

                        {/* Chara Karaka cross-reference */}
                        {charaRole && (
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed border-t border-slate-700/50 pt-2">
                            {nk.planet} is also your <span className="text-amber-400 font-semibold">{charaRole.name}</span> ({charaRole.meaning}) — doubling its importance. Its natural significations and its Jaimini role both express through House {natalP.house}.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dignity-specific impact on significations */}
                    {dignity && (
                      <div className={`border rounded-lg p-3 ${dignity.bg}`}>
                        <p className={`text-xs font-semibold ${dignity.color} mb-1`}>
                          {nk.planet} is {dignity.label}
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {dignity.label === "Exalted" || dignity.label === "Moolatrikona" || dignity.label === "Own Sign"
                            ? `This strengthens all of ${nk.planet}'s karaka significations — ${nk.significations.slice(0, 3).join(", ").toLowerCase()} — allowing them to manifest powerfully and positively in your life.`
                            : `This weakens ${nk.planet}'s ability to deliver its karaka significations — ${nk.significations.slice(0, 3).join(", ").toLowerCase()} — requiring conscious effort and possible remedial measures to support these life areas.`}
                        </p>
                      </div>
                    )}

                    {/* Retrograde impact on karaka significations */}
                    {natalP?.is_retrograde && (
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-400 mb-1">
                          {nk.planet} Retrograde as Karaka
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Retrograde motion turns {nk.planet}&apos;s karaka significations inward. The themes of{" "}
                          {nk.significations.slice(0, 3).join(", ").toLowerCase()} operate on a deeper, more karmic level.
                          Results related to these significations may be delayed, non-obvious, or require inner work before external manifestation.
                          Past-life connections to {nk.planet}&apos;s themes are active.
                        </p>
                      </div>
                    )}

                    {/* General strong/weak — collapsed into a compact row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-green-950/30 border border-green-900/40 rounded-lg p-3">
                        <p className="text-xs font-semibold text-green-400 mb-1">When Strong</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{nk.strongResult}</p>
                      </div>
                      <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-400 mb-1">When Weak</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{nk.weakResult}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
