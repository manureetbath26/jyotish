// ─── Ayurvedic Wellness Report Engine ────────────────────────────────────────
// Generates a comprehensive Ayurvedic wellness report from Vedic chart data.
// ---------------------------------------------------------------------------

import type {
  ChartResponse,
  PlanetPosition,
  HouseInfo,
  DashaEntry,
} from "./api";

// ─── Exported Interfaces ─────────────────────────────────────────────────────

export type Dosha = "Vata" | "Pitta" | "Kapha";
export type Strength = "strong" | "moderate" | "weak";

export interface DoshaConstitution {
  vata: number;
  pitta: number;
  kapha: number;
  primaryDosha: Dosha;
  secondaryDosha: Dosha;
  description: string;
  breakdownDetails: { source: string; dosha: Dosha; weight: number }[];
}

export interface BodyTypeProfile {
  primaryDosha: Dosha;
  secondaryDosha: Dosha;
  frame: string;
  metabolism: string;
  skinType: string;
  hair: string;
  digestionPattern: string;
  sleepPattern: string;
  energyPattern: string;
  summary: string;
}

export interface HealthPlanetEntry {
  planet: string;
  rashi: string;
  house: number;
  dignity: string | null;
  isRetrograde: boolean;
  bodyAreas: string;
  strength: Strength;
  interpretation: string;
}

export interface HouseHealthEntry {
  house: number;
  title: string;
  rashi: string;
  lord: string;
  lordPlacement: string;
  lordStrength: Strength;
  occupants: string[];
  interpretation: string;
}

export interface VulnerableArea {
  bodyPart: string;
  house: number;
  rashi: string;
  reason: string;
  severity: Strength;
}

export interface FoodRecommendation {
  food: string;
  action: "favor" | "avoid";
  reasoning: string;
}

export interface DietaryRecommendations {
  primaryDosha: Dosha;
  generalGuidance: string;
  foods: FoodRecommendation[];
  mealTiming: string;
  spices: { name: string; benefit: string }[];
}

export interface YogaAsana {
  name: string;
  description: string;
  reasoning: string;
}

export interface YogaExerciseRecommendations {
  exerciseType: string;
  intensity: string;
  asanas: YogaAsana[];
  pranayama: { name: string; description: string; reasoning: string }[];
  bestTimeOfDay: string;
}

export interface LifestyleRecommendations {
  sleepSchedule: string;
  seasonalAdvice: { season: string; advice: string }[];
  stressManagement: string;
  dailyRoutine: { time: string; activity: string }[];
}

export interface HealthPeriod {
  dashaLord: string;
  startDate: string;
  endDate: string;
  type: "favorable" | "cautious" | "neutral";
  isCurrent: boolean;
  interpretation: string;
  antardasha?: string;
  antardashaInterpretation?: string;
}

export interface Remedy {
  category: "gemstone" | "mantra" | "lifestyle" | "herb";
  title: string;
  description: string;
  reasoning: string;
}

export interface AyurvedicReport {
  doshaConstitution: DoshaConstitution;
  bodyTypeProfile: BodyTypeProfile;
  healthPlanetAnalysis: HealthPlanetEntry[];
  houseHealthAnalysis: HouseHealthEntry[];
  vulnerableAreas: VulnerableArea[];
  dietaryRecommendations: DietaryRecommendations;
  yogaExerciseRecommendations: YogaExerciseRecommendations;
  lifestyleRecommendations: LifestyleRecommendations;
  healthPeriodTimeline: HealthPeriod[];
  remedies: Remedy[];
}

// ─── Constants / Lookup Tables ───────────────────────────────────────────────

const VATA_SIGNS = ["Gemini", "Virgo", "Libra", "Capricorn", "Aquarius"];
const PITTA_SIGNS = ["Aries", "Leo", "Scorpio", "Sagittarius"];
const KAPHA_SIGNS = ["Taurus", "Cancer", "Pisces"];

const MALEFICS = ["Saturn", "Mars", "Rahu", "Ketu"];

const RASHI_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const RASHI_BODY_MAP: Record<string, string> = {
  Aries: "head, brain, and facial region",
  Taurus: "face, throat, neck, and thyroid",
  Gemini: "arms, shoulders, lungs, and nervous system",
  Cancer: "chest, stomach, and breasts",
  Leo: "heart, spine, and upper back",
  Virgo: "intestines, digestive system, and abdomen",
  Libra: "kidneys, lower back, and adrenal glands",
  Scorpio: "reproductive organs, bladder, and colon",
  Sagittarius: "thighs, hips, liver, and sciatic nerve",
  Capricorn: "knees, bones, joints, and skeletal system",
  Aquarius: "ankles, calves, and circulatory system",
  Pisces: "feet, lymphatic system, and immune defenses",
};

const PLANET_HEALTH_AREAS: Record<string, string> = {
  Sun: "vitality, heart, bones, and eyes",
  Moon: "mind, hormones, bodily fluids, and sleep",
  Mars: "blood, muscles, inflammation, and surgical issues",
  Mercury: "nervous system, skin, speech, and intellect",
  Jupiter: "liver, fat metabolism, growth, and wisdom",
  Venus: "reproductive health, kidneys, skin beauty, and hormonal balance",
  Saturn: "chronic conditions, joints, teeth, aging, and discipline",
};

const NATURAL_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const PLANET_GEMSTONES: Record<string, { gem: string; finger: string }> = {
  Sun: { gem: "Ruby (Manikya)", finger: "ring finger" },
  Moon: { gem: "Pearl (Moti)", finger: "little finger" },
  Mars: { gem: "Red Coral (Moonga)", finger: "ring finger" },
  Mercury: { gem: "Emerald (Panna)", finger: "little finger" },
  Jupiter: { gem: "Yellow Sapphire (Pukhraj)", finger: "index finger" },
  Venus: { gem: "Diamond (Heera) or White Sapphire", finger: "middle finger" },
  Saturn: { gem: "Blue Sapphire (Neelam)", finger: "middle finger" },
};

const PLANET_MANTRAS: Record<string, string> = {
  Sun: "Om Suryaya Namaha (108 times at sunrise)",
  Moon: "Om Chandraya Namaha (108 times on Mondays)",
  Mars: "Om Mangalaya Namaha (108 times on Tuesdays)",
  Mercury: "Om Budhaya Namaha (108 times on Wednesdays)",
  Jupiter: "Om Gurave Namaha (108 times on Thursdays)",
  Venus: "Om Shukraya Namaha (108 times on Fridays)",
  Saturn: "Om Shanaye Namaha (108 times on Saturdays)",
};

// ─── Helper Utilities ────────────────────────────────────────────────────────

function doshaOfSign(rashi: string): Dosha {
  if (PITTA_SIGNS.includes(rashi)) return "Pitta";
  if (KAPHA_SIGNS.includes(rashi)) return "Kapha";
  return "Vata";
}

function getPlanet(planets: PlanetPosition[], name: string): PlanetPosition | undefined {
  return planets.find((p) => p.name === name);
}

function getHouse(houses: HouseInfo[], num: number): HouseInfo | undefined {
  return houses.find((h) => h.house_num === num);
}

function planetStrength(p: PlanetPosition): Strength {
  if (!p.dignity) return "moderate";
  const d = p.dignity.toLowerCase();
  if (d === "exalted" || d === "moolatrikona") return "strong";
  if (d === "own") return "strong";
  if (d === "debilitated") return "weak";
  return "moderate";
}

function lordOfRashi(rashi: string): string {
  return NATURAL_LORDS[rashi] || "Unknown";
}

function isMalefic(name: string): boolean {
  return MALEFICS.includes(name);
}

function findHouseLord(chart: ChartResponse, houseNum: number): PlanetPosition | undefined {
  const house = getHouse(chart.houses, houseNum);
  if (!house) return undefined;
  return getPlanet(chart.planets, house.lord);
}

function houseLordStrength(chart: ChartResponse, houseNum: number): Strength {
  const lord = findHouseLord(chart, houseNum);
  if (!lord) return "moderate";
  return planetStrength(lord);
}

function describePosition(p: PlanetPosition): string {
  const parts: string[] = [];
  parts.push(`${p.rashi} (house ${p.house})`);
  if (p.dignity) parts.push(p.dignity);
  if (p.is_retrograde) parts.push("retrograde");
  return parts.join(", ");
}

