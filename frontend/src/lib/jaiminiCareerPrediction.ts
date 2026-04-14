/**
 * Jaimini Career Prediction Engine
 *
 * Evaluates career timing, growth, and stagnation based on Jaimini principles.
 * Designed as a subsection of the Jaimini Life Report.
 *
 * Key reference points:
 * - 10th House: Karma sthana (house of action/career)
 * - Amatya Karaka (AmK): Planet with 2nd-highest degrees — primary career significator
 * - A10 (Rajya Pada): Pada of the 10th house — professional reputation
 * - Karakamsha: Navamsa of Atmakaraka — soul's purpose
 * - 10th from Karakamsha: Professional calling
 *
 * Six career rules evaluated:
 *
 * Rule 1: Transit Saturn connects with 10th house, its lord, or AmK —
 *         creates structural career changes, responsibility, maturation.
 *
 * Rule 2: Transit Jupiter aspects 10th house, AL, or AmK —
 *         brings expansion, growth, opportunities, promotions.
 *
 * Rule 3: Transit Mars connects with 10th house, A10, or their lords —
 *         provides initiative, drive, and decisive career action.
 *
 * Rule 4: Amatya Karaka (AmK) natal connection with 10th house, AL, A10
 *         or their lords — foundational career strength.
 *
 * Rule 5: Current Chara Dasha MD/AD connected with 10th house, AmK,
 *         A10, AL, or their lords.
 *
 * Rule 6: MD/AD receive Argala from AmK and/or natural career
 *         significators (Saturn, Sun, Mercury).
 */

import type { ChartResponse, PlanetPosition } from "./api";
import {
  hasJaiminiAspect,
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  type Sign,
} from "./charaDashaEngine";
import { getEffectiveArgalaOnSign } from "./jaiminiArgala";
import type {
  JaiminiPredictionInput,
  EnrichedDashaPeriod,
  EnrichedSubPeriod,
} from "./jaiminiPredictiveEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Transit positions for the three key planets */
export interface TransitPositions {
  saturn: Sign;
  mars: Sign;
  jupiter: Sign;
}

/** A scored month in the career scan */
export interface CareerWindowMonth {
  date: string;
  month: string;           // "Jan 2026"
  rulesSatisfied: number;
  rulesMetList: number[];
  strength: "strong" | "moderate" | "weak" | "not indicated";
  md: string | null;
  ad: string | null;
  transit: TransitPositions;
}

/** Result of the career scan */
export interface CareerWindowScan {
  months: CareerWindowMonth[];
  windows: CareerWindow[];
  peakMonth: CareerWindowMonth | null;
  tenthSign: Sign;
  alSign: Sign;
  a10Sign: Sign;
  amk: string;
  amkSign: Sign;
}

/** A continuous window of favorable career months */
export interface CareerWindow {
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  peakScore: number;
  avgScore: number;
  months: CareerWindowMonth[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

function getTrines(sign: Sign): Sign[] {
  return [sign, signAtOffset(sign, 5), signAtOffset(sign, 9)];
}

function hasConnection(transitSign: Sign, targetSign: Sign): boolean {
  if (transitSign === targetSign) return true;
  return hasJaiminiAspect(transitSign, targetSign);
}

function getNatalSign(planets: PlanetPosition[], name: string): Sign | null {
  const p = planets.find((pl) => pl.name === name);
  return p ? (p.rashi as Sign) : null;
}

function getLordAndPlacement(
  sign: Sign,
  planets: PlanetPosition[],
): { lord: string; lordSign: Sign } {
  const lord = SIGN_LORD[sign];
  const lordPlanet = planets.find((p) => p.name === lord);
  const lordSign = lordPlanet ? (lordPlanet.rashi as Sign) : sign;
  return { lord, lordSign };
}

function houseToSign(lagna: Sign, house: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[lagna] + house - 1) % 12];
}

