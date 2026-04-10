const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BirthDataInput {
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

export interface TransitDetail {
  planet: string;
  influence: "favorable" | "unfavorable";
  transit_rashi: string;
  transit_degree: number;
  transit_house: number;
  reason: string;
}

export interface TransitPeriod {
  start_date: string;
  end_date: string;
  type: "favorable" | "unfavorable" | "neutral";
  duration_days: number;
  strength: "strong" | "moderate" | "weak";
  active_planets: string[];
  description: string;
  guidance: string;
  rating: number; // 1-5
  rating_label: string;
  transit_details: TransitDetail[];
}

export interface MajorTransitEvent {
  date: string;
  type: string;
  planet: string;
  natal_position: number;
  transit_position: number;
}

export interface TransitChartResponse {
  start_date: string;
  end_date: string;
  timelines: Record<string, TransitPeriod[]>;
  major_transits: MajorTransitEvent[];
  summary: Record<string, string>;
}

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

export async function calculateTransits(
  chartData: ChartResponse,
  startDate: string,
  endDate: string,
  lifeAreas?: string[]
): Promise<TransitChartResponse> {
  const res = await fetch(`${API_BASE}/api/chart/transits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chart_data: chartData,
      start_date: startDate,
      end_date: endDate,
      life_areas: lifeAreas,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Transit calculation failed");
  }

  return res.json();
}
