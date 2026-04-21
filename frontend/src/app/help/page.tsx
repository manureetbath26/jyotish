import type { Metadata } from "next";
import { FAQ_ITEMS, FEATURE_CARDS, HOW_IT_WORKS } from "@/lib/helpContent";

export const metadata: Metadata = {
  title: "Help & FAQ — Jyotish",
  description:
    "Features, how-to guide, and frequently asked questions about Jyotish — the free Vedic birth chart calculator.",
};

export default function HelpPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">Help &amp; FAQ</h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Everything about Jyotish — what it computes, how to use it, and the classical concepts
            behind each section of your kundli.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400 text-center">
            Free Kundli Calculator {"\u2014"} Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_CARDS.map((feat) => (
              <div
                key={feat.title}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2"
              >
                <h3 className="text-sm font-semibold text-slate-200">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400 text-center">
            How to Generate Your Free Kundli
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"
              >
                <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 pb-6">
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
                  <span className="text-slate-600 group-open:rotate-180 transition-transform text-xs ml-3">
                    {"\u25BC"}
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-400 leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
