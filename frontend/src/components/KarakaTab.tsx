"use client";

import { useState } from "react";
import { PlanetPosition } from "@/lib/api";
import { computeCharaKarakas, KarakaResult } from "@/lib/karakaEngine";
import { useKarakaInterpretations } from "@/hooks/useKarakaInterpretations";
import {
  KARAKA_PLANET_COLORS,
  KARAKA_PLANET_BG,
  type CharaKarakaRole,
} from "@/lib/karakaInterpretations";

interface Props {
  planets: PlanetPosition[];
  lagna: string;
}

/** Adapter: convert KarakaResult[] to the shape used by the UI below */
interface CharaAssignment extends CharaKarakaRole {
  planet: string;
  degree: number;
  rashi: string;
  house: number;
  dignity: string | null;
  is_retrograde: boolean;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * What each house governs — used to build concrete lordship sentences.
 * These are standard classical house themes (BPHS Ch. 11).
 */
const HOUSE_THEME_TEXT: Record<number, string> = {
  1:  "self, body, personality, and vitality",
  2:  "wealth, speech, family, and accumulated resources",
  3:  "courage, siblings, communication, and short travels",
  4:  "home, mother, inner peace, and property",
  5:  "children, intelligence, creativity, and past-life merit",
  6:  "debts, enemies, health challenges, and service",
  7:  "marriage, partnerships, and public life",
  8:  "longevity, transformation, hidden wealth, and occult matters",
  9:  "dharma, father, fortune, and higher wisdom",
  10: "career, status, authority, and public reputation",
  11: "gains, fulfillment of desires, and social networks",
  12: "losses, foreign lands, expenses, and spiritual liberation",
};

/**
 * Assess karaka strength from dignity + house placement.
 * Score logic:
 *   Dignity : exalted +3, moolatrikona +2, own +1, debilitated −2
 *   House   : trikona (5,9) +2, kendra (1,4,7,10) +1, dusthana (6,8,12) −1
 *   Level   : score ≥ 3 → strong, score ≤ −1 → weak, else moderate
 */
const DUSTHANAS = [6, 8, 12];

/**
 * Assess karaka strength from dignity + house placement.
 *
 * Dignity  : exalted +3, moolatrikona +2, own +2, debilitated −2
 * House    : trikona (5,9) +2, kendra (1,4,7,10) +1, dusthana (6,8,12) −1
 * Viparita : if the planet lords any dusthana AND sits in a dusthana,
 *            the dusthana penalty is cancelled (BPHS Harsha/Sarala/Vimala yogas —
 *            dusthana lord in dusthana gives unexpectedly positive results).
 *
 * Thresholds: score ≥ 2 → strong | score ≤ −1 → weak | else → moderate
 */
function computeKarakaStrength(
  dignity: string | null | undefined,
  house: number,
  lordOfHouses: number[] = [],
): { level: "strong" | "moderate" | "weak"; summary: string } {
  let score = 0;
  const parts: string[] = [];

  // ── Dignity ──────────────────────────────────────────────────────────────
  if (dignity === "exalted") {
    score += 3;
    parts.push("exalted in sign");
  } else if (dignity === "moolatrikona") {
    score += 2;
    parts.push("moolatrikona placement");
  } else if (dignity === "own") {
    score += 2; // own sign: planet fully expresses its nature
    parts.push("own sign");
  } else if (dignity === "debilitated") {
    score -= 2;
    parts.push("debilitated in sign");
  } else {
    parts.push("neutral sign");
  }

  // ── House ─────────────────────────────────────────────────────────────────
  const inDusthana = DUSTHANAS.includes(house);
  const lordsADusthana = lordOfHouses.some(h => DUSTHANAS.includes(h));
  const viparita = inDusthana && lordsADusthana;

  if ([5, 9].includes(house)) {
    score += 2;
    parts.push(`${ordinal(house)} house — trikona (auspicious)`);
  } else if ([1, 4, 7, 10].includes(house)) {
    score += 1;
    parts.push(`${ordinal(house)} house — kendra (angular, stable)`);
  } else if (inDusthana) {
    if (viparita) {
      // Dusthana lord in dusthana — penalty cancelled, yoga noted
      const yogaName = lordOfHouses.includes(6) ? "Harsha" : lordOfHouses.includes(8) ? "Sarala" : "Vimala";
      parts.push(`${ordinal(house)} house — ${yogaName} Yoga (dusthana lord in dusthana: adverse effects cancelled, unexpected gains)`);
      // score unchanged — neutral house-effect, no penalty
    } else {
      score -= 1;
      parts.push(`${ordinal(house)} house — dusthana (challenging)`);
    }
  } else {
    parts.push(`${ordinal(house)} house`);
  }

  const level: "strong" | "moderate" | "weak" =
    score >= 2 ? "strong" : score <= -1 ? "weak" : "moderate";

  return { level, summary: parts.join(" · ") };
}

/** Natural significator description for each planet — for convergence text. */
const NAISARGIKA_ROLE: Record<string, string> = {
  Sun:     "soul, vitality, authority, and the father",
  Moon:    "mind, emotions, nourishment, and the mother",
  Mars:    "courage, siblings, drive, and life-force energy",
  Mercury: "intellect, communication, trade, and adaptability",
  Jupiter: "wisdom, children, dharma, and divine grace",
  Venus:   "love, beauty, relationships, and sensory comfort",
  Saturn:  "karma, discipline, longevity, and service",
};

/**
 * Generate meaningful, role-specific text explaining WHY a planet holding
 * both a Chara Karaka and Naisargika Karaka role matters — not boilerplate.
 */
function charaConvergenceText(
  planet: string,
  charaRoleName: string,
  charaMeaning: string,
  house: number,
): string {
  const nkRole = NAISARGIKA_ROLE[planet] ?? "its classical significations";

  const byRole: Partial<Record<string, string>> = {
    Atmakaraka:
      `Both Jaimini and the Naisargika tradition single out ${planet} as the soul's deepest indicator. ` +
      `The Atmakaraka carries the soul's unfinished lessons from past lives — and because ${planet} is also ` +
      `the natural significator of ${nkRole}, these very themes ARE the soul lesson itself, not a backdrop. ` +
      `House ${house} becomes the primary arena where soul-growth, karmic purpose, and ${planet}'s inherent ` +
      `nature converge. ${planet}'s dasha periods and transits will feel especially destined.`,

    Amatyakaraka:
      `${planet} governs career, counsel, and your public role as Amatyakaraka — and as natural significator ` +
      `of ${nkRole}, your vocation is inherently woven into these same themes. Work that channels ${planet}'s ` +
      `natural qualities will feel purposeful; careers that ignore them tend to feel hollow regardless of ` +
      `external success. ${planet}'s condition is the single most important indicator of professional fulfilment ` +
      `in your chart.`,

    Bhratikaraka:
      `${planet} carries sibling and companion karma in both the Jaimini and Naisargika frameworks. As natural ` +
      `significator of ${nkRole}, and as your Bhratikaraka, relationships with brothers, sisters, and close ` +
      `collaborators carry amplified weight in your life story. Pivotal moments of courage, initiative, and ` +
      `shared effort — House ${house} themes — are strongly tied to ${planet}'s condition and the people ` +
      `it represents in your chart.`,

    Matrukaraka:
      `${planet} represents the mother in both systems simultaneously. As natural significator of ${nkRole} ` +
      `and as Matrukaraka, the mother's nature, the emotional nurturing you received, and your home environment ` +
      `are read primarily through ${planet}'s dignity and placement. House ${house} shows how and where these ` +
      `maternal themes manifest — and how deeply they shape your inner emotional world.`,

    Putrakaraka:
      `${planet} governs children, creative legacy, and the passing of wisdom in both the Naisargika and ` +
      `Jaimini frameworks. As natural significator of ${nkRole}, children and the acts of teaching, creating, ` +
      `and mentoring are central karmic themes for you this lifetime. ${planet}'s strength directly governs ` +
      `ease or difficulty around progeny, creative works, and the joy that comes from nurturing what you ` +
      `bring into existence.`,

    GnatiKaraka:
      `As both Gnati Karaka and natural significator of ${nkRole}, ${planet} governs extended family ties, ` +
      `community obligations, and inherited social karma with amplified force. Conflicts or blessings from ` +
      `relatives and in-groups, duties toward your broader community, and group karma are recurring life ` +
      `themes — not incidental events. ${planet}'s condition in House ${house} shows how these dynamics ` +
      `play out and what resolution looks like.`,

    Darakaraka:
      `${planet} is the natural significator of ${nkRole} AND your Darakaraka — the Jaimini indicator of ` +
      `the spouse and intimate partnerships. This is the strongest possible signal that relationships are ` +
      `a defining karmic arena this lifetime. House ${house} is the focal point: how ${planet} expresses ` +
      `here — its dignity, aspects received, and dasha timing — describes the nature of significant others ` +
      `you attract and the lessons partnership is specifically designed to teach you.`,

    Pitrukaraka:
      `${planet} represents the father in both frameworks. As natural significator of ${nkRole} and as ` +
      `Pitrukaraka, the father's character, fortune, and the dharmic transmission between generations are ` +
      `read through ${planet}'s condition. House ${house} shows where and how paternal influence expresses ` +
      `in your life — and whether that inheritance is one of strength, challenge, or a mix of both.`,
  };

  return (
    byRole[charaRoleName] ??
    `${planet} holds both its universal role as natural significator of ${nkRole} and the personal Jaimini ` +
    `role of ${charaRoleName} (${charaMeaning}). This convergence means ${planet}'s condition — its dignity, ` +
    `placement, aspects, and dasha timing — governs the ${charaMeaning.toLowerCase()} themes with amplified ` +
    `weight. Watch ${planet} closely in transit and dasha for pivotal developments in these life areas.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function KarakaTab({ planets, lagna }: Props) {
  const { data: interp, loading, error } = useKarakaInterpretations();
  const [expandedChara, setExpandedChara] = useState<string | null>("AK");
  const [expandedNaisargika, setExpandedNaisargika] = useState<string | null>(null);

  // Compute karakas from planet data
  const karakaResults = computeCharaKarakas(planets);

  // Build CharaAssignments only when interpretation data is loaded
  const charaKarakas: CharaAssignment[] = interp
    ? karakaResults.map(k => {
        const role = interp.charaRoles.find(r => r.name === k.role);
        if (!role) return null;
        return {
          ...role,
          planet: k.planet,
          degree: k.degree_in_rashi,
          rashi: k.rashi,
          house: k.house,
          dignity: k.dignity,
          is_retrograde: k.is_retrograde,
        };
      }).filter(Boolean) as CharaAssignment[]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-400">Loading karaka interpretations…</span>
      </div>
    );
  }

  if (error || !interp) {
    return (
      <div className="text-center py-12 text-sm text-red-400">
        Failed to load karaka interpretations. Please refresh the page.
      </div>
    );
  }

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
          const planetRoleInterp = interp.charaByPlanet[ck.id]?.[ck.planet];
          const natalP = planets.find(p => p.name === ck.planet);

          // Computed strength for this Chara Karaka
          const { level: strengthLevel, summary: strengthSummary } =
            computeKarakaStrength(ck.dignity, ck.house, natalP?.lord_of_houses ?? []);
          const strengthCfg =
            strengthLevel === "strong"
              ? { color: "text-emerald-400", bg: "bg-transparent border-emerald-800/50", label: "Strong Placement" }
              : strengthLevel === "weak"
              ? { color: "text-red-400",     bg: "bg-transparent border-red-800/50",     label: "Challenged Placement" }
              : { color: "text-amber-400",   bg: "bg-transparent border-slate-700/60",   label: "Moderate Placement" };
          const strengthOutcome =
            strengthLevel === "strong"
              ? ck.strongPlacement
              : strengthLevel === "weak"
              ? ck.weakPlacement
              : `${ck.planet} as your ${ck.name} is neither at peak capacity nor severely blocked — its ${ck.meaning.toLowerCase()} themes are present but require active cultivation. Dasha and transit triggers will periodically bring them to the foreground.`;

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
                      const lordInterp = interp.charaLordship[ck.id]?.[h];
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

                {/* Computed strength assessment — replaces generic "When Strong / When Afflicted" tabs */}
                <div className={`border rounded-lg p-3 ${strengthCfg.bg}`}>
                  <p className={`text-xs font-semibold ${strengthCfg.color} mb-1`}>
                    Natal Strength — {strengthCfg.label}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">{strengthSummary}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{strengthOutcome}</p>
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
          {interp.naisargikaKarakas.map(nk => {
            const natalP = planets.find(p => p.name === nk.planet);
            const isExpanded = expandedNaisargika === nk.planet;
            const color = KARAKA_PLANET_COLORS[nk.planet] || "text-slate-200";
            const bg = KARAKA_PLANET_BG[nk.planet] || "bg-slate-800/30 border-slate-700";
            const dignity = natalP?.dignity ? DIGNITY_BADGE[natalP.dignity] : null;
            const houseInterp = natalP ? interp.naisargikaInHouse[nk.planet]?.[natalP.house] : null;

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

                        {/* Lordship context — concrete per-house impact */}
                        {natalP.lord_of_houses.length > 0 && (
                          <div className="mt-3 space-y-1.5 border-t border-slate-700/40 pt-3">
                            {natalP.lord_of_houses.map(h => (
                              <p key={h} className="text-xs text-slate-400 leading-relaxed">
                                As lord of the{" "}
                                <span className="font-semibold text-amber-400">{ordinal(h)} house</span>{" "}
                                ({HOUSE_THEME_TEXT[h] ?? `house ${h} themes`}), {nk.planet}&apos;s karaka themes
                                of <span className="text-slate-300">{nk.significations.slice(0, 2).join(" and ").toLowerCase()}</span>{" "}
                                directly colour and shape your {HOUSE_THEME_TEXT[h] ?? `${ordinal(h)}-house`} life domains —
                                the condition of {nk.planet} in your chart determines how these areas express for you.
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Chara Karaka cross-reference — role-specific, not boilerplate */}
                        {charaRole && (
                          <div className="mt-3 border-t border-slate-700/50 pt-3">
                            <p className="text-xs font-semibold text-amber-400 mb-1">
                              {nk.planet} is also your {charaRole.name} ({charaRole.shortName})
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {charaConvergenceText(nk.planet, charaRole.name, charaRole.meaning, natalP.house)}
                            </p>
                          </div>
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

                    {/* Retrograde impact */}
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

                    {/* Computed strength assessment — based on actual dignity + house */}
                    {natalP && (() => {
                      const { level, summary } = computeKarakaStrength(natalP.dignity, natalP.house, natalP.lord_of_houses);
                      const cfg =
                        level === "strong"
                          ? { color: "text-emerald-400", bg: "bg-transparent border-emerald-800/50", label: "Strong" }
                          : level === "weak"
                          ? { color: "text-red-400",     bg: "bg-transparent border-red-800/50",     label: "Challenged" }
                          : { color: "text-amber-400",   bg: "bg-transparent border-slate-700/60",   label: "Moderate" };

                      const outcomeText =
                        level === "strong"
                          ? nk.strongResult
                          : level === "weak"
                          ? nk.weakResult
                          : `${nk.planet} as karaka of ${nk.significations.slice(0, 2).join(" and ").toLowerCase()} is neither at peak capacity nor severely blocked — its themes are present but require active cultivation. Watch ${nk.planet}'s dashas and transits for periods when these significations come fully alive.`;

                      return (
                        <div className={`border rounded-lg p-3 ${cfg.bg}`}>
                          <p className={`text-xs font-semibold ${cfg.color} mb-1`}>
                            {nk.planet} — Natal Strength: {cfg.label}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">{summary}</p>
                          <p className="text-xs text-slate-300 leading-relaxed">{outcomeText}</p>
                        </div>
                      );
                    })()}
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
