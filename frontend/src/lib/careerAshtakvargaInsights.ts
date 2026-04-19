/**
 * Career-specific Ashtakvarga insights.
 *
 * Pulls classical bindu signals that most affect career out of a computed
 * AshtakvargaAnalysis:
 *   - 10th house SAV (primary career/profession house)
 *   - 11th house SAV (gains, income, desires fulfilled)
 *   - A10 (Rajya Pada) SAV (professional reputation)
 *   - Sun bindus in 10th (authority, leadership)
 *   - Saturn bindus in 10th (discipline, endurance, structured work)
 *   - Jupiter bindus in 10th (wisdom, expansion, advisory)
 *   - Amatya Karaka bindus in 10th (personal career significator)
 *
 * Classical comparisons:
 *   11th > 10th  → business is viable
 *   10th >= 11th → salaried path recommended
 *   10th > 9th   → hard-work success; 9th > 10th → over-reliance on luck
 *
 * Thresholds:
 *   SAV per house: <22 weak, 23-28 average, >28 strong
 *   BAV per sign:  0-2 weak, 3-4 average, 5-8 strong
 */

import type { AshtakvargaAnalysis } from "./ashtakvargaEngine";
import { ASHTAKVARGA_PLANETS } from "./ashtakvargaEngine";
import { ZODIAC_ORDER, SIGN_INDEX, type Sign } from "./charaDashaEngine";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Strength = "Weak" | "Average" | "Strong";

export interface CareerSavSignal {
  label: string;
  sign: Sign;
  signNumber: number;
  bindus: number;
  strength: Strength;
  interpretation: string;
}

export interface CareerBavSignal {
  planet: string;
  role: string;
  sign: Sign;
  bindus: number;       // 0-8
  strength: Strength;
  interpretation: string;
}

export interface CareerComparison {
  title: string;
  themes: string;
  valueA: number;
  valueB: number;
  labelA: string;
  labelB: string;
  verdict: string;
}

