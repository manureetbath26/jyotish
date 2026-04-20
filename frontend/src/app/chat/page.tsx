"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { calculateChart, ChartResponse } from "@/lib/api";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

const UPI_ID = "9872653657@ybl";

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

interface PricingTier {
  id: string;
  name: string;
  questionCount: number;
  price: number;
  isMostPopular: boolean;
}

interface ChatSessionData {
  id: string;
  questionLimit: number;
  questionsUsed: number;
  status: string;
  birthData?: { date: string; time: string; place: string; name?: string } | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}

type Step = "birth" | "plan" | "payment" | "chat";

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}

type Mode = "profile" | "new_chart";

function ChatPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { activeProfile } = useActiveProfile();

  // Mode selects which tab is active.
  // - "profile": auto-load active profile's chart and resume/start a chat
  // - "new_chart": show birth form to ask about someone else
  const [mode, setMode] = useState<Mode>("profile");

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

  // Chart
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Pricing
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Payment
  const [upiRef, setUpiRef] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Chat session
  const [chatSession, setChatSession] = useState<ChatSessionData | null>(null);

  // Fetch pricing tiers on mount
  useEffect(() => {
    fetch("/api/chat/pricing")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTiers(data);
      })
      .catch(() => {});
  }, []);

  // Auto-load chart + resume session for active profile
  useEffect(() => {
    let cancelled = false;
    if (mode !== "profile" || !activeProfile || status !== "authenticated") return;

    async function run() {
      setChartLoading(true);
      setChartError(null);
      try {
        // 1. Load cached chart
        const res = await fetch(`/api/profiles/${activeProfile!.id}/chart`);
        if (!res.ok) {
          throw new Error("Failed to load chart for this profile");
        }
        const data = await res.json();
        if (cancelled) return;
        const chartData = data.chartData as ChartResponse;
        setName(activeProfile!.name);
        setDate(activeProfile!.dateOfBirth);
        setTime(activeProfile!.timeOfBirth);
        setPlace(activeProfile!.placeOfBirth);
        setChart(chartData);

        // 2. Look for an existing active chat session for this chart.
        //    Match by birthData.date + time + place.
        const sessionsRes = await fetch("/api/chat/session");
        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          if (Array.isArray(sessions)) {
            const match = sessions.find((s: ChatSessionData) => {
              const b = s.birthData;
              if (!b || s.status !== "active") return false;
              return (
                b.date === activeProfile!.dateOfBirth &&
                b.time === activeProfile!.timeOfBirth &&
                b.place === activeProfile!.placeOfBirth
              );
            });
            if (match && !cancelled) {
              setChatSession(match);
              setStep("chat");
              return;
            }
          }
        }

        // No existing session — go to plan selection
        if (!cancelled) setStep("plan");
      } catch (err) {
        if (!cancelled) {
          setChartError(err instanceof Error ? err.message : "Failed to load chart");
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeProfile?.id, status]);

  // When user switches mode to new_chart, reset everything
  useEffect(() => {
    if (mode === "new_chart") {
      setChart(null);
      setChatSession(null);
      setName("");
      setDate("");
      setTime("");
      setPlace("");
      setStep("birth");
      setChartError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Place search
  const handlePlaceChange = (val: string) => {
    setPlace(val);
    selectedRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (val.length >= 3 && !selectedRef.current) {
        const results = await searchPlaces(val);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
  };

  const selectPlace = (p: string) => {
    setPlace(p);
    selectedRef.current = true;
    setShowSuggestions(false);
  };

  // Step 1: Calculate chart
  const handleCalculateChart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    setChartLoading(true);
    setChartError(null);
    try {
      const result = await calculateChart({ date, time, place });
      setChart(result);
      setStep("plan");
    } catch (err) {
      setChartError(err instanceof Error ? err.message : "Chart calculation failed");
    } finally {
      setChartLoading(false);
    }
  };

  // Apply coupon
  const handleApplyCoupon = async () => {
    setCouponMsg(null);
    if (!coupon.trim()) return;
    try {
      const res = await fetch("/api/reports/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon: coupon.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponApplied(true);
        setCouponDiscount(data.discount || 0);
        setCouponMsg({ type: "success", text: data.discount === 100 ? "Coupon applied — free access!" : `Coupon applied — ${data.discount}% off!` });
      } else {
        setCouponMsg({ type: "error", text: data.error || "Invalid coupon" });
      }
    } catch {
      setCouponMsg({ type: "error", text: "Failed to validate coupon" });
    }
  };

  // Create session (free or coupon)
  const createSession = async (tierId?: string, upiTransactionId?: string) => {
    if (!chart) return;
    const body: Record<string, unknown> = {
      chartData: chart,
      birthData: { date, time, place, name },
    };
    if (tierId) body.tierId = tierId;
    if (upiTransactionId) body.upiTransactionId = upiTransactionId;
    if (couponApplied && coupon.trim()) body.couponCode = coupon.trim();

    const res = await fetch("/api/chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      // If there's an existing free session, resume it
      if (data.existingSessionId) {
        const sessRes = await fetch("/api/chat/session");
        const sessions = await sessRes.json();
        const existing = sessions.find((s: ChatSessionData) => s.id === data.existingSessionId);
        if (existing) {
          setChatSession(existing);
          setStep("chat");
          return;
        }
      }
      throw new Error(data.error || "Failed to create session");
    }

    setChatSession({ ...data, messages: [] });
    setStep("chat");
  };

  // Step 2: Select plan
  const handleSelectFree = async () => {
    setPayError(null);
    try {
      await createSession();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleSelectTier = (tier: PricingTier) => {
    setSelectedTier(tier);
    if (couponApplied && couponDiscount === 100) {
      // Full discount — skip payment
      createSession(tier.id).catch(err => {
        setPayError(err instanceof Error ? err.message : "Failed to start session");
      });
    } else {
      setStep("payment");
    }
  };

  // Step 3: Payment
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier || !upiRef.trim()) return;
    setPayLoading(true);
    setPayError(null);
    try {
      await createSession(selectedTier.id, upiRef.trim());
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayLoading(false);
    }
  };

  // Auth check
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-amber-400 mb-3">Ask Your Chart</h1>
        <p className="text-slate-400 mb-6">Sign in to ask questions about your Vedic birth chart.</p>
        <button
          onClick={() => router.push("/auth/signin")}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  const effectivePrice = selectedTier
    ? Math.round(selectedTier.price * (1 - couponDiscount / 100))
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-amber-400 mb-1">Ask Your Chart</h1>
      <p className="text-slate-500 text-sm mb-4">
        Get personalized Vedic astrology insights powered by your birth chart analysis engine.
      </p>

      {/* Tab strip */}
      {status === "authenticated" && (
        <div className="flex items-center gap-1 mb-6 border-b border-slate-800">
          {activeProfile && (
            <button
              type="button"
              onClick={() => setMode("profile")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                mode === "profile"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {activeProfile.isOwn && <span className="mr-1">{"\u2B50"}</span>}
              {activeProfile.name}&apos;s chart
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode("new_chart")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mode === "new_chart"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {"\u002B"} New birth chart
          </button>
        </div>
      )}

      {/* Active profile loading state */}
      {mode === "profile" && chartLoading && (
        <div className="flex items-center justify-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading chart...</span>
        </div>
      )}

      {mode === "profile" && !activeProfile && status === "authenticated" && (
        <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-amber-300">No active profile selected</p>
          <p className="text-xs text-slate-400">
            Pick a profile from the tab strip above, or add your kundli to use this feature quickly.
          </p>
          <a
            href="/profiles"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Manage profiles
          </a>
        </div>
      )}

      {mode === "profile" && chartError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 mb-4">
          {chartError}
        </div>
      )}

      {/* Birth form — only in new_chart mode */}
      {mode === "new_chart" && step === "birth" && (
        <form onSubmit={handleCalculateChart} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Time of Birth</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Place of Birth</label>
            <input
              type="text"
              value={place}
              onChange={e => handlePlaceChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              placeholder="Start typing city name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {showSuggestions && (
              <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => selectPlace(s)}
                    className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer truncate"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {chartError && (
            <p className="text-red-400 text-sm">{chartError}</p>
          )}

          <button
            type="submit"
            disabled={chartLoading || !date || !time || !place}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
          >
            {chartLoading ? "Calculating Chart..." : "Continue"}
          </button>
        </form>
      )}

      {/* ═══ STEP 2: SELECT PLAN ═══ */}
      {step === "plan" && chart && (
        <div className="space-y-6">
          {/* Chart confirmation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Chart calculated for</p>
                <p className="text-lg font-semibold text-slate-200">{name || "You"}</p>
                <p className="text-xs text-slate-500">{chart.lagna} Lagna • {chart.current_dasha?.planet}-{chart.current_antardasha?.planet} Dasha</p>
              </div>
              <button
                onClick={() => {
                  if (mode === "profile") {
                    // Switching profile is done via the top tab strip
                    setMode("new_chart");
                  } else {
                    setStep("birth");
                  }
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                {mode === "profile" ? "Use different chart" : "Change"}
              </button>
            </div>
          </div>

          {/* Coupon */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Have a coupon?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={e => { setCoupon(e.target.value); setCouponApplied(false); setCouponMsg(null); }}
                placeholder="Enter coupon code"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!coupon.trim() || couponApplied}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Apply
              </button>
            </div>
            {couponMsg && (
              <p className={`text-xs mt-2 ${couponMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {couponMsg.text}
              </p>
            )}
          </div>

          {/* Free tier */}
          <button
            onClick={handleSelectFree}
            className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 text-left transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white">Free Trial</h3>
                <p className="text-sm text-slate-500">2 questions to try it out</p>
              </div>
              <span className="text-2xl font-bold text-emerald-400">Free</span>
            </div>
          </button>

          {/* Paid tiers */}
          <div className="grid gap-4">
            {tiers.map(tier => {
              const displayPrice = couponApplied
                ? Math.round(tier.price * (1 - couponDiscount / 100))
                : tier.price;
              return (
                <button
                  key={tier.id}
                  onClick={() => handleSelectTier(tier)}
                  className={`w-full bg-slate-900 border rounded-2xl p-5 text-left transition-colors group ${
                    tier.isMostPopular
                      ? "border-amber-500/50 hover:border-amber-500"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white">{tier.name}</h3>
                        {tier.isMostPopular && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded-full">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{tier.questionCount} questions</p>
                    </div>
                    <div className="text-right">
                      {couponApplied && couponDiscount > 0 && (
                        <span className="text-xs text-slate-600 line-through block">{formatINR(tier.price)}</span>
                      )}
                      <span className="text-2xl font-bold text-amber-400">
                        {displayPrice === 0 ? "Free" : formatINR(displayPrice)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {payError && (
            <p className="text-red-400 text-sm text-center">{payError}</p>
          )}
        </div>
      )}

      {/* ═══ STEP 3: PAYMENT ═══ */}
      {step === "payment" && selectedTier && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-amber-400 mb-1">{selectedTier.name}</h2>
            <p className="text-slate-400">{selectedTier.questionCount} questions</p>
            <p className="text-3xl font-bold text-white mt-2">{formatINR(effectivePrice)}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={buildUpiLink(effectivePrice / 100, `Jyotish Chat - ${selectedTier.name}`)} size={180} />
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs">
            Scan with any UPI app (GPay, PhonePe, Paytm)
          </p>

          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">UPI Transaction ID</label>
              <input
                type="text"
                value={upiRef}
                onChange={e => setUpiRef(e.target.value)}
                required
                placeholder="Enter your 12-digit UPI reference"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {payError && <p className="text-red-400 text-sm">{payError}</p>}

            <button
              type="submit"
              disabled={payLoading || !upiRef.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
            >
              {payLoading ? "Processing..." : "Start Chat"}
            </button>
          </form>

          <button
            onClick={() => { setStep("plan"); setSelectedTier(null); }}
            className="block w-full text-center text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to plans
          </button>
        </div>
      )}

      {/* ═══ STEP 4: CHAT ═══ */}
      {step === "chat" && chatSession && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <ChatInterface
            sessionId={chatSession.id}
            questionsUsed={chatSession.questionsUsed}
            questionLimit={chatSession.questionLimit}
            initialMessages={chatSession.messages || []}
            onUpgrade={() => {
              setChatSession(null);
              setStep("plan");
            }}
          />
        </div>
      )}
    </div>
  );
}
