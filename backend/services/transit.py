"""
Transit chart calculations for Vedic Astrology.

Calculates current planetary transits against natal positions and
identifies favorable/unfavorable periods for different life areas.
"""

import swisseph as swe
from datetime import datetime, timedelta
import math
from typing import Dict, List, Set, Tuple, Optional, TYPE_CHECKING
from models.schemas import PlanetPosition
from services import rules as rules_module
if TYPE_CHECKING:
    from services.rules import RuleSet

# Planet list for transit calculations
PLANETS_FOR_TRANSIT = [
    swe.SUN, swe.MOON, swe.MARS, swe.MERCURY,
    swe.JUPITER, swe.VENUS, swe.SATURN, swe.MEAN_NODE
]

PLANET_NAMES = {
    swe.SUN:     "Sun",
    swe.MOON:    "Moon",
    swe.MARS:    "Mars",
    swe.MERCURY: "Mercury",
    swe.JUPITER: "Jupiter",
    swe.VENUS:   "Venus",
    swe.SATURN:  "Saturn",
    swe.MEAN_NODE: "Rahu",
}

RASHI_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Sign → ruling planet (rashi adhipati). Framework constant per BPHS Ch. 4
# — invariant by construction (each rashi has exactly one classical lord).
RASHI_LORDS: Dict[str, str] = {
    "Aries":       "Mars",
    "Taurus":      "Venus",
    "Gemini":      "Mercury",
    "Cancer":      "Moon",
    "Leo":         "Sun",
    "Virgo":       "Mercury",
    "Libra":       "Venus",
    "Scorpio":     "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn":   "Saturn",
    "Aquarius":    "Saturn",
    "Pisces":      "Jupiter",
}

# 27 nakshatras — framework constant (zodiac subdivision), not interpretation.
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
    "Revati",
]

# ---------------------------------------------------------------------------
# Transit endpoints. All interpretive rules now in DB; only framework
# constants (zodiac names, nakshatra names, planet→swisseph mapping,
# Vimshottari periods) remain in code.
# ---------------------------------------------------------------------------
def get_current_transit_positions(
    ayanamsha_val: float,
    natal_lagna_degree: float,
) -> Dict:
    """
    Get current planet positions for today, mapped onto the natal house framework.

    Returns dict with transit_date, planets (PlanetPosition-compatible dicts),
    houses (HouseInfo list based on natal lagna), lagna, and lagna_degree.
    """
    now = datetime.utcnow()
    natal_lagna_rashi_num = int(natal_lagna_degree / 30)  # 0-indexed

    # Compute natal house framework (12 houses from natal lagna)
    lagna_sign = RASHI_NAMES[natal_lagna_rashi_num % 12]
    houses = []
    for i in range(12):
        rashi_idx = (natal_lagna_rashi_num + i) % 12
        rashi = RASHI_NAMES[rashi_idx]
        houses.append({
            "house_num": i + 1,
            "rashi": rashi,
            "rashi_num": rashi_idx + 1,
            "lord": RASHI_LORDS.get(rashi, ""),
            "occupants": [],
        })

    # Compute transit planet positions
    planets = []
    flag = swe.FLG_SWIEPH | swe.FLG_SPEED
    jd = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60.0, 1)

    rahu_lon = 0.0
    rahu_speed = 0.0

    for planet_num, planet_name in PLANET_NAMES.items():
        pos, _ = swe.calc_ut(jd, planet_num, flag)
        tropical_lng = pos[0]
        speed = pos[3]
        sidereal_lng = (tropical_lng - ayanamsha_val) % 360

        rashi_num_0 = int(sidereal_lng / 30)  # 0-indexed
        rashi = RASHI_NAMES[rashi_num_0 % 12]
        degree_in_rashi = sidereal_lng % 30
        house = ((rashi_num_0 - natal_lagna_rashi_num) % 12) + 1

        # Nakshatra
        nak_size = 360.0 / 27
        nak_index = min(int(sidereal_lng / nak_size), 26)
        remainder = sidereal_lng - nak_index * nak_size
        pada = min(int(remainder / (nak_size / 4)) + 1, 4)
        nakshatra = NAKSHATRA_NAMES[nak_index]

        is_retrograde = speed < 0

        if planet_name == "Rahu":
            rahu_lon = sidereal_lng
            rahu_speed = speed
            is_retrograde = True  # Rahu always retrograde in mean node

        planets.append({
            "name": planet_name,
            "longitude": round(sidereal_lng, 4),
            "rashi": rashi,
            "rashi_num": rashi_num_0 + 1,
            "degree_in_rashi": round(degree_in_rashi, 4),
            "house": house,
            "nakshatra": nakshatra,
            "nakshatra_pada": pada,
            "is_retrograde": is_retrograde,
            "dignity": None,
            "lord_of_houses": [],
        })

    # Add Ketu (Rahu + 180Â°)
    ketu_lon = (rahu_lon + 180) % 360
    ketu_rashi_num_0 = int(ketu_lon / 30)
    ketu_rashi = RASHI_NAMES[ketu_rashi_num_0 % 12]
    ketu_deg = ketu_lon % 30
    ketu_house = ((ketu_rashi_num_0 - natal_lagna_rashi_num) % 12) + 1
    nak_size = 360.0 / 27
    ketu_nak_idx = min(int(ketu_lon / nak_size), 26)
    ketu_remainder = ketu_lon - ketu_nak_idx * nak_size
    ketu_pada = min(int(ketu_remainder / (nak_size / 4)) + 1, 4)

    planets.append({
        "name": "Ketu",
        "longitude": round(ketu_lon, 4),
        "rashi": ketu_rashi,
        "rashi_num": ketu_rashi_num_0 + 1,
        "degree_in_rashi": round(ketu_deg, 4),
        "house": ketu_house,
        "nakshatra": NAKSHATRA_NAMES[ketu_nak_idx],
        "nakshatra_pada": ketu_pada,
        "is_retrograde": True,
        "dignity": None,
        "lord_of_houses": [],
    })

    # Mark house occupants
    for p in planets:
        h = p["house"]
        for house in houses:
            if house["house_num"] == h:
                house["occupants"].append(p["name"])

    return {
        "transit_date": now.strftime("%Y-%m-%d"),
        "planets": planets,
        "houses": houses,
        "lagna": lagna_sign,
        "lagna_degree": natal_lagna_degree,
    }


