"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { calculateChart, ChartResponse } from "@/lib/api";
import { generateLifeEventsReport, LifeEventsReport } from "@/lib/lifeEventsReport";
import { LifeEventsReportView } from "@/components/reports/LifeEventsReportView";

const UPI_ID = "9872653657@ybl";
const REPORT_PRICE = 800;

function buildUpiLink(amount: number, note: string) {
  return `upi://pay?pa=${UPI_ID}&pn=Jyotish&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

type Step = "birth" | "preview" | "payment" | "report";

export default function LifeEventsReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LifeEventsReportContent />
    </Suspense>
  );
}

function LifeEventsReportContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  const [step, setStep] = useState<Step>("birth");

  // Birth form
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  // Chart & report
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [report, setReport] = useState<LifeEventsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment
  const [email, setEmail] = useState(session?.user?.email || "");
  const [upiRef, setUpiRef] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Coupon
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing report
  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    fetch(`/api/reports/purchase/${reportId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.chartData && data.status === "verified") {
          const chartData = data.chartData as ChartResponse;
          setChart(chartData);
          const rpt = data.reportData
            ? (data.reportData as LifeEventsReport)
            : generateLifeEventsReport(chartData);
          setReport(rpt);
          setName(data.birthName || "");
          setStep("report");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId]);

  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  // Place autocomplete
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(place);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [place]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    setLoading(true);
    setError(null);
    try {
      const result = await calculateChart({ date, time, place });
      setChart(result);
      const rpt = generateLifeEventsReport(result);
      setReport(rpt);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chart calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponMsg(null);
    try {
      const res = await fetch("/api/reports/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon: coupon.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCouponApplied(true);
        setCouponMsg({
          type: "success",
          text: `Coupon applied! ${data.discount === 100 ? "Report is free!" : `${data.discount}% off`}`,
        });
      } else {
        setCouponMsg({ type: "error", text: data.error || "Invalid coupon code" });
      }
    } catch {
      setCouponMsg({ type: "error", text: "Failed to validate coupon" });
    }
  };

  const handleFreePurchase = async () => {
    if (!couponApplied) return;
    const purchaseEmail = email || session?.user?.email || "free@coupon.user";
    setPayLoading(true);
    setPayMsg(null);
    try {
      const res = await fetch("/api/reports/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: purchaseEmail,
          couponCode: coupon.trim(),
          reportType: "life_events_prediction",
          birthName: name || null,
          birthData: { date, time, place },
          chartData: chart,
          reportData: report,
        }),
      });
      if (res.ok) {
        setStep("report");
      } else {
        const data = await res.json();
        setPayMsg({ type: "error", text: data.error || "Purchase failed" });
      }
    } catch {
      setPayMsg({ type: "error", text: "Something went wrong." });
    } finally {
      setPayLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !upiRef) return;
    setPayLoading(true);
    setPayMsg(null);
    try {
      const res = await fetch("/api/reports/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          upiTransactionId: upiRef,
          reportType: "life_events_prediction",
          birthName: name || null,
          birthData: { date, time, place },
          chartData: chart,
          reportData: report,
        }),
      });
      if (res.ok) {
        setPayMsg({ type: "success", text: "Payment recorded! Loading your report..." });
        setTimeout(() => setStep("report"), 1000);
      } else {
        const data = await res.json();
        setPayMsg({ type: "error", text: data.error || "Purchase failed" });
      }
    } catch {
      setPayMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPayLoading(false);
    }
  };

  const upiLink = buildUpiLink(REPORT_PRICE, "Jyotish Life Events Report");

  if (loading && !chart) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-48 text-slate-500">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Calculating your chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F52E}"}</span>
          Life Events Prediction Report
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover the key milestones, opportunities, and turning points indicated in your Vedic birth chart
        </p>
      </header>

      {/* Progress */}
      <div className="flex items-center justify-center gap-1 text-xs">
        {(["birth", "preview", "payment", "report"] as Step[]).map((s, i) => {
          const labels = ["Birth Details", "Preview", "Payment", "Full Report"];
          const isCurrent = s === step;
          const isPast =
            ["birth", "preview", "payment", "report"].indexOf(step) >
            ["birth", "preview", "payment", "report"].indexOf(s);
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-700 mx-1">{"\u2014"}</span>}
              <span
                className={`px-2.5 py-1 rounded-full ${
                  isCurrent
                    ? "bg-amber-500 text-black font-semibold"
                    : isPast
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Birth Details */}
      {step === "birth" && (
        <form onSubmit={handleCalculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-amber-400">Enter Birth Details</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Accurate birth details are essential for precise predictions. Even a few minutes difference
            in birth time can shift the ascendant and change the dasha timeline significantly.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date of Birth</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time of Birth</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Place of Birth</label>
            <input
              type="text"
              value={place}
              onChange={(e) => {
                setPlace(e.target.value);
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. Mumbai, India"
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => {
                      selectedRef.current = true;
                      setPlace(s);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer truncate"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Calculating Chart..." : "Calculate & Preview Report"}
          </button>
        </form>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && report && chart && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400">Report Preview</h2>
            <p className="text-xs text-slate-500">
              {name ? `${name} \u00b7 ` : ""}
              {chart.lagna} Lagna \u00b7 {chart.place.split(",")[0]} \u00b7 {chart.date}
            </p>

            {/* Chart summary preview */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Your Chart at a Glance</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-amber-400">{report.chartSummary.lagna}</p>
                  <p className="text-xs text-slate-500">Ascendant</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-400">{report.chartSummary.moonSign}</p>
                  <p className="text-xs text-slate-500">Moon Sign</p>
                </div>
              </div>
            </div>

            {/* Event categories outlook preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Life Area Outlook</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {report.eventCategories.slice(0, 6).map((cat: { id: string; icon: string; name: string; overallOutlook: string }) => {
                  const outlookColors: Record<string, string> = {
                    very_favorable: "text-green-400",
                    favorable: "text-green-400/80",
                    mixed: "text-amber-400",
                    challenging: "text-orange-400",
                    needs_care: "text-red-400",
                  };
                  const outlookLabels: Record<string, string> = {
                    very_favorable: "Very Favorable",
                    favorable: "Favorable",
                    mixed: "Mixed",
                    challenging: "Challenging",
                    needs_care: "Needs Care",
                  };
                  return (
                    <div key={cat.id} className="bg-slate-800/40 rounded-lg p-2.5 text-center">
                      <p className="text-lg">{cat.icon}</p>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">{cat.name}</p>
                      <p className={`text-xs mt-0.5 font-semibold ${outlookColors[cat.overallOutlook] || "text-slate-400"}`}>
                        {outlookLabels[cat.overallOutlook] || cat.overallOutlook}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming highlights teaser */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Full report includes:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Complete 12-House Analysis",
                  "Planetary Strength Assessment",
                  "20+ Event Category Predictions",
                  "Full Dasha Timeline with Events",
                  "Top 15 Life Event Highlights",
                  "Key Yoga Influences",
                  "Personalized Remedial Suggestions",
                  "Downloadable PDF Report",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-amber-500">{"\u2713"}</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Past events preview — shown in full to build trust */}
            {report.pastHighlights && report.pastHighlights.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span>{"\u{1F550}"}</span>
                    Key Events Your Chart Indicated for the Past
                  </h3>
                  <span className="text-xs text-slate-600">Do these resonate?</span>
                </div>
                <p className="text-xs text-slate-500">
                  See if these past planetary indicators match your actual life experience \u2014
                  this can give you a sense of how your chart{"\u2019"}s predictions work for you.
                </p>
                <div className="space-y-2">
                  {report.pastHighlights.slice(0, 4).map((h: { event: string; type: string; window: string; dashaContext: string; reasoning: string }, i: number) => (
                    <div
                      key={i}
                      className={`rounded-lg p-3 border ${
                        h.type === "positive"
                          ? "bg-green-500/5 border-green-500/10"
                          : h.type === "negative"
                          ? "bg-red-500/5 border-red-500/10"
                          : "bg-amber-500/5 border-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-200">{h.event}</span>
                        <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">Past</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                        <span>{h.window}</span>
                        <span className="text-slate-700">|</span>
                        <span>{h.dashaContext}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{h.reasoning}</p>
                    </div>
                  ))}
                </div>
                {report.pastHighlights.length > 4 && (
                  <p className="text-xs text-amber-400/70 text-center">
                    + {report.pastHighlights.length - 4} more past events in the full report
                  </p>
                )}
              </div>
            )}

            {/* Blurred teaser for future predictions */}
            <div className="relative overflow-hidden rounded-xl">
              <div className="blur-sm pointer-events-none select-none opacity-40 space-y-2 p-4 bg-slate-800/30">
                <p className="text-sm text-slate-300 font-medium">Upcoming Life Highlights</p>
                <p className="text-xs text-slate-400">
                  Based on your planetary periods and house lordships,
                  the indicators suggest significant developments in career and relationships...
                </p>
                <p className="text-sm text-slate-300 font-medium mt-3">Dasha-by-Dasha Predictions</p>
                <p className="text-xs text-slate-400">
                  Your planetary periods activate houses related to wealth, partnerships, career,
                  and more — with specific timing windows for each...
                </p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-xl">
                <p className="text-sm text-amber-400 font-semibold">{"\uD83D\uDD12"} Purchase to unlock full report</p>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Have a coupon code?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setCouponApplied(false);
                  setCouponMsg(null);
                }}
                placeholder="Enter coupon code"
                disabled={couponApplied}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponApplied || !coupon.trim()}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {couponApplied ? "\u2713 Applied" : "Apply"}
              </button>
            </div>
            {couponMsg && (
              <p className={`text-xs ${couponMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {couponMsg.text}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("birth")}
              className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              {"\u2190"} Edit Details
            </button>
            {couponApplied ? (
              <button
                onClick={handleFreePurchase}
                disabled={payLoading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {payLoading ? "Processing..." : "Get Free Report \u2192"}
              </button>
            ) : (
              <button
                onClick={() => setStep("payment")}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Purchase Report {"\u2014"} {"\u20b9"}{REPORT_PRICE}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-amber-400">Payment</h2>
          <p className="text-sm text-slate-400">
            Pay {"\u20b9"}{REPORT_PRICE} via UPI to receive your complete Life Events Prediction Report.
          </p>

          <div className="flex flex-col items-center gap-3 py-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={upiLink} size={180} />
            </div>
            <p className="text-xs text-slate-500">Scan with any UPI app</p>
            <p className="text-xs text-slate-600">
              UPI ID: <span className="text-slate-400 font-mono">{UPI_ID}</span>
            </p>
          </div>

          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-600">Report will be linked to this email.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                UPI Transaction / Reference ID
              </label>
              <input
                type="text"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                placeholder="e.g. 426913879453"
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-600">Enter the 12-digit transaction ID from your UPI payment receipt.</p>
            </div>

            {payMsg && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  payMsg.type === "success"
                    ? "bg-green-500/10 border border-green-500/30 text-green-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {payMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
              >
                {"\u2190"} Back
              </button>
              <button
                type="submit"
                disabled={payLoading}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {payLoading ? "Processing..." : `Confirm Payment \u2014 \u20b9${REPORT_PRICE}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Full Report */}
      {step === "report" && report && chart && (
        <div className="space-y-4">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : setStep("preview")}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{"\u2190"}</span> Back to Reports
          </button>
          <LifeEventsReportView report={report} chart={chart} name={name} />
        </div>
      )}
    </div>
  );
}
