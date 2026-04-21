"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

type Tone = "thoughtful" | "coffee" | "classical";

const TONE_META: Record<Tone, { label: string; desc: string }> = {
  thoughtful: { label: "Thoughtful friend", desc: "Warm, direct, caring" },
  coffee: { label: "Morning coffee", desc: "Short, casual, punchy" },
  classical: { label: "Classical astrologer", desc: "Measured, traditional terms" },
};

const TONE_STORAGE_KEY = "jyotish.dailyTone";

interface DailyResponse {
  cached: boolean;
  readingDate: string;
  tone: Tone;
  reading: string;
}

export default function DailyPerspectivePage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile, loading: profileLoading } = useActiveProfile();

  const [tone, setTone] = useState<Tone>("thoughtful");
  const [reading, setReading] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Restore user's last tone preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TONE_STORAGE_KEY) as Tone | null;
      if (saved && TONE_META[saved]) setTone(saved);
    } catch {}
  }, []);

  // Fetch whenever profile or tone changes
  useEffect(() => {
    if (!activeProfile) {
      setReading(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/daily?profileId=${activeProfile.id}&tone=${tone}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: DailyResponse) => {
        if (!cancelled) setReading(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load reading");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeProfile?.id, tone]);

  const handleToneChange = (t: Tone) => {
    setTone(t);
    try { localStorage.setItem(TONE_STORAGE_KEY, t); } catch {}
  };

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="text-center py-3">
        <p className="text-xs text-amber-400 uppercase tracking-widest font-semibold mb-1">
          {today}
        </p>
        <h1 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F305}"}</span>
          Daily Perspective
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Today&apos;s sky against your chart, in plain language.
        </p>
      </header>

      {/* No active profile state */}
      {!profileLoading && !activeProfile && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-200">
            Save your kundli first so we can compute today&apos;s transits against your chart.
          </p>
          <Link
            href="/kundli"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Set up my kundli {"\u2192"}
          </Link>
        </div>
      )}

      {/* Tone selector — always visible when a profile is active */}
      {activeProfile && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Reading for <span className="text-slate-300 font-semibold">{activeProfile.name}</span>
            <span className="text-slate-600"> &middot; </span>
            {activeProfile.placeOfBirth.split(",")[0]}
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(Object.keys(TONE_META) as Tone[]).map((t) => (
              <button
                key={t}
                onClick={() => handleToneChange(t)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  tone === t
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={TONE_META[t].desc}
              >
                {TONE_META[t].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reading */}
      {activeProfile && loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Reading today&apos;s sky{"\u2026"}</p>
        </div>
      )}

      {activeProfile && !loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-sm text-red-300 space-y-2">
          <p className="font-semibold">Couldn&apos;t load today&apos;s reading.</p>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {activeProfile && !loading && !error && reading && (
        <article className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
            {reading.reading}
          </pre>
          <p className="text-[10px] text-slate-600 italic pt-2 border-t border-slate-800/50">
            Generated {reading.cached ? "from cache" : "fresh"} for {reading.readingDate} in the
            &ldquo;{TONE_META[reading.tone].label}&rdquo; register. One reading per day per tone.
          </p>
        </article>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/kundli"
          className="bg-slate-900 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/30 rounded-xl p-4 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-200">My Kundli</p>
          <p className="text-xs text-slate-500 mt-1">Your natal chart, dashas, divisional charts</p>
        </Link>
        <Link
          href="/reports"
          className="bg-slate-900 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/30 rounded-xl p-4 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-200">Reports</p>
          <p className="text-xs text-slate-500 mt-1">Yoga, Finance, Career, Marriage &amp; more</p>
        </Link>
        <Link
          href="/chat"
          className="bg-slate-900 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/30 rounded-xl p-4 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-200">Ask</p>
          <p className="text-xs text-slate-500 mt-1">Chart-grounded answers to your questions</p>
        </Link>
      </div>
    </div>
  );
}
