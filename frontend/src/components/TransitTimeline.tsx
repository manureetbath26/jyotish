"use client";

import React from "react";

/**
 * Transit Timeline — merged, categorised ingress-event view.
 *
 * Redesigned: events from all selected life areas are merged into a single
 * chronological list, split into two sections:
 *   1. Transit Ingresses (slow planets entering a new sign)
 *   2. Dasha Shifts (pratyantardasha / sub-sub-period changes)
 *
 * Each card shows one bullet per selected life area instead of a single
 * area-specific interpretation.
 */

export interface IngressEvent {
  date: string;
  planet: string;
  from_sign: string;
  to_sign: string;
  from_house: number;
  to_house: number;
  is_retrograde: boolean;
  duration_days: number;
  next_ingress_date: string | null;
  classification: "favorable" | "unfavorable" | "neutral";
  /** Composed interpretation for one life area. */
  interpretation: string;
  life_area: string;
  /** True for the "currently here" card. */
  is_current?: boolean;
  event_type?: "ingress" | "pratyantardasha";
  md_lord?: string | null;
  ad_lord?: string | null;
}

/** A single event merged across all selected life areas. */
export interface MergedEvent {
  planet: string;
  date: string;
  from_sign: string;
  to_sign: string;
  from_house: number;
  to_house: number;
  is_retrograde: boolean;
  duration_days: number;
  next_ingress_date: string | null;
  /** Overall classification: if any area is favorable → favorable;
   *  if any area is unfavorable → unfavorable; else neutral. */
  classification: "favorable" | "unfavorable" | "neutral";
  is_current?: boolean;
  event_type?: "ingress" | "pratyantardasha";
  md_lord?: string | null;
  ad_lord?: string | null;
  areaInterpretations: {
    areaId: string;
    areaLabel: string;
    interpretation: string;
    classification: "favorable" | "unfavorable" | "neutral";
  }[];
}

