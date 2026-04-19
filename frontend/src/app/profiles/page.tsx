"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Profile } from "@/components/ProfileSelector";

async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

type EditorMode = "create-own" | "create-other" | { kind: "edit"; profile: Profile } | null;

const RELATIONSHIP_OPTIONS = [
  { value: "spouse", label: "Spouse / Partner" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfilesPage() {
  const { data: session, status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        setProfiles(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadProfiles();
    else if (status === "unauthenticated") setLoading(false);
  }, [status]);

  const ownProfile = profiles.find((p) => p.isOwn);
  const otherProfiles = profiles.filter((p) => !p.isOwn);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-48">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold text-amber-400">Kundli Profiles</h1>
        <p className="text-slate-400">Please sign in to manage your saved kundli profiles.</p>
        <Link
          href="/auth/signin"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDelete(null);
      await loadProfiles();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2">
          <span className="text-3xl">{"\u{1F4DC}"}</span>
          Kundli Profiles
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Save birth details once, generate any report instantly. Add family &amp; friends to run readings for them too.
        </p>
      </header>

      {/* Own kundli section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
            <span className="text-amber-400">{"\u2B50"}</span> Your own kundli
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
              Required
            </span>
          </h2>
        </div>

        {ownProfile ? (
          <ProfileCard
            profile={ownProfile}
            onEdit={() => setEditor({ kind: "edit", profile: ownProfile })}
            onDelete={null}
          />
        ) : (
          <div className="border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center space-y-3 bg-amber-500/5">
            <p className="text-sm text-amber-300">You haven&apos;t saved your own kundli yet</p>
            <p className="text-xs text-slate-400">
              Once saved, every report will default to your chart. You can still enter others&apos; details manually when needed.
            </p>
            <button
              onClick={() => setEditor("create-own")}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
            >
              {"\u002B"} Add my own kundli
            </button>
          </div>
        )}
      </section>

      {/* Other profiles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Other profiles
            <span className="text-[10px] text-slate-500 ml-2">({otherProfiles.length})</span>
          </h2>
          <button
            onClick={() => setEditor("create-other")}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg"
          >
            {"\u002B"} Add profile
          </button>
        </div>

        {otherProfiles.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-lg">
            No other profiles yet. Add family members or friends to generate reports for them.
          </p>
        ) : (
          <div className="space-y-2">
            {otherProfiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => setEditor({ kind: "edit", profile: p })}
                onDelete={() => setConfirmDelete(p.id)}
                confirmDelete={confirmDelete === p.id}
                onConfirmDelete={() => handleDelete(p.id)}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editor && (
        <ProfileEditor
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await loadProfiles();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Profile Card
// ────────────────────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  onEdit,
  onDelete,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  profile: Profile;
  onEdit: () => void;
  onDelete: (() => void) | null;
  confirmDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}) {
  return (
    <div className={`border rounded-xl p-4 space-y-2 ${profile.isOwn ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-slate-900/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {profile.isOwn && <span className="text-amber-400">{"\u2B50"}</span>}
            <h3 className="text-sm font-semibold text-slate-100">{profile.name}</h3>
            {profile.relationship && (
              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded-full px-1.5 py-0.5 capitalize">
                {profile.relationship}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-slate-400">
            <div>
              <span className="text-slate-600">Born: </span>
              {formatDate(profile.dateOfBirth)} at {profile.timeOfBirth}
            </div>
            <div className="sm:col-span-2 truncate">
              <span className="text-slate-600">Place: </span>
              {profile.placeOfBirth}
            </div>
          </div>
          {profile.notes && (
            <p className="text-[11px] text-slate-500 italic mt-1">{profile.notes}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded"
          >
            Edit
          </button>
          {onDelete && !confirmDelete && (
            <button
              onClick={onDelete}
              className="text-[11px] text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 px-2 py-1 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {confirmDelete && onConfirmDelete && onCancelDelete && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2">
          <span className="text-xs text-red-400">Delete this profile?</span>
          <button
            onClick={onConfirmDelete}
            className="text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-2 py-1 rounded"
          >
            Yes, delete
          </button>
          <button
            onClick={onCancelDelete}
            className="text-[11px] text-slate-400 hover:text-slate-300 border border-slate-700 px-2 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Profile Editor (create / edit modal)
// ────────────────────────────────────────────────────────────────────────────

function ProfileEditor({
  mode,
  onClose,
  onSaved,
}: {
  mode: Exclude<EditorMode, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = typeof mode === "object" && mode.kind === "edit" ? mode.profile : null;
  const isOwn = mode === "create-own" || (editing?.isOwn ?? false);

  const [name, setName] = useState(editing?.name || "");
  const [date, setDate] = useState(editing?.dateOfBirth || "");
  const [time, setTime] = useState(editing?.timeOfBirth || "");
  const [place, setPlace] = useState(editing?.placeOfBirth || "");
  const [gender, setGender] = useState(editing?.gender || "");
  const [relationship, setRelationship] = useState(editing?.relationship || (isOwn ? "" : "spouse"));
  const [notes, setNotes] = useState(editing?.notes || "");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(place);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [place]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        dateOfBirth: date,
        timeOfBirth: time,
        placeOfBirth: place.trim(),
        gender: gender || null,
        notes: notes || null,
      };

      if (editing) {
        // PATCH
        body.relationship = relationship || null;
        const res = await fetch(`/api/profiles/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save");
        }
      } else {
        // POST
        body.isOwn = isOwn;
        body.relationship = isOwn ? "self" : relationship || null;
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save");
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = editing
    ? `Edit ${editing.name}`
    : isOwn
      ? "Add your own kundli"
      : "Add a profile";

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-400">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none"
          >
            {"\u00D7"}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={isOwn ? "Your name" : "e.g. Priya (Spouse)"}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {!isOwn && !editing?.isOwn && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date of Birth</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time of Birth</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Place of Birth</label>
          <input
            type="text"
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            required
            placeholder="e.g. Ludhiana, Punjab, India"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => {
                    selectedRef.current = true;
                    setPlace(s);
                    setShowSuggestions(false);
                    setSuggestions([]);
                  }}
                  className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer truncate"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gender (optional)</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Birth time verified from hospital records"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-black font-semibold py-2 rounded-lg text-sm"
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Create profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