// ─── Section Generators ──────────────────────────────────────────────────────

function buildDoshaConstitution(chart: ChartResponse): DoshaConstitution {
  const scores: Record<Dosha, number> = { Vata: 0, Pitta: 0, Kapha: 0 };
  const details: DoshaConstitution["breakdownDetails"] = [];

  // Lagna sign (weight 3)
  const lagnaDosha = doshaOfSign(chart.lagna);
  scores[lagnaDosha] += 3;
  details.push({ source: `Lagna (${chart.lagna})`, dosha: lagnaDosha, weight: 3 });

  // Moon sign (weight 2)
  const moon = getPlanet(chart.planets, "Moon");
  if (moon) {
    const moonDosha = doshaOfSign(moon.rashi);
    scores[moonDosha] += 2;
    details.push({ source: `Moon (${moon.rashi})`, dosha: moonDosha, weight: 2 });
  }

  // All planets (weight 1 each)
  for (const p of chart.planets) {
    const d = doshaOfSign(p.rashi);
    scores[d] += 1;
    details.push({ source: `${p.name} (${p.rashi})`, dosha: d, weight: 1 });
  }

  const total = scores.Vata + scores.Pitta + scores.Kapha;
  const vata = Math.round((scores.Vata / total) * 100);
  const pitta = Math.round((scores.Pitta / total) * 100);
  const kapha = 100 - vata - pitta;

  const sorted = (["Vata", "Pitta", "Kapha"] as Dosha[]).sort(
    (a, b) => scores[b] - scores[a]
  );

  const primary = sorted[0];
  const secondary = sorted[1];

  const combos: Record<string, string> = {
    "Vata-Pitta":
      "Your constitution is primarily governed by the air and fire elements. You have a quick, active mind paired with sharp intellect and strong drive. You may tend toward nervous energy and inflammatory stress responses. Your metabolism runs fast but can be irregular. You benefit from grounding routines and cooling yet nourishing foods.",
    "Vata-Kapha":
      "Your constitution blends air with earth and water elements. You may alternate between bursts of creative energy and periods of sluggishness. Digestion can be variable — sometimes slow, sometimes irregular. You need warmth, stimulation, and consistent daily rhythm to stay balanced.",
    "Pitta-Vata":
      "Fire dominates your constitution with air as a secondary influence. You are intense, driven, and intellectually sharp, but prone to burnout. Your strong metabolism can be disrupted by stress. You need cooling activities, regular meals, and adequate rest to prevent overheating and anxiety.",
    "Pitta-Kapha":
      "Fire and water-earth blend gives you strong physical stamina with a powerful digestive fire. You have good endurance and muscle tone but can tend toward excess weight and overheating when imbalanced. You benefit from moderate exercise and foods that are neither too heavy nor too spicy.",
    "Kapha-Vata":
      "Earth-water combined with air gives you a constitution that can feel heavy or sluggish yet also anxious. You need movement, warmth, and stimulation. When balanced, you have good endurance and creativity. Your digestion tends toward slow, so light and warm foods suit you best.",
    "Kapha-Pitta":
      "Your constitution is grounded and strong with good digestive fire. You have excellent physical stamina and emotional resilience. When imbalanced, you may gain weight easily and experience inflammatory conditions. You benefit from regular vigorous exercise and a diet that avoids excess oil and sugar.",
  };

  const key = `${primary}-${secondary}`;
  const description =
    combos[key] ||
    `Your constitution is predominantly ${primary} with ${secondary} as a secondary influence. This combination shapes your physical tendencies, mental patterns, and health vulnerabilities in a unique way.`;

  return {
    vata,
    pitta,
    kapha,
    primaryDosha: primary,
    secondaryDosha: secondary,
    description,
    breakdownDetails: details,
  };
}

function buildBodyTypeProfile(dosha: DoshaConstitution): BodyTypeProfile {
  const profiles: Record<
    Dosha,
    Omit<BodyTypeProfile, "primaryDosha" | "secondaryDosha" | "summary">
  > = {
    Vata: {
      frame: "Light, thin build with narrow shoulders and hips. Joints may be prominent. Tends toward being underweight.",
      metabolism: "Variable and irregular metabolism. Can lose weight easily but also experiences energy crashes.",
      skinType: "Dry, cool, and rough skin that is prone to cracking in cold weather. Veins may be visible.",
      hair: "Dry, thin, and potentially frizzy or curly hair. Prone to split ends and dryness.",
      digestionPattern: "Irregular appetite — alternates between strong hunger and no appetite. Prone to gas, bloating, and constipation.",
      sleepPattern: "Light, easily disturbed sleep. May have difficulty falling asleep due to active mind. Dreams are vivid and active.",
      energyPattern: "Energy comes in bursts followed by fatigue. Most energetic in short spurts. Tends to overexert then crash.",
    },
    Pitta: {
      frame: "Medium, athletic build with good muscle definition. Proportionate frame with moderate weight.",
      metabolism: "Strong and fast metabolism. Runs warm. Good appetite and efficient digestion when balanced.",
      skinType: "Warm, slightly oily, and sensitive skin. Prone to rashes, acne, and inflammation. Freckles or moles are common.",
      hair: "Fine, straight hair with tendency toward premature graying or thinning. Oily scalp.",
      digestionPattern: "Strong digestive fire (agni). Cannot skip meals without irritability. Prone to acid reflux and heartburn when imbalanced.",
      sleepPattern: "Moderate sleep — falls asleep easily but may wake from heat or intensity. Needs 7-8 hours. Dreams are vivid and fiery.",
      energyPattern: "Sustained high energy with strong endurance. Most productive in middle of day. Can push hard but risks burnout.",
    },
    Kapha: {
      frame: "Solid, broad build with wide shoulders and hips. Good physical strength and stamina. Tends toward heaviness.",
      metabolism: "Slow, steady metabolism. Gains weight easily and has difficulty losing it. Runs cool.",
      skinType: "Thick, smooth, moist skin with good complexion. Slow to wrinkle. May be prone to oiliness and congestion.",
      hair: "Thick, lustrous, wavy hair. Strong and well-rooted. Tends toward oiliness.",
      digestionPattern: "Slow but steady digestion. Can skip meals without distress but tends toward sluggish elimination. Prone to mucus and congestion.",
      sleepPattern: "Deep, heavy sleep. Can sleep long hours and still feel groggy. Difficulty waking up. May be prone to oversleeping.",
      energyPattern: "Slow to start but excellent long-term endurance. Steady energy throughout the day. May feel lethargic in morning.",
    },
  };

  const primary = profiles[dosha.primaryDosha];
  const secondary = dosha.secondaryDosha;

  const summary = `With ${dosha.primaryDosha} as your primary dosha (${dosha[dosha.primaryDosha.toLowerCase() as "vata" | "pitta" | "kapha"]}%) and ${secondary} influence (${dosha[secondary.toLowerCase() as "vata" | "pitta" | "kapha"]}%), your body type reflects ${dosha.primaryDosha} characteristics with ${secondary} modifications. This means the core ${dosha.primaryDosha} patterns are tempered by ${secondary} qualities, creating a nuanced physical and metabolic profile.`;

  return {
    primaryDosha: dosha.primaryDosha,
    secondaryDosha: dosha.secondaryDosha,
    ...primary,
    summary,
  };
}

