/**
 * Marriage window scan for 2014–2018 (retrospective)
 * DOB: 26 Jan 1988, 00:50 AM, Ludhiana Punjab India — Libra lagna
 *
 * Run: npx tsx scripts/predict-marriage-2014-2018.ts
 */

import { computeCharaKarakas } from "../src/lib/karakaEngine";
import { ZODIAC_ORDER, SIGN_INDEX, SIGN_LORD, type Sign } from "../src/lib/charaDashaEngine";
import { preparePredictionInput } from "../src/lib/jaiminiPredictiveEngine";
import { scanMarriageWindows } from "../src/lib/jaiminiMarriagePrediction";
import type { ChartResponse, PlanetPosition, HouseInfo, NavamsaPosition } from "../src/lib/api";

// ── Same chart data as the main script ──

const planets: PlanetPosition[] = [
  { name: "Sun",     longitude: 282.13, rashi: "Capricorn",   rashi_num: 10, degree_in_rashi: 12.13, house: 4,  nakshatra: "Shravana",       nakshatra_pada: 2, is_retrograde: false, dignity: null,         lord_of_houses: [11] },
  { name: "Moon",    longitude: 11.85,  rashi: "Aries",       rashi_num: 1,  degree_in_rashi: 11.85, house: 7,  nakshatra: "Ashwini",        nakshatra_pada: 4, is_retrograde: false, dignity: null,         lord_of_houses: [10] },
  { name: "Mars",    longitude: 230.5,  rashi: "Scorpio",     rashi_num: 8,  degree_in_rashi: 20.50, house: 2,  nakshatra: "Jyeshtha",       nakshatra_pada: 2, is_retrograde: false, dignity: "own sign",   lord_of_houses: [2, 7] },
  { name: "Mercury", longitude: 271.3,  rashi: "Capricorn",   rashi_num: 10, degree_in_rashi: 1.30,  house: 4,  nakshatra: "Uttara Ashadha", nakshatra_pada: 3, is_retrograde: false, dignity: null,         lord_of_houses: [9, 12] },
  { name: "Jupiter", longitude: 350.8,  rashi: "Pisces",      rashi_num: 12, degree_in_rashi: 20.80, house: 6,  nakshatra: "Revati",         nakshatra_pada: 3, is_retrograde: false, dignity: "own sign",   lord_of_houses: [3, 6] },
  { name: "Venus",   longitude: 316.2,  rashi: "Aquarius",    rashi_num: 11, degree_in_rashi: 16.20, house: 5,  nakshatra: "Shatabhisha",    nakshatra_pada: 3, is_retrograde: false, dignity: null,         lord_of_houses: [1, 8] },
  { name: "Saturn",  longitude: 264.9,  rashi: "Sagittarius", rashi_num: 9,  degree_in_rashi: 24.90, house: 3,  nakshatra: "Purva Ashadha",  nakshatra_pada: 4, is_retrograde: false, dignity: null,         lord_of_houses: [4, 5] },
  { name: "Rahu",    longitude: 350.1,  rashi: "Pisces",      rashi_num: 12, degree_in_rashi: 20.10, house: 6,  nakshatra: "Revati",         nakshatra_pada: 3, is_retrograde: true,  dignity: null,         lord_of_houses: [] },
  { name: "Ketu",    longitude: 170.1,  rashi: "Virgo",       rashi_num: 6,  degree_in_rashi: 20.10, house: 12, nakshatra: "Hasta",          nakshatra_pada: 3, is_retrograde: true,  dignity: null,         lord_of_houses: [] },
];