SLOW_PLANETS = {
    swe.MARS: "Mars",
    swe.JUPITER: "Jupiter",
    swe.SATURN: "Saturn",
    swe.MEAN_NODE: "Rahu",
}


def get_lifetime_transit_snapshots(
    ayanamsha_val: float,
    natal_lagna_degree: float,
    birth_year: int,
    birth_month: int = 1,
) -> List[Dict]:
    """
    Compute slow-planet (Jupiter, Saturn, Rahu, Ketu) house positions
    sampled monthly from birth to age 100.

    Returns a list of {date: "YYYY-MM-DD", planets: {name: house_num}}.
    """
    natal_lagna_rashi_num = int(natal_lagna_degree / 30)  # 0-indexed
    flag = swe.FLG_SWIEPH | swe.FLG_SPEED
    snapshots = []

    for month_offset in range(100 * 12):  # 1200 months = 100 years
        year = birth_year + month_offset // 12
        month = birth_month + month_offset % 12
        if month > 12:
            year += 1
            month -= 12

        jd = swe.julday(year, month, 15, 12.0, 1)  # 15th of each month at noon

        planet_houses = {}
        rahu_lon = 0.0

        for planet_num, planet_name in SLOW_PLANETS.items():
            pos, _ = swe.calc_ut(jd, planet_num, flag)
            sidereal_lng = (pos[0] - ayanamsha_val) % 360
            rashi_num_0 = int(sidereal_lng / 30)
            house = ((rashi_num_0 - natal_lagna_rashi_num) % 12) + 1
            planet_houses[planet_name] = house

            if planet_name == "Rahu":
                rahu_lon = sidereal_lng

        # Ketu = Rahu + 180Â°
        ketu_lon = (rahu_lon + 180) % 360
        ketu_rashi_0 = int(ketu_lon / 30)
        ketu_house = ((ketu_rashi_0 - natal_lagna_rashi_num) % 12) + 1
        planet_houses["Ketu"] = ketu_house

        snapshots.append({
            "date": f"{year:04d}-{month:02d}-15",
            "planets": planet_houses,
        })

    return snapshots


def get_planet_position_on_date(
    planet_num: int,
    utc_datetime: datetime,
    ayanamsha_val: float
) -> float:
    """
    Get sidereal longitude of a planet on a specific date.

    Returns:
        Longitude in degrees (0-360)
    """
    jd = swe.julday(
        utc_datetime.year, utc_datetime.month, utc_datetime.day,
        utc_datetime.hour + utc_datetime.minute / 60.0, 1
    )

    # Get tropical position
    flag = swe.FLG_SWIEPH | swe.FLG_SPEED
    pos, _ = swe.calc_ut(jd, planet_num, flag)
    tropical_lng = pos[0]

    # Convert to sidereal
    sidereal_lng = (tropical_lng - ayanamsha_val) % 360
    return sidereal_lng




# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Ingress-event timeline (Apr 2026 redesign)
#
# Tracks sign-changes of the medium-and-slow planets (Mars, Jupiter,
# Saturn, Rahu, Ketu) across the requested window. For each ingress:
#   - resolve which house (from natal lagna) the planet entered
#   - compute how long it stays in the new sign
#   - frame it for each user-selected life area, looking up the existing
#     PLANET_FAVORABLE_MEANINGS / PLANET_UNFAVORABLE_MEANINGS table
# Sun/Mercury/Venus move ~30 days per sign — too noisy as event cards;
# they appear in the opening_snapshot only. Moon excluded entirely.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# NOTE: tracked planets, lookback days, area labels, yogakaraka mapping,
# planet nature (benefic/malefic), and the 108 advisory phrases are now
# all loaded from the DB via services/rules.py. See _settings() / _advice_for()
# accessors below — no static interpretive constants live in this file.


def _find_current_ingress(
    planet: str, start_date: datetime, ayanamsha_val: float, max_days: int
) -> Optional[Dict]:
    """Walk backwards from start_date until the planet's sign differs from
    its sign on start_date. Returns the day AFTER the change (i.e. the
    ingress day into the current sign). None if not found within max_days.

    Daily granularity. Cost: O(min(max_days, residency)) ephemeris calls.
    Early-terminates as soon as the sign differs.
    """
    target_lng = _planet_position(planet, start_date, ayanamsha_val)["longitude"]
    target_sign_idx = _sign_index(target_lng)
    for d in range(1, max_days + 1):
        cursor = start_date - timedelta(days=d)
        lng = _planet_position(planet, cursor, ayanamsha_val)["longitude"]
        sign_idx = _sign_index(lng)
        if sign_idx != target_sign_idx:
            ingress_dt = cursor + timedelta(days=1)
            return {
                "_dt": ingress_dt,
                "date": ingress_dt.strftime("%Y-%m-%d"),
                "from_sign_idx": sign_idx,
                "to_sign_idx": target_sign_idx,
            }
    return None  # planet has been in this sign longer than max_days lookback


# â”€â”€ Per-house signification short phrases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Mirrors frontend/src/lib/houseSignifications.ts (the canonical source).
# Kept in sync by hand — admin DB overrides only affect the frontend display.
HOUSE_SIGNIFICATIONS_SHORT: Dict[int, str] = {
    1: "self, body, vitality",
    2: "wealth, speech, family",
    3: "courage, siblings, skill, short travel",
    4: "home, mother, peace, property",
    5: "children, creativity, intelligence, romance",
    6: "work, service, enemies, health",
    7: "spouse, partnerships, open dealings",
    8: "transformation, research, hidden matters",
    9: "fortune, dharma, father, higher learning",
    10: "career, public image, authority",
    11: "gains, networks, elder siblings",
    12: "rest, losses, foreign, moksha, privacy",
}

