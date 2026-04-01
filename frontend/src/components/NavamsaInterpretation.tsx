"use client";

import { useState } from "react";
import { NavamsaPosition } from "@/lib/api";
import {
  NAVAMSA_LAGNA_MEANINGS,
  NAVAMSA_VENUS_HOUSE,
  NAVAMSA_7TH_SIGN,
  PLANET_IN_HOUSE,
  LAGNA_DESCRIPTIONS,
} from "@/lib/interpretations";

interface Props {
  navamsaLagna: string;
  navamsaPlanets: NavamsaPosition[];
}

const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const PLANET_NATURE: Record<string, "benefic" | "malefic" | "neutral"> = {
  Jupiter: "benefic", Venus: "benefic", Moon: "benefic", Mercury: "benefic",
  Sun: "neutral", Saturn: "malefic", Mars: "malefic", Rahu: "malefic", Ketu: "malefic",
};

function Section({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-slate-200 text-sm">{title}</span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

export function NavamsaInterpretation({ navamsaLagna, navamsaPlanets }: Props) {
  const lagnaRashiNum = RASHI_NAMES.indexOf(navamsaLagna) + 1;

  // Calculate 7th house sign in Navamsa
  const seventhHouseRashiNum = ((lagnaRashiNum - 1 + 6) % 12) + 1;
  const seventhHouseSign = RASHI_NAMES[seventhHouseRashiNum - 1];

  // Find Venus and Jupiter in Navamsa
  const venusPlanet = navamsaPlanets.find(p => p.name === "Venus");
  const jupiterPlanet = navamsaPlanets.find(p => p.name === "Jupiter");
  const moonPlanet = navamsaPlanets.find(p => p.name === "Moon");

  // Planets in 7th house
  const planetsIn7th = navamsaPlanets.filter(p => p.house === 7);

  // Calculate overall marriage strength
  const beneficsIn7th = planetsIn7th.filter(p => PLANET_NATURE[p.name] === "benefic");
  const maleficsIn7th = planetsIn7th.filter(p => PLANET_NATURE[p.name] === "malefic");

  let marriageStrength = "Moderate";
  if (beneficsIn7th.length > maleficsIn7th.length) marriageStrength = "Favourable";
  if (maleficsIn7th.length > beneficsIn7th.length) marriageStrength = "Challenging";
  if (venusPlanet?.house === 7 || jupiterPlanet?.house === 7) marriageStrength = "Highly Favourable";

  const strengthColor = marriageStrength === "Highly Favourable" ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : marriageStrength === "Favourable" ? "text-green-400 bg-green-500/10 border-green-500/30"
    : marriageStrength === "Challenging" ? "text-red-400 bg-red-500/10 border-red-500/30"
    : "text-slate-300 bg-slate-700/30 border-slate-600";

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-slate-800" />
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Navamsa Interpretation (D-9)</p>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      {/* Navamsa Lagna */}
      <Section title={`Soul Nature: ${navamsaLagna} Navamsa Lagna`} defaultOpen>
        <p className="text-sm text-slate-300 leading-relaxed">
          {NAVAMSA_LAGNA_MEANINGS[navamsaLagna] ?? `${navamsaLagna} Navamsa Lagna shapes your soul's deeper aspirations and spiritual inclinations.`}
        </p>
        {LAGNA_DESCRIPTIONS[navamsaLagna] && (
          <div className="mt-3 p-3 bg-slate-800/40 border border-slate-700 rounded-lg">
            <p className="text-xs font-semibold text-slate-400 mb-1">Inner character strengths</p>
            <p className="text-xs text-slate-400">{LAGNA_DESCRIPTIONS[navamsaLagna].strengths}</p>
          </div>
        )}
      </Section>

      {/* Marriage & Partnership */}
      <Section title="Marriage & Partnership" defaultOpen>
        {/* Overall strength */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3 ${strengthColor}`}>
          Marriage Outlook: {marriageStrength}
        </div>

        {/* 7th house */}
        <div className="space-y-3">
          <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-semibold text-slate-400 mb-1">
              7th House in Navamsa — {seventhHouseSign} (Lord: {SIGN_LORDS[seventhHouseSign]})
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {NAVAMSA_7TH_SIGN[seventhHouseSign]}
            </p>
          </div>

          {/* Planets in 7th */}
          {planetsIn7th.length > 0 && (
            <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 mb-2">
                Planets in 7th house (D-9): {planetsIn7th.map(p => p.name).join(", ")}
              </p>
              {planetsIn7th.map(p => (
                <div key={p.name} className="mb-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className={`font-semibold ${PLANET_NATURE[p.name] === "benefic" ? "text-green-400" : PLANET_NATURE[p.name] === "malefic" ? "text-red-400" : "text-slate-300"}`}>
                      {p.name}
                    </span>
                    {" "}in {p.rashi} — {
                      p.name === "Venus" ? "Venus here brings a loving, beautiful, and harmonious partnership." :
                      p.name === "Jupiter" ? "Jupiter bestows a wise, generous, and prosperous spouse." :
                      p.name === "Moon" ? "Moon gives an emotionally sensitive, nurturing partner." :
                      p.name === "Mercury" ? "Mercury indicates a communicative, intelligent partner." :
                      p.name === "Sun" ? "Sun gives a proud, authoritative partner. Ego dynamics need balance." :
                      p.name === "Mars" ? "Mars brings passion and energy but also potential for conflict." :
                      p.name === "Saturn" ? "Saturn may delay marriage or bring a serious, older partner." :
                      p.name === "Rahu" ? "Rahu may bring an unusual, foreign, or unconventional partner." :
                      p.name === "Ketu" ? "Ketu suggests a spiritually inclined or past-life connected partner." :
                      "This placement shapes partnership dynamics."
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Venus placement */}
          {venusPlanet && (
            <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 mb-1">
                Venus in D-9 House {venusPlanet.house} ({venusPlanet.rashi}) — Partner Quality
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {NAVAMSA_VENUS_HOUSE[venusPlanet.house]}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* All Navamsa Planets */}
      <Section title="Navamsa Planet Placements">
        <p className="text-xs text-slate-500 mb-3">
          The D-9 chart reveals your soul's deeper motivations, inner qualities, and the hidden potential of each planet.
        </p>
        <div className="space-y-3">
          {navamsaPlanets.map(p => {
            const lagnaHouseMeaning = PLANET_IN_HOUSE[p.name]?.[p.house];
            const nature = PLANET_NATURE[p.name];
            return (
              <div key={p.name} className="border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${
                    nature === "benefic" ? "text-green-300" :
                    nature === "malefic" ? "text-red-300" : "text-slate-200"
                  }`}>{p.name}</span>
                  <span className="text-xs text-slate-400">
                    {p.rashi} · House {p.house}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                    nature === "benefic" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                    nature === "malefic" ? "text-red-400 bg-red-500/10 border-red-500/20" :
                    "text-slate-400 bg-slate-500/10 border-slate-500/20"
                  }`}>
                    {nature}
                  </span>
                </div>
                {lagnaHouseMeaning && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lagnaHouseMeaning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Spiritual & Inner Purpose */}
      <Section title="Spiritual & Inner Purpose">
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          The Navamsa (D-9) is the chart of dharma and spiritual potential. It shows the inner reality behind the outer birth chart — what your soul truly seeks in this lifetime.
        </p>
        {jupiterPlanet && (
          <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg mb-2">
            <p className="text-xs font-semibold text-slate-400 mb-1">
              Jupiter in D-9 House {jupiterPlanet.house} ({jupiterPlanet.rashi}) — Wisdom & Grace
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {PLANET_IN_HOUSE["Jupiter"]?.[jupiterPlanet.house]}
            </p>
          </div>
        )}
        {moonPlanet && (
          <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-semibold text-slate-400 mb-1">
              Moon in D-9 House {moonPlanet.house} ({moonPlanet.rashi}) — Emotional Fulfilment
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {PLANET_IN_HOUSE["Moon"]?.[moonPlanet.house]}
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}
