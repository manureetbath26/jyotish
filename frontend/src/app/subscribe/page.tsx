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
  couponCode?: string;
}

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

  // Which flow: "new" (₹500) or "extend" (₹200)
  const [paymentMode, setPaymentMode] = useState<"new" | "extend">("new");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch current subscription status
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((data) => {
        setIsPremium(!!data.premium);
        if (data.subscription) {
          setSubInfo(data.subscription);
          setPaymentMode("extend");
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

    const endpoint = paymentMode === "extend" ? "/api/subscription/extend" : "/api/subscription/pay";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiTransactionId: upiRef }),
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

  const isExtending = paymentMode === "extend" && subInfo;
  const payAmount = isExtending ? 200 : 500;
  const upiLink = buildUpiLink(payAmount, isExtending ? "Jyotish Extend 1yr" : "Jyotish Premium 1yr");

  return (
    <div className="max-w-lg mx-auto pt-8 space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-amber-400">
          {isExtending ? "Extend Your Plan" : "Upgrade to Premium"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isExtending
            ? `₹200 to extend by 1 more year (one-time, no auto-renewal)`
            : `₹500 for 1-year access (one-time payment, no auto-renewal)`}
        </p>
      </div>

      {/* Current subscription status */}
      {!statusLoading && subInfo && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Your Current Plan
          </h2>
          {subInfo.couponCode === "FREEFOREVER2026" ? (
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-lg">&#10003;</span>
              <div>
                <p className="text-slate-200 font-medium">Lifetime Access (Coupon)</p>
                <p className="text-xs text-slate-500">You have unlimited access. No payment needed.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-slate-200 font-medium">
                    {isPremium ? "Active" : "Expired"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Expires: {new Date(subInfo.endDate).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  isPremium
                    ? "bg-green-900/60 text-green-300 border border-green-700"
                    : "bg-red-900/60 text-red-300 border border-red-700"
                }`}>
                  {isPremium ? `${subInfo.daysRemaining} days left` : "Expired"}
                </span>
              </div>
              {isPremium && subInfo.daysRemaining <= 30 && (
                <p className="text-xs text-amber-400">
                  Your plan expires soon. Extend now for ₹200/year.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Plan toggle (for users who already have a subscription) */}
      {subInfo && subInfo.couponCode !== "FREEFOREVER2026" && (
        <div className="flex gap-3">
          <button
            onClick={() => setPaymentMode("extend")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
              paymentMode === "extend"
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
            }`}
          >
            Extend +1 Year (₹200)
          </button>
          <button
            onClick={() => setPaymentMode("new")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
              paymentMode === "new"
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
            }`}
          >
            New Plan (₹500)
          </button>
        </div>
      )}

      {/* What's included */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          What&apos;s Included
        </h2>
        <ul className="space-y-3">
          {[
            "1-year transit report with downloadable timeline",
            "Navamsa chart interpretations",
            "Future Mahadasha analysis",
            "Extend anytime for ₹200/year",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-slate-200 text-sm">
              <span className="text-amber-400">&#10003;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Coupon Section — hide for coupon users */}
      {!(subInfo?.couponCode === "FREEFOREVER2026") && (
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
      )}

      {/* UPI Payment Section — hide for coupon users */}
      {!(subInfo?.couponCode === "FREEFOREVER2026") && (
        <form
          onSubmit={handlePayment}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            {isExtending ? "Extend via UPI — ₹200" : "Pay via UPI — ₹500"}
          </h2>

          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG
                value={upiLink}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
            </p>
          </div>

          <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
            <li>Scan the QR code above with any UPI app</li>
            <li>Complete the payment of ₹{payAmount}</li>
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
      )}
    </div>
  );
}