function buildHealthPlanetAnalysis(chart: ChartResponse): HealthPlanetEntry[] {
  const healthPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const entries: HealthPlanetEntry[] = [];

  for (const name of healthPlanets) {
    const p = getPlanet(chart.planets, name);
    if (!p) continue;

    const strength = planetStrength(p);
    const bodyAreas = PLANET_HEALTH_AREAS[name] || "";

    let interpretation = "";
    const pos = describePosition(p);

    if (strength === "strong") {
      interpretation = `${name} is ${p.dignity || "well-placed"} in ${p.rashi} in house ${p.house}, indicating strong support for ${bodyAreas}. `;
      if (name === "Sun")
        interpretation += `Your core vitality and heart health are well-supported. You likely have strong bones and good eyesight. The ${chart.lagna} lagna benefits from this strong solar placement.`;
      else if (name === "Moon")
        interpretation += `Your emotional well-being and hormonal balance are favored. Sleep quality tends to be good, and mental resilience is high.`;
      else if (name === "Mars")
        interpretation += `Physical energy and muscular strength are robust. Blood health and immune response are vigorous. Surgical outcomes tend to be favorable.`;
      else if (name === "Mercury")
        interpretation += `Nervous system function is well-supported. Communication and cognitive abilities are sharp. Skin health is generally good.`;
      else if (name === "Jupiter")
        interpretation += `Liver function, fat metabolism, and overall growth are well-regulated. There is natural protection against excess and good recuperative ability.`;
      else if (name === "Venus")
        interpretation += `Reproductive health, kidney function, and hormonal balance are well-supported. There is a natural glow and vitality to the skin.`;
      else if (name === "Saturn")
        interpretation += `Joint health and bone density are supported by disciplined Saturn. Chronic conditions are less likely, and there is strong structural resilience in the body.`;
    } else if (strength === "weak") {
      interpretation = `${name} is debilitated in ${p.rashi} in house ${p.house}, suggesting vulnerability in ${bodyAreas}. `;
      if (name === "Sun")
        interpretation += `Vitality may be lower than average. Pay attention to heart health, bone density, and eye care. With ${chart.lagna} lagna, boosting solar energy through morning sunlight and warm foods is important.`;
      else if (name === "Moon")
        interpretation += `Emotional fluctuations and hormonal imbalances may arise more easily. Sleep can be disturbed, and fluid balance in the body needs monitoring. Mental health practices are especially important.`;
      else if (name === "Mars")
        interpretation += `Blood-related issues, inflammation, or muscular weakness may need attention. Surgical situations should be approached with extra caution. Regular but gentle exercise helps strengthen Mars energy.`;
      else if (name === "Mercury")
        interpretation += `The nervous system may be sensitive, with potential for anxiety, skin issues, or speech-related concerns. Calming practices and nerve-nourishing foods are beneficial.`;
      else if (name === "Jupiter")
        interpretation += `Liver function and fat metabolism may need careful management. There can be a tendency toward weight issues or sluggish growth recovery. Bitter herbs and moderate eating support Jupiter.`;
      else if (name === "Venus")
        interpretation += `Reproductive health needs extra attention. Kidney function and hormonal cycles may be irregular. Nourishing the Venus energy through self-care and beauty routines helps.`;
      else if (name === "Saturn")
        interpretation += `Chronic conditions, joint pain, and dental issues may manifest earlier or more severely. Bones and cartilage need proactive care. Warm oil massage and calcium-rich foods are essential.`;
    } else {
      interpretation = `${name} is placed in ${p.rashi} in house ${p.house}${p.is_retrograde ? " (retrograde)" : ""}, giving moderate support to ${bodyAreas}. `;
      if (p.is_retrograde) {
        interpretation += `The retrograde status of ${name} suggests internalized energy related to ${bodyAreas}. Issues in these areas may develop slowly and require introspection to address. `;
      }
      const houseContext =
        p.house === 6
          ? `Placement in the 6th house of disease indicates a need for proactive health management related to ${bodyAreas}.`
          : p.house === 8
            ? `Placement in the 8th house suggests hidden or chronic issues related to ${bodyAreas} that may surface during specific dasha periods.`
            : p.house === 12
              ? `Placement in the 12th house indicates that health matters related to ${bodyAreas} may require hospitalization or manifest as hidden ailments.`
              : p.house === 1
                ? `Placement in the 1st house directly impacts physical constitution and appearance, strengthening ${bodyAreas}.`
                : `General attention to ${bodyAreas} is advised, particularly during ${name} dasha or antardasha periods.`;
      interpretation += houseContext;
    }

    entries.push({
      planet: name,
      rashi: p.rashi,
      house: p.house,
      dignity: p.dignity,
      isRetrograde: p.is_retrograde,
      bodyAreas,
      strength,
      interpretation,
    });
  }

  return entries;
}

function buildHouseHealthAnalysis(chart: ChartResponse): HouseHealthEntry[] {
  const healthHouses = [
    { num: 1, title: "Overall Vitality & Physical Constitution" },
    { num: 6, title: "Disease Tendencies, Immune System & Daily Health Habits" },
    { num: 8, title: "Chronic Conditions, Reproductive Health & Longevity" },
    { num: 12, title: "Hospitalization, Sleep Quality & Mental Health" },
  ];

  return healthHouses.map(({ num, title }) => {
    const house = getHouse(chart.houses, num);
    if (!house) {
      return {
        house: num,
        title,
        rashi: "Unknown",
        lord: "Unknown",
        lordPlacement: "Unknown",
        lordStrength: "moderate" as Strength,
        occupants: [],
        interpretation: "House data unavailable.",
      };
    }

    const lord = getPlanet(chart.planets, house.lord);
    const lordPos = lord ? describePosition(lord) : "unknown";
    const lordStr = lord ? planetStrength(lord) : ("moderate" as Strength);
    const occupants = house.occupants;

    let interpretation = `The ${num === 1 ? "1st" : num === 6 ? "6th" : num === 8 ? "8th" : "12th"} house is in ${house.rashi}, lorded by ${house.lord} placed in ${lordPos}. `;

    // Malefic occupants
    const maleficOccupants = occupants.filter(isMalefic);
    const beneficOccupants = occupants.filter(
      (o) => ["Jupiter", "Venus", "Mercury", "Moon"].includes(o) && !isMalefic(o)
    );

    if (num === 1) {
      interpretation += lordStr === "strong"
        ? `With a strong lagna lord (${house.lord}), your overall physical vitality is robust. The body has good recuperative power and natural resistance to illness. `
        : lordStr === "weak"
          ? `The lagna lord ${house.lord} is weakened, which can lower overall vitality and physical resilience. Building strength through diet and exercise is especially important. `
          : `The lagna lord ${house.lord} has moderate strength, giving you a reasonably healthy constitution that benefits from consistent care. `;
      if (maleficOccupants.length > 0)
        interpretation += `The presence of ${maleficOccupants.join(" and ")} in the 1st house can create physical challenges, health complaints, or a tendency toward injuries. `;
      if (beneficOccupants.length > 0)
        interpretation += `${beneficOccupants.join(" and ")} in the lagna support good health, attractiveness, and physical well-being. `;
    } else if (num === 6) {
      interpretation += lordStr === "strong"
        ? `A strong 6th lord (${house.lord}) in ${lordPos} suggests the ability to overcome diseases and enemies. Your immune system is well-equipped to fight illness. `
        : lordStr === "weak"
          ? `A weakened 6th lord (${house.lord}) may indicate susceptibility to recurring illness, digestive issues, or difficulty overcoming health challenges. `
          : `The 6th lord ${house.lord} has moderate placement, suggesting average immune function that benefits from healthy daily routines (Dinacharya). `;
      const sixthRashiBody = RASHI_BODY_MAP[house.rashi];
      if (sixthRashiBody)
        interpretation += `With ${house.rashi} on the 6th cusp, disease tendencies may relate to the ${sixthRashiBody}. `;
      if (maleficOccupants.length > 0)
        interpretation += `${maleficOccupants.join(" and ")} in the 6th can indicate chronic health battles but also the fighting spirit to overcome them. `;
    } else if (num === 8) {
      interpretation += lordStr === "strong"
        ? `A strong 8th lord (${house.lord}) supports longevity and resilience against chronic illness. Transformative health experiences tend to have positive outcomes. `
        : lordStr === "weak"
          ? `A weakened 8th lord (${house.lord}) suggests vulnerability to chronic or hidden health conditions. Reproductive health and vitality need monitoring. `
          : `The 8th lord ${house.lord} has moderate strength, suggesting normal longevity with attention needed to chronic health patterns. `;
      if (maleficOccupants.length > 0)
        interpretation += `${maleficOccupants.join(" and ")} in the 8th house can indicate sudden health crises, surgical interventions, or intense transformative health experiences. `;
    } else if (num === 12) {
      interpretation += lordStr === "strong"
        ? `A strong 12th lord (${house.lord}) suggests good sleep quality and minimal hospitalization risk. Expenses on health tend to be well-managed. `
        : lordStr === "weak"
          ? `A weakened 12th lord (${house.lord}) may indicate sleep disturbances, hidden ailments, or unexpected health expenses. Mental health needs proactive attention. `
          : `The 12th lord ${house.lord} has moderate influence, suggesting average sleep health and the need for mindful rest practices. `;
      if (maleficOccupants.length > 0)
        interpretation += `${maleficOccupants.join(" and ")} in the 12th house can indicate hospitalization, sleep disorders, or expenditure on treatments. Meditation and relaxation practices are especially valuable. `;
      if (beneficOccupants.length > 0)
        interpretation += `${beneficOccupants.join(" and ")} in the 12th support spiritual healing, restful sleep, and recovery from illness. `;
    }

    return {
      house: num,
      title,
      rashi: house.rashi,
      lord: house.lord,
      lordPlacement: lordPos,
      lordStrength: lordStr,
      occupants,
      interpretation,
    };
  });
}

