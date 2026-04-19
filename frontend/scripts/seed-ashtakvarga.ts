/**
 * Seed the AshtakvargaRule table.
 *
 * Source: M.S. Mehta, "Jyotish Ashtakavarga", tables on pages 11-13.
 * https://astrofoxx.wordpress.com/wp-content/uploads/2018/11/jyotish_ashtakavarga_m-s-mehta.pdf
 *
 * Each row lists the benefic house offsets (1-12) at which the `planet`
 * receives a bindu from the `source`. Totals match the classical values
 * (Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39).
 *
 * Run: npx tsx scripts/seed-ashtakvarga.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface RuleData {
  planet: string;
  source: string;
  houses: number[];
}

const RULES: RuleData[] = [
  // ─── Sun's Bhinnashtakvarga (total = 48) ──────────────────────────────
  { planet: "Sun", source: "Sun",     houses: [1, 2, 4, 7, 8, 9, 10, 11] },  // 8
  { planet: "Sun", source: "Moon",    houses: [3, 6, 10, 11] },               // 4
  { planet: "Sun", source: "Mars",    houses: [1, 2, 4, 7, 8, 9, 10, 11] },  // 8
  { planet: "Sun", source: "Mercury", houses: [3, 5, 6, 9, 10, 11, 12] },    // 7
  { planet: "Sun", source: "Jupiter", houses: [5, 6, 9, 11] },                // 4
  { planet: "Sun", source: "Venus",   houses: [6, 7, 12] },                   // 3
  { planet: "Sun", source: "Saturn",  houses: [1, 2, 4, 7, 8, 9, 10, 11] },  // 8
  { planet: "Sun", source: "Lagna",   houses: [3, 4, 6, 10, 11, 12] },       // 6

  // ─── Moon's Bhinnashtakvarga (total = 49) ─────────────────────────────
  { planet: "Moon", source: "Moon",    houses: [1, 3, 6, 7, 10, 11] },          // 6
  { planet: "Moon", source: "Sun",     houses: [3, 6, 7, 8, 10, 11] },           // 6
  { planet: "Moon", source: "Mars",    houses: [2, 3, 5, 6, 9, 10, 11] },        // 7
  { planet: "Moon", source: "Mercury", houses: [1, 3, 4, 5, 7, 8, 10, 11] },    // 8
  { planet: "Moon", source: "Jupiter", houses: [1, 4, 7, 8, 10, 11, 12] },      // 7
  { planet: "Moon", source: "Venus",   houses: [3, 4, 5, 7, 9, 10, 11] },       // 7
  { planet: "Moon", source: "Saturn",  houses: [3, 5, 6, 11] },                  // 4
  { planet: "Moon", source: "Lagna",   houses: [3, 6, 10, 11] },                 // 4

  // ─── Mars's Bhinnashtakvarga (total = 39) ─────────────────────────────
  { planet: "Mars", source: "Mars",    houses: [1, 2, 4, 7, 8, 10, 11] },  // 7
  { planet: "Mars", source: "Sun",     houses: [3, 5, 6, 10, 11] },         // 5
  { planet: "Mars", source: "Moon",    houses: [3, 6, 11] },                // 3
  { planet: "Mars", source: "Mercury", houses: [3, 5, 6, 11] },             // 4
  { planet: "Mars", source: "Jupiter", houses: [6, 10, 11, 12] },           // 4
  { planet: "Mars", source: "Venus",   houses: [6, 8, 11, 12] },            // 4
  { planet: "Mars", source: "Saturn",  houses: [1, 4, 7, 8, 9, 10, 11] },  // 7
  { planet: "Mars", source: "Lagna",   houses: [1, 3, 6, 10, 11] },         // 5

  // ─── Mercury's Bhinnashtakvarga (total = 54) ──────────────────────────
  { planet: "Mercury", source: "Mercury", houses: [1, 3, 5, 6, 9, 10, 11, 12] }, // 8
  { planet: "Mercury", source: "Sun",     houses: [5, 6, 9, 11, 12] },            // 5
  { planet: "Mercury", source: "Moon",    houses: [2, 4, 6, 8, 10, 11] },         // 6
  { planet: "Mercury", source: "Mars",    houses: [1, 2, 4, 7, 8, 9, 10, 11] },   // 8
  { planet: "Mercury", source: "Jupiter", houses: [6, 8, 11, 12] },                // 4
  { planet: "Mercury", source: "Venus",   houses: [1, 2, 3, 4, 5, 8, 9, 11] },    // 8
  { planet: "Mercury", source: "Saturn",  houses: [1, 2, 4, 7, 8, 9, 10, 11] },   // 8
  { planet: "Mercury", source: "Lagna",   houses: [1, 2, 4, 6, 8, 10, 11] },      // 7

  // ─── Jupiter's Bhinnashtakvarga (total = 56) ──────────────────────────
  { planet: "Jupiter", source: "Jupiter", houses: [1, 2, 3, 4, 7, 8, 10, 11] },     // 8
  { planet: "Jupiter", source: "Sun",     houses: [1, 2, 3, 4, 7, 8, 9, 10, 11] }, // 9
  { planet: "Jupiter", source: "Moon",    houses: [2, 5, 7, 9, 11] },                // 5
  { planet: "Jupiter", source: "Mars",    houses: [1, 2, 4, 7, 8, 10, 11] },         // 7
  { planet: "Jupiter", source: "Mercury", houses: [1, 2, 4, 5, 6, 9, 10, 11] },     // 8
  { planet: "Jupiter", source: "Venus",   houses: [2, 5, 6, 9, 10, 11] },            // 6
  { planet: "Jupiter", source: "Saturn",  houses: [3, 5, 6, 12] },                   // 4
  { planet: "Jupiter", source: "Lagna",   houses: [1, 2, 4, 5, 6, 7, 9, 10, 11] }, // 9

  // ─── Venus's Bhinnashtakvarga (total = 52) ────────────────────────────
  { planet: "Venus", source: "Venus",   houses: [1, 2, 3, 4, 5, 8, 9, 10, 11] },   // 9
  { planet: "Venus", source: "Sun",     houses: [8, 11, 12] },                       // 3
  { planet: "Venus", source: "Moon",    houses: [1, 2, 3, 4, 5, 8, 9, 11, 12] },   // 9
  { planet: "Venus", source: "Mars",    houses: [3, 5, 6, 9, 11, 12] },              // 6
  { planet: "Venus", source: "Mercury", houses: [3, 5, 6, 9, 11] },                  // 5
  { planet: "Venus", source: "Jupiter", houses: [5, 8, 9, 10, 11] },                 // 5
  { planet: "Venus", source: "Saturn",  houses: [3, 4, 5, 8, 9, 10, 11] },          // 7
  { planet: "Venus", source: "Lagna",   houses: [1, 2, 3, 4, 5, 8, 9, 11] },        // 8

  // ─── Saturn's Bhinnashtakvarga (total = 39) ───────────────────────────
  { planet: "Saturn", source: "Saturn",  houses: [3, 5, 6, 11] },                 // 4
  { planet: "Saturn", source: "Sun",     houses: [1, 2, 4, 7, 8, 10, 11] },      // 7
  { planet: "Saturn", source: "Moon",    houses: [3, 6, 11] },                    // 3
  { planet: "Saturn", source: "Mars",    houses: [3, 5, 6, 10, 11, 12] },         // 6
  { planet: "Saturn", source: "Mercury", houses: [6, 8, 9, 10, 11, 12] },         // 6
  { planet: "Saturn", source: "Jupiter", houses: [5, 6, 11, 12] },                // 4
  { planet: "Saturn", source: "Venus",   houses: [6, 11, 12] },                   // 3
  { planet: "Saturn", source: "Lagna",   houses: [1, 3, 4, 6, 10, 11] },          // 6
];

async function main() {
  console.log(`Seeding ${RULES.length} Ashtakvarga rules...`);

  // Verify totals against classical values
  const EXPECTED_TOTALS: Record<string, number> = {
    Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39,
  };
  for (const [planet, expected] of Object.entries(EXPECTED_TOTALS)) {
    const total = RULES
      .filter((r) => r.planet === planet)
      .reduce((sum, r) => sum + r.houses.length, 0);
    const status = total === expected ? "OK" : "FAIL";
    console.log(`  ${planet.padEnd(8)} total = ${total} (expected ${expected}) [${status}]`);
    if (total !== expected) {
      throw new Error(`Total mismatch for ${planet}: got ${total}, expected ${expected}`);
    }
  }

  // Upsert each rule
  let inserted = 0;
  let updated = 0;
  for (const rule of RULES) {
    const result = await prisma.ashtakvargaRule.upsert({
      where: {
        planet_source: { planet: rule.planet, source: rule.source },
      },
      create: rule,
      update: { houses: rule.houses },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(`\nDone. Inserted ${inserted}, updated ${updated}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
