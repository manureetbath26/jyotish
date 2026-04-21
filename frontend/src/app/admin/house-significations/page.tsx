"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  bustHouseSignificationsCache,
  useHouseSignifications,
} from "@/hooks/useHouseSignifications";
import type { HouseSignificationRow } from "@/lib/houseSignifications";

type Field = "name" | "short" | "themes";

export default function HouseSignificationsAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const cached = useHouseSignifications();

  const [rows, setRows] = useState<HouseSignificationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Partial<HouseSignificationRow>>>({});
  const [loading, setLoading] = useState(true);
  const [savingHouse, setSavingHouse] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Non-admins get bounced
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/house-significations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HouseSignificationRow[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data.sort((a, b) => a.house - b.house));
        } else {
          // Fall back to the cached constant view
          setRows(
            Object.values(cached).sort((a, b) => a.house - b.house),
          );
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraft = (house: number, field: Field, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [house]: { ...prev[house], [field]: value },
    }));
  };

  const save = async (row: HouseSignificationRow) => {
    const draft = drafts[row.house];
    if (!draft) return;
    setSavingHouse(row.house);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/house-significations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house: row.house, ...draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setRows((prev) =>
        prev.map((r) => (r.house === updated.house ? { ...r, ...updated } : r)),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.house];
        return next;
      });
      bustHouseSignificationsCache();
      setMessage({ kind: "ok", text: `House ${row.house} updated` });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSavingHouse(null);
    }
  };

  if (status === "loading" || (status === "authenticated" && session?.user?.role !== "admin")) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">House Significations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin-editable. Edits refresh the server cache immediately; clients see new copy within 5 minutes
            (per-page browser cache). Bust the browser cache with a hard reload if you need it sooner.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg"
        >
          {"\u2190"} Admin home
        </Link>
      </header>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-24 text-slate-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {rows.map((row) => {
            const draft = drafts[row.house] ?? {};
            const dirty = Object.keys(draft).length > 0;
            const isSaving = savingHouse === row.house;
            return (
              <div
                key={row.house}
                className={`bg-slate-900 border rounded-xl p-4 space-y-2 ${
                  dirty ? "border-amber-500/40" : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-400">
                    House {row.house}
                  </p>
                  {dirty && (
                    <button
                      onClick={() => save(row)}
                      disabled={isSaving}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      {isSaving ? "Saving\u2026" : "Save"}
                    </button>
                  )}
                </div>
                <FieldEditor
                  label="Name"
                  hint='Classical + English, e.g. "Lagna (Self)"'
                  value={draft.name ?? row.name}
                  onChange={(v) => setDraft(row.house, "name", v)}
                />
                <FieldEditor
                  label="Short phrase"
                  hint="Daily-reading tone, one compact line"
                  value={draft.short ?? row.short}
                  onChange={(v) => setDraft(row.house, "short", v)}
                />
                <FieldEditor
                  label="Themes"
                  hint="Fuller signification list"
                  value={draft.themes ?? row.themes}
                  onChange={(v) => setDraft(row.house, "themes", v)}
                  multiline
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldEditor({
  label,
  hint,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-600">{hint}</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      )}
    </div>
  );
}