function buildVulnerableAreas(chart: ChartResponse): VulnerableArea[] {
  const areas: VulnerableArea[] = [];

  for (const house of chart.houses) {
    const bodyPart = RASHI_BODY_MAP[house.rashi];
    if (!bodyPart) continue;

    // Check for malefic occupants
    const malefics = house.occupants.filter(isMalefic);
    if (malefics.length > 0) {
      const severity: Strength = malefics.length >= 2 ? "strong" : "moderate";
      areas.push({
        bodyPart,
        house: house.house_num,
        rashi: house.rashi,
        reason: `${malefics.join(" and ")} occupy house ${house.house_num} (${house.rashi}), creating stress on the ${bodyPart}. ${malefics.includes("Saturn") ? "Saturn brings chronic or slow-developing conditions. " : ""}${malefics.includes("Mars") ? "Mars brings inflammation, heat, or surgical risk. " : ""}${malefics.includes("Rahu") ? "Rahu brings unusual or difficult-to-diagnose conditions. " : ""}${malefics.includes("Ketu") ? "Ketu brings mysterious or karmic health patterns. " : ""}`,
        severity,
      });
    }

    // Check if house lord is debilitated
    const lord = getPlanet(chart.planets, house.lord);
    if (lord && lord.dignity?.toLowerCase() === "debilitated") {
      areas.push({
        bodyPart,
        house: house.house_num,
        rashi: house.rashi,
        reason: `The lord of house ${house.house_num} (${house.lord}) is debilitated in ${lord.rashi}, weakening the ${bodyPart}. This can manifest as chronic weakness, recurring issues, or developmental concerns in this area.`,
        severity: "moderate",
      });
    }
  }

  // Sort by severity (strong first)
  const severityOrder: Record<Strength, number> = { strong: 0, moderate: 1, weak: 2 };
  areas.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return areas;
}

function buildDietaryRecommendations(
  dosha: DoshaConstitution,
  chart: ChartResponse
): DietaryRecommendations {
  const primary = dosha.primaryDosha;

  const doshaFoods: Record<Dosha, FoodRecommendation[]> = {
    Vata: [
      { food: "Warm, cooked grains like rice, oats, and wheat", action: "favor", reasoning: "Grounding, warm foods pacify Vata's cold, dry, and light qualities." },
      { food: "Root vegetables — sweet potatoes, beets, carrots", action: "favor", reasoning: "Earth-element root vegetables ground and nourish Vata dosha." },
      { food: "Ghee and warm milk with turmeric", action: "favor", reasoning: "Healthy fats lubricate Vata's dry channels and support joint health." },
      { food: "Soaked almonds and walnuts", action: "favor", reasoning: "Nuts provide grounding oils and nourishment to the nervous system, which Vata governs." },
      { food: "Raw salads and cold foods", action: "avoid", reasoning: "Cold, raw foods aggravate Vata's already cold and irregular digestion." },
      { food: "Dried fruits, crackers, and dry snacks", action: "avoid", reasoning: "Dry foods increase Vata's drying tendency, worsening constipation and skin dryness." },
    ],
    Pitta: [
      { food: "Cooling fruits — melons, grapes, coconut, pomegranate", action: "favor", reasoning: "Sweet, cooling fruits pacify Pitta's heat and reduce inflammation." },
      { food: "Leafy greens and bitter vegetables", action: "favor", reasoning: "Bitter taste is the most cooling and detoxifying for Pitta's fiery constitution." },
      { food: "Basmati rice and wheat", action: "favor", reasoning: "These cooling grains support Pitta without increasing internal heat." },
      { food: "Cow's milk, ghee, and coconut oil", action: "favor", reasoning: "Cooling fats soothe Pitta's digestive fire and reduce acidity." },
      { food: "Hot spices — chili, cayenne, raw garlic", action: "avoid", reasoning: "Heating spices aggravate Pitta's already strong digestive fire, causing acidity." },
      { food: "Fermented foods, alcohol, and vinegar", action: "avoid", reasoning: "Sour and fermented items increase heat and acidity in the body." },
    ],
    Kapha: [
      { food: "Light grains — barley, millet, buckwheat", action: "favor", reasoning: "Light, dry grains counter Kapha's heavy, moist qualities and support digestion." },
      { food: "Pungent and bitter vegetables — radishes, leafy greens, broccoli", action: "favor", reasoning: "These tastes stimulate Kapha's sluggish metabolism and clear congestion." },
      { food: "Legumes — mung beans, lentils, chickpeas", action: "favor", reasoning: "Protein-rich legumes provide energy without the heaviness that aggravates Kapha." },
      { food: "Honey (raw, unheated) in warm water", action: "favor", reasoning: "Honey is the only sweetener that reduces Kapha, helping to clear mucus and stagnation." },
      { food: "Heavy dairy — cheese, ice cream, cream", action: "avoid", reasoning: "Heavy, cold dairy increases Kapha's congestion, mucus, and sluggishness." },
      { food: "Sweet, oily, and fried foods", action: "avoid", reasoning: "These increase Kapha's heaviness and slow an already sluggish metabolism." },
    ],
  };

  // Add chart-specific food recommendations
  const moon = getPlanet(chart.planets, "Moon");
  const mars = getPlanet(chart.planets, "Mars");
  const foods = [...doshaFoods[primary]];

  if (moon && planetStrength(moon) === "weak") {
    foods.push({
      food: "Warm milk with ashwagandha before bed",
      action: "favor",
      reasoning: `Moon is ${moon.dignity || "weakened"} in ${moon.rashi}, indicating a need to nourish the mind and emotions. Warm milk with ashwagandha supports Moon's calming energy.`,
    });
  }

  if (mars && planetStrength(mars) === "weak") {
    foods.push({
      food: "Iron-rich foods — pomegranate, beetroot, spinach",
      action: "favor",
      reasoning: `Mars is ${mars.dignity || "weakened"} in ${mars.rashi}, suggesting the need for blood-building and iron-rich foods to support muscular and circulatory health.`,
    });
  }

  const mealTimings: Record<Dosha, string> = {
    Vata: "Eat at regular, consistent times — this is crucial for Vata. Have a warm breakfast by 8 AM, a substantial lunch (your largest meal) between 12-1 PM, and an early, light dinner by 6-7 PM. Never skip meals, as this severely aggravates Vata.",
    Pitta: "Lunch should be your largest meal, eaten between 12-1 PM when digestive fire is strongest. Have a moderate breakfast by 8 AM. Dinner should be lighter, by 7 PM. Never let yourself get overly hungry, as Pitta becomes irritable and acidic.",
    Kapha: "Eat a light breakfast or skip it if not hungry — Kapha does well with intermittent fasting. Lunch between 12-1 PM should be your main meal. Dinner should be light and early, by 6 PM. Avoid snacking between meals to keep metabolism active.",
  };

  const doshaSpices: Record<Dosha, DietaryRecommendations["spices"]> = {
    Vata: [
      { name: "Ginger (fresh)", benefit: "Kindles digestive fire and warms the body, countering Vata's cold quality" },
      { name: "Cumin", benefit: "Supports digestion and reduces gas and bloating common in Vata" },
      { name: "Cinnamon", benefit: "Warming and grounding, supports circulation and sweetens without sugar" },
      { name: "Asafoetida (Hing)", benefit: "Powerful anti-flatulent that specifically addresses Vata's gas tendency" },
      { name: "Fennel", benefit: "Gently warming and soothing to the digestive tract" },
    ],
    Pitta: [
      { name: "Coriander", benefit: "Cooling spice that reduces heat and supports liver function" },
      { name: "Fennel", benefit: "Sweet and cooling, soothes Pitta's digestive fire without extinguishing it" },
      { name: "Turmeric (small amounts)", benefit: "Anti-inflammatory in moderate doses, supports liver and skin" },
      { name: "Cardamom", benefit: "Cooling, digestive, and aromatic — balances Pitta's heat gently" },
      { name: "Mint", benefit: "Cooling and refreshing, supports digestion and reduces acidity" },
    ],
    Kapha: [
      { name: "Black pepper", benefit: "Strongly heating, stimulates Kapha's sluggish metabolism and burns toxins" },
      { name: "Ginger (dry)", benefit: "More heating than fresh ginger, excellent for Kapha's slow digestion" },
      { name: "Turmeric", benefit: "Detoxifying and anti-inflammatory, clears Kapha's congestion" },
      { name: "Mustard seeds", benefit: "Heating and stimulating, breaks up Kapha's stagnation" },
      { name: "Fenugreek", benefit: "Warming, reduces mucus, and supports metabolism" },
    ],
  };

  const generalGuidances: Record<Dosha, string> = {
    Vata: `As a ${primary}-dominant constitution with ${chart.lagna} lagna, your dietary focus should be on warm, moist, grounding, and nourishing foods. Favor sweet, sour, and salty tastes. Eat in a calm environment and chew thoroughly. Regularity in meal times is your most powerful dietary medicine.`,
    Pitta: `As a ${primary}-dominant constitution with ${chart.lagna} lagna, your dietary focus should be on cooling, moderately heavy, and slightly dry foods. Favor sweet, bitter, and astringent tastes. Avoid eating when angry or stressed. Your strong digestive fire is an asset — keep it balanced rather than overheated.`,
    Kapha: `As a ${primary}-dominant constitution with ${chart.lagna} lagna, your dietary focus should be on light, warm, dry, and stimulating foods. Favor pungent, bitter, and astringent tastes. Eat your smallest meal at dinner and embrace the principle of eating less than you think you need.`,
  };

  return {
    primaryDosha: primary,
    generalGuidance: generalGuidances[primary],
    foods,
    mealTiming: mealTimings[primary],
    spices: doshaSpices[primary],
  };
}

