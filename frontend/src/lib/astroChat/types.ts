// ─────────────────────────────────────────────────────────────────────────────
// Astrology Chatbot — shared types for the multi-agent LangGraph pipeline
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartResponse } from "@/lib/api";
import type { MarriageWindowScan } from "@/lib/jaiminiMarriagePrediction";
import type { CareerWindowScan } from "@/lib/jaiminiCareerPrediction";
import type { AshtakvargaAnalysis } from "@/lib/ashtakvargaEngine";
import type { DetectedYoga, D9Analysis } from "@/lib/yogaEngine";

// ── Birth data snapshot ───────────────────────────────────────────────────────

export interface BirthData {
  date: string;    // YYYY-MM-DD
  time: string;    // HH:mm
  place: string;
  name?: string;
}

// ── Intent — output of the Interpreter node ───────────────────────────────────

export type LifeTheme =
  | "marriage"
  | "career"
  | "finances"
  | "health"
  | "children"
  | "foreign_travel"
  | "property"
  | "spirituality"
  | "general"
  | "dasha"
  | "yoga"
  | "transit";

export type Tense = "past" | "present" | "future";

export interface Intent {
  /** Core life theme of the question */
  lifeTheme: LifeTheme;
  /** Temporal direction: past inquiry, present situation, or future prediction */
  tense: Tense;
  /** Whether the user wants timing (e.g. "when will …") */
  wantsTiming: boolean;
  /** Whether the user wants strength/yoga assessment */
  wantsStrength: boolean;
  /** Whether the user wants remedies */
  wantsRemedies: boolean;
  /** Concise restatement of what was asked (used as context for the astrologer) */
  questionSummary: string;
  /** Years to scan — default 5 for future, null for present/past */
  yearsToScan: number | null;
}

// ── Astrology data — output of the Data Collector node ───────────────────────

export interface AstrologyData {
  /** Structured prediction input (Jaimini karakas, padas, dasha) */
  predictionInput: import("@/lib/jaiminiPredictiveEngine").JaiminiPredictionInput;
  /** Marriage timing windows — populated for marriage / love themes */
  marriageScan?: MarriageWindowScan;
  /** Career timing windows — populated for career theme */
  careerScan?: CareerWindowScan;
  /** Ashtakvarga analysis */
  ashtakvarga?: AshtakvargaAnalysis;
  /** Detected yogas — filtered to relevant theme */
  yogas?: DetectedYoga[];
  /** D9 strength overview */
  d9?: D9Analysis;
  /** Current dasha summary pulled from chart */
  currentDasha: {
    planet: string;
    endDate: string;
    subPlanet: string;
    subEndDate: string;
  };
  /** Lagna sign */
  lagna: string;
  /** Chart summary: planet-house placements for the astrologer's context */
  planetHouses: Record<string, number>;
}

// ── LangGraph state ───────────────────────────────────────────────────────────

export interface AstroChatStateShape {
  /** Full natal chart — passed in, never modified */
  chart: ChartResponse;
  /** Birth metadata */
  birthData: BirthData;
  /** Raw user message for this turn */
  userMessage: string;
  /** Structured intent extracted by the interpreter */
  intent: Intent | null;
  /** Assembled astrology data by the collector */
  astrologyData: AstrologyData | null;
  /** Final prose answer from the astrologer — streamed token-by-token */
  finalAnswer: string;
  /** Any error from any node */
  error: string | null;
}