function findDashaForDate(
  dateStr: string,
  dashaSequence: JaiminiPredictionInput["dashaSequence"],
): { md: Sign | null; ad: Sign | null } {
  for (const dasha of dashaSequence) {
    if (dateStr >= dasha.startDate && dateStr < dasha.endDate) {
      let adSign: Sign | null = null;
      for (const sub of dasha.subPeriods) {
        if (dateStr >= sub.startDate && dateStr < sub.endDate) {
          adSign = sub.sign;
          break;
        }
      }
      return { md: dasha.sign, ad: adSign };
    }
  }
  return { md: null, ad: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Quick rule scorer (lightweight — for monthly scanning)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all 6 career rules quickly and return count + met list.
 */
function scoreCareerRulesQuick(
  transit: TransitPositions,
  tenthSign: Sign,
  tenthLordSign: Sign,
  alSign: Sign,
  alLordSign: Sign,
  a10Sign: Sign,
  a10LordSign: Sign,
  amkName: string,
  amkSign: Sign,
  natalSaturn: Sign,
  natalMars: Sign,
  natalJupiter: Sign,
  mdSign: Sign | null,
  adSign: Sign | null,
  natalPlanets: PlanetPosition[],
): { count: number; met: number[] } {
  const met: number[] = [];

  // Rule 1: Transit Saturn ↔ 10th house / 10th lord / AmK + natal
  const tenthTrines = getTrines(tenthSign);
  const r1PartA =
    hasConnection(transit.saturn, tenthSign) ||
    hasConnection(transit.saturn, tenthLordSign) ||
    hasConnection(transit.saturn, amkSign) ||
    tenthTrines.some((t) => transit.saturn === t);
  const r1PartB =
    hasConnection(transit.saturn, natalSaturn) ||
    hasConnection(transit.saturn, natalJupiter) ||
    hasConnection(transit.saturn, natalMars);
  if (r1PartA && r1PartB) met.push(1);

  // Rule 2: Transit Jupiter ↔ 10th house + AL/AmK
  const r2PartA =
    hasConnection(transit.jupiter, tenthSign) ||
    hasConnection(transit.jupiter, tenthLordSign) ||
    hasConnection(transit.jupiter, amkSign);
  const r2PartB =
    hasConnection(transit.jupiter, alSign) ||
    hasConnection(transit.jupiter, alLordSign) ||
    hasConnection(transit.jupiter, a10Sign);
  if (r2PartA && r2PartB) met.push(2);

  // Rule 3: Transit Mars ↔ 10th / A10 + natal
  const r3PartA =
    hasConnection(transit.mars, tenthSign) ||
    hasConnection(transit.mars, tenthLordSign) ||
    hasConnection(transit.mars, a10Sign) ||
    hasConnection(transit.mars, a10LordSign);
  const r3PartB =
    hasConnection(transit.mars, natalSaturn) ||
    hasConnection(transit.mars, natalJupiter) ||
    hasConnection(transit.mars, natalMars);
  if (r3PartA && r3PartB) met.push(3);

  // Rule 4: AmK natal connection (same every month)
  const r4 =
    hasConnection(amkSign, tenthSign) ||
    hasConnection(amkSign, tenthLordSign) ||
    hasConnection(amkSign, alSign) ||
    hasConnection(amkSign, alLordSign) ||
    hasConnection(amkSign, a10Sign) ||
    hasConnection(amkSign, a10LordSign);
  if (r4) met.push(4);

  // Rule 5: Dasha ↔ career factors
  if (mdSign || adSign) {
    const targets = [
      tenthSign, tenthLordSign, amkSign, alSign, alLordSign,
      a10Sign, a10LordSign,
    ];
    let r5 = false;
    if (mdSign) r5 = r5 || targets.some((t) => hasConnection(mdSign, t));
    if (adSign) r5 = r5 || targets.some((t) => hasConnection(adSign, t));
    if (r5) met.push(5);
  }

  // Rule 6: Argala on MD/AD from AmK or natural career significators
  const CAREER_SIGNIFICATORS = ["Saturn", "Sun", "Mercury"];
  let r6 = false;
  if (mdSign) {
    const mdArgala = getEffectiveArgalaOnSign(mdSign, natalPlanets);
    const mdArgalaPlanets = mdArgala.map((a) => a.planet);
    r6 =
      mdArgalaPlanets.includes(amkName) ||
      CAREER_SIGNIFICATORS.some((p) => mdArgalaPlanets.includes(p));
  }
  if (!r6 && adSign) {
    const adArgala = getEffectiveArgalaOnSign(adSign, natalPlanets);
    const adArgalaPlanets = adArgala.map((a) => a.planet);
    r6 =
      adArgalaPlanets.includes(amkName) ||
      CAREER_SIGNIFICATORS.some((p) => adArgalaPlanets.includes(p));
  }
  if (r6) met.push(6);

  return { count: met.length, met };
}

function strengthFromCount(
  count: number,
): "strong" | "moderate" | "weak" | "not indicated" {
  if (count >= 5) return "strong";
  if (count >= 3) return "moderate";
  if (count >= 1) return "weak";
  return "not indicated";
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// ────────────────────────────────────────────────────────────────────────────
// Main scanner
// ────────────────────────────────────────────────────────────────────────────

/**
 * Scan for career windows across a given time range.
 *
 * Uses the same transit snapshot format as the marriage engine.
 */
export function scanCareerWindows(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
  snapshots: { date: string; planets: Record<string, number> }[],
  yearsToScan: number = 5,
  fromDate?: string,
): CareerWindowScan {
  const lagna = input.lagna as Sign;

  // ── Resolve career reference points ──
  const tenthSign = signAtOffset(lagna, 10);
  const { lord: tenthLord, lordSign: tenthLordSign } = getLordAndPlacement(
    tenthSign,
    chart.planets,
  );

  const alSign = input.arudhaLagna?.padaSign || lagna;
  const { lord: alLord, lordSign: alLordSign } = getLordAndPlacement(
    alSign,
    chart.planets,
  );

  // A10 — pada of the 10th house
  const a10Pada = input.allPadas.find((p) => p.house === 10);
  const a10Sign = a10Pada?.padaSign || tenthSign;
  const { lord: a10Lord, lordSign: a10LordSign } = getLordAndPlacement(
    a10Sign,
    chart.planets,
  );

  // Amatya Karaka (AmK) — 2nd highest degree
  const amk = input.karakas.find((k) => k.role === "Amatyakaraka");
  const amkName = amk?.planet || "Mercury";
  const amkSign = (amk?.rashi as Sign) || lagna;

  // Natal positions
  const natalSaturn = getNatalSign(chart.planets, "Saturn") || lagna;
  const natalMars = getNatalSign(chart.planets, "Mars") || lagna;
  const natalJupiter = getNatalSign(chart.planets, "Jupiter") || lagna;

  // Mars projection constants
  const DAYS_PER_SIGN_MARS = 57;
  const natalMarsIdx = SIGN_INDEX[natalMars];

  // ── Build date range ──
  let startDate: string;
  if (fromDate) {
    const fd = new Date(fromDate + "T00:00:00");
    startDate = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, "0")}-01`;
  } else {
    const today = new Date();
    startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const startD = new Date(startDate + "T00:00:00");
  const endYear = startD.getFullYear() + yearsToScan;
  const endDate = `${endYear}-${String(startD.getMonth() + 1).padStart(2, "0")}-01`;

  const relevantSnapshots = snapshots.filter(
    (s) => s.date >= startDate && s.date <= endDate,
  );

  const scanBaseDate = new Date(startDate + "T00:00:00").getTime();

  // ── Score each month ──
  const months: CareerWindowMonth[] = [];

  for (const snap of relevantSnapshots) {
    const saturnHouse = snap.planets["Saturn"];
    const jupiterHouse = snap.planets["Jupiter"];
    if (!saturnHouse || !jupiterHouse) continue;

    // Mars fallback projection
    let marsHouse = snap.planets["Mars"];
    if (!marsHouse) {
      const snapDateMs = new Date(snap.date + "T00:00:00").getTime();
      const daysDiff = (snapDateMs - scanBaseDate) / 86400000;
      const signsAdvanced = Math.floor(daysDiff / DAYS_PER_SIGN_MARS);
      const projectedMarsSign =
        ZODIAC_ORDER[(natalMarsIdx + signsAdvanced) % 12];
      marsHouse =
        ((SIGN_INDEX[projectedMarsSign] - SIGN_INDEX[lagna] + 12) % 12) + 1;
    }

    const transit: TransitPositions = {
      saturn: houseToSign(lagna, saturnHouse),
      mars: houseToSign(lagna, marsHouse),
      jupiter: houseToSign(lagna, jupiterHouse),
    };

    const { md, ad } = findDashaForDate(snap.date, input.dashaSequence);

    const { count, met } = scoreCareerRulesQuick(
      transit,
      tenthSign,
      tenthLordSign,
      alSign,
      alLordSign,
      a10Sign,
      a10LordSign,
      amkName,
      amkSign,
      natalSaturn,
      natalMars,
      natalJupiter,
      md,
      ad,
      chart.planets,
    );

    months.push({
      date: snap.date,
      month: formatMonthLabel(snap.date),
      rulesSatisfied: count,
      rulesMetList: met,
      strength: strengthFromCount(count),
      md: md || null,
      ad: ad || null,
      transit,
    });
  }

  // ── Group favorable months (3+ rules) into continuous windows ──
  const windows: CareerWindow[] = [];
  let currentWindow: CareerWindowMonth[] = [];

  for (const m of months) {
    if (m.rulesSatisfied >= 3) {
      currentWindow.push(m);
    } else {
      if (currentWindow.length > 0) {
        windows.push(buildWindow(currentWindow));
        currentWindow = [];
      }
    }
  }
  if (currentWindow.length > 0) {
    windows.push(buildWindow(currentWindow));
  }

  // ── Find peak month ──
  let peakMonth: CareerWindowMonth | null = null;
  for (const m of months) {
    if (!peakMonth || m.rulesSatisfied > peakMonth.rulesSatisfied) {
      peakMonth = m;
    }
  }

  return {
    months,
    windows,
    peakMonth,
    tenthSign,
    alSign,
    a10Sign,
    amk: amkName,
    amkSign,
  };
}

function buildWindow(months: CareerWindowMonth[]): CareerWindow {
  const scores = months.map((m) => m.rulesSatisfied);
  return {
    startDate: months[0].date,
    endDate: months[months.length - 1].date,
    startMonth: months[0].month,
    endMonth: months[months.length - 1].month,
    peakScore: Math.max(...scores),
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    months,
  };
}
