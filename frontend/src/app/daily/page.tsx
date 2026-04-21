"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

/**
 * Daily Perspective (logged-in default landing).
 *
 * Placeholder scaffold. The full engine (transits + natal + LLM narrative
 * layer) is designed separately — see the design doc in this repo and
 * configure OPENAI_API_KEY in frontend/.env.local to enable it.
 */
export default function DailyPerspectivePage() {
  const { status } = useSession();
  const router = useRouter();
  const { activeProfile, loading } = useActiveProfile();

  // Signed-out users should never land here — bounce to the marketing root
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="text-center py-4">
        <p className="text-xs text-amber-400 uppercase tracking-widest font-semibold mb-1">
          {today}
        </p>
        <h1 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F305}"}</span>
          Daily Perspective
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          What today's sky says about your chart, in plain language.
        </p>
      </header>

      {!loading && !activeProfile && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-200">
            Save your kundli first so we can compute today's transits against your chart.
          </p>
          <Link
            href="/kundli"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Set up my kundli {"\u2192"}
          </Link>
        </div>
      )}

      {activeProfile && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Reading for</p>
              <p className="text-lg font-semibold text-slate-100">{activeProfile.name}</p>
              <p className="text-xs text-slate-500">
                {activeProfile.dateOfBirth} &middot; {activeProfile.placeOfBirth.split(",")[0]}
              </p>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2.5 py-1">
              Coming soon
            </span>
          </div>
          <div className="border border-dashed border-slate-800 rounded-xl p-5 text-center space-y-2">
            <p className="text-sm text-slate-300">
              The Daily Perspective engine is in setup. Once wired up, this page will render today's
              transit-to-natal interactions, dasha-active themes, and a short human-style summary in the
              <em className="text-amber-300"> &quot;expect X, be mindful of Y&quot;</em> format.
            </p>
            <p className="text-xs text-slate-500">
              Configure <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">OPENAI_API_KEY</code> in
              {" "}
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">frontend/.env.local</code> to enable the narrative layer.
            </p>
          </div>
        </div>
      )}

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