const houses: HouseInfo[] = [
  { house_num: 1,  rashi: "Libra",       rashi_num: 7,  lord: "Venus",   occupants: [] },
  { house_num: 2,  rashi: "Scorpio",     rashi_num: 8,  lord: "Mars",    occupants: ["Mars"] },
  { house_num: 3,  rashi: "Sagittarius", rashi_num: 9,  lord: "Jupiter", occupants: ["Saturn"] },
  { house_num: 4,  rashi: "Capricorn",   rashi_num: 10, lord: "Saturn",  occupants: ["Sun", "Mercury"] },
  { house_num: 5,  rashi: "Aquarius",    rashi_num: 11, lord: "Saturn",  occupants: ["Venus"] },
  { house_num: 6,  rashi: "Pisces",      rashi_num: 12, lord: "Jupiter", occupants: ["Jupiter", "Rahu"] },
  { house_num: 7,  rashi: "Aries",       rashi_num: 1,  lord: "Mars",    occupants: ["Moon"] },
  { house_num: 8,  rashi: "Taurus",      rashi_num: 2,  lord: "Venus",   occupants: [] },
  { house_num: 9,  rashi: "Gemini",      rashi_num: 3,  lord: "Mercury", occupants: [] },
  { house_num: 10, rashi: "Cancer",      rashi_num: 4,  lord: "Moon",    occupants: [] },
  { house_num: 11, rashi: "Leo",         rashi_num: 5,  lord: "Sun",     occupants: [] },
  { house_num: 12, rashi: "Virgo",       rashi_num: 6,  lord: "Mercury", occupants: ["Ketu"] },
];

const navamsa_planets: NavamsaPosition[] = [
  { name: "Sun",     rashi: "Virgo",       rashi_num: 6,  house: 12, degree_in_rashi: 12.13 },
  { name: "Moon",    rashi: "Cancer",      rashi_num: 4,  house: 10, degree_in_rashi: 11.85 },
  { name: "Mars",    rashi: "Cancer",      rashi_num: 4,  house: 10, degree_in_rashi: 20.50 },
  { name: "Mercury", rashi: "Gemini",      rashi_num: 3,  house: 9,  degree_in_rashi: 1.30 },
  { name: "Jupiter", rashi: "Sagittarius", rashi_num: 9,  house: 3,  degree_in_rashi: 20.80 },
  { name: "Venus",   rashi: "Libra",       rashi_num: 7,  house: 1,  degree_in_rashi: 16.20 },
  { name: "Saturn",  rashi: "Pisces",      rashi_num: 12, house: 6,  degree_in_rashi: 24.90 },
  { name: "Rahu",    rashi: "Sagittarius", rashi_num: 9,  house: 3,  degree_in_rashi: 20.10 },
  { name: "Ketu",    rashi: "Gemini",      rashi_num: 3,  house: 9,  degree_in_rashi: 20.10 },
];

const chart: ChartResponse = {
  date: "1988-01-26",
  time: "00:50",
  place: "Ludhiana, Punjab, India",
  latitude: 30.9,
  longitude: 75.85,
  timezone: "Asia/Kolkata",
  ayanamsha: "lahiri",
  ayanamsha_value: 23.68,
  lagna: "Libra",
  lagna_degree: 187.5,
  planets,
  houses,
  current_dasha: { planet: "Mercury", start_date: "2023-01-26", end_date: "2040-01-26", years: 17, antardashas: [] },
  current_antardasha: { planet: "Mercury", start_date: "2025-01-01", end_date: "2026-06-01" },
  dasha_sequence: [],
  navamsa_lagna: "Libra",
  navamsa_planets,
  yogas: [],
  julian_day: 2447186.5,
  calculation_time: "0ms",
};

const lagna = "Libra" as Sign;

// ── Actual Saturn transits 2014–2018 ──
// Libra: Nov 2011 – Nov 2014
// Scorpio: Nov 2014 – Jan 2017
// Sagittarius: Jan 2017 – Jan 2020
function getSaturn(date: string): Sign {
  const d = new Date(date + "T00:00:00");
  if (d < new Date("2014-11-01T00:00:00")) return "Libra" as Sign;
  if (d < new Date("2017-01-26T00:00:00")) return "Scorpio" as Sign;
  return "Sagittarius" as Sign;
}

