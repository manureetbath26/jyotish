/**
 * Career prediction script for:
 * DOB: 26 Jan 1988, 00:50 AM, Ludhiana Punjab India
 *
 * Reads fresh chart data from backend API, runs career engine for next 2 years.
 * Run: npx tsx scripts/predict-career.ts
 */

import fs from "node:fs";
import { preparePredictionInput } from "../src/lib/jaiminiPredictiveEngine";
import { scanCareerWindows } from "../src/lib/jaiminiCareerPrediction";
import { generateCareerReport } from "../src/lib/jaiminiCareerReport";
import type { ChartResponse } from "../src/lib/api";
import type { Sign } from "../src/lib/charaDashaEngine";

const chart = JSON.parse(fs.readFileSync("C:\\Users\\manur\\AppData\\Local\\Temp\\chart.json", "utf-8")) as ChartResponse;
const lifetimeData = JSON.parse(fs.readFileSync("C:\\Users\\manur\\AppData\\Local\\Temp\\transits.json", "utf-8"));
const allSnapshots = lifetimeData.snapshots;
console.log(`Loaded ${allSnapshots.length} lifetime transit snapshots (${allSnapshots[0]?.date} to ${allSnapshots[allSnapshots.length - 1]?.date})`);

const predInput = preparePredictionInput(chart);
const birthDate = new Date(chart.date + "T00:00:00");
const birthYear = birthDate.getFullYear();

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

// Full lifetime scan using real transit data
const scan = scanCareerWindows(predInput, chart, allSnapshots, 80, chart.date);

const report = generateCareerReport(predInput, chart, scan, {
  futureOnly: false,
  birthYear,
});

console.log(`Total monthly scores computed: ${scan.months.length}`);
console.log(`Total windows identified: ${scan.windows.length}`);
console.log("");

console.log("\n=== CHART INFO ===");
console.log("Lagna:", chart.lagna);
console.log("Birth:", chart.date, chart.time);
console.log("");

console.log("=== NATAL CAREER PROFILE ===");
console.log("10th House:", report.natalProfile.tenthSign);
console.log("10th Lord:", report.natalProfile.tenthLord, "in", report.natalProfile.tenthLordSign);
console.log("Amatya Karaka (AmK):", report.natalProfile.amk, "in", report.natalProfile.amkSign);
console.log("A10 (Rajya Pada):", report.natalProfile.a10Sign);
console.log("Arudha Lagna (AL):", report.natalProfile.alSign);
console.log("Karakamsha:", report.natalProfile.karakamsha);
console.log("10th from Karakamsha:", report.natalProfile.tenthFromKarakamsha);
console.log("Planets in 10th:", report.natalProfile.beneficsOn10th.concat(report.natalProfile.maleficsOn10th).join(", ") || "(none)");
console.log("Benefics on 10th:", report.natalProfile.beneficsOn10th.join(", ") || "(none)");
console.log("Malefics on 10th:", report.natalProfile.maleficsOn10th.join(", ") || "(none)");
console.log("Planets on A10:", report.natalProfile.planetsOnA10.join(", ") || "(none)");
console.log("DK:", report.natalProfile.dk, "in", report.natalProfile.dkSign);
console.log("DK-AmK connected (business partnership indicator):", report.natalProfile.dkAmkConnected);
console.log("");

console.log("=== CURRENT DASHA ===");
console.log("Current MD:", predInput.currentDasha?.sign, `(${predInput.currentDasha?.startDate} - ${predInput.currentDasha?.endDate})`);
console.log("Current AD:", predInput.currentSubPeriod?.sign, `(${predInput.currentSubPeriod?.startDate} - ${predInput.currentSubPeriod?.endDate})`);
console.log("");

console.log("=== CAREER NATURE ===");
console.log("Primary Mode:", report.careerNature.primaryMode);
console.log(report.careerNature.modeExplanation);
console.log("");
console.log("Suggested Sectors:", report.careerNature.sectors.join(", "));
console.log("");
console.log(report.careerNature.sectorExplanation);
console.log("");

if (report.careerNature.currentDashaTheme) {
  console.log("=== CURRENT DASHA CAREER THEME ===");
  console.log(report.careerNature.currentDashaTheme);
  console.log("");
}

console.log("=== CAREER VERDICT (Next 3 Years) ===");
console.log("Confidence:", report.verdict.confidence);
console.log(report.verdict.narrative);
if (report.verdict.topPeriods.length > 0) {
  console.log("Top Periods:");
  report.verdict.topPeriods.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
}
console.log("");

console.log("=== KEY CAREER PERIODS ===");
if (report.keyPeriods.length === 0) {
  console.log("No strong career windows found in the next 3 years.");
} else {
  report.keyPeriods.forEach((period, i) => {
    console.log(`\n--- Period ${i + 1} (${period.strength}) ---`);
    console.log(`Time: ${period.timeRange} (age ${period.age})`);
    console.log(`Dasha: ${period.dasha}`);
    console.log(`Summary: ${period.summary}`);
    console.log(`Rules met: ${period.rulesMetList.join(", ")}`);
    const inds: string[] = [];
    if (period.indicates.promotion) inds.push("Promotion");
    if (period.indicates.jobChange) inds.push("Job Change");
    if (period.indicates.businessLaunch) inds.push("Business Launch");
    if (period.indicates.recognition) inds.push("Recognition");
    if (inds.length > 0) console.log(`Indicates: ${inds.join(", ")}`);
    console.log("Interpretations:");
    period.interpretations.forEach((interp) => console.log(`  - ${interp}`));
  });
}
console.log("");

console.log("=== GROWTH INDICATORS ===");
report.strongIndicators.forEach((i) => console.log("  +", i));
console.log("");

console.log("=== CHALLENGES ===");
report.challenges.forEach((c) => console.log("  !", c));
console.log("");

// Business-specific analysis
console.log("=== BUSINESS STARTUP ASSESSMENT (Next 2 Years) ===");
const businessWindows = report.keyPeriods.filter((p) => p.indicates.businessLaunch);
const strongWindows = report.keyPeriods.filter((p) => p.strength === "Strong");
if (businessWindows.length > 0) {
  console.log(`Found ${businessWindows.length} business launch window(s):`);
  businessWindows.forEach((w) => console.log(`  - ${w.timeRange} (age ${w.age}): ${w.dasha}`));
} else if (strongWindows.length > 0) {
  console.log(`No specific business-launch windows, but ${strongWindows.length} strong career windows exist.`);
} else {
  console.log("No strong business launch signals in the next 2 years based on engine rules.");
}
console.log("\nBusiness-supporting natal factors:");
console.log(`  - Primary mode: ${report.careerNature.primaryMode}`);
console.log(`  - DK-AmK connected: ${report.natalProfile.dkAmkConnected}`);
console.log(`  - AmK: ${report.natalProfile.amk} (${report.natalProfile.amkSign})`);
console.log(`  - 10th sign: ${report.natalProfile.tenthSign}`);
