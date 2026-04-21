/**
 * Seed the HouseSignification table — single source of truth for house
 * names + short phrases + richer significations, used by yoga, daily,
 * finance, and arudha engines.
 *
 * Content consolidated from the previously-duplicated maps:
 *   - yogaEngine: HOUSE_SIGNIFICATIONS (name + significations)
 *   - dailyEngine: HOUSE_THEMES (short daily phrase)
 *   - financeEngine: HOUSE_NAMES (compact finance label)
 *
 * Run: npx tsx --env-file=.env scripts/seed-house-significations.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

interface Row {
  house: number;
  name: string;
  short: string;
  themes: string;
}

const ROWS: Row[] = [
  {
    house: 1,
    name: "Lagna (Self)",
    short: "self, body, vitality",
    themes: "self, body, vitality, personality, head, overall life direction",
  },
  {
    house: 2,
    name: "Dhana Bhava (Wealth)",
    short: "wealth, speech, family",
    themes: "wealth, family, speech, food, values, face",
  },
  {
    house: 3,
    name: "Sahaja (Siblings & Effort)",
    short: "courage, siblings, skill, short travel",
    themes: "courage, younger siblings, skills, short travel, self-effort, communication",
  },
  {
    house: 4,
    name: "Sukha (Home & Comfort)",
    short: "home, mother, peace, property",
    themes: "home, mother, vehicles, inner peace, property, early education",
  },
  {
    house: 5,
    name: "Putra (Children & Creativity)",
    short: "children, creativity, intelligence, romance",
    themes: "children, intelligence, creativity, romance, speculation, past-life merit (poorva punya)",
  },
  {
    house: 6,
    name: "Ripu (Debts, Disease, Service)",
    short: "work, service, enemies, health",
    themes: "enemies, debts, disease, daily work, service, obstacles overcome",
  },
  {
    house: 7,
    name: "Yuvati (Marriage & Partnerships)",
    short: "marriage, partnerships, open dealings",
    themes: "spouse, marriage, business partnerships, public dealings, open enemies",
  },
  {
    house: 8,
    name: "Ayu (Longevity & Transformation)",
    short: "transformation, research, hidden matters",
    themes: "longevity, transformation, secrets, inheritance, occult, sudden events, in-laws",
  },
  {
    house: 9,
    name: "Dharma (Fortune & Guru)",
    short: "fortune, dharma, father, higher learning",
    themes: "dharma, fortune, father, higher learning, long journeys, guru, spirituality",
  },
  {
    house: 10,
    name: "Karma (Career & Status)",
    short: "career, public image, authority",
    themes: "career, public image, status, authority, action in the world",
  },
  {
    house: 11,
    name: "Labha (Gains & Networks)",
    short: "gains, networks, elder siblings",
    themes: "gains, friends, elder siblings, fulfilment of desires, networks",
  },
  {
    house: 12,
    name: "Vyaya (Losses & Moksha)",
    short: "rest, losses, foreign, moksha, privacy",
    themes: "expenses, foreign lands, moksha, seclusion, bed pleasures, hidden enemies",
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const r of ROWS) {
      await prisma.houseSignification.upsert({
        where: { house: r.house },
        create: r,
        update: { name: r.name, short: r.short, themes: r.themes },
      });
    }
    console.log(`Upserted ${ROWS.length} house significations.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
