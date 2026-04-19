/**
 * Quick test of the career-Ashtakvarga engine on the user's chart.
 * Run: npx tsx scripts/test-career-ashtakvarga.ts
 */

import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ChartResponse } from "../src/lib/api";
import { preparePredictionInput } from "../src/lib/jaiminiPredictiveEngine";
import {
  computeAshtakvarga,
  type AshtakvargaRule,
} from "../src/lib/ashtakvargaEngine";
import { computeCareerAshtakvargaInsights } from "../src/lib/careerAshtakvargaInsights";
import type { Sign } from "../src/lib/charaDashaEngine";
import { SIGN_INDEX, ZODIAC_ORDER, SIGN_LORD } from "../src/lib/charaDashaEngine";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const chart = JSON.parse(
    fs.readFileSync("C:\\Users\\manur\\AppData\\Local\\Temp\\chart.json", "utf-8"),
  ) as ChartResponse;

  const rulesRaw = await prisma.ashtakvargaRule.findMany();
  const rules: AshtakvargaRule[] = rulesRaw.map((r) => ({
    planet: r.planet as AshtakvargaRule["planet"],
    source: r.source as AshtakvargaRule["source"],
    houses: r.houses,
  }));

  const analysis = computeAshtakvarga(chart, rules);
  const predInput = preparePredictionInput(chart);

  // Derive A10 and AmK
  const a10Pada = predInput.allPadas.find((p) => p.house === 10);
  const a10Sign = (a10Pada?.padaSign || ZODIAC_ORDER[(SIGN_INDEX[chart.lagna as Sign] + 9) % 12]) as Sign;
  const amk = predInput.karakas.find((k) => k.role === "Amatyakaraka");
  const amkPlanet = amk?.planet || "Mercury";

  const insights = computeCareerAshtakvargaInsights(analysis, a10Sign, amkPlanet);

  console.log("\n=== CAREER ASHTAKVARGA INSIGHTS ===\n");
  console.log(`Overall: ${insights.overallRating}`);
  console.log(insights.overallNarrative);
  console.log("");
  console.log("--- SAV signals ---");
  console.log(`10th (career)    (${insights.tenthSav.sign}): ${insights.tenthSav.bindus} [${insights.tenthSav.strength}]`);
  console.log(`  ${insights.tenthSav.interpretation}`);
  console.log(`A10 (reputation) (${insights.a10Sav.sign}): ${insights.a10Sav.bindus} [${insights.a10Sav.strength}]`);
  console.log(`  ${insights.a10Sav.interpretation}`);
  console.log(`11th (gains)     (${insights.eleventhSav.sign}): ${insights.eleventhSav.bindus} [${insights.eleventhSav.strength}]`);
  console.log(`  ${insights.eleventhSav.interpretation}`);
  console.log("");
  console.log("--- BAV in 10th sign ---");
  console.log(`AmK (${insights.amkBav.planet}): ${insights.amkBav.bindus}/8 [${insights.amkBav.strength}]`);
  console.log(`  ${insights.amkBav.interpretation}`);
  console.log(`Sun:     ${insights.sunBav.bindus}/8 [${insights.sunBav.strength}]`);
  console.log(`  ${insights.sunBav.interpretation}`);
  console.log(`Saturn:  ${insights.saturnBav.bindus}/8 [${insights.saturnBav.strength}]`);
  console.log(`  ${insights.saturnBav.interpretation}`);
  console.log(`Jupiter: ${insights.jupiterBav.bindus}/8 [${insights.jupiterBav.strength}]`);
  console.log(`  ${insights.jupiterBav.interpretation}`);
  console.log("");
  console.log("--- Comparisons ---");
  for (const c of insights.comparisons) {
    console.log(`${c.title} (${c.labelA}=${c.valueA} vs ${c.labelB}=${c.valueB})`);
    console.log(`  ${c.verdict}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
