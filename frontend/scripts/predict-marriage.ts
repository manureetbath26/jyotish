/**
 * Standalone script to predict marriage timing for:
 * DOB: 26 Jan 1988, 00:50 AM, Ludhiana Punjab India
 *
 * Uses known chart data from previous computation sessions.
 * Run: npx tsx scripts/predict-marriage.ts
 */

import { computeCharaKarakas, calculateKarakamsha } from "../src/lib/karakaEngine";
import { calculateCharaDasha, calculatePadas, hasJaiminiAspect, ZODIAC_ORDER, SIGN_INDEX, SIGN_LORD, type Sign } from "../src/lib/charaDashaEngine";
import { preparePredictionInput } from "../src/lib/jaiminiPredictiveEngine";
import { predictMarriage, scanMarriageWindows, type TransitPositions } from "../src/lib/jaiminiMarriagePrediction";
import type { ChartResponse, PlanetPosition, HouseInfo, NavamsaPosition } from "../src/lib/api";

// ── Known chart data for 26 Jan 1988, 00:50 AM, Ludhiana ──
// Libra lagna, previously verified

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

// Navamsa positions (approximate — derived from degrees)
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

// ── Run the prediction ──

console.log("\n============================================================");
console.log("  JAIMINI MARRIAGE PREDICTION");
console.log("  DOB: 26 Jan 1988, 00:50 AM, Ludhiana Punjab India");
console.log("  Lagna: Libra");
console.log("============================================================\n");

// Step 1: Build prediction input
const predInput = preparePredictionInput(chart);

// Show karakas
console.log("── KARAKAS ──");
for (const k of predInput.karakas) {
  console.log(`  ${k.role.padEnd(16)} → ${k.planet.padEnd(8)} in ${k.rashi.padEnd(12)} (${k.degree_in_rashi.toFixed(2)}°)`);
}

// Show key points
console.log(`\n── KEY REFERENCE POINTS ──`);
console.log(`  Arudha Lagna (AL): ${predInput.arudhaLagna?.padaSign || "N/A"}`);
console.log(`  Upa-Pada (UL):     ${predInput.upaPada?.padaSign || "N/A"}`);

const lagna = "Libra" as Sign;
const seventhSign = ZODIAC_ORDER[(SIGN_INDEX[lagna] + 6) % 12];
console.log(`  7th House:         ${seventhSign}`);

const dk = predInput.karakas.find(k => k.role === "Darakaraka");
console.log(`  Darakaraka (DK):   ${dk?.planet || "?"} in ${dk?.rashi || "?"}`);

// Karakamsha
console.log(`  Karakamsha:        ${predInput.karakamsha?.karakamsha || "N/A"}`);

// Show current dasha
console.log(`\n── CURRENT CHARA DASHA ──`);
console.log(`  MD: ${predInput.currentDasha?.sign || "N/A"} (${predInput.currentDasha?.startDate} to ${predInput.currentDasha?.endDate})`);
console.log(`  AD: ${predInput.currentSubPeriod?.sign || "N/A"} (${predInput.currentSubPeriod?.startDate} to ${predInput.currentSubPeriod?.endDate})`);

// Step 2: Current prediction with approximate current transits (Apr 2026)
// Saturn in Pisces, Jupiter in Gemini, Mars in Cancer (approximate Apr 2026)
const currentTransit: TransitPositions = {
  saturn: "Pisces" as Sign,
  jupiter: "Gemini" as Sign,
  mars: "Cancer" as Sign,
};

console.log(`\n── CURRENT TRANSIT (approx Apr 2026) ──`);
console.log(`  Saturn:  ${currentTransit.saturn}`);
console.log(`  Jupiter: ${currentTransit.jupiter}`);
console.log(`  Mars:    ${currentTransit.mars}`);

const currentReport = predictMarriage(predInput, chart, currentTransit);
console.log(`\n── CURRENT RULE EVALUATION ──`);
for (const r of currentReport.rules) {
  const mark = r.isSatisfied ? "✓" : "✗";
  console.log(`  ${mark} Rule ${r.ruleNumber}: ${r.ruleName}`);
  console.log(`    ${r.explanation}`);
}
console.log(`\n  Rules satisfied: ${currentReport.rulesSatisfied}/6`);
console.log(`  Strength: ${currentReport.strength.toUpperCase()}`);
console.log(`  Marriage indicated now: ${currentReport.isMarriageIndicated ? "YES" : "NO"}`);

// Step 3: 5-year scan using approximate transit positions
// Saturn: ~2.5 years per sign, Jupiter: ~1 year per sign, Mars: ~1.5 months per sign
// Generate monthly snapshots for 5 years

console.log(`\n\n============================================================`);
console.log(`  5-YEAR MARRIAGE WINDOW SCAN (Apr 2026 – Apr 2031)`);
console.log(`============================================================\n`);

// Saturn transit schedule (approximate):
// Pisces: Feb 2025 – Apr 2028 (Saturn in house 6)
// Aries: Apr 2028 – Jun 2030 (house 7)
// Taurus: Jun 2030 – Jul 2032 (house 8)