// ── Actual Jupiter transits 2014–2018 ──
// Gemini: May 2013 – Jun 2014
// Cancer: Jun 2014 – Jul 2015
// Leo: Jul 2015 – Aug 2016
// Virgo: Aug 2016 – Sep 2017
// Libra: Sep 2017 – Oct 2018
function getJupiter(date: string): Sign {
  const d = new Date(date + "T00:00:00");
  if (d < new Date("2014-06-19T00:00:00")) return "Gemini" as Sign;
  if (d < new Date("2015-07-14T00:00:00")) return "Cancer" as Sign;
  if (d < new Date("2016-08-11T00:00:00")) return "Leo" as Sign;
  if (d < new Date("2017-09-12T00:00:00")) return "Virgo" as Sign;
  return "Libra" as Sign;
}

// ── Mars: ~45 day cycle, approximate ──
function getMars(date: string): Sign {
  // Mars was in Libra around Jan 2014
  const baseDate = new Date("2014-01-01T00:00:00");
  const baseSIdx = SIGN_INDEX["Libra" as Sign];
  const d = new Date(date + "T00:00:00");
  const daysDiff = (d.getTime() - baseDate.getTime()) / 86400000;
  const signsAdvanced = Math.floor(daysDiff / 45);
  return ZODIAC_ORDER[(baseSIdx + signsAdvanced) % 12];
}

function houseFromSign(lagnaSign: Sign, sign: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagnaSign] + 12) % 12) + 1;
}

// Build monthly snapshots Jan 2014 – Dec 2018
const snapshots: { date: string; planets: Record<string, number> }[] = [];
for (let yr = 2014; yr <= 2018; yr++) {
  for (let mo = 1; mo <= 12; mo++) {
    const dateStr = `${yr}-${String(mo).padStart(2, "0")}-01`;
    const satSign = getSaturn(dateStr);
    const jupSign = getJupiter(dateStr);
    const marsSign = getMars(dateStr);
    snapshots.push({
      date: dateStr,
      planets: {
        Saturn: houseFromSign(lagna, satSign),
        Jupiter: houseFromSign(lagna, jupSign),
        Mars: houseFromSign(lagna, marsSign),
      },
    });
  }
}

// ── Run scan ──
const predInput = preparePredictionInput(chart);

console.log("\n============================================================");
console.log("  RETROSPECTIVE MARRIAGE WINDOW SCAN: 2014 – 2018");
console.log("  DOB: 26 Jan 1988, 00:50 AM, Ludhiana — Libra Lagna");
console.log("============================================================");
console.log(`  UL: ${predInput.upaPada?.padaSign || "N/A"} | AL: ${predInput.arudhaLagna?.padaSign || "N/A"} | 7H: Aries | DK: Mercury in Capricorn`);
console.log("============================================================\n");

// We need to override the scan to use 2014 as start
// scanMarriageWindows filters by "today" forward, so we'll do it manually
import { predictMarriage, type TransitPositions } from "../src/lib/jaiminiMarriagePrediction";

// For dasha periods active in 2014-2018, we check from the full dasha sequence
console.log("── CHARA DASHA active 2014-2018 ──");
for (const d of predInput.dashaSequence) {
  if (d.endDate >= "2014-01-01" && d.startDate <= "2018-12-31") {
    console.log(`  ${d.sign.padEnd(13)} ${d.startDate} to ${d.endDate} (${d.duration} yrs)`);
    for (const s of d.subPeriods) {
      if (s.endDate >= "2014-01-01" && s.startDate <= "2018-12-31") {
        console.log(`    AD: ${s.sign.padEnd(13)} ${s.startDate} to ${s.endDate}`);
      }
    }
  }
}

console.log("\n── MONTHLY SCAN ──\n");
console.log("  Month        Score  Rules Met          MD           AD           Saturn       Jupiter      Mars");
console.log("  ───────────  ─────  ─────────────────  ───────────  ───────────  ───────────  ───────────  ───────────");

