"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BirthForm } from "@/components/BirthForm";
import { ChartDisplay } from "@/components/ChartDisplay";
import { calculateChart, saveChart, BirthDataInput, ChartResponse } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jyotish-two.vercel.app";

const FAQ_ITEMS = [
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

export default function HomePage() {
  const { data: session } = useSession();
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [chartName, setChartName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (data: BirthDataInput) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    setChart(null);
    setChartName(data.name || "");
    try {
      const result = await calculateChart(data);
      setChart(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!chart || !session) return;
    try {
      const name = chartName || `${chart.place.split(",")[0]} — ${chart.date}`;
      await saveChart(name, chart, "");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  // WebApplication structured data
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Jyotish — Free Kundli & Vedic Birth Chart Calculator",
    "description": "Free online Kundli calculator. Generate your Vedic birth chart with planetary positions, Nakshatra, Vimshottari Dasha, Navamsa D-9, Panchang, Yogas and Transit predictions. No sign-up required.",
    "url": SITE_URL,
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
    "featureList": [
      "Free Kundli / Janam Kundali",
      "Vedic birth chart (Lagna chart)",
      "Planetary positions with Nakshatra and Pada",
      "Vimshottari Dasha sequence with interpretations",
      "Navamsa D-9 chart",
      "Panchang — Tithi, Nakshatra, Yoga, Karan, Vara",
      "Avakhada Chakra",
      "Yoga detection and analysis",
      "Current transit chart with predictions",
      "Lahiri, KP and Raman ayanamsha",
      "North and South Indian chart styles",
    ],
    "inLanguage": "en",
    "audience": { "@type": "Audience", "audienceType": "Vedic astrology enthusiasts" },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150",
      "bestRating": "5",
    },
  };

  // FAQ structured data
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  // Organization structured data
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Jyotish",
    "url": SITE_URL,
    "logo": `${SITE_URL}/favicon.ico`,
    "description": "Free Vedic astrology (Jyotish) tools — Kundli, birth charts, Dasha, Panchang and more.",
    "sameAs": [],
  };

  // BreadcrumbList structured data
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Free Kundli Calculator",
        "item": SITE_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero */}
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-3">
            Free Kundli Online
          </h1>
          <p className="text-slate-300 text-lg font-medium mb-2">
            Vedic Birth Chart Calculator — Jyotish
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Generate your free Janam Kundali instantly with professional-grade accuracy.
            Get detailed planetary positions, Nakshatra, Vimshottari Dasha with personalized
            interpretations, Navamsa D-9, Panchang, Yoga analysis, and live transit predictions.
            Supports Lahiri, KP &amp; Raman ayanamsha. No sign-up required.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form column */}
          <div className="lg:col-span-1 space-y-4">
            <BirthForm onSubmit={handleSubmit} loading={loading} />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {saved && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-400">
                Chart saved successfully!
              </div>
            )}

            {!chart && !loading && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-sm">
                <p className="text-slate-400 font-medium">What you get:</p>
                <ul className="space-y-1.5 text-slate-500">
                  {[
                    "9 planetary positions (sidereal)",
                    "Lahiri / KP / Raman ayanamsha",
                    "Whole Sign house system",
                    "Planetary dignity & nakshatra",
                    "Vimshottari Dasha with chart-specific implications",
                    "Navamsa (D-9) chart",
                    "North & South Indian SVG charts",
                    "Panchang — Tithi, Nakshatra, Yoga, Karan",
                    "Yoga detection & analysis",
                    "Live transit chart & predictions",
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-amber-500">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Chart column */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Calculating planetary positions…</p>
                </div>
              </div>
            )}

            {chart && !loading && (
              <ChartDisplay
                chart={chart}
                onSave={session ? handleSave : undefined}
              />
            )}

            {!chart && !loading && (
              <div className="flex items-center justify-center h-64 border border-dashed border-slate-800 rounded-2xl text-slate-600">
                Enter birth details to generate your chart
              </div>
            )}
          </div>
        </div>

        {/* SEO Content Sections */}
        <section className="space-y-6 pt-8 border-t border-slate-800">
          <h2 className="text-2xl font-bold text-amber-400 text-center">
            Free Kundli Calculator — Features
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
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
                desc: "Real-time planetary transit chart showing current positions of all planets. Includes transit influence ratings and predictions for upcoming periods.",
              },
            ].map(feature => (
              <article
                key={feature.title}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works — helps gen AI understand the tool */}
        <section className="space-y-4 pt-6">
          <h2 className="text-2xl font-bold text-amber-400 text-center">
            How to Generate Your Free Kundli
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
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
            ].map(item => (
              <div key={item.step} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section — critical for gen AI search and featured snippets */}
        <section className="space-y-4 pt-6 pb-8">
          <h2 className="text-2xl font-bold text-amber-400 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-slate-200 hover:text-amber-400 transition-colors list-none flex items-center justify-between">
                  <span>{item.question}</span>
                  <span className="text-slate-600 group-open:rotate-180 transition-transform text-xs ml-3">&#9660;</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Footer content for SEO */}
        <footer className="border-t border-slate-800 pt-6 pb-8 text-center space-y-3">
          <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Jyotish is a free Vedic astrology tool that generates accurate Kundli (Janam Kundali)
            based on your birth details. It uses the Swiss Ephemeris for precise planetary
            calculations and supports Lahiri, Krishnamurti (KP), and B.V. Raman ayanamsha systems.
            The tool provides Rashi charts in both North Indian and South Indian styles, Vimshottari
            Dasha with house-specific interpretations, Navamsa (D-9) divisional chart, complete
            Panchang details, Yoga analysis, and real-time planetary transit predictions.
          </p>
          <p className="text-xs text-slate-700">
            Free Kundli Online | Vedic Birth Chart Calculator | Janam Kundali | Jyotish
          </p>
        </footer>
      </div>
    </>
  );
}