function buildYogaRecommendations(
  dosha: DoshaConstitution,
  chart: ChartResponse
): YogaExerciseRecommendations {
  const primary = dosha.primaryDosha;

  const doshaAsanas: Record<Dosha, YogaAsana[]> = {
    Vata: [
      { name: "Virabhadrasana (Warrior Pose)", description: "Standing pose with lunged front leg, arms raised overhead, building strength and stability.", reasoning: "Grounding and stabilizing, this pose builds the strength and rootedness that Vata's airy nature needs." },
      { name: "Paschimottanasana (Seated Forward Bend)", description: "Seated forward fold stretching the entire back body, calming the nervous system.", reasoning: "Calms the nervous system and soothes Vata anxiety. The forward fold compresses the abdomen, aiding Vata's irregular digestion." },
      { name: "Balasana (Child's Pose)", description: "Kneeling forward fold with arms extended or alongside body, deeply restorative.", reasoning: "Deeply grounding and calming for the Vata mind. Creates a sense of safety and withdrawal from overstimulation." },
      { name: "Supta Baddha Konasana (Reclined Bound Angle)", description: "Lying on back with soles of feet together, knees falling open, supported by bolsters.", reasoning: "Opens the hips and relaxes the nervous system. The reclined position is deeply restorative for depleted Vata energy." },
      { name: "Vrikshasana (Tree Pose)", description: "Standing balance pose with one foot on inner thigh, arms overhead like branches.", reasoning: "Builds focus and balance, counteracting Vata's scattered and restless tendencies." },
    ],
    Pitta: [
      { name: "Ardha Chandrasana (Half Moon Pose)", description: "Standing balance with torso parallel to ground, top arm and leg extended.", reasoning: "Cooling lunar energy balances Pitta's solar intensity. Opens the chest and promotes calm focus." },
      { name: "Ustrasana (Camel Pose)", description: "Kneeling backbend with hands reaching toward heels, opening the entire front body.", reasoning: "Opens the chest and heart center, releasing stored Pitta intensity and anger. The throat opening supports healthy thyroid function." },
      { name: "Supta Matsyendrasana (Supine Twist)", description: "Lying twist with knees falling to one side, detoxifying and cooling.", reasoning: "Wrings out heat and toxins from the digestive organs. Massages the liver — a key Pitta organ — and calms the mind." },
      { name: "Viparita Karani (Legs Up the Wall)", description: "Lying with legs resting vertically up a wall, deeply cooling and restorative.", reasoning: "Cooling inversion that drains excess heat from the legs and soothes the nervous system. Excellent for Pitta's tendency toward overwork." },
      { name: "Shavasana (Corpse Pose) — extended", description: "Lying flat with full body relaxation for 10-15 minutes.", reasoning: "Pitta types often rush through Shavasana. Extended practice teaches surrender and cools the competitive drive." },
    ],
    Kapha: [
      { name: "Surya Namaskar (Sun Salutation)", description: "Dynamic flowing sequence of 12 poses linked with breath, building heat and stamina.", reasoning: "Vigorous and heating, Sun Salutations counter Kapha's lethargy and sluggishness. The rhythmic flow stimulates metabolism." },
      { name: "Ustrasana (Camel Pose)", description: "Kneeling backbend opening the chest and lungs, energizing the heart center.", reasoning: "Opens the chest and lungs, combating Kapha's tendency toward congestion and heaviness in the upper body." },
      { name: "Navasana (Boat Pose)", description: "Core-strengthening balance on sitting bones with legs and torso lifted in V-shape.", reasoning: "Intensely stimulating for the abdominal fire (agni), which Kapha needs to keep active. Builds core strength and metabolic heat." },
      { name: "Bhujangasana (Cobra Pose)", description: "Prone backbend lifting chest with arms, expanding the lungs and stimulating digestion.", reasoning: "Opens the lungs and chest, clearing Kapha congestion. Stimulates the kidneys and adrenals for energy." },
      { name: "Simhasana (Lion Pose)", description: "Seated pose with tongue extended, roaring exhale, releasing tension from face and throat.", reasoning: "Clears stagnation in the throat and face — common Kapha areas. The forceful exhale stimulates energy and clears lethargy." },
    ],
  };

  const doshaPranayama: Record<Dosha, YogaExerciseRecommendations["pranayama"]> = {
    Vata: [
      { name: "Nadi Shodhana (Alternate Nostril Breathing)", description: "Alternating breath through left and right nostrils with finger control, 5-10 minutes.", reasoning: "Balances the nervous system and calms Vata's restless mind. Creates equilibrium between solar and lunar energies." },
      { name: "Ujjayi (Ocean Breath)", description: "Gentle constriction at the back of the throat creating an audible oceanic sound on each breath.", reasoning: "The steady, rhythmic sound grounds Vata's scattered attention and warms the breath, countering Vata's cold quality." },
    ],
    Pitta: [
      { name: "Sheetali (Cooling Breath)", description: "Inhale through curled tongue, exhale through nose, 5-10 minutes.", reasoning: "Directly cools the body and blood, reducing Pitta's excess heat. Soothes inflammation and calms the mind." },
      { name: "Chandra Bhedana (Left Nostril Breathing)", description: "Inhale through left nostril only, exhale through right, 5-10 minutes.", reasoning: "Activates the cooling lunar channel (Ida nadi), directly pacifying Pitta's solar heat and intensity." },
    ],
    Kapha: [
      { name: "Kapalabhati (Skull-Shining Breath)", description: "Rapid, forceful exhales with passive inhales, 3 rounds of 30-50 breaths.", reasoning: "Powerfully stimulating and heating, breaks up Kapha's stagnation and congestion. Energizes the mind and clears sinus passages." },
      { name: "Bhastrika (Bellows Breath)", description: "Equal forceful inhales and exhales, pumping the diaphragm vigorously, 2-3 rounds.", reasoning: "Generates intense internal heat and stimulates metabolism. Clears the lethargy and heaviness characteristic of Kapha." },
    ],
  };

  const exerciseTypes: Record<Dosha, { type: string; intensity: string }> = {
    Vata: {
      type: "Gentle, grounding exercises: yoga, walking, swimming, tai chi, light dance. Avoid high-impact or excessively vigorous activities that deplete Vata.",
      intensity: "Low to moderate intensity with consistency. Short sessions (30-45 minutes) are better than long exhausting ones. Focus on gentle, rhythmic movements.",
    },
    Pitta: {
      type: "Moderate, cooling exercises: swimming, hiking, cycling, yoga, team sports (without excessive competition). Water sports are especially beneficial.",
      intensity: "Moderate intensity — enough to challenge but not overheat. Avoid exercising in midday heat. 45-60 minute sessions with adequate cooling down.",
    },
    Kapha: {
      type: "Vigorous, stimulating exercises: running, aerobics, HIIT, vigorous yoga, dancing, hiking, martial arts. Challenge yourself physically.",
      intensity: "High intensity is ideal for Kapha. Push beyond your comfort zone. Aim for 45-60 minutes of sweat-inducing activity. Morning exercise is essential to counter sluggishness.",
    },
  };

  const bestTimes: Record<Dosha, string> = {
    Vata: "Late morning (9-11 AM) when the body is warmed and nourished. Vata should avoid early morning exercise on an empty stomach as it can deplete energy. A gentle evening walk is also beneficial for sleep.",
    Pitta: "Early morning (6-8 AM) before the heat of the day builds, or early evening (5-7 PM) after the sun's intensity has faded. Avoid midday exercise when Pitta peaks.",
    Kapha: "Early morning (6-7 AM) during Kapha time is ideal — this is when exercise can best combat the natural heaviness and sluggishness. Do not exercise after sunset as it may disrupt Kapha sleep.",
  };

  // Add chart-specific asana if Saturn afflicts joints
  const saturn = getPlanet(chart.planets, "Saturn");
  const asanas = [...doshaAsanas[primary]];
  if (saturn && planetStrength(saturn) === "weak") {
    asanas.push({
      name: "Pawanmuktasana Series (Joint Freeing)",
      description: "Systematic rotation of all joints from toes to neck, gentle and accessible.",
      reasoning: `Saturn is ${saturn.dignity || "weakened"} in ${saturn.rashi}, indicating joint vulnerability. This series specifically lubricates and strengthens all joints, countering Saturn's restricting influence.`,
    });
  }

  return {
    exerciseType: exerciseTypes[primary].type,
    intensity: exerciseTypes[primary].intensity,
    asanas,
    pranayama: doshaPranayama[primary],
    bestTimeOfDay: bestTimes[primary],
  };
}

