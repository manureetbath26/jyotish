"""
Vedic astrology relationship prediction.

Analyzes the 7th house, 7th lord, Venus, Darakaraka, Rahu, and Mangal Dosha
to predict the number of significant relationships and generate soulmate traits
for an AI portrait prompt.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Dual signs (Gemini=3, Virgo=6, Sagittarius=9, Pisces=12) — more restless in love
DUAL_SIGNS = {3, 6, 9, 12}

# 7th house sign → partner's physical appearance traits
SEVENTH_SIGN_APPEARANCE: Dict[str, str] = {
    "Aries":       "athletic build, sharp angular features, strong eyebrows, energetic and dynamic look",
    "Taurus":      "well-built sturdy frame, beautiful sensual eyes, soft pleasant features, attractive and warm",
    "Gemini":      "slender youthful build, quick bright eyes, animated expressive face, lively appearance",
    "Cancer":      "round soft face, large nurturing eyes, gentle features, fair or moon-like complexion",
    "Leo":         "regal commanding presence, thick lustrous hair, bright confident eyes, strong dignified features",
    "Virgo":       "refined delicate features, intelligent analytical eyes, neat well-groomed appearance",
    "Libra":       "symmetrical beautiful face, charming graceful smile, balanced attractive features, elegant",
    "Scorpio":     "intense penetrating eyes, strong magnetic features, mysterious captivating aura",
    "Sagittarius": "tall athletic build, bright optimistic eyes, open friendly face, sporty adventurous look",
    "Capricorn":   "structured mature features, strong bone structure, serious reliable look, dignified",
    "Aquarius":    "unique unconventional features, bright intellectual eyes, distinctive individualistic appearance",
    "Pisces":      "dreamy soft eyes, gentle romantic features, otherworldly ethereal quality, soulful gaze",
}

# Darakaraka planet → spouse personality traits
DARAKARAKA_TRAITS: Dict[str, str] = {
    "Sun":     "confident, natural leader, proud and dignified, strong principles, inspiring presence",
    "Moon":    "nurturing, emotionally sensitive, deeply intuitive, caring and protective, empathetic",
    "Mars":    "passionate, energetic, assertive, courageous, direct and action-oriented",
    "Mercury": "intelligent, witty, communicative, curious, adaptable and mentally agile",
    "Jupiter": "wise, generous, philosophical, optimistic, spiritual and growth-oriented",
    "Venus":   "artistic, loving, romantic, harmonious, pleasure-seeking and deeply affectionate",
    "Saturn":  "disciplined, serious, hardworking, deeply loyal, patient and long-suffering in love",
}

# Sign element for image mood
_ELEMENT: Dict[str, str] = {
    "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
    "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
    "Gemini": "air", "Libra": "air", "Aquarius": "air",
    "Cancer": "water", "Scorpio": "water", "Pisces": "water",
}

_ELEMENT_MOOD: Dict[str, str] = {
    "fire":  "warm golden hour sunlight, vibrant energetic atmosphere, rich warm tones",
    "earth": "soft natural daylight, grounded earthy tones, serene outdoor setting",
    "air":   "bright airy light, open blue sky, fresh breezy atmosphere",
    "water": "soft diffused light, dreamy ethereal atmosphere, cool silver tones",
}


def _planet(planets: List[Dict], name: str) -> Optional[Dict]:
    for p in planets:
        if p["name"] == name:
            return p
    return None


def _house(houses: List[Dict], num: int) -> Optional[Dict]:
    for h in houses:
        if h["house_num"] == num:
            return h
    return None


def _estimate_marriage_age(
    chart_data: Dict[str, Any],
    planets: List[Dict],
    houses: List[Dict],
    lord_7: str,
    lord_dignity: Optional[str],
    lord_house: int,
    venus_dignity: Optional[str],
    rahu_in_7: bool,
) -> Dict[str, Any]:
    """Estimate marriage age using 7th house factors + Vimshottari Dasha timing."""

    # ── Base age from 7th house sign element ──────────────────────────────────
    h7 = _house(houses, 7)
    sign_7_num = h7["rashi_num"] if h7 else 7

    # Air/Fire signs → earlier; Earth/Water → moderate to late
    if sign_7_num in (1, 5, 9):   # Fire
        base = 25
    elif sign_7_num in (3, 7, 11): # Air
        base = 24
    elif sign_7_num in (2, 6, 10): # Earth
        base = 28
    else:                          # Water (4, 8, 12)
        base = 27

    timing_factors: List[str] = []

    # ── Dignity adjustments ────────────────────────────────────────────────────
    if lord_dignity == "exalted":
        base -= 2
        timing_factors.append(f"7th lord {lord_7} exalted — strong partnership drive, favours earlier union")
    elif lord_dignity in ("own", "moolatrikona"):
        base -= 1
        timing_factors.append(f"7th lord {lord_7} in own/moolatrikona sign — timely, committed marriage")
    elif lord_dignity == "debilitated":
        base += 4
        timing_factors.append(f"7th lord {lord_7} debilitated — delays and obstacles push marriage later")

    if venus_dignity == "exalted":
        base -= 2
        timing_factors.append("Venus exalted — natural magnetism, relationships come early")
    elif venus_dignity in ("own", "moolatrikona"):
        base -= 1
        timing_factors.append("Venus strong — harmonious relationships, supports timely marriage")
    elif venus_dignity == "debilitated":
        base += 3
        timing_factors.append("Venus debilitated — relationship lessons delay commitment")

    # ── Saturn influence ───────────────────────────────────────────────────────
    saturn = _planet(planets, "Saturn")
    sat_house = saturn["house"] if saturn else 0
    # Saturn aspects 3rd, 7th, 10th from its position
    sat_aspects_7 = sat_house in (1, 4, 7)  # These houses aspect the 7th
    if sat_house == 7:
        base += 4
        timing_factors.append("Saturn in the 7th house — classic indicator of delayed but durable marriage")
    elif sat_aspects_7:
        base += 3
        timing_factors.append(f"Saturn (house {sat_house}) aspects the 7th — marriage delayed but more enduring")

    # ── Rahu ──────────────────────────────────────────────────────────────────
    if rahu_in_7:
        base += 2
        timing_factors.append("Rahu in 7th — unconventional or delayed timing; may marry outside expected norms")

    # ── 7th lord in dusthana ──────────────────────────────────────────────────
    if lord_house in (6, 8, 12):
        base += 2
        timing_factors.append(f"7th lord in house {lord_house} — karmic delays or separations before final union")

    # ── Dasha-based refinement ─────────────────────────────────────────────────
    dasha_period_note: Optional[str] = None
    dasha_sequence: List[Dict] = chart_data.get("dasha_sequence", [])
    birth_date_str: str = chart_data.get("date", "")

    if dasha_sequence and birth_date_str:
        try:
            birth_dt = datetime.strptime(birth_date_str, "%Y-%m-%d")
            # Planets that trigger marriage in Vedic tradition
            marriage_planets = {lord_7, "Venus", "Jupiter", "Moon"}

            # Collect dashas of marriage-triggering planets that overlap age 18–45
            candidates: List[Tuple[str, int, int]] = []
            for dasha in dasha_sequence:
                if dasha["planet"] not in marriage_planets:
                    continue
                d_start = datetime.strptime(dasha["start_date"], "%Y-%m-%d")
                d_end   = datetime.strptime(dasha["end_date"],   "%Y-%m-%d")
                age_s = (d_start - birth_dt).days / 365.25
                age_e = (d_end   - birth_dt).days / 365.25
                if age_e < 18 or age_s > 45:
                    continue
                candidates.append((dasha["planet"], int(max(18, age_s)), int(min(45, age_e))))

            if candidates:
                # Pick the candidate whose midpoint is closest to our base estimate
                best = min(candidates, key=lambda c: abs((c[1] + c[2]) / 2 - base))
                planet_name, age_lo, age_hi = best
                # Snap base into this window if close
                if age_lo <= base <= age_hi:
                    pass  # already inside
                else:
                    base = round((age_lo + age_hi) / 2)
                dasha_period_note = f"{planet_name} Dasha (age {age_lo}–{age_hi})"
                timing_factors.append(
                    f"Vimshottari Dasha of {planet_name} runs ages {age_lo}–{age_hi} — "
                    f"a prime window for marriage activation"
                )
        except Exception:
            pass

    base = max(20, min(45, base))
    age_range = f"{max(18, base - 2)}–{base + 3}"

    return {
        "estimated_marriage_age": base,
        "marriage_age_range": age_range,
        "marriage_dasha_period": dasha_period_note,
        "marriage_timing_factors": timing_factors,
    }


def calculate_relationships(chart_data: Dict[str, Any]) -> Dict[str, Any]:
    planets: List[Dict] = chart_data["planets"]
    houses: List[Dict] = chart_data["houses"]

    # ── 7th house ──────────────────────────────────────────────────────────────
    h7 = _house(houses, 7)
    sign_7 = h7["rashi"] if h7 else "Libra"
    sign_7_num = h7["rashi_num"] if h7 else 7
    lord_7 = h7["lord"] if h7 else "Venus"
    occupants_7: List[str] = h7["occupants"] if h7 else []

    # ── 7th lord ───────────────────────────────────────────────────────────────
    lord_planet = _planet(planets, lord_7)
    lord_sign_num = lord_planet["rashi_num"] if lord_planet else 0
    lord_house = lord_planet["house"] if lord_planet else 0
    lord_dignity = lord_planet["dignity"] if lord_planet else None

    # ── Venus ──────────────────────────────────────────────────────────────────
    venus = _planet(planets, "Venus")
    venus_dignity = venus["dignity"] if venus else None

    # ── Darakaraka: lowest-degree planet excluding Rahu & Ketu ─────────────────
    eligible = [p for p in planets if p["name"] not in ("Rahu", "Ketu")]
    dk = min(eligible, key=lambda p: p["degree_in_rashi"]) if eligible else None
    dk_name = dk["name"] if dk else "Venus"

    # ── Rahu in 7th ────────────────────────────────────────────────────────────
    rahu = _planet(planets, "Rahu")
    rahu_in_7 = (rahu["house"] == 7) if rahu else False

    # ── Mangal Dosha: Mars in 1, 4, 7, 8, or 12 ────────────────────────────────
    mars = _planet(planets, "Mars")
    mars_house = mars["house"] if mars else 0
    mangal_dosha = mars_house in (1, 4, 7, 8, 12)

    # ── Scoring ────────────────────────────────────────────────────────────────
    score = 1.0
    reasons: List[str] = []

    if sign_7_num in DUAL_SIGNS:
        score += 1.0
        reasons.append(
            f"7th house falls in {sign_7} — a dual sign — indicating a soul drawn to explore "
            f"multiple connections before finding lasting commitment."
        )

    if lord_sign_num in DUAL_SIGNS and lord_sign_num != sign_7_num:
        score += 0.5
        reasons.append(
            f"7th lord {lord_7} is placed in a dual sign, adding restlessness and a tendency "
            f"to seek variety in partnerships."
        )

    if rahu_in_7:
        score += 1.0
        reasons.append(
            "Rahu occupies the 7th house — an intense, unconventional pull toward relationships; "
            "partnerships may be karmic, unexpected, or transformative in nature."
        )

    if len(occupants_7) >= 2:
        score += 0.5
        reasons.append(
            f"{len(occupants_7)} planets occupy the 7th house, creating complex relationship karma "
            f"and multiple significant encounters."
        )
    if len(occupants_7) >= 3:
        score += 0.5  # extra weight for very busy 7th house

    if lord_dignity == "debilitated":
        score += 0.5
        reasons.append(
            f"7th lord {lord_7} is debilitated — relationship challenges and delays may push "
            f"multiple attempts at commitment."
        )

    if lord_house in (6, 8, 12):
        score += 0.5
        reasons.append(
            f"7th lord placed in the {lord_house}th house (a dusthana) — relationships may involve "
            f"separations, hidden dynamics, or deep transformations."
        )

    if venus_dignity == "debilitated":
        score += 0.5
        reasons.append(
            "Venus is debilitated, making it difficult to sustain harmony early in life and "
            "potentially leading to more than one significant romantic chapter."
        )

    # Stabilising factors
    if lord_dignity in ("exalted", "own", "moolatrikona"):
        score -= 0.5
        reasons.append(
            f"7th lord {lord_7} is {lord_dignity} — a powerful indicator of commitment, "
            f"strongly favouring a stable, devoted partnership."
        )

    if venus_dignity in ("exalted", "own", "moolatrikona"):
        score -= 0.5
        reasons.append(
            f"Venus is {venus_dignity} — a deep capacity for love and harmony that attracts "
            f"lasting, fulfilling relationships."
        )

    if lord_house == 7:
        score -= 0.5
        reasons.append(
            f"7th lord {lord_7} sits in its own house — focused, devoted partner energy "
            f"and a natural pull toward committed union."
        )

    if mangal_dosha:
        reasons.append(
            f"Mars in house {mars_house} (Mangal Dosha) — passionate and intense approach to "
            f"relationships; requires a partner of equally strong temperament for lasting harmony."
        )

    if not reasons:
        reasons.append(
            "The 7th house is stable with no strong indicators of multiple relationships — "
            "the chart favours a steady, enduring partnership."
        )

    count = max(1, min(5, round(score)))

    # ── Soulmate portrait ──────────────────────────────────────────────────────
    appearance = SEVENTH_SIGN_APPEARANCE.get(sign_7, "attractive, balanced features")
    personality = DARAKARAKA_TRAITS.get(dk_name, "loving and devoted")
    element = _ELEMENT.get(sign_7, "air")
    mood = _ELEMENT_MOOD.get(element, "soft natural lighting")

    image_prompt = (
        f"Cinematic portrait of a person: {appearance}. "
        f"Personality essence: {personality}. "
        f"Lighting and atmosphere: {mood}. "
        f"Style: photorealistic portrait photography, shallow depth of field, "
        f"highly detailed face, beautiful natural expression, 8k ultra quality."
    )

    # ── Marriage age estimate ──────────────────────────────────────────────────
    marriage = _estimate_marriage_age(
        chart_data, planets, houses,
        lord_7, lord_dignity, lord_house,
        venus_dignity, rahu_in_7,
    )

    return {
        "predicted_count": count,
        "reasons": reasons,
        "seventh_house_sign": sign_7,
        "seventh_house_lord": lord_7,
        "darakaraka": dk_name,
        "mangal_dosha": mangal_dosha,
        "soulmate_appearance": appearance,
        "soulmate_personality": personality,
        "image_prompt": image_prompt,
        **marriage,
    }
