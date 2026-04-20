/**
 * Seed (or update) the "finance" ReportCatalog entry.
 *
 * Run with:
 *   npx tsx --env-file=.env scripts/seed-finance-report-catalog.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const SLUG = "finance";
const NAME = "5-Year Finance Report";
const DESCRIPTION =
  "Classical Vedic wealth analysis: Dhana yogas, Ashtakvarga health of every wealth house, Jaimini Arudha Padas (A2, A11), income source profile, savings axis, and a quarter-by-quarter forward timeline of best windows and caution periods over the next 5 years.";
const PRICE_PAISE = 50000; // INR 500

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const upserted = await prisma.reportCatalog.upsert({
      where: { slug: SLUG },
      create: {
        slug: SLUG,
        name: NAME,
        description: DESCRIPTION,
        price: PRICE_PAISE,
        active: true,
        adminOnly: false,
      },
      update: {
        name: NAME,
        description: DESCRIPTION,
        price: PRICE_PAISE,
      },
    });
    console.log("Upserted:", {
      slug: upserted.slug,
      name: upserted.name,
      price: upserted.price,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
