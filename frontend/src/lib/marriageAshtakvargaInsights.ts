/**
 * Marriage-specific Ashtakvarga insights.
 *
 * Pulls the classical bindu signals that most affect marriage out of a
 * computed AshtakvargaAnalysis:
 *   - 7th house SAV (partnership strength in Sarvashtakvarga)
 *   - Upa-Pada (UL) SAV (marriage pada strength)
 *   - 2nd from UL SAV (sustenance / longevity of marriage)
 *   - Venus bindus in 7th house sign (marriage karaka support)
 *   - Saturn bindus in 7th house sign (delay indicator — high = delayed)
 *   - Jupiter bindus in 7th house sign (blessing indicator)
 *
 * Classical thresholds:
 *   SAV per house: <22 weak, 23-28 average, >28 strong
 *   BAV per sign:  max 8; 0-2 weak, 3-4 avg, 5-8 strong
 */

import type { AshtakvargaAnalysis } from "./ashtakvargaEngine";
import { ASHTAKVARGA_PLANETS } from "./ashtakvargaEngine";
import { ZODIAC_ORDER, SIGN_INDEX, type Sign } from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Strength = "Weak" | "Average" | "Strong" | "Excess";

export interface SavSignal {
  label: string;
  sign: Sign;
  signNumber: number;
  bindus: number;
  strength: Strength;
  interpretation: string;
}

export interface BavSignal {
  planet: string;
  sign: Sign;
  bindus: number;       // 0-8
  strength: Strength;
  interpretation: string;
}

