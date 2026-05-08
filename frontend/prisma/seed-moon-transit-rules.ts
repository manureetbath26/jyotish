/**
 * Seed: Moon transit rules (Chandra Gochara).
 *
 * Populates the MoonTransitRule table with 36 classical rules:
 *   - 12 by sign (ruleType: "sign")
 *   - 12 from natal Moon — primary Gochara method (ruleType: "from_natal_moon")
 *   - 12 from lagna (ruleType: "from_lagna")
 *
 * Idempotent — uses upsert on `id`. Safe to re-run after edits.
 *
 * Run:  npx tsx prisma/seed-moon-transit-rules.ts
 *
 * Sources: Phaladeepika Ch.26, BPHS Ch.39, Saravali Ch.35, Jataka Parijata.
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
// MOON TRANSIT RULES BY SIGN
// ruleType: "sign", position: sign name
// Describes the emotional quality of Moon transiting each sign.
// ────────────────────────────────────────────────────────────────────────────
const SIGN_RULES: {
  id: string;
  position: string;
  tone: string;
  effect: string;
  detail: string;
  keywords: string[];
  source: string;
}[] = [
  {
    id: "moon_sign_aries",
    position: "Aries",
    tone: "mixed",
    effect: "Emotionally impulsive and energetic; quick reactions, courage in short bursts, but irritability and restlessness.",
    detail: "Mars-ruled Aries gives Moon a fiery, restless quality. Emotional reactions are quick and sometimes aggressive. Good for initiating but poor for sustained emotional work. Courage rises but tempers may flare.",
    keywords: ["impulsive", "restless", "courageous", "irritable"],
    source: "Phaladeepika Ch.26; Saravali Ch.35",
  },
  {
    id: "moon_sign_taurus",
    position: "Taurus",
    tone: "positive",
    effect: "Moon's exaltation sign; emotional stability, comfort, pleasure, and material satisfaction. Best sign for mental peace.",
    detail: "Venus-ruled Taurus is Moon's exaltation sign (uccha). Emotions are steady, grounded, and pleasurable. Strong desire for comfort, beauty, and sensory satisfaction. Excellent for decisions requiring emotional clarity.",
    keywords: ["stable", "comfortable", "pleasant", "peaceful"],
    source: "BPHS Gochara; Phaladeepika Ch.26",
  },
  {
    id: "moon_sign_gemini",
    position: "Gemini",
    tone: "mixed",
    effect: "Quick, versatile mind; socially active and communicative, but emotionally indecisive and scattered.",
    detail: "Mercury-ruled Gemini makes the mind quick, curious, and communicative. Social interactions flourish. However, emotional depth is lacking and decisions may be inconsistent. Good for writing, networking, short travel.",
    keywords: ["communicative", "indecisive", "social", "restless"],
    source: "Phaladeepika Ch.26; Saravali",
  },
  {
    id: "moon_sign_cancer",
    position: "Cancer",
    tone: "positive",
    effect: "Moon in own sign; strong intuition, nurturing energy, emotional depth, comfort with home and family strengthened.",
    detail: "Cancer is Moon's own sign (svagraha). Emotions run deep, intuition is heightened, and there is a strong pull toward home, family, and nurturing. Sensitivity is high but in a productive, caring direction. Best for domestic matters.",
    keywords: ["intuitive", "nurturing", "emotional", "comforting"],
    source: "BPHS Gochara; Phaladeepika Ch.26",
  },
  {
    id: "moon_sign_leo",
    position: "Leo",
    tone: "mixed",
    effect: "Proud, dramatic emotions; generous and heart-centred, but sensitive to recognition. Good for confidence, challenging for ego.",
    detail: "Sun-ruled Leo gives emotions a proud, theatrical quality. Generosity and warmth are strong, but so is the need for recognition and admiration. Creative pursuits flourish; ego wounds sting more than usual.",
    keywords: ["proud", "generous", "dramatic", "confident"],
    source: "Phaladeepika Ch.26; Saravali",
  },
  {
    id: "moon_sign_virgo",
    position: "Virgo",
    tone: "mixed",
    effect: "Analytical, health-conscious mind; discriminating and purifying, but prone to worry and over-analysis of feelings.",
    detail: "Mercury-ruled Virgo gives Moon a critical, discriminating quality. Good for health routines, service, and detailed work. However, tendency to over-analyse emotions leads to worry and mental fatigue. Perfectionism can block emotional ease.",
    keywords: ["analytical", "worrying", "discriminating", "critical"],
    source: "Phaladeepika Ch.26",
  },
  {
    id: "moon_sign_libra",
    position: "Libra",
    tone: "positive",
    effect: "Balanced, social emotions; relationship-oriented and aesthetically sensitive. Peaceful but emotionally indecisive.",
    detail: "Venus-ruled Libra gives Moon a harmonious, relationship-seeking quality. Emotions are pleasant and balanced; artistic and social activities flourish. The downside is emotional indecision — finding it hard to choose or commit.",
    keywords: ["balanced", "social", "peaceful", "indecisive"],
    source: "Phaladeepika Ch.26; Saravali",
  },
  {
    id: "moon_sign_scorpio",
    position: "Scorpio",
    tone: "negative",
    effect: "Moon's debilitation sign; intense emotional turbulence, secretiveness, hidden fears surface, psychological pressure. Most challenging sign for Moon.",
    detail: "Mars-ruled Scorpio is Moon's debilitation sign (neecha). Emotions become intense, obsessive, and difficult to manage. Hidden fears and resentments surface. Trust issues and psychological pressure are high. Extra care with emotional decisions and interpersonal matters.",
    keywords: ["turbulent", "intense", "secretive", "anxious", "heavy"],
    source: "BPHS Gochara; Phaladeepika Ch.26 — Neecha",
  },
  {
    id: "moon_sign_sagittarius",
    position: "Sagittarius",
    tone: "mixed",
    effect: "Philosophical, optimistic emotions; freedom-loving and spiritually inclined. Restless in fixed situations, good for dharmic reflection.",
    detail: "Jupiter-ruled Sagittarius gives Moon a philosophical, expansive quality. Optimism and idealism are strong, along with a love of freedom. Good for spiritual inquiry and long-term planning. Restlessness in confined situations; impatience with detail.",
    keywords: ["philosophical", "optimistic", "restless", "spiritual"],
    source: "Phaladeepika Ch.26; Saravali",
  },
  {
    id: "moon_sign_capricorn",
    position: "Capricorn",
    tone: "negative",
    effect: "Emotionally heavy and serious; melancholic, suppressed feelings, nostalgia, longing. Moon in Saturn's sign creates weight and emotional constriction.",
    detail: "Saturn-ruled Capricorn places Moon in a cold, heavy environment. Emotions become suppressed, serious, and melancholic. Nostalgia and longing for the past are common. Social withdrawal and feelings of isolation or sadness arise. Not favourable for emotional matters; better for disciplined, solitary work.",
    keywords: ["heavy", "melancholic", "serious", "nostalgic", "suppressed", "sad"],
    source: "Phaladeepika Ch.26; Saravali Ch.35 — Shani-kshetra",
  },
  {
    id: "moon_sign_aquarius",
    position: "Aquarius",
    tone: "neutral",
    effect: "Emotionally detached and humanitarian; independent thinking, can feel isolated or lonely. Intellectual over emotional.",
    detail: "Saturn-ruled Aquarius gives Moon an intellectual, detached quality. Humanitarian concerns and group thinking dominate over personal emotion. Good for social causes and innovation but can feel isolated or disconnected from personal relationships.",
    keywords: ["detached", "independent", "lonely", "humanitarian"],
    source: "Phaladeepika Ch.26; Saravali",
  },
  {
    id: "moon_sign_pisces",
    position: "Pisces",
    tone: "mixed",
    effect: "Highly sensitive and compassionate; spiritually open, imaginative, but prone to emotional overwhelm and dissolution of boundaries.",
    detail: "Jupiter-ruled Pisces gives Moon a deeply sensitive, compassionate, and spiritually receptive quality. Imagination and empathy are strong. However, emotional boundaries dissolve easily, leading to overwhelm, confusion, or fantasy. Good for meditation and creative arts; poor for decisive action.",
    keywords: ["sensitive", "compassionate", "dreamy", "overwhelmed", "spiritual"],
    source: "Phaladeepika Ch.26; Saravali",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MOON TRANSIT RULES FROM NATAL MOON (Gochara — primary classical method)
// ruleType: "from_natal_moon", position: "1" through "12"
// Measured as the house Moon is transiting counting FROM the natal Moon sign.
// ────────────────────────────────────────────────────────────────────────────
const FROM_NATAL_MOON_RULES: {
  id: string;
  position: string;
  tone: string;
  effect: string;
  detail: string;
  keywords: string[];
  source: string;
}[] = [
  {
    id: "moon_from_natal_h1",
    position: "1",
    tone: "negative",
    effect: "Emotional vulnerability, mental disturbance, bodily discomfort, restlessness. The Janma transit activates all unresolved feelings.",
    detail: "Moon transiting its own natal position (Janma Rashi) creates emotional sensitivity and mental disturbance. The body may feel uncomfortable or restless. Unresolved emotional patterns resurface. This is called the Janma transit — classical texts uniformly treat it as challenging.",
    keywords: ["restless", "disturbed", "vulnerable", "unwell"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h2",
    position: "2",
    tone: "positive",
    effect: "Financial gains, good food, family happiness, speech improves. Wealth and material comforts favoured.",
    detail: "Moon in the 2nd from natal Moon brings positive results for wealth and family. Good food, pleasures, and material gains are indicated. Speech is more articulate and persuasive. A generally auspicious transit for practical and financial matters.",
    keywords: ["gains", "happiness", "family", "wealth"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h3",
    position: "3",
    tone: "positive",
    effect: "Courage, success in efforts, achievement of desires. Good for communication, siblings, short travels and bold initiatives.",
    detail: "Moon in the 3rd from natal Moon is auspicious — classical texts note success in bold initiatives, courage in facing challenges, and achievement of desires. Good for communication, media, siblings, and short journeys. Energy and assertiveness are heightened.",
    keywords: ["courageous", "successful", "energetic", "communicative"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h4",
    position: "4",
    tone: "negative",
    effect: "Mental grief, trouble from mother or domestic matters, loss of comforts. Inner emotional unrest even when outer conditions are fine.",
    detail: "Moon in the 4th from natal Moon brings mental sorrow and inner unrest. Trouble related to mother, home, or domestic peace is indicated. Loss of comforts or emotional security. The mind feels unsettled even without clear outer cause.",
    keywords: ["grief", "mental unrest", "domestic trouble", "loss of comfort"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h5",
    position: "5",
    tone: "negative",
    effect: "Mental worry, confusion of intellect, trouble related to children or creativity. Poor emotional judgment; decisions taken now may be regretted.",
    detail: "Moon in the 5th from natal Moon creates mental confusion and worry. Intellect is clouded, leading to poor judgment in decisions. Matters related to children, creativity, or speculative ventures face obstacles. Classical texts advise avoiding major decisions during this transit.",
    keywords: ["worry", "confused", "poor judgment", "anxious"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h6",
    position: "6",
    tone: "positive",
    effect: "Victory over enemies and obstacles, health improves, competitive situations resolve favourably.",
    detail: "Moon in the 6th from natal Moon is considered auspicious — victory over adversaries and obstacles, improvements in health, and success in competitive or legal matters. The ability to overcome resistance is heightened.",
    keywords: ["victory", "health", "success", "resilience"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h7",
    position: "7",
    tone: "mixed",
    effect: "Travel, distance from partner, mild physical discomfort. Relationship dynamics active but may feel strained.",
    detail: "Moon in the 7th from natal Moon indicates travel or distance from the partner. Mild physical discomfort or health issues may arise. Relationship dynamics become active and can feel strained or unsettled. Not ideal for important partnership decisions.",
    keywords: ["travel", "distance", "strained", "relationship"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h8",
    position: "8",
    tone: "negative",
    effect: "The most challenging Moon transit (Ashtama Chandra). Fear, disease, obstacles, financial setbacks, mental anguish. Extra care warranted — avoid major decisions.",
    detail: "Moon transiting the 8th from natal Moon is the Ashtama Chandra — classically the most inauspicious Moon transit. Fear, illness, obstacles, financial loss, and mental anguish are all indicated. Classical texts universally warn against initiating important matters during this period. Rest, caution, and spiritual practices are recommended.",
    keywords: ["fear", "disease", "obstacles", "danger", "anguish", "loss"],
    source: "Phaladeepika Gochara; BPHS Ch.39 — Ashtama Chandra",
  },
  {
    id: "moon_from_natal_h9",
    position: "9",
    tone: "positive",
    effect: "Fortune, blessings, happiness, dharmic activities favoured. Good news, gains, auspicious period.",
    detail: "Moon in the 9th from natal Moon is highly auspicious — fortune, divine blessings, happiness, and good news are indicated. Dharmic activities, travel to sacred places, and support from teachers or father figures are all favoured. One of the best classical Moon transits.",
    keywords: ["fortune", "blessings", "gains", "auspicious"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h10",
    position: "10",
    tone: "negative",
    effect: "Obstacles and setbacks in career or public life, worry about status and recognition. Professional matters need extra effort.",
    detail: "Moon in the 10th from natal Moon brings obstacles and setbacks in the professional domain. Public life may feel challenging; recognition or success in career matters is delayed. Classical texts advise extra effort and caution in professional dealings during this transit.",
    keywords: ["setbacks", "career trouble", "worry", "status"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h11",
    position: "11",
    tone: "positive",
    effect: "Gains, success, fulfillment of desires. Profits, good news from networks and friends. One of the best Moon transit positions.",
    detail: "Moon in the 11th from natal Moon is one of the most auspicious classical transit positions. Gains, profits, fulfillment of desires, and success in ambitions are all indicated. Good news from friends, networks, and elder siblings. Financial and social gains are strongly indicated.",
    keywords: ["gains", "success", "fulfillment", "profits"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
  {
    id: "moon_from_natal_h12",
    position: "12",
    tone: "negative",
    effect: "Expenditure, losses, travel away from home, isolation, emotional withdrawal. Spiritual inclinations strong; outer world feels draining.",
    detail: "Moon in the 12th from natal Moon brings expenditure, losses, and a tendency toward withdrawal. Travel away from home or a feeling of isolation is common. The outer world feels draining; inner spiritual or meditative inclinations are strong. Rest and retreat are more productive than active engagement.",
    keywords: ["loss", "expenditure", "isolation", "withdrawal", "tiring"],
    source: "Phaladeepika Gochara; BPHS Ch.39",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MOON TRANSIT RULES FROM LAGNA
// ruleType: "from_lagna", position: "1" through "12"
// Moon's house from the natal lagna — activates that house's themes emotionally.
// ────────────────────────────────────────────────────────────────────────────
const FROM_LAGNA_RULES: {
  id: string;
  position: string;
  tone: string;
  effect: string;
  detail: string;
  keywords: string[];
  source: string;
}[] = [
  {
    id: "moon_from_lagna_h1",
    position: "1",
    tone: "mixed",
    effect: "Heightened personal emotional sensitivity; self and body matters come forward. Decisions feel personal and emotionally charged.",
    detail: "Moon transiting the lagna house activates the self, body, and personal identity at an emotional level. The native becomes more self-focused and emotionally sensitive. Decisions carry personal weight; it is easy to take things personally. Body awareness and health matters are heightened.",
    keywords: ["personal", "sensitive", "self-focused"],
    source: "Jataka Parijata; modern Jyotish tradition",
  },
  {
    id: "moon_from_lagna_h2",
    position: "2",
    tone: "positive",
    effect: "Family, wealth, and speech emotionally activated. Good for family matters and financial decisions; speech carries warmth.",
    detail: "Moon in the 2nd from lagna emotionally activates family, accumulated wealth, and speech. A good time for family gatherings and financial conversations. Speech flows warmly and persuasively. The native feels emotionally connected to home and material security.",
    keywords: ["family", "wealth", "speech", "warm"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h3",
    position: "3",
    tone: "mixed",
    effect: "Courage and communication emotionally energised; sibling matters may arise. Emotionally restless; good for initiatives.",
    detail: "Moon in the 3rd from lagna brings emotional energy to communication, courage, and effort. Sibling matters or short-distance travel may arise. The native feels restless and driven to act or communicate. Good for initiating projects or bold moves.",
    keywords: ["communicative", "restless", "courageous", "sibling"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h4",
    position: "4",
    tone: "mixed",
    effect: "Deep emotional activation of home, mother, and inner security. Feelings run close to the surface; home and family matters feel significant.",
    detail: "Moon transiting the 4th from lagna strongly activates the emotional sphere of home, mother, and inner peace. Feelings are close to the surface and domestic matters feel significant. A good time for home-related decisions but requires awareness of emotional reactivity around family.",
    keywords: ["emotional", "home", "mother", "deep feelings", "security"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h5",
    position: "5",
    tone: "mixed",
    effect: "Children, creativity, and romance emotionally activated. Purva-punya (past karma) feelings; can be joyful or anxious about creative/romantic matters.",
    detail: "Moon in the 5th from lagna activates romance, creativity, and children at an emotional level. Past karma (purva-punya) may surface as intuitive feelings or gut sense. Can bring joy in creative expression or anxiety about romantic and children matters. Speculation requires careful emotional management.",
    keywords: ["creative", "romantic", "joyful", "anxious", "children"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h6",
    position: "6",
    tone: "mixed",
    effect: "Health and service emotionally activated; may feel burdened by obligations or conflict. Good for overcoming emotional obstacles.",
    detail: "Moon transiting the 6th from lagna activates the sphere of health, service, and enemies emotionally. The native may feel burdened by obligations, stressed by conflict, or concerned about health. However, this transit also supports emotional resilience and the ability to overcome obstacles through effort.",
    keywords: ["stressed", "service", "health", "obstacle", "burdened"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h7",
    position: "7",
    tone: "positive",
    effect: "Partnerships and relationships emotionally highlighted. Desire for connection and companionship; good for social and romantic matters.",
    detail: "Moon in the 7th from lagna brings emotional warmth to partnerships, marriage, and relationships. The desire for companionship and connection is strong. A good time for social interaction, romantic matters, and partnership discussions. The native is emotionally oriented toward others.",
    keywords: ["relationship", "partnership", "social", "romantic"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h8",
    position: "8",
    tone: "negative",
    effect: "Deep psychological and transformative emotional stirring. Hidden matters surface; emotional turbulence around shared resources, mortality, or hidden fears.",
    detail: "Moon transiting the 8th from lagna stirs deep psychological and transformative forces. Hidden matters, shared resources, or fears around mortality and loss come to the surface emotionally. The native may experience emotional turbulence, sudden revelations, or intense introspection. Not a good time for taking risks.",
    keywords: ["turbulent", "hidden", "transformation", "fear", "deep"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h9",
    position: "9",
    tone: "positive",
    effect: "Fortune, dharma, and father emotionally activated. Optimistic and spiritually inclined; good for study, teaching, and higher pursuits.",
    detail: "Moon in the 9th from lagna emotionally activates fortune, dharma, and father. The native feels optimistic, spiritually inclined, and drawn to higher learning or teaching. Good for religious activities, travel to sacred places, and seeking guidance from teachers or father figures. Luck flows more freely.",
    keywords: ["fortunate", "optimistic", "spiritual", "dharma"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h10",
    position: "10",
    tone: "mixed",
    effect: "Career and public status emotionally invested. Feelings about professional recognition; emotionally driven decisions around work.",
    detail: "Moon transiting the 10th from lagna brings emotional investment in career, status, and public recognition. The native may feel emotionally driven in professional decisions. Public interactions carry more emotional weight. Good awareness for managing how emotions influence professional choices.",
    keywords: ["career", "status", "public", "ambitious"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h11",
    position: "11",
    tone: "positive",
    effect: "Gains, hopes, and networks emotionally activated. Social warmth; desires feel within reach; good for group activities.",
    detail: "Moon in the 11th from lagna brings emotional warmth to gains, friendships, and the fulfillment of desires. Social connections feel supportive and meaningful. The native feels hopeful and motivated. A good time for group activities, social causes, and pursuing ambitions.",
    keywords: ["gains", "hopeful", "social", "networks"],
    source: "Jataka Parijata",
  },
  {
    id: "moon_from_lagna_h12",
    position: "12",
    tone: "mixed",
    effect: "Emotional withdrawal and release; losses, sleep, and spiritual matters come forward. Crying and emotional release are natural and appropriate.",
    detail: "Moon transiting the 12th from lagna activates the sphere of loss, spiritual release, and the unconscious. The native may feel like withdrawing from the world. Sleep, meditation, and solitary spiritual practices are favoured. Emotional release — including crying — is natural and healing. Outer activities feel draining.",
    keywords: ["withdrawal", "release", "spiritual", "isolated", "crying"],
    source: "Jataka Parijata",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SEED EXECUTION
// ────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Moon transit rules…\n");

  let n = 0;

  // Sign rules
  for (const rule of SIGN_RULES) {
    await prisma.moonTransitRule.upsert({
      where: { id: rule.id },
      create: { ...rule, ruleType: "sign" },
      update: {
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
    });
    n++;
  }
  console.log(`  MoonTransitRule (sign): ${SIGN_RULES.length} rows`);

  // From natal Moon rules (Gochara)
  for (const rule of FROM_NATAL_MOON_RULES) {
    await prisma.moonTransitRule.upsert({
      where: { id: rule.id },
      create: { ...rule, ruleType: "from_natal_moon" },
      update: {
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
    });
    n++;
  }
  console.log(`  MoonTransitRule (from_natal_moon): ${FROM_NATAL_MOON_RULES.length} rows`);

  // From lagna rules
  for (const rule of FROM_LAGNA_RULES) {
    await prisma.moonTransitRule.upsert({
      where: { id: rule.id },
      create: { ...rule, ruleType: "from_lagna" },
      update: {
        tone: rule.tone,
        effect: rule.effect,
        detail: rule.detail,
        keywords: rule.keywords,
        source: rule.source,
      },
    });
    n++;
  }
  console.log(`  MoonTransitRule (from_lagna): ${FROM_LAGNA_RULES.length} rows`);

  console.log(`\nTotal: ${n} rows seeded.`);
  console.log("Done.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
