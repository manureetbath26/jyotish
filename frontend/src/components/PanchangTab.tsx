"use client";
import { useState } from "react";
import {
  PanchangResponse,
  AvakhadaInfo,
  AvakhadaInterpretations,
} from "@/lib/api";

interface Props {
  panchang: PanchangResponse;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/80 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-800/60 last:border-0 gap-4">
      <span className="text-xs text-slate-500 uppercase tracking-wide min-w-[140px]">{label}</span>
      <div className="text-right">
        <span className="text-sm text-slate-200 font-medium">{value}</span>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: "amber" | "emerald" | "rose" | "slate" }) {
  const cls = {
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    slate: "bg-slate-700/40 text-slate-400 border-slate-600/40",
  }[color];
  return (
    <span className={`inline-block border rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

function natureColor(nature: string): "amber" | "emerald" | "rose" | "slate" {
  const n = nature.toLowerCase();
  if (n.includes("highly inauspicious") || n.includes("inauspicious")) return "rose";
  if (n.includes("auspicious")) return "emerald";
  if (n.includes("neutral")) return "slate";
  return "amber";
}

export function PanchangTab({ panchang }: Props) {
  const { vara, tithi, nakshatra, yoga, karan, sun_times, avakhada, avakhada_interpretations } = panchang;

  const avakhadaRows: { label: string; key: keyof AvakhadaInfo }[] = [
    { label: "Varna", key: "varna" },
    { label: "Vashya", key: "vashya" },
    { label: "Yoni", key: "yoni" },
    { label: "Gan", key: "gan" },
    { label: "Nadi", key: "nadi" },
    { label: "Moon Sign", key: "moon_sign" },
    { label: "Sign Lord", key: "sign_lord" },
    { label: "Nakshatra", key: "nakshatra" },
    { label: "Nakshatra Charan", key: "nakshatra_charan" },
    { label: "Yoga", key: "yoga" },
    { label: "Karan", key: "karan" },
    { label: "Tithi", key: "tithi" },
    { label: "Yunja", key: "yunja" },
    { label: "Tatva", key: "tatva" },
    { label: "Name Alphabet(s)", key: "name_alphabet" },
    { label: "Paya", key: "paya" },
  ];

  function avakhadaDisplay(key: keyof AvakhadaInfo): string {
    const v = avakhada[key];
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  }

  return (
    <div className="space-y-5">

      {/* ── Panchang (5 limbs) ───────────────────────────────────────── */}
      <Section title="Panchang — Five Limbs (Pancha Anga)">
        <div className="space-y-0">
          {/* Vara */}
          <div className="py-3 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Vara (Weekday)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400">{vara.name}</span>
                <span className="text-xs text-slate-500">Lord: {vara.lord}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{vara.interpretation}</p>
          </div>

          {/* Tithi */}
          <div className="py-3 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Tithi (Lunar Day)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400">{tithi.paksha} {tithi.name}</span>
                <Badge text={tithi.nature} color={natureColor(tithi.nature)} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">Tithi {tithi.number} · Deity: {tithi.deity}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{tithi.interpretation}</p>
          </div>

          {/* Nakshatra */}
          <div className="py-3 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Nakshatra (Lunar Mansion)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400">{nakshatra.name}</span>
                <span className="text-xs text-slate-500">Pada {nakshatra.pada} · Lord: {nakshatra.lord}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{nakshatra.interpretation}</p>
          </div>

          {/* Yoga */}
          <div className="py-3 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Yoga</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400">{yoga.name}</span>
                <Badge text={yoga.nature} color={natureColor(yoga.nature)} />
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{yoga.interpretation}</p>
          </div>

          {/* Karan */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Karan (Half-Tithi)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-400">{karan.name}</span>
                <Badge text={karan.nature} color={natureColor(karan.nature)} />
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{karan.interpretation}</p>
          </div>
        </div>
      </Section>

      {/* ── Sunrise / Sunset ─────────────────────────────────────────── */}
      <Section title="Sunrise &amp; Sunset on Birth Date">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sunrise (local)</p>
            <p className="text-lg font-bold text-amber-400">{sun_times.sunrise_local ?? "—"}</p>
            {sun_times.sunrise_utc && (
              <p className="text-xs text-slate-600 mt-0.5">UTC: {sun_times.sunrise_utc}</p>
            )}
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sunset (local)</p>
            <p className="text-lg font-bold text-amber-400">{sun_times.sunset_local ?? "—"}</p>
            {sun_times.sunset_utc && (
              <p className="text-xs text-slate-600 mt-0.5">UTC: {sun_times.sunset_utc}</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Avakhada Chakra ──────────────────────────────────────────── */}
      <Section title="Avakhada Chakra">
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left">Attribute</th>
                <th className="px-3 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {avakhadaRows.map(({ label, key }, idx) => (
                <tr
                  key={key}
                  className={`border-t border-slate-800 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                >
                  <td className="px-3 py-2 text-slate-400">{label}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-200">{avakhadaDisplay(key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Avakhada Interpretations ─────────────────────────────────── */}
      <Section title="Avakhada — Interpretations">
        <div className="space-y-4">
          {(
            [
              { label: "Varna", key: "varna", value: avakhada.varna },
              { label: "Gan", key: "gan", value: avakhada.gan },
              { label: "Nadi", key: "nadi", value: avakhada.nadi },
              { label: "Yoni", key: "yoni", value: avakhada.yoni },
              { label: "Paya", key: "paya", value: avakhada.paya },
            ] as { label: string; key: keyof AvakhadaInterpretations; value: string }[]
          ).map(({ label, key, value }) => (
            <div key={key} className="border-b border-slate-800/60 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
                <span className="text-xs text-amber-400 font-semibold">{value}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {avakhada_interpretations[key]}
              </p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}
