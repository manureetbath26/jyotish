const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BirthDataInput {
  name?: string;
  date: string;
  time: string;
  place: string;
  ayanamsha?: "lahiri" | "krishnamurti" | "raman";
}

export interface PlanetPosition {
  name: string;
  longitude: number;
  rashi: string;
  rashi_num: number;
  degree_in_rashi: number;
  house: number;
  nakshatra: string;
  nakshatra_pada: number;
  is_retrograde: boolean;
  dignity: string | null;
  lord_of_houses: number[];
}

export interface HouseInfo {
  house_num: number;
  rashi: string;
  rashi_num: number;
  lord: string;
  occupants: string[];
}

export interface AntardhashaEntry {
  planet: string;
  start_date: string;
  end_date: string;
}

export interface DashaEntry {
  planet: string;
  start_date: string;
  end_date: string;
  years: number;
  antardashas: AntardhashaEntry[];
}

export interface YogaEntry {
  name: string;
  category: string;
  planets_involved: string[];
  houses: number[];
  strength: "strong" | "moderate" | "weak";
  effects: string;
  interpretation: string;
}

export interface NavamsaPosition {
  name: string;
  rashi: string;
  rashi_num: number;
  house: number;
  degree_in_rashi: number;
}

export interface ChartResponse {
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
  ayanamsha_value: number;
  lagna: string;
  lagna_degree: number;
  planets: PlanetPosition[];
  houses: HouseInfo[];
  current_dasha: DashaEntry;
  current_antardasha: AntardhashaEntry;
  dasha_sequence: DashaEntry[];
  navamsa_lagna: string;
  navamsa_planets: NavamsaPosition[];
  yogas: YogaEntry[];
  julian_day: number;
  calculation_time: string;
}

export async function calculateChart(data: BirthDataInput): Promise<ChartResponse> {
  const res = await fetch(`${API_BASE}/api/chart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Chart calculation failed");
  }

  return res.json();
}

export async function saveChart(name: string, chartData: ChartResponse, token: string) {
  const res = await fetch("/api/charts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, chart_data: chartData }),
  });
  if (!res.ok) throw new Error("Failed to save chart");
  return res.json();
}

export async function getUserCharts() {
  const res = await fetch("/api/charts");
  if (!res.ok) throw new Error("Failed to fetch charts");
  return res.json();
}

// Legacy favorability-period transit types removed Apr 2026 — replaced by
// the ingress-event timeline (see /api/chart/transit-ingresses route +
// IngressEvent in src/components/TransitTimeline.tsx).

export interface CurrentTransitResponse {
  transit_date: string;
  planets: PlanetPosition[];
  houses: HouseInfo[];
  lagna: string;
  lagna_degree: number;
}

export async function calculateCurrentTransits(
  ayanamshaValue: number,
  natalLagnaDegree: number,
): Promise<CurrentTransitResponse> {
  const res = await fetch("/api/chart/current-transits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ayanamsha_value: ayanamshaValue,
      natal_lagna_degree: natalLagnaDegree,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch current transits");
  }
  return res.json();
}

// ── Lifetime Transit Snapshots ───────────────────────────────────────────────

export interface SlowPlanetSnapshot {
  date: string; // YYYY-MM-DD
  planets: Record<string, number>; // planet_name -> house (1-12)
}

export interface LifetimeTransitResponse {
  snapshots: SlowPlanetSnapshot[];
}

export async function fetchLifetimeTransits(
  ayanamshaValue: number,
  natalLagnaDegree: number,
  birthYear: number,
  birthMonth: number = 1,
): Promise<LifetimeTransitResponse> {
  const res = await fetch("/api/chart/lifetime-transits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ayanamsha_value: ayanamshaValue,
      natal_lagna_degree: natalLagnaDegree,
      birth_year: birthYear,
      birth_month: birthMonth,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch lifetime transits");
  }
  return res.json();
}

// ── Panchang & Avakhada ──────────────────────────────────────────────────────

export interface TithiInfo {
  number: number;
  name: string;
  paksha: string;
  nature: string;
  deity: string;
  interpretation: string;
}

export interface KaranInfo {
  name: string;
  number: number;
  is_chara: boolean;
  nature: string;
  interpretation: string;
}

export interface YogaInfo {
  number: number;
  name: string;
  nature: string;
  interpretation: string;
}

export interface NakshatraInfo {
  name: string;
  number: number;
  pada: number;
  lord: string;
  interpretation: string;
}

export interface VaraInfo {
  name: string;
  lord: string;
  interpretation: string;
}

export interface SunriseSunsetInfo {
  sunrise_utc: string | null;
  sunset_utc: string | null;
  sunrise_local: string | null;
  sunset_local: string | null;
}

export interface AvakhadaInfo {
  varna: string;
  vashya: string;
  yoni: string;
  gan: string;
  nadi: string;
  moon_sign: string;
  sign_lord: string;
  nakshatra: string;
  nakshatra_charan: number;
  yoga: string;
  karan: string;
  tithi: string;
  yunja: string;
  tatva: string;
  name_alphabet: string[];
  paya: string;
}

export interface AvakhadaInterpretations {
  varna: string;
  gan: string;
  nadi: string;
  yoni: string;
  paya: string;
}

export interface PanchangResponse {
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  vara: VaraInfo;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karan: KaranInfo;
  sun_times: SunriseSunsetInfo;
  avakhada: AvakhadaInfo;
  avakhada_interpretations: AvakhadaInterpretations;
}

export async function calculatePanchang(data: {
  date: string;
  time: string;
  place: string;
  ayanamsha?: string;
}): Promise<PanchangResponse> {
  const res = await fetch(`${API_BASE}/api/chart/panchang`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Panchang calculation failed");
  }
  return res.json();
}

// calculateTransits() removed Apr 2026 — call /api/chart/transit-ingresses
// directly (see TransitCalculator.tsx). The old favorability-period model
// has been replaced by the ingress-event timeline.
