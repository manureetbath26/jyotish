"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useReportLock } from "@/contexts/ReportLockContext";

/**
 * Profile tab strip shown below the main navbar for signed-in users.
 * Selecting a tab sets the active profile everywhere in the app via
 * ActiveProfileContext — chart, ashtakvarga, and report defaults all
 * follow the active selection.
 *
 * If the user has no profiles yet, renders an onboarding banner that
 * prompts them to add their own kundli.
 */
export function ProfileTabs() {
  const { status } = useSession();
  const { profiles, activeProfile, setActiveProfileId, hasOwnProfile, loading } =
    useActiveProfile();
  const { locked, lockReason } = useReportLock();
  const [dismissed, setDismissed] = useState(false);

  // Only render for authenticated users
  if (status !== "authenticated") return null;

  // Still loading the profile list — show a thin placeholder to avoid layout shift
  if (loading && profiles.length === 0) {
    return (
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center">
          <span className="text-[11px] text-slate-600">Loading profiles…</span>
        </div>
      </div>
    );
  }

  // No profiles yet — render onboarding banner
  if (profiles.length === 0) {
    if (dismissed) return null;
    return (
      <div className="border-b border-amber-500/20 bg-amber-500/5">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-400">{"\u2B50"}</span>
            <span className="text-slate-200">
              Welcome! Save your own kundli to unlock one-click charts and reports.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profiles"
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1 rounded-md"
            >
              Add my kundli
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="text-slate-500 hover:text-slate-300 text-base leading-none px-1"
              aria-label="Dismiss"
            >
              {"\u00D7"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has profiles — render the tab strip
  const lockTooltip = lockReason ?? "Profile switching is disabled while viewing a report.";
  return (
    <div className={`profile-tabs-strip border-b border-slate-800 bg-slate-900/30 ${locked ? "opacity-60" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-2 flex-shrink-0">
          Profile
        </span>

        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                if (locked) return;
                setActiveProfileId(p.id);
              }}
              disabled={locked && !isActive}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                isActive
                  ? "bg-amber-500 text-black border-amber-500 font-semibold"
                  : locked
                  ? "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
                  : "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-amber-500/40 hover:text-amber-400"
              }`}
              title={locked && !isActive ? lockTooltip : `${p.name} — ${p.dateOfBirth} ${p.timeOfBirth}`}
            >
              {p.isOwn && <span className="mr-1">{"\u2B50"}</span>}
              {p.name}
              {p.relationship && p.relationship !== "self" && (
                <span className="opacity-60 ml-1">({p.relationship})</span>
              )}
              {locked && isActive && (
                <span className="ml-1.5 text-[9px]" title={lockTooltip}>{"\uD83D\uDD12"}</span>
              )}
            </button>
          );
        })}

        {!hasOwnProfile && !locked && (
          <Link
            href="/profiles"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-semibold ml-1"
          >
            {"\u2B50"} Add your kundli
          </Link>
        )}

        {!locked && (
          <Link
            href="/profiles"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 ml-1"
            title="Add, edit or delete profiles"
          >
            {"\u2630"} Show all profiles
          </Link>
        )}
        {locked && (
          <span className="flex-shrink-0 text-[11px] text-slate-500 italic ml-2" title={lockTooltip}>
            {"\uD83D\uDD12"} Locked while viewing report
          </span>
        )}

        {activeProfile && (
          <div className="flex-shrink-0 ml-auto text-[10px] text-slate-500 hidden sm:block">
            <span className="text-slate-600">Active:</span>{" "}
            <span className="text-slate-400">
              {activeProfile.dateOfBirth} &middot;{" "}
              {activeProfile.placeOfBirth.split(",").slice(0, 2).join(",")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
