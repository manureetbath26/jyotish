/**
 * Seed script: populates the Interpretation table with Jaimini Yoga definitions.
 *
 * Run:  npx tsx prisma/seed-jaimini-yogas.ts
 *
 * Categories:
 *   jaimini_yoga         — 10 rows (key1 = yoga id, key2 = null)
 *   jaimini_yoga_special — 7 rows  (key1 = note id, key2 = null)
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
console.log("Connecting to:", url.replace(/:[^:@]+@/, ":****@"));

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

// ────────────────────────────────────────────────────────────────────────────
// DATA — Jaimini Rajayogas (10 main combinations)
// ────────────────────────────────────────────────────────────────────────────

const JAIMINI_YOGAS = [
  {
    key1: "yoga_1",
    content: {
      yoga_number: 1,
      name: "Atmakaraka–Amatyakaraka Rajayoga",
      entity1: "AK",
      entity2: "AmK",
      condition: "together_or_aspecting",
      group: "primary",
      description: "Atmakaraka and Amatyakaraka together or aspecting each other.",
      interpretation: "The soul significator and career significator are connected. This is a powerful Rajayoga indicating that the native's career and public life will be aligned with their soul purpose. The native is likely to rise to a position of authority and recognition through their professional endeavors.",
    },
  },
  {
    key1: "yoga_2",
    content: {
      yoga_number: 2,
      name: "Atmakaraka–Putrakaraka Rajayoga",
      entity1: "AK",
      entity2: "PK",
      condition: "together_or_aspecting",
      group: "primary",
      description: "Atmakaraka and Putrakaraka together or aspecting each other.",
      interpretation: "The soul significator connects with the significator of children, creativity and merit. This yoga brings blessings through progeny, creative talents, and past-life merit (Purva Punya). The native gains power and position through intellectual and creative pursuits.",
    },
  },
  {
    key1: "yoga_3",
    content: {
      yoga_number: 3,
      name: "Atmakaraka–Fifth Lord Rajayoga",
      entity1: "AK",
      entity2: "5L",
      condition: "together_or_aspecting",
      group: "primary",
      description: "Atmakaraka and Fifth lord together or aspecting each other.",
      interpretation: "The soul significator connects with the lord of the fifth house of intelligence, creativity and Purva Punya. This yoga bestows wisdom, strong judgment, and the ability to wield power effectively. The native gains authority through intelligence and strategic thinking.",
    },
  },
  {
    key1: "yoga_4",
    content: {
      yoga_number: 4,
      name: "Atmakaraka–Darakaraka Rajayoga",
      entity1: "AK",
      entity2: "DK",
      condition: "together_or_aspecting",
      group: "primary",
      description: "Atmakaraka and Darakaraka together or aspecting each other.",
      interpretation: "The soul significator connects with the spouse significator. This is a Rajayoga that brings rise in life through marriage or partnership. The spouse plays a significant role in the native's success and attainment of position in life.",
    },
  },
  {
    key1: "yoga_5",
    content: {
      yoga_number: 5,
      name: "Amatyakaraka–Putrakaraka Rajayoga",
      entity1: "AmK",
      entity2: "PK",
      condition: "together_or_aspecting",
      group: "secondary",
      description: "Amatyakaraka and Putrakaraka together or aspecting each other.",
      interpretation: "The career significator connects with the significator of children and creativity. This yoga indicates success in career through creative talents, children, or advisory roles. The native may excel in education, mentoring, or creative industries.",
    },
  },
  {
    key1: "yoga_6",
    content: {
      yoga_number: 6,
      name: "Amatyakaraka–Fifth Lord Rajayoga",
      entity1: "AmK",
      entity2: "5L",
      condition: "together_or_aspecting",
      group: "secondary",
      description: "Amatyakaraka and Fifth lord together or aspecting each other.",
      interpretation: "The career significator connects with the fifth house lord. This yoga brings professional success through intelligence, speculative gains, and advisory capacities. The native is likely to hold important positions in government, politics, or advisory councils.",
    },
  },
  {
    key1: "yoga_7",
    content: {
      yoga_number: 7,
      name: "Amatyakaraka–Darakaraka Rajayoga",
      entity1: "AmK",
      entity2: "DK",
      condition: "together_or_aspecting",
      group: "secondary",
      description: "Amatyakaraka and Darakaraka together or aspecting each other.",
      interpretation: "The career significator connects with the spouse significator. This yoga indicates that the spouse or business partners play a key role in the native's career advancement. Success comes through collaborations and partnerships.",
    },
  },
  {
    key1: "yoga_8",
    content: {
      yoga_number: 8,
      name: "Putrakaraka–Fifth Lord Rajayoga",
      entity1: "PK",
      entity2: "5L",
      condition: "together_or_aspecting",
      group: "tertiary",
      description: "Putrakaraka and Fifth lord together or aspecting each other.",
      interpretation: "The children/creativity significator connects with the fifth house lord. This is a strong yoga for progeny, creativity, and scholarly pursuits. The native is blessed with intelligent children and gains recognition through creative or intellectual achievements.",
    },
  },
  {
    key1: "yoga_9",
    content: {
      yoga_number: 9,
      name: "Putrakaraka–Darakaraka Rajayoga",
      entity1: "PK",
      entity2: "DK",
      condition: "together_or_aspecting",
      group: "tertiary",
      description: "Putrakaraka and Darakaraka together or aspecting each other.",
      interpretation: "The children significator connects with the spouse significator. This yoga indicates harmony between spouse and children, and benefits through both. The native may gain socially through family connections and creative partnerships.",
    },
  },
  {
    key1: "yoga_10",
    content: {
      yoga_number: 10,
      name: "Fifth Lord–Darakaraka Rajayoga",
      entity1: "5L",
      entity2: "DK",
      condition: "together_and_aspecting",
      group: "tertiary",
      description: "Fifth lord and Darakaraka together and aspecting each other.",
      interpretation: "The fifth house lord connects with the spouse significator. This yoga brings fortune through marriage, with the spouse contributing to the native's intellectual growth and creative success. Benefits through speculative ventures aided by the partner.",
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// DATA — Special Notes (7 additional rules)
// ────────────────────────────────────────────────────────────────────────────

const SPECIAL_NOTES = [
  {
    key1: "special_1",
    content: {
      note_number: 1,
      name: "Moon–Venus Rajayoga",
      check_type: "moon_venus_conjunction_or_aspect",
      description: "The Moon and Venus together or the Moon aspected by Venus is a Rajayoga.",
      interpretation: "Moon and Venus connection creates a powerful Rajayoga bringing wealth, comfort, luxury, and artistic abilities. The native enjoys a refined lifestyle and gains through creative and aesthetic pursuits.",
    },
  },
  {
    key1: "special_2",
    content: {
      note_number: 2,
      name: "Moon Multi-Aspect Rajayoga",
      check_type: "moon_multi_aspected",
      description: "If the Moon is aspected by many planets, it is an excellent Rajayoga.",
      interpretation: "The Moon receiving aspects from multiple planets creates an excellent Rajayoga. The more planets aspecting the Moon, the stronger this yoga becomes. The native gains widespread support and recognition.",
    },
  },
  {
    key1: "special_3",
    content: {
      note_number: 3,
      name: "Navamsha Rajayoga Confirmation",
      check_type: "navamsha_confirmation",
      description: "Check the same Rajayogas in the Navamsha chart to examine if they are confirmed, strengthened, or weakened.",
      interpretation: "Rajayogas present in both the birth chart and Navamsha are powerfully confirmed. More yogas in Navamsha strengthen the promise; fewer or weaker yogas in Navamsha reduce the results.",
    },
  },
  {
    key1: "special_4",
    content: {
      note_number: 4,
      name: "Amatyakaraka Well-Placed",
      check_type: "amk_well_placed",
      description: "If the Amatyakaraka is placed in kendras or trikonas from the Atmakaraka or in the eleventh house in the birth horoscope or in the Navamsha, good positions in life are attained with less struggle.",
      interpretation: "When the Amatyakaraka occupies a kendra (1,4,7,10) or trikona (1,5,9) or the 11th house from the Atmakaraka, career success comes with relative ease. The native rises to good positions without excessive struggle.",
    },
  },
  {
    key1: "special_5",
    content: {
      note_number: 5,
      name: "Atmakaraka–Amatyakaraka Difficult Placement",
      check_type: "ak_amk_difficult",
      description: "If the Atmakaraka and the Amatyakaraka are placed in the 6th, 8th or 12th positions from each other in the birth horoscope or in the Navamsha, there will be struggles in attaining positions.",
      interpretation: "When the Atmakaraka and Amatyakaraka are in dusthana positions (6th, 8th, or 12th) from each other, the native faces significant struggles and obstacles in their career and rise to power. Success comes only after overcoming hardships.",
    },
  },
  {
    key1: "special_6",
    content: {
      note_number: 6,
      name: "Afflicted Karakas",
      check_type: "afflicted_karakas",
      description: "See if any karakas are afflicted. They will create trouble.",
      interpretation: "Karakas that are afflicted by malefic planets (Saturn, Mars, Rahu, Ketu) through conjunction or aspect will face difficulties in their respective signification areas. The promises of that karaka will be obstructed or delayed.",
    },
  },
  {
    key1: "special_7",
    content: {
      note_number: 7,
      name: "Benefic Aspects on Karakas",
      check_type: "benefic_aspects",
      description: "If the karakas are aspected by benefics, their promises increase beneficially.",
      interpretation: "Karakas receiving aspects from natural benefics (Jupiter, Venus, Mercury, Moon) have their positive significations enhanced. The promises of that karaka will manifest more easily and with greater abundance.",
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SEED EXECUTION
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n--- Seeding Jaimini Yoga definitions ---\n");

  let upserted = 0;

  // Seed main yogas
  for (const yoga of JAIMINI_YOGAS) {
    await prisma.interpretation.upsert({
      where: {
        category_key1_key2: {
          category: "jaimini_yoga",
          key1: yoga.key1,
          key2: "",
        },
      },
      update: { content: yoga.content },
      create: {
        category: "jaimini_yoga",
        key1: yoga.key1,
        key2: "",
        content: yoga.content,
      },
    });
    upserted++;
  }
  console.log(`  jaimini_yoga: ${upserted} rows upserted`);

  // Seed special notes
  let specialCount = 0;
  for (const note of SPECIAL_NOTES) {
    await prisma.interpretation.upsert({
      where: {
        category_key1_key2: {
          category: "jaimini_yoga_special",
          key1: note.key1,
          key2: "",
        },
      },
      update: { content: note.content },
      create: {
        category: "jaimini_yoga_special",
        key1: note.key1,
        key2: "",
        content: note.content,
      },
    });
    specialCount++;
  }
  console.log(`  jaimini_yoga_special: ${specialCount} rows upserted`);

  console.log(`\nTotal: ${upserted + specialCount} rows seeded.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