// Find MD/AD for each date
function findDasha(dateStr: string) {
  for (const d of predInput.dashaSequence) {
    if (dateStr >= d.startDate && dateStr < d.endDate) {
      let ad: string | null = null;
      for (const s of d.subPeriods) {
        if (dateStr >= s.startDate && dateStr < s.endDate) {
          ad = s.sign;
          break;
        }
      }
      return { md: d.sign, ad };
    }
  }
  return { md: null, ad: null };
}

// Score each month using predictMarriage for full detail
const monthResults: { date: string; month: string; score: number; met: number[]; md: string | null; ad: string | null; sat: string; jup: string; mar: string }[] = [];

for (const snap of snapshots) {
  const satSign = getSaturn(snap.date);
  const jupSign = getJupiter(snap.date);
  const marsSign = getMars(snap.date);

  const transit: TransitPositions = {
    saturn: satSign,
    jupiter: jupSign,
    mars: marsSign,
  };

  const { md, ad } = findDasha(snap.date);

  // We need to temporarily override the "current" dasha for the prediction
  // Use predictMarriage which reads from input.currentDasha
  // Instead, manually create a modified input with the correct dasha for this date
  const modInput = { ...predInput };
  for (const d of predInput.dashaSequence) {
    if (snap.date >= d.startDate && snap.date < d.endDate) {
      modInput.currentDasha = d;
      for (const s of d.subPeriods) {
        if (snap.date >= s.startDate && snap.date < s.endDate) {
          modInput.currentSubPeriod = s;
          break;
        }
      }
      break;
    }
  }

  const report = predictMarriage(modInput, chart, transit);
  const met = report.rules.filter(r => r.isSatisfied).map(r => r.ruleNumber);

  const d = new Date(snap.date + "T00:00:00");
  const monthLabel = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  const mark = report.rulesSatisfied >= 3 ? " ★" : "";
  const rulesStr = met.map(r => `R${r}`).join(",").padEnd(17);

  console.log(
    `  ${monthLabel.padEnd(11)}  ${String(report.rulesSatisfied).padStart(1)}/6    ${rulesStr}  ${(md || "—").padEnd(11)}  ${(ad || "—").padEnd(11)}  ${satSign.padEnd(11)}  ${jupSign.padEnd(11)}  ${marsSign}${mark}`
  );

  monthResults.push({ date: snap.date, month: monthLabel, score: report.rulesSatisfied, met, md, ad, sat: satSign, jup: jupSign, mar: marsSign });
}

// Group windows
console.log("\n── FAVORABLE WINDOWS (3+ rules) ──\n");
let window: typeof monthResults = [];
const windows: (typeof monthResults)[] = [];

for (const m of monthResults) {
  if (m.score >= 3) {
    window.push(m);
  } else {
    if (window.length > 0) {
      windows.push(window);
      window = [];
    }
  }
}
if (window.length > 0) windows.push(window);

if (windows.length > 0) {
  for (const w of windows) {
    const peak = Math.max(...w.map(m => m.score));
    const avg = (w.reduce((s, m) => s + m.score, 0) / w.length).toFixed(1);
    const startLabel = w[0].month;
    const endLabel = w[w.length - 1].month;
    const label = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
    console.log(`  ★ ${label}`);
    console.log(`    Duration: ${w.length} month(s) | Peak: ${peak}/6 | Avg: ${avg}/6`);
    console.log(`    Strength: ${peak >= 5 ? "STRONG" : "MODERATE"}`);
    console.log("");
  }
} else {
  console.log("  No favorable windows found in 2014-2018.");
}

// Peak month
const peak = monthResults.reduce((best, m) => m.score > best.score ? m : best, monthResults[0]);
console.log(`── PEAK MONTH ──`);
console.log(`  ${peak.month} — ${peak.score}/6 rules met`);
console.log(`  Rules: ${peak.met.map(r => `Rule ${r}`).join(", ")}`);
console.log(`  MD: ${peak.md} / AD: ${peak.ad}`);
console.log(`  Transit: Sa=${peak.sat}, Ju=${peak.jup}, Ma=${peak.mar}`);

console.log("\n============================================================\n");
