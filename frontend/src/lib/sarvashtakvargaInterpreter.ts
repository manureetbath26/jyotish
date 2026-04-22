/**
 * Sarvashtakavarga interpretation engine.
 *
 * Given the SAV per-sign totals + Lagna + the rule set (from DB), produces
 * structured interpretations for:
 *   - Each of the 12 houses (strength classification, text, remedy)
 *   - Each of the 4 trikona pillars (Dharma/Artha/Kama/Moksha)
 *   - Special house comparisons (career path, effort-vs-luck, savings)
 */

import type { Sign } from "./charaDashaEngine";
import { SIGN_INDEX, ZODIAC_ORDER } from "./charaDashaEngine";

// ─── Rule payload shapes (must match seed-sarvashtakvarga-rules.ts) ────────

export interface HouseRuleContent {
  house: number;
  title: string;
  themes: string;
  isMaraka: boolean;
  ranges: {
    weak:    { min: number; max: number; text: string };
    average: { min: number; max: number; text: string };
    strong:  { min: number; max: number; text: string };
  };
  weakRemedy: string;
  marakaNote?: string;
}

export interface TrikonaRuleContent {
  name: string;
  houses: number[];
  meaning: string;
  description: string;
  strongThreshold: number;
}

export interface ComparisonRuleContent {
  title: string;
  themes: string;
  houseA: number;
  houseB: number;
  aOverB: string;
  bOverA: string;
  equal?: string;
}

export interface InterpretationRules {
  house: { ruleKey: string; content: HouseRuleContent }[];
  trikona: { ruleKey: string; content: TrikonaRuleContent }[];
  comparison: { ruleKey: string; content: ComparisonRuleContent }[];
}

// ─── Interpretation output ─────────────────────────────────────────────────

export type Strength = "weak" | "average" | "strong" | "excess";

export interface HouseInterpretation {
  house: number;
  title: string;
  themes: string;
  sign: Sign;
  signNumber: number;
  bindus: number;
  strength: Strength;
  strengthLabel: string;     // user-friendly e.g. "Weak", "Balanced", "Strong", "Excess (maraka risk)"
  interpretation: string;    // text from matching range
  remedy?: string;           // only for weak
  marakaNote?: string;
}

export interface TrikonaHouseBreakdown {
  house: number;
  title: string;
  themes: string;
  bindus: number;
  strength: Strength;
  strengthLabel: string;
}

export interface TrikonaInterpretation {
  id: string;
  name: string;
  houses: number[];
  meaning: string;
  description: string;
  averageBindus: number;
  isStrong: boolean;
  verdict: string;
  breakdown: TrikonaHouseBreakdown[];
}

export interface ComparisonInterpretation {
  id: string;
  title: string;
  themes: string;
  valueA: number;
  valueB: number;
  houseA: number;
  houseB: number;
  verdict: string;
}

export interface SarvashtakvargaInsights {
  houses: HouseInterpretation[];
  trikonas: TrikonaInterpretation[];
  comparisons: ComparisonInterpretation[];
  /** Summary stats */
  summary: {
    lagnaSign: Sign;
    grandTotal: number;
    strongestHouse: HouseInterpretation;
    weakestHouse: HouseInterpretation;
    averageBindus: number;
  };
}

// ─── Main interpreter ──────────────────────────────────────────────────────

function classifyHouse(
  bindus: number,
  content: HouseRuleContent,
): { strength: Strength; label: string; text: string; remedy?: string; marakaNote?: string } {
  const { ranges, isMaraka, weakRemedy, marakaNote } = content;

  if (bindus >= ranges.weak.min && bindus <= ranges.weak.max) {
    return {
      strength: "weak",
      label: "Weak",
      text: ranges.weak.text,
      remedy: weakRemedy,
      marakaNote: isMaraka ? marakaNote : undefined,
    };
  }
  if (bindus >= ranges.average.min && bindus <= ranges.average.max) {
    return {
      strength: "average",
      label: isMaraka ? "Balanced (optimal for maraka)" : "Average",
      text: ranges.average.text,
      marakaNote: isMaraka ? marakaNote : undefined,
    };
  }
  // >= strong.min
  return {
    strength: isMaraka ? "excess" : "strong",
    label: isMaraka ? "Excess (maraka risk)" : "Strong",
    text: ranges.strong.text,
    marakaNote: isMaraka ? marakaNote : undefined,
  };
}

