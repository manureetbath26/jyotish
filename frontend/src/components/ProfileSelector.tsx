"use client";

import { useEffect } from "react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

export interface Profile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  gender: string | null;
  relationship: string | null;
  isOwn: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SelectedSource =
  | { kind: "profile"; profile: Profile }
  | { kind: "manual" };

interface Props {
  /** Accent color for the current report (amber for chara-dasha, blue for career) */
  accent?: "amber" | "blue" | "emerald" | "purple";
  /** Called when selection changes. `null` = manual entry. */
  onSelect: (selection: SelectedSource) => void;
  /** Currently selected profile id, or null for manual */
  selectedProfileId: string | null;
}

/**
 * Profile selector — renders as a horizontal chip row at the top of the
 * birth-details step. Always includes a "Manual entry" option.
 * Requires the user to be signed in to see saved profiles.
 */
export function ProfileSelector({ accent = "amber", onSelect, selectedProfileId }: Props) {
  const { profiles, activeProfile, loading } = useActiveProfile();

  // Auto-select the global active profile if nothing is selected yet
  useEffect(() => {
    if (selectedProfileId || !activeProfile) return;
    onSelect({ kind: "profile", profile: activeProfile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  const accentClasses: Record<string, { active: string; inactive: string }> = {
    amber: {
      active: "bg-amber-500 text-black border-amber-500",
      inactive: "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-400",
    },
    blue: {
      active: "bg-blue-500 text-white border-blue-500",
      inactive: "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-blue-500/50 hover:text-blue-400",
    },
    emerald: {
      active: "bg-emerald-500 text-black border-emerald-500",
      inactive: "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400",
    },
    purple: {
      active: "bg-purple-500 text-white border-purple-500",
      inactive: "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-purple-500/50 hover:text-purple-400",
    },
  };
  const cls = accentClasses[accent];

  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500">Loading profiles...</span>
      </div>
    );
  }

  // If no saved profiles (signed out OR user has no profiles yet), show a
  // subtle hint and let user enter manually. Don't block the flow.
  if (profiles.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-3">
        <p className="text-xs text-slate-400">
          <span className="text-slate-500">Tip:</span> Sign in and{" "}
          <a href="/profiles" className="underline hover:text-slate-300">
            save your kundli profile
          </a>{" "}
          to generate reports faster next time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-3 space-y-2">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
        Generate report for
      </p>
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const isSelected = selectedProfileId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect({ kind: "profile", profile: p })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isSelected ? cls.active : cls.inactive
              }`}
            >
              {p.isOwn && <span className="mr-1">{"\u2B50"}</span>}
              {p.name}
              {p.relationship && !p.isOwn && (
                <span className="opacity-60 ml-1">({p.relationship})</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onSelect({ kind: "manual" })}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            selectedProfileId === null ? cls.active : cls.inactive
          }`}
        >
          {"\u002B"} New person
        </button>
      </div>
      <p className="text-[10px] text-slate-600">
        Manage saved profiles in{" "}
        <a href="/profiles" className="underline hover:text-slate-400">
          Profiles
        </a>
      </p>
    </div>
  );
}
