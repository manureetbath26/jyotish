/**
 * Rename the "chara_dasha" ReportCatalog entry.
 *
 * Run with:
 *   npx tsx scripts/rename-chara-dasha-catalog.ts
 *
 * (Or add DATABASE_URL to the env if running from a fresh shell.)
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const NEW_NAME = "Marriage & Relationships — Jaimini Chara Dasha";
const NEW_DESCRIPTION =
  "Timing of partnership, marriage windows, and relationship quality through Jaimini's sign-based dasha system.";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const existing = await prisma.reportCatalog.findUnique({
      where: { slug: "chara_dasha" },
    });
    if (!existing) {
      console.error("No ReportCatalog row found for slug='chara_dasha'. Nothing to rename.");
      process.exit(1);
    }
    const updated = await prisma.reportCatalog.update({
      where: { slug: "chara_dasha" },
      data: {
        name: NEW_NAME,
        description: NEW_DESCRIPTION,
      },
    });
    console.log("Updated:", {
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
