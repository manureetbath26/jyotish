/**
 * Smoke test for the marriage-Ashtakvarga insights on the user's chart
 * (26 Jan 1988, 00:50, Ludhiana).
 *
 * Run: npx tsx scripts/test-marriage-ashtakvarga.ts
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
import { computeMarriageAshtakvargaInsights } from "../src/lib/marriageAshtakvargaInsights";

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
  const ulSign = predInput.upaPada?.padaSign || chart.lagna;

  const insights = computeMarriageAshtakvargaInsights(analysis, ulSign as never);

  console.log("\n=== MARRIAGE ASHTAKVARGA INSIGHTS ===\n");
  console.log(`Overall: ${insights.overallRating}`);
  console.log(insights.overallNarrative);
  console.log("");
  console.log("--- SAV signals ---");
  console.log(`7th House      (${insights.sevenSav.sign}): ${insights.sevenSav.bindus} [${insights.sevenSav.strength}]`);
  console.log(`  ${insights.sevenSav.interpretation}`);
  console.log(`Upa-Pada       (${insights.ulSav.sign}): ${insights.ulSav.bindus} [${insights.ulSav.strength}]`);
  console.log(`  ${insights.ulSav.interpretation}`);
  console.log(`2nd from UL    (${insights.secondFromUlSav.sign}): ${insights.secondFromUlSav.bindus} [${insights.secondFromUlSav.strength}]`);
  console.log(`  ${insights.secondFromUlSav.interpretation}`);
  console.log("");
  console.log("--- BAV in 7th sign ---");
  console.log(`Venus:   ${insights.venusBav.bindus}/8 [${insights.venusBav.strength}] — ${insights.venusBav.interpretation}`);
  console.log(`Jupiter: ${insights.jupiterBav.bindus}/8 [${insights.jupiterBav.strength}] — ${insights.jupiterBav.interpretation}`);
  console.log(`Saturn:  ${insights.saturnBav.bindus}/8 [${insights.saturnBav.strength}] — ${insights.saturnBav.interpretation}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
