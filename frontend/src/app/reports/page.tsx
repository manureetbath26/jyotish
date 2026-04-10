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

const REPORT_TYPES: Array<{
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  href: string;
  icon: string;
  badge?: string;
  features: string[];
}> = [
  {
    id: "life_events_prediction",
    title: "Life Events Prediction Report",
    description:
      "A comprehensive life prediction report based on your Vimshottari Dasha timeline, house lordships, and planetary strengths. Covers marriage, children, career growth, wealth, health, relationships, and more \u2014 with empathetic, nuanced guidance for each life phase.",
    price: 800,
    currency: "INR",
    href: "/reports/life-events",
    icon: "\u{1F52E}",
    badge: "Most Popular",
    features: [
      "Complete 12-House Life Area Analysis",
      "Planetary Strength & Dignity Assessment",
      "20+ Life Event Category Predictions",
      "Full Dasha Timeline with Event Mapping",
      "Current Period Deep Dive & Remedies",
      "Top 15 Upcoming Life Highlights",
      "Key Yoga Influences (Raja, Dhana, etc.)",
      "Empathetic Guidance & Cautions",
    ],
  },
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/purchase/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMyReports((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

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
            {myReports.map((r) => {
              const reportDef = REPORT_TYPES.find((t) => t.id === r.reportType);
              const reportHref = reportDef ? `${reportDef.href}?id=${r.id}` : `/reports/ayurvedic?id=${r.id}`;
              const isConfirming = confirmDeleteId === r.id;
              const isDeleting = deletingId === r.id;
              return (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/30 transition-colors relative"
              >
                {/* Confirm delete overlay */}
                {isConfirming && (
                  <div className="absolute inset-0 bg-slate-900/95 rounded-xl flex items-center justify-center z-10 p-4">
                    <div className="text-center space-y-3">
                      <p className="text-sm text-slate-300">Delete this report?</p>
                      <p className="text-xs text-slate-500">This action cannot be undone.</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <Link href={reportHref}>
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
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteId(r.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete report"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
              );
            })}
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
                      {report.badge && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium">
                          {report.badge}
                        </span>
                      )}
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
          More reports coming soon \u2014 Career & Finance Report, Marriage Compatibility Report, Annual Transit Report
        </p>
      </section>
    </div>
  );
}
