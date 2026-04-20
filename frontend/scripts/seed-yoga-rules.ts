/**
 * Seed the YogaRule table with rules from BPHS chapters 34-43.
 *
 * Run: npx tsx scripts/seed-yoga-rules.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import type { YogaDetector } from "../src/lib/yogaEngine";
import { YOGA_IMPLICATIONS } from "./yoga-implications";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

interface Rule {
  slug: string;
  name: string;
  category: string;
  chapter: number;
  source: string;
  classicalText: string;
  formation: string;
  effects: string;
  importance: number;
  sortOrder: number;
  detector: YogaDetector;
}

const RULES: Rule[] = [
  // ─── Ch 34 — Yoga Karakas (here: the 5 Mahapurusha yogas which come under
  // the broader kendra-lord-in-own/exalted category; BPHS Ch 36 details them) ──

  // ─── Ch 35 — Nabhasa Yogas ──────────────────────────────────────────────

  // Asraya (3)
  {
    slug: "rajju",
    name: "Rajju Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.7",
    classicalText: "All the Grahas in Movable Rasis cause Rajju Yog.",
    formation: "All 7 classical planets occupy movable signs (Aries, Cancer, Libra, Capricorn).",
    effects: "Fond of travel and wandering, charming, earns in foreign lands. Can be restless or mischievous.",
    importance: 3,
    sortOrder: 1,
    detector: { type: "nabhasa_asraya", modality: "movable" },
  },
  {
    slug: "musala",
    name: "Musala Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.7",
    classicalText: "All the Grahas in Fixed Rasis cause Musala Yog.",
    formation: "All 7 classical planets occupy fixed signs (Taurus, Leo, Scorpio, Aquarius).",
    effects: "Honour, wisdom, wealth, many sons, firm in disposition, dear to authority.",
    importance: 4,
    sortOrder: 2,
    detector: { type: "nabhasa_asraya", modality: "fixed" },
  },
  {
    slug: "nala",
    name: "Nala Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.7",
    classicalText: "All the Grahas in Dual Rasis cause Nala Yog.",
    formation: "All 7 classical planets occupy dual signs (Gemini, Virgo, Sagittarius, Pisces).",
    effects: "Uneven physique, skilful, helpful to relatives, charming, interested in accumulation.",
    importance: 3,
    sortOrder: 3,
    detector: { type: "nabhasa_asraya", modality: "dual" },
  },

  // Dala (2)
  {
    slug: "maala",
    name: "Maala Yoga (Garland)",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.8",
    classicalText: "If 3 Kendras are occupied by benefics, Maal Yog is produced.",
    formation: "Three of the four kendras (1st/4th/7th/10th) are occupied solely by natural benefics (Jupiter, Venus, Mercury, Moon).",
    effects: "Ever-happy, conveyances and fine clothes, food and pleasures, splendour, the company of many.",
    importance: 4,
    sortOrder: 10,
    detector: { type: "nabhasa_dala", subtype: "maala" },
  },
  {
    slug: "sarpa",
    name: "Sarpa Yoga (Serpent)",
    category: "dosha",
    chapter: 35,
    source: "BPHS Ch. 35.8",
    classicalText: "Malefics so placed will cause Bhujang, or Sarpa Yog.",
    formation: "Three of the four kendras are occupied solely by malefics (Sun, Saturn, Mars, Rahu, Ketu).",
    effects: "Crooked, cruel, poor, miserable, dependent on others. Challenges in early life that teach detachment.",
    importance: 4,
    sortOrder: 11,
    detector: { type: "nabhasa_dala", subtype: "sarpa" },
  },

  // Sankhya (7)
  {
    slug: "gola",
    name: "Gola Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If all Grahas are in one Rasi, Gola Yog is formed.",
    formation: "All 7 classical planets concentrated in a single sign.",
    effects: "Strong physique but limited wealth and learning, dirty habits, sorrow and miserly tendency. Intense concentration.",
    importance: 3,
    sortOrder: 20,
    detector: { type: "nabhasa_sankhya", signsOccupied: 1 },
  },
  {
    slug: "yuga",
    name: "Yuga Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 2 Rasis, Yuga Yog is formed.",
    formation: "All 7 classical planets in exactly 2 signs.",
    effects: "Heretical in views, low wealth, lack of conventional recognition. Walks own path.",
    importance: 2,
    sortOrder: 21,
    detector: { type: "nabhasa_sankhya", signsOccupied: 2 },
  },
  {
    slug: "sool",
    name: "Sool Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 3, Sool Yog occurs.",
    formation: "All 7 classical planets in exactly 3 signs.",
    effects: "Sharp, valiant, fame through war or conflict. Indolent tendency but forceful when engaged.",
    importance: 3,
    sortOrder: 22,
    detector: { type: "nabhasa_sankhya", signsOccupied: 3 },
  },
  {
    slug: "kedara",
    name: "Kedara Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 4, Kedara Yog occurs.",
    formation: "All 7 classical planets in exactly 4 signs.",
    effects: "Useful to many, truthful, wealth from agriculture or land, happy but somewhat fickle.",
    importance: 3,
    sortOrder: 23,
    detector: { type: "nabhasa_sankhya", signsOccupied: 4 },
  },
  {
    slug: "paash",
    name: "Paash Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 5, Paash Yog is formed.",
    formation: "All 7 classical planets in exactly 5 signs.",
    effects: "Skilled in work, many servants, talks much. May tend toward manipulation.",
    importance: 3,
    sortOrder: 24,
    detector: { type: "nabhasa_sankhya", signsOccupied: 5 },
  },
  {
    slug: "daama",
    name: "Daama Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 6, Daam Yog occurs.",
    formation: "All 7 classical planets in exactly 6 signs.",
    effects: "Helpful, wealth earned righteously, affluent, famous, many sons, courageous.",
    importance: 4,
    sortOrder: 25,
    detector: { type: "nabhasa_sankhya", signsOccupied: 6 },
  },
  {
    slug: "veena",
    name: "Veena Yoga",
    category: "nabhasa",
    chapter: 35,
    source: "BPHS Ch. 35.16-17",
    classicalText: "If in 7, Veena Yog is produced.",
    formation: "All 7 classical planets spread across exactly 7 signs.",
    effects: "Fondness for music, dance and arts, skilful, happy, wealthy, a leader of cultured society.",
    importance: 4,
    sortOrder: 26,
    detector: { type: "nabhasa_sankhya", signsOccupied: 7 },
  },

  // ─── Ch 34 & 36 — Pancha Mahapurusha Yogas (5) ─────────────────────────
  {
    slug: "ruchaka",
    name: "Ruchaka Mahapurusha Yoga",
    category: "mahapurusha",
    chapter: 34,
    source: "BPHS (Mahapurusha)",
    classicalText: "Mars in kendra in own sign or exaltation.",
    formation: "Mars occupies a kendra house (1/4/7/10) and sits in own sign (Aries, Scorpio) or exaltation (Capricorn).",
    effects: "Brave, victorious, commanding physique, success through bold action, military or athletic excellence.",
    importance: 5,
    sortOrder: 30,
    detector: { type: "mahapurusha", planet: "Mars" },
  },
  {
    slug: "bhadra",
    name: "Bhadra Mahapurusha Yoga",
    category: "mahapurusha",
    chapter: 34,
    source: "BPHS (Mahapurusha)",
    classicalText: "Mercury in kendra in own sign or exaltation.",
    formation: "Mercury occupies a kendra house and sits in own sign (Gemini, Virgo) or exaltation (Virgo).",
    effects: "Intellectual brilliance, learned, rich, success in commerce, communication, and analysis.",
    importance: 5,
    sortOrder: 31,
    detector: { type: "mahapurusha", planet: "Mercury" },
  },
  {
    slug: "hamsa",
    name: "Hamsa Mahapurusha Yoga",
    category: "mahapurusha",
    chapter: 34,
    source: "BPHS (Mahapurusha)",
    classicalText: "Jupiter in kendra in own sign or exaltation.",
    formation: "Jupiter occupies a kendra house and sits in own sign (Sagittarius, Pisces) or exaltation (Cancer).",
    effects: "Religious, fortunate, wealthy, righteous, comforts, devotion, wisdom and reverence.",
    importance: 5,
    sortOrder: 32,
    detector: { type: "mahapurusha", planet: "Jupiter" },
  },
  {
    slug: "malavya",
    name: "Malavya Mahapurusha Yoga",
    category: "mahapurusha",
    chapter: 34,
    source: "BPHS (Mahapurusha)",
    classicalText: "Venus in kendra in own sign or exaltation.",
    formation: "Venus occupies a kendra house and sits in own sign (Taurus, Libra) or exaltation (Pisces).",
    effects: "Beautiful, refined, wealthy in luxuries, comforts, spouse and vehicles; artistic success.",
    importance: 5,
    sortOrder: 33,
    detector: { type: "mahapurusha", planet: "Venus" },
  },
  {
    slug: "sasha",
    name: "Sasha Mahapurusha Yoga",
    category: "mahapurusha",
    chapter: 34,
    source: "BPHS (Mahapurusha)",
    classicalText: "Saturn in kendra in own sign or exaltation.",
    formation: "Saturn occupies a kendra house and sits in own sign (Capricorn, Aquarius) or exaltation (Libra).",
    effects: "Authority over servants/workforce, long-lived, wealth through steady effort, leadership in large organisations.",
    importance: 5,
    sortOrder: 34,
    detector: { type: "mahapurusha", planet: "Saturn" },
  },

  // ─── Ch 36 — Many Other Yogas ────────────────────────────────────────────

  {
    slug: "gajakesari",
    name: "Gaja Kesari Yoga",
    category: "special",
    chapter: 36,
    source: "BPHS Ch. 36.3-4",
    classicalText: "Guru in a Kendra from Lagna or Moon, aspected by benefics, avoiding debilitation.",
    formation: "Jupiter in a kendra (1/4/7/10) from the Moon or from the Lagna, not debilitated.",
    effects: "Splendrous, wealthy, intelligent, many laudable virtues; respected and influential; wisdom and authority.",
    importance: 5,
    sortOrder: 40,
    detector: { type: "gajakesari" },
  },
  {
    slug: "amala",
    name: "Amala Yoga (Unblemished)",
    category: "special",
    chapter: 36,
    source: "BPHS Ch. 36.5-6",
    classicalText: "Exclusively a benefic in the 10th from Lagna or Moon.",
    formation: "Only benefic planets (no malefic) occupy the 10th house counted from Lagna, or from the Moon.",
    effects: "Fame lasting for generations, honoured by authority, charitable, helpful, pious, virtuous.",
    importance: 4,
    sortOrder: 41,
    detector: { type: "amala" },
  },
  {
    slug: "parvata",
    name: "Parvata Yoga (Mountain)",
    category: "special",
    chapter: 36,
    source: "BPHS Ch. 36.7-8",
    classicalText: "Benefics in kendras, 6th and 8th vacant or filled only by benefics.",
    formation: "Benefics in the kendras (1/4/7/10) with the 6th and 8th houses empty or hosting only benefics.",
    effects: "Wealth, eloquence, charity, learning in scriptures, fondness for celebration, leadership of a city.",
    importance: 4,
    sortOrder: 42,
    detector: { type: "parvata" },
  },
  {
    slug: "chamara",
    name: "Chamara Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.11-12",
    classicalText: "Lagna lord exalted in a kendra with Jupiter's aspect.",
    formation: "Lagna lord is exalted and occupies a kendra house, receiving an aspect from Jupiter.",
    effects: "King-like status, long life, scholarly, eloquent, versed in all arts. Royal favour.",
    importance: 5,
    sortOrder: 43,
    detector: { type: "chamara" },
  },
  {
    slug: "kalanidhi",
    name: "Kalanidhi Yoga (Treasure of Arts)",
    category: "special",
    chapter: 36,
    source: "BPHS Ch. 36.31-32",
    classicalText: "Jupiter in 2nd or 5th aspected by/conjunct Mercury and Venus.",
    formation: "Jupiter placed in the 2nd or 5th house, receiving influence (conjunction or aspect) from both Mercury and Venus.",
    effects: "Virtuous, honoured by authority, free from disease, happy, wealthy, learned in arts and scriptures.",
    importance: 4,
    sortOrder: 44,
    detector: { type: "kalanidhi" },
  },
  {
    slug: "lakshmi",
    name: "Lakshmi Yoga",
    category: "dhana",
    chapter: 36,
    source: "BPHS Ch. 36.27-28",
    classicalText: "9th lord in kendra in Moolatrikon/own/exalt with strong Lagna lord.",
    formation: "9th lord sits in a kendra house in its moolatrikona/own/exaltation sign, with the Lagna lord also strongly placed.",
    effects: "Charming, virtuous, kingly status, many sons, abundant wealth, fame and high moral standing.",
    importance: 5,
    sortOrder: 45,
    detector: { type: "lakshmi" },
  },

  // ─── Ch 37 — Chandra Yogas ───────────────────────────────────────────────

  {
    slug: "adhi_moon",
    name: "Adhi Yoga (from Moon)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.5",
    classicalText: "Benefics occupy the 6th, 7th and 8th from Moon.",
    formation: "Benefics (Jupiter, Venus, Mercury) present in the 6th, 7th and 8th houses counted from the Moon.",
    effects: "According to participating planets' strength: king, minister, or army chief. Leadership, trust and command.",
    importance: 5,
    sortOrder: 50,
    detector: { type: "adhi_moon" },
  },
  {
    slug: "sunapha",
    name: "Sunapha Yoga",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10",
    classicalText: "A planet (not Sun) in the 2nd from Moon.",
    formation: "Any planet other than the Sun occupies the 2nd house counted from the Moon.",
    effects: "Kingly or equal to a king; intelligence, wealth, fame, self-earned assets.",
    importance: 3,
    sortOrder: 51,
    detector: { type: "sunapha" },
  },
  {
    slug: "anapha",
    name: "Anapha Yoga",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10",
    classicalText: "A planet (not Sun) in the 12th from Moon.",
    formation: "Any planet other than the Sun occupies the 12th house counted from the Moon.",
    effects: "Kingly status, freedom from disease, virtuous, famous, charming and happy.",
    importance: 3,
    sortOrder: 52,
    detector: { type: "anapha" },
  },
  {
    slug: "duradhara",
    name: "Duradhara Yoga",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10",
    classicalText: "Planets (not Sun) in both the 2nd and 12th from Moon.",
    formation: "Planets other than the Sun simultaneously occupy both the 2nd and 12th houses from the Moon.",
    effects: "Enjoys pleasures, charitable, wealth, conveyances, excellent servants and support.",
    importance: 4,
    sortOrder: 53,
    detector: { type: "duradhara" },
  },
  {
    slug: "kemadruma",
    name: "Kema Druma Yoga",
    category: "dosha",
    chapter: 37,
    source: "BPHS Ch. 37.11-13",
    classicalText: "Moon alone — no planets (not Sun) with Moon, in 2nd/12th.",
    formation: "Moon is isolated: no planet (other than Sun) sits with the Moon, in the 2nd from Moon, or in the 12th from Moon.",
    effects: "Often reproached, low intelligence or learning, financial struggles and perils. Many classical mitigations — benefic aspects on Moon can cancel.",
    importance: 4,
    sortOrder: 54,
    detector: { type: "kemadruma" },
  },

  // ─── Ch 38 — Surya Yogas ─────────────────────────────────────────────────

  {
    slug: "vesi",
    name: "Vesi Yoga",
    category: "surya",
    chapter: 38,
    source: "BPHS Ch. 38.1-4",
    classicalText: "A planet other than Moon in the 2nd from Sun.",
    formation: "Any planet other than the Moon occupies the 2nd house counted from the Sun.",
    effects: "If benefic: even-sighted, truthful, happy. If malefic: indolent, quarrelsome, limited wealth.",
    importance: 3,
    sortOrder: 60,
    detector: { type: "vesi" },
  },
  {
    slug: "vosi",
    name: "Vosi Yoga",
    category: "surya",
    chapter: 38,
    source: "BPHS Ch. 38.1-4",
    classicalText: "A planet other than Moon in the 12th from Sun.",
    formation: "Any planet other than the Moon occupies the 12th house counted from the Sun.",
    effects: "If benefic: skilful, charitable, famous, learned, strong. If malefic: difficulties of pride or isolation.",
    importance: 3,
    sortOrder: 61,
    detector: { type: "vosi" },
  },
  {
    slug: "ubhayachari",
    name: "Ubhayachari Yoga",
    category: "surya",
    chapter: 38,
    source: "BPHS Ch. 38.1-4",
    classicalText: "Planets in both 2nd and 12th from Sun (not Moon).",
    formation: "Planets other than the Moon simultaneously occupy both the 2nd and 12th houses from the Sun.",
    effects: "A king or equal to a king; happy, well-supported. If malefics: learn through adversity.",
    importance: 4,
    sortOrder: 62,
    detector: { type: "ubhayachari" },
  },

  // ─── Ch 39 — Raj Yog ────────────────────────────────────────────────────

  {
    slug: "maha_raja",
    name: "Maha Raj Yoga",
    category: "raja",
    chapter: 39,
    source: "BPHS Ch. 39.6-7",
    classicalText: "Lagna lord and 5th lord exchange signs.",
    formation: "The lord of the Lagna sits in the natal sign of the 5th lord, AND the 5th lord sits in the natal sign of the Lagna lord (parivartana).",
    effects: "Famous and happy. A fundamental Raja yoga — authority, recognition, success in chosen field.",
    importance: 5,
    sortOrder: 70,
    detector: { type: "maha_raja" },
  },
  {
    slug: "raja_kendra_kona",
    name: "Kendra-Kona Raja Yoga",
    category: "raja",
    chapter: 39,
    source: "BPHS Ch. 34.11-12, Ch. 39",
    classicalText: "Lord of a Kendra associated with Lord of a Kona.",
    formation: "A kendra lord (1/4/7/10) and a kona lord (1/5/9) form a relationship through conjunction, mutual 7th aspect, or exchange of signs.",
    effects: "Royal status, recognition, power and authority. The extent depends on strengths of involved planets.",
    importance: 5,
    sortOrder: 71,
    detector: { type: "raja_kendra_kona" },
  },

  // ─── Ch 41 — Combinations for Wealth ────────────────────────────────────

  {
    slug: "dhana_yoga",
    name: "Dhana Yoga",
    category: "dhana",
    chapter: 41,
    source: "BPHS Ch. 36, 41",
    classicalText: "Lords of 2/5/9/11 in mutual association.",
    formation: "Any two or more of the wealth lords (2nd, 5th, 9th, 11th) are conjunct in the same sign.",
    effects: "Financial prosperity, fulfilled desires, strong income flow, ability to accumulate and retain wealth.",
    importance: 4,
    sortOrder: 80,
    detector: { type: "dhana_yoga" },
  },
  {
    slug: "sun_lagna_wealth",
    name: "Solar Wealth (Sun in own sign in Lagna)",
    category: "dhana",
    chapter: 41,
    source: "BPHS Ch. 41.9",
    classicalText: "Sun in Leo identical with Lagna, aspected by/conjunct Mars and Jupiter.",
    formation: "Sun occupies the Lagna in its own sign (Leo), with Mars and Jupiter conjunct with or aspecting Sun.",
    effects: "Substantial wealth, leadership roles in authority structures, status and public standing.",
    importance: 4,
    sortOrder: 81,
    detector: { type: "wealth_lagna", planet: "Sun", aspecters: ["Mars", "Jupiter"] },
  },
  {
    slug: "jupiter_lagna_wealth",
    name: "Jovian Wealth (Jupiter in own sign in Lagna)",
    category: "dhana",
    chapter: 41,
    source: "BPHS Ch. 41.13",
    classicalText: "Jupiter in its own sign in Lagna, aspected by/conjunct Mercury and Mars.",
    formation: "Jupiter occupies the Lagna in Sagittarius or Pisces, with Mercury and Mars conjunct or aspecting.",
    effects: "Wealth through wisdom, teaching, advisory or finance; scholarly success; dharmic prosperity.",
    importance: 4,
    sortOrder: 82,
    detector: { type: "wealth_lagna", planet: "Jupiter", aspecters: ["Mercury", "Mars"] },
  },
  {
    slug: "venus_lagna_wealth",
    name: "Venusian Wealth (Venus in own sign in Lagna)",
    category: "dhana",
    chapter: 41,
    source: "BPHS Ch. 41.14",
    classicalText: "Venus in own sign in Lagna, aspected by/conjunct Saturn and Mercury.",
    formation: "Venus occupies the Lagna in Taurus or Libra, with Saturn and Mercury conjunct or aspecting.",
    effects: "Wealth through luxury, arts, relationships, refined professions; material comforts in abundance.",
    importance: 4,
    sortOrder: 83,
    detector: { type: "wealth_lagna", planet: "Venus", aspecters: ["Saturn", "Mercury"] },
  },

  // ─── Ch 42 — Daridra (Poverty) Yogas ────────────────────────────────────

  {
    slug: "daridra_lagna_12_swap",
    name: "Daridra Yoga (Poverty)",
    category: "dosha",
    chapter: 42,
    source: "BPHS Ch. 42.2",
    classicalText: "Lagna lord in 12th and 12th lord in Lagna with Marak Lord.",
    formation: "Lagna lord sits in the 12th house, AND the 12th lord sits in the Lagna (with maraka influence).",
    effects: "Financial struggle, expenses exceeding income, difficulty in accumulating wealth. Can often be mitigated by strong dasha of benefics.",
    importance: 4,
    sortOrder: 90,
    detector: { type: "daridra_lagna_12_swap" },
  },

  // ─── Commonly-sought yogas beyond these chapters (widely accepted) ──────

  {
    slug: "budhaditya",
    name: "Budha-Aditya Yoga",
    category: "special",
    chapter: 36,
    source: "BPHS & classical tradition",
    classicalText: "Sun and Mercury conjunct.",
    formation: "Sun and Mercury occupy the same house (i.e. the same sign).",
    effects: "Intelligent, eloquent, influential in communication, analytical and decision-making success. Strongest when Mercury is not too close to Sun (non-combust).",
    importance: 4,
    sortOrder: 45,
    detector: { type: "budhaditya" },
  },
  {
    slug: "chandra_mangal",
    name: "Chandra-Mangal Yoga",
    category: "dhana",
    chapter: 37,
    source: "Classical tradition (Jataka Parijata)",
    classicalText: "Moon and Mars conjunct.",
    formation: "Moon and Mars occupy the same house.",
    effects: "Earning capacity, entrepreneurship, wealth through trade and property; intensity and drive.",
    importance: 4,
    sortOrder: 55,
    detector: { type: "chandra_mangal" },
  },
  {
    slug: "shakata",
    name: "Shakata Yoga",
    category: "dosha",
    chapter: 37,
    source: "Phaladeepika (Mantreswara) & B.V. Raman",
    classicalText: "The Moon placed in the 6th, 8th, or 12th from Jupiter gives rise to Sakata Yoga. Cancelled if the Moon is in a kendra from the Lagna.",
    formation: "The Moon is in the 6th, 8th, or 12th house counted from Jupiter (classical direction), AND the Moon is not in a kendra (1/4/7/10) from the Lagna.",
    effects: "Classically: loss of wealth or status, fluctuating fortunes, mental strain — followed by recovery. The strength of Jupiter and the Moon's dignity greatly soften the effects.",
    importance: 3,
    sortOrder: 91,
    detector: { type: "shakata" },
  },
  // ─── Phase 2 additions ──────────────────────────────────────────────────

  // Vipareet Raja Yogas (Ch 36+39 context — dusthana lord in dusthana)
  {
    slug: "harsha_vipareet",
    name: "Harsha Yoga (Vipareet Raja)",
    category: "raja",
    chapter: 39,
    source: "BPHS Ch. 39 — Vipareet Raja Yoga",
    classicalText: "The lord of the 6th house placed in the 6th, 8th, or 12th.",
    formation: "6th lord occupies the 6th, 8th, or 12th house — the dusthanas negate each other.",
    effects: "Harsha means joy — victory over enemies, immunity from debts and disease, good health and fame. Earned through overcoming adversity.",
    importance: 4,
    sortOrder: 72,
    detector: { type: "vipareet_raja", house: 6 },
  },
  {
    slug: "sarala_vipareet",
    name: "Sarala Yoga (Vipareet Raja)",
    category: "raja",
    chapter: 39,
    source: "BPHS Ch. 39 — Vipareet Raja Yoga",
    classicalText: "The lord of the 8th house placed in the 6th, 8th, or 12th.",
    formation: "8th lord occupies the 6th, 8th, or 12th house.",
    effects: "Sarala means simplicity — longevity, deep knowledge, transformation through crises, research and esoteric insight.",
    importance: 4,
    sortOrder: 73,
    detector: { type: "vipareet_raja", house: 8 },
  },
  {
    slug: "vimala_vipareet",
    name: "Vimala Yoga (Vipareet Raja)",
    category: "raja",
    chapter: 39,
    source: "BPHS Ch. 39 — Vipareet Raja Yoga",
    classicalText: "The lord of the 12th house placed in the 6th, 8th, or 12th.",
    formation: "12th lord occupies the 6th, 8th, or 12th house.",
    effects: "Vimala means pure — controlled expenses, skilful savings, independence, ability to live with less and thrive.",
    importance: 4,
    sortOrder: 74,
    detector: { type: "vipareet_raja", house: 12 },
  },

  // Kartari Yogas — moved to per-bhava generator (generateKartariRules below).
  // The legacy lagna/moon variants are subsumed by bhava-1 / bhava-N
  // detection in whole-sign systems.

  // Yogakaraka
  {
    slug: "yogakaraka_planet",
    name: "Yogakaraka Planet",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.13",
    classicalText: "If one and the same Graha owns a Kendra and a Kona, it becomes a Yogakaraka.",
    formation: "A single planet simultaneously lords a kendra (1/4/7/10) and a kona (1/5/9) house in the chart.",
    effects: "This planet's dasha and major transit periods bring exceptional career gains, authority, and all-round success. Yogakaraka planets are especially potent when otherwise dignified.",
    importance: 5,
    sortOrder: 75,
    detector: { type: "yogakaraka" },
  },

  // Extended Dhana yogas
  {
    slug: "dhana_mutual_aspect",
    name: "Dhana Yoga (Mutual Aspect)",
    category: "dhana",
    chapter: 41,
    source: "BPHS Ch. 36, 41",
    classicalText: "Wealth lords in mutual drishti.",
    formation: "Any two wealth lords (2nd, 5th, 9th, 11th) sit in mutual 7th aspect of each other.",
    effects: "Steady financial flow via relational dynamics — income responds to partnership, negotiation, and reciprocal exchange.",
    importance: 4,
    sortOrder: 84,
    detector: { type: "dhana_mutual_aspect" },
  },

  // General parivartana
  {
    slug: "parivartana_general",
    name: "Parivartana Yoga (Sign Exchange)",
    category: "special",
    chapter: 39,
    source: "BPHS & classical tradition",
    classicalText: "Two lords exchange each other's signs.",
    formation: "The lord of House A sits in the natal sign of House B's lord, AND vice versa.",
    effects: "The two life areas become deeply interlinked. Activation of one dasha or transit brings the other's themes — results depend on the houses involved.",
    importance: 4,
    sortOrder: 110,
    detector: { type: "parivartana_general" },
  },

  // Saraswati
  {
    slug: "saraswati",
    name: "Saraswati Yoga",
    category: "special",
    chapter: 36,
    source: "Phaladeepika & classical tradition",
    classicalText: "Jupiter, Venus and Mercury in kendra, kona or 2nd with Jupiter strong.",
    formation: "All three benefics — Jupiter, Venus, Mercury — sit in any of the 1/2/4/5/7/9/10 houses, with Jupiter in own sign or exaltation.",
    effects: "Mastery of arts, speech, scriptures and learning. Fame and respect through knowledge; excellent in writing, teaching, and refined pursuits.",
    importance: 5,
    sortOrder: 46,
    detector: { type: "saraswati" },
  },

  // Vasumati
  {
    slug: "vasumati",
    name: "Vasumati Yoga",
    category: "dhana",
    chapter: 36,
    source: "Phaladeepika & classical tradition",
    classicalText: "Benefics in the 3rd, 6th, 10th and 11th houses.",
    formation: "Benefic planets (Jupiter, Venus, Mercury) occupy two or more of the upachaya houses (3rd, 6th, 10th, 11th) from the Lagna.",
    effects: "Wealth grows steadily over time — finances improve progressively, especially after early struggles. Endurance in accumulating resources.",
    importance: 4,
    sortOrder: 85,
    detector: { type: "vasumati" },
  },

  // Planet conjunction yogas
  {
    slug: "guru_chandal",
    name: "Guru Chandala Yoga",
    category: "dosha",
    chapter: 36,
    source: "Classical tradition",
    classicalText: "Jupiter conjunct Rahu.",
    formation: "Jupiter and Rahu occupy the same house / sign.",
    effects: "Unconventional wisdom, questioning of tradition, spiritual seeking through unorthodox paths. Shadow side: ethical conflicts or guru-related difficulties. Strong potential if consciously handled.",
    importance: 3,
    sortOrder: 102,
    detector: { type: "planet_conjunction", planetA: "Jupiter", planetB: "Rahu" },
  },
  {
    slug: "angaraka_yoga",
    name: "Angaraka Yoga",
    category: "dosha",
    chapter: 36,
    source: "Classical tradition",
    classicalText: "Mars conjunct Rahu.",
    formation: "Mars and Rahu occupy the same house / sign.",
    effects: "Intensified drive and ambition with an edge of aggression. Good for fields requiring intensity (competitive sports, surgery, technology), challenging in personal relationships.",
    importance: 3,
    sortOrder: 103,
    detector: { type: "planet_conjunction", planetA: "Mars", planetB: "Rahu" },
  },
  {
    slug: "vish_yoga",
    name: "Vish Yoga",
    category: "dosha",
    chapter: 36,
    source: "Classical tradition",
    classicalText: "Moon conjunct Saturn.",
    formation: "Moon and Saturn occupy the same house / sign.",
    effects: "Emotional depth with a serious undertone. Periods of loneliness or melancholy are balanced by great discipline and maturity. Excellent for long-term concentration.",
    importance: 3,
    sortOrder: 104,
    detector: { type: "planet_conjunction", planetA: "Moon", planetB: "Saturn" },
  },
  {
    slug: "shapit_yoga",
    name: "Shapit Yoga",
    category: "dosha",
    chapter: 36,
    source: "Classical tradition",
    classicalText: "Saturn conjunct Rahu.",
    formation: "Saturn and Rahu occupy the same house / sign.",
    effects: "Indicates karmic tests — slow-moving challenges that refine character over time. Mastery through patient endurance.",
    importance: 3,
    sortOrder: 105,
    detector: { type: "planet_conjunction", planetA: "Saturn", planetB: "Rahu" },
  },

  // Neecha Bhanga
  {
    slug: "neecha_bhanga",
    name: "Neecha Bhanga Raja Yoga",
    category: "raja",
    chapter: 39,
    source: "BPHS & classical tradition",
    classicalText: "Cancellation of a debilitated planet's weakness.",
    formation: "A debilitated planet in the chart has its weakness cancelled — either the lord of the debilitation sign, or the planet that would be exalted in that sign, is placed in a kendra from the Lagna or Moon.",
    effects: "What looked like a weakness converts into a powerful Raja yoga. Late-bloomer success — initial struggles reveal the planet's true strength as life unfolds.",
    importance: 5,
    sortOrder: 76,
    detector: { type: "neecha_bhanga" },
  },

  // Akhanda Samrajya
  {
    slug: "akhanda_samrajya",
    name: "Akhanda Samrajya Yoga",
    category: "raja",
    chapter: 39,
    source: "Phaladeepika & classical tradition",
    classicalText: "2nd, 9th and 11th lords related with Jupiter's aspect.",
    formation: "The lords of the 2nd, 9th and 11th houses have a relationship (any two are conjunct), and Jupiter aspects that group.",
    effects: "Akhanda means undivided — sustained, empire-like prosperity spanning wealth, fortune, and income. Hereditary status or institutional prominence.",
    importance: 5,
    sortOrder: 77,
    detector: { type: "akhanda_samrajya" },
  },

  // Grahana
  {
    slug: "grahana_yoga",
    name: "Grahana Yoga (Eclipse)",
    category: "dosha",
    chapter: 36,
    source: "Classical tradition",
    classicalText: "Sun or Moon conjunct Rahu or Ketu.",
    formation: "Either luminary (Sun or Moon) is conjunct with Rahu or Ketu in the same house.",
    effects: "Identity or emotional self is 'eclipsed' by karmic themes — introspection, unusual life path, psychic sensitivity. Can manifest positively as deep intuition when consciously channelled.",
    importance: 3,
    sortOrder: 106,
    detector: { type: "grahana" },
  },

  // ─── Phase 3: Named Raja Yogas from BPHS Ch. 36 ────────────────────────

  {
    slug: "shankh",
    name: "Shankh Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.13-14",
    classicalText: "If Lagna's Lord is strong, while the Lords of Putr and Ari Bhava are in mutual Kendras, then Shankh Yog is produced.",
    formation: "Lagna lord is strong (own sign, exaltation, or in a kendra/kona), and the 5th & 6th lords occupy mutual kendras (1/4/7/10 from each other).",
    effects: "Wealth, spouse and sons; kindly disposed, propitious, intelligent, meritorious and long-lived.",
    importance: 4,
    sortOrder: 120,
    detector: { type: "shankh" },
  },
  {
    slug: "bhairi",
    name: "Bhairi Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.15-16",
    classicalText: "If Venus, Jupiter and Lagna's Lord are in a Kendra, while Dharma's Lord is strong, Bhairi Yog is formed.",
    formation: "Venus, Jupiter, and the Lagna lord all occupy kendra houses (1/4/7/10), with the 9th lord strong in dignity or placement.",
    effects: "Wealth, wife and sons; a king, famous, virtuous, endowed with good behaviour, happiness and pleasures.",
    importance: 4,
    sortOrder: 121,
    detector: { type: "bhairi" },
  },
  {
    slug: "mridang",
    name: "Mridang Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.17",
    classicalText: "If Lagna's Lord is strong and others occupy Kendras, Konas, own Bhavas, or exaltation Rasis, Mridang Yog is formed.",
    formation: "Lagna lord is strong, and at least four other classical planets are in kendras, konas, own signs, or exaltation.",
    effects: "King or equal to a king, and happy. A pervasive benefic signature across the whole chart.",
    importance: 4,
    sortOrder: 122,
    detector: { type: "mridang" },
  },
  {
    slug: "shrinath",
    name: "Shrinath Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.18",
    classicalText: "If Yuvati's Lord is in Karm Bhava, while Karm's Lord is exalted and yuti with Dharm's Lord, Shrinath Yog takes place.",
    formation: "7th lord sits in the 10th, while the 10th lord is exalted AND conjunct with the 9th lord.",
    effects: "Equal to Lord Devendra (chief of gods) — exceptional royal status, reverence, divine favour.",
    importance: 5,
    sortOrder: 123,
    detector: { type: "shrinath" },
  },
  {
    slug: "khadg",
    name: "Khadg Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.25-26",
    classicalText: "Should there be an exchange of Rasis between the Lords of Dhan and Dharm Bhava, as Lagna's Lord is in a Kendra, or in a Kon, Khadg Yog is obtained.",
    formation: "2nd lord and 9th lord exchange signs (parivartana), with Lagna lord placed in a kendra or kona.",
    effects: "Wealth, fortunes, happiness; learned in scriptures, intelligent, mighty, grateful, and skilful.",
    importance: 4,
    sortOrder: 124,
    detector: { type: "khadg" },
  },
  {
    slug: "matsya",
    name: "Matsya Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.21-22",
    classicalText: "Benefics in Dharm and Tanu Bhava, mixed Grahas in Putr Bhava and malefics in Bandhu and Randhr Bhava: this array will produce Matsya Yog.",
    formation: "Benefics (and only benefics) in the 1st and 9th; malefics (and only malefics) in the 4th and 8th.",
    effects: "A jyotishi, kind, virtuous, strong, beautiful, famous, learned and pious. Classical signature of a chart-reader.",
    importance: 4,
    sortOrder: 125,
    detector: { type: "matsya" },
  },
  {
    slug: "kurma",
    name: "Kurma Yoga",
    category: "raja",
    chapter: 36,
    source: "BPHS Ch. 36.23-24",
    classicalText: "Benefic Grahas in Putr, Ari and Yuvati Bhava in own/exalt/friend; malefics in Sahaj, Labh and Tanu Bhava in own or exalt.",
    formation: "Dignified benefics (own/exalted) in the 5th, 6th and 7th houses AND dignified malefics (own/exalted) in the 1st, 3rd and 11th houses.",
    effects: "Courageous, virtuous, famous, helpful, happy. A leader of men.",
    importance: 4,
    sortOrder: 126,
    detector: { type: "kurma" },
  },

  // ─── Phase 3: Chandra variants (flavour) ────────────────────────────────

  {
    slug: "sunapha_benefic",
    name: "Sunapha Yoga (benefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Benefic planets (not Sun) in the 2nd from Moon give benefic outcomes to Sunapha.",
    formation: "Only benefic planets (Jupiter, Venus, Mercury) occupy the 2nd house from the Moon.",
    effects: "Wealth, self-earned assets, fame, intelligence. Benefic influences shape the native's economic and social standing positively.",
    importance: 4,
    sortOrder: 51,
    detector: { type: "sunapha_flavored", flavor: "benefic" },
  },
  {
    slug: "sunapha_malefic",
    name: "Sunapha Yoga (malefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Malefics alone in the 2nd from Moon invert Sunapha's benefic indication.",
    formation: "Only malefics (Mars, Saturn, Rahu, Ketu) occupy the 2nd house from the Moon.",
    effects: "Effort-earned wealth — income comes through struggle, discipline, or hard industries. Periodic financial turbulence.",
    importance: 3,
    sortOrder: 51,
    detector: { type: "sunapha_flavored", flavor: "malefic" },
  },
  {
    slug: "anapha_benefic",
    name: "Anapha Yoga (benefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Benefic planets alone in the 12th from Moon intensify Anapha's benefic outcome.",
    formation: "Only benefics (Jupiter, Venus, Mercury) occupy the 12th house from the Moon.",
    effects: "Royal virtues, freedom from disease, charm and charity. Expenditure is directed to benefic, spiritual, or cultural purposes.",
    importance: 4,
    sortOrder: 52,
    detector: { type: "anapha_flavored", flavor: "benefic" },
  },
  {
    slug: "anapha_malefic",
    name: "Anapha Yoga (malefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Malefics alone in the 12th from Moon shade Anapha with tougher themes.",
    formation: "Only malefics (Mars, Saturn, Rahu, Ketu) occupy the 12th house from the Moon.",
    effects: "Learning through loss, detachment, or foreign exposure. Strength emerges from renunciation rather than accumulation.",
    importance: 3,
    sortOrder: 52,
    detector: { type: "anapha_flavored", flavor: "malefic" },
  },
  {
    slug: "duradhara_benefic",
    name: "Duradhara Yoga (benefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Only benefics on both sides of Moon yields the highest form of Duradhara.",
    formation: "Only benefics occupy BOTH the 2nd and 12th houses from the Moon.",
    effects: "Abundant pleasures, charity, wealth, conveyances, and excellent support staff. A rare fully-benefic Duradhara.",
    importance: 5,
    sortOrder: 53,
    detector: { type: "duradhara_flavored", flavor: "benefic" },
  },
  {
    slug: "duradhara_malefic",
    name: "Duradhara Yoga (malefic-flavored)",
    category: "chandra",
    chapter: 37,
    source: "BPHS Ch. 37.7-10 (flavour distinction)",
    classicalText: "Malefics on both sides of Moon convert Duradhara to a pressured configuration.",
    formation: "Only malefics occupy BOTH the 2nd and 12th houses from the Moon.",
    effects: "Pressure from both directions — income and expense. Builds survivor's resilience; prosperity often arrives through endurance.",
    importance: 3,
    sortOrder: 53,
    detector: { type: "duradhara_flavored", flavor: "malefic" },
  },

  // ─── Phase 3: Per-ascendant yogakarakas (BPHS Ch. 34) ──────────────────

  {
    slug: "asc_yk_aries",
    name: "Aries — Sun & Jupiter as benefics",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.19-22",
    classicalText: "For Mesh (Aries) Lagn, Guru and Srya are auspicious; Mangal (8L) is helpful to benefics.",
    formation: "Applies specifically when the Lagna is Aries.",
    effects: "Sun (5L) and Jupiter (9L) are the principal benefic trikona lords. Their dignity and placement directly fuel raja-yoga outcomes.",
    importance: 4,
    sortOrder: 130,
    detector: { type: "ascendant_yogakaraka", ascendant: "Aries", planet: "Sun" },
  },
  {
    slug: "asc_yk_taurus",
    name: "Taurus — Saturn as Yogakaraka",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.23-24",
    classicalText: "For Vrishabh (Taurus), ani causes Raj Yog.",
    formation: "Applies when Lagna is Taurus. Saturn (9L + 10L) is the yogakaraka.",
    effects: "Saturn as joint 9th and 10th lord is the yogakaraka par excellence for Taurus — its dignity and dasha periods bring career rise and dharmic fortune.",
    importance: 5,
    sortOrder: 131,
    detector: { type: "ascendant_yogakaraka", ascendant: "Taurus", planet: "Saturn" },
  },
  {
    slug: "asc_yk_gemini",
    name: "Gemini — Venus as primary benefic",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.25-26",
    classicalText: "For Mithun (Gemini) Lagn, ukr is the only auspicious Grah.",
    formation: "Applies when Lagna is Gemini. Venus (5L) is the primary benefic trikona lord.",
    effects: "Venus (5th lord) delivers Gemini's raja-yoga results. Well-placed Venus = creativity, wealth, recognition through partnerships.",
    importance: 4,
    sortOrder: 132,
    detector: { type: "ascendant_yogakaraka", ascendant: "Gemini", planet: "Venus" },
  },
  {
    slug: "asc_yk_cancer",
    name: "Cancer — Mars as Yogakaraka",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.27-28",
    classicalText: "For Kark (Cancer), Mangal is capable of conferring a full-fledged Yog and giving auspicious effects.",
    formation: "Applies when Lagna is Cancer. Mars (5L + 10L) is the yogakaraka.",
    effects: "Mars as 5th and 10th lord is the yogakaraka for Cancer — dignified Mars brings fame, authority, and wealth through action.",
    importance: 5,
    sortOrder: 133,
    detector: { type: "ascendant_yogakaraka", ascendant: "Cancer", planet: "Mars" },
  },
  {
    slug: "asc_yk_leo",
    name: "Leo — Mars as key benefic",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.29-30",
    classicalText: "For Simh (Leo), Mangal, Guru and Srya give auspicious effects.",
    formation: "Applies when Lagna is Leo. Mars (4L + 9L) is a kendra-cum-kona lord.",
    effects: "Mars as joint 4th and 9th lord acts as yogakaraka. Jupiter (5L trikona) and Sun (Lagna lord) also strengthen the chart's raja-yoga potential.",
    importance: 5,
    sortOrder: 134,
    detector: { type: "ascendant_yogakaraka", ascendant: "Leo", planet: "Mars" },
  },
  {
    slug: "asc_yk_virgo",
    name: "Virgo — Mercury & Venus as benefics",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.31-32",
    classicalText: "For Kanya (Virgo), Budh and ukr are auspicious; ukr's yuti with Budh will produce Yog.",
    formation: "Applies when Lagna is Virgo. Mercury (1L + 10L) and Venus (2L + 9L) are principal benefics.",
    effects: "Mercury-Venus conjunction forms a subtle raja yoga for Virgo — linking the Lagna, 10th, 9th houses. Excellent for intellectual and commercial success.",
    importance: 4,
    sortOrder: 135,
    detector: { type: "ascendant_yogakaraka", ascendant: "Virgo", planet: "Mercury" },
  },
  {
    slug: "asc_yk_libra",
    name: "Libra — Saturn as Yogakaraka",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.33-34",
    classicalText: "For Tula (Libra), Candr and Budh will cause Raj Yog; ani is auspicious.",
    formation: "Applies when Lagna is Libra. Saturn (4L + 5L) is the yogakaraka.",
    effects: "Saturn as 4th and 5th lord is the pure yogakaraka for Libra — dignified Saturn confers authority, property, and educational / creative success. Its dasha brings raja-yoga results.",
    importance: 5,
    sortOrder: 136,
    detector: { type: "ascendant_yogakaraka", ascendant: "Libra", planet: "Saturn" },
  },
  {
    slug: "asc_yk_scorpio",
    name: "Scorpio — Sun & Moon as Yogakarakas",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.35-36",
    classicalText: "For Vrischik (Scorpio), Srya and Candr are Yog Karakas.",
    formation: "Applies when Lagna is Scorpio. Sun (10L) and Moon (9L) are the key trikona-kendra lords.",
    effects: "Sun and Moon together form raja yoga potential for Scorpio. Their dignity and dasha periods bring authority and fortune.",
    importance: 5,
    sortOrder: 137,
    detector: { type: "ascendant_yogakaraka", ascendant: "Scorpio", planet: "Sun" },
  },
  {
    slug: "asc_yk_sagittarius",
    name: "Sagittarius — Sun & Mars as benefics",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.37-38",
    classicalText: "For Dhanu (Sagittarius), Mangal and Srya are auspicious; Srya and Budh are capable of conferring a Yog.",
    formation: "Applies when Lagna is Sagittarius. Sun (9L) and Mars (5L + 12L) are key benefic lords.",
    effects: "Sun as dharma lord and Mars as trikona lord bring raja-yoga results when dignified. The key trigger is Sun-Mars association.",
    importance: 4,
    sortOrder: 138,
    detector: { type: "ascendant_yogakaraka", ascendant: "Sagittarius", planet: "Sun" },
  },
  {
    slug: "asc_yk_capricorn",
    name: "Capricorn — Venus as Yogakaraka",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.39-40",
    classicalText: "For Makar (Capricorn), ukr and Budh are auspicious; only ukr is capable of causing a superior Yog.",
    formation: "Applies when Lagna is Capricorn. Venus (5L + 10L) is the yogakaraka.",
    effects: "Venus as 5th and 10th lord is the supreme yogakaraka for Capricorn — dignity brings fame, wealth, partnerships, and refined career success.",
    importance: 5,
    sortOrder: 139,
    detector: { type: "ascendant_yogakaraka", ascendant: "Capricorn", planet: "Venus" },
  },
  {
    slug: "asc_yk_aquarius",
    name: "Aquarius — Venus as Yogakaraka",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.41-42",
    classicalText: "For Kumbh (Aquarius), ukr and ani are auspicious; ukr is the only Grah that causes Raj Yog.",
    formation: "Applies when Lagna is Aquarius. Venus (4L + 9L) is the yogakaraka.",
    effects: "Venus as joint 4th and 9th lord is the yogakaraka for Aquarius — dignified Venus delivers comfort, dharmic fortune, and authority.",
    importance: 5,
    sortOrder: 140,
    detector: { type: "ascendant_yogakaraka", ascendant: "Aquarius", planet: "Venus" },
  },
  {
    slug: "asc_yk_pisces",
    name: "Pisces — Mars & Jupiter as Yogakarakas",
    category: "raja",
    chapter: 34,
    source: "BPHS Ch. 34.43-44",
    classicalText: "For Meen (Pisces), Mangal and Candr are auspicious; Mangal and Guru cause a Yog.",
    formation: "Applies when Lagna is Pisces. Mars (2L + 9L) and Jupiter (Lagna + 10L) form the raja-yoga pair.",
    effects: "Mars-Jupiter connection brings raja-yoga outcomes for Pisces. Either in kendra/kona with Jupiter's aspect is classically most powerful.",
    importance: 5,
    sortOrder: 141,
    detector: { type: "ascendant_yogakaraka", ascendant: "Pisces", planet: "Mars" },
  },

  {
    slug: "kala_sarpa",
    name: "Kala Sarpa Yoga",
    category: "dosha",
    chapter: 35,
    source: "Classical tradition (non-BPHS but widely cited)",
    classicalText: "All 7 classical planets hemmed between Rahu and Ketu.",
    formation: "All 7 classical planets (Sun through Saturn) fall on one side of the Rahu-Ketu axis, i.e. between Rahu and Ketu in sign order.",
    effects: "Life feels karmically 'charged' — obstacles arrive unexpectedly but lead to transformation. Strong dharmic pull; often significant public influence.",
    importance: 4,
    sortOrder: 92,
    detector: { type: "kala_sarpa" },
  },
];

// ─── Phase 3: Bhava yogas (Nth lord in Mth house) — systematic ───────────
// Classical effects sourced from BPHS Ch. 34 + Phaladeepika Ch. 9.
// Seeded for the three most-impactful lords: 5th (intellect/children),
// 9th (fortune), 10th (career). Each lord × 12 houses = 36 rules.

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Classical concise effects for "Nth lord in Mth house"
const LORD_IN_HOUSE_EFFECTS: Record<string, { formation: string; effects: string; importance: number }> = {
  // 5th lord (intellect, children, past merit) in each house
  "5in1":  { formation: "5th lord occupies the 1st house (Lagna).", effects: "Intelligent, honourable, fortunate with children. Past-life merit surfaces as natural aptitude for learning and creative self-expression.", importance: 4 },
  "5in2":  { formation: "5th lord occupies the 2nd house.", effects: "Wealth through intellect and creative pursuits. Eloquent, good with money; progeny-themed wealth accumulation.", importance: 4 },
  "5in3":  { formation: "5th lord occupies the 3rd house.", effects: "Courageous, skilled with hands, benefits through siblings. Short journeys bring creative or educational gains.", importance: 3 },
  "5in4":  { formation: "5th lord occupies the 4th house.", effects: "Happiness at home, warmth from mother, educational success, love of property and comfort. Inner contentment.", importance: 4 },
  "5in5":  { formation: "5th lord occupies the 5th (own) house.", effects: "Powerful raja yoga — highly intelligent, blessed with children, spiritually evolved, recognized for creative or intellectual contributions.", importance: 5 },
  "5in6":  { formation: "5th lord occupies the 6th house.", effects: "Struggle with children or education in early years; ultimately victory over enemies through intellect. Service-oriented career.", importance: 3 },
  "5in7":  { formation: "5th lord occupies the 7th house.", effects: "Marriage brings wealth and intelligence; excellent rapport with partners. Creative gains through partnership.", importance: 4 },
  "5in8":  { formation: "5th lord occupies the 8th house.", effects: "Research, investigation, occult learning. Delays in children possible; intellect deepens through transformation and crisis.", importance: 3 },
  "5in9":  { formation: "5th lord occupies the 9th house.", effects: "Exceptional raja yoga — the two trikona lords' concerns merge. Great fortune, spiritual inclination, wisdom, success in higher education.", importance: 5 },
  "5in10": { formation: "5th lord occupies the 10th house.", effects: "Powerful dharma-karma combination — intellect and purpose align with career. Fame through creative or educational work; advisory roles.", importance: 5 },
  "5in11": { formation: "5th lord occupies the 11th house.", effects: "Rich income, successful children, strong intellectual networks. Gains through creative ventures and teaching.", importance: 4 },
  "5in12": { formation: "5th lord occupies the 12th house.", effects: "Creative expression through imagination, foreign, or spiritual domains. Expenditure on children or education; detachment from worldly fame.", importance: 3 },
  // 9th lord (fortune, dharma, teacher) in each house
  "9in1":  { formation: "9th lord occupies the 1st house.", effects: "Embodied dharma and fortune — the native IS lucky. Wise, righteous, respected; parents (especially father) bless early life.", importance: 5 },
  "9in2":  { formation: "9th lord occupies the 2nd house.", effects: "Wealth through dharma, teaching, or fortune. Eloquence, family prosperity, inheritance. Ethical earnings.", importance: 5 },
  "9in3":  { formation: "9th lord occupies the 3rd house.", effects: "Courage in righteous pursuits, gains through siblings, skilled communication. Short journeys bring blessings.", importance: 3 },
  "9in4":  { formation: "9th lord occupies the 4th house.", effects: "Happy home, devoted mother, property and comfort via family lineage. Emotional contentment rooted in dharma.", importance: 4 },
  "9in5":  { formation: "9th lord occupies the 5th house.", effects: "Exceptional raja yoga (the two trikona lords align). Blessed children, intelligent, wise, dharmic, authority.", importance: 5 },
  "9in6":  { formation: "9th lord occupies the 6th house.", effects: "Victory over enemies through dharma. Profession in service; health improves after initial struggle. Disputes resolved favourably.", importance: 3 },
  "9in7":  { formation: "9th lord occupies the 7th house.", effects: "Fortunate marriage; spouse brings prosperity and dharmic support. International connections and partnerships flourish.", importance: 4 },
  "9in8":  { formation: "9th lord occupies the 8th house.", effects: "Hidden blessings — fortune manifests through inheritance, transformation, or unusual events. Late-life spiritual insight.", importance: 3 },
  "9in9":  { formation: "9th lord occupies the 9th (own) house.", effects: "Highly fortunate, virtuous, devoted to teacher and dharma. Respected scholar or leader; pilgrimage, philanthropy, spiritual realization.", importance: 5 },
  "9in10": { formation: "9th lord occupies the 10th house.", effects: "Dharma-karma fusion — career aligns with higher purpose. Fame through teaching, law, advisory, or dharmic institutions.", importance: 5 },
  "9in11": { formation: "9th lord occupies the 11th house.", effects: "Abundant gains through dharmic work, networks, elder siblings. Fulfilled desires and substantial income.", importance: 5 },
  "9in12": { formation: "9th lord occupies the 12th house.", effects: "Dharma via renunciation, foreign lands, spiritual practice. Wealth spent on charity; moksha-oriented life path.", importance: 3 },
  // 10th lord (career, karma, public standing) in each house
  "10in1": { formation: "10th lord occupies the 1st house.", effects: "Career shapes identity — the native IS their profession. Authority, public visibility, self-made success.", importance: 5 },
  "10in2": { formation: "10th lord occupies the 2nd house.", effects: "Career directly feeds wealth; strong income through profession. Family name contributes to career visibility.", importance: 5 },
  "10in3": { formation: "10th lord occupies the 3rd house.", effects: "Career through communication, writing, travel, sales, siblings. Entrepreneurial drive; short ventures succeed.", importance: 4 },
  "10in4": { formation: "10th lord occupies the 4th house.", effects: "Career built at home / from a family base. Real estate, property, mother-related themes. Inner stability drives outer success.", importance: 4 },
  "10in5": { formation: "10th lord occupies the 5th house.", effects: "Powerful raja yoga — career aligned with purpose and creative vision. Fame through teaching, performance, or intellectual work.", importance: 5 },
  "10in6": { formation: "10th lord occupies the 6th house.", effects: "Career in service industries, medicine, law, disputes. Hard work overcomes obstacles; steady promotion through diligence.", importance: 3 },
  "10in7": { formation: "10th lord occupies the 7th house.", effects: "Career through partnerships, public dealings, trade. Spouse supports or is part of the career path.", importance: 4 },
  "10in8": { formation: "10th lord occupies the 8th house.", effects: "Career in research, investigation, insurance, occult, transformation industries. Delayed but deep success; multiple shifts.", importance: 3 },
  "10in9": { formation: "10th lord occupies the 9th house.", effects: "Exceptional raja yoga — career merges with dharma, teaching, law, advisory, international work. Recognition as a guide or mentor.", importance: 5 },
  "10in10":{ formation: "10th lord occupies the 10th (own) house.", effects: "Peak career signature — high visibility, authority, institutional prominence. Digbala for career. Strong professional brand.", importance: 5 },
  "10in11":{ formation: "10th lord occupies the 11th house.", effects: "Career produces abundant gains, network support, fulfilled ambitions. Success through industry connections and goal orientation.", importance: 5 },
  "10in12":{ formation: "10th lord occupies the 12th house.", effects: "Career in foreign lands, isolation-dependent fields, spirituality, hospitals, charitable institutions. Behind-the-scenes influence.", importance: 3 },
};

function generateBhavaYogaRules(): Rule[] {
  const rules: Rule[] = [];
  const lords = [5, 9, 10];
  let sort = 200;
  for (const lord of lords) {
    for (let h = 1; h <= 12; h++) {
      const key = `${lord}in${h}`;
      const meta = LORD_IN_HOUSE_EFFECTS[key];
      if (!meta) continue;
      rules.push({
        slug: `bhava_${lord}_in_${h}`,
        name: `${lord}${ordinal(lord)} lord in ${h}${ordinal(h)} house`,
        category: h === lord ? "raja" :
                  lord === 5 && (h === 9 || h === 10) ? "raja" :
                  lord === 9 && (h === 5 || h === 10) ? "raja" :
                  lord === 10 && (h === 5 || h === 9) ? "raja" :
                  [6, 8, 12].includes(h) ? "dosha" : "special",
        chapter: 34,
        source: "BPHS Ch. 34 + Phaladeepika",
        classicalText: `Effects of ${lord}${ordinal(lord)} lord placed in the ${h}${ordinal(h)} bhava.`,
        formation: meta.formation,
        effects: meta.effects,
        importance: meta.importance,
        sortOrder: sort++,
        detector: { type: "bhava_yoga", lordOf: lord, inHouse: h },
      });
    }
  }
  return rules;
}

// ─── Kartari Yogas (per-planet & per-bhava) — permissive Reading B ──────────
// Permissive rule: at least one benefic in each flanking sign → Shubha Kartari.
// Same logic for malefics → Papa Kartari. Both flavours can co-exist on the
// same reference when the flanking is mixed on both sides.

const BHAVA_KARTARI_BASE_SORT = 350;

const HOUSE_NAMES: Record<number, string> = {
  1: "Lagna (self)",
  2: "Dhana (wealth)",
  3: "Sahaja (siblings)",
  4: "Sukha (home)",
  5: "Putra (children)",
  6: "Ripu (enemies)",
  7: "Yuvati (marriage)",
  8: "Ayu (longevity)",
  9: "Dharma (fortune)",
  10: "Karma (career)",
  11: "Labha (gains)",
  12: "Vyaya (losses)",
};

function generateKartariRules(): Rule[] {
  const rules: Rule[] = [];
  // Per-bhava only. In whole-sign houses, "Kartari around a planet" is
  // identical to "Kartari around the bhava the planet sits in" — emitting
  // both would always duplicate. Bhava-Kartari evidence is enriched with
  // the planets sitting in the flanked bhava so no info is lost.
  let sort = BHAVA_KARTARI_BASE_SORT;
  for (let bhava = 1; bhava <= 12; bhava++) {
    const houseName = HOUSE_NAMES[bhava];
    rules.push({
      slug: `shubha_kartari_bhava_${bhava}`,
      name: `Shubha Kartari Yoga (${bhava}${ordinal(bhava)} House)`,
      category: "special",
      chapter: 36,
      source: "Classical tradition; permissive reading per modern Vedic synthesizers",
      classicalText: `The ${bhava}${ordinal(bhava)} bhava is flanked by benefics in the adjacent signs.`,
      formation: `At least one benefic occupies the 12th from the ${bhava}${ordinal(bhava)} bhava AND at least one benefic occupies the 2nd from it.`,
      effects: `${houseName} themes are protected and uplifted by benefic influence from both directions — incoming and outgoing energies in this life area carry grace.`,
      importance: bhava === 1 || bhava === 7 || bhava === 10 ? 4 : 3,
      sortOrder: sort++,
      detector: { type: "kartari_bhava", benefic: true, bhava },
    });
    rules.push({
      slug: `papa_kartari_bhava_${bhava}`,
      name: `Papa Kartari Yoga (${bhava}${ordinal(bhava)} House)`,
      category: "dosha",
      chapter: 36,
      source: "Classical tradition; permissive reading per modern Vedic synthesizers",
      classicalText: `The ${bhava}${ordinal(bhava)} bhava is flanked by malefics in the adjacent signs.`,
      formation: `At least one malefic occupies the 12th from the ${bhava}${ordinal(bhava)} bhava AND at least one malefic occupies the 2nd from it.`,
      effects: `${houseName} themes face squeeze from malefic influences on both sides — friction in maintaining and acquiring within this life area; growth comes through navigating these pressures.`,
      importance: bhava === 1 || bhava === 7 || bhava === 10 ? 4 : 3,
      sortOrder: sort++,
      detector: { type: "kartari_bhava", benefic: false, bhava },
    });
  }
  return rules;
}

async function main() {
  const bhavaRules = generateBhavaYogaRules();
  RULES.push(...bhavaRules);

  const kartariRules = generateKartariRules();
  RULES.push(...kartariRules);

  // Drop legacy kartari rules now subsumed by bhava-kartari in whole-sign:
  //  - per-planet (each planet's flanking == its bhava's flanking)
  //  - lagna (== bhava 1)
  //  - moon (== whichever bhava the Moon sits in)
  const orphanSlugs = [
    ...["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
      .flatMap((p) => [`shubha_kartari_${p}`, `papa_kartari_${p}`]),
    "shubha_kartari_lagna", "papa_kartari_lagna",
    "shubha_kartari_moon",  "papa_kartari_moon",
  ];
  const deleted = await prisma.yogaRule.deleteMany({
    where: { slug: { in: orphanSlugs } },
  });
  if (deleted.count > 0) {
    console.log(`Deleted ${deleted.count} legacy kartari rules now subsumed by bhava-kartari.`);
  }

  console.log(`Seeding ${RULES.length} yoga rules (including ${bhavaRules.length} bhava yogas, ${kartariRules.length} kartari extensions)...`);

  let implicationsSeeded = 0;
  let implicationsMissing = 0;
  for (const r of RULES) {
    const implications = YOGA_IMPLICATIONS[r.slug] ?? null;
    if (implications) implicationsSeeded++;
    else implicationsMissing++;

    await prisma.yogaRule.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        name: r.name,
        category: r.category,
        chapter: r.chapter,
        source: r.source,
        classicalText: r.classicalText,
        formation: r.formation,
        effects: r.effects,
        implications,
        importance: r.importance,
        sortOrder: r.sortOrder,
        detector: r.detector as unknown as object,
      },
      update: {
        name: r.name,
        category: r.category,
        chapter: r.chapter,
        source: r.source,
        classicalText: r.classicalText,
        formation: r.formation,
        effects: r.effects,
        implications,
        importance: r.importance,
        sortOrder: r.sortOrder,
        detector: r.detector as unknown as object,
      },
    });
  }

  const byCategory = new Map<string, number>();
  for (const r of RULES) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
  console.log("Per category:");
  for (const [cat, n] of byCategory) console.log(`  ${cat.padEnd(12)}: ${n}`);
  console.log(`Total: ${RULES.length}`);
  console.log(`Implications seeded: ${implicationsSeeded} / ${RULES.length} (missing: ${implicationsMissing})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
