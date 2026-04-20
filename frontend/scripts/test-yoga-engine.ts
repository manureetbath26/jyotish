/** Quick smoke test for the yoga engine */
import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ChartResponse } from "../src/lib/api";
import { detectYogas, type YogaRule } from "../src/lib/yogaEngine";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const chart = JSON.parse(
    fs.readFileSync("C:\\Users\\manur\\AppData\\Local\\Temp\\chart.json", "utf-8"),
  ) as ChartResponse;

  const rulesRaw = await prisma.yogaRule.findMany();
  const rules: YogaRule[] = rulesRaw.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category as YogaRule["category"],
    chapter: r.chapter,
    source: r.source,
    classicalText: r.classicalText,
    formation: r.formation,
    effects: r.effects,
    importance: r.importance,
    sortOrder: r.sortOrder,
    detector: r.detector as YogaRule["detector"],
  }));

  const detected = detectYogas(chart, rules);
  console.log(`Detected ${detected.length} yogas in chart (Lagna ${chart.lagna}):\n`);
  for (const d of detected) {
    console.log(`  [${d.rule.category}] ${d.rule.name} (importance ${d.rule.importance})`);
    console.log(`    ${d.evidence}`);
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
