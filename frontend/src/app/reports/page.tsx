"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface PurchasedReport {
  id: string;
  reportType: string;
  birthName: string | null;
  birthData: { date: string; time: string; place: string };
  status: string;
  createdAt: string;
}

const REPORT_TYPES = [
  {
    id: "ayurvedic_wellness",
    title: "Ayurvedic Wellness Report",
    description:
      "A comprehensive health and wellness analysis based on your Vedic birth chart. Includes dosha constitution (Prakriti), body type profile, health planet analysis, vulnerable body areas, dietary and yoga recommendations, lifestyle guidance, health period timeline, and Ayurvedic remedies.",
    price: 200,
    currency: "INR",
    href: "/reports/ayurvedic",
    icon: "\u{1F33F}",
    features: [
      "Dosha Constitution (Vata/Pitta/Kapha)",
      "Body Type & Metabolism Profile",
      "Health Planet Analysis (6 planets)",
      "Vulnerable Body Areas Map",
      "Personalized Diet & Spice Guide",
      "Yoga & Pranayama Recommendations",
      "Health Period Timeline from Dasha",
      "Gemstone & Mantra Remedies",
    ],
  },
];

export default function ReportsPage() {
  const { data: session } = useSession();
  const [myReports, setMyReports] = useState<PurchasedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoadingReports(true);
    fetch("/api/reports")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyReports)
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, [session]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center py-6">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">Vedic Reports</h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Detailed, personalized reports based on your Vedic birth chart.
          Each report is generated specifically for your planetary positions and can be downloaded as PDF.
        </p>
      </header>

      {/* My Reports (logged-in users) */}
      {session && myReports.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-400">My Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myReports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/ayurvedic?id=${r.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {REPORT_TYPES.find((t) => t.id === r.reportType)?.title ?? r.reportType}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.birthName ? `${r.birthName} \u00b7 ` : ""}
                      {r.birthData.date} \u00b7 {r.birthData.place?.split(",")[0]}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
                    Purchased
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {session && loadingReports && (
        <div className="flex items-center justify-center h-16 text-slate-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Available Reports */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Available Reports</h2>
        <div className="grid grid-cols-1 gap-6">
          {REPORT_TYPES.map((report) => (
            <div
              key={report.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <span className="text-2xl">{report.icon}</span>
                      {report.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{report.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-amber-400">
                      \u20b9{report.price}
                    </p>
                    <p className="text-xs text-slate-500">one-time</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {report.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-amber-500 flex-shrink-0">\u2713</span>
                      {f}
                    </div>
                  ))}
                </div>

                <Link
                  href={report.href}
                  className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
                >
                  Generate Report \u2192
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coming soon placeholder */}
      <section className="border border-dashed border-slate-800 rounded-2xl p-8 text-center">
        <p className="text-slate-600 text-sm">
          More reports coming soon \u2014 Career & Finance Report, Marriage Compatibility Report, Annual Prediction Report
        </p>
      </section>
    </div>
  );
}