export interface CareerAshtakvargaInsights {
  tenthSav: CareerSavSignal;
  eleventhSav: CareerSavSignal;
  a10Sav: CareerSavSignal;
  sunBav: CareerBavSignal;
  saturnBav: CareerBavSignal;
  jupiterBav: CareerBavSignal;
  amkBav: CareerBavSignal;
  comparisons: CareerComparison[];
  overallRating: Strength;
  overallNarrative: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function signAtOffset(from: Sign, offset: number): Sign {
  return ZODIAC_ORDER[(SIGN_INDEX[from] + offset - 1) % 12];
}

// SAV per house: <22 weak, 23-28 average, >28 strong (10th/11th benefit from
// high scores — not maraka houses, so high is always positive)
function classifySavCareer(bindus: number): { strength: Strength; text: string } {
  if (bindus <= 22) {
    return {
      strength: "Weak",
      text: `${bindus} bindus — below threshold. This house receives limited natal support; career progress here depends more heavily on favourable transits, dasha activations, and deliberate effort than on built-in momentum.`,
    };
  }
  if (bindus <= 28) {
    return {
      strength: "Average",
      text: `${bindus} bindus — balanced natal support. Neither strained nor overflowing; steady progression with ordinary effort is the expected pattern.`,
    };
  }
  return {
    strength: "Strong",
    text: `${bindus} bindus — strongly supported. This house carries substantial natal blessings; expect meaningful results once dasha-transit windows activate the underlying potential.`,
  };
}

function classifyBav(bindus: number): Strength {
  if (bindus <= 2) return "Weak";
  if (bindus <= 4) return "Average";
  return "Strong";
}

// ────────────────────────────────────────────────────────────────────────────
// Main: compute career insights from an Ashtakvarga analysis
// ────────────────────────────────────────────────────────────────────────────

export function computeCareerAshtakvargaInsights(
  analysis: AshtakvargaAnalysis,
  a10Sign: Sign,
  amkPlanet: string,
): CareerAshtakvargaInsights {
  const lagna = analysis.lagnaSign;
  const tenthSign = signAtOffset(lagna, 10);
  const eleventhSign = signAtOffset(lagna, 11);
  const ninthSign = signAtOffset(lagna, 9);

  const savBySign = analysis.sarvashtakvarga.signTotals;

  const bavIn = (planet: string, sign: Sign): number => {
    const planetIdx = ASHTAKVARGA_PLANETS.indexOf(
      planet as (typeof ASHTAKVARGA_PLANETS)[number],
    );
    if (planetIdx < 0) return 0;
    return analysis.prastharaCharts[planetIdx].signTotals[SIGN_INDEX[sign]] ?? 0;
  };

  // 10th house SAV
  const tenthBindus = savBySign[SIGN_INDEX[tenthSign]];
  const tenthClass = classifySavCareer(tenthBindus);
  const tenthSav: CareerSavSignal = {
    label: "10th House (Career / Profession)",
    sign: tenthSign,
    signNumber: SIGN_INDEX[tenthSign] + 1,
    bindus: tenthBindus,
    strength: tenthClass.strength,
    interpretation: tenthClass.text,
  };

  // 11th house SAV
  const eleventhBindus = savBySign[SIGN_INDEX[eleventhSign]];
  const eleventhClass = classifySavCareer(eleventhBindus);
  const eleventhSav: CareerSavSignal = {
    label: "11th House (Gains / Income)",
    sign: eleventhSign,
    signNumber: SIGN_INDEX[eleventhSign] + 1,
    bindus: eleventhBindus,
    strength: eleventhClass.strength,
    interpretation: eleventhBindus > 28
      ? `${eleventhBindus} bindus — income flows and network support are robustly blessed. Multiple revenue streams and strong gains are natively supported.`
      : eleventhBindus >= 23
        ? `${eleventhBindus} bindus — balanced income support. Earnings will align with effort; unlikely to hit extremes in either direction.`
        : `${eleventhBindus} bindus — income house is weaker. Gains require more intentional cultivation: diversify revenue sources, build strong networks, avoid assuming earnings will arrive passively.`,
  };

  // A10 SAV
  const a10Bindus = savBySign[SIGN_INDEX[a10Sign]];
  const a10Class = classifySavCareer(a10Bindus);
  const a10Sav: CareerSavSignal = {
    label: "A10 (Rajya Pada — Reputation)",
    sign: a10Sign,
    signNumber: SIGN_INDEX[a10Sign] + 1,
    bindus: a10Bindus,
    strength: a10Class.strength,
    interpretation: a10Bindus > 28
      ? `${a10Bindus} bindus — professional reputation is strongly supported. Public perception of your work tends to be favourable; status and visibility flow naturally.`
      : a10Bindus >= 23
        ? `${a10Bindus} bindus — balanced reputation support. Public standing tracks with actual competence and effort rather than accelerating or lagging it.`
        : `${a10Bindus} bindus — reputation pada is weaker. Protect your professional brand actively; public recognition lags natural talent and requires deliberate image management.`,
  };

  // Sun BAV in 10th
  const sunIn10 = bavIn("Sun", tenthSign);
  const sunBav: CareerBavSignal = {
    planet: "Sun",
    role: "Authority / Leadership",
    sign: tenthSign,
    bindus: sunIn10,
    strength: classifyBav(sunIn10),
    interpretation:
      sunIn10 >= 5
        ? `Sun places ${sunIn10}/8 bindus in your 10th house sign. Strong authority signature — leadership roles, public recognition, and command positions come naturally.`
        : sunIn10 >= 3
          ? `Sun places ${sunIn10}/8 bindus in your 10th house sign. Moderate authority potential; leadership works when cultivated but isn't the chart's primary flow.`
          : `Sun places ${sunIn10}/8 bindus in your 10th house sign. Light solar influence — you may excel more as senior expert or trusted advisor than as front-line authority figure.`,
  };

  // Saturn BAV in 10th
  const saturnIn10 = bavIn("Saturn", tenthSign);
  const saturnBav: CareerBavSignal = {
    planet: "Saturn",
    role: "Discipline / Long-term structure",
    sign: tenthSign,
    bindus: saturnIn10,
    strength: classifyBav(saturnIn10),
    interpretation:
      saturnIn10 >= 5
        ? `Saturn places ${saturnIn10}/8 bindus in your 10th house sign. Strong Saturn — career rewards endurance, structured work, and long-cycle investments. Late-bloomer pattern with deep results.`
        : saturnIn10 >= 3
          ? `Saturn places ${saturnIn10}/8 bindus in your 10th house sign. Moderate discipline signature — you can do structured work when needed but are not bound to it.`
          : `Saturn places ${saturnIn10}/8 bindus in your 10th house sign. Light Saturn influence — career is less likely to be slow-and-grinding; faster-paced or less-rigid environments may suit you better.`,
  };

  // Jupiter BAV in 10th
  const jupiterIn10 = bavIn("Jupiter", tenthSign);
  const jupiterBav: CareerBavSignal = {
    planet: "Jupiter",
    role: "Expansion / Wisdom / Advisory",
    sign: tenthSign,
    bindus: jupiterIn10,
    strength: classifyBav(jupiterIn10),
    interpretation:
      jupiterIn10 >= 5
        ? `Jupiter places ${jupiterIn10}/8 bindus in your 10th house sign. Strong Jupiter — your career benefits from wisdom, teaching, advisory, or ethical expansion. Opportunities for growth come readily.`
        : jupiterIn10 >= 3
          ? `Jupiter places ${jupiterIn10}/8 bindus in your 10th house sign. Moderate Jupiter support — professional growth opportunities flow with reasonable consistency.`
          : `Jupiter places ${jupiterIn10}/8 bindus in your 10th house sign. Light Jupiter influence — opportunities come through effort more than grace; growth requires active pursuit.`,
  };

  // AmK BAV in 10th — personal career significator
  const amkIn10 = bavIn(amkPlanet, tenthSign);
  const amkBav: CareerBavSignal = {
    planet: amkPlanet,
    role: "Amatya Karaka (personal career significator)",
    sign: tenthSign,
    bindus: amkIn10,
    strength: classifyBav(amkIn10),
    interpretation:
      amkIn10 >= 5
        ? `Your Amatya Karaka (${amkPlanet}) places ${amkIn10}/8 bindus in the 10th house sign. The planet that most represents your career drive has strong presence in the career house — a highly favourable alignment between natural aptitude and professional expression.`
        : amkIn10 >= 3
          ? `Your Amatya Karaka (${amkPlanet}) places ${amkIn10}/8 bindus in the 10th house sign. Moderate connection — the career significator supports professional life but doesn't amplify it dramatically.`
          : `Your Amatya Karaka (${amkPlanet}) places ${amkIn10}/8 bindus in the 10th house sign. The career significator's bindus are lighter here — your core professional aptitude may express better in houses other than the 10th.`,
  };

  // Comparisons
  const ninthBindus = savBySign[SIGN_INDEX[ninthSign]];
  const comparisons: CareerComparison[] = [
    {
      title: "Business vs Job",
      themes: "11th (gains) vs 10th (profession)",
      valueA: eleventhBindus,
      valueB: tenthBindus,
      labelA: "11th",
      labelB: "10th",
      verdict:
        eleventhBindus > tenthBindus
          ? "11th > 10th: Business is viable. The gains house exceeds the profession house, suggesting independent ventures align well with your chart's income flow. Entrepreneurial paths can work if paired with disciplined execution."
          : tenthBindus > eleventhBindus
            ? "10th > 11th: Salaried / employment path recommended. The profession house dominates the gains house, suggesting career growth through institutional roles will outperform entrepreneurship for your chart."
            : `10th = 11th (${tenthBindus} each): Neither employment nor business dominates. The chart is flexible — either path can work, so choose based on personal inclination and current dasha-transit windows.`,
    },
    {
      title: "Effort vs Fortune",
      themes: "10th (karma) vs 9th (luck)",
      valueA: tenthBindus,
      valueB: ninthBindus,
      labelA: "10th",
      labelB: "9th",
      verdict:
        tenthBindus > ninthBindus
          ? "10th > 9th: Hard-working success pattern. Results come through disciplined effort and planned action. Reliance on planning + execution outperforms waiting for opportunities."
          : ninthBindus > tenthBindus
            ? "9th > 10th: Luck-reliance risk. Fortune may flow, but the shadow side is complacency. Pair favourable transits with deliberate effort to consolidate gains; don't assume they'll sustain themselves."
            : `10th = 9th (${tenthBindus} each): Balanced effort-and-fortune. Outcomes reflect both what you do and the opportunities that arrive — neither dominates.`,
    },
  ];

  // Overall rating
  const tenthOk = tenthBindus > 22;
  const eleventhOk = eleventhBindus > 22;
  const a10Ok = a10Bindus > 22;
  const sunOk = sunIn10 >= 3;
  const saturnOk = saturnIn10 >= 3;
  const jupiterOk = jupiterIn10 >= 3;
  const amkOk = amkIn10 >= 3;

  const housePositives = [tenthOk, eleventhOk, a10Ok].filter(Boolean).length;
  const planetPositives = [sunOk, saturnOk, jupiterOk, amkOk].filter(Boolean).length;

  const houseSignals: string[] = [];
  if (tenthOk) houseSignals.push("10th house");
  if (a10Ok) houseSignals.push("A10 reputation pada");
  if (eleventhOk) houseSignals.push("11th gains house");
  const housesPhrase = houseSignals.length === 3
    ? "the 10th, A10 reputation, and 11th gains house are all supported"
    : houseSignals.length === 2
      ? `${houseSignals.join(" and ")} are supported, while the third is weaker`
      : houseSignals.length === 1
        ? `only the ${houseSignals[0]} is adequately supported`
        : "all three primary career houses are below threshold";

  // Dedupe: if AmK is one of Sun/Saturn/Jupiter, don't list it twice
  const karakas: string[] = [];
  if (amkOk) karakas.push(`${amkPlanet} (AmK)`);
  if (jupiterOk && amkPlanet !== "Jupiter") karakas.push("Jupiter");
  if (sunOk && amkPlanet !== "Sun") karakas.push("Sun");
  if (saturnOk && amkPlanet !== "Saturn") karakas.push("Saturn");

  const karakaPhrase = karakas.length >= 2
    ? `Career karakas (${karakas.slice(0, 2).join(", ")}) reinforce the pattern in the 10th sign`
    : karakas.length === 1
      ? `${karakas[0]} offers support in the 10th sign`
      : "Career karakas offer only modest support in the 10th sign";

  let overallRating: Strength;
  let overallNarrative: string;

  if (housePositives >= 2 && planetPositives >= 2) {
    overallRating = "Strong";
    overallNarrative = `Ashtakvarga signals broadly favour career success — ${housesPhrase}. ${karakaPhrase}. The natal picture supports meaningful professional growth; dasha-transit windows above translate this into timing.`;
  } else if (housePositives >= 1 || planetPositives >= 2) {
    overallRating = "Average";
    overallNarrative = `Ashtakvarga signals are mixed — ${housesPhrase}. ${karakaPhrase}. Career rewards deliberate strategy and plays to the stronger signals rather than expecting automatic momentum across the board.`;
  } else {
    overallRating = "Weak";
    overallNarrative = `Ashtakvarga signals for career are on the quieter side — ${housesPhrase}. ${karakaPhrase}. This is not a denial of success; it points to career progress coming through sustained effort, favourable transits, and picking the right niche rather than natal-level automatic momentum.`;
  }

  return {
    tenthSav,
    eleventhSav,
    a10Sav,
    sunBav,
    saturnBav,
    jupiterBav,
    amkBav,
    comparisons,
    overallRating,
    overallNarrative: overallNarrative.trim(),
  };
}
