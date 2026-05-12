"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { calculateChart, type ChartResponse } from "@/lib/api";
import { AstroChatInterface } from "@/components/astroChat/AstroChatInterface";
import type { BirthData } from "@/lib/astroChat/types";

export default function AstroChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile, loading: profileLoading } = useActiveProfile();

  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionCreatedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Calculate chart + create chat session when profile loads
  useEffect(() => {
    if (!activeProfile || sessionCreatedRef.current) return;
    sessionCreatedRef.current = true;

    const bd: BirthData = {
      date:  activeProfile.dateOfBirth,
      time:  activeProfile.timeOfBirth,
      place: activeProfile.placeOfBirth,
      name:  activeProfile.name,
    };

    setLoadingChart(true);
    setError(null);

    // Calculate chart then create session
    calculateChart({
      date:  bd.date,
      time:  bd.time,
      place: bd.place,
    })
      .then(async (chartData) => {
        setChart(chartData);
        setBirthData(bd);

        // Create a chat session in the DB
        const res = await fetch("/api/astro-chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chartData, birthData: bd }),
        });

        if (!res.ok) throw new Error("Failed to create chat session");
        const newSession = await res.json();
        setSessionId(newSession.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load chart");
        sessionCreatedRef.current = false; // allow retry
      })
      .finally(() => setLoadingChart(false));
  }, [activeProfile]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <span>🕉️</span>
            Jyotish Guru
          </h1>
          <p className="text-xs text-slate-500">
            Multi-agent Vedic astrology assistant · Parashari + Jaimini
          </p>
        </div>
        {activeProfile && (
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">{activeProfile.name}</p>
            <p className="text-[10px] text-slate-600">{activeProfile.placeOfBirth.split(",")[0]}</p>
          </div>
        )}
      </header>

      {/* No profile */}
      {!profileLoading && !activeProfile && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 max-w-sm">
            <p className="text-2xl">🌟</p>
            <p className="text-sm text-slate-200">
              Save your kundli first so the Jyotish Guru can read your chart.
            </p>
            <Link
              href="/kundli"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
            >
              Set up my kundli →
            </Link>
          </div>
        </div>
      )}

      {/* Loading chart */}
      {activeProfile && loadingChart && (
        <div className="flex-1 flex items-center justify-center space-y-3 flex-col">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Computing your natal chart…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center space-y-2 max-w-sm">
            <p className="text-sm font-semibold text-red-300">Chart calculation failed</p>
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => {
                sessionCreatedRef.current = false;
                setError(null);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Chat interface */}
      {chart && sessionId && birthData && !loadingChart && !error && (
        <div className="flex-1 min-h-0">
          <AstroChatInterface
            sessionId={sessionId}
            chart={chart}
            birthData={birthData}
          />
        </div>
      )}
    </div>
  );
}