# â”€â”€ Per-planet "vibe" — positive when classically favourable, cautious when
# not. Mirrors PLANET_VIBE in frontend dailyEngine.ts / windowContext.ts so
# the chat engine, daily reading and transit timeline speak the same dialect.
PLANET_VIBE: Dict[str, Dict[str, str]] = {
    "Sun":     {"positive": "confidence, recognition, clarity of purpose",
                "cautious": "ego friction, clashes with authority"},
    "Moon":    {"positive": "emotional openness, comfort, social warmth",
                "cautious": "mood volatility, over-sensitivity"},
    "Mars":    {"positive": "drive, decisive action, courage",
                "cautious": "impatience, conflict, accidents"},
    "Mercury": {"positive": "sharp thinking, communication, deals",
                "cautious": "over-analysis, miscommunication"},
    "Jupiter": {"positive": "expansion, grace, opportunities, wisdom",
                "cautious": "overconfidence, over-committing, weight"},
    "Venus":   {"positive": "harmony, partnerships, artistic flow",
                "cautious": "indulgence, relationship drama"},
    "Saturn":  {"positive": "discipline, structure, slow compounding progress",
                "cautious": "delays, fatigue, heavy responsibility"},
    "Rahu":    {"positive": "unexpected openings, unusual gains, innovation",
                "cautious": "confusion, distraction, inflated promises"},
    "Ketu":    {"positive": "insight, detachment, spiritual clarity",
                "cautious": "withdrawal, loss of interest, isolation"},
}


def _is_malefic(rules: "RuleSet", planet: str) -> bool:
    return rules.planet_nature.get(planet) == "malefic"


def _compose_ingress_interpretation(
    rules: "RuleSet",
    planet: str,
    to_house: int,
    area: str,
    classification: str,
) -> str:
    """House- AND area-aware interpretation built from DB-loaded rules.

    Composition order — leads with the strongest connection between the
    transit and the selected life area, then layers planet vibe, then any
    dusthana/upachaya modifier, then the area-specific lens.

    Connection types (priority):
      1. DIRECT     — to_house is a primary/secondary house for the area
      2. KARAKA     — planet is a natural significator of the area
      3. BHAVAT     — bhavat-bhavam from to_house lands on an area-relevant house
      4. ASPECT     — planet's aspect from to_house reaches an area-relevant house
    """
    parts: List[str] = []

    # â”€â”€ 1. House activation lead â”€â”€
    house_theme = rules.house_signification.get(to_house, "")
    if house_theme:
        parts.append(
            f"{planet} now activates your {to_house}{_ord(to_house)} house — {house_theme}."
        )
    else:
        parts.append(f"{planet} moves into your {to_house}{_ord(to_house)} house.")

    # â”€â”€ 2. Why this matters for the selected area (strongest connection) â”€â”€
    area_houses = rules.area_house_relevance.get(area, {})

    direct = area_houses.get(to_house)
    karaka = rules.area_karakas.get(area, {}).get(planet)
    bb = rules.bhavat_bhavam.get(to_house)
    bb_relevant = (bb and area_houses.get(bb[0])) if bb else None

    # Compute aspected houses (universal 7th + planet special aspects)
    aspect_offsets = rules.planet_special_aspects.get(planet, [])
    if not aspect_offsets:
        aspect_offsets = [(7, 1.0)]  # default — every planet has 7th aspect
    aspect_hits: List[Tuple[int, float, Tuple[float, Optional[str]]]] = []
    for offset, strength in aspect_offsets:
        aspected_house = ((to_house - 1 + offset - 1) % 12) + 1
        rel = area_houses.get(aspected_house)
        if rel:
            aspect_hits.append((aspected_house, strength, rel))
    aspect_hits.sort(key=lambda x: x[2][0] * x[1], reverse=True)

    connection: Optional[str] = None
    if direct:
        _weight, why = direct
        if why:
            connection = f"For {area}: this house carries {why}."
        else:
            connection = f"This is a primary house for {area}."
    elif karaka:
        kw, krationale = karaka
        connection = (
            f"For {area}: {planet} is a natural significator ({krationale or 'karaka'}), "
            f"so this transit matters regardless of which house it touches."
        )
    elif bb_relevant:
        bb_house, bb_label = bb
        bb_weight, _ = bb_relevant
        connection = (
            f"For {area}: this house links to your {bb_house}{_ord(bb_house)} "
            f"via bhavat-bhavam ({bb_label}) — {planet} here pushes "
            f"{bb_house}{_ord(bb_house)}-house themes to centre stage."
        )
    elif aspect_hits:
        ah_house, ah_strength, (ah_weight, _) = aspect_hits[0]
        connection = (
            f"For {area}: {planet}'s aspect from H{to_house} reaches your "
            f"{ah_house}{_ord(ah_house)} house — a primary {area} house."
        )
    if connection:
        parts.append(connection)

    # â”€â”€ 3. Planet vibe oriented by classification â”€â”€
    vibe_pair = rules.planet_vibe.get(planet, {})
    if classification == "favorable":
        vibe_phrase = vibe_pair.get("positive", "")
        if vibe_phrase:
            parts.append(f"{planet}'s supportive flavour active here: {vibe_phrase}.")
    elif classification == "unfavorable":
        vibe_phrase = vibe_pair.get("cautious", "")
        if vibe_phrase:
            parts.append(f"{planet}'s cautious flavour active here: {vibe_phrase}.")

    # â”€â”€ 4. Modifier — dusthana / upachaya colouring â”€â”€
    house_tags = rules.house_classification.get(to_house, set())
    is_malefic = _is_malefic(rules, planet)
    if "dusthana" in house_tags:
        if is_malefic:
            parts.append(
                "Dusthana placement: malefics gain a battlefield here — turbulent now, "
                "but cleansing afflictions related to this house's themes."
            )
        else:
            parts.append(
                "Dusthana placement: benefic energy is muted but protects against "
                "the house's natural afflictions."
            )
    elif "upachaya" in house_tags and is_malefic:
        parts.append(
            "Upachaya placement: malefics excel here — strength compounds over the "
            "transit, peaking near the end."
        )

    # â”€â”€ 5. Area lens (the hand-written area-specific line) â”€â”€
    area_lens = rules.planet_area_interpretation.get((planet, area, classification))
    if area_lens:
        parts.append(area_lens)

    return " ".join(parts)


