/**
 * Karaka (Significator) types, interfaces, and UI constants.
 *
 * All interpretation TEXT has been moved to the database (Interpretation table).
 * Use the useKarakaInterpretations() hook or fetch from /api/interpretations
 * to get the actual content.
 *
 * This file retains:
 *   - TypeScript interfaces
 *   - Planet color / background maps (UI-only)
 */

// ---------------------------------------------------------------------------
// Chara Karaka role interface
// ---------------------------------------------------------------------------
export interface CharaKarakaRole {
  id: string;
  name: string;
  shortName: string;
  meaning: string;
  governs: string;
  icon: string;
  lifeThemes: string[];
  strongPlacement: string;
  weakPlacement: string;
}

// ---------------------------------------------------------------------------
// Naisargika Karaka interface
// ---------------------------------------------------------------------------
export interface NaisargikaKaraka {
  planet: string;
  significations: string[];
  overview: string;
  strongResult: string;
  weakResult: string;
}

// ---------------------------------------------------------------------------
// Dignity labels (UI)
// ---------------------------------------------------------------------------
export const DIGNITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  exalted:     { label: "Exalted",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  own_sign:    { label: "Own Sign",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30" },
  mool_trikona:{ label: "Mool Trikona",color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30" },
  debilitated: { label: "Debilitated", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
};

// ---------------------------------------------------------------------------
// Planet → color mapping (consistent across the app)
// ---------------------------------------------------------------------------
export const KARAKA_PLANET_COLORS: Record<string, string> = {
  Sun:     "text-amber-400",
  Moon:    "text-blue-300",
  Mars:    "text-red-400",
  Mercury: "text-emerald-400",
  Jupiter: "text-yellow-400",
  Venus:   "text-pink-400",
  Saturn:  "text-slate-400",
  Rahu:    "text-purple-400",
  Ketu:    "text-orange-400",
};

export const KARAKA_PLANET_BG: Record<string, string> = {
  Sun:     "bg-amber-500/10 border-amber-500/30",
  Moon:    "bg-blue-500/10 border-blue-500/30",
  Mars:    "bg-red-500/10 border-red-500/30",
  Mercury: "bg-emerald-500/10 border-emerald-500/30",
  Jupiter: "bg-yellow-500/10 border-yellow-500/30",
  Venus:   "bg-pink-500/10 border-pink-500/30",
  Saturn:  "bg-slate-500/10 border-slate-500/30",
  Rahu:    "bg-purple-500/10 border-purple-500/30",
  Ketu:    "bg-orange-500/10 border-orange-500/30",
};
