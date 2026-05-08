/**
 * Seeds SpecialPointRule rows — 24 total:
 *   12 × Gulika (Mandi) by house from natal lagna
 *   12 × Bhrigu Bindu by house from natal lagna
 *
 * Sources:
 *   Gulika: BPHS Ch. 3 (Parashara); Phaladeepika Ch. 14; Saravali Ch. 4
 *   Bhrigu Bindu: Bhrigu Nadi tradition; K.N. Rao — Astrology, Destiny & the Wheel of Time
 *
 * Run: npx ts-node --project tsconfig.seed.json prisma/seed-special-points.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
console.log("Connecting to:", url.replace(/:[^:@]+@/, ":****@"));

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const GULIKA_RULES: Array<{
  house: number;
  tone: string;
  effect: string;
  detail: string;
  keywords: string[];
  source: string;
}> = [
  {
    house: 1,
    tone: "negative",
    effect: "Obstacles to health and vitality; personality coloured by Saturn's heaviness and a touch of maleficence.",
    detail: "Gulika in the Lagna brings physical ailments, a tendency toward pessimism, and recurring obstacles in life's beginnings. The native may have a sharp or caustic tongue and can be accident-prone. Classical texts warn that Gulika here reduces the overall lustre of the chart unless well-aspected by benefics.",
    keywords: ["health obstacles", "malefic personality", "pessimism", "physical ailments"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 2,
    tone: "negative",
    effect: "Family discord, financial losses, and speech difficulties — Gulika poisons the matters of the 2nd house.",
    detail: "The 2nd house governs wealth, speech, and family. Gulika here brings friction in family life, a tendency toward harsh or blunt speech, and challenges in accumulating and retaining money. Food and dietary habits may be erratic. This is considered a difficult placement in all classical texts.",
    keywords: ["family discord", "financial loss", "harsh speech", "wealth difficulties"],
    source: "BPHS Ch. 3; Saravali Ch. 4",
  },
  {
    house: 3,
    tone: "positive",
    effect: "Courage, determination, and sibling strength — the 3rd house Gulika gives Saturnine grit and perseverance.",
    detail: "The 3rd house (courage, effort, siblings) responds well to Gulika. The native develops remarkable persistence and the ability to work hard under pressure. Sibling relationships, though sometimes strained, are generally supportive. This is one of the better placements for Gulika (upachaya house).",
    keywords: ["courage", "determination", "perseverance", "sibling support"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 4,
    tone: "negative",
    effect: "Domestic unhappiness, mother's health affected, and property disputes — peace at home is hard to find.",
    detail: "Gulika afflicts the 4th house with domestic strife. The native may experience early separation from mother or her health may be poor. Property and vehicle matters bring losses or legal disputes. Inner peace and happiness are difficult to sustain. Classical texts see this as a particularly troublesome placement.",
    keywords: ["domestic strife", "mother's health", "property disputes", "unhappiness at home"],
    source: "BPHS Ch. 3; Saravali Ch. 4",
  },
  {
    house: 5,
    tone: "negative",
    effect: "Progeny difficulties, speculative losses, and intellectual restlessness.",
    detail: "The 5th house governs children, intelligence, and past-life merit. Gulika here brings delays or difficulties with children, a tendency toward poor judgment in speculation, and a restless, sometimes tortured intellect. Mantras and spiritual practices may be disrupted. This placement requires careful remediation.",
    keywords: ["progeny issues", "speculation losses", "intellectual restlessness", "children difficulties"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 6,
    tone: "positive",
    effect: "Gulika in the 6th is strong — it helps destroy enemies, overcome disease, and win competitions.",
    detail: "The 6th house (enemies, disease, debt) benefits from Gulika's malefic energy. Malefics thrive in dusthana houses and Gulika here gives the native power over adversaries, remarkable recovery from illness, and competitive strength. BPHS specifically notes this as a good placement.",
    keywords: ["overcomes enemies", "competitive strength", "disease recovery", "upachaya benefit"],
    source: "BPHS Ch. 3",
  },
  {
    house: 7,
    tone: "negative",
    effect: "Marital discord, partner's health suffers, and delays or difficulties in marriage.",
    detail: "Gulika in the 7th afflicts partnerships. Marriage may be delayed, the spouse may suffer health problems, or the marital relationship is marked by distance and coldness. Business partnerships also face obstacles. The native may attract partners who are sickly or Saturnine in temperament.",
    keywords: ["marital discord", "spouse health", "partnership difficulties", "marriage delay"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 8,
    tone: "negative",
    effect: "Chronic illness, accident risk, longevity concerns, and obstacles to inheritance.",
    detail: "The 8th house placement is among the most challenging for Gulika. The native faces recurring health crises, possibly chronic conditions, and an elevated risk of accidents. Inheritance and in-laws' wealth may be blocked. Yet the 8th also rules occult knowledge, and some classical astrologers note hidden spiritual depth in this placement.",
    keywords: ["chronic illness", "accident risk", "longevity concerns", "occult depth"],
    source: "BPHS Ch. 3; Saravali Ch. 4",
  },
  {
    house: 9,
    tone: "negative",
    effect: "Father's welfare affected, obstacles to fortune and dharma, higher education may be disrupted.",
    detail: "Gulika in the 9th hurts the Bhagya (fortune) house. The father may suffer health problems or the relationship is difficult. Higher education, long journeys for study, and guru relationships face obstacles. The native's overall luck is subdued. Dharmic inclinations may be replaced by cynicism if not remediated.",
    keywords: ["father's health", "misfortune", "dharma obstacles", "higher education disrupted"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 10,
    tone: "mixed",
    effect: "Career obstacles with Saturnine work ethic — great capacity for hard labour but recognition comes late.",
    detail: "The 10th house placement gives Gulika a mixed outcome. On one hand, career advancement is blocked or delayed and there may be conflicts with authority. On the other hand, the native possesses extraordinary capacity for hard, disciplined work. Recognition eventually comes — Saturn rewards persistence — but it takes time.",
    keywords: ["career obstacles", "hard work", "delayed recognition", "authority conflicts"],
    source: "BPHS Ch. 3; Saravali Ch. 4",
  },
  {
    house: 11,
    tone: "positive",
    effect: "Gains after struggle, income from unconventional sources, and Gulika's malefic energy is tempered in the 11th.",
    detail: "The 11th house is an upachaya house where malefics benefit over time. Gulika here brings gains through hard work and persistence, often through unconventional or Saturnine professions. The native's social network may be unusual, but friends are loyal. Income flows — though not without effort and delay.",
    keywords: ["gains after struggle", "unconventional income", "loyal friends", "upachaya benefit"],
    source: "BPHS Ch. 3; Phaladeepika Ch. 14",
  },
  {
    house: 12,
    tone: "mixed",
    effect: "Losses and expenditures are elevated, but also deep spiritual inclinations and potential for moksha.",
    detail: "Gulika in the 12th brings heavy expenditures, possible foreign settlement, hospital stays, or confinement. Sleep may be disturbed. Yet the 12th also governs liberation, and Gulika here can give deep spiritual detachment and a genuine inclination toward renunciation. The challenge and the gift coexist.",
    keywords: ["losses", "expenditures", "foreign settlement", "spiritual detachment", "moksha inclination"],
    source: "BPHS Ch. 3; Saravali Ch. 4",
  },
];

const BHRIGU_BINDU_RULES: Array<{
  house: number;
  tone: string;
  effect: string;
  detail: string;
  keywords: string[];
  source: string;
}> = [
  {
    house: 1,
    tone: "mixed",
    effect: "The self and body are the axis of karmic activation — transits over BB here trigger identity crises and reinventions.",
    detail: "With Bhrigu Bindu in the 1st, the native's personality and physical body become the central arena for karmic fulfilment. Planets transiting over this degree trigger significant identity shifts, health events, and new beginnings. Natal planets conjunct BB amplify the house themes they occupy through the lens of self. Life reinventions happen at predictable BB-transit intervals.",
    keywords: ["identity crisis", "health events", "reinvention", "self-karma", "personality activation"],
    source: "Bhrigu Nadi tradition; K.N. Rao — Astrology, Destiny & the Wheel of Time",
  },
  {
    house: 2,
    tone: "mixed",
    effect: "Wealth and family are the karmic focal point — pivotal gains or losses cluster around BB transits.",
    detail: "BB in the 2nd sensitises wealth accumulation, family relationships, and speech. Major financial turning points — sudden gains, unexpected losses, pivotal business decisions — are triggered when planets transit this degree. Family events of significance also cluster around BB activations. The native's financial destiny has notable peaks and troughs.",
    keywords: ["wealth fluctuation", "family pivots", "financial karma", "speech events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 3,
    tone: "mixed",
    effect: "Courage, skills, and sibling relationships are the karmic testing ground.",
    detail: "BB in the 3rd makes courage-testing situations and sibling-related turning points the recurring themes of the native's life. BB transits bring decisions requiring bold action, new skill development, and short-distance journeys that prove pivotal. The relationship with siblings holds karmic weight — their events mirror the native's own.",
    keywords: ["courage tests", "sibling karma", "skills", "bold decisions", "short journeys"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 4,
    tone: "mixed",
    effect: "Home, mother, and inner peace are the karmic centre — domestic upheavals cluster around BB transits.",
    detail: "BB in the 4th makes the home, mother's wellbeing, and emotional security the axis of karmic events. Property purchases, moves, changes in domestic life, and mother's significant health or emotional shifts occur at BB transit intervals. The native's inner peace is the mirror of outer domestic circumstances.",
    keywords: ["domestic upheaval", "mother events", "property karma", "emotional security"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 5,
    tone: "mixed",
    effect: "Children, creativity, and speculative ventures are the karmic focal points.",
    detail: "With BB in the 5th, the native's life pivots around children's milestones, creative breakthroughs or setbacks, and speculative outcomes. BB transits bring significant events related to children's health, birth, or achievements. Creative work reaches turning points — sometimes breakthrough, sometimes abandonment. Speculative ventures need careful timing.",
    keywords: ["children milestones", "creative breakthrough", "speculation karma", "5th house events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 6,
    tone: "mixed",
    effect: "Health crises, karmic debt repayment, and service are the recurring themes.",
    detail: "BB in the 6th sensitises the house of enemies, disease, and service. Significant health events — diagnoses, recoveries, or chronic issues surfacing — cluster around BB transits. The native may find that periods of intense service or workplace conflict are their most karmic. Debt cycles also activate at these intervals.",
    keywords: ["health crises", "karmic debt", "service pivots", "enemy conflicts", "disease events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 7,
    tone: "mixed",
    effect: "Marriage, partnerships, and public life are the axis — BB transits time relationship milestones.",
    detail: "BB in the 7th makes partnerships — romantic, marital, or business — the central karmic arena. Marriage timing, separations, reconciliations, and key business partnership decisions are activated by BB transits. The native's public life also has defining moments at these intervals. The 7th-house BB native's life story is largely told through relationships.",
    keywords: ["marriage milestones", "partnership karma", "relationship pivots", "public life events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 8,
    tone: "mixed",
    effect: "Transformational crises, inheritance events, and occult awakenings cluster around BB transits.",
    detail: "BB in the 8th is one of the most intense placements. The 8th governs death, rebirth, inheritance, and hidden knowledge. BB transits here trigger transformational life events — near-death experiences, major inheritance decisions, sudden upheavals that force reinvention, and powerful occult or spiritual awakenings. The native's life has unmistakeable 'before and after' moments.",
    keywords: ["transformation", "inheritance events", "occult awakening", "near-death", "rebirth"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 9,
    tone: "positive",
    effect: "Fortune shifts, guru encounters, and dharmic turning points — BB in the 9th brings blessings through faith.",
    detail: "BB in the 9th sensitises fortune, father, and dharma. When planets transit this degree, the native experiences significant shifts in overall luck, pivotal meetings with teachers or gurus, and moments of strong dharmic clarity or crisis. Foreign travel and higher learning also reach turning points at these intervals. The 9th-house BB tends toward benefic outcomes.",
    keywords: ["fortune shifts", "guru encounters", "dharmic turning points", "higher learning"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 10,
    tone: "mixed",
    effect: "Career pivots and public recognition (or scandal) are the defining life events.",
    detail: "BB in the 10th makes career and public reputation the karmic centre. BB transits bring career-defining events — promotions, major professional recognition, career changes, or public controversies. The native's public standing shifts noticeably at these intervals. This placement often produces a professionally eventful life.",
    keywords: ["career pivots", "public recognition", "professional karma", "reputation events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 11,
    tone: "positive",
    effect: "Significant gains, network changes, and fulfilled desires cluster around BB transits.",
    detail: "BB in the 11th sensitises gains, elder siblings, and the fulfilment of desires. Planets transiting this degree bring important income-related events, key network connections that alter the trajectory of life, and the realisation (or collapse) of long-held goals. This is one of the more positive BB placements.",
    keywords: ["significant gains", "network changes", "desire fulfilment", "11th house events"],
    source: "Bhrigu Nadi tradition",
  },
  {
    house: 12,
    tone: "mixed",
    effect: "Moksha-linked experiences, losses, and foreign or spiritual journeys mark BB transits.",
    detail: "BB in the 12th sensitises loss, liberation, foreign connection, and the spiritual path. BB transits trigger significant expenditures, periods abroad, hospitalisation, retreat, or deep spiritual experiences. The native's most transformative moments often involve withdrawal from the world. This placement carries a thread of destined renunciation.",
    keywords: ["moksha experiences", "foreign journeys", "spiritual retreat", "losses", "liberation"],
    source: "Bhrigu Nadi tradition",
  },
];

async function main() {
  console.log("Seeding SpecialPointRule (Gulika + Bhrigu Bindu)…");

  // --- Gulika ---
  for (const rule of GULIKA_RULES) {
    await prisma.specialPointRule.upsert({
      where: { id: `gulika_h${rule.house}` },
      update: {
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
      create: {
        id: `gulika_h${rule.house}`,
        point: "Gulika",
        house: rule.house,
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
    });
  }
  console.log(`  ✓ Gulika: ${GULIKA_RULES.length} rows`);

  // --- Bhrigu Bindu ---
  for (const rule of BHRIGU_BINDU_RULES) {
    await prisma.specialPointRule.upsert({
      where: { id: `bb_h${rule.house}` },
      update: {
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
      create: {
        id: `bb_h${rule.house}`,
        point: "BhriguBindu",
        house: rule.house,
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
    });
  }
  console.log(`  ✓ Bhrigu Bindu: ${BHRIGU_BINDU_RULES.length} rows`);

  console.log("Done — 24 SpecialPointRule rows seeded.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