def _ord(n: int) -> str:
    if 11 <= n % 100 <= 13:
        return "th"
    return {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


def _resolve_planet_num(planet_name: str) -> Optional[int]:
    """Map planet name -> swisseph constant. Returns None for Ketu (computed from Rahu)."""
    if planet_name == "Ketu":
        return None
    for num, name in PLANET_NAMES.items():
        if name == planet_name:
            return num
    return None


def _planet_position(planet_name: str, dt: datetime, ayanamsha_val: float) -> Dict:
    """Get sidereal longitude + retrograde flag for a planet on a date.

    For Ketu, computes from Rahu + 180Â°.
    Returns {"longitude": float, "speed": float, "is_retrograde": bool}.
    """
    if planet_name == "Ketu":
        rahu = _planet_position("Rahu", dt, ayanamsha_val)
        return {
            "longitude": (rahu["longitude"] + 180) % 360,
            "speed": rahu["speed"],
            "is_retrograde": True,  # Ketu always retrograde
        }
    planet_num = _resolve_planet_num(planet_name)
    if planet_num is None:
        return {"longitude": 0.0, "speed": 0.0, "is_retrograde": False}
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0, 1)
    flag = swe.FLG_SWIEPH | swe.FLG_SPEED
    pos, _ = swe.calc_ut(jd, planet_num, flag)
    sidereal_lng = (pos[0] - ayanamsha_val) % 360
    speed = pos[3]
    is_retro = speed < 0 or planet_name == "Rahu"  # Rahu always retrograde (mean node)
    return {"longitude": sidereal_lng, "speed": speed, "is_retrograde": is_retro}


def _sign_index(longitude: float) -> int:
    return int(longitude / 30) % 12


def _house_from_natal_lagna(sign_idx: int, natal_lagna_sign_idx: int) -> int:
    return ((sign_idx - natal_lagna_sign_idx) % 12) + 1


def calculate_opening_snapshot(
    natal_chart: Dict, on_date: datetime, ayanamsha_val: float
) -> List[Dict]:
    """All 9 planets' positions on `on_date`, with house from natal lagna.

    Returned shape matches the PlanetSnapshot pydantic model.
    """
    natal_lagna_sign_idx = int(natal_chart.get("lagna_degree", 0) / 30)
    snapshots: List[Dict] = []
    nak_size = 360.0 / 27
    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
        p = _planet_position(planet, on_date, ayanamsha_val)
        sign_idx = _sign_index(p["longitude"])
        nak_idx = min(int(p["longitude"] / nak_size), 26)
        snapshots.append({
            "planet": planet,
            "sign": RASHI_NAMES[sign_idx],
            "sign_num": sign_idx + 1,
            "degree": round(p["longitude"] % 30, 2),
            "house": _house_from_natal_lagna(sign_idx, natal_lagna_sign_idx),
            "is_retrograde": p["is_retrograde"],
            "nakshatra": NAKSHATRA_NAMES[nak_idx] if nak_idx < len(NAKSHATRA_NAMES) else None,
        })
    return snapshots


