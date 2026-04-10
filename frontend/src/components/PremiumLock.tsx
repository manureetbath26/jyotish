"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface PremiumContextValue {
  isPremium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  loading: true,
  refresh: async () => {},
});

export function usePremium() {
  return useContext(PremiumContext);
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/status");
      if (res.ok) {
        const data = await res.json();
        setIsPremium(!!data.premium);
      }
    } catch {
      // keep current state on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch premium status whenever session changes (login/logout)
  useEffect(() => {
    if (sessionStatus === "loading") return;
    refresh();
  }, [refresh, session?.user?.id, sessionStatus]);

  return (
    <PremiumContext.Provider value={{ isPremium, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function PremiumLock({ children }: { children: React.ReactNode }) {
  const { isPremium, loading } = usePremium();

  if (loading) {
    return <>{children}</>;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-2xl">
        <div className="text-center px-6 py-8 max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold text-amber-400 mb-2">
            Premium Feature
          </h3>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Unlock Navamsa interpretations, 1-year transit predictions, and
            future dasha analysis. One-time payment, no auto-renewal.
          </p>
          <Link
            href="/subscribe"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Unlock for ₹500/year
          </Link>
          <div className="mt-3">
            <Link
              href="/subscribe"
              className="text-slate-500 hover:text-slate-400 text-xs underline"
            >
              Have a coupon?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
