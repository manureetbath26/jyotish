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

interface CatalogEntry {
  slug: string;
  name: string;
  description: string | null;
  price: number;
  adminOnly?: boolean;
}

const REPORT_META: Record<string, { href: string; icon: string; badge?: string; features: string[] }> = {
  life_events_prediction: {
    href: "/reports/life-events",
    icon: "\u{1F52E}",
    badge: "Most Popular",
    features: [
      "Complete 12-House Life Area Analysis",
      "Planetary Strength & Dignity Assessment",
      "Life Area Outlook with Category Insights",
      "Full Dasha Timeline with Event Mapping",
      "Current Period Deep Dive & Remedies",
      "Key Yoga Influences (Raja, Dhana, etc.)",
      "Downloadable PDF Report",
      "Empathetic Guidance & Cautions",
    ],
  },
  ayurvedic_wellness: {
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
  chara_dasha: {
    href: "/reports/chara-dasha",
    icon: "\u{1F52E}",
    badge: "New",
    features: [
      "Jaimini Chara Dasha Timeline",
      "12-Sign Dasha Sequence with Durations",
      "Visual Timeline with Duration Bars",
      "Current Period Deep Dive & Progress",
      "Sign Lord Placement Analysis",
      "Planets in Each Dasha Sign",
      "Chronological Table View",
      "Scalable for Antardasha & Interpretations",
    ],
  },
  career: {
    href: "/reports/career",
    icon: "\u{1F4BC}",
    badge: "New",
    features: [
      "Career Verdict & Confidence Rating",
      "Career Nature: Job vs Business vs Independent",
      "Sector & Industry Suggestions",
      "Career Growth Timeline (Past & Future)",
      "Promotion & Recognition Windows",
      "Current Dasha Career Theme",
      "Growth Indicators & Stagnation Risks",
      "Natal Career Profile (10H, AmK, A10, Karakamsha)",
    ],
  },
  yoga: {
    href: "/reports/yoga",
    icon: "\u2728",
    badge: "New",
    features: [
      "40+ classical yogas detected automatically",
      "Pancha Mahapurusha (Ruchaka, Bhadra, Hamsa, Malavya, Sasha)",
      "Nabhasa — Rajju, Musala, Nala, Maala, Sarpa, Gola, Veena, etc.",
      "Gaja Kesari, Amala, Parvata, Lakshmi, Chamara, Kalanidhi",
      "Chandra yogas (Adhi, Sunapha, Anapha, Duradhara, KemaDruma)",
      "Surya yogas (Vesi, Vosi, Ubhayachari)",
      "Raja Yogas (Maha Raja, Kendra-Kona)",
      "Dhana (Wealth) & Daridra (Poverty) yogas",
      "Doshas: Sarpa, Shakata, Kema Druma, Kala Sarpa, Daridra",
      "Each yoga: formation, effects, classical source (BPHS Ch. 34-43)",
    ],
  },
  finance: {
    href: "/reports/finance",
    icon: "\u{1F4B0}",
    badge: "New",
    features: [
      "Headline wealth verdict (0-100 score)",
      "Dhana yogas + Lakshmi, Kubera, Kalanidhi signatures",
      "Ashtakvarga health for H2, H5, H9, H11 + dusthanas",
      "Income source profile (sectors + business vs job)",
      "Savings vs expense axis (retention score)",
      "Jaimini Arudha analysis (A2, A11)",
      "Current wealth period (Vimshottari)",
      "Best 3-5 wealth windows in next 5 years",
      "Caution windows + classical remedies",
      "Quarter-by-quarter forward timeline",
    ],
  },
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const [myReports, setMyReports] = useState<PurchasedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "my">("available");

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(myReports.map((r) => r.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  }

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

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    // Fire deletes in parallel; tolerate individual failures.
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/reports/purchase/${id}`, { method: "DELETE" }).then((r) => ({ id, ok: r.ok })),
      ),
    );
    const deleted = new Set<string>();
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) deleted.add(r.value.id);
    }
    setMyReports((prev) => prev.filter((r) => !deleted.has(r.id)));
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  useEffect(() => {
    fetch("/api/reports/catalog")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCatalogEntries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoadingReports(true);
    fetch("/api/reports")
      .then((r) => (r.ok ? r.json() : []))
      .then((rs: PurchasedReport[]) => {
        setMyReports(rs);
      })
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

      {/* Tab switcher — only shown to signed-in users */}
      {session && (
        <div className="flex items-center gap-1 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("available")}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "available"
                ? "text-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Available Reports
            {activeTab === "available" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "text-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            My Reports
            {myReports.length > 0 && (
              <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === "my"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-800 text-slate-500"
              }`}>
                {myReports.length}
              </span>
            )}
            {activeTab === "my" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>
        </div>
      )}

      {/* My Reports (logged-in users, active tab) */}
      {session && activeTab === "my" && myReports.length === 0 && !loadingReports && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl space-y-2">
          <p className="text-slate-400">You haven&apos;t generated any reports yet.</p>
          <button
            onClick={() => setActiveTab("available")}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            Browse available reports {"\u2192"}
          </button>
        </div>
      )}

      {session && activeTab === "my" && myReports.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-amber-400">My Reports</h2>
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Select &amp; delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {selectedIds.size} selected
                </span>
                {selectedIds.size < myReports.length && (
                  <button
                    onClick={selectAll}
                    className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Select all
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={selectedIds.size === 0}
                  className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete selected
                </button>
                <button
                  onClick={exitSelectMode}
                  className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Bulk delete confirmation bar */}
          {confirmBulkDelete && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-red-200">
                Permanently delete <strong>{selectedIds.size}</strong> report{selectedIds.size === 1 ? "" : "s"}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 bg-red-500/30 text-red-100 border border-red-500/50 rounded-lg text-xs font-medium hover:bg-red-500/40 transition-colors disabled:opacity-50"
                >
                  {bulkDeleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myReports.map((r) => {
              const meta = REPORT_META[r.reportType];
              const reportHref = meta ? `${meta.href}?id=${r.id}` : `/reports/ayurvedic?id=${r.id}`;
              const catalogEntry = catalogEntries.find((c) => c.slug === r.reportType);
              const isConfirming = confirmDeleteId === r.id;
              const isDeleting = deletingId === r.id;
              const isSelected = selectedIds.has(r.id);
              return (
              <div
                key={r.id}
                onClick={selectMode ? () => toggleSelected(r.id) : undefined}
                className={`bg-slate-900 border rounded-xl p-4 transition-colors relative ${
                  selectMode
                    ? isSelected
                      ? "border-amber-500 ring-1 ring-amber-500/40 cursor-pointer"
                      : "border-slate-800 hover:border-amber-500/40 cursor-pointer"
                    : "border-slate-800 hover:border-amber-500/30"
                }`}
              >
                {selectMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>
                )}
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

                {selectMode ? (
                  <div className={`flex items-start justify-between ${selectMode ? "pl-6" : ""}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {catalogEntry?.name ?? r.reportType}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.birthName ? `${r.birthName} \u00B7 ` : ""}
                        {r.birthData.date} {"\u00B7"} {r.birthData.place?.split(",")[0]}
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
                ) : (
                  <>
                <Link href={reportHref}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {catalogEntry?.name ?? r.reportType}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.birthName ? `${r.birthName} \u00B7 ` : ""}
                        {r.birthData.date} {"\u00B7"} {r.birthData.place?.split(",")[0]}
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
                  </>
                )}
              </div>
              );
            })}
          </div>
        </section>
      )}
      {session && activeTab === "my" && loadingReports && (
        <div className="flex items-center justify-center h-16 text-slate-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Available Reports — always visible for signed-out users, gated for signed-in */}
      {(!session || activeTab === "available") && (
      <section className="space-y-4">
        {!session && <h2 className="text-lg font-semibold text-slate-200">Available Reports</h2>}
        <div className="grid grid-cols-1 gap-6">
          {catalogEntries.map((entry) => {
            const meta = REPORT_META[entry.slug];
            if (!meta) return null;
            return (
              <div
                key={entry.slug}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <span className="text-2xl">{meta.icon}</span>
                        {entry.name}
                        {meta.badge && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium">
                            {meta.badge}
                          </span>
                        )}
                        {entry.adminOnly && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5 font-medium">
                            Admin Preview
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{entry.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-amber-400">
                        {"\u20B9"}{entry.price / 100}
                      </p>
                      <p className="text-xs text-slate-500">one-time</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {meta.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-amber-500 flex-shrink-0">{"\u2713"}</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={meta.href}
                    className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Generate Report {"\u2192"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Coming soon placeholder — only on Available tab / signed-out view */}
      {(!session || activeTab === "available") && (
        <section className="border border-dashed border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-slate-600 text-sm">
            More reports coming soon — Career & Finance Report, Marriage Compatibility Report, Annual Transit Report
          </p>
        </section>
      )}
    </div>
  );
}
