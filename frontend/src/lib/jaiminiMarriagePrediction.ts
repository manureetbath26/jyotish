/**
 * Jaimini Marriage Prediction Engine
 *
 * Evaluates marriage timing based on Jaimini principles.
 * Designed to be a subsection of the Jaimini Life Report.
 *
 * MANDATORY condition: Transit of Saturn, Mars and Jupiter must be connected
 * with 7th House, Arudha Lagna (AL) and Upa-Pada (UL) or their Lords.
 *
 * Six rules are evaluated:
 *
 * Rule 1: Transit Saturn aspects UL or its Lord, or transits on UL or its
 *         trines. During this transit, Saturn should aspect its natal position
 *         or natal Jupiter/Mars or both.
 *
 * Rule 2: Transit Mars should have connection with the factors in Rule 1.
 *
 * Rule 3: Transit Jupiter should aspect AL or its Lord, as well as
 *         7th House / 7th House Lord.
 *
 * Rule 4: Darakaraka (DK) will be connected by one or many ways with the
 *         houses and lords indicated in Rules 1–3.
 *
 * Rule 5: Chara Dasha running at the moment should be connected with
 *         the above parameters.
 *
 * Rule 6: Chara Dasha Maha Dasha (MD) and Antar Dasha (AD) should receive
 *         Argala from Darakaraka and/or their respective lords.
 */

import type { ChartResponse, PlanetPosition } from "./api";
import type { KarakaResult } from "./karakaEngine";
import {
  hasJaiminiAspect,
  ZODIAC_ORDER,
  SIGN_INDEX,
  SIGN_LORD,
  type Sign,
  type PadaResult,
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
  /** Current sign of transit Saturn */
  saturn: Sign;
  /** Current sign of transit Mars */
  mars: Sign;
  /** Current sign of transit Jupiter */
  jupiter: Sign;
}

/** Result of evaluating a single rule */
export interface RuleResult {
  ruleNumber: number;
  ruleName: string;
  description: string;
  isSatisfied: boolean;
  /** Detailed sub-checks that were evaluated */
  checks: RuleCheck[];
  /** Human-readable explanation of the result */
  explanation: string;
}

/** A single sub-check within a rule */
export interface RuleCheck {
  condition: string;
  met: boolean;
  detail: string;
}

/** Complete marriage prediction report */
export interface MarriagePredictionReport {
  // ── Key reference points ──
  ulSign: Sign;
  ulLord: string;
  ulLordSign: Sign;
  alSign: Sign;
  alLord: string;
  alLordSign: Sign;
  seventhHouseSign: Sign;
  seventhHouseLord: string;
  seventhHouseLordSign: Sign;
  darakaraka: string;
  darakarakaSign: Sign;

  // ── Natal positions of key planets ──
  natalSaturnSign: Sign;
  natalMarsSign: Sign;
  natalJupiterSign: Sign;

  // ── Transit positions used ──
  transit: TransitPositions;

  // ── Current Dasha ──
  currentMD: string | null;
  currentAD: string | null;

  // ── Rule evaluations ──
  rules: RuleResult[];

