"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BirthForm } from "@/components/BirthForm";
import { ChartDisplay } from "@/components/ChartDisplay";
import { calculateChart, saveChart, BirthDataInput, ChartResponse } from "@/lib/api";

export default function HomePage() {
  const { data: session } = useSession();
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (data: BirthDataInput) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    setChart(null);
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
      const name = `${chart.place} — ${chart.date}`;
      await saveChart(name, chart, "");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Jyotish — Free Kundli & Vedic Birth Chart Calculator",
    "description": "Free online Kundli calculator. Generate your Vedic birth chart with planetary positions, Nakshatra, Vimshottari Dasha, Navamsa D-9, Panchang and Avakhada. No sign-up required.",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://jyotish.app",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
    "featureList": [
      "Free Kundli / Janam Kundali",
      "Vedic birth chart (Lagna chart)",
      "Planetary positions with Nakshatra and Pada",
      "Vimshottari Dasha sequence",
      "Navamsa D-9 chart",
      "Panchang — Tithi, Nakshatra, Yoga, Karan, Vara",
      "Avakhada Chakra",
      "Lahiri, KP and Raman ayanamsha",
      "North and South Indian chart styles",
    ],
    "inLanguage": "en",
    "audience": { "@type": "Audience", "audienceType": "Vedic astrology enthusiasts" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-amber-400 mb-3">
          ☿ Free Kundli Online
        </h1>
        <p className="text-slate-300 text-lg font-medium mb-2">
          Vedic Birth Chart Calculator — Jyotish
        </p>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Generate your free Kundli instantly. Accurate planetary positions, Nakshatra,
          Vimshottari Dasha, Navamsa D-9, Panchang &amp; Avakhada. No sign-up required.
        </p>
      </div>

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
                  "Vimshottari Dasha sequence",
                  "Navamsa (D-9) chart",
                  "North & South Indian SVG charts",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-amber-500">✓</span>
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
    </div>
    </>
  );
}