/** Merge events_by_area into a sorted list of MergedEvents. */
export function mergeEventsByArea(
  eventsByArea: Record<string, IngressEvent[]>,
  selectedAreas: string[],
  areaLabels: Record<string, string>,
): MergedEvent[] {
  const map = new Map<string, MergedEvent>();

  for (const areaId of selectedAreas) {
    for (const e of eventsByArea[areaId] ?? []) {
      const key = `${e.event_type ?? "ingress"}-${e.planet}-${e.date}`;
      if (!map.has(key)) {
        map.set(key, {
          planet: e.planet,
          date: e.date,
          from_sign: e.from_sign,
          to_sign: e.to_sign,
          from_house: e.from_house,
          to_house: e.to_house,
          is_retrograde: e.is_retrograde,
          duration_days: e.duration_days,
          next_ingress_date: e.next_ingress_date,
          classification: "neutral",
          is_current: e.is_current,
          event_type: e.event_type,
          md_lord: e.md_lord,
          ad_lord: e.ad_lord,
          areaInterpretations: [],
        });
      }
      const merged = map.get(key)!;
      merged.areaInterpretations.push({
        areaId,
        areaLabel: areaLabels[areaId] ?? areaId,
        interpretation: e.interpretation,
        classification: e.classification,
      });
      // Roll up classification: favorable > unfavorable > neutral
      if (e.classification === "favorable") merged.classification = "favorable";
      else if (e.classification === "unfavorable" && merged.classification !== "favorable")
        merged.classification = "unfavorable";
    }
  }

  // Sort by date; ACTIVE NOW always first
  return Array.from(map.values()).sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return a.date.localeCompare(b.date);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLASSIFICATION_STYLES = {
  favorable: {
    bg: "bg-green-900/20 border-green-800/50",
    dot: "bg-green-400",
    label: "text-green-400",
    labelText: "FAVORABLE",
    bullet: "text-green-300",
  },
  unfavorable: {
    bg: "bg-red-900/20 border-red-800/50",
    dot: "bg-red-400",
    label: "text-red-400",
    labelText: "CHALLENGING",
    bullet: "text-red-300",
  },
  neutral: {
    bg: "bg-slate-800/40 border-slate-700/50",
    dot: "bg-slate-400",
    label: "text-slate-400",
    labelText: "NEUTRAL",
    bullet: "text-slate-300",
  },
} as const;

const AREA_CLASSIFICATION_DOT: Record<IngressEvent["classification"], string> = {
  favorable: "text-green-400",
  unfavorable: "text-red-400",
  neutral: "text-slate-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `~${Math.round(days / 7)} weeks`;
  return `~${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? "" : "s"}`;
}

// ─── Card ────────────────────────────────────────────────────────────────────

function EventCard({ e }: { e: MergedEvent }) {
  const styles = CLASSIFICATION_STYLES[e.classification];
  const isCurrent = e.is_current === true;
  const isPD = e.event_type === "pratyantardasha";

  return (
    <li
      className={`rounded-lg border p-3.5 ${styles.bg} ${
        isCurrent ? "ring-1 ring-amber-500/40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">

          {/* Row 1 — planet name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-200">
              {e.planet}{e.is_retrograde ? " ᴿ" : ""}
            </span>
            {isPD && (
              <span className="text-[10px] font-bold tracking-wide text-purple-400">
                PRATYANTARDASHA
              </span>
            )}
            {isCurrent && (
              <span className="text-[10px] font-bold tracking-wide text-amber-400">
                ACTIVE NOW
              </span>
            )}
            <span className={`text-[10px] font-bold tracking-wide ${styles.label}`}>
              {styles.labelText}
            </span>
          </div>

          {/* Row 2 — what is happening */}
          {!isPD && (
            <p className="text-sm font-medium text-slate-100 mt-0.5">
              {isCurrent
                ? <>In <span className="text-amber-300">{e.to_sign}</span> · House {e.to_house}</>
                : <>Entering <span className="text-amber-300">{e.to_sign}</span> · House {e.to_house}</>
              }
            </p>
          )}
          {isPD && (
            <span className="text-xs text-slate-400 mt-0.5 block">
              {e.md_lord ?? "?"}–{e.ad_lord ?? "?"}–
              <span className="text-slate-200 font-medium">{e.planet}</span> sub-period
            </span>
          )}

          {/* Row 3 — date + duration */}
          <p className="text-xs text-slate-400 mt-1">
            {isCurrent
              ? <>Active since <span className="text-slate-300 font-medium">{formatDate(e.date)}</span></>
              : <span className="text-slate-300 font-medium">{formatDate(e.date)}</span>
            }
            {" · stays "}
            {formatDuration(e.duration_days)}
            {e.next_ingress_date && <> (until {formatDate(e.next_ingress_date)})</>}
            {!e.next_ingress_date && <> (continues past window)</>}
            {!isPD && (
              <span className="text-slate-600"> · from {e.from_sign} H{e.from_house}</span>
            )}
          </p>

          {/* Life-theme bullets */}
          {e.areaInterpretations.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {e.areaInterpretations.map(ai => (
                <li key={ai.areaId} className="flex gap-2 text-sm leading-relaxed">
                  <span
                    className={`mt-0.5 flex-shrink-0 text-[10px] font-bold tracking-wide ${
                      AREA_CLASSIFICATION_DOT[ai.classification]
                    }`}
                  >
                    ●
                  </span>
                  <span>
                    <span className="text-slate-400 text-xs font-medium mr-1">{ai.areaLabel}</span>
                    <span className="text-slate-300">{ai.interpretation}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function EventSection({
  title,
  subtitle,
  events,
  emptyText,
}: {
  title: string;
  subtitle: string;
  events: MergedEvent[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-amber-400">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {events.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-800/30 border border-slate-800 rounded-lg p-4">
          {emptyText}
        </div>
      ) : (
        <ol className="space-y-3">
          {events.map((e, i) => (
            <EventCard key={`${e.event_type ?? "ingress"}-${e.planet}-${e.date}-${i}`} e={e} />
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface MergedTransitTimelineProps {
  ingresses: MergedEvent[];
  pdShifts: MergedEvent[];
}

export function MergedTransitTimeline({ ingresses, pdShifts }: MergedTransitTimelineProps) {
  return (
    <div className="space-y-8">
      <EventSection
        title="🪐 Transit Ingresses"
        subtitle="Mars and slow planets entering a new sign — each card shows what this transit means for each of your selected life themes."
        events={ingresses}
        emptyText="No ingress events in this window. Slow planets can take years to change sign — try widening the date range."
      />
      <EventSection
        title="⏱ Dasha Shifts"
        subtitle="Pratyantardasha (sub-sub-period) changes inside your current Vimshottari dasha — finer timing that colours day-to-day energy."
        events={pdShifts}
        emptyText="No pratyantardasha shifts detected in this window."
      />
    </div>
  );
}

// Keep the old single-area export so any other callers don't break.
export function TransitTimeline({
  lifeArea,
  events,
}: {
  lifeArea: string;
  events: IngressEvent[];
  narrative?: string;
}) {
  // Wrap legacy single-area events into MergedEvents for backwards compat
  const merged: MergedEvent[] = events.map(e => ({
    ...e,
    classification: e.classification,
    areaInterpretations: [{
      areaId: e.life_area,
      areaLabel: e.life_area,
      interpretation: e.interpretation,
      classification: e.classification,
    }],
  }));
  const ingresses = merged.filter(e => e.event_type !== "pratyantardasha");
  const pdShifts  = merged.filter(e => e.event_type === "pratyantardasha");
  return <MergedTransitTimeline ingresses={ingresses} pdShifts={pdShifts} />;
}