  // ── Overall assessment ──
  rulesSatisfied: number;
  totalRules: number;
  isMarriageIndicated: boolean;
  strength: "strong" | "moderate" | "weak" | "not indicated";
  summary: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the sign at a given offset from a reference sign.
 * Offset 1 = same sign, 2 = next sign, etc. (1-based)
 */
function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

/**
 * Get the trines (1st, 5th, 9th) from a sign.
 */
function getTrines(sign: Sign): Sign[] {
  return [
    sign,                          // 1st (same sign)
    signAtOffset(sign, 5),         // 5th
    signAtOffset(sign, 9),         // 9th
  ];
}

/**
 * Check if a transit planet "aspects or is on" a target sign.
 * "Connection" = transit planet is IN the target sign, or has Jaimini aspect to it.
 */
function hasConnection(transitSign: Sign, targetSign: Sign): boolean {
  if (transitSign === targetSign) return true;
  return hasJaiminiAspect(transitSign, targetSign);
}

/**
 * Find a planet's natal sign from the chart.
 */
function getNatalSign(planets: PlanetPosition[], name: string): Sign | null {
  const p = planets.find((pl) => pl.name === name);
  return p ? (p.rashi as Sign) : null;
}

/**
 * Find the lord of a sign and where that lord is placed.
 */
function getLordAndPlacement(
  sign: Sign,
  planets: PlanetPosition[],
): { lord: string; lordSign: Sign } {
  const lord = SIGN_LORD[sign];
  const lordPlanet = planets.find((p) => p.name === lord);
  const lordSign = lordPlanet ? (lordPlanet.rashi as Sign) : sign;
  return { lord, lordSign };
}

/**
 * Get the 7th house sign from lagna.
 */
function getSeventhHouse(lagna: Sign): Sign {
  return signAtOffset(lagna, 7);
}

// ────────────────────────────────────────────────────────────────────────────
// Rule evaluators
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rule 1: Transit Saturn ↔ UL
 *
 * Transit Saturn should:
 * - Aspect UL or its Lord, OR transit on UL or its trines
 * AND during this:
 * - Aspect its own natal position OR natal Jupiter/Mars or both
 */
function evaluateRule1(
  transitSaturn: Sign,
  ulSign: Sign,
  ulLord: string,
  ulLordSign: Sign,
  natalSaturn: Sign,
  natalJupiter: Sign,
  natalMars: Sign,
): RuleResult {
  const checks: RuleCheck[] = [];
  const ulTrines = getTrines(ulSign);

  // Part A: Saturn connects with UL system
  const aspectsUL = hasConnection(transitSaturn, ulSign);
  checks.push({
    condition: "Transit Saturn aspects/on UL",
    met: aspectsUL,
    detail: `Transit Saturn in ${transitSaturn}, UL in ${ulSign} — ${aspectsUL ? "connected" : "no connection"}`,
  });

  const aspectsULLord = hasConnection(transitSaturn, ulLordSign);
  checks.push({
    condition: "Transit Saturn aspects/on UL Lord",
    met: aspectsULLord,
    detail: `Transit Saturn in ${transitSaturn}, UL Lord ${ulLord} in ${ulLordSign} — ${aspectsULLord ? "connected" : "no connection"}`,
  });

  const onULTrines = ulTrines.some((t) => transitSaturn === t);
  checks.push({
    condition: "Transit Saturn on UL or its trines",
    met: onULTrines,
    detail: `UL trines: ${ulTrines.join(", ")}. Saturn in ${transitSaturn} — ${onULTrines ? "yes" : "no"}`,
  });

  const partA = aspectsUL || aspectsULLord || onULTrines;

  // Part B: Saturn also aspects natal position or natal Jupiter/Mars
  const aspectsNatalSelf = hasConnection(transitSaturn, natalSaturn);
  checks.push({
    condition: "Transit Saturn aspects natal Saturn",
    met: aspectsNatalSelf,
    detail: `Transit Saturn in ${transitSaturn}, natal Saturn in ${natalSaturn} — ${aspectsNatalSelf ? "connected" : "no connection"}`,
  });

  const aspectsNatalJupiter = hasConnection(transitSaturn, natalJupiter);
  checks.push({
    condition: "Transit Saturn aspects natal Jupiter",
    met: aspectsNatalJupiter,
    detail: `Transit Saturn in ${transitSaturn}, natal Jupiter in ${natalJupiter} — ${aspectsNatalJupiter ? "connected" : "no connection"}`,
  });

  const aspectsNatalMars = hasConnection(transitSaturn, natalMars);
  checks.push({
    condition: "Transit Saturn aspects natal Mars",
    met: aspectsNatalMars,
    detail: `Transit Saturn in ${transitSaturn}, natal Mars in ${natalMars} — ${aspectsNatalMars ? "connected" : "no connection"}`,
  });

  const partB = aspectsNatalSelf || aspectsNatalJupiter || aspectsNatalMars;

  const satisfied = partA && partB;

  let explanation: string;
  if (satisfied) {
    const aHow = aspectsUL ? "aspects UL" : aspectsULLord ? "aspects UL Lord" : "on UL trine";
    const bHow = aspectsNatalSelf
      ? "aspects natal Saturn"
      : aspectsNatalJupiter
        ? "aspects natal Jupiter"
        : "aspects natal Mars";
    explanation = `Transit Saturn ${aHow} AND ${bHow} — Rule 1 satisfied.`;
  } else if (partA && !partB) {
    explanation = "Transit Saturn connects with UL system but does NOT aspect natal Saturn/Jupiter/Mars.";
  } else if (!partA && partB) {
    explanation = "Transit Saturn aspects natal planets but has NO connection with UL or its Lord/trines.";
  } else {
    explanation = "Transit Saturn has no connection with UL system or natal Saturn/Jupiter/Mars.";
  }

  return {
    ruleNumber: 1,
    ruleName: "Transit Saturn ↔ UL",
    description:
      "Transit Saturn should aspect UL or its Lord, or transit on UL/trines. " +
      "Additionally, Saturn should aspect its natal position or natal Jupiter/Mars.",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

/**
 * Rule 2: Transit Mars ↔ UL factors
 *
 * Transit Mars should have connection with the same factors as Rule 1:
 * UL, UL Lord, UL trines, natal Saturn/Jupiter/Mars.
 */
function evaluateRule2(
  transitMars: Sign,
  ulSign: Sign,
  ulLord: string,
  ulLordSign: Sign,
  natalSaturn: Sign,
  natalJupiter: Sign,
  natalMars: Sign,
): RuleResult {
  const checks: RuleCheck[] = [];
  const ulTrines = getTrines(ulSign);

  // Part A: Mars connects with UL system
  const aspectsUL = hasConnection(transitMars, ulSign);
  checks.push({
    condition: "Transit Mars aspects/on UL",
    met: aspectsUL,
    detail: `Transit Mars in ${transitMars}, UL in ${ulSign} — ${aspectsUL ? "connected" : "no connection"}`,
  });

  const aspectsULLord = hasConnection(transitMars, ulLordSign);
  checks.push({
    condition: "Transit Mars aspects/on UL Lord",
    met: aspectsULLord,
    detail: `Transit Mars in ${transitMars}, UL Lord ${ulLord} in ${ulLordSign} — ${aspectsULLord ? "connected" : "no connection"}`,
  });

  const onULTrines = ulTrines.some((t) => transitMars === t);
  checks.push({
    condition: "Transit Mars on UL or its trines",
    met: onULTrines,
    detail: `UL trines: ${ulTrines.join(", ")}. Mars in ${transitMars} — ${onULTrines ? "yes" : "no"}`,
  });

  const partA = aspectsUL || aspectsULLord || onULTrines;

  // Part B: Mars also connects with natal Saturn/Jupiter/Mars
  const aspectsNatalSaturn = hasConnection(transitMars, natalSaturn);
  checks.push({
    condition: "Transit Mars aspects natal Saturn",
    met: aspectsNatalSaturn,
    detail: `Transit Mars in ${transitMars}, natal Saturn in ${natalSaturn} — ${aspectsNatalSaturn ? "connected" : "no connection"}`,
  });

  const aspectsNatalJupiter = hasConnection(transitMars, natalJupiter);
  checks.push({
    condition: "Transit Mars aspects natal Jupiter",
    met: aspectsNatalJupiter,
    detail: `Transit Mars in ${transitMars}, natal Jupiter in ${natalJupiter} — ${aspectsNatalJupiter ? "connected" : "no connection"}`,
  });

  const aspectsNatalMars = hasConnection(transitMars, natalMars);
  checks.push({
    condition: "Transit Mars aspects natal Mars",
    met: aspectsNatalMars,
    detail: `Transit Mars in ${transitMars}, natal Mars in ${natalMars} — ${aspectsNatalMars ? "connected" : "no connection"}`,
  });

  const partB = aspectsNatalSaturn || aspectsNatalJupiter || aspectsNatalMars;

  const satisfied = partA && partB;

  let explanation: string;
  if (satisfied) {
    const aHow = aspectsUL ? "aspects UL" : aspectsULLord ? "aspects UL Lord" : "on UL trine";
    const bHow = aspectsNatalSaturn
      ? "aspects natal Saturn"
      : aspectsNatalJupiter
        ? "aspects natal Jupiter"
        : "aspects natal Mars";
    explanation = `Transit Mars ${aHow} AND ${bHow} — Rule 2 satisfied.`;
  } else if (partA && !partB) {
    explanation = "Transit Mars connects with UL system but does NOT aspect natal Saturn/Jupiter/Mars.";
  } else if (!partA && partB) {
    explanation = "Transit Mars aspects natal planets but has NO connection with UL or its Lord/trines.";
  } else {
    explanation = "Transit Mars has no connection with UL system or natal Saturn/Jupiter/Mars.";
  }

  return {
    ruleNumber: 2,
    ruleName: "Transit Mars ↔ UL factors",
    description:
      "Transit Mars should have connection with UL, UL Lord, UL trines, " +
      "and natal Saturn/Jupiter/Mars (same factors as Rule 1).",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

/**
 * Rule 3: Transit Jupiter ↔ AL + 7H
 *
 * Transit Jupiter should aspect AL or its Lord,
 * as well as 7th House or 7th House Lord.
 */
function evaluateRule3(
  transitJupiter: Sign,
  alSign: Sign,
  alLord: string,
  alLordSign: Sign,
  seventhSign: Sign,
  seventhLord: string,
  seventhLordSign: Sign,
): RuleResult {
  const checks: RuleCheck[] = [];

  // Part A: Jupiter connects with AL system
  const aspectsAL = hasConnection(transitJupiter, alSign);
  checks.push({
    condition: "Transit Jupiter aspects/on AL",
    met: aspectsAL,
    detail: `Transit Jupiter in ${transitJupiter}, AL in ${alSign} — ${aspectsAL ? "connected" : "no connection"}`,
  });

  const aspectsALLord = hasConnection(transitJupiter, alLordSign);
  checks.push({
    condition: "Transit Jupiter aspects/on AL Lord",
    met: aspectsALLord,
    detail: `Transit Jupiter in ${transitJupiter}, AL Lord ${alLord} in ${alLordSign} — ${aspectsALLord ? "connected" : "no connection"}`,
  });

  const partA = aspectsAL || aspectsALLord;

  // Part B: Jupiter connects with 7th house system
  const aspects7H = hasConnection(transitJupiter, seventhSign);
  checks.push({
    condition: "Transit Jupiter aspects/on 7th House",
    met: aspects7H,
    detail: `Transit Jupiter in ${transitJupiter}, 7H in ${seventhSign} — ${aspects7H ? "connected" : "no connection"}`,
  });

  const aspects7HLord = hasConnection(transitJupiter, seventhLordSign);
  checks.push({
    condition: "Transit Jupiter aspects/on 7th House Lord",
    met: aspects7HLord,
    detail: `Transit Jupiter in ${transitJupiter}, 7H Lord ${seventhLord} in ${seventhLordSign} — ${aspects7HLord ? "connected" : "no connection"}`,
  });

  const partB = aspects7H || aspects7HLord;

  const satisfied = partA && partB;

  let explanation: string;
  if (satisfied) {
    const aHow = aspectsAL ? "aspects AL" : "aspects AL Lord";
    const bHow = aspects7H ? "aspects 7th House" : "aspects 7th House Lord";
    explanation = `Transit Jupiter ${aHow} AND ${bHow} — Rule 3 satisfied.`;
  } else if (partA && !partB) {
    explanation = "Transit Jupiter connects with AL but has NO connection with 7th House or its Lord.";
  } else if (!partA && partB) {
    explanation = "Transit Jupiter connects with 7th House but has NO connection with AL or its Lord.";
  } else {
    explanation = "Transit Jupiter has no connection with either AL or 7th House systems.";
  }

  return {
    ruleNumber: 3,
    ruleName: "Transit Jupiter ↔ AL + 7H",
    description:
      "Transit Jupiter should aspect AL or its Lord, " +
      "as well as 7th House or 7th House Lord.",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

/**
 * Rule 4: Darakaraka connection
 *
 * DK should be connected (by conjunction, aspect, or placement) with
 * the houses and lords from Rules 1-3: UL, UL Lord, AL, AL Lord, 7H, 7H Lord.
 */
function evaluateRule4(
  dkSign: Sign,
  dkName: string,
  ulSign: Sign,
  ulLordSign: Sign,
  alSign: Sign,
  alLordSign: Sign,
  seventhSign: Sign,
  seventhLordSign: Sign,
): RuleResult {
  const checks: RuleCheck[] = [];

  const connUL = hasConnection(dkSign, ulSign);
  checks.push({
    condition: "DK connected with UL",
    met: connUL,
    detail: `DK (${dkName}) in ${dkSign}, UL in ${ulSign} — ${connUL ? "connected" : "no connection"}`,
  });

  const connULLord = hasConnection(dkSign, ulLordSign);
  checks.push({
    condition: "DK connected with UL Lord",
    met: connULLord,
    detail: `DK in ${dkSign}, UL Lord in ${ulLordSign} — ${connULLord ? "connected" : "no connection"}`,
  });

  const connAL = hasConnection(dkSign, alSign);
  checks.push({
    condition: "DK connected with AL",
    met: connAL,
    detail: `DK in ${dkSign}, AL in ${alSign} — ${connAL ? "connected" : "no connection"}`,
  });

  const connALLord = hasConnection(dkSign, alLordSign);
  checks.push({
    condition: "DK connected with AL Lord",
    met: connALLord,
    detail: `DK in ${dkSign}, AL Lord in ${alLordSign} — ${connALLord ? "connected" : "no connection"}`,
  });

  const conn7H = hasConnection(dkSign, seventhSign);
  checks.push({
    condition: "DK connected with 7th House",
    met: conn7H,
    detail: `DK in ${dkSign}, 7H in ${seventhSign} — ${conn7H ? "connected" : "no connection"}`,
  });

  const conn7HLord = hasConnection(dkSign, seventhLordSign);
  checks.push({
    condition: "DK connected with 7th House Lord",
    met: conn7HLord,
    detail: `DK in ${dkSign}, 7H Lord in ${seventhLordSign} — ${conn7HLord ? "connected" : "no connection"}`,
  });

  const satisfied = connUL || connULLord || connAL || connALLord || conn7H || conn7HLord;

  const connections = checks.filter((c) => c.met).map((c) => c.condition.replace("DK connected with ", ""));
  const explanation = satisfied
    ? `Darakaraka (${dkName} in ${dkSign}) connected with: ${connections.join(", ")}.`
    : `Darakaraka (${dkName} in ${dkSign}) has no connection with UL, AL, or 7H systems.`;

  return {
    ruleNumber: 4,
    ruleName: "Darakaraka connection",
    description:
      "Darakaraka should be connected with UL, UL Lord, AL, AL Lord, " +
      "7th House, or 7th House Lord.",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

/**
 * Rule 5: Current Chara Dasha connected with marriage factors
 *
 * The running MD/AD signs should be connected (conjunction/aspect) with
 * UL, AL, 7H, their lords, or the Darakaraka.
 */
function evaluateRule5(
  mdSign: Sign | null,
  adSign: Sign | null,
  ulSign: Sign,
  ulLordSign: Sign,
  alSign: Sign,
  alLordSign: Sign,
  seventhSign: Sign,
  seventhLordSign: Sign,
  dkSign: Sign,
): RuleResult {
  const checks: RuleCheck[] = [];

  if (!mdSign) {
    return {
      ruleNumber: 5,
      ruleName: "Chara Dasha ↔ marriage factors",
      description: "Current Chara Dasha MD/AD should be connected with UL, AL, 7H, their lords, or DK.",
      isSatisfied: false,
      checks: [],
      explanation: "No current Maha Dasha found for today's date.",
    };
  }

  const targets = [
    { name: "UL", sign: ulSign },
    { name: "UL Lord", sign: ulLordSign },
    { name: "AL", sign: alSign },
    { name: "AL Lord", sign: alLordSign },
    { name: "7H", sign: seventhSign },
    { name: "7H Lord", sign: seventhLordSign },
    { name: "DK", sign: dkSign },
  ];

  // Check MD connections
  let mdConnected = false;
  for (const t of targets) {
    const conn = hasConnection(mdSign, t.sign);
    checks.push({
      condition: `MD (${mdSign}) ↔ ${t.name}`,
      met: conn,
      detail: `MD ${mdSign} → ${t.name} (${t.sign}) — ${conn ? "connected" : "no"}`,
    });
    if (conn) mdConnected = true;
  }

  // Check AD connections
  let adConnected = false;
  if (adSign) {
    for (const t of targets) {
      const conn = hasConnection(adSign, t.sign);
      checks.push({
        condition: `AD (${adSign}) ↔ ${t.name}`,
        met: conn,
        detail: `AD ${adSign} → ${t.name} (${t.sign}) — ${conn ? "connected" : "no"}`,
      });
      if (conn) adConnected = true;
    }
  }

  const satisfied = mdConnected || adConnected;

  const mdConns = checks
    .filter((c) => c.met && c.condition.startsWith("MD"))
    .map((c) => c.condition.split("↔ ")[1]);
  const adConns = checks
    .filter((c) => c.met && c.condition.startsWith("AD"))
    .map((c) => c.condition.split("↔ ")[1]);

  let explanation: string;
  if (satisfied) {
    const parts: string[] = [];
    if (mdConns.length > 0) parts.push(`MD (${mdSign}) → ${mdConns.join(", ")}`);
    if (adConns.length > 0) parts.push(`AD (${adSign}) → ${adConns.join(", ")}`);
    explanation = `Chara Dasha connected: ${parts.join("; ")}.`;
  } else {
    explanation = `Neither MD (${mdSign}) nor AD (${adSign || "none"}) connects with marriage factors.`;
  }

  return {
    ruleNumber: 5,
    ruleName: "Chara Dasha ↔ marriage factors",
    description:
      "Current Chara Dasha MD/AD should be connected with " +
      "UL, AL, 7H, their lords, or Darakaraka.",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

/**
 * Rule 6: MD/AD receive Argala from DK and/or their own lords
 *
 * Check if the Maha Dasha and Antar Dasha signs receive Argala
 * (planetary intervention) from:
 * - The Darakaraka
 * - The lord of the MD sign
 * - The lord of the AD sign
 */
function evaluateRule6(
  mdSign: Sign | null,
  adSign: Sign | null,
  dkName: string,
  dkSign: Sign,
  natalPlanets: PlanetPosition[],
): RuleResult {
  const checks: RuleCheck[] = [];

  if (!mdSign) {
    return {
      ruleNumber: 6,
      ruleName: "Argala on MD/AD from DK & lords",
      description: "MD and AD should receive Argala from Darakaraka and/or their lords.",
      isSatisfied: false,
      checks: [],
      explanation: "No current Maha Dasha found for today's date.",
    };
  }

  // Get effective argala on MD sign
  const mdArgala = getEffectiveArgalaOnSign(mdSign, natalPlanets);
  const mdArgalaPlanets = mdArgala.map((a) => a.planet);

  // Check if DK causes argala on MD
  const dkArgalaMD = mdArgalaPlanets.includes(dkName);
  checks.push({
    condition: `DK (${dkName}) has Argala on MD (${mdSign})`,
    met: dkArgalaMD,
    detail: dkArgalaMD
      ? `${dkName} in ${dkSign} causes Argala on ${mdSign}`
      : `${dkName} does not cause effective Argala on ${mdSign}. Argala planets: ${mdArgalaPlanets.join(", ") || "none"}`,
  });

  // Check if MD lord causes argala on MD
  const mdLord = SIGN_LORD[mdSign];
  const mdLordArgala = mdArgalaPlanets.includes(mdLord);
  checks.push({
    condition: `MD Lord (${mdLord}) has Argala on MD (${mdSign})`,
    met: mdLordArgala,
    detail: mdLordArgala
      ? `${mdLord} causes Argala on its own MD sign ${mdSign}`
      : `${mdLord} does not cause effective Argala on ${mdSign}`,
  });

  let adArgalaSatisfied = false;
  if (adSign) {
    const adArgala = getEffectiveArgalaOnSign(adSign, natalPlanets);
    const adArgalaPlanets = adArgala.map((a) => a.planet);

    // Check if DK causes argala on AD
    const dkArgalaAD = adArgalaPlanets.includes(dkName);
    checks.push({
      condition: `DK (${dkName}) has Argala on AD (${adSign})`,
      met: dkArgalaAD,
      detail: dkArgalaAD
        ? `${dkName} in ${dkSign} causes Argala on ${adSign}`
        : `${dkName} does not cause effective Argala on ${adSign}. Argala planets: ${adArgalaPlanets.join(", ") || "none"}`,
    });

    // Check if AD lord causes argala on AD
    const adLord = SIGN_LORD[adSign];
    const adLordArgala = adArgalaPlanets.includes(adLord);
    checks.push({
      condition: `AD Lord (${adLord}) has Argala on AD (${adSign})`,
      met: adLordArgala,
      detail: adLordArgala
        ? `${adLord} causes Argala on its own AD sign ${adSign}`
        : `${adLord} does not cause effective Argala on ${adSign}`,
    });

    adArgalaSatisfied = dkArgalaAD || adLordArgala;
  }

  const mdArgalaSatisfied = dkArgalaMD || mdLordArgala;
  const satisfied = mdArgalaSatisfied || adArgalaSatisfied;

  const metChecks = checks.filter((c) => c.met).map((c) => c.condition);
  const explanation = satisfied
    ? `Argala confirmed: ${metChecks.join("; ")}.`
    : `Neither MD nor AD receives effective Argala from DK or their lords.`;

  return {
    ruleNumber: 6,
    ruleName: "Argala on MD/AD from DK & lords",
    description:
      "Chara Dasha MD and AD should receive Argala from Darakaraka " +
      "and/or their respective lords.",
    isSatisfied: satisfied,
    checks,
    explanation,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Predict marriage timing using Jaimini principles.
 *
 * Takes the prepared prediction input (from `preparePredictionInput`) and
 * current transit positions of Saturn, Mars, and Jupiter.
 *
 * Evaluates all 6 rules and returns a comprehensive report indicating
 * whether current conditions favor marriage.
 *
 * @param input    JaiminiPredictionInput (from preparePredictionInput)
 * @param chart    Original chart response (for natal planet positions)
 * @param transit  Current transit positions of Saturn, Mars, Jupiter
 * @returns        MarriagePredictionReport
 */
export function predictMarriage(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
  transit: TransitPositions,
): MarriagePredictionReport {
  const lagna = input.lagna as Sign;

  // ── Resolve key reference points ──

  // UL (Upa-Pada)
  const ulSign = input.upaPada?.padaSign || signAtOffset(lagna, 12);
  const { lord: ulLord, lordSign: ulLordSign } = getLordAndPlacement(
    ulSign,
    chart.planets,
  );

  // AL (Arudha Lagna)
  const alSign = input.arudhaLagna?.padaSign || lagna;
  const { lord: alLord, lordSign: alLordSign } = getLordAndPlacement(
    alSign,
    chart.planets,
  );

  // 7th House
  const seventhSign = getSeventhHouse(lagna);
  const { lord: seventhLord, lordSign: seventhLordSign } = getLordAndPlacement(
    seventhSign,
    chart.planets,
  );

  // Darakaraka
  const dk = input.karakas.find((k) => k.role === "Darakaraka");
  const dkName = dk?.planet || "Unknown";
  const dkSign = (dk?.rashi as Sign) || lagna;

  // Natal positions
  const natalSaturn = getNatalSign(chart.planets, "Saturn") || lagna;
  const natalMars = getNatalSign(chart.planets, "Mars") || lagna;
  const natalJupiter = getNatalSign(chart.planets, "Jupiter") || lagna;

  // Current dasha
  const mdSign = input.currentDasha?.sign || null;
  const adSign = input.currentSubPeriod?.sign || null;

  // ── Evaluate all 6 rules ──

  const rule1 = evaluateRule1(
    transit.saturn, ulSign, ulLord, ulLordSign,
    natalSaturn, natalJupiter, natalMars,
  );

  const rule2 = evaluateRule2(
    transit.mars, ulSign, ulLord, ulLordSign,
    natalSaturn, natalJupiter, natalMars,
  );

  const rule3 = evaluateRule3(
    transit.jupiter, alSign, alLord, alLordSign,
    seventhSign, seventhLord, seventhLordSign,
  );

  const rule4 = evaluateRule4(
    dkSign, dkName, ulSign, ulLordSign, alSign, alLordSign,
    seventhSign, seventhLordSign,
  );

  const rule5 = evaluateRule5(
    mdSign, adSign, ulSign, ulLordSign, alSign, alLordSign,
    seventhSign, seventhLordSign, dkSign,
  );

  const rule6 = evaluateRule6(
    mdSign, adSign, dkName, dkSign, chart.planets,
  );

  const rules = [rule1, rule2, rule3, rule4, rule5, rule6];
  const rulesSatisfied = rules.filter((r) => r.isSatisfied).length;

  // ── Overall assessment ──
  let strength: "strong" | "moderate" | "weak" | "not indicated";
  let isMarriageIndicated: boolean;

  if (rulesSatisfied >= 5) {
    strength = "strong";
    isMarriageIndicated = true;
  } else if (rulesSatisfied >= 3) {
    strength = "moderate";
    isMarriageIndicated = true;
  } else if (rulesSatisfied >= 1) {
    strength = "weak";
    isMarriageIndicated = false;
  } else {
    strength = "not indicated";
    isMarriageIndicated = false;
  }

  const summary = buildSummary(
    rulesSatisfied, rules, strength, isMarriageIndicated,
    dkName, dkSign, ulSign, alSign, seventhSign, mdSign, adSign,
  );

  return {
    ulSign, ulLord, ulLordSign,
    alSign, alLord, alLordSign,
    seventhHouseSign: seventhSign,
    seventhHouseLord: seventhLord,
    seventhHouseLordSign: seventhLordSign,
    darakaraka: dkName,
    darakarakaSign: dkSign,
    natalSaturnSign: natalSaturn,
    natalMarsSign: natalMars,
    natalJupiterSign: natalJupiter,
    transit,
    currentMD: mdSign,
    currentAD: adSign,
    rules,
    rulesSatisfied,
    totalRules: 6,
    isMarriageIndicated,
    strength,
    summary,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Summary builder
// ────────────────────────────────────────────────────────────────────────────

function buildSummary(
  rulesSatisfied: number,
  rules: RuleResult[],
  strength: string,
  isIndicated: boolean,
  dkName: string,
  dkSign: Sign,
  ulSign: Sign,
  alSign: Sign,
  seventhSign: Sign,
  mdSign: Sign | null,
  adSign: Sign | null,
): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("  JAIMINI MARRIAGE PREDICTION");
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("─── KEY REFERENCE POINTS ──────────────────────────────");
  lines.push(`  Upa-Pada (UL):     ${ulSign}`);
  lines.push(`  Arudha Lagna (AL): ${alSign}`);
  lines.push(`  7th House:         ${seventhSign}`);
  lines.push(`  Darakaraka (DK):   ${dkName} in ${dkSign}`);
  if (mdSign) {
    lines.push(`  Current MD:        ${mdSign}`);
  }
  if (adSign) {
    lines.push(`  Current AD:        ${adSign}`);
  }
  lines.push("");

  lines.push("─── RULE EVALUATION ───────────────────────────────────");
  for (const r of rules) {
    const mark = r.isSatisfied ? "✓" : "✗";
    lines.push(`  ${mark} Rule ${r.ruleNumber}: ${r.ruleName}`);
    lines.push(`    ${r.explanation}`);
  }
  lines.push("");

  lines.push("─── OVERALL ASSESSMENT ────────────────────────────────");
  lines.push(`  Rules satisfied: ${rulesSatisfied} / 6`);
  lines.push(`  Strength: ${strength.toUpperCase()}`);
  lines.push(
    `  Marriage indicated: ${isIndicated ? "YES" : "NO"}`,
  );
  lines.push("");

  if (isIndicated && strength === "strong") {
    lines.push("  Current transit and dasha conditions strongly support");
    lines.push("  the timing of marriage during this period.");
  } else if (isIndicated && strength === "moderate") {
    lines.push("  Moderate indications for marriage. Some conditions are met");
    lines.push("  but not all transits are fully aligned.");
  } else if (strength === "weak") {
    lines.push("  Weak indications. Only partial conditions are met.");
    lines.push("  Marriage is unlikely during this exact transit window.");
  } else {
    lines.push("  Current conditions do not indicate marriage timing.");
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Generate just the summary text from a MarriagePredictionReport.
 * Use this to embed in the Jaimini Life Report.
 */
export function summarizeMarriagePrediction(
  report: MarriagePredictionReport,
): string {
  return report.summary;
}

// ────────────────────────────────────────────────────────────────────────────
// 5-Year Marriage Window Scanner
// ────────────────────────────────────────────────────────────────────────────

/** A monthly snapshot of transit positions */
export interface TransitSnapshot {
  date: string;           // YYYY-MM-DD (1st of each month)
  saturn: Sign;
  mars: Sign;
  jupiter: Sign;
}

/** A scored month in the 5-year scan */
export interface MarriageWindowMonth {
  date: string;           // YYYY-MM-DD
  month: string;          // "Jan 2026"
  rulesSatisfied: number;
  rulesMetList: number[]; // which rule numbers are met (e.g. [1,3,4,5])
  strength: "strong" | "moderate" | "weak" | "not indicated";
  /** MD/AD active during this month */
  md: string | null;
  ad: string | null;
  transit: TransitPositions;
}

/** Result of the 5-year scan */
export interface MarriageWindowScan {
  /** All months scanned (60 months) */
  months: MarriageWindowMonth[];
  /** Only months with 3+ rules met, grouped into continuous windows */
  windows: MarriageWindow[];
  /** Best single month */
  peakMonth: MarriageWindowMonth | null;
  /** Reference data used */
  ulSign: Sign;
  alSign: Sign;
  seventhHouseSign: Sign;
  darakaraka: string;
  darakarakaSign: Sign;
}

/** A continuous window of favorable months */
export interface MarriageWindow {
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  peakScore: number;
  avgScore: number;
  months: MarriageWindowMonth[];
}

/**
 * Convert a house number (1-12) to its sign, given the lagna sign.
 * House 1 = lagna sign, House 2 = next sign, etc.
 */
function houseToSign(lagna: Sign, house: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[lagna] + house - 1) % 12];
}

/**
 * Find the Chara Dasha MD and AD signs active on a given date.
 */
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

/**
 * Lightweight rule scorer — evaluates rules 1-6 and returns count + list.
 * Much faster than full `predictMarriage` since it skips building verbose results.
 */
function scoreRulesQuick(
  transit: TransitPositions,
  ulSign: Sign,
  ulLordSign: Sign,
  alSign: Sign,
  alLordSign: Sign,
  seventhSign: Sign,
  seventhLordSign: Sign,
  dkName: string,
  dkSign: Sign,
  natalSaturn: Sign,
  natalMars: Sign,
  natalJupiter: Sign,
  mdSign: Sign | null,
  adSign: Sign | null,
  natalPlanets: PlanetPosition[],
): { count: number; met: number[] } {
  const met: number[] = [];

  // Rule 1: Transit Saturn ↔ UL + natal
  const ulTrines = getTrines(ulSign);
  const r1PartA =
    hasConnection(transit.saturn, ulSign) ||
    hasConnection(transit.saturn, ulLordSign) ||
    ulTrines.some((t) => transit.saturn === t);
  const r1PartB =
    hasConnection(transit.saturn, natalSaturn) ||
    hasConnection(transit.saturn, natalJupiter) ||
    hasConnection(transit.saturn, natalMars);
  if (r1PartA && r1PartB) met.push(1);

  // Rule 2: Transit Mars ↔ UL + natal
  const r2PartA =
    hasConnection(transit.mars, ulSign) ||
    hasConnection(transit.mars, ulLordSign) ||
    ulTrines.some((t) => transit.mars === t);
  const r2PartB =
    hasConnection(transit.mars, natalSaturn) ||
    hasConnection(transit.mars, natalJupiter) ||
    hasConnection(transit.mars, natalMars);
  if (r2PartA && r2PartB) met.push(2);

  // Rule 3: Transit Jupiter ↔ AL + 7H
  const r3PartA =
    hasConnection(transit.jupiter, alSign) ||
    hasConnection(transit.jupiter, alLordSign);
  const r3PartB =
    hasConnection(transit.jupiter, seventhSign) ||
    hasConnection(transit.jupiter, seventhLordSign);
  if (r3PartA && r3PartB) met.push(3);

  // Rule 4: DK connection (natal — same every month)
  const r4 =
    hasConnection(dkSign, ulSign) ||
    hasConnection(dkSign, ulLordSign) ||
    hasConnection(dkSign, alSign) ||
    hasConnection(dkSign, alLordSign) ||
    hasConnection(dkSign, seventhSign) ||
    hasConnection(dkSign, seventhLordSign);
  if (r4) met.push(4);

  // Rule 5: Dasha ↔ marriage factors
  if (mdSign || adSign) {
    const targets = [ulSign, ulLordSign, alSign, alLordSign, seventhSign, seventhLordSign, dkSign];
    let r5 = false;
    if (mdSign) r5 = r5 || targets.some((t) => hasConnection(mdSign, t));
    if (adSign) r5 = r5 || targets.some((t) => hasConnection(adSign, t));
    if (r5) met.push(5);
  }

  // Rule 6: Argala on MD/AD from DK or their lords
  let r6 = false;
  if (mdSign) {
    const mdArgala = getEffectiveArgalaOnSign(mdSign, natalPlanets);
    const mdArgalaPlanets = mdArgala.map((a) => a.planet);
    r6 = mdArgalaPlanets.includes(dkName) || mdArgalaPlanets.includes(SIGN_LORD[mdSign]);
  }
  if (!r6 && adSign) {
    const adArgala = getEffectiveArgalaOnSign(adSign, natalPlanets);
    const adArgalaPlanets = adArgala.map((a) => a.planet);
    r6 = adArgalaPlanets.includes(dkName) || adArgalaPlanets.includes(SIGN_LORD[adSign]);
  }
  if (r6) met.push(6);

  return { count: met.length, met };
}

function strengthFromCount(count: number): "strong" | "moderate" | "weak" | "not indicated" {
  if (count >= 5) return "strong";
  if (count >= 3) return "moderate";
  if (count >= 1) return "weak";
  return "not indicated";
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * Scan the next N years for marriage windows.
 *
 * Takes lifetime transit snapshots (house-number based) and converts them
 * to sign-based positions using the lagna. Evaluates all 6 marriage rules
 * for each month and identifies favorable windows.
 *
 * @param input          JaiminiPredictionInput (natal chart data)
 * @param chart          ChartResponse (for natal planet positions)
 * @param snapshots      Lifetime transit snapshots (date → planet → house)
 * @param yearsToScan    How many years to scan (default: 5)
 * @returns              MarriageWindowScan with monthly scores and grouped windows
 */
export function scanMarriageWindows(
  input: JaiminiPredictionInput,
  chart: ChartResponse,
  snapshots: { date: string; planets: Record<string, number> }[],
  yearsToScan: number = 5,
): MarriageWindowScan {
  const lagna = input.lagna as Sign;

  // ── Resolve natal reference points (same as predictMarriage) ──
  const ulSign = input.upaPada?.padaSign || signAtOffset(lagna, 12);
  const { lord: ulLord, lordSign: ulLordSign } = getLordAndPlacement(ulSign, chart.planets);
  const alSign = input.arudhaLagna?.padaSign || lagna;
  const { lord: alLord, lordSign: alLordSign } = getLordAndPlacement(alSign, chart.planets);
  const seventhSign = getSeventhHouse(lagna);
  const { lord: seventhLord, lordSign: seventhLordSign } = getLordAndPlacement(seventhSign, chart.planets);
  const dk = input.karakas.find((k) => k.role === "Darakaraka");
  const dkName = dk?.planet || "Unknown";
  const dkSign = (dk?.rashi as Sign) || lagna;
  const natalSaturn = getNatalSign(chart.planets, "Saturn") || lagna;
  const natalMars = getNatalSign(chart.planets, "Mars") || lagna;
  const natalJupiter = getNatalSign(chart.planets, "Jupiter") || lagna;

  // ── Build date range ──
  const today = new Date();
  const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const endYear = today.getFullYear() + yearsToScan;
  const endDate = `${endYear}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  // ── Filter snapshots to our scan window ──
  const relevantSnapshots = snapshots.filter(
    (s) => s.date >= startDate && s.date <= endDate,
  );

  // ── Score each month ──
  const months: MarriageWindowMonth[] = [];

  for (const snap of relevantSnapshots) {
    // Convert house numbers to signs
    const saturnHouse = snap.planets["Saturn"];
    const marsHouse = snap.planets["Mars"];
    const jupiterHouse = snap.planets["Jupiter"];

    if (!saturnHouse || !marsHouse || !jupiterHouse) continue;

    const transit: TransitPositions = {
      saturn: houseToSign(lagna, saturnHouse),
      mars: houseToSign(lagna, marsHouse),
      jupiter: houseToSign(lagna, jupiterHouse),
    };

    // Find dasha active on this date
    const { md, ad } = findDashaForDate(snap.date, input.dashaSequence);

    const { count, met } = scoreRulesQuick(
      transit, ulSign, ulLordSign, alSign, alLordSign,
      seventhSign, seventhLordSign, dkName, dkSign,
      natalSaturn, natalMars, natalJupiter,
      md, ad, chart.planets,
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
  const windows: MarriageWindow[] = [];
  let currentWindow: MarriageWindowMonth[] = [];

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
  let peakMonth: MarriageWindowMonth | null = null;
  for (const m of months) {
    if (!peakMonth || m.rulesSatisfied > peakMonth.rulesSatisfied) {
      peakMonth = m;
    }
  }

  return {
    months,
    windows,
    peakMonth,
    ulSign,
    alSign,
    seventhHouseSign: seventhSign,
    darakaraka: dkName,
    darakarakaSign: dkSign,
  };
}

function buildWindow(months: MarriageWindowMonth[]): MarriageWindow {
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
