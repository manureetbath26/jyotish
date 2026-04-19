"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { calculateChart, ChartResponse } from "@/lib/api";
import { CareerReportView } from "@/components/reports/CareerReportView";
import { ProfileSelector, type SelectedSource } from "@/components/ProfileSelector";

const UPI_ID = "9872653657@ybl";
const DEFAULT_REPORT_PRICE = 500;

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

export default function CareerReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CareerReportContent />
    </Suspense>
  );
}

function CareerReportContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  const [step, setStep] = useState<Step>("birth");

  // Profile selection
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Birth form
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  const handleProfileSelect = (sel: SelectedSource) => {
    if (sel.kind === "profile") {
      const p = sel.profile;
      setSelectedProfileId(p.id);
      setName(p.name);
      setDate(p.dateOfBirth);
      setTime(p.timeOfBirth);
      setPlace(p.placeOfBirth);
      if (p.gender === "male" || p.gender === "female" || p.gender === "other") {
        setGender(p.gender);
      }
    } else {
      setSelectedProfileId(null);
      setName("");
      setDate("");
      setTime("");
      setPlace("");
      setGender("male");
    }
  };

  // Chart
  const [chart, setChart] = useState<ChartResponse | null>(null);
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

  // Price
  const [reportPrice, setReportPrice] = useState(DEFAULT_REPORT_PRICE);
  useEffect(() => {
    fetch("/api/reports/catalog")
      .then((r) => (r.ok ? r.json() : []))
      .then((entries: { slug: string; price: number }[]) => {
        const entry = entries.find((e) => e.slug === "career");
        if (entry) setReportPrice(entry.price / 100);
      })
      .catch(() => {});
  }, []);

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
          reportType: "career",
          profileId: selectedProfileId,
          birthName: name || null,
          birthData: { date, time, place },
          chartData: chart,
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
          reportType: "career",
          profileId: selectedProfileId,
          birthName: name || null,
          birthData: { date, time, place },
          chartData: chart,
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

  const upiLink = buildUpiLink(reportPrice, "Jyotish Career Report");

  if (loading && !chart) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-48 text-slate-500">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Calculating your chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F4BC}"}</span>
          Career Report &mdash; Jaimini Astrology
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover your professional destiny through Jaimini Chara Dasha career analysis
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
                    ? "bg-blue-500 text-white font-semibold"
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
          <ProfileSelector
            accent="blue"
            selectedProfileId={selectedProfileId}
            onSelect={handleProfileSelect}
          />
          <h2 className="text-lg font-semibold text-blue-400">
            {selectedProfileId ? "Confirm Birth Details" : "Enter Birth Details"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Accurate birth details are essential for precise career analysis.
            The ascendant and planetary positions determine career timing, nature, and growth periods.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time of Birth</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female" | "other")}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Calculating Chart..." : "Calculate & Preview Report"}
          </button>
        </form>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && chart && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-blue-400">Report Preview</h2>
            <p className="text-xs text-slate-500">
              {name ? `${name} \u00B7 ` : ""}
              {chart.lagna} Lagna \u00B7 {chart.place.split(",")[0]} \u00B7 {chart.date}
            </p>

            {/* Key career factors preview */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Career Overview</h3>
              <p className="text-xs text-slate-400">
                Your career analysis will examine the 10th house, Amatya Karaka (career significator),
                Rajya Pada (A10), Karakamsha, and all Chara Dasha periods to identify growth windows,
                career nature, and professional timing.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-400">{chart.lagna}</p>
                  <p className="text-xs text-slate-500">Ascendant</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-400">
                    {chart.planets.find((p) => p.house === 10)?.name || "\u2014"}
                  </p>
                  <p className="text-xs text-slate-500">Planet in 10th</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-400">{chart.date.split("-")[0]}</p>
                  <p className="text-xs text-slate-500">Birth Year</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Full report includes:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Career Verdict & Confidence Rating",
                  "Career Nature: Job vs Business",
                  "Sector & Industry Analysis",
                  "Career Growth Timeline",
                  "Current Dasha Career Theme",
                  "Promotion & Recognition Windows",
                  "Growth Indicators & Stagnation Risks",
                  "Natal Career Profile (10H, AmK, A10)",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-blue-500">{"\u2713"}</span>
                    {f}
                  </div>
                ))}
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
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Purchase Report {"\u2014"} {"\u20B9"}{reportPrice}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-blue-400">Payment</h2>
          <p className="text-sm text-slate-400">
            Pay {"\u20B9"}{reportPrice} via UPI to receive your complete Career Report.
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {payLoading ? "Processing..." : `Confirm Payment \u2014 \u20B9${reportPrice}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Full Report */}
      {step === "report" && chart && (
        <CareerReportView
          chart={chart}
          userName={name}
          onBack={() => (window.history.length > 1 ? window.history.back() : setStep("preview"))}
        />
      )}
    </div>
  );
}
