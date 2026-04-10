"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

const UPI_DEEP_LINK = "upi://pay?pa=9872653657@ybl&pn=Jyotish&am=500&cu=INR&tn=Jyotish%20Premium";

export default function SubscribePage() {
  const { status } = useSession();
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [upiRef, setUpiRef] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

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
    try {
      const res = await fetch("/api/subscription/pay", {
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

  return (
    <div className="max-w-lg mx-auto pt-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-amber-400">Upgrade to Premium</h1>
        <p className="text-slate-500 text-sm mt-1">₹500 for 30 days access (one-time payment, no auto-renewal)</p>
      </div>

      {/* What's included */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          What&apos;s Included
        </h2>
        <ul className="space-y-3">
          {[
            "Navamsa interpretations",
            "Transit period calculations",
            "Future Mahadasha analysis",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-slate-200 text-sm">
              <span className="text-amber-400">✓</span>
              {item}
            </li>
          ))}
        </ul>
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
          Pay via UPI
        </h2>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={UPI_DEEP_LINK}
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
          <li>Complete the payment of ₹500</li>
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
          {payLoading ? "Verifying..." : "Confirm Payment"}
        </button>
      </form>
    </div>
  );
}
