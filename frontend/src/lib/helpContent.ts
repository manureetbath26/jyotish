/**
 * Shared help / FAQ content.
 *
 * Used by the logged-out landing page (SEO + conversion) and the
 * dedicated /help page (logged-in users). Keeping this in one place
 * avoids drift and lets both surfaces share identical JSON-LD output
 * for search engines.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is a Kundli (Janam Kundali)?",
    answer:
      "A Kundli, also called Janam Kundali or Vedic birth chart, is an astrological diagram that maps the exact positions of the nine Vedic planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu) at the precise time and place of your birth. It uses the sidereal zodiac and forms the foundation of Vedic astrology (Jyotish) for predicting life events, personality traits, and planetary influences.",
  },
  {
    question: "How is a Vedic birth chart different from a Western horoscope?",
    answer:
      "Vedic astrology (Jyotish) uses the sidereal zodiac, which accounts for the precession of equinoxes via an ayanamsha correction (typically ~24 degrees). Western astrology uses the tropical zodiac. This means your Vedic Sun sign may differ from your Western sign. Vedic charts also use the Whole Sign house system and emphasize the Moon sign (Rashi), Nakshatra (lunar mansion), and Dasha periods for predictions.",
  },
  {
    question: "What is Vimshottari Dasha and why is it important?",
    answer:
      "Vimshottari Dasha is the most widely used planetary period system in Vedic astrology. It divides your life into major periods (Mahadasha) ruled by each of the nine planets, spanning a total cycle of 120 years. Each Mahadasha has sub-periods (Antardasha). The Dasha system helps predict when specific life events related to career, relationships, health, and finances are likely to occur based on which planet's period you are currently running.",
  },
  {
    question: "What is Navamsa (D-9) chart and what does it reveal?",
    answer:
      "The Navamsa chart (D-9) is the most important divisional chart in Vedic astrology. It divides each zodiac sign into 9 equal parts of 3 degrees 20 minutes each. The Navamsa chart is primarily used to assess the strength of planets, evaluate marriage and partnership compatibility, and understand the deeper soul-level purpose of planetary placements. It complements the main birth chart (Rashi chart) for a complete reading.",
  },
  {
    question: "What ayanamsha options are supported?",
    answer:
      "Jyotish supports three popular ayanamsha systems: Lahiri (Chitrapaksha) — the most widely used in India and the official standard of the Indian government; Krishnamurti (KP) — used in the Krishnamurti Paddhati system for precise predictions; and B.V. Raman — an alternative calculation by the renowned Indian astrologer B.V. Raman. You can select your preferred ayanamsha before generating the chart.",
  },
  {
    question: "What is Panchang and what information does it provide?",
    answer:
      "Panchang is the Vedic almanac that provides five key elements for any given date and time: Tithi (lunar day), Nakshatra (lunar mansion), Yoga (luni-solar combination), Karana (half of Tithi), and Vara (day of the week). This information is essential for determining auspicious timings (Muhurta) for important events like marriages, business ventures, travel, and religious ceremonies.",
  },
  {
    question: "How accurate are the planetary calculations?",
    answer:
      "Jyotish uses the Swiss Ephemeris (swisseph), the gold standard in astronomical computation used by professional astrologers worldwide. It provides planetary positions accurate to sub-arc-second precision. Combined with accurate geocoding of your birth place and proper timezone conversion, the resulting charts are of professional-grade accuracy suitable for serious astrological analysis.",
  },
  {
    question: "What are Yogas in Vedic astrology?",
    answer:
      "Yogas are special planetary combinations in a birth chart that indicate specific life outcomes. They are formed when planets occupy certain houses, signs, or relationships with each other. Beneficial yogas like Raja Yoga (power and authority), Dhana Yoga (wealth), and Gajakesari Yoga (wisdom and fame) indicate positive outcomes, while challenging yogas indicate areas requiring attention. Jyotish automatically detects and displays all major yogas in your chart.",
  },
];

export const FEATURE_CARDS = [
  {
    title: "Vedic Birth Chart (Rashi)",
    desc: "Get your complete Lagna chart with all 9 planets plotted in the 12 houses using the Whole Sign system. View in both North Indian and South Indian chart styles.",
  },
  {
    title: "Vimshottari Dasha",
    desc: "Full 120-year Vimshottari Dasha sequence with Mahadasha and Antardasha periods. Each dasha includes personalized interpretations based on your chart's house lordships.",
  },
  {
    title: "Navamsa (D-9) Chart",
    desc: "The most important divisional chart for assessing planetary strength, marriage prospects, and soul-level purpose. Includes planet-in-sign analysis.",
  },
  {
    title: "Panchang Details",
    desc: "Complete Panchang for your birth moment — Tithi, Nakshatra with pada, Yoga, Karana, and Vara. Essential for Muhurta and ritual timing.",
  },
  {
    title: "Yoga Analysis",
    desc: "Automatic detection of all major Vedic yogas in your chart including Raja Yoga, Dhana Yoga, Gajakesari Yoga, and more with explanations.",
  },
  {
    title: "Live Transit Predictions",
    desc: "See current planetary transits and their effects on your natal chart. Track upcoming planetary movements and their astrological significance.",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Enter Birth Details",
    desc: "Provide your date of birth, exact time of birth, and place of birth. Select your preferred ayanamsha (Lahiri, KP, or Raman).",
  },
  {
    step: "2",
    title: "Generate Chart",
    desc: "Click 'Calculate Chart' and our engine computes precise planetary positions using the Swiss Ephemeris with automatic timezone and coordinate detection.",
  },
  {
    step: "3",
    title: "Explore Your Chart",
    desc: "Browse through Panchang, Birth Chart, Planets, Houses, Dasha, Navamsa, Yogas, and Transits tabs for a comprehensive reading.",
  },
];