function buildLifestyleRecommendations(
  dosha: DoshaConstitution,
  chart: ChartResponse
): LifestyleRecommendations {
  const primary = dosha.primaryDosha;

  const sleepSchedules: Record<Dosha, string> = {
    Vata: "Aim to be in bed by 10 PM and wake by 6-6:30 AM. Vata needs 7-8 hours of sleep. A warm bath with sesame oil before bed, warm milk with nutmeg, and a consistent sleep routine are essential. Avoid screens for 1 hour before sleep. Keep the bedroom warm and quiet.",
    Pitta: "Aim to be in bed by 10:30 PM and wake by 6 AM. Pitta needs 7 hours of sleep. Keep the bedroom cool and dark. A cooling foot massage with coconut oil before sleep helps. Avoid stimulating or competitive activities in the evening.",
    Kapha: "Aim to be in bed by 10 PM and wake by 5:30-6 AM — early rising is critical for Kapha. Avoid oversleeping (no more than 7 hours). Do not nap during the day. A brisk morning walk immediately after waking helps clear Kapha's heaviness.",
  };

  const seasonalAdvices: Record<Dosha, LifestyleRecommendations["seasonalAdvice"]> = {
    Vata: [
      { season: "Autumn/Early Winter (Vata season)", advice: "Your most vulnerable season. Increase warm foods, oil massage (Abhyanga with sesame oil), and reduce travel and stimulation. Stay warm and follow a strict routine." },
      { season: "Late Winter/Spring", advice: "A more balanced time for Vata. Continue warm routines but can gradually lighten diet as spring arrives." },
      { season: "Summer", advice: "Generally favorable for Vata as the warmth is soothing. Avoid air conditioning extremes and cold drinks. Enjoy moderate sun exposure." },
      { season: "Monsoon/Rainy Season", advice: "Dampness can aggravate Vata's joint issues. Keep warm and dry, favor warm spiced soups, and protect joints from cold dampness." },
    ],
    Pitta: [
      { season: "Summer (Pitta season)", advice: "Your most vulnerable season. Avoid excessive sun, hot spices, and overwork. Favor cooling foods, swimming, moonlight walks, and coconut oil massage." },
      { season: "Autumn", advice: "Residual Pitta heat needs to be released. Gentle detoxification with bitter herbs and cooling foods is beneficial." },
      { season: "Winter", advice: "A balancing time for Pitta. Can enjoy slightly heavier and warmer foods. Good time for building strength." },
      { season: "Spring", advice: "Mild and pleasant for Pitta. Moderate activity and fresh greens are ideal." },
    ],
    Kapha: [
      { season: "Late Winter/Spring (Kapha season)", advice: "Your most vulnerable season. Accumulated Kapha melts, causing congestion, allergies, and lethargy. Increase pungent and bitter foods, vigorous exercise, and dry massage (Garshana)." },
      { season: "Summer", advice: "Generally favorable for Kapha as heat stimulates metabolism. Take advantage to be more active and lighter in diet." },
      { season: "Autumn", advice: "A good period for Kapha. Moderate diet and activity. Prepare for winter by building healthy routines." },
      { season: "Early Winter", advice: "Cold and damp conditions increase Kapha. Stay warm, eat warm spiced foods, and maintain vigorous exercise despite the temptation to hibernate." },
    ],
  };

  const stressApproaches: Record<Dosha, string> = {
    Vata: `With your ${chart.lagna} lagna and Vata-dominant constitution, stress manifests as anxiety, racing thoughts, insomnia, and nervous exhaustion. Your stress management should focus on grounding: daily Abhyanga (warm sesame oil massage), meditation with mantra repetition, spending time in nature, warm baths, and maintaining a rigid daily routine. Avoid overstimulation from news, social media, and loud environments. Gentle music and aromatherapy with sandalwood or lavender are deeply soothing.`,
    Pitta: `With your ${chart.lagna} lagna and Pitta-dominant constitution, stress manifests as anger, irritability, perfectionism, and inflammatory conditions. Your stress management should focus on cooling: moonlight walks, swimming, time near water, non-competitive hobbies, and learning to delegate. Avoid overwork, heated arguments, and excessive screen time. Meditation focused on compassion and forgiveness is powerful. Aromatherapy with rose, sandalwood, or jasmine cools Pitta intensity.`,
    Kapha: `With your ${chart.lagna} lagna and Kapha-dominant constitution, stress manifests as withdrawal, depression, emotional eating, excessive sleep, and stagnation. Your stress management should focus on stimulation and movement: vigorous exercise, new experiences, social engagement, and travel. Avoid isolation and comfort-eating patterns. Dynamic meditation, energizing music, and aromatherapy with eucalyptus, camphor, or rosemary break through Kapha's heaviness.`,
  };

  const dailyRoutines: Record<Dosha, LifestyleRecommendations["dailyRoutine"]> = {
    Vata: [
      { time: "6:00 AM", activity: "Wake up. Scrape tongue, brush teeth, drink warm water with lemon." },
      { time: "6:15 AM", activity: "Abhyanga — warm sesame oil self-massage for 15 minutes." },
      { time: "6:45 AM", activity: "Gentle yoga and pranayama (Nadi Shodhana) for 20-30 minutes." },
      { time: "7:30 AM", activity: "Warm, nourishing breakfast — oatmeal with ghee, cinnamon, and nuts." },
      { time: "12:00 PM", activity: "Largest meal of the day. Warm, cooked, well-spiced food. Eat in a calm setting." },
      { time: "3:00 PM", activity: "Light warm snack if needed — warm milk or soaked almonds." },
      { time: "6:00 PM", activity: "Light, warm dinner — soup, kitchari, or stewed vegetables." },
      { time: "7:00 PM", activity: "Gentle walk. Avoid stimulating activities." },
      { time: "9:00 PM", activity: "Warm milk with nutmeg. Calming reading or journaling." },
      { time: "10:00 PM", activity: "Lights out. Consistent sleep time is essential for Vata." },
    ],
    Pitta: [
      { time: "6:00 AM", activity: "Wake up. Scrape tongue, brush teeth, drink room-temperature water." },
      { time: "6:15 AM", activity: "Coconut oil self-massage or dry brushing." },
      { time: "6:30 AM", activity: "Moderate yoga and cooling pranayama (Sheetali) for 30-45 minutes." },
      { time: "7:30 AM", activity: "Moderate breakfast — fruit, toast with ghee, or cool cereal with milk." },
      { time: "12:00 PM", activity: "Largest meal. Include cooling foods, fresh salads, and sweet fruits." },
      { time: "3:00 PM", activity: "Sweet fruit or coconut water if needed." },
      { time: "6:30 PM", activity: "Moderate dinner — balanced meal, not too spicy." },
      { time: "7:30 PM", activity: "Leisure time — non-competitive activities, time in nature, moonlight walk." },
      { time: "9:30 PM", activity: "Cool foot massage with coconut oil. Light reading." },
      { time: "10:30 PM", activity: "Lights out. Keep bedroom cool and dark." },
    ],
    Kapha: [
      { time: "5:30 AM", activity: "Wake up early — this is critical for Kapha. Tongue scraping, warm water with honey and lemon." },
      { time: "5:45 AM", activity: "Dry massage (Garshana) with silk gloves to stimulate circulation." },
      { time: "6:00 AM", activity: "Vigorous exercise — running, Sun Salutations, or brisk walking for 30-45 minutes." },
      { time: "7:00 AM", activity: "Light breakfast only if hungry — warm spiced tea, light toast, or fruit. Skipping is fine." },
      { time: "12:00 PM", activity: "Main meal — well-spiced, light grains, vegetables, legumes. Avoid heavy foods." },
      { time: "3:00 PM", activity: "No snacking. Herbal tea (ginger or cinnamon) if needed." },
      { time: "6:00 PM", activity: "Very light dinner — soup or steamed vegetables. Eat early." },
      { time: "7:00 PM", activity: "Stimulating activity — hobby, socializing, learning something new." },
      { time: "9:00 PM", activity: "Brief walk. Avoid TV or screen-induced lethargy." },
      { time: "10:00 PM", activity: "Lights out. No oversleeping — set a firm alarm." },
    ],
  };

  return {
    sleepSchedule: sleepSchedules[primary],
    seasonalAdvice: seasonalAdvices[primary],
    stressManagement: stressApproaches[primary],
    dailyRoutine: dailyRoutines[primary],
  };
}

