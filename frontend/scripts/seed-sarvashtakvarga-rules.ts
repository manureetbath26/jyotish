/**
 * Seed the SarvashtakvargaRule table with interpretation rules.
 *
 * Source: https://shilaavinyaas.com/p/sarvashtakavarga-explained-house-wise-impacts-rules-remedies
 *
 * Threshold scale (per source):
 *   < 22  — weak / dented
 *   23-28 — average / balanced (optimum for maraka houses 2 & 7)
 *   > 28  — strong (but problematic for maraka houses)
 *
 * Run: npx tsx scripts/seed-sarvashtakvarga-rules.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

interface HouseRuleContent {
  house: number;
  title: string;
  themes: string;
  isMaraka: boolean;
  ranges: {
    weak: { min: number; max: number; text: string };
    average: { min: number; max: number; text: string };
    strong: { min: number; max: number; text: string };
  };
  weakRemedy: string;
  marakaNote?: string;
}

const HOUSE_RULES: { key: string; sortOrder: number; content: HouseRuleContent }[] = [
  {
    key: "1",
    sortOrder: 1,
    content: {
      house: 1,
      title: "1st House (Ascendant / Lagna)",
      themes: "Self, Personality, Health, Vitality",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Poor health, low confidence, weak vitality" },
        average: { min: 23, max: 28, text: "Stable but average vitality and self-assurance" },
        strong: { min: 29, max: 56, text: "Strong personality, leadership qualities, robust constitution" },
      },
      weakRemedy: "Yoga, meditation, regular fitness routines. Consider wearing a gemstone for your Lagna lord after consultation.",
    },
  },
  {
    key: "2",
    sortOrder: 2,
    content: {
      house: 2,
      title: "2nd House (Wealth, Speech, Family)",
      themes: "Wealth, Speech, Family, Accumulated resources",
      isMaraka: true,
      ranges: {
        weak: { min: 0, max: 22, text: "Financial struggles, family conflicts, difficulty with speech or accumulation" },
        average: { min: 23, max: 28, text: "Ideal balance for speech, wealth, and family relations" },
        strong: { min: 29, max: 56, text: "Excess can create disputes and instability — too much strength in a maraka house is problematic" },
      },
      marakaNote: "This is a maraka house. Best performance in the 22-28 range; exceeding can cause harm.",
      weakRemedy: "Build a regular savings habit, avoid unnecessary loans. Recite Shri Suktam for prosperity.",
    },
  },
  {
    key: "3",
    sortOrder: 3,
    content: {
      house: 3,
      title: "3rd House (Efforts, Courage, Siblings)",
      themes: "Effort, courage, siblings, short journeys, communications",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Weak willpower, sibling conflicts, low initiative" },
        average: { min: 23, max: 28, text: "Normal effort capacity, everyday courage" },
        strong: { min: 29, max: 56, text: "High energy — but watch for wasted effort on the wrong pursuits" },
      },
      weakRemedy: "Help your siblings. Donate to students or recite Hanuman Chalisa to build courage.",
    },
  },
  {
    key: "4",
    sortOrder: 4,
    content: {
      house: 4,
      title: "4th House (Home, Mother, Property)",
      themes: "Home, mother, domestic comforts, property, emotional base",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "No peace at home, property-related problems, domestic unrest" },
        average: { min: 23, max: 28, text: "Adequate comfort and stability at home" },
        strong: { min: 29, max: 56, text: "Strong home life, successful property acquisitions, emotional contentment" },
      },
      weakRemedy: "Respect your mother, maintain a clean and peaceful house, offer white sweets to Goddess Durga.",
    },
  },
  {
    key: "5",
    sortOrder: 5,
    content: {
      house: 5,
      title: "5th House (Love, Children, Creativity, Education)",
      themes: "Love, children, creativity, higher education, past life merit",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Love and children-related struggles, creative blocks, poor education prospects" },
        average: { min: 23, max: 28, text: "Average romance and educational outcomes" },
        strong: { min: 29, max: 56, text: "Excellent creativity, strong future vision, fertile prospects for children and learning" },
      },
      weakRemedy: "Study scriptures or philosophical texts. Recite the Gayatri Mantra. Teach children or donate to schools.",
    },
  },
  {
    key: "6",
    sortOrder: 6,
    content: {
      house: 6,
      title: "6th House (Job, Service, Health, Enemies)",
      themes: "Day-job / service, health battles, enemies, debts",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Illness, job instability, vulnerability to enemies and debts" },
        average: { min: 23, max: 28, text: "Manageable work life and health" },
        strong: { min: 29, max: 56, text: "Victory over enemies, stable employment, good health" },
      },
      weakRemedy: "Maintain daily discipline and routines. Feed stray dogs, donate medicines to the needy.",
    },
  },
  {
    key: "7",
    sortOrder: 7,
    content: {
      house: 7,
      title: "7th House (Marriage, Partnerships)",
      themes: "Marriage, business partnerships, contracts, public dealings",
      isMaraka: true,
      ranges: {
        weak: { min: 0, max: 22, text: "Marriage troubles, separations, partnership conflicts" },
        average: { min: 23, max: 28, text: "Best balance for spouse harmony and successful partnerships" },
        strong: { min: 29, max: 56, text: "Excess ego, marital clashes — too much strength in a maraka house is problematic" },
      },
      marakaNote: "This is a maraka house. Best performance in the 22-28 range; higher scores can cause harm.",
      weakRemedy: "Respect your spouse, avoid ego conflicts. Worship Lord Shiva-Parvati for harmony.",
    },
  },
  {
    key: "8",
    sortOrder: 8,
    content: {
      house: 8,
      title: "8th House (Longevity, Sudden Events, Inheritance)",
      themes: "Longevity, sudden upheaval, inheritance, mysticism, occult",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Health crises, sudden shocks, vulnerability to upheaval" },
        average: { min: 23, max: 28, text: "Manageable ups and downs, moderate resilience" },
        strong: { min: 29, max: 56, text: "Strong resilience, deep interest in mysticism and occult sciences" },
      },
      weakRemedy: "Avoid risky speculative activities. Recite the Mahamrityunjaya Mantra for protection.",
    },
  },
  {
    key: "9",
    sortOrder: 9,
    content: {
      house: 9,
      title: "9th House (Luck, Dharma, Higher Knowledge)",
      themes: "Luck, dharma, father, guru, pilgrimage, long journeys",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Bad luck, lack of opportunities, missed blessings" },
        average: { min: 23, max: 28, text: "Stable fortune and steady opportunity flow" },
        strong: { min: 29, max: 56, text: "Strong dharma, guru blessings, success in higher education" },
      },
      weakRemedy: "Serve gurus and teachers. Visit temples on Thursdays. Practice dharmic living.",
    },
  },
  {
    key: "10",
    sortOrder: 10,
    content: {
      house: 10,
      title: "10th House (Career, Profession, Karma)",
      themes: "Profession, public status, authority, karma in action",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Job instability, lack of recognition, career obstacles" },
        average: { min: 23, max: 28, text: "Average career stability and progress" },
        strong: { min: 29, max: 56, text: "Excellent profession, leadership roles, strong public reputation" },
      },
      weakRemedy: "Practice ethics at work. Perform Surya Arghya (offering water to the Sun) daily at sunrise.",
    },
  },
  {
    key: "11",
    sortOrder: 11,
    content: {
      house: 11,
      title: "11th House (Gains, Networks, Desires)",
      themes: "Income streams, networks, fulfilled desires, elder siblings",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Financial struggles, poor networks, unfulfilled desires" },
        average: { min: 23, max: 28, text: "Manageable income and adequate network support" },
        strong: { min: 29, max: 56, text: "Strong gains, fulfilled desires, robust income streams" },
      },
      weakRemedy: "Network with honest people. Donate to orphanages or children's charities.",
    },
  },
  {
    key: "12",
    sortOrder: 12,
    content: {
      house: 12,
      title: "12th House (Expenses, Foreign, Spirituality)",
      themes: "Expenses, foreign lands, spirituality, losses, isolation, sleep",
      isMaraka: false,
      ranges: {
        weak: { min: 0, max: 22, text: "Controlled expenses, genuine savings capacity, inner focus" },
        average: { min: 23, max: 28, text: "Manageable expense outflow, normal spiritual life" },
        strong: { min: 29, max: 56, text: "Losses, wastage, excessive spending, over-involvement in escapist pursuits" },
      },
      weakRemedy: "Track your spending carefully. Avoid addictions. Donate blankets and footwear to the poor.",
    },
  },
];

interface TrikonaRuleContent {
  name: string;
  houses: number[];
  meaning: string;
  description: string;
  strongThreshold: number;
}

const TRIKONA_RULES: { key: string; sortOrder: number; content: TrikonaRuleContent }[] = [
  {
    key: "dharma",
    sortOrder: 1,
    content: {
      name: "Dharma",
      houses: [1, 5, 9],
      meaning: "Spirituality, faith, righteousness, life purpose",
      description: "When this pillar is strong, the native lives an aligned, purposeful life rooted in higher values.",
      strongThreshold: 28,
    },
  },
  {
    key: "artha",
    sortOrder: 2,
    content: {
      name: "Artha",
      houses: [2, 6, 10],
      meaning: "Wealth, profession, material security",
      description: "Strong Artha pillar indicates capacity to accumulate and sustain material resources.",
      strongThreshold: 28,
    },
  },
  {
    key: "kama",
    sortOrder: 3,
    content: {
      name: "Kama",
      houses: [3, 7, 11],
      meaning: "Desire fulfilment, relationships, pleasures",
      description: "Strong Kama pillar supports fulfilled relationships, social pleasures, and desire achievement.",
      strongThreshold: 28,
    },
  },
  {
    key: "moksha",
    sortOrder: 4,
    content: {
      name: "Moksha",
      houses: [4, 8, 12],
      meaning: "Inner peace, detachment, spiritual liberation",
      description: "Strong Moksha pillar indicates capacity for introspection, transformation, and spiritual freedom.",
      strongThreshold: 28,
    },
  },
];

interface ComparisonRuleContent {
  title: string;
  themes: string;
  houseA: number;
  houseB: number;
  aOverB: string;    // text when A > B
  bOverA: string;    // text when B > A
  equal?: string;    // text when equal
}

const COMPARISON_RULES: { key: string; sortOrder: number; content: ComparisonRuleContent }[] = [
  {
    key: "career_path",
    sortOrder: 1,
    content: {
      title: "Career Path: Job vs Business",
      themes: "11th (gains) vs 10th (profession)",
      houseA: 11,
      houseB: 10,
      aOverB:
        "11th > 10th: Business is viable and potentially more rewarding than a job. The gains house is stronger than the profession house — independent ventures align with your chart's income flow.",
      bOverA:
        "10th \u2265 11th: A structured job/employment path is recommended. The profession house dominates, suggesting career growth through institutional roles rather than entrepreneurship.",
    },
  },
  {
    key: "effort_vs_luck",
    sortOrder: 2,
    content: {
      title: "Effort vs Fortune",
      themes: "10th (karma) vs 9th (luck)",
      houseA: 10,
      houseB: 9,
      aOverB:
        "10th > 9th: Hard-working success. Results come through disciplined effort. Reliance on planning and execution works better than waiting for opportunities.",
      bOverA:
        "9th \u2265 10th: Over-reliance on luck is a risk. Fortune may flow, but complacency is the shadow side — pair it with deliberate effort to consolidate gains.",
    },
  },
  {
    key: "savings_vs_expenses",
    sortOrder: 3,
    content: {
      title: "Financial Stability",
      themes: "2nd (wealth) vs 12th (expenses)",
      houseA: 2,
      houseB: 12,
      aOverB:
        "2nd > 12th: Savings capacity and accumulation tendency. Money tends to stay and compound — natural disposition toward financial stability.",
      bOverA:
        "12th \u2265 2nd: Expense-prone, dissipation risk. Money flows out faster than it comes in — deliberate budgeting and automatic savings are needed to counter the natal tendency.",
    },
  },
];

async function main() {
  console.log("Seeding Sarvashtakavarga interpretation rules...");

  let count = 0;
  for (const rule of HOUSE_RULES) {
    await prisma.sarvashtakvargaRule.upsert({
      where: { category_ruleKey: { category: "house", ruleKey: rule.key } },
      create: {
        category: "house",
        ruleKey: rule.key,
        sortOrder: rule.sortOrder,
        content: rule.content as unknown as object,
      },
      update: { content: rule.content as unknown as object, sortOrder: rule.sortOrder },
    });
    count++;
  }
  console.log(`  ${count} house rules`);

  count = 0;
  for (const rule of TRIKONA_RULES) {
    await prisma.sarvashtakvargaRule.upsert({
      where: { category_ruleKey: { category: "trikona", ruleKey: rule.key } },
      create: {
        category: "trikona",
        ruleKey: rule.key,
        sortOrder: rule.sortOrder,
        content: rule.content as unknown as object,
      },
      update: { content: rule.content as unknown as object, sortOrder: rule.sortOrder },
    });
    count++;
  }
  console.log(`  ${count} trikona rules`);

  count = 0;
  for (const rule of COMPARISON_RULES) {
    await prisma.sarvashtakvargaRule.upsert({
      where: { category_ruleKey: { category: "comparison", ruleKey: rule.key } },
      create: {
        category: "comparison",
        ruleKey: rule.key,
        sortOrder: rule.sortOrder,
        content: rule.content as unknown as object,
      },
      update: { content: rule.content as unknown as object, sortOrder: rule.sortOrder },
    });
    count++;
  }
  console.log(`  ${count} comparison rules`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