def calculate_transit_ingresses(
    natal_chart: Dict,
    start_date: datetime,
    end_date: datetime,
    ayanamsha_val: float,
    life_areas: List[str],
) -> Dict[str, List[Dict]]:
    """For each tracked planet, find every sign-change in [start_date, end_date].
    Frame each ingress separately for each requested life_area.

    Returns: {area_id: [IngressEvent dict, ...]} sorted by date.
    """
    natal_lagna_sign_idx = int(natal_chart.get("lagna_degree", 0) / 30)

    # Tracked-planet list and per-planet lookback days come from RuleSetting.
    rules_for_settings = rules_module.get_rules_sync()
    tracked_planets: List[str] = list(
        rules_for_settings.settings.get("ingress_tracked_planets")
        or ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"]
    )
    lookback_map: Dict[str, int] = dict(
        rules_for_settings.settings.get("lookback_days") or {}
    )

    # Step 0: lookback pass — for each tracked planet, find the date it
    # entered its CURRENT sign (i.e. the most recent ingress prior to
    # start_date). This becomes the "currently here" card so the user
    # sees what's active *right now*, not just the next ingress.
    current_placements: List[Dict] = []
    for planet in tracked_planets:
        max_days = int(lookback_map.get(planet, 90))
        result = _find_current_ingress(planet, start_date, ayanamsha_val, max_days)
        if result is None:
            continue
        # Carry retrograde state from current motion (best signal we have)
        result["is_retrograde"] = _planet_position(
            planet, start_date, ayanamsha_val
        )["is_retrograde"]
        result["planet"] = planet
        result["is_current"] = True
        current_placements.append(result)

    # Step 1: scan each tracked planet daily, accumulate FUTURE ingress dates.
    # Each entry: {planet, date, from_sign_idx, to_sign_idx, is_retrograde}.
    raw_ingresses: List[Dict] = []
    for planet in tracked_planets:
        prev_sign_idx: Optional[int] = None
        prev_pos: Optional[Dict] = None
        cursor = start_date
        while cursor <= end_date:
            p = _planet_position(planet, cursor, ayanamsha_val)
            sign_idx = _sign_index(p["longitude"])
            if prev_sign_idx is not None and sign_idx != prev_sign_idx:
                raw_ingresses.append({
                    "planet": planet,
                    "date": cursor.strftime("%Y-%m-%d"),
                    "_dt": cursor,
                    "from_sign_idx": prev_sign_idx,
                    "to_sign_idx": sign_idx,
                    "is_retrograde": p["is_retrograde"],
                    "is_current": False,
                })
            prev_sign_idx = sign_idx
            prev_pos = p
            cursor += timedelta(days=1)

    # Step 2: merge current_placements + raw_ingresses per planet so
    # durations chain correctly (current placement's duration = days
    # until first future ingress, not until next current placement).
    all_by_planet: Dict[str, List[Dict]] = {}
    for ev in current_placements + raw_ingresses:
        all_by_planet.setdefault(ev["planet"], []).append(ev)

    for planet, evs in all_by_planet.items():
        evs.sort(key=lambda e: e["_dt"])
        for i, ev in enumerate(evs):
            if i + 1 < len(evs):
                next_dt = evs[i + 1]["_dt"]
                ev["duration_days"] = (next_dt - ev["_dt"]).days
                ev["next_ingress_date"] = evs[i + 1]["date"]
            else:
                ev["duration_days"] = max(1, (end_date - ev["_dt"]).days)
                ev["next_ingress_date"] = None

    # Step 3: emit per-area events. For every (event, selected area) pair:
    #   - look up classification (favorable/unfavorable/neutral) from DB
    #     rules.planet_favorable_houses with the karaka exception
    #   - call the DB-rules-driven composer to produce house+area-aware text
    # Includes both current placements (date < start_date, is_current=True)
    # and future ingresses, sorted chronologically.
    rules = rules_module.get_rules_sync()

    events_by_area: Dict[str, List[Dict]] = {area: [] for area in life_areas}
    flat = sorted(current_placements + raw_ingresses, key=lambda x: x["_dt"])

    for ing in flat:
        from_house = _house_from_natal_lagna(ing["from_sign_idx"], natal_lagna_sign_idx)
        to_house = _house_from_natal_lagna(ing["to_sign_idx"], natal_lagna_sign_idx)
        planet = ing["planet"]
        favorable_houses = rules.planet_favorable_houses.get(planet, set())
        is_favorable = to_house in favorable_houses
        # Tracked planets are everything in the favorable-houses table.
        # If a planet has no row at all, treat as neutral by default.
        planet_is_tracked = planet in rules.planet_favorable_houses

        for area in life_areas:
            is_karaka = planet in rules.area_karakas.get(area, {})

            # Karaka exception: karakas are never classified unfavorable for
            # their own area (BPHS / Phaladeepika doctrine).
            if is_favorable or is_karaka:
                classification = "favorable"
            elif planet_is_tracked:
                classification = "unfavorable"
            else:
                classification = "neutral"

            interpretation = _compose_ingress_interpretation(
                rules, planet, to_house, area, classification
            )

            events_by_area[area].append({
                "date": ing["date"],
                "planet": planet,
                "from_sign": RASHI_NAMES[ing["from_sign_idx"]],
                "to_sign": RASHI_NAMES[ing["to_sign_idx"]],
                "from_house": from_house,
                "to_house": to_house,
                "is_retrograde": ing["is_retrograde"],
                "duration_days": ing.get("duration_days", 0),
                "next_ingress_date": ing.get("next_ingress_date"),
                "classification": classification,
                "interpretation": interpretation,
                "life_area": area,
                "is_current": ing.get("is_current", False),
                "event_type": "ingress",
            })

    return events_by_area

    return major_transits


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Pratyantardasha events (Apr 2026)
#
# Within each antardasha (AD), the Vimshottari sequence subdivides into
# pratyantardashas (PDs) — sub-sub-periods proportional to each planet's
# Vimshottari years (Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16,
# Saturn 19, Mercury 17, Ketu 7, Venus 20). PD durations sum back to AD.
#
# These are the actual fine-timing signals real astrologers use — they
# typically last 1-2 months and explain "8-day" / "this week" predictions
# the lagna-only ingress timeline misses.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

VIMSHOTTARI_YEARS: Dict[str, int] = {
    "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16,
    "Saturn": 19, "Mercury": 17, "Ketu": 7, "Venus": 20,
}
VIMSHOTTARI_TOTAL = 120

# Standard Vimshottari order — used to sequence PDs starting from AD lord.
VIMSHOTTARI_SEQUENCE: List[str] = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
]


def _pd_sequence_from(lord: str) -> List[str]:
    """Vimshottari sequence rotated so it starts from `lord`."""
    if lord not in VIMSHOTTARI_SEQUENCE:
        return VIMSHOTTARI_SEQUENCE[:]
    i = VIMSHOTTARI_SEQUENCE.index(lord)
    return VIMSHOTTARI_SEQUENCE[i:] + VIMSHOTTARI_SEQUENCE[:i]


def _natal_house_of(natal_chart: Dict, planet: str) -> Optional[int]:
    """House (from natal lagna) where `planet` sits in the natal chart."""
    for p in natal_chart.get("planets", []) or []:
        if p.get("name") == planet:
            return p.get("house")
    # Ketu isn't in chart.planets — derive from Rahu + 6 houses
    if planet == "Ketu":
        for p in natal_chart.get("planets", []) or []:
            if p.get("name") == "Rahu":
                rahu_house = p.get("house")
                if rahu_house:
                    return ((rahu_house - 1 + 6) % 12) + 1
    return None


def _compose_pd_interpretation(
    rules: "RuleSet",
    md_lord: str,
    ad_lord: str,
    pd_lord: str,
    pd_natal_house: Optional[int],
    area: str,
    classification: str,
) -> str:
    """Interpretation for a pratyantardasha event.

    Composition:
      1. Sub-period header — "Within Mars-Rahu, Jupiter's pratyantardasha…"
      2. PD lord's natal house relevance to the area (if known)
      3. Karaka note if PD lord is a karaka of the area
      4. Standard area lens for the PD lord (PlanetAreaInterpretation)
    """
    parts: List[str] = []
    parts.append(
        f"Pratyantardasha shifts to {pd_lord} within the standing "
        f"{md_lord}-{ad_lord} period. {pd_lord} now drives the fine-timing "
        f"signals for the next several weeks."
    )

    if pd_natal_house is not None:
        rel = rules.area_house_relevance.get(area, {}).get(pd_natal_house)
        if rel:
            _w, why = rel
            if why:
                parts.append(
                    f"For {area}: {pd_lord} sits in your {pd_natal_house}{_ord(pd_natal_house)} "
                    f"house natally — {why}."
                )
            else:
                parts.append(
                    f"For {area}: {pd_lord} sits in your {pd_natal_house}{_ord(pd_natal_house)} "
                    f"house natally — a primary {area} house."
                )
        else:
            theme = rules.house_signification.get(pd_natal_house, "")
            if theme:
                parts.append(
                    f"{pd_lord} sits in your {pd_natal_house}{_ord(pd_natal_house)} natally "
                    f"({theme}) — sub-period themes draw from there."
                )

    karaka = rules.area_karakas.get(area, {}).get(pd_lord)
    if karaka:
        _kw, krat = karaka
        parts.append(
            f"{pd_lord} is also a natural significator of {area}"
            f"{f' ({krat})' if krat else ''} — sub-period carries that flavour."
        )

    area_lens = rules.planet_area_interpretation.get((pd_lord, area, classification))
    if area_lens:
        parts.append(area_lens)

    return " ".join(parts)


