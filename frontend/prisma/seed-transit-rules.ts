/**
 * Seed: transit interpretation rules.
 *
 * Populates the 8 rule tables that drive the transit ingress composer.
 * Idempotent — uses upsert. Safe to re-run after edits.
 *
 * Run:  npx tsx prisma/seed-transit-rules.ts
 *
 * Sources for the data:
 *   - PlanetVibe / PlanetFavorableHouse: ported from current
 *     backend/services/transit.py constants (single source of truth migration)
 *   - PlanetAreaInterpretation: ported from PLANET_FAVORABLE_MEANINGS +
 *     PLANET_UNFAVORABLE_MEANINGS in transit.py
 *   - HouseClassification / BhavatBhavam / PlanetSpecialAspect /
 *     LifeAreaHouseRelevance / LifeAreaKaraka: synthesised from BPHS,
 *     Phaladeepika, Sanjay Rath SJC materials, James Kelleher Path of Light.
 *     See chat session for full reference list.
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
// PLANET VIBE — flavour text per (planet, polarity)
// ────────────────────────────────────────────────────────────────────────────
const PLANET_VIBE: Record<string, { positive: string; cautious: string }> = {
  Sun: {
    positive: "confidence, recognition, clarity of purpose",
    cautious: "ego friction, clashes with authority",
  },
  Moon: {
    positive: "emotional openness, comfort, social warmth",
    cautious: "mood volatility, over-sensitivity",
  },
  Mars: {
    positive: "drive, decisive action, courage",
    cautious: "impatience, conflict, accidents",
  },
  Mercury: {
    positive: "sharp thinking, communication, deals",
    cautious: "over-analysis, miscommunication",
  },
  Jupiter: {
    positive: "expansion, grace, opportunities, wisdom",
    cautious: "overconfidence, over-committing, weight",
  },
  Venus: {
    positive: "harmony, partnerships, artistic flow",
    cautious: "indulgence, relationship drama",
  },
  Saturn: {
    positive: "discipline, structure, slow compounding progress",
    cautious: "delays, fatigue, heavy responsibility",
  },
  Rahu: {
    positive: "unexpected openings, unusual gains, innovation",
    cautious: "confusion, distraction, inflated promises",
  },
  Ketu: {
    positive: "insight, detachment, spiritual clarity",
    cautious: "withdrawal, loss of interest, isolation",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// HOUSE CLASSIFICATION — multi-label tags per house
// ────────────────────────────────────────────────────────────────────────────
const HOUSE_CLASSIFICATIONS: { house: number; tag: string; notes?: string }[] = [
  // Kendra (angular)
  { house: 1, tag: "kendra", notes: "lagna" },
  { house: 4, tag: "kendra" },
  { house: 7, tag: "kendra" },
  { house: 10, tag: "kendra" },
  // Trikona (trine)
  { house: 1, tag: "trikona" },
  { house: 5, tag: "trikona" },
  { house: 9, tag: "trikona" },
  // Dusthana (difficult)
  { house: 6, tag: "dusthana" },
  { house: 8, tag: "dusthana" },
  { house: 12, tag: "dusthana" },
  // Upachaya (growing)
  { house: 3, tag: "upachaya" },
  { house: 6, tag: "upachaya" },
  { house: 10, tag: "upachaya" },
  { house: 11, tag: "upachaya" },
  // Maraka (death-inflicting)
  { house: 2, tag: "maraka" },
  { house: 7, tag: "maraka" },
  // Panapara (succedent)
  { house: 2, tag: "panapara" },
  { house: 5, tag: "panapara" },
  { house: 8, tag: "panapara" },
  { house: 11, tag: "panapara" },
  // Apoklima (cadent)
  { house: 3, tag: "apoklima" },
  { house: 6, tag: "apoklima" },
  { house: 9, tag: "apoklima" },
  { house: 12, tag: "apoklima" },
];

// ────────────────────────────────────────────────────────────────────────────
// BHAVAT BHAVAM — house-from-house lookups (BPHS Ch. 7)
// ────────────────────────────────────────────────────────────────────────────
const BHAVAT_BHAVAM: { fromHouse: number; toHouse: number; label: string }[] = [
  { fromHouse: 1, toHouse: 1, label: "1st-from-1st = self" },
  { fromHouse: 2, toHouse: 3, label: "2nd-from-2nd = secondary income, hands-on earning" },
  { fromHouse: 3, toHouse: 5, label: "3rd-from-3rd = creative expression of effort" },
  { fromHouse: 4, toHouse: 7, label: "4th-from-4th = end-state of happiness, vehicles, real estate dealings" },
  { fromHouse: 5, toHouse: 9, label: "5th-from-5th = grandchildren, deeper purva-punya, dharma fruit" },
  { fromHouse: 6, toHouse: 11, label: "6th-from-6th = resolution of debts, gain from enemies" },
  { fromHouse: 7, toHouse: 1, label: "7th-from-7th = self in partnership" },
  { fromHouse: 8, toHouse: 3, label: "8th-from-8th = inheritance through effort" },
  { fromHouse: 9, toHouse: 5, label: "9th-from-9th = guru's grace, dharmic fruit" },
  { fromHouse: 10, toHouse: 7, label: "10th-from-10th = career via partnerships, business, public dealings" },
  { fromHouse: 11, toHouse: 9, label: "11th-from-11th = ultimate gain via dharma / fortune" },
  { fromHouse: 12, toHouse: 11, label: "12th-from-12th = expense becomes investment / gain" },
];

// ────────────────────────────────────────────────────────────────────────────
// PLANET SPECIAL ASPECTS — beyond the universal 7th
//   Mars: 4, 8     |  Jupiter: 5, 9     |  Saturn: 3, 10
//   Rahu/Ketu: 5, 9 (Rath school; SJC materials)
//   Sun, Moon, Mercury, Venus: only the universal 7th (no rows)
// ────────────────────────────────────────────────────────────────────────────
const PLANET_SPECIAL_ASPECTS: { planet: string; aspectOffset: number; strength?: number }[] = [
  // Mars
  { planet: "Mars", aspectOffset: 4 },
  { planet: "Mars", aspectOffset: 7 },
  { planet: "Mars", aspectOffset: 8 },
  // Jupiter
  { planet: "Jupiter", aspectOffset: 5 },
  { planet: "Jupiter", aspectOffset: 7 },
  { planet: "Jupiter", aspectOffset: 9 },
  // Saturn
  { planet: "Saturn", aspectOffset: 3 },
  { planet: "Saturn", aspectOffset: 7 },
  { planet: "Saturn", aspectOffset: 10 },
  // Rahu / Ketu (Rath school)
  { planet: "Rahu", aspectOffset: 5 },
  { planet: "Rahu", aspectOffset: 7 },
  { planet: "Rahu", aspectOffset: 9 },
  { planet: "Ketu", aspectOffset: 5 },
  { planet: "Ketu", aspectOffset: 7 },
  { planet: "Ketu", aspectOffset: 9 },
  // Sun, Moon, Mercury, Venus — only universal 7th
  { planet: "Sun", aspectOffset: 7 },
  { planet: "Moon", aspectOffset: 7 },
  { planet: "Mercury", aspectOffset: 7 },
  { planet: "Venus", aspectOffset: 7 },
];

// ────────────────────────────────────────────────────────────────────────────
// LIFE AREA HOUSE RELEVANCE — weighted house map per area
// Weights: 1.0 = primary, 0.7 = secondary, 0.4 = tertiary
// Sourced from research framework (BPHS bhava karakatva + Kelleher synthesis)
// ────────────────────────────────────────────────────────────────────────────
const LIFE_AREA_HOUSE_RELEVANCE: {
  lifeArea: string;
  house: number;
  weight: number;
  rationale: string;
}[] = [
  // Career
  { lifeArea: "career", house: 10, weight: 1.0, rationale: "karma-sthana, public role and authority — primary" },
  { lifeArea: "career", house: 6, weight: 0.7, rationale: "service, daily work, subordinates, debts overcome" },
  { lifeArea: "career", house: 7, weight: 0.7, rationale: "10th-from-10th — business, clients, partnerships" },
  { lifeArea: "career", house: 11, weight: 0.7, rationale: "labha-sthana — gains, promotions, networks" },
  { lifeArea: "career", house: 2, weight: 0.4, rationale: "income from profession, kutumba" },
  { lifeArea: "career", house: 1, weight: 0.4, rationale: "self projecting into work" },

  // Love / Relationships
  { lifeArea: "love_life", house: 7, weight: 1.0, rationale: "yuvati-sthana, spouse and partners — primary" },
  { lifeArea: "love_life", house: 5, weight: 0.7, rationale: "putra-sthana, romance and courtship" },
  { lifeArea: "love_life", house: 11, weight: 0.7, rationale: "fulfillment of desire, friends, social bonds" },
  { lifeArea: "love_life", house: 12, weight: 0.4, rationale: "bed pleasures, intimacy, hidden affections" },
  { lifeArea: "love_life", house: 2, weight: 0.4, rationale: "kutumba — marriage as family extension" },

  // Health
  { lifeArea: "health", house: 1, weight: 1.0, rationale: "tanu-bhava, body and vitality — primary" },
  { lifeArea: "health", house: 6, weight: 0.7, rationale: "ari-sthana — disease, recovery, daily fitness" },
  { lifeArea: "health", house: 8, weight: 0.7, rationale: "ayur-sthana — chronic, longevity, sudden ailments" },
  { lifeArea: "health", house: 12, weight: 0.4, rationale: "vyaya — hospitalisation, sleep, vitality losses" },
  { lifeArea: "health", house: 3, weight: 0.4, rationale: "parakrama — vital strength" },

  // Finances
  { lifeArea: "finances", house: 11, weight: 1.0, rationale: "labha — income, cashflow — primary" },
  { lifeArea: "finances", house: 2, weight: 1.0, rationale: "dhana — accumulated wealth — primary" },
  { lifeArea: "finances", house: 5, weight: 0.7, rationale: "purva-punya, speculation, investments" },
  { lifeArea: "finances", house: 9, weight: 0.7, rationale: "bhagya — fortune and luck" },
  { lifeArea: "finances", house: 8, weight: 0.4, rationale: "joint resources, inheritance, insurance" },
  { lifeArea: "finances", house: 6, weight: 0.4, rationale: "loans, debts — afflicting" },

  // Family
  { lifeArea: "family", house: 4, weight: 1.0, rationale: "sukha-sthana — mother, home — primary" },
  { lifeArea: "family", house: 2, weight: 0.7, rationale: "kutumba — immediate family" },
  { lifeArea: "family", house: 9, weight: 0.7, rationale: "father, ancestors" },
  { lifeArea: "family", house: 3, weight: 0.4, rationale: "siblings" },
  { lifeArea: "family", house: 5, weight: 0.4, rationale: "children" },
  { lifeArea: "family", house: 7, weight: 0.4, rationale: "in-laws, partner's family" },

  // Self-confidence
  { lifeArea: "self_confidence", house: 1, weight: 1.0, rationale: "tanu — identity, projection — primary" },
  { lifeArea: "self_confidence", house: 3, weight: 1.0, rationale: "parakrama — courage, assertiveness — primary" },
  { lifeArea: "self_confidence", house: 5, weight: 0.7, rationale: "purva-punya — intelligence and creative confidence" },
  { lifeArea: "self_confidence", house: 9, weight: 0.7, rationale: "dharma — conviction, faith" },
  { lifeArea: "self_confidence", house: 11, weight: 0.4, rationale: "fulfillment of ambition" },
];

// ────────────────────────────────────────────────────────────────────────────
// LIFE AREA KARAKAS — ported from LIFE_AREA_RULES.karakas in transit.py
// ────────────────────────────────────────────────────────────────────────────
const LIFE_AREA_KARAKAS: {
  lifeArea: string;
  planet: string;
  weight: number;
  rationale: string;
}[] = [
  // Career
  { lifeArea: "career", planet: "Sun", weight: 1.0, rationale: "authority, status, public recognition" },
  { lifeArea: "career", planet: "Saturn", weight: 1.0, rationale: "work, labour, discipline, longevity in role" },
  { lifeArea: "career", planet: "Mercury", weight: 0.7, rationale: "commerce, communication, contracts" },
  { lifeArea: "career", planet: "Jupiter", weight: 0.7, rationale: "advisory, teaching, strategy, growth" },

  // Love
  { lifeArea: "love_life", planet: "Venus", weight: 1.0, rationale: "primary love and partnership karaka" },
  { lifeArea: "love_life", planet: "Moon", weight: 0.7, rationale: "emotional bonding" },
  { lifeArea: "love_life", planet: "Jupiter", weight: 0.7, rationale: "marriage karaka for women's charts; blessings" },

  // Health
  { lifeArea: "health", planet: "Sun", weight: 1.0, rationale: "vitality, immunity" },
  { lifeArea: "health", planet: "Moon", weight: 0.7, rationale: "mind, fluids, mental health" },
  { lifeArea: "health", planet: "Mars", weight: 0.7, rationale: "blood, energy, accidents" },

  // Finances
  { lifeArea: "finances", planet: "Jupiter", weight: 1.0, rationale: "primary wealth karaka" },
  { lifeArea: "finances", planet: "Venus", weight: 0.7, rationale: "luxury, comforts, value" },
  { lifeArea: "finances", planet: "Mercury", weight: 0.7, rationale: "transactions, trade, accounting" },

  // Family
  { lifeArea: "family", planet: "Moon", weight: 1.0, rationale: "mother karaka" },
  { lifeArea: "family", planet: "Jupiter", weight: 0.7, rationale: "father karaka, family wisdom" },
  { lifeArea: "family", planet: "Venus", weight: 0.7, rationale: "harmony in home" },
  { lifeArea: "family", planet: "Mercury", weight: 0.4, rationale: "siblings karaka" },

  // Self-confidence
  { lifeArea: "self_confidence", planet: "Sun", weight: 1.0, rationale: "ahamkara — sense of self" },
  { lifeArea: "self_confidence", planet: "Mars", weight: 1.0, rationale: "courage karaka — direct assertiveness" },
  { lifeArea: "self_confidence", planet: "Jupiter", weight: 0.7, rationale: "wisdom and inner authority" },
];

// ────────────────────────────────────────────────────────────────────────────
// PLANET FAVORABLE HOUSES — classical gochara (Phaladeepika / BPHS Ch. 41-46)
// Ported from CLASSICAL_FAVORABLE_HOUSES in transit.py
// ────────────────────────────────────────────────────────────────────────────
const PLANET_FAVORABLE_HOUSES: Record<string, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 10, 11],
  Mars: [3, 6, 10, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 10, 11],
  Ketu: [3, 6, 11], // Rath school treats Ketu similarly to Saturn for transit
};

// ────────────────────────────────────────────────────────────────────────────
// PLANET-AREA INTERPRETATION TEXTS — ported from PLANET_*_MEANINGS in transit.py
// One row per (planet, area, polarity). The text is the area-lens sentence
// the composer appends to the house+vibe lead.
// ────────────────────────────────────────────────────────────────────────────
const PLANET_AREA_INTERPRETATIONS: {
  planet: string;
  lifeArea: string;
  polarity: string;
  text: string;
}[] = [
  // ── Favorable ──
  // Sun
  { planet: "Sun", lifeArea: "love_life", polarity: "favorable", text: "Sun boosts your charisma and confidence in relationships. Your natural magnetism draws admiration." },
  { planet: "Sun", lifeArea: "health", polarity: "favorable", text: "Sun strengthens vitality and immunity. Energy levels are high; an excellent time to start health routines." },
  { planet: "Sun", lifeArea: "career", polarity: "favorable", text: "Sun illuminates your professional reputation. Authority figures notice your work; recognition and promotion are likely." },
  { planet: "Sun", lifeArea: "finances", polarity: "favorable", text: "Sun supports steady income and government-related financial gains. Father or authority figures may assist." },
  { planet: "Sun", lifeArea: "family", polarity: "favorable", text: "Sun energises family leadership and paternal bonds. Father figures and elders offer support." },
  { planet: "Sun", lifeArea: "self_confidence", polarity: "favorable", text: "Sun is the natural significator of self and confidence. This is one of the best periods for personal empowerment, leadership, and asserting your identity." },
  // Moon
  { planet: "Moon", lifeArea: "love_life", polarity: "favorable", text: "Moon heightens emotional sensitivity and romantic intuition. Deep emotional bonding is possible." },
  { planet: "Moon", lifeArea: "health", polarity: "favorable", text: "Moon stabilises mental wellbeing. Sleep improves and emotional stress reduces significantly." },
  { planet: "Moon", lifeArea: "career", polarity: "favorable", text: "Moon favours careers involving the public, hospitality, or nurturing roles. Popularity rises." },
  { planet: "Moon", lifeArea: "finances", polarity: "favorable", text: "Moon supports gains through public dealings, real estate, or maternal inheritance." },
  { planet: "Moon", lifeArea: "family", polarity: "favorable", text: "Moon strengthens bonds with mother and female family members. Home atmosphere becomes nurturing." },
  { planet: "Moon", lifeArea: "self_confidence", polarity: "favorable", text: "Moon brings emotional stability and inner peace. Self-awareness deepens and intuition guides confident decision-making." },
  // Mars
  { planet: "Mars", lifeArea: "love_life", polarity: "favorable", text: "Mars adds passion and drive to romantic pursuits. Physical chemistry is heightened." },
  { planet: "Mars", lifeArea: "health", polarity: "favorable", text: "Mars boosts physical strength and stamina. Good for exercise and recovery." },
  { planet: "Mars", lifeArea: "career", polarity: "favorable", text: "Mars provides competitive energy. Excellent for leadership, sports, engineering, or military roles." },
  { planet: "Mars", lifeArea: "finances", polarity: "favorable", text: "Mars supports bold financial moves and real-estate gains. Courage in investments pays off." },
  { planet: "Mars", lifeArea: "family", polarity: "favorable", text: "Mars energises brothers and siblings. Protective instincts for family are strong." },
  { planet: "Mars", lifeArea: "self_confidence", polarity: "favorable", text: "Mars ignites courage, willpower, and assertiveness. You feel bold, decisive, and ready to take on challenges head-on." },
  // Mercury
  { planet: "Mercury", lifeArea: "love_life", polarity: "favorable", text: "Mercury enhances communication in relationships. Meaningful conversations deepen understanding with partners." },
  { planet: "Mercury", lifeArea: "health", polarity: "favorable", text: "Mercury supports nervous system health. Mental clarity reduces anxiety and stress-related ailments." },
  { planet: "Mercury", lifeArea: "career", polarity: "favorable", text: "Mercury accelerates business, trade, writing, and communication. Contracts and negotiations go smoothly." },
  { planet: "Mercury", lifeArea: "finances", polarity: "favorable", text: "Mercury favours short-term trading, intellectual income, and business deals. Quick financial gains." },
  { planet: "Mercury", lifeArea: "family", polarity: "favorable", text: "Mercury improves communication within the family. Misunderstandings are resolved through dialogue." },
  { planet: "Mercury", lifeArea: "self_confidence", polarity: "favorable", text: "Mercury sharpens intellect and communication skills. You express yourself articulately, boosting self-assurance in social situations." },
  // Jupiter
  { planet: "Jupiter", lifeArea: "love_life", polarity: "favorable", text: "Jupiter expands love and brings blessings in relationships. Marriage, engagement, or new romance is highly favoured." },
  { planet: "Jupiter", lifeArea: "health", polarity: "favorable", text: "Jupiter protects overall health and supports liver and immune function. Recovery from illness is swift." },
  { planet: "Jupiter", lifeArea: "career", polarity: "favorable", text: "Jupiter brings growth, promotions, and expansion of professional opportunities. Teachers or mentors assist." },
  { planet: "Jupiter", lifeArea: "finances", polarity: "favorable", text: "Jupiter is the strongest planet for wealth. Investments, savings, and unexpected financial gains are strongly indicated." },
  { planet: "Jupiter", lifeArea: "family", polarity: "favorable", text: "Jupiter blesses family harmony, children, and wisdom from elders. Religious or spiritual family events are likely." },
  { planet: "Jupiter", lifeArea: "self_confidence", polarity: "favorable", text: "Jupiter expands wisdom, optimism, and self-belief. You feel guided by a higher purpose and radiate natural authority and grace." },
  // Venus
  { planet: "Venus", lifeArea: "love_life", polarity: "favorable", text: "Venus is the planet of love — this is one of the best periods for romance, marriage, and deep emotional connection." },
  { planet: "Venus", lifeArea: "health", polarity: "favorable", text: "Venus supports hormonal balance, skin, and reproductive health. Beauty and wellbeing are enhanced." },
  { planet: "Venus", lifeArea: "career", polarity: "favorable", text: "Venus favours creative fields, fashion, arts, luxury, and diplomacy. Charm opens professional doors." },
  { planet: "Venus", lifeArea: "finances", polarity: "favorable", text: "Venus brings luxury purchases, artistic income, and material comforts. Financial pleasure is indicated." },
  { planet: "Venus", lifeArea: "family", polarity: "favorable", text: "Venus promotes love, peace, and beauty in home life. Relationships with spouse and women in family improve." },
  { planet: "Venus", lifeArea: "self_confidence", polarity: "favorable", text: "Venus enhances personal charm, attractiveness, and social confidence. You feel comfortable in your own skin and draw people towards you." },
  // Saturn
  { planet: "Saturn", lifeArea: "love_life", polarity: "favorable", text: "Saturn brings stable, long-term commitment. While slow, relationships formed now are built to last." },
  { planet: "Saturn", lifeArea: "health", polarity: "favorable", text: "Saturn rewards disciplined health habits. Chronic conditions can be managed through sustained effort." },
  { planet: "Saturn", lifeArea: "career", polarity: "favorable", text: "Saturn rewards hard work with lasting career progress. Long-term projects and structured roles thrive." },
  { planet: "Saturn", lifeArea: "finances", polarity: "favorable", text: "Saturn supports disciplined saving and long-term investments. Frugality now brings future security." },
  { planet: "Saturn", lifeArea: "family", polarity: "favorable", text: "Saturn strengthens family responsibilities and respect for elders. Commitment to family duties is rewarded." },
  { planet: "Saturn", lifeArea: "self_confidence", polarity: "favorable", text: "Saturn builds quiet, earned confidence through discipline and perseverance. Self-worth grows from overcoming real challenges." },
  // Rahu
  { planet: "Rahu", lifeArea: "love_life", polarity: "favorable", text: "Rahu creates unconventional romantic opportunities. Foreign or unusual connections may arise." },
  { planet: "Rahu", lifeArea: "health", polarity: "favorable", text: "Rahu supports alternative or unconventional healing methods. Sudden improvements are possible." },
  { planet: "Rahu", lifeArea: "career", polarity: "favorable", text: "Rahu accelerates ambition and foreign career opportunities. Technology and innovation sectors benefit." },
  { planet: "Rahu", lifeArea: "finances", polarity: "favorable", text: "Rahu can bring sudden, unexpected financial gains through unconventional means." },
  { planet: "Rahu", lifeArea: "family", polarity: "favorable", text: "Rahu may bring in foreign or unconventional family influences. New family connections are possible." },
  { planet: "Rahu", lifeArea: "self_confidence", polarity: "favorable", text: "Rahu amplifies ambition and desire for recognition. You feel driven to break boundaries and reinvent yourself boldly." },

  // ── Unfavorable ── (only the planets that have unfavorable rows in transit.py)
  // Mars unfavorable
  { planet: "Mars", lifeArea: "love_life", polarity: "unfavorable", text: "Mars increases arguments, impatience, and aggression in relationships. Avoid confrontations; anger can damage bonds." },
  { planet: "Mars", lifeArea: "health", polarity: "unfavorable", text: "Mars raises risk of accidents, fevers, inflammation, and injuries. Avoid reckless physical activity." },
  { planet: "Mars", lifeArea: "career", polarity: "unfavorable", text: "Mars creates conflicts with colleagues or superiors. Impulsive decisions can derail progress." },
  { planet: "Mars", lifeArea: "finances", polarity: "unfavorable", text: "Mars risks hasty financial decisions, losses from overconfidence, and unexpected expenses." },
  { planet: "Mars", lifeArea: "family", polarity: "unfavorable", text: "Mars stirs conflicts with brothers and male family members. Heated arguments are likely." },
  { planet: "Mars", lifeArea: "self_confidence", polarity: "unfavorable", text: "Mars creates aggression, recklessness, and false bravado. Impulsive actions may lead to embarrassment or conflict." },
  // Saturn unfavorable
  { planet: "Saturn", lifeArea: "love_life", polarity: "unfavorable", text: "Saturn brings emotional distance, delays in commitment, or lingering coldness. Patience required." },
  { planet: "Saturn", lifeArea: "health", polarity: "unfavorable", text: "Saturn slows recovery and surfaces chronic conditions, fatigue, or joint issues. Rest and structure help." },
  { planet: "Saturn", lifeArea: "career", polarity: "unfavorable", text: "Saturn brings delays, denial of recognition, or heavier workload than reward. Persist; the lesson is endurance." },
  { planet: "Saturn", lifeArea: "finances", polarity: "unfavorable", text: "Saturn restricts cashflow and tightens expenses. Avoid speculation; budget carefully." },
  { planet: "Saturn", lifeArea: "family", polarity: "unfavorable", text: "Saturn introduces emotional distance, responsibility burdens, or strain with elders." },
  { planet: "Saturn", lifeArea: "self_confidence", polarity: "unfavorable", text: "Saturn amplifies self-doubt, isolation, and the weight of past failures. Rebuild slowly through discipline." },
  // Rahu unfavorable
  { planet: "Rahu", lifeArea: "love_life", polarity: "unfavorable", text: "Rahu creates illusion, deception, or sudden upheaval in relationships. Don't act on impulse." },
  { planet: "Rahu", lifeArea: "health", polarity: "unfavorable", text: "Rahu can manifest as obscure or hard-to-diagnose conditions, anxiety, or substance issues." },
  { planet: "Rahu", lifeArea: "career", polarity: "unfavorable", text: "Rahu invites scandal, miscommunication, or chasing inflated promises. Verify before committing." },
  { planet: "Rahu", lifeArea: "finances", polarity: "unfavorable", text: "Rahu risks loss through fraud, gambling, or speculative bubbles. Slow due-diligence beats hype." },
  { planet: "Rahu", lifeArea: "family", polarity: "unfavorable", text: "Rahu causes confusion or unexpected disruptions in family life. Communication helps." },
  { planet: "Rahu", lifeArea: "self_confidence", polarity: "unfavorable", text: "Rahu inflates ego or feeds existential doubt. Ground yourself in reality, not appearances." },
  // Sun unfavorable
  { planet: "Sun", lifeArea: "love_life", polarity: "unfavorable", text: "Sun's pride or rigidity strains relationships. Authority struggles with partner are possible." },
  { planet: "Sun", lifeArea: "health", polarity: "unfavorable", text: "Sun aggravates the heart, eyes, and head. Avoid overexertion in heat." },
  { planet: "Sun", lifeArea: "career", polarity: "unfavorable", text: "Sun risks clashes with bosses or government. Ego friction can stall progress." },
  { planet: "Sun", lifeArea: "finances", polarity: "unfavorable", text: "Sun's transit can drain resources via father, government dues, or status-related spending." },
  { planet: "Sun", lifeArea: "family", polarity: "unfavorable", text: "Sun stirs friction with father or paternal authorities. Pride blocks reconciliation." },
  { planet: "Sun", lifeArea: "self_confidence", polarity: "unfavorable", text: "Sun's harsh side breeds arrogance or wounded pride. Watch for grandstanding that backfires." },
];

// ────────────────────────────────────────────────────────────────────────────
// PLANET-AREA ADVICE — what to actually DO when a planet drives this area
// 9 planets × 6 areas × 2 polarities = 108 advisory phrases
// ────────────────────────────────────────────────────────────────────────────
const PLANET_AREA_ADVICE: { planet: string; lifeArea: string; polarity: string; text: string }[] = (() => {
  const A: Record<string, Record<string, { favorable: string; unfavorable: string }>> = {
    Jupiter: {
      career:          { favorable: "ask for the promotion, send the proposal, accept advisory or teaching roles — say yes to opportunities you've been holding back",
                         unfavorable: "be selective; Jupiter overcommits when challenged — don't take on more than you can deliver" },
      love_life:       { favorable: "good window for engagement, marriage conversations, or deepening commitment",
                         unfavorable: "expansion can mean loss of focus — don't promise what you can't follow through on" },
      health:          { favorable: "use this for healing routines that need patience — diet shifts, longer-term recovery, weight management",
                         unfavorable: "watch overindulgence — liver, weight, blood-sugar themes need attention" },
      finances:        { favorable: "long-term investments, education spending, charitable giving — wealth karaka is supporting growth",
                         unfavorable: "don't overextend; Jupiter's optimism in unfavorable houses can lead to losses" },
      family:          { favorable: "schedule the family gathering, have the difficult conversation, ask elders for guidance",
                         unfavorable: "watch for moralistic friction with family" },
      self_confidence: { favorable: "your wisdom and presence are visible — trust your judgement, lead from values",
                         unfavorable: "watch for preachy or self-righteous moments" },
    },
    Saturn: {
      career:          { favorable: "long-game wins — structured projects, reputation through consistency, slow but durable progress",
                         unfavorable: "delays expected; persist anyway, the structure pays off later" },
      love_life:       { favorable: "stable, slow-build commitment is favored — don't rush",
                         unfavorable: "emotional distance, delays in commitment — patience required" },
      health:          { favorable: "build routines that require discipline — sleep schedule, exercise consistency, dietary structure",
                         unfavorable: "chronic conditions surface — rest and routine help" },
      finances:        { favorable: "disciplined saving and long-term investments win",
                         unfavorable: "tighten spending; avoid speculation" },
      family:          { favorable: "step into elder responsibilities; commitment to family duties is rewarded",
                         unfavorable: "watch for distance or burden with elders" },
      self_confidence: { favorable: "confidence built through hard-won discipline — trust the slow climb",
                         unfavorable: "self-doubt and isolation creep in; rebuild slowly through small wins" },
    },
    Mars: {
      career:          { favorable: "good window for assertive moves — leadership pushes, competitive bids, decisive action",
                         unfavorable: "hold back from confrontation; conflicts with authority risk derailing progress" },
      love_life:       { favorable: "passion, drive — physical chemistry is high",
                         unfavorable: "watch arguments and impatience; avoid confrontations" },
      health:          { favorable: "good for exercise, recovery, stamina-building",
                         unfavorable: "accidents/inflammation risk — avoid reckless physical activity" },
      finances:        { favorable: "bold financial moves and real-estate plays can pay off",
                         unfavorable: "avoid hasty financial decisions and overconfident bets" },
      family:          { favorable: "lean into protective instincts; brothers/siblings benefit",
                         unfavorable: "heated arguments with male family members likely; choose silence" },
      self_confidence: { favorable: "feel bold, decisive, ready to take on challenges",
                         unfavorable: "false bravado and impulsiveness lead to embarrassment — pause before acting" },
    },
    Mercury: {
      career:          { favorable: "trade, writing, communication accelerate — contracts and negotiations go smoothly",
                         unfavorable: "verify details before committing; miscommunication risk" },
      love_life:       { favorable: "meaningful conversations deepen connection",
                         unfavorable: "over-analysing the relationship hurts it" },
      health:          { favorable: "nervous-system supportive — mental clarity reduces anxiety",
                         unfavorable: "anxiety and overthinking surface" },
      finances:        { favorable: "short-term trading and intellectual income flow",
                         unfavorable: "watch for paperwork errors and contract pitfalls" },
      family:          { favorable: "communication resolves misunderstandings",
                         unfavorable: "siblings tension via miscommunication" },
      self_confidence: { favorable: "express yourself articulately — visible mental sharpness",
                         unfavorable: "self-doubt via overthinking; act on instinct sometimes" },
    },
    Venus: {
      career:          { favorable: "creative, fashion, arts, diplomacy favored — charm opens doors",
                         unfavorable: "indulgence distracts from work" },
      love_life:       { favorable: "one of the best windows for romance, marriage, deep connection",
                         unfavorable: "relationship drama and indulgence — pause big decisions" },
      health:          { favorable: "hormonal/skin/reproductive health supported",
                         unfavorable: "indulgence themes — moderate consumption" },
      finances:        { favorable: "luxury purchases and artistic income flow",
                         unfavorable: "overspending on comforts" },
      family:          { favorable: "harmony in home, women in family supported",
                         unfavorable: "domestic tension via comfort/value differences" },
      self_confidence: { favorable: "personal charm and social ease are at a high",
                         unfavorable: "vanity and people-pleasing get in the way" },
    },
    Sun: {
      career:          { favorable: "recognition possible — authority figures notice your work",
                         unfavorable: "ego clashes with bosses; pride blocks progress" },
      love_life:       { favorable: "natural magnetism draws admiration",
                         unfavorable: "pride strains relationships; watch authority struggles" },
      health:          { favorable: "vitality high — start that routine you've been planning",
                         unfavorable: "heart/eye/head themes — avoid overexertion in heat" },
      finances:        { favorable: "steady income; government or authority figures help",
                         unfavorable: "father/government dues or status spending drains resources" },
      family:          { favorable: "father figures support; lead family events",
                         unfavorable: "friction with father or authorities; pride blocks reconciliation" },
      self_confidence: { favorable: "best window for personal empowerment and asserting identity",
                         unfavorable: "watch arrogance and grandstanding" },
    },
    Moon: {
      career:          { favorable: "public-facing roles favored — popularity rises",
                         unfavorable: "emotional volatility affects work" },
      love_life:       { favorable: "deep emotional bonding possible",
                         unfavorable: "moodiness undermines connection" },
      health:          { favorable: "mental wellbeing stabilises; sleep improves",
                         unfavorable: "watch for emotional eating, sleep disruption" },
      finances:        { favorable: "gains via public dealings or maternal source",
                         unfavorable: "emotional spending" },
      family:          { favorable: "mother and female family bonds strengthen",
                         unfavorable: "domestic mood swings" },
      self_confidence: { favorable: "intuition is sharp — trust your gut",
                         unfavorable: "self-image volatile; ground in routine" },
    },
    Rahu: {
      career:          { favorable: "unconventional, foreign, or tech opportunities open — go where others won't",
                         unfavorable: "verify before committing; scandal/miscommunication risk" },
      love_life:       { favorable: "unusual or foreign connections surface",
                         unfavorable: "illusion and deception in relationships — don't act on impulse" },
      health:          { favorable: "alternative healing helps; sudden improvements possible",
                         unfavorable: "hard-to-diagnose conditions or anxiety" },
      finances:        { favorable: "sudden gains via unconventional means possible",
                         unfavorable: "fraud and speculation risk — slow due-diligence beats hype" },
      family:          { favorable: "foreign or unconventional family connections form",
                         unfavorable: "confusion and disruption in family dynamics" },
      self_confidence: { favorable: "ambition surges — push into new territory",
                         unfavorable: "ego inflation or existential doubt — ground in reality" },
    },
    Ketu: {
      career:          { favorable: "research, spiritual, or specialist work serves; detach from politics",
                         unfavorable: "withdrawal and loss of interest — reorient before forcing" },
      love_life:       { favorable: "deeper spiritual bonding possible",
                         unfavorable: "sudden disconnection or detachment" },
      health:          { favorable: "good for cleansing routines, fasts, retreat",
                         unfavorable: "energy drops; rest more" },
      finances:        { favorable: "frugal saving + spiritual giving",
                         unfavorable: "unexplained losses; check accounts" },
      family:          { favorable: "deepening of roots, spiritual family",
                         unfavorable: "withdrawal from family events" },
      self_confidence: { favorable: "clarity through detachment, spiritual insight",
                         unfavorable: "self-doubt via withdrawal" },
    },
  };
  const out: { planet: string; lifeArea: string; polarity: string; text: string }[] = [];
  for (const [planet, areaMap] of Object.entries(A)) {
    for (const [lifeArea, polMap] of Object.entries(areaMap)) {
      out.push({ planet, lifeArea, polarity: "favorable", text: polMap.favorable });
      out.push({ planet, lifeArea, polarity: "unfavorable", text: polMap.unfavorable });
    }
  }
  return out;
})();

// ────────────────────────────────────────────────────────────────────────────
// YOGAKARAKA — single planet ruling kendra+trikona for each lagna
// Invariant per BPHS Ch. 7. Other lagnas have no separate yogakaraka.
// ────────────────────────────────────────────────────────────────────────────
const YOGAKARAKA: Record<string, [string, string]> = {
  Taurus:    ["Saturn", "rules H9 (Cap, trikona) and H10 (Aqu, kendra)"],
  Cancer:    ["Mars",   "rules H5 (Sco, trikona) and H10 (Ari, kendra)"],
  Leo:       ["Mars",   "rules H4 (Sco, kendra) and H9 (Ari, trikona)"],
  Libra:     ["Saturn", "rules H4 (Cap, kendra) and H5 (Aqu, trikona)"],
  Capricorn: ["Venus",  "rules H5 (Tau, trikona) and H10 (Lib, kendra)"],
  Aquarius:  ["Venus",  "rules H4 (Tau, kendra) and H9 (Lib, trikona)"],
};

// ────────────────────────────────────────────────────────────────────────────
// LIFE AREA LABEL — casual prose form for narrative composition
// ────────────────────────────────────────────────────────────────────────────
const LIFE_AREA_LABEL: Record<string, string> = {
  career:          "career",
  love_life:       "love and relationships",
  health:          "health and energy",
  finances:        "money and finances",
  family:          "family",
  self_confidence: "your self-confidence",
};

// ────────────────────────────────────────────────────────────────────────────
// PLANET NATURE — universal benefic / malefic classification (BPHS)
// ────────────────────────────────────────────────────────────────────────────
const PLANET_NATURE: Record<string, string> = {
  Sun: "malefic", Moon: "benefic", Mars: "malefic", Mercury: "benefic",
  Jupiter: "benefic", Venus: "benefic", Saturn: "malefic",
  Rahu: "malefic", Ketu: "malefic",
};

// ────────────────────────────────────────────────────────────────────────────
// RULE SETTINGS — operational tunables (which planets to track for ingress
// events, lookback days per planet for finding "currently here" cards, etc.)
// ────────────────────────────────────────────────────────────────────────────
const RULE_SETTINGS: { key: string; value: object; notes?: string }[] = [
  {
    key: "ingress_tracked_planets",
    value: ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"],
    notes: "Planets we generate ingress + 'currently here' cards for. Slow planets first (display order). Sun/Mercury/Venus too fast for cards (~30d/sign); Moon excluded entirely.",
  },
  {
    key: "lookback_days",
    value: { Mars: 60, Jupiter: 400, Saturn: 1100, Rahu: 600, Ketu: 600 },
    notes: "Per-planet max days to walk backwards from start_date when finding the most recent ingress (slightly bigger than max sign-residency including retrograde loops).",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SEED EXECUTION
// ────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding transit interpretation rules…\n");

  // PlanetVibe
  let n = 0;
  for (const [planet, vibes] of Object.entries(PLANET_VIBE)) {
    for (const polarity of ["positive", "cautious"] as const) {
      await prisma.planetVibe.upsert({
        where: { planet_polarity: { planet, polarity } },
        create: { planet, polarity, text: vibes[polarity] },
        update: { text: vibes[polarity] },
      });
      n++;
    }
  }
  console.log(`  PlanetVibe: ${n} rows`);

  // HouseClassification
  n = 0;
  for (const row of HOUSE_CLASSIFICATIONS) {
    await prisma.houseClassification.upsert({
      where: { house_tag: { house: row.house, tag: row.tag } },
      create: { house: row.house, tag: row.tag, notes: row.notes ?? null },
      update: { notes: row.notes ?? null },
    });
    n++;
  }
  console.log(`  HouseClassification: ${n} rows`);

  // BhavatBhavam
  n = 0;
  for (const row of BHAVAT_BHAVAM) {
    await prisma.bhavatBhavam.upsert({
      where: { fromHouse_toHouse: { fromHouse: row.fromHouse, toHouse: row.toHouse } },
      create: row,
      update: { label: row.label },
    });
    n++;
  }
  console.log(`  BhavatBhavam: ${n} rows`);

  // PlanetSpecialAspect
  n = 0;
  for (const row of PLANET_SPECIAL_ASPECTS) {
    await prisma.planetSpecialAspect.upsert({
      where: { planet_aspectOffset: { planet: row.planet, aspectOffset: row.aspectOffset } },
      create: { planet: row.planet, aspectOffset: row.aspectOffset, strength: row.strength ?? 1.0 },
      update: { strength: row.strength ?? 1.0 },
    });
    n++;
  }
  console.log(`  PlanetSpecialAspect: ${n} rows`);

  // LifeAreaHouseRelevance
  n = 0;
  for (const row of LIFE_AREA_HOUSE_RELEVANCE) {
    await prisma.lifeAreaHouseRelevance.upsert({
      where: { lifeArea_house: { lifeArea: row.lifeArea, house: row.house } },
      create: row,
      update: { weight: row.weight, rationale: row.rationale },
    });
    n++;
  }
  console.log(`  LifeAreaHouseRelevance: ${n} rows`);

  // LifeAreaKaraka
  n = 0;
  for (const row of LIFE_AREA_KARAKAS) {
    await prisma.lifeAreaKaraka.upsert({
      where: { lifeArea_planet: { lifeArea: row.lifeArea, planet: row.planet } },
      create: row,
      update: { weight: row.weight, rationale: row.rationale },
    });
    n++;
  }
  console.log(`  LifeAreaKaraka: ${n} rows`);

  // PlanetFavorableHouse
  n = 0;
  for (const [planet, houses] of Object.entries(PLANET_FAVORABLE_HOUSES)) {
    for (const house of houses) {
      await prisma.planetFavorableHouse.upsert({
        where: { planet_house: { planet, house } },
        create: { planet, house },
        update: {},
      });
      n++;
    }
  }
  console.log(`  PlanetFavorableHouse: ${n} rows`);

  // PlanetAreaInterpretation
  n = 0;
  for (const row of PLANET_AREA_INTERPRETATIONS) {
    await prisma.planetAreaInterpretation.upsert({
      where: {
        planet_lifeArea_polarity: {
          planet: row.planet,
          lifeArea: row.lifeArea,
          polarity: row.polarity,
        },
      },
      create: row,
      update: { text: row.text },
    });
    n++;
  }
  console.log(`  PlanetAreaInterpretation: ${n} rows`);

  // PlanetAreaAdvice (advisory phrases)
  n = 0;
  for (const row of PLANET_AREA_ADVICE) {
    await prisma.planetAreaAdvice.upsert({
      where: {
        planet_lifeArea_polarity: {
          planet: row.planet,
          lifeArea: row.lifeArea,
          polarity: row.polarity,
        },
      },
      create: row,
      update: { text: row.text },
    });
    n++;
  }
  console.log(`  PlanetAreaAdvice: ${n} rows`);

  // Yogakaraka
  n = 0;
  for (const [lagna, [planet, rationale]] of Object.entries(YOGAKARAKA)) {
    await prisma.yogakaraka.upsert({
      where: { lagna },
      create: { lagna, planet, rationale },
      update: { planet, rationale },
    });
    n++;
  }
  console.log(`  Yogakaraka: ${n} rows`);

  // LifeAreaLabel
  n = 0;
  for (const [lifeArea, casualLabel] of Object.entries(LIFE_AREA_LABEL)) {
    await prisma.lifeAreaLabel.upsert({
      where: { lifeArea },
      create: { lifeArea, casualLabel },
      update: { casualLabel },
    });
    n++;
  }
  console.log(`  LifeAreaLabel: ${n} rows`);

  // PlanetNature
  n = 0;
  for (const [planet, nature] of Object.entries(PLANET_NATURE)) {
    await prisma.planetNature.upsert({
      where: { planet },
      create: { planet, nature },
      update: { nature },
    });
    n++;
  }
  console.log(`  PlanetNature: ${n} rows`);

  // RuleSetting
  n = 0;
  for (const row of RULE_SETTINGS) {
    await prisma.ruleSetting.upsert({
      where: { key: row.key },
      create: row,
      update: { value: row.value, notes: row.notes ?? null },
    });
    n++;
  }
  console.log(`  RuleSetting: ${n} rows`);

  console.log("\nDone.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