// Jupiter transit schedule (approximate):
// Gemini: May 2025 – Jun 2026 (house 9)
// Cancer: Jun 2026 – Jul 2027 (house 10)
// Leo: Jul 2027 – Aug 2028 (house 11)
// Virgo: Aug 2028 – Sep 2029 (house 12)
// Libra: Sep 2029 – Oct 2030 (house 1)
// Scorpio: Oct 2030 – Nov 2031 (house 2)

// Mars: fast mover (~45 days per sign), cycle through all 12 signs roughly every 1.5 years

function getApproxSaturnSign(date: string): Sign {
  const d = new Date(date + "T00:00:00");
  if (d < new Date("2028-04-01T00:00:00")) return "Pisces" as Sign;
  if (d < new Date("2030-06-01T00:00:00")) return "Aries" as Sign;
  return "Taurus" as Sign;
}

function getApproxJupiterSign(date: string): Sign {
  const d = new Date(date + "T00:00:00");
  if (d < new Date("2026-06-01T00:00:00")) return "Gemini" as Sign;
  if (d < new Date("2027-07-01T00:00:00")) return "Cancer" as Sign;
  if (d < new Date("2028-08-01T00:00:00")) return "Leo" as Sign;
  if (d < new Date("2029-09-01T00:00:00")) return "Virgo" as Sign;
  if (d < new Date("2030-10-01T00:00:00")) return "Libra" as Sign;
  return "Scorpio" as Sign;
}

function getApproxMarsSign(date: string): Sign {
  // Mars completes a zodiac cycle in ~687 days
  // Use a rough approximation: starting from Cancer (Apr 2026)
  const baseDate = new Date("2026-04-01T00:00:00");
  const baseSIdx = SIGN_INDEX["Cancer" as Sign];
  const d = new Date(date + "T00:00:00");
  const daysDiff = (d.getTime() - baseDate.getTime()) / 86400000;
  const signsAdvanced = Math.floor(daysDiff / 45); // ~45 days per sign average
  return ZODIAC_ORDER[(baseSIdx + signsAdvanced) % 12];
}

// Build monthly snapshots
function houseFromSign(lagnaSign: Sign, sign: Sign): number {
  return ((SIGN_INDEX[sign] - SIGN_INDEX[lagnaSign] + 12) % 12) + 1;
}

const snapshots: { date: string; planets: Record<string, number> }[] = [];
for (let yr = 2026; yr <= 2031; yr++) {
  for (let mo = 1; mo <= 12; mo++) {
    if (yr === 2026 && mo < 4) continue; // start from Apr 2026
    if (yr === 2031 && mo > 4) break;    // end at Apr 2031
    const dateStr = `${yr}-${String(mo).padStart(2, "0")}-01`;
    const satSign = getApproxSaturnSign(dateStr);
    const jupSign = getApproxJupiterSign(dateStr);
    const marsSign = getApproxMarsSign(dateStr);
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

const scan = scanMarriageWindows(predInput, chart, snapshots, 5);

// Print monthly scores
console.log("  Month        Score  Rules Met          MD           AD           Saturn    Jupiter   Mars");
console.log("  ───────────  ─────  ─────────────────  ───────────  ───────────  ────────  ────────  ────────");
for (const m of scan.months) {
  const rulesStr = m.rulesMetList.map(r => `R${r}`).join(",").padEnd(17);
  const mark = m.rulesSatisfied >= 3 ? " ★" : "";
  console.log(
    `  ${m.month.padEnd(11)}  ${String(m.rulesSatisfied).padStart(1)}/6    ${rulesStr}  ${(m.md || "—").padEnd(11)}  ${(m.ad || "—").padEnd(11)}  ${m.transit.saturn.padEnd(8)}  ${m.transit.jupiter.padEnd(8)}  ${m.transit.mars}${mark}`
  );
}

// Print windows
if (scan.windows.length > 0) {
  console.log(`\n── FAVORABLE WINDOWS (3+ rules met) ──\n`);
  for (const w of scan.windows) {
    const label = w.startMonth === w.endMonth ? w.startMonth : `${w.startMonth} – ${w.endMonth}`;
    console.log(`  ★ ${label}`);
    console.log(`    Duration: ${w.months.length} month(s) | Peak: ${w.peakScore}/6 | Avg: ${w.avgScore.toFixed(1)}/6`);
    console.log(`    Strength: ${w.peakScore >= 5 ? "STRONG" : "MODERATE"}`);
    console.log("");
  }
} else {
  console.log("\n  No strong marriage windows found in next 5 years.");
}

// Peak month
if (scan.peakMonth) {
  console.log(`── PEAK MONTH ──`);
  console.log(`  ${scan.peakMonth.month} — ${scan.peakMonth.rulesSatisfied}/6 rules met`);
  console.log(`  Rules: ${scan.peakMonth.rulesMetList.map(r => `Rule ${r}`).join(", ")}`);
  console.log(`  MD: ${scan.peakMonth.md} / AD: ${scan.peakMonth.ad}`);
  console.log(`  Transit: Sa=${scan.peakMonth.transit.saturn}, Ju=${scan.peakMonth.transit.jupiter}, Ma=${scan.peakMonth.transit.mars}`);
}

console.log("\n============================================================\n");
