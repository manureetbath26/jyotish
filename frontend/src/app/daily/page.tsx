"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

type Tone = "thoughtful" | "coffee" | "classical";

const TONE_META: Record<Tone, { label: string; desc: string }> = {
  thoughtful: { label: "Thoughtful friend", desc: "Warm, direct, caring" },
  coffee:     { label: "Morning coffee",    desc: "Short, casual, punchy" },
  classical:  { label: "Classical astrologer", desc: "Measured, traditional terms" },
};

const TONE_STORAGE_KEY = "jyotish.dailyTone";
const MAX_DAYS_AHEAD = 5;

interface DailyResponse {
  cached: boolean;
  readingDate: string;
  tone: Tone;
  reading: string;
}

/** Return YYYY-MM-DD for today in UTC. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `days` to an ISO date string, return new ISO date string. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Format an ISO date for display, e.g. "Tuesday, 6 May 2026". */
function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function DailyPerspectivePage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile, loading: profileLoading } = useActiveProfile();

  const [tone, setTone] = useState<Tone>("thoughtful");
  // dayOffset: 0 = today, 1 = tomorrow, …, MAX_DAYS_AHEAD = 5 days ahead
  const [dayOffset, setDayOffset] = useState(0);
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

  const readingDate = useMemo(() => addDays(todayISO(), dayOffset), [dayOffset]);

  // Fetch whenever profile, tone, or date changes
  useEffect(() => {
    if (!activeProfile) {
      setReading(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReading(null);
    fetch(`/api/daily?profileId=${activeProfile.id}&tone=${tone}&date=${readingDate}`)
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
  }, [activeProfile?.id, tone, readingDate]);

  const handleToneChange = (t: Tone) => {
    setTone(t);
    try { localStorage.setItem(TONE_STORAGE_KEY, t); } catch {}
  };

  const goToToday    = useCallback(() => setDayOffset(0), []);
  const goPrevDay    = useCallback(() => setDayOffset(o => Math.max(0, o - 1)), []);
  const goNextDay    = useCallback(() => setDayOffset(o => Math.min(MAX_DAYS_AHEAD, o + 1)), []);

  const isToday      = dayOffset === 0;
  const isMaxFuture  = dayOffset >= MAX_DAYS_AHEAD;

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
            Set up my kundli {"→"}
          </Link>
        </div>
      )}

      {activeProfile && (
        <>
          {/* ── Date navigator + tone selector row ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-1">
              {/* Previous day — hidden on today */}
              {!isToday && (
                <button
                  onClick={goPrevDay}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                  title="Previous day"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Prev</span>
                </button>
              )}

              {/* Today button — shown only when not on today */}
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                >
                  Today
                </button>
              )}

              {/* Date label */}
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center min-w-[180px]">
                <p className={`text-xs font-semibold ${isToday ? "text-amber-400" : "text-slate-200"}`}>
                  {isToday ? "Today" : dayOffset === 1 ? "Tomorrow" : `In ${dayOffset} days`}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatDisplayDate(readingDate)}</p>
              </div>

              {/* Next day — hidden at cap */}
              {!isMaxFuture && (
                <button
                  onClick={goNextDay}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                  title="Next day"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span>→</span>
                </button>
              )}
            </div>

            {/* Tone selector */}
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

          {/* Profile context line */}
          <p className="text-xs text-slate-500">
            Reading for{" "}
            <span className="text-slate-300 font-semibold">{activeProfile.name}</span>
            <span className="text-slate-600"> &middot; </span>
            {activeProfile.placeOfBirth.split(",")[0]}
          </p>

          {/* ── Loading state ── */}
          {loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                {isToday ? "Reading today's sky…" : `Computing ${dayOffset === 1 ? "tomorrow's" : `Day +${dayOffset}`} sky…`}
              </p>
            </div>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-sm text-red-300 space-y-2">
              <p className="font-semibold">Couldn&apos;t load reading.</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* ── Reading ── */}
          {!loading && !error && reading && (
            <article className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              {/* Future-date notice banner */}
              {!isToday && (
                <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 mb-1">
                  <span className="text-amber-400 text-xs">🔭</span>
                  <p className="text-xs text-slate-400">
                    Projected for{" "}
                    <span className="text-slate-200 font-medium">{formatDisplayDate(readingDate)}</span>
                    {" "}— based on computed planet positions for that date.
                  </p>
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
                {reading.reading}
              </pre>
              <p className="text-[10px] text-slate-600 italic pt-2 border-t border-slate-800/50">
                Generated {reading.cached ? "from cache" : "fresh"} for {reading.readingDate} in the
                &ldquo;{TONE_META[reading.tone].label}&rdquo; register. One reading per day per tone.
              </p>
            </article>
          )}
        </>
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
      </div>
    </div>
  );
}