def calculate_pratyantardasha_events(
    natal_chart: Dict,
    start_date: datetime,
    end_date: datetime,
    life_areas: List[str],
) -> Dict[str, List[Dict]]:
    """Walk every AD in natal_chart.dasha_sequence; for each AD overlapping
    the window, generate its 9 PDs; emit one event per (PD, area) pair.

    Output shape mirrors calculate_transit_ingresses so the route can
    merge both event streams into events_by_area.
    """
    rules = rules_module.get_rules_sync()
    events_by_area: Dict[str, List[Dict]] = {area: [] for area in life_areas}

    today = datetime.utcnow()

    for md in natal_chart.get("dasha_sequence", []) or []:
        md_lord = md.get("planet")
        for ad in md.get("antardashas", []) or []:
            ad_start = _parse_iso_date(ad.get("start_date"))
            ad_end = _parse_iso_date(ad.get("end_date"))
            if not ad_start or not ad_end:
                continue
            if ad_end < start_date or ad_start > end_date:
                continue
            ad_lord = ad.get("planet")
            ad_duration_s = (ad_end - ad_start).total_seconds()
            if ad_duration_s <= 0:
                continue

            # Generate the 9 PDs starting from ad_lord, walking the
            # Vimshottari sequence. Each PD's duration = AD Ã— (lord_years/120).
            cursor = ad_start
            for pd_lord in _pd_sequence_from(ad_lord):
                pd_years = VIMSHOTTARI_YEARS.get(pd_lord, 0)
                pd_duration_s = ad_duration_s * (pd_years / VIMSHOTTARI_TOTAL)
                pd_end = cursor + timedelta(seconds=pd_duration_s)

                # Only emit PDs that overlap the requested window.
                if pd_end >= start_date and cursor <= end_date:
                    pd_natal_house = _natal_house_of(natal_chart, pd_lord)
                    is_current = cursor <= today <= pd_end

                    # Classification: karaka exception applies; otherwise
                    # use natal house's relevance to the area as a proxy.
                    for area in life_areas:
                        is_karaka = pd_lord in rules.area_karakas.get(area, {})
                        natal_rel = (
                            rules.area_house_relevance.get(area, {}).get(pd_natal_house)
                            if pd_natal_house is not None else None
                        )
                        if is_karaka or (natal_rel and natal_rel[0] >= 0.7):
                            classification = "favorable"
                        elif pd_lord in {"Mars", "Saturn", "Rahu", "Ketu", "Sun"}:
                            classification = "unfavorable"
                        else:
                            classification = "neutral"

                        interpretation = _compose_pd_interpretation(
                            rules, md_lord, ad_lord, pd_lord,
                            pd_natal_house, area, classification,
                        )

                        # Reuse IngressEvent shape but flag as "pratyantardasha".
                        # from/to sign+house populated with PD lord's natal sign+house
                        # to keep the dict shape uniform; frontend branches on event_type.
                        natal_sign = ""
                        for p in natal_chart.get("planets", []) or []:
                            if p.get("name") == pd_lord:
                                natal_sign = p.get("rashi", "")
                                break

                        events_by_area[area].append({
                            "date": cursor.strftime("%Y-%m-%d"),
                            "planet": pd_lord,
                            "from_sign": natal_sign,  # PD doesn't change sign
                            "to_sign": natal_sign,
                            "from_house": pd_natal_house or 0,
                            "to_house": pd_natal_house or 0,
                            "is_retrograde": False,
                            "duration_days": max(1, int(pd_duration_s / 86400)),
                            "next_ingress_date": pd_end.strftime("%Y-%m-%d"),
                            "classification": classification,
                            "interpretation": interpretation,
                            "life_area": area,
                            "is_current": is_current,
                            "event_type": "pratyantardasha",
                            "md_lord": md_lord,
                            "ad_lord": ad_lord,
                        })

                cursor = pd_end

    return events_by_area