function buildHealthPeriodTimeline(chart: ChartResponse): HealthPeriod[] {
  const periods: HealthPeriod[] = [];

  // Identify lords of 6th, 8th, 12th houses (health-cautious periods)
  const house6 = getHouse(chart.houses, 6);
  const house8 = getHouse(chart.houses, 8);
  const house12 = getHouse(chart.houses, 12);
  const house1 = getHouse(chart.houses, 1);

  const cautiousLords = new Set<string>();
  if (house6) cautiousLords.add(house6.lord);
  if (house8) cautiousLords.add(house8.lord);
  if (house12) cautiousLords.add(house12.lord);

  const favorableLords = new Set<string>();
  if (house1) favorableLords.add(house1.lord);
  favorableLords.add("Jupiter"); // Jupiter is natural benefic for health

  // Find the current dasha index
  const currentDashaLord = chart.current_dasha?.planet;
  let startIdx = 0;
  for (let i = 0; i < chart.dasha_sequence.length; i++) {
    if (chart.dasha_sequence[i].planet === currentDashaLord) {
      startIdx = i;
      break;
    }
  }

  // Process current + next 2-3 dashas
  const endIdx = Math.min(startIdx + 4, chart.dasha_sequence.length);
  for (let i = startIdx; i < endIdx; i++) {
    const dasha = chart.dasha_sequence[i];
    const isCurrent = dasha.planet === currentDashaLord;

    const dashaP = getPlanet(chart.planets, dasha.planet);
    const strength = dashaP ? planetStrength(dashaP) : "moderate";

    let type: HealthPeriod["type"] = "neutral";
    if (cautiousLords.has(dasha.planet)) {
      type = "cautious";
    } else if (favorableLords.has(dasha.planet) && strength !== "weak") {
      type = "favorable";
    }

    let interp = "";
    const lordOfHouses: string[] = [];
    if (house6 && house6.lord === dasha.planet) lordOfHouses.push("6th (disease)");
    if (house8 && house8.lord === dasha.planet) lordOfHouses.push("8th (chronic illness/longevity)");
    if (house12 && house12.lord === dasha.planet) lordOfHouses.push("12th (hospitalization/loss)");
    if (house1 && house1.lord === dasha.planet) lordOfHouses.push("1st (body/vitality)");

    if (type === "cautious") {
      interp = `${dasha.planet} Mahadasha (${dasha.start_date} to ${dasha.end_date}) is a health-cautious period as ${dasha.planet} lords the ${lordOfHouses.join(" and ")} house${lordOfHouses.length > 1 ? "s" : ""}. `;
      interp += dashaP
        ? `${dasha.planet} is placed in ${dashaP.rashi} (house ${dashaP.house})${dashaP.dignity ? `, ${dashaP.dignity}` : ""}. `
        : "";
      interp += strength === "weak"
        ? "Extra caution is advised as the dasha lord is weakened. Focus on preventive care, regular check-ups, and strengthening immunity."
        : strength === "strong"
          ? "Though this is a dusthana lord dasha, the lord's strength provides resilience. Maintain healthy habits to navigate this period well."
          : "Maintain consistent health practices and be attentive to early warning signs during this period.";
    } else if (type === "favorable") {
      interp = `${dasha.planet} Mahadasha (${dasha.start_date} to ${dasha.end_date}) is health-favorable. `;
      if (dasha.planet === "Jupiter")
        interp += "Jupiter's natural benefic energy supports healing, growth, and overall well-being. A good period for health improvements and establishing positive routines. ";
      if (house1 && house1.lord === dasha.planet)
        interp += `As the lagna lord, ${dasha.planet} dasha directly supports physical vitality and constitutional strength. `;
      interp += dashaP
        ? `${dasha.planet} is ${dashaP.dignity || "placed"} in ${dashaP.rashi} (house ${dashaP.house}), supporting this positive health period.`
        : "";
    } else {
      interp = `${dasha.planet} Mahadasha (${dasha.start_date} to ${dasha.end_date}) is a neutral period for health. Maintain balanced routines and regular health practices. `;
      interp += dashaP
        ? `${dasha.planet} in ${dashaP.rashi} (house ${dashaP.house}) does not strongly activate health houses but general wellness awareness is always recommended.`
        : "";
    }

    // Antardasha info for current period
    let antardashaInfo: string | undefined;
    let antardashaInterp: string | undefined;

    if (isCurrent && chart.current_antardasha) {
      antardashaInfo = chart.current_antardasha.planet;
      const antP = getPlanet(chart.planets, chart.current_antardasha.planet);
      const antCautious = cautiousLords.has(chart.current_antardasha.planet);
      antardashaInterp = `Current sub-period: ${chart.current_antardasha.planet} antardasha (${chart.current_antardasha.start_date} to ${chart.current_antardasha.end_date}). `;
      if (antCautious) {
        antardashaInterp += `${chart.current_antardasha.planet} is a dusthana lord, so this sub-period requires extra health vigilance. `;
      }
      if (antP) {
        antardashaInterp += `${chart.current_antardasha.planet} is in ${antP.rashi} (house ${antP.house})${antP.dignity ? `, ${antP.dignity}` : ""}.`;
      }
    }

    periods.push({
      dashaLord: dasha.planet,
      startDate: dasha.start_date,
      endDate: dasha.end_date,
      type,
      isCurrent,
      interpretation: interp,
      antardasha: antardashaInfo,
      antardashaInterpretation: antardashaInterp,
    });
  }

  return periods;
}

