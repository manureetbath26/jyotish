"use client";
import { useState, useEffect } from "react";
import { ChartResponse, PanchangResponse, UpagrahaInfo, calculatePanchang } from "@/lib/api";
import { NorthIndianChart } from "./charts/NorthIndianChart";
import { SouthIndianChart } from "./charts/SouthIndianChart";
import { PlanetTable } from "./PlanetTable";
import { HouseTable } from "./HouseTable";
import { DashaDisplay } from "./DashaDisplay";
import { NavamsaTab } from "./NavamsaTab";
import { YogaTab } from "./YogaTab";
import { TransitCalculator } from "./TransitCalculator";
import { KarakaTab } from "./KarakaTab";
import { ChartInterpretation } from "./ChartInterpretation";
import { PanchangTab } from "./PanchangTab";
import { DashaInterpretation } from "./DashaInterpretation";
import { PremiumLock } from "./PremiumLock";

interface Props {
  chart: ChartResponse;
  onSave?: () => void;
}

// ---------------------------------------------------------------------------
// Special Points panel — Gulika (Mandi) + Bhrigu Bindu
// ---------------------------------------------------------------------------

const TONE_STYLE: Record<string, { badge: string; dot: string }> = {
  positive: { badge: "text-green-300  bg-green-900/30  border-green-800",  dot: "bg-green-400"  },
  negative: { badge: "text-red-300    bg-red-900/30    border-red-800",    dot: "bg-red-400"    },
  mixed:    { badge: "text-amber-300  bg-amber-900/30  border-amber-800",  dot: "bg-amber-400"  },
  neutral:  { badge: "text-slate-300  bg-slate-800/50  border-slate-700",  dot: "bg-slate-400"  },
};

function SpecialPointCard({ point }: { point: UpagrahaInfo }) {
  const label = point.name === "BhriguBindu" ? "Bhrigu Bindu" : "Gulika (Mandi)";
  const abbr  = point.name === "BhriguBindu" ? "BB" : "Gk";
  const color = point.name === "BhriguBindu" ? "#c084fc" : "#fb923c";
  const subtitle = point.name === "BhriguBindu"
    ? "Sensitive degree — Moon–Rahu midpoint · Bhrigu Nadi tradition"
    : "Shadow planet · Saturn's upagraha · BPHS Ch. 3";

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold italic"
            style={{ color }}
          >
            {abbr}
          </span>
          <span className="text-sm font-semibold text-slate-200">{label}</span>
        </div>
        <span className="text-xs text-slate-400 text-right shrink-0">H{point.house}</span>
      </div>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-slate-700/60 rounded px-2 py-0.5 text-slate-300">
          {point.sign} {Math.floor(point.degree_in_sign)}°{Math.round((point.degree_in_sign % 1) * 60)}′
        </span>
        <span className="bg-slate-700/60 rounded px-2 py-0.5 text-slate-300">
          {point.nakshatra} pāda {point.nakshatra_pada}
        </span>
        <span className="bg-slate-700/60 rounded px-2 py-0.5 text-slate-300">
          House {point.house}
        </span>
      </div>
    </div>
  );
}

function SpecialPointsPanel({
  gulika,
  bhrigu_bindu,
}: {
  gulika?: UpagrahaInfo;
  bhrigu_bindu?: UpagrahaInfo;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-400 mb-1">
          ✦ Special Points — Gulika & Bhrigu Bindu
        </h3>
        <p className="text-xs text-slate-500">
          Shadow planets and sensitive degrees computed from your birth data.
          Italic labels <em style={{ color: "#c084fc" }}>BB</em> (violet) and{" "}
          <em style={{ color: "#fb923c" }}>Gk</em> (orange) appear in the chart.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {gulika      && <SpecialPointCard point={gulika} />}
        {bhrigu_bindu && <SpecialPointCard point={bhrigu_bindu} />}
      </div>

      {/* Classical interpretation blurbs */}
      {gulika && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
            Gulika in House {gulika.house} · Classical Reading
          </h4>
          <GalikaInterpretation house={gulika.house} />
        </div>
      )}
      {bhrigu_bindu && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
            Bhrigu Bindu in House {bhrigu_bindu.house} · Classical Reading
          </h4>
          <BBInterpretation house={bhrigu_bindu.house} />
        </div>
      )}
    </div>
  );
}

