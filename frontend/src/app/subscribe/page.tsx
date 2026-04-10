"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

const UPI_ID = "9872653657@ybl";

function buildUpiLink(amount: number, note: string) {
  return `upi://pay?pa=${UPI_ID}&pn=Jyotish&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

interface SubInfo {
  plan: string;
  endDate: string;
  daysRemaining: number;
  transitAccessUntil?: string;
  dashaAccessUntil?: string;
  couponCode?: string;
}

type PayFlow = "subscribe" | "topup-transit" | "topup-dasha";

export default function SubscribePage() {
  const { status } = useSession();
  const router = useRouter();

  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [upiRef, setUpiRef] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [payFlow, setPayFlow] = useState<PayFlow>("subscribe");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((data) => {
        setIsPremium(!!data.premium);
        if (data.subscription) {
          setSubInfo(data.subscription);
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [status]);

  const handleCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/subscription/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setCouponMsg({ type: "success", text: data.message || "Coupon applied! Redirecting..." });
        setTimeout(() => router.push("/"), 2000);
      } else {
        setCouponMsg({ type: "error", text: data.error || "Invalid coupon code" });
      }
    } catch {
      setCouponMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    setPayMsg(null);

    let endpoint = "/api/subscription/pay";
    let body: Record<string, string> = { upiTransactionId: upiRef };

    if (payFlow === "topup-transit") {
      endpoint = "/api/subscription/extend";
      body = { upiTransactionId: upiRef, topupType: "transit" };
    } else if (payFlow === "topup-dasha") {
      endpoint = "/api/subscription/extend";
      body = { upiTransactionId: upiRef, topupType: "dasha" };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setPayMsg({ type: "success", text: data.message || "Payment confirmed! Redirecting..." });
        setTimeout(() => router.push("/"), 2000);
      } else {
        setPayMsg({ type: "error", text: data.error || "Payment verification failed" });
      }
    } catch {
      setPayMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPayLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  const isUnlimited = subInfo?.couponCode === "FREEFOREVER2026" || subInfo?.plan === "unlimited";

  const payAmount = payFlow === "subscribe" ? 500 : 200;
  const payNote =
    payFlow === "topup-transit"
      ? "Jyotish Transit Topup"
      : payFlow === "topup-dasha"
      ? "Jyotish Dasha Topup"
      : "Jyotish Premium Monthly";
  const upiLink = buildUpiLink(payAmount, payNote);

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="max-w-lg mx-auto pt-8 space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-amber-400">Jyotish Premium</h1>
        <p className="text-slate-500 text-sm mt-1">
          Monthly subscription &middot; No auto-debit &middot; Cancel anytime
        </p>
      </div>

      {/* Current plan status */}
      {!statusLoading && subInfo && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Your Current Plan
          </h2>

          {isUnlimited ? (
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-2xl">&#10003;</span>
              <div>
                <p className="text-slate-200 font-semibold">Lifetime Unlimited Access</p>
                <p className="text-xs text-slate-500">All features unlocked. No payment needed.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 font-semibold">
                    {isPremium ? "Active Subscription" : "Subscription Expired"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isPremium
                      ? `Expires: ${fmtDate(subInfo.endDate)}`
                      : `Expired on: ${fmtDate(subInfo.endDate)}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    isPremium
                      ? "bg-green-900/60 text-green-300 border border-green-700"
                      : "bg-red-900/60 text-red-300 border border-red-700"
                  }`}
                >
                  {isPremium ? `${subInfo.daysRemaining}d left` : "Expired"}
                </span>
              </div>

              {/* Access ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Transit reports until</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {fmtDate(subInfo.transitAccessUntil)}
                  </p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Dasha reports until</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {fmtDate(subInfo.dashaAccessUntil)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Don't show payment sections for unlimited users */}
      {isUnlimited ? null : (
        <>
          {/* What's included */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
              Monthly Plan &mdash; &#8377;500/month
            </h2>
            <ul className="space-y-3">
              {[
                "Navamsa chart interpretations",
                "Historical dasha interpretation",
                "Next 2 years of dasha interpretation",
                "Historical transit analysis",
                "Next 1 year of transit predictions",
                "Downloadable PDF reports",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-200 text-sm">
                  <span className="text-amber-400">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Top-ups (&#8377;200 each)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-300">+1 year transit</p>
                  <p className="text-xs text-slate-500">&#8377;200 per year</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-300">+2 years dasha</p>
                  <p className="text-xs text-slate-500">&#8377;200 per 2 years</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment flow selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              What would you like to do?
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setPayFlow("subscribe"); setPayMsg(null); setUpiRef(""); }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  payFlow === "subscribe"
                    ? "bg-amber-900/30 border-amber-600 ring-1 ring-amber-500/50"
                    : "bg-slate-900 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">
                      {isPremium ? "Renew Monthly Plan" : "Subscribe — Monthly Plan"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      30 days premium + 1yr transit + 2yr dasha
                    </p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">&#8377;500</span>
                </div>
              </button>

              {isPremium && (
                <>
                  <button
                    onClick={() => { setPayFlow("topup-transit"); setPayMsg(null); setUpiRef(""); }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      payFlow === "topup-transit"
                        ? "bg-amber-900/30 border-amber-600 ring-1 ring-amber-500/50"
                        : "bg-slate-900 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-200">Top-up: +1 Year Transit</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Extend transit predictions by 1 more year
                        </p>
                      </div>
                      <span className="text-amber-400 font-bold text-sm">&#8377;200</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setPayFlow("topup-dasha"); setPayMsg(null); setUpiRef(""); }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      payFlow === "topup-dasha"
                        ? "bg-amber-900/30 border-amber-600 ring-1 ring-amber-500/50"
                        : "bg-slate-900 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-200">Top-up: +2 Years Dasha</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Extend dasha interpretation by 2 more years
                        </p>
                      </div>
                      <span className="text-amber-400 font-bold text-sm">&#8377;200</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Coupon Section */}
          <form
            onSubmit={handleCoupon}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Have a Coupon?
            </h2>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {couponMsg && (
              <p className={couponMsg.type === "success" ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {couponMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={couponLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {couponLoading ? "Applying..." : "Apply Coupon"}
            </button>
          </form>

          {/* UPI Payment Section */}
          <form
            onSubmit={handlePayment}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              {payFlow === "subscribe"
                ? "Pay via UPI — ₹500"
                : payFlow === "topup-transit"
                ? "Top-up Transit — ₹200"
                : "Top-up Dasha — ₹200"}
            </h2>

            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={upiLink} size={200} level="H" includeMargin={false} />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
              </p>
            </div>

            <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
              <li>Scan the QR code above with any UPI app</li>
              <li>Complete the payment of &#8377;{payAmount}</li>
              <li>Enter your UPI transaction reference below</li>
            </ol>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                UPI Transaction Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. 412345678901"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {payMsg && (
              <p className={payMsg.type === "success" ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {payMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={payLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {payLoading ? "Verifying..." : `Confirm Payment — ₹${payAmount}`}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