function buildRemedies(
  dosha: DoshaConstitution,
  chart: ChartResponse,
  healthPlanets: HealthPlanetEntry[]
): Remedy[] {
  const remedies: Remedy[] = [];
  const primary = dosha.primaryDosha;

  // Gemstone recommendations for weak but beneficial planets
  const lagnaLord = getHouse(chart.houses, 1)?.lord;
  const beneficPlanets = ["Jupiter", "Venus", "Mercury", "Moon"];
  const trikoneLords = [1, 5, 9].map((h) => getHouse(chart.houses, h)?.lord).filter(Boolean) as string[];

  for (const entry of healthPlanets) {
    const isBeneficialLord =
      entry.planet === lagnaLord ||
      trikoneLords.includes(entry.planet) ||
      beneficPlanets.includes(entry.planet);

    if (entry.strength === "weak" && isBeneficialLord && PLANET_GEMSTONES[entry.planet]) {
      const gem = PLANET_GEMSTONES[entry.planet];
      remedies.push({
        category: "gemstone",
        title: gem.gem,
        description: `Wear on the ${gem.finger} in gold or silver setting. Energize on the appropriate day with mantras before wearing.`,
        reasoning: `${entry.planet} is ${entry.dignity || "weak"} in ${entry.rashi} and is a beneficial planet for your ${chart.lagna} lagna. Strengthening ${entry.planet} through its gemstone supports ${entry.bodyAreas}.`,
      });
    }
  }

  // Mantra recommendations
  for (const entry of healthPlanets) {
    if (entry.strength === "weak" && PLANET_MANTRAS[entry.planet]) {
      remedies.push({
        category: "mantra",
        title: `${entry.planet} Mantra: ${PLANET_MANTRAS[entry.planet]}`,
        description: `Chant this mantra during ${entry.planet}'s hora or on the designated day. Begin during a waxing Moon phase for best results.`,
        reasoning: `${entry.planet} is weakened in your chart, affecting ${entry.bodyAreas}. Regular mantra practice is a sattvic remedy that strengthens planetary energy without side effects.`,
      });
    }
  }

  // Dosha-based lifestyle remedies
  const doshaLifestyle: Record<Dosha, Remedy[]> = {
    Vata: [
      {
        category: "lifestyle",
        title: "Daily Abhyanga (Self-Oil Massage)",
        description: "Apply warm sesame oil to the entire body before bathing, massaging in circular motions on joints and long strokes on limbs. Allow 15-20 minutes.",
        reasoning: "Sesame oil is warming and grounding, directly pacifying Vata's cold, dry, and mobile qualities. This is the single most powerful daily practice for Vata balance.",
      },
      {
        category: "lifestyle",
        title: "Establish Unshakable Daily Routine",
        description: "Eat, sleep, exercise, and work at the same times every day. Consistency is medicine for Vata.",
        reasoning: "Vata is characterized by irregularity. A fixed routine is the most fundamental remedy, providing the structure that balances Vata's erratic nature.",
      },
    ],
    Pitta: [
      {
        category: "lifestyle",
        title: "Moonlight and Water Therapy",
        description: "Spend time near water bodies and in moonlight. Swim regularly. Apply cooling rose water to the eyes and forehead.",
        reasoning: "Water and lunar energy directly cool Pitta's fiery nature. This simple practice reduces inflammation, calms the mind, and soothes the eyes and skin.",
      },
      {
        category: "lifestyle",
        title: "Scheduled Non-Competitive Leisure",
        description: "Block time daily for activities without goals or competition — gardening, art, music, or nature walks.",
        reasoning: "Pitta's driven nature needs regular release from achievement orientation. Non-competitive leisure prevents burnout and cools emotional intensity.",
      },
    ],
    Kapha: [
      {
        category: "lifestyle",
        title: "Dry Brushing (Garshana) Before Bath",
        description: "Use raw silk gloves or a dry brush to vigorously stimulate the skin before bathing. Brush toward the heart.",
        reasoning: "Dry brushing stimulates circulation and lymph flow, directly countering Kapha's tendency toward fluid stagnation and sluggish circulation.",
      },
      {
        category: "lifestyle",
        title: "Regular Fasting and Lightening Practices",
        description: "Fast one day per week (liquid fast with warm water, herbal tea, and honey). Practice occasional weekend kitchari cleanses.",
        reasoning: "Kapha accumulates easily. Regular lightening through fasting stimulates agni (digestive fire) and prevents the buildup of ama (toxins) that Kapha is prone to.",
      },
    ],
  };

  remedies.push(...doshaLifestyle[primary]);

  // Ayurvedic herb suggestions based on dosha
  const doshaHerbs: Record<Dosha, Remedy[]> = {
    Vata: [
      {
        category: "herb",
        title: "Ashwagandha (Withania somnifera)",
        description: "Take 1/2 teaspoon powder with warm milk before bed, or as standardized extract (300-600mg daily).",
        reasoning: "Ashwagandha is the premier Vata-pacifying adaptogen. It nourishes the nervous system, supports sleep, builds strength, and grounds anxious Vata energy.",
      },
      {
        category: "herb",
        title: "Shatavari (Asparagus racemosus)",
        description: "Take 1/2 teaspoon with warm milk or as directed by an Ayurvedic practitioner.",
        reasoning: "Shatavari is cooling, nourishing, and moistening — ideal for Vata's dry quality. Supports reproductive health, digestion, and hormonal balance.",
      },
    ],
    Pitta: [
      {
        category: "herb",
        title: "Amalaki (Emblica officinalis / Indian Gooseberry)",
        description: "Take 1/2 teaspoon powder with cool water or as Chyawanprash. Rich in natural vitamin C.",
        reasoning: "Amalaki is the best Pitta-cooling rejuvenative. It reduces heat, supports liver function, improves digestion without aggravating fire, and nourishes all tissues.",
      },
      {
        category: "herb",
        title: "Brahmi (Bacopa monnieri)",
        description: "Take as directed — typically 300mg standardized extract or 1/2 teaspoon powder with ghee.",
        reasoning: "Brahmi is cooling and calming, ideal for Pitta's intense mind. Supports cognitive function, reduces inflammatory stress, and promotes healthy sleep.",
      },
    ],
    Kapha: [
      {
        category: "herb",
        title: "Trikatu (Three Pungents — Ginger, Black Pepper, Long Pepper)",
        description: "Take 1/4 teaspoon with honey before meals, or as tablets (1-2 before each meal).",
        reasoning: "Trikatu is the most powerful Kapha-reducing formula. It ignites digestive fire, clears congestion, stimulates metabolism, and burns accumulated toxins.",
      },
      {
        category: "herb",
        title: "Guggulu (Commiphora mukul)",
        description: "Take as standardized extract (guggulsterones 25mg, 2-3 times daily) or as directed by practitioner.",
        reasoning: "Guggulu is warming, scraping, and detoxifying — it reduces Kapha's excess lipids, supports healthy cholesterol, and clears stagnation from joints and channels.",
      },
    ],
  };

  remedies.push(...doshaHerbs[primary]);

  return remedies;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateAyurvedicReport(chart: ChartResponse): AyurvedicReport {
  const doshaConstitution = buildDoshaConstitution(chart);
  const bodyTypeProfile = buildBodyTypeProfile(doshaConstitution);
  const healthPlanetAnalysis = buildHealthPlanetAnalysis(chart);
  const houseHealthAnalysis = buildHouseHealthAnalysis(chart);
  const vulnerableAreas = buildVulnerableAreas(chart);
  const dietaryRecommendations = buildDietaryRecommendations(doshaConstitution, chart);
  const yogaExerciseRecommendations = buildYogaRecommendations(doshaConstitution, chart);
  const lifestyleRecommendations = buildLifestyleRecommendations(doshaConstitution, chart);
  const healthPeriodTimeline = buildHealthPeriodTimeline(chart);
  const remedies = buildRemedies(doshaConstitution, chart, healthPlanetAnalysis);

  return {
    doshaConstitution,
    bodyTypeProfile,
    healthPlanetAnalysis,
    houseHealthAnalysis,
    vulnerableAreas,
    dietaryRecommendations,
    yogaExerciseRecommendations,
    lifestyleRecommendations,
    healthPeriodTimeline,
    remedies,
  };
}