export function interpretSarvashtakvarga(
  signTotals: number[],
  lagnaSign: Sign,
  rules: InterpretationRules,
): SarvashtakvargaInsights {
  const lagnaIdx = SIGN_INDEX[lagnaSign];

  // Per-house bindu lookup: houseNumber 1-12 → bindus
  const binduByHouse: Record<number, number> = {};
  const signByHouse: Record<number, Sign> = {};
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaIdx + h - 1) % 12;
    binduByHouse[h] = signTotals[signIdx] ?? 0;
    signByHouse[h] = ZODIAC_ORDER[signIdx];
  }

  // House-wise interpretations
  const houseRuleByKey: Record<string, HouseRuleContent> = {};
  for (const r of rules.house) houseRuleByKey[r.ruleKey] = r.content;

  const houses: HouseInterpretation[] = [];
  for (let h = 1; h <= 12; h++) {
    const content = houseRuleByKey[String(h)];
    if (!content) continue;
    const bindus = binduByHouse[h];
    const sign = signByHouse[h];
    const cls = classifyHouse(bindus, content);
    houses.push({
      house: h,
      title: content.title,
      themes: content.themes,
      sign,
      signNumber: SIGN_INDEX[sign] + 1,
      bindus,
      strength: cls.strength,
      strengthLabel: cls.label,
      interpretation: cls.text,
      remedy: cls.remedy,
      marakaNote: cls.marakaNote,
    });
  }

  // Trikona interpretations
  const houseByNumber: Record<number, HouseInterpretation> = {};
  for (const h of houses) houseByNumber[h.house] = h;

  const trikonas: TrikonaInterpretation[] = rules.trikona.map((r) => {
    const c = r.content;
    const totals = c.houses.map((h) => binduByHouse[h] ?? 0);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const isStrong = avg >= c.strongThreshold;

    const breakdown: TrikonaHouseBreakdown[] = c.houses.map((h) => {
      const hi = houseByNumber[h];
      return {
        house: h,
        title: hi?.title ?? `House ${h}`,
        themes: hi?.themes ?? "",
        bindus: binduByHouse[h] ?? 0,
        strength: hi?.strength ?? "average",
        strengthLabel: hi?.strengthLabel ?? "Average",
      };
    });

    const supported = breakdown.filter((b) => b.strength === "strong" || b.strength === "excess");
    const needsAttention = breakdown.filter((b) => b.strength === "weak");
    const fmt = (arr: TrikonaHouseBreakdown[]) =>
      arr.map((b) => `H${b.house} ${b.title.split(" (")[0]}`).join(", ");

    let verdict: string;
    if (isStrong) {
      verdict = `Strong ${c.name} pillar (avg ${avg.toFixed(1)}). ${c.description}`;
    } else if (avg >= 24) {
      const parts: string[] = [];
      if (supported.length) parts.push(`${fmt(supported)} well supported`);
      if (needsAttention.length) parts.push(`${fmt(needsAttention)} needs attention`);
      const detail = parts.length
        ? parts.join("; ") + "."
        : "All three houses sit in the average band — steady but not a standout area.";
      verdict = `Moderate ${c.name} pillar (avg ${avg.toFixed(1)}). ${detail}`;
    } else {
      verdict = `Weak ${c.name} pillar (avg ${avg.toFixed(1)}). This life area benefits from conscious cultivation and targeted effort.`;
    }

    return {
      id: r.ruleKey,
      name: c.name,
      houses: c.houses,
      meaning: c.meaning,
      description: c.description,
      averageBindus: Math.round(avg * 10) / 10,
      isStrong,
      verdict,
      breakdown,
    };
  });

  // Comparison interpretations
  const comparisons: ComparisonInterpretation[] = rules.comparison.map((r) => {
    const c = r.content;
    const valueA = binduByHouse[c.houseA] ?? 0;
    const valueB = binduByHouse[c.houseB] ?? 0;
    let verdict: string;
    if (valueA > valueB) {
      verdict = c.aOverB;
    } else if (valueB > valueA) {
      verdict = c.bOverA;
    } else {
      verdict = c.equal || `${c.houseA}th and ${c.houseB}th houses are equal (${valueA} bindus each). Neither tendency dominates.`;
    }
    return {
      id: r.ruleKey,
      title: c.title,
      themes: c.themes,
      valueA,
      valueB,
      houseA: c.houseA,
      houseB: c.houseB,
      verdict,
    };
  });

  // Summary stats
  const grandTotal = signTotals.reduce((a, b) => a + b, 0);
  const averageBindus = grandTotal / 12;
  const strongestHouse = houses.reduce((a, b) => (b.bindus > a.bindus ? b : a));
  const weakestHouse = houses.reduce((a, b) => (b.bindus < a.bindus ? b : a));

  return {
    houses,
    trikonas,
    comparisons,
    summary: {
      lagnaSign,
      grandTotal,
      strongestHouse,
      weakestHouse,
      averageBindus: Math.round(averageBindus * 10) / 10,
    },
  };
}
