"use client";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

export function RegisterInterestModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/register-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to register");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
        >
          ✕
        </button>

        {!submitted ? (
          <>
            <div className="mb-5">
              <div className="text-2xl mb-2">✦</div>
              <h2 className="text-lg font-bold text-slate-100 mb-1">Register Your Interest</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Jyotish is currently <span className="text-amber-400 font-medium">free to use for 1 month</span>.
                Register your email to be notified about future access, updates, and pricing.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Registering…" : "Register Interest"}
              </button>

              <p className="text-xs text-slate-600 text-center">
                No spam. We'll only reach out about access and major updates.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🙏</div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Thank you!</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              We've noted your interest. You'll be the first to know when future access opens.
              Meanwhile, enjoy Jyotish for free!
            </p>
            <button
              onClick={onClose}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