// Inline classical interpretations (sourced from DB-seeded rules — mirrored
// here for client-side render without an extra API call).
function GalikaInterpretation({ house }: { house: number }) {
  const interpretations: Record<number, { tone: string; effect: string; detail: string; source: string }> = {
    1:  { tone: "negative", effect: "Obstacles to health and vitality; personality coloured by Saturn's heaviness and a touch of maleficence.", detail: "Gulika in the Lagna brings physical ailments, pessimism, and recurring obstacles in life's beginnings. The native may have a caustic tongue and is accident-prone. Classical texts warn that Gulika here reduces the overall lustre of the chart unless well-aspected by benefics.", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    2:  { tone: "negative", effect: "Family discord, financial losses, and speech difficulties.", detail: "Gulika in the 2nd brings friction in family life, harsh speech, and challenges in accumulating and retaining money. Food and dietary habits may be erratic.", source: "BPHS Ch. 3; Saravali Ch. 4" },
    3:  { tone: "positive", effect: "Courage, determination, and sibling strength — Gulika gives Saturnine grit and perseverance.", detail: "The native develops remarkable persistence and the ability to work hard under pressure. Sibling relationships are generally supportive. This is one of the better Gulika placements (upachaya house).", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    4:  { tone: "negative", effect: "Domestic unhappiness, mother's health affected, and property disputes.", detail: "Gulika afflicts the 4th house with domestic strife. Property and vehicle matters bring losses or legal disputes. Inner peace is difficult to sustain.", source: "BPHS Ch. 3; Saravali Ch. 4" },
    5:  { tone: "negative", effect: "Progeny difficulties, speculative losses, and intellectual restlessness.", detail: "Delays or difficulties with children, poor judgment in speculation, and a restless intellect. Mantras and spiritual practices may be disrupted.", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    6:  { tone: "positive", effect: "Gulika in the 6th is strong — it destroys enemies, overcomes disease, and wins competitions.", detail: "Malefics thrive in dusthana houses. Gulika here gives power over adversaries, remarkable recovery from illness, and competitive strength. BPHS specifically notes this as a good placement.", source: "BPHS Ch. 3" },
    7:  { tone: "negative", effect: "Marital discord, partner's health suffers, delays in marriage.", detail: "Marriage may be delayed, the spouse may suffer health problems, or the marital relationship is marked by distance. Business partnerships also face obstacles.", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    8:  { tone: "negative", effect: "Chronic illness, accident risk, longevity concerns, and obstacles to inheritance.", detail: "The native faces recurring health crises, possibly chronic conditions, and an elevated risk of accidents. Yet Gulika in the 8th can also give depth in occult knowledge.", source: "BPHS Ch. 3; Saravali Ch. 4" },
    9:  { tone: "negative", effect: "Father's welfare affected, obstacles to fortune and dharma.", detail: "The father may suffer health problems. Higher education, long journeys for study, and guru relationships face obstacles. The native's overall luck is subdued.", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    10: { tone: "mixed",    effect: "Career obstacles with Saturnine work ethic — recognition comes late.", detail: "Career advancement is delayed and there may be conflicts with authority. Yet the native possesses extraordinary capacity for hard, disciplined work. Saturn rewards persistence.", source: "BPHS Ch. 3; Saravali Ch. 4" },
    11: { tone: "positive", effect: "Gains after struggle, income from unconventional sources.", detail: "The 11th is an upachaya house where malefics benefit over time. Gulika here brings gains through hard work and persistence, often through unconventional professions.", source: "BPHS Ch. 3; Phaladeepika Ch. 14" },
    12: { tone: "mixed",    effect: "Losses and expenditures are elevated, but deep spiritual inclinations emerge.", detail: "Heavy expenditures, possible foreign settlement, hospital stays, or confinement. Yet Gulika in the 12th can give deep spiritual detachment and genuine renunciation.", source: "BPHS Ch. 3; Saravali Ch. 4" },
  };
  const r = interpretations[house];
  if (!r) return null;
  const ts = TONE_STYLE[r.tone] ?? TONE_STYLE.neutral;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border ${ts.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ts.dot}`} />
          {r.tone}
        </span>
      </div>
      <p className="text-sm text-slate-200 font-medium">{r.effect}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{r.detail}</p>
      <p className="text-xs text-slate-600 italic">Source: {r.source}</p>
    </div>
  );
}

function BBInterpretation({ house }: { house: number }) {
  const interpretations: Record<number, { effect: string; detail: string }> = {
    1:  { effect: "The self and body are the axis of karmic activation — transits over BB here trigger identity crises and reinventions.", detail: "The native's personality and physical body become the central arena for karmic fulfilment. Planets transiting this degree trigger identity shifts, health events, and new beginnings." },
    2:  { effect: "Wealth and family are the karmic focal point — pivotal gains or losses cluster around BB transits.", detail: "Major financial turning points — sudden gains, unexpected losses, pivotal business decisions — are triggered when planets transit this degree." },
    3:  { effect: "Courage, skills, and sibling relationships are the karmic testing ground.", detail: "BB transits bring decisions requiring bold action, new skill development, and short-distance journeys that prove pivotal." },
    4:  { effect: "Home, mother, and inner peace are the karmic centre — domestic upheavals cluster around BB transits.", detail: "Property purchases, moves, changes in domestic life, and mother's significant shifts occur at BB transit intervals." },
    5:  { effect: "Children, creativity, and speculative ventures are the karmic focal points.", detail: "BB transits bring significant events related to children's milestones, creative breakthroughs or setbacks, and speculative outcomes." },
    6:  { effect: "Health crises, karmic debt repayment, and service are the recurring themes.", detail: "Significant health events — diagnoses, recoveries, or chronic issues surfacing — cluster around BB transits." },
    7:  { effect: "Marriage, partnerships, and public life are the axis — BB transits time relationship milestones.", detail: "Marriage timing, separations, reconciliations, and key business decisions are activated by BB transits." },
    8:  { effect: "Transformational crises, inheritance events, and occult awakenings cluster around BB transits.", detail: "BB transits trigger near-death experiences, major inheritance decisions, sudden upheavals that force reinvention, and powerful spiritual awakenings." },
    9:  { effect: "Fortune shifts, guru encounters, and dharmic turning points — BB in the 9th brings blessings through faith.", detail: "When planets transit this degree, the native experiences shifts in overall luck, pivotal meetings with teachers, and moments of strong dharmic clarity." },
    10: { effect: "Career pivots and public recognition (or scandal) are the defining life events.", detail: "BB transits bring career-defining events — promotions, major professional recognition, career changes, or public controversies." },
    11: { effect: "Significant gains, network changes, and fulfilled desires cluster around BB transits.", detail: "Planets transiting this degree bring important income-related events, key network connections, and the realisation (or collapse) of long-held goals." },
    12: { effect: "Moksha-linked experiences, losses, and foreign or spiritual journeys mark BB transits.", detail: "BB transits trigger significant expenditures, periods abroad, hospitalisation, retreat, or deep spiritual experiences." },
  };
  const r = interpretations[house];
  if (!r) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-200 font-medium">{r.effect}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{r.detail}</p>
      <p className="text-xs text-slate-600 italic">Source: Bhrigu Nadi tradition; K.N. Rao — Astrology, Destiny &amp; the Wheel of Time</p>
    </div>
  );
}

type TabId = "panchang" | "chart" | "planets" | "houses" | "dasha" | "navamsa" | "yogas" | "karakas" | "transits";
type ChartStyle = "north" | "south";

const TABS: { id: TabId; label: string }[] = [
  { id: "panchang", label: "Panchang ✦" },
  { id: "chart",   label: "Chart" },
  { id: "planets", label: "Planets" },
  { id: "houses",  label: "Houses" },
  { id: "dasha",   label: "Dasha" },
  { id: "navamsa", label: "Navamsa (D-9)" },
  { id: "yogas",   label: "Yogas" },
  { id: "karakas", label: "Karakas" },
  { id: "transits",  label: "Transits 🌙" },
];

/** Client-side Bhrigu Bindu fallback — midpoint of Moon and Rahu along the shorter arc. */
function deriveBBFromPlanets(chart: ChartResponse): UpagrahaInfo | undefined {
  const moon = chart.planets.find(p => p.name === "Moon");
  const rahu = chart.planets.find(p => p.name === "Rahu");
  if (!moon || !rahu) return undefined;

  const moonLon = moon.longitude;
  const rahuLon = rahu.longitude;
  const diff = Math.abs(moonLon - rahuLon);
  const bbLon = diff > 180
    ? ((moonLon + rahuLon) / 2 + 180) % 360
    : (moonLon + rahuLon) / 2;

  const RASHIS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const NAKSHATRA_NAMES = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya",
    "Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati",
    "Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana",
    "Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
  ];
  const signNum      = Math.floor(bbLon / 30) + 1;
  const degInSign    = bbLon % 30;
  const lagnaSignNum = chart.houses[0]?.rashi_num ?? 1;
  const house        = ((signNum - lagnaSignNum + 12) % 12) + 1;
  const nakIdx       = Math.min(Math.floor(bbLon / (360 / 27)), 26);
  const pada         = Math.min(Math.floor((bbLon % (360 / 27)) / ((360 / 27) / 4)) + 1, 4);

  return {
    name: "BhriguBindu",
    longitude: Math.round(bbLon * 10000) / 10000,
    sign: RASHIS[signNum - 1],
    sign_num: signNum,
    degree_in_sign: Math.round(degInSign * 10000) / 10000,
    house,
    nakshatra: NAKSHATRA_NAMES[nakIdx],
    nakshatra_pada: pada,
  };
}

export function ChartDisplay({ chart, onSave }: Props) {
  const [tab, setTab] = useState<TabId>("panchang");
  const [style, setStyle] = useState<ChartStyle>("north");
  const [panchang, setPanchang] = useState<PanchangResponse | null>(null);
  const [panchangLoading, setPanchangLoading] = useState(false);
  const [panchangError, setPanchangError] = useState<string | null>(null);

  // Use backend-provided values when available; fall back to client-side derivation
  // so the chart renders correctly even from stale cached ProfileChart data.
  const bhriguBindu = chart.bhrigu_bindu ?? deriveBBFromPlanets(chart);
  const gulika      = chart.gulika; // Gulika needs backend (sunrise/sunset); shows after cache bust

  useEffect(() => {
    if (tab === "panchang" && !panchang && !panchangLoading) {
      setPanchangLoading(true);
      setPanchangError(null);
      calculatePanchang({
        date: chart.date,
        time: chart.time,
        place: chart.place,
        ayanamsha: chart.ayanamsha,
      })
        .then(setPanchang)
        .catch(e => setPanchangError(e instanceof Error ? e.message : "Failed to load panchang"))
        .finally(() => setPanchangLoading(false));
    }
  }, [tab, chart, panchang, panchangLoading]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Birth Chart</p>
          <h2 className="text-lg font-semibold text-slate-100">
            {chart.place} · {chart.date} {chart.time}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lagna: <span className="text-amber-400 font-medium">{chart.lagna}</span>
            {" · "}Ayanamsha: <span className="text-slate-300">{chart.ayanamsha_value.toFixed(4)}°</span>
            {" · "}<span className="capitalize">{chart.ayanamsha}</span>
            {" · "}TZ: {chart.timezone}
          </p>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Save Chart
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === t.id
                ? "border-amber-500 text-amber-400 font-medium"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.id === "yogas" && chart.yogas?.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
                {chart.yogas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "panchang" && (
          <div>
            {panchangLoading && (
              <div className="flex items-center justify-center h-40 text-slate-500">
                <div className="text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm">Calculating Panchang…</p>
                </div>
              </div>
            )}
            {panchangError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                {panchangError}
              </div>
            )}
            {panchang && !panchangLoading && <PanchangTab panchang={panchang} />}
          </div>
        )}

        {tab === "chart" && (
          <div className="space-y-4">
            {/* Style toggle */}
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
                lagna={chart.lagna}
                lagna_degree={chart.lagna_degree}
                planets={chart.planets}
                houses={chart.houses}
              />
            ) : (
              <NorthIndianChart
                lagna={chart.lagna}
                lagna_degree={chart.lagna_degree}
                planets={chart.planets}
                houses={chart.houses}
                bhrigu_bindu={bhriguBindu}
                gulika={gulika}
              />
            )}
            <ChartInterpretation chart={chart} />
            {/* Special Points panel — Gulika and Bhrigu Bindu */}
            {(gulika || bhriguBindu) && (
              <SpecialPointsPanel
                gulika={gulika}
                bhrigu_bindu={bhriguBindu}
              />
            )}
          </div>
        )}

        {tab === "planets" && <PlanetTable planets={chart.planets} />}
        {tab === "houses"  && <HouseTable houses={chart.houses} />}

        {tab === "dasha" && (
          <PremiumLock>
            <DashaInterpretation chart={chart} />
            <div className="mt-6" />
            <DashaDisplay
              currentDasha={chart.current_dasha}
              currentAntardasha={chart.current_antardasha}
              dashaSequence={chart.dasha_sequence}
              planets={chart.planets}
              lagna={chart.lagna}
            />
          </PremiumLock>
        )}

        {tab === "navamsa" && (
          <NavamsaTab
            navamsaLagna={chart.navamsa_lagna}
            navamsaPlanets={chart.navamsa_planets}
          />
        )}

        {tab === "yogas" && (
          <YogaTab yogas={chart.yogas ?? []} />
        )}

        {tab === "karakas" && (
          <KarakaTab planets={chart.planets} lagna={chart.lagna} />
        )}

        {tab === "transits" && (
          <TransitCalculator chart={chart} />
        )}
      </div>
    </div>
  );
}
