"use client";
import { useState } from "react";
import { RelationshipResponse } from "@/lib/api";

interface Props {
  data: RelationshipResponse;
}

const COUNT_LABEL: Record<number, string> = {
  1: "One defining love",
  2: "Two significant partnerships",
  3: "Three meaningful connections",
  4: "Four major relationships",
  5: "Five or more notable bonds",
};

const COUNT_COLOR: Record<number, string> = {
  1: "text-emerald-400",
  2: "text-sky-400",
  3: "text-amber-400",
  4: "text-orange-400",
  5: "text-rose-400",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

export function SoulmateTab({ data }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const countColor = COUNT_COLOR[data.predicted_count] ?? "text-amber-400";
  const countLabel = COUNT_LABEL[data.predicted_count] ?? `${data.predicted_count} major relationships`;

  // Proxied through /api/soulmate-image to avoid CSP/CORS issues
  const imageUrl = `/api/soulmate-image?prompt=${encodeURIComponent(data.image_prompt)}`;

  return (
    <div className="space-y-6">

      {/* ── Prediction card ── */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Relationship Prediction</p>
        <div className="flex items-end gap-3 mb-1">
          <span className={`text-6xl font-bold leading-none ${countColor}`}>
            {data.predicted_count}
          </span>
          <span className="text-slate-300 text-lg pb-1">{countLabel}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Based on 7th house, Venus, Darakaraka & Rahu analysis
        </p>
      </div>

      {/* ── Reasons ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Astrological Factors</h3>
        <div className="space-y-2">
          {data.reasons.map((reason, i) => (
            <div
              key={i}
              className="flex gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3"
            >
              <span className="text-amber-500 mt-0.5 shrink-0">✦</span>
              <p className="text-sm text-slate-300 leading-relaxed">{reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart details ── */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Key Indicators</h3>
        <InfoRow label="7th House Sign" value={data.seventh_house_sign} />
        <InfoRow label="7th Lord" value={data.seventh_house_lord} />
        <InfoRow label="Darakaraka" value={data.darakaraka} />
        <InfoRow
          label="Mangal Dosha"
          value={data.mangal_dosha ? "Present — intense partner energy" : "Absent — balanced partner energy"}
        />
      </div>

      {/* ── Soulmate portrait ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Soulmate Portrait</h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Traits */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Appearance</p>
              <p className="text-sm text-slate-300 leading-relaxed capitalize">{data.soulmate_appearance}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Personality</p>
              <p className="text-sm text-slate-300 leading-relaxed capitalize">{data.soulmate_personality}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Soul Indicator</p>
              <p className="text-sm text-slate-300">
                Darakaraka <span className="text-amber-400 font-medium">{data.darakaraka}</span> shapes the deepest qualities of your destined partner.
              </p>
            </div>
          </div>

          {/* Generated image */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden relative min-h-64">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Generating portrait…</p>
                <p className="text-xs text-slate-600">This may take 15–30 seconds</p>
              </div>
            )}
            {imgError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500 p-4 text-center">
                <span className="text-2xl">✦</span>
                <p className="text-xs">Portrait generation unavailable</p>
                <p className="text-xs text-slate-600">The soulmate exists beyond the image</p>
              </div>
            )}
            <img
              src={imageUrl}
              alt={`Soulmate portrait — ${data.seventh_house_sign} 7th house`}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ minHeight: "280px" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </div>
        </div>

        <p className="text-xs text-slate-600 text-center">
          Portrait generated by AI based on your 7th house sign ({data.seventh_house_sign}) and Darakaraka ({data.darakaraka}).
          This is symbolic, not literal.
        </p>
      </div>

    </div>
  );
}