export interface MarriageAshtakvargaInsights {
  sevenSav: SavSignal;
  ulSav: SavSignal;
  secondFromUlSav: SavSignal;
  venusBav: BavSignal;
  saturnBav: BavSignal;
  jupiterBav: BavSignal;
  overallRating: Strength;
  overallNarrative: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

// SAV per house: <22 weak, 23-28 average, >28 strong
function classifySavPartnership(bindus: number, isMaraka: boolean): {
  strength: Strength;
  text: string;
} {
  if (bindus <= 22) {
    return {
      strength: "Weak",
      text: `${bindus} bindus — below threshold. This house receives limited planetary support; the area it governs (partnership themes) may require more conscious effort and favourable transits to activate fully.`,
    };
  }
  if (bindus <= 28) {
    return {
      strength: "Average",
      text: isMaraka
        ? `${bindus} bindus — in the ideal 23-28 range. For a maraka house like the 7th, this balanced strength is actually the most favourable configuration, supporting long-term marital harmony without the instability that excess brings.`
        : `${bindus} bindus — balanced. Adequate planetary support for partnership themes; neither strained nor overwhelming.`,
    };
  }
  // > 28
  return {
    strength: isMaraka ? "Excess" : "Strong",
    text: isMaraka
      ? `${bindus} bindus — exceeds the ideal 23-28 range. In a maraka house, excessive strength can paradoxically create ego clashes or intensity that stresses the partnership. Counterbalanced by emotional maturity and patience.`
      : `${bindus} bindus — strongly supported. Planetary blessings flow abundantly to this house's themes.`,
  };
}

// BAV per sign: 0-8
function classifyBav(bindus: number): Strength {
  if (bindus <= 2) return "Weak";
  if (bindus <= 4) return "Average";
  return "Strong";
}

// ────────────────────────────────────────────────────────────────────────────
// Main: compute marriage insights from an Ashtakvarga analysis
// ────────────────────────────────────────────────────────────────────────────

export function computeMarriageAshtakvargaInsights(
  analysis: AshtakvargaAnalysis,
  ulSign: Sign,
): MarriageAshtakvargaInsights {
  const lagna = analysis.lagnaSign;
  const seventhSign = signAtOffset(lagna, 7);
  const secondFromUl = signAtOffset(ulSign, 2);

  const savBySign = analysis.sarvashtakvarga.signTotals; // 12 values indexed by sign

  // Look up per-planet BAV for a sign
  const bavIn = (planet: string, sign: Sign): number => {
    const planetIdx = ASHTAKVARGA_PLANETS.indexOf(planet as (typeof ASHTAKVARGA_PLANETS)[number]);
    if (planetIdx < 0) return 0;
    return analysis.prastharaCharts[planetIdx].signTotals[SIGN_INDEX[sign]] ?? 0;
  };

  // 7th house SAV
  const sevenBindus = savBySign[SIGN_INDEX[seventhSign]];
  const seven = classifySavPartnership(sevenBindus, true); // 7th is maraka
  const sevenSav: SavSignal = {
    label: "7th House (Partnership)",
    sign: seventhSign,
    signNumber: SIGN_INDEX[seventhSign] + 1,
    bindus: sevenBindus,
    strength: seven.strength,
    interpretation: seven.text,
  };

  // UL SAV
  const ulBindus = savBySign[SIGN_INDEX[ulSign]];
  const ul = classifySavPartnership(ulBindus, false);
  const ulSav: SavSignal = {
    label: "Upa-Pada (UL) — Marriage Pada",
    sign: ulSign,
    signNumber: SIGN_INDEX[ulSign] + 1,
    bindus: ulBindus,
    strength: ul.strength,
    interpretation: ulBindus > 28
      ? `${ulBindus} bindus — the Upa-Pada is strongly supported. The natal marriage blueprint carries powerful planetary backing, suggesting partnership plays a meaningful role in this life.`
      : ulBindus >= 23
        ? `${ulBindus} bindus — balanced support for the marriage pada. The natal marriage significator has adequate strength to deliver its indications.`
        : `${ulBindus} bindus — the marriage pada is weakly supported. Marriage timing and quality depend more heavily on favourable transits (Saturn, Mars, Jupiter) and dasha activations than on natal pada strength alone.`,
  };

  // 2nd from UL SAV (sustenance of marriage)
  const secondBindus = savBySign[SIGN_INDEX[secondFromUl]];
  const second = classifySavPartnership(secondBindus, false);
  const secondFromUlSav: SavSignal = {
    label: "2nd from Upa-Pada (Sustenance)",
    sign: secondFromUl,
    signNumber: SIGN_INDEX[secondFromUl] + 1,
    bindus: secondBindus,
    strength: second.strength,
    interpretation: secondBindus > 28
      ? `${secondBindus} bindus — excellent longevity support for marriage. The house that governs marital endurance is robustly blessed.`
      : secondBindus >= 23
        ? `${secondBindus} bindus — adequate support for marriage longevity. The relationship has the natal foundation to sustain over time with ordinary effort.`
        : `${secondBindus} bindus — sustenance house is weaker. Sustaining the marriage over years may require extra intentionality — shared goals, active communication, and conscious maintenance rather than assuming it will run itself.`,
  };

  // Venus BAV in 7th house sign
  const venusIn7 = bavIn("Venus", seventhSign);
  const venusStrength = classifyBav(venusIn7);
  const venusBav: BavSignal = {
    planet: "Venus",
    sign: seventhSign,
    bindus: venusIn7,
    strength: venusStrength,
    interpretation:
      venusIn7 >= 5
        ? `Venus — the natural karaka of marriage — places ${venusIn7}/8 bindus in your 7th house sign (${seventhSign}). Strong support for love, attraction, and romantic harmony in partnership.`
        : venusIn7 >= 3
          ? `Venus places ${venusIn7}/8 bindus in your 7th house sign. Moderate karaka support — romantic chemistry flows but may require cultivation.`
          : `Venus places only ${venusIn7}/8 bindus in your 7th house sign. The natural marriage significator's support is limited here; partnership rewards depth over fireworks.`,
  };

  // Saturn BAV in 7th house sign — delay indicator
  const saturnIn7 = bavIn("Saturn", seventhSign);
  const saturnStrength = classifyBav(saturnIn7);
  const saturnBav: BavSignal = {
    planet: "Saturn",
    sign: seventhSign,
    bindus: saturnIn7,
    strength: saturnStrength,
    interpretation:
      saturnIn7 >= 5
        ? `Saturn places ${saturnIn7}/8 bindus in your 7th house sign. Classically this signals delayed marriage but deep, enduring bonds once formed — Saturn rewards patience.`
        : saturnIn7 >= 3
          ? `Saturn places ${saturnIn7}/8 bindus in your 7th house sign. Moderate Saturn influence suggests timing unfolds at its own pace — neither rushed nor heavily delayed.`
          : `Saturn places ${saturnIn7}/8 bindus in your 7th house sign. Light Saturn influence — marriage is less likely to face the prolonged delays Saturn typically brings.`,
  };

  // Jupiter BAV in 7th house sign — blessing
  const jupiterIn7 = bavIn("Jupiter", seventhSign);
  const jupiterStrength = classifyBav(jupiterIn7);
  const jupiterBav: BavSignal = {
    planet: "Jupiter",
    sign: seventhSign,
    bindus: jupiterIn7,
    strength: jupiterStrength,
    interpretation:
      jupiterIn7 >= 5
        ? `Jupiter places ${jupiterIn7}/8 bindus in your 7th house sign. Strong Jupiter — the great benefic — blesses the partnership with wisdom, growth, and auspicious expansion. A very favourable signature.`
        : jupiterIn7 >= 3
          ? `Jupiter places ${jupiterIn7}/8 bindus in your 7th house sign. Moderate blessing from Jupiter supports the partnership's learning and meaning.`
          : `Jupiter places ${jupiterIn7}/8 bindus in your 7th house sign. Light Jupiter support — partnership wisdom comes more through lived experience than through early-flowing grace.`,
  };

  // Overall rating: weighted combination
  const sevenOk = sevenBindus > 22;
  const ulOk = ulBindus > 22;
  const secondOk = secondBindus > 22;
  const venusOk = venusIn7 >= 3;
  const jupiterOk = jupiterIn7 >= 3;
  const positives =
    (sevenOk ? 1 : 0) +
    (ulOk ? 1 : 0) +
    (secondOk ? 1 : 0) +
    (venusOk ? 1 : 0) +
    (jupiterOk ? 1 : 0);
  const delayHit = saturnIn7 >= 5;

  let overallRating: Strength;
  let overallNarrative: string;

  // Build house-level summary phrase truthfully
  const houseSignals: string[] = [];
  if (sevenOk) houseSignals.push("7th house");
  if (ulOk) houseSignals.push("Upa-Pada");
  if (secondOk) houseSignals.push("sustenance house");
  const housesPhrase = houseSignals.length === 3
    ? "all three primary marriage houses (7th, Upa-Pada, and sustenance) are supported"
    : houseSignals.length === 2
      ? `two of the three primary marriage houses (${houseSignals.join(" and ")}) are supported, while the third is weaker`
      : houseSignals.length === 1
        ? `only the ${houseSignals[0]} is adequately supported; the other two are weaker`
        : "all three primary marriage houses are below threshold";

  const karakaPhrase = venusOk && jupiterOk
    ? "Both marriage karakas (Venus and Jupiter) reinforce the pattern"
    : venusOk
      ? "Venus (love karaka) supports the pattern, though Jupiter's backing is lighter"
      : jupiterOk
        ? "Jupiter (blessing karaka) supports the pattern, though Venus's backing is lighter"
        : "The marriage karakas (Venus, Jupiter) offer only modest support in the 7th sign";

  const delayPhrase = delayHit
    ? " Saturn's strong 7th-house bindus add a delay signature — timing unfolds later rather than earlier, but with enduring depth."
    : "";

  if (positives >= 4) {
    overallRating = "Strong";
    overallNarrative = `Ashtakvarga signals broadly favour marriage — ${housesPhrase}. ${karakaPhrase}.${delayPhrase}`;
  } else if (positives >= 3) {
    overallRating = "Average";
    overallNarrative = `Ashtakvarga signals are mixed — ${housesPhrase}. ${karakaPhrase}. The natal picture supports marriage through deliberate cultivation rather than automatic flow.${delayPhrase}`;
  } else {
    overallRating = "Weak";
    overallNarrative = `Ashtakvarga signals for marriage are on the quieter side — ${housesPhrase}. ${karakaPhrase}. This is not a denial of partnership; it points to the path benefitting from conscious effort, patience, and favourable dasha-transit windows rather than natal-level automatic momentum.${delayPhrase}`;
  }

  return {
    sevenSav,
    ulSav,
    secondFromUlSav,
    venusBav,
    saturnBav,
    jupiterBav,
    overallRating,
    overallNarrative: overallNarrative.trim(),
  };
}
