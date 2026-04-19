/**
 * Quick smoke test for the Ashtakvarga engine.
 * Uses the Nehru horoscope from the PDF (page 14) for validation.
 *
 * Nehru (14-Nov-1889, Allahabad, 11:03 PM):
 *   Lagna: Cancer
 *   Sun: Scorpio, Moon: Cancer, Mars: Virgo, Mercury: Libra,
 *   Jupiter: Sagittarius, Venus: Libra, Saturn: Leo
 *
 * Expected SAV per sign (from classical Nehru example):
 *   Aries 24, Taurus 20, Gemini 26, Cancer 33, Leo 26, Virgo 32,
 *   Libra 27, Scorpio 30, Sagittarius 34, Capricorn 25, Aquarius 38, Pisces 22
 * (Total ~337)
 *
 * Run: npx tsx scripts/test-ashtakvarga.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ChartResponse, PlanetPosition, HouseInfo, NavamsaPosition } from "../src/lib/api";
import {
  computeAshtakvarga,
  ASHTAKVARGA_SOURCES,
  type AshtakvargaRule as EngineRule,
} from "../src/lib/ashtakvargaEngine";
import { ZODIAC_ORDER } from "../src/lib/charaDashaEngine";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  // Nehru horoscope skeleton — only the fields needed by the engine
  const planets: PlanetPosition[] = [
    { name: "Sun", longitude: 0, rashi: "Scorpio", rashi_num: 8, degree_in_rashi: 0.25, house: 5, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Moon", longitude: 0, rashi: "Cancer", rashi_num: 4, degree_in_rashi: 17.87, house: 1, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Mars", longitude: 0, rashi: "Virgo", rashi_num: 6, degree_in_rashi: 9.98, house: 3, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Mercury", longitude: 0, rashi: "Libra", rashi_num: 7, degree_in_rashi: 17.13, house: 4, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Jupiter", longitude: 0, rashi: "Sagittarius", rashi_num: 9, degree_in_rashi: 15.17, house: 6, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Venus", longitude: 0, rashi: "Libra", rashi_num: 7, degree_in_rashi: 7.35, house: 4, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Saturn", longitude: 0, rashi: "Leo", rashi_num: 5, degree_in_rashi: 10.83, house: 2, nakshatra: "", nakshatra_pada: 0, is_retrograde: false, dignity: null, lord_of_houses: [] },
    { name: "Rahu", longitude: 0, rashi: "Leo", rashi_num: 5, degree_in_rashi: 11.22, house: 2, nakshatra: "", nakshatra_pada: 0, is_retrograde: true, dignity: null, lord_of_houses: [] },
    { name: "Ketu", longitude: 0, rashi: "Aquarius", rashi_num: 11, degree_in_rashi: 11.22, house: 8, nakshatra: "", nakshatra_pada: 0, is_retrograde: true, dignity: null, lord_of_houses: [] },
  ];

  const chart = {
    date: "1889-11-14",
    time: "23:03",
    place: "Allahabad",
    lagna: "Cancer",
    lagna_degree: 0,
    ayanamsha_value: 0,
    planets,
    houses: [] as HouseInfo[],
    navamsa: [] as NavamsaPosition[],
  } as unknown as ChartResponse;

  // Load rules
  const rulesRaw = await prisma.ashtakvargaRule.findMany();
  const rules: EngineRule[] = rulesRaw.map((r) => ({
    planet: r.planet as EngineRule["planet"],
    source: r.source as EngineRule["source"],
    houses: r.houses,
  }));

  const analysis = computeAshtakvarga(chart, rules);

  console.log("\n=== SOURCE PLACEMENTS ===");
  for (const src of ASHTAKVARGA_SOURCES) {
    console.log(`  ${src.padEnd(8)} = ${analysis.sourcePlacements[src]}`);
  }

  console.log("\n=== BHINNASHTAKVARGA PER PLANET (expected 48/49/39/54/56/52/39) ===");
  for (const p of analysis.prastharaCharts) {
    console.log(`  ${p.planet.padEnd(8)} total = ${p.grandTotal}`);
  }

  console.log("\n=== SARVASHTAKVARGA PER SIGN ===");
  console.log(
    ZODIAC_ORDER.map((s) => s.slice(0, 3).padStart(4)).join(" | "),
  );
  console.log(
    analysis.sarvashtakvarga.signTotals
      .map((n) => String(n).padStart(4))
      .join(" | "),
  );
  console.log(`  Grand total: ${analysis.sarvashtakvarga.grandTotal}`);

  console.log("\n=== SUN'S PRASTHARA CHART ===");
  const sunChart = analysis.prastharaCharts[0];
  console.log("Source   | " + ZODIAC_ORDER.map((s) => s.slice(0, 3).padStart(3)).join(" "));
  ASHTAKVARGA_SOURCES.forEach((src, i) => {
    const row = sunChart.matrix[i].map((v) => (v === 1 ? "  \u2022" : "  \u00B7")).join("");
    console.log(`${src.padEnd(8)} | ${row}`);
  });
  console.log(`Total    | ${sunChart.signTotals.map((n) => String(n).padStart(3)).join(" ")}`);
  console.log(`Sun BAV grand total = ${sunChart.grandTotal}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