def _parse_iso_date(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Per-area NARRATIVE composer (Apr 2026)
#
# Synthesises events_by_area + chart state into a 3-paragraph prose
# reading per area: current state â†’ next inflection â†’ background themes.
# Reads top-to-bottom; the cards below are the receipts.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Yogakaraka mapping is loaded from DB (Yogakaraka table). Six rows total
# per BPHS Ch. 7. Helper takes rules so the caller can supply a cached set.
def _is_yogakaraka(rules: "RuleSet", planet: str, lagna: str) -> bool:
    return rules.yogakaraka_for_lagna.get(lagna) == planet


def _compute_sade_sati(
    natal_chart: Dict, today: datetime, ayanamsha_val: float
) -> Optional[Dict]:
    """Detect if user is currently in Sade-Sati and which phase.

    Phase 1: Saturn in 12th from natal Moon
    Phase 2: Saturn in 1st from natal Moon (Janma Shani — heaviest)
    Phase 3: Saturn in 2nd from natal Moon

    Returns {phase, saturn_sign, moon_sign, days_remaining_in_phase} or None.
    """
    natal_moon = next(
        (p for p in (natal_chart.get("planets") or []) if p.get("name") == "Moon"),
        None,
    )
    if not natal_moon:
        return None
    moon_sign_idx = int(natal_moon.get("longitude", 0) / 30)

    saturn_pos = _planet_position("Saturn", today, ayanamsha_val)
    saturn_sign_idx = _sign_index(saturn_pos["longitude"])

    diff = (saturn_sign_idx - moon_sign_idx) % 12
    if diff == 11:
        phase = 1
    elif diff == 0:
        phase = 2
    elif diff == 1:
        phase = 3
    else:
        return None

    # Estimate when Saturn leaves the current sign (rough — daily walk
    # bounded at 1100d). Used for "until" framing.
    cursor = today
    for d in range(1, 1100):
        cursor = today + timedelta(days=d)
        s = _planet_position("Saturn", cursor, ayanamsha_val)
        if _sign_index(s["longitude"]) != saturn_sign_idx:
            break
    days_remaining = (cursor - today).days

    return {
        "phase": phase,
        "saturn_sign": RASHI_NAMES[saturn_sign_idx],
        "moon_sign": RASHI_NAMES[moon_sign_idx],
        "days_remaining_in_phase": days_remaining,
        "leaves_on": cursor.strftime("%Y-%m-%d"),
    }


def _format_human_date(iso: str) -> str:
    try:
        d = datetime.strptime(iso, "%Y-%m-%d")
        return d.strftime("%b %-d, %Y") if hasattr(datetime, "strftime") else iso
    except Exception:
        return iso


def _format_human_date_safe(iso: str) -> str:
    """Cross-platform '%b %d, %Y' without leading zero."""
    try:
        d = datetime.strptime(iso, "%Y-%m-%d")
        # Avoid %-d (Linux only) / %#d (Windows only) for portability
        return f"{d.strftime('%b')} {d.day}, {d.year}"
    except Exception:
        return iso


def _format_duration_human(days: int) -> str:
    if days < 14:
        return f"{days} days"
    if days < 60:
        return f"~{round(days / 7)} weeks"
    return f"~{round(days / 30)} months"


def _classify_signal(events: List[Dict]) -> str:
    """Aggregate sentiment for a list of events: favorable / mixed / challenging."""
    if not events:
        return "neutral"
    fav = sum(1 for e in events if e.get("classification") == "favorable")
    unfav = sum(1 for e in events if e.get("classification") == "unfavorable")
    if fav > unfav and unfav == 0:
        return "favorable"
    if unfav > fav and fav == 0:
        return "challenging"
    return "mixed"


def _advice_for(rules: "RuleSet", planet: str, area: str, classification: str) -> str:
    """DB-backed advisory phrase lookup. 108 rows live in PlanetAreaAdvice."""
    polarity = "favorable" if classification == "favorable" else "unfavorable"
    return rules.planet_area_advice.get((planet, area, polarity), "")


def compose_area_narrative(
    rules: "RuleSet",
    natal_chart: Dict,
    area: str,
    events: List[Dict],
    today: datetime,
    window_end: datetime,
    ayanamsha_val: float,
) -> str:
    """Three-paragraph ADVISORY reading for one life area.

    Voice: knowledgeable astrologer giving forward-looking guidance.
    Each paragraph translates structured facts into prescriptive advice
    with concrete dates and verbs ("push forward", "hold off", "brace for").

    Para 1: WHAT'S ACTIVE NOW + the texture you're feeling
    Para 2: NEXT MAJOR INFLECTION with specific advice for that window
    Para 3: BIGGER ARC in the background (slow planet placement + Sade-Sati)
    """
    lagna = natal_chart.get("lagna", "")
    area_label = rules.life_area_label.get(area, area)
    paras: List[str] = []

    # â”€â”€ Para 1: WHAT'S ACTIVE NOW â”€â”€
    current = sorted(
        [e for e in events if e.get("is_current")],
        key=lambda e: 0 if e.get("event_type") == "pratyantardasha" else 1,
    )
    if current:
        active_pd = next((e for e in current if e.get("event_type") == "pratyantardasha"), None)
        active_ingresses = [
            e for e in current if e.get("event_type") == "ingress"
            and e.get("planet") in {"Mars", "Jupiter", "Saturn", "Rahu", "Ketu"}
        ]

        bits: List[str] = []
        signal = _classify_signal(current)
        texture = {
            "favorable":   f"Right now {area_label} has tailwind",
            "challenging": f"Right now {area_label} feels heavy",
            "mixed":       f"Right now {area_label} is mixed — some pressure, some support",
            "neutral":     f"Right now {area_label} is in a quiet phase",
        }[signal]
        bits.append(texture + ".")

        # Lead with the active PD (it's the fine driver)
        if active_pd:
            md, ad, pd = active_pd.get("md_lord"), active_pd.get("ad_lord"), active_pd.get("planet")
            until_iso = active_pd.get("next_ingress_date")
            until_str = _format_human_date_safe(until_iso) if until_iso else "later this period"
            days_to_pd_end = 0
            if until_iso:
                end_dt = _parse_iso_date(until_iso)
                if end_dt:
                    days_to_pd_end = max(0, (end_dt - today).days)
            advice = _advice_for(rules, pd, area, active_pd.get("classification") or "neutral")
            pd_line = (
                f"You're in the **{md}-{ad}-{pd}** sub-period — {pd} is steering the next "
                f"~{days_to_pd_end} days (until **{until_str}**)."
            )
            if advice:
                pd_line += f" {advice.capitalize()}."
            bits.append(pd_line)

        # Then the supportive / aggravating slow-planet placements
        for e in active_ingresses[:2]:
            p = e.get("planet")
            h = e.get("to_house")
            yk = _is_yogakaraka(rules, p, lagna)
            classn = e.get("classification") or "neutral"
            advice = _advice_for(rules, p, area, classn)
            yk_note = " (your yogakaraka — friendly to your chart)" if yk else ""
            if classn == "favorable":
                bits.append(
                    f"**{p}**{yk_note} sits in your H{h} supporting this — {advice}."
                )
            elif classn == "unfavorable":
                bits.append(
                    f"**{p}**{yk_note} in your H{h} is the friction source — {advice}."
                )
            else:
                bits.append(f"**{p}**{yk_note} sits in your H{h} as a neutral background.")

        paras.append(" ".join(bits))

    # â”€â”€ Para 2: NEXT MAJOR INFLECTION â”€â”€
    future = sorted(
        [e for e in events if not e.get("is_current") and _parse_iso_date(e["date"]) and _parse_iso_date(e["date"]) > today],
        key=lambda e: e["date"],
    )
    if future:
        next_date = future[0]["date"]
        same_day = [e for e in future if e["date"] == next_date]
        days_away = (_parse_iso_date(next_date) - today).days
        when_str = _format_human_date_safe(next_date)
        if days_away <= 1:
            timing = "tomorrow" if days_away == 1 else "today"
        elif days_away < 14:
            timing = f"{days_away} days from now"
        elif days_away < 60:
            timing = f"~{round(days_away / 7)} weeks from now"
        else:
            timing = f"~{round(days_away / 30)} months from now"

        signal = _classify_signal(same_day)
        opener = {
            "favorable":   f"**{when_str}** ({timing}) is your next opening",
            "challenging": f"**{when_str}** ({timing}) is when the texture tightens",
            "mixed":       f"**{when_str}** ({timing}) is your next inflection — mixed signals stack",
            "neutral":     f"**{when_str}** ({timing}) marks the next configuration shift",
        }[signal]
        bits = [opener + "."]

        # Per-event advisory phrasing
        for e in same_day[:3]:
            p = e.get("planet")
            classn = e.get("classification") or "neutral"
            advice = _advice_for(rules, p, area, classn)
            if e.get("event_type") == "pratyantardasha":
                md, ad = e.get("md_lord"), e.get("ad_lord")
                karaka_note = ""
                if p in rules.area_karakas.get(area, {}):
                    karaka_note = f" ({p} is a natural significator of {area_label})"
                if classn == "favorable" and advice:
                    bits.append(
                        f"The **{md}-{ad}-{p}** pratyantardasha begins{karaka_note} — "
                        f"this is a window to {advice}."
                    )
                elif classn == "unfavorable" and advice:
                    bits.append(
                        f"The **{md}-{ad}-{p}** pratyantardasha begins{karaka_note}; "
                        f"during this window, {advice}."
                    )
                else:
                    bits.append(f"The **{md}-{ad}-{p}** pratyantardasha begins{karaka_note}.")
            else:
                from_h = e.get("from_house")
                to_h = e.get("to_house")
                yk = _is_yogakaraka(rules, p, lagna)
                yk_note = " (your yogakaraka)" if yk else ""
                if classn == "favorable" and advice:
                    bits.append(
                        f"**{p}**{yk_note} moves from H{from_h} into H{to_h} — {advice}."
                    )
                elif classn == "unfavorable" and advice:
                    bits.append(
                        f"**{p}**{yk_note} moves from H{from_h} into H{to_h}; {advice}."
                    )
                else:
                    bits.append(f"**{p}**{yk_note} moves H{from_h} â†’ H{to_h}.")

        paras.append(" ".join(bits))

    # â”€â”€ Para 3: BIGGER ARC â”€â”€
    bg_bits: List[str] = []

    long_ingress = next(
        iter(sorted(
            [e for e in events if e.get("event_type") == "ingress" and not e.get("is_current")
             and e.get("planet") in {"Saturn", "Jupiter", "Rahu", "Ketu"}],
            key=lambda e: e.get("duration_days", 0),
            reverse=True,
        )), None,
    )
    current_slow = [
        e for e in events
        if e.get("is_current") and e.get("event_type") == "ingress"
        and e.get("planet") in {"Saturn", "Jupiter", "Rahu", "Ketu"}
    ]

    bg_first_done = False
    if current_slow:
        e = current_slow[0]
        p = e.get("planet")
        to_h = e.get("to_house")
        until_iso = e.get("next_ingress_date")
        yk = _is_yogakaraka(rules, p, lagna)
        yk_note = " (your yogakaraka)" if yk else ""
        until_clause = (
            f" until **{_format_human_date_safe(until_iso)}**"
            if until_iso else " for the rest of this window"
        )
        bg_bits.append(
            f"In the background, **{p}**{yk_note} continues to sit in your H{to_h}{until_clause} — "
            f"that's the slow current shaping {area_label} regardless of the daily noise."
        )
        bg_first_done = True

    if long_ingress and (not bg_first_done):
        e = long_ingress
        p = e.get("planet")
        to_h = e.get("to_house")
        until_iso = e.get("next_ingress_date")
        yk_note = " (your yogakaraka)" if _is_yogakaraka(rules, p, lagna) else ""
        until_clause = f" until **{_format_human_date_safe(until_iso)}**" if until_iso else ""
        bg_bits.append(
            f"Coming up, **{p}**{yk_note} will hold your H{to_h}{until_clause} — that becomes the "
            f"slow current for {area_label}."
        )

    # Sade-Sati framed as life-context, not theory
    sade = _compute_sade_sati(natal_chart, today, ayanamsha_val)
    if sade:
        phase = sade["phase"]
        leaves_str = _format_human_date_safe(sade["leaves_on"])
        is_sat_yk = _is_yogakaraka(rules, "Saturn", lagna)
        if phase == 1:
            sat_text = (
                f"You're also in the **first third of your 7.5-year Saturn cycle** "
                f"(Sade-Sati Phase 1, until **{leaves_str}**) — slow grind, but not breakage."
            )
        elif phase == 2:
            sat_text = (
                f"You're in the **heaviest year-and-a-half of your Saturn cycle** "
                f"(Sade-Sati Phase 2 — Saturn over your natal Moon, until **{leaves_str}**). "
                f"Sleep, mother's wellbeing, and public standing all need extra care. "
                f"Schedule rest, watch what you say in public."
            )
        else:
            sat_text = (
                f"You're in the **closing third of your Saturn cycle** "
                f"(Sade-Sati Phase 3, until **{leaves_str}**) — the worst pressure is behind you."
            )

        if is_sat_yk:
            sat_text += (
                f" The good news: Saturn is your yogakaraka, so the career/material thread "
                f"holds together even when emotionally things feel heavy. Trust the structure."
            )

        bg_bits.append(sat_text)

    if bg_bits:
        paras.append(" ".join(bg_bits))

    return "\n\n".join(paras) if paras else ""
