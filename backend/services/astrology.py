"""
Core Vedic astrology calculations using pyswisseph.

Covers:
- Sidereal planetary positions (Lahiri / KP / Raman ayanamshas)
- Lagna (Ascendant) via oblique ascension
- Whole Sign house system
- Planetary dignity
- Navamsa (D-9) chart
"""

import swisseph as swe
import math
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RASHI_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

PLANET_NAMES = {
    swe.SUN:     "Sun",
    swe.MOON:    "Moon",
    swe.MARS:    "Mars",
    swe.MERCURY: "Mercury",
    swe.JUPITER: "Jupiter",
    swe.VENUS:   "Venus",
    swe.SATURN:  "Saturn",
    swe.MEAN_NODE: "Rahu",   # North Node
}

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Sign lords (1-indexed: Aries=1 ... Pisces=12)
SIGN_LORDS = {
    1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury",
    7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter"
}

# Exaltation degrees (sign_num, degree)
EXALTATION = {
    "Sun":     (1, 10),   # Aries 10°
    "Moon":    (2, 3),    # Taurus 3°
    "Mars":    (10, 28),  # Capricorn 28°
    "Mercury": (6, 15),   # Virgo 15°
    "Jupiter": (4, 5),    # Cancer 5°
    "Venus":   (12, 27),  # Pisces 27°
    "Saturn":  (7, 20),   # Libra 20°
    "Rahu":    (2, 20),   # Taurus 20° (Vedic convention)
    "Ketu":    (8, 20),   # Scorpio 20°
}

# Debilitation = opposite sign of exaltation
DEBILITATION = {
    "Sun":     (7, 10),
    "Moon":    (8, 3),
    "Mars":    (4, 28),
    "Mercury": (12, 15),
    "Jupiter": (10, 5),
    "Venus":   (6, 27),
    "Saturn":  (1, 20),
    "Rahu":    (8, 20),
    "Ketu":    (2, 20),
}

# Own signs
OWN_SIGNS: Dict[str, List[int]] = {
    "Sun":     [5],
    "Moon":    [4],
    "Mars":    [1, 8],
    "Mercury": [3, 6],
    "Jupiter": [9, 12],
    "Venus":   [2, 7],
    "Saturn":  [10, 11],
    "Rahu":    [],
    "Ketu":    [],
}

# Moolatrikona signs (higher dignity than own sign)
MOOLATRIKONA: Dict[str, Tuple[int, Tuple[float, float]]] = {
    "Sun":     (5, (0, 20)),
    "Moon":    (2, (3, 30)),
    "Mars":    (1, (0, 12)),
    "Mercury": (6, (15, 20)),
    "Jupiter": (9, (0, 10)),
    "Venus":   (7, (0, 15)),
    "Saturn":  (11, (0, 20)),
}

AYANAMSHA_MAP = {
    "lahiri":        swe.SIDM_LAHIRI,
    "krishnamurti":  swe.SIDM_KRISHNAMURTI,
    "raman":         swe.SIDM_RAMAN,
}

# ---------------------------------------------------------------------------
# Gulika (Mandi) constants
# ---------------------------------------------------------------------------

# For each weekday (Python weekday(): Mon=0 ... Sun=6),
# which 1/8th portion of the day or night Saturn (Gulika) occupies.
#
# Derived from the weekday-order sequence (Sun, Moon, Mars, Mercury, Jupiter,
# Venus, Saturn) starting from the weekday lord — NOT the Chaldean planetary-
# hour order. Day portions count down from Saturday=1 to Sunday=7. Night
# portions follow a separate classical assignment (Phaladeepika, BPHS Ch. 3).
#
# Sources: Phaladeepika Ch. 3; BPHS Ch. 3; Saravali Ch. 4.
GULIKA_PORTIONS: Dict[int, tuple] = {
    6: (7, 1),  # Sunday    — day portion 7, night portion 1
    0: (6, 3),  # Monday    — day portion 6, night portion 3
    1: (5, 5),  # Tuesday   — day portion 5, night portion 5
    2: (4, 7),  # Wednesday — day portion 4, night portion 7
    3: (3, 2),  # Thursday  — day portion 3, night portion 2
    4: (2, 4),  # Friday    — day portion 2, night portion 4
    5: (1, 6),  # Saturday  — day portion 1, night portion 6
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def set_ayanamsha(ayanamsha: str) -> None:
    code = AYANAMSHA_MAP.get(ayanamsha.lower(), swe.SIDM_LAHIRI)
    swe.set_sid_mode(code)


def datetime_to_jd(dt: datetime) -> float:
    """Convert UTC datetime to Julian Day Number."""
    return swe.julday(
        dt.year, dt.month, dt.day,
        dt.hour + dt.minute / 60.0 + dt.second / 3600.0
    )


def longitude_to_rashi(lon: float) -> Tuple[int, float]:
    """Return (rashi_num 1-12, degree_within_rashi 0-30)."""
    rashi_num = int(lon // 30) + 1  # 1-indexed
    degree = lon % 30
    return rashi_num, degree


def longitude_to_nakshatra(lon: float) -> Tuple[str, int]:
    """Return (nakshatra_name, pada 1-4)."""
    nak_size = 360.0 / 27
    nak_index = int(lon / nak_size)
    nak_index = min(nak_index, 26)
    remainder = lon - nak_index * nak_size
    pada = int(remainder / (nak_size / 4)) + 1
    pada = min(pada, 4)
    return NAKSHATRA_NAMES[nak_index], pada


# ---------------------------------------------------------------------------
# Lagna calculation
# ---------------------------------------------------------------------------

def calculate_lagna(jd: float, lat: float, lng: float) -> float:
    """
    Calculate the Ascendant (Lagna) sidereal longitude.
    Uses Swiss Ephemeris house calculation (Placidus is computed internally
    but we only need the ascendant degree, then we apply ayanamsha).
    """
    # swe.houses returns (cusps, ascmc) where ascmc[0] = Ascendant (tropical)
    cusps, ascmc = swe.houses(jd, lat, lng, b'P')  # Placidus just for ASC
    tropical_asc = ascmc[0]

    # Subtract ayanamsha to get sidereal
    ayanamsha_val = swe.get_ayanamsa_ut(jd)
    sidereal_asc = (tropical_asc - ayanamsha_val) % 360
    return sidereal_asc


# ---------------------------------------------------------------------------
# Planet positions
# ---------------------------------------------------------------------------

def get_planet_positions(jd: float) -> Dict[str, Dict]:
    """
    Return dict of planet_name → {longitude, speed, is_retrograde}
    in sidereal coordinates.
    """
    planets = {}
    flag = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED

    for planet_id, name in PLANET_NAMES.items():
        result, ret_flag = swe.calc_ut(jd, planet_id, flag)
        lon = result[0] % 360
        speed = result[3]  # deg/day; negative = retrograde
        planets[name] = {
            "longitude": lon,
            "speed": speed,
            "is_retrograde": speed < 0,
        }

    # Ketu = Rahu + 180°
    rahu_lon = planets["Rahu"]["longitude"]
    ketu_lon = (rahu_lon + 180) % 360
    planets["Ketu"] = {
        "longitude": ketu_lon,
        "speed": planets["Rahu"]["speed"],
        "is_retrograde": True,  # Ketu always retrograde in mean node system
    }

    return planets


# ---------------------------------------------------------------------------
# Dignity
# ---------------------------------------------------------------------------

def get_dignity(planet: str, rashi_num: int, degree: float) -> Optional[str]:
    """Return dignity string or None."""
    # Exaltation check (within 1 degree of exact exaltation = "exact exaltation")
    if planet in EXALTATION:
        ex_sign, ex_deg = EXALTATION[planet]
        if rashi_num == ex_sign:
            return "exalted"

    # Debilitation
    if planet in DEBILITATION:
        deb_sign, _ = DEBILITATION[planet]
        if rashi_num == deb_sign:
            return "debilitated"

    # Moolatrikona
    if planet in MOOLATRIKONA:
        mt_sign, (mt_start, mt_end) = MOOLATRIKONA[planet]
        if rashi_num == mt_sign and mt_start <= degree <= mt_end:
            return "moolatrikona"

    # Own sign
    if rashi_num in OWN_SIGNS.get(planet, []):
        return "own"

    return None


# ---------------------------------------------------------------------------
# Whole Sign houses
# ---------------------------------------------------------------------------

def assign_whole_sign_houses(
    lagna_lon: float,
    planet_positions: Dict[str, Dict]
) -> Tuple[List[Dict], List[Dict]]:
    """
    Whole Sign system: lagna sign = house 1, next sign = house 2, etc.
    Returns (house_info_list, planet_list).
    """
    lagna_rashi_num, lagna_degree = longitude_to_rashi(lagna_lon)

    # Build house → rashi mapping
    houses = []
    for h in range(1, 13):
        rashi_num = ((lagna_rashi_num - 1 + (h - 1)) % 12) + 1
        rashi_name = RASHI_NAMES[rashi_num - 1]
        lord = SIGN_LORDS[rashi_num]
        houses.append({
            "house_num": h,
            "rashi": rashi_name,
            "rashi_num": rashi_num,
            "lord": lord,
            "occupants": [],
        })

    rashi_to_house = {h["rashi_num"]: h["house_num"] for h in houses}

    # Compute lord_of_houses for each planet
    planet_to_house_lordship: Dict[str, List[int]] = {}
    for h in houses:
        lord = h["lord"]
        planet_to_house_lordship.setdefault(lord, []).append(h["house_num"])

    # Build planet list
    planet_list = []
    for name, data in planet_positions.items():
        lon = data["longitude"]
        rashi_num, deg_in_rashi = longitude_to_rashi(lon)
        rashi_name = RASHI_NAMES[rashi_num - 1]
        house_num = rashi_to_house[rashi_num]
        nakshatra, pada = longitude_to_nakshatra(lon)
        dignity = get_dignity(name, rashi_num, deg_in_rashi)
        lord_of = planet_to_house_lordship.get(name, [])

        planet_list.append({
            "name": name,
            "longitude": round(lon, 4),
            "rashi": rashi_name,
            "rashi_num": rashi_num,
            "degree_in_rashi": round(deg_in_rashi, 4),
            "house": house_num,
            "nakshatra": nakshatra,
            "nakshatra_pada": pada,
            "is_retrograde": data["is_retrograde"],
            "dignity": dignity,
            "lord_of_houses": lord_of,
        })

        # Mark house occupants
        houses[house_num - 1]["occupants"].append(name)

    return houses, planet_list


# ---------------------------------------------------------------------------
# Navamsa (D-9) chart
# ---------------------------------------------------------------------------

def calculate_navamsa(
    lagna_lon: float,
    planet_positions: Dict[str, Dict]
) -> Tuple[str, List[Dict]]:
    """
    Each sign (30°) is divided into 9 parts (navamsas) of 3°20' each.
    The navamsa sign for a planet depends on:
      - Which sign group the sign belongs to (Fire=0, Earth=1, Air=2, Water=3)
      - Position within the sign
    Formula: navamsa_sign = (navamsa_offset + navamsa_num) % 12
    where navamsa_offset depends on the element of the sign.
    """
    ELEMENT_START = {
        # Fire signs (Aries, Leo, Sagittarius) → start from Aries (0)
        1: 0, 5: 0, 9: 0,
        # Earth signs (Taurus, Virgo, Capricorn) → start from Capricorn (9)
        2: 9, 6: 9, 10: 9,
        # Air signs (Gemini, Libra, Aquarius) → start from Libra (6)
        3: 6, 7: 6, 11: 6,
        # Water signs (Cancer, Scorpio, Pisces) → start from Cancer (3)
        4: 3, 8: 3, 12: 3,
    }

    def lon_to_navamsa_sign(lon: float) -> int:
        rashi_num, deg = longitude_to_rashi(lon)
        navamsa_num = int(deg / (30 / 9))  # 0-8
        start = ELEMENT_START[rashi_num]
        nav_sign = (start + navamsa_num) % 12 + 1  # 1-12
        return nav_sign

    lagna_nav_sign = lon_to_navamsa_sign(lagna_lon)
    nav_lagna_name = RASHI_NAMES[lagna_nav_sign - 1]

    # Navamsa whole sign houses
    nav_planets = []
    for name, data in planet_positions.items():
        nav_sign = lon_to_navamsa_sign(data["longitude"])
        nav_rashi = RASHI_NAMES[nav_sign - 1]
        # House relative to navamsa lagna
        house = ((nav_sign - lagna_nav_sign) % 12) + 1
        deg_in_rashi = (data["longitude"] % 30 / (30 / 9)) % (30 / 9)

        nav_planets.append({
            "name": name,
            "rashi": nav_rashi,
            "rashi_num": nav_sign,
            "house": house,
            "degree_in_rashi": round(deg_in_rashi, 4),
        })

    return nav_lagna_name, nav_planets


# ---------------------------------------------------------------------------
# Bhrigu Bindu & Gulika (Mandi)
# ---------------------------------------------------------------------------

def compute_bhrigu_bindu(moon_lon: float, rahu_lon: float) -> float:
    """
    Bhrigu Bindu = midpoint of Moon and Rahu along the shorter arc.

    It is the "sensitive degree" in Bhrigu Nadi astrology.  Any planet
    transiting over this degree triggers significant life events related
    to the house it occupies natally.  Planets conjunct BB in the natal
    chart amplify that house's karma throughout the life.

    Source: Bhrigu Nadi astrology tradition; also discussed in
    K.N. Rao's writings on sensitive points.
    """
    diff = abs(moon_lon - rahu_lon)
    if diff > 180:
        bb = ((moon_lon + rahu_lon) / 2 + 180) % 360
    else:
        bb = (moon_lon + rahu_lon) / 2
    return round(bb % 360, 4)


def compute_gulika(
    utc_dt: datetime,
    jd: float,
    lat: float,
    lng: float,
) -> float:
    """
    Compute Gulika (Mandi) — the sub-lord of Saturn.

    Method (BPHS Ch. 3):
      1. Find sunrise and sunset via Swiss Ephemeris rise_trans().
      2. Determine if birth is day (sunrise–sunset) or night (sunset–next sunrise).
      3. Divide the relevant half-day into 8 equal portions.
      4. Look up which portion belongs to Saturn using GULIKA_PORTIONS.
      5. The Ascendant at the *start* of that portion = Gulika's longitude.

    Returns sidereal longitude (0–360).
    """
    geopos = (lng, lat, 0.0)
    atpress, attemp = 1013.25, 15.0

    try:
        # Search from jd - 0.5 (previous noon) so we always catch the correct day's events
        ret_rise, t_rise = swe.rise_trans(
            jd - 0.5, swe.SUN, swe.CALC_RISE, geopos, atpress, attemp, swe.FLG_SWIEPH
        )
        ret_set, t_set = swe.rise_trans(
            jd - 0.5, swe.SUN, swe.CALC_SET, geopos, atpress, attemp, swe.FLG_SWIEPH
        )
        # Next sunrise (defines end of night)
        ret_rise2, t_rise2 = swe.rise_trans(
            jd + 0.25, swe.SUN, swe.CALC_RISE, geopos, atpress, attemp, swe.FLG_SWIEPH
        )

        if ret_rise != 0 or ret_set != 0:
            raise ValueError("rise_trans failed")

        jd_sunrise  = t_rise[0]
        jd_sunset   = t_set[0]
        jd_sunrise2 = t_rise2[0] if ret_rise2 == 0 else jd_sunrise + 1.0

    except Exception:
        # Fallback: approximate 6 AM sunrise / 6 PM sunset
        base = math.floor(jd - 0.5) + 0.5  # previous midnight
        jd_sunrise  = base + 6 / 24.0
        jd_sunset   = base + 18 / 24.0
        jd_sunrise2 = jd_sunrise + 1.0

    # Day or night birth?
    is_day = jd_sunrise <= jd <= jd_sunset

    weekday = utc_dt.weekday()          # Mon=0 … Sun=6
    day_portion, night_portion = GULIKA_PORTIONS.get(weekday, (5, 7))

    if is_day:
        portion   = day_portion
        duration  = jd_sunset - jd_sunrise
        start_ref = jd_sunrise
    else:
        portion   = night_portion
        duration  = jd_sunrise2 - jd_sunset
        start_ref = jd_sunset

    # JD at start of Gulika's portion
    gulika_jd = start_ref + (portion - 1) * (duration / 8.0)

    # Ascendant at that moment = Gulika's longitude
    cusps, ascmc = swe.houses(gulika_jd, lat, lng, b'P')
    tropical_asc = ascmc[0]
    ayanamsha_at_gulika = swe.get_ayanamsa_ut(gulika_jd)
    return round((tropical_asc - ayanamsha_at_gulika) % 360, 4)


# ---------------------------------------------------------------------------
# Main chart calculation entry point
# ---------------------------------------------------------------------------

def calculate_full_chart(
    utc_dt: datetime,
    lat: float,
    lng: float,
    ayanamsha: str = "lahiri"
) -> Dict:
    """Calculate complete Vedic birth chart."""
    set_ayanamsha(ayanamsha)
    jd = datetime_to_jd(utc_dt)
    ayanamsha_val = swe.get_ayanamsa_ut(jd)

    lagna_lon = calculate_lagna(jd, lat, lng)
    planet_positions = get_planet_positions(jd)
    houses, planets = assign_whole_sign_houses(lagna_lon, planet_positions)
    nav_lagna, nav_planets = calculate_navamsa(lagna_lon, planet_positions)

    lagna_rashi_num, lagna_deg = longitude_to_rashi(lagna_lon)

    # --- Bhrigu Bindu ---
    moon_lon = planet_positions["Moon"]["longitude"]
    rahu_lon = planet_positions["Rahu"]["longitude"]
    bb_lon   = compute_bhrigu_bindu(moon_lon, rahu_lon)
    bb_rashi_num, bb_deg = longitude_to_rashi(bb_lon)
    bb_nakshatra, bb_pada = longitude_to_nakshatra(bb_lon)
    bb_house = ((bb_rashi_num - lagna_rashi_num) % 12) + 1

    # --- Gulika ---
    try:
        gk_lon = compute_gulika(utc_dt, jd, lat, lng)
    except Exception:
        gk_lon = 0.0
    gk_rashi_num, gk_deg = longitude_to_rashi(gk_lon)
    gk_nakshatra, gk_pada = longitude_to_nakshatra(gk_lon)
    gk_house = ((gk_rashi_num - lagna_rashi_num) % 12) + 1

    return {
        "julian_day": round(jd, 6),
        "ayanamsha_value": round(ayanamsha_val, 6),
        "lagna": RASHI_NAMES[lagna_rashi_num - 1],
        "lagna_degree": round(lagna_lon, 4),
        "planets": planets,
        "houses": houses,
        "navamsa_lagna": nav_lagna,
        "navamsa_planets": nav_planets,
        "moon_longitude": moon_lon,
        "bhrigu_bindu": {
            "name": "BhriguBindu",
            "longitude": bb_lon,
            "sign": RASHI_NAMES[bb_rashi_num - 1],
            "sign_num": bb_rashi_num,
            "degree_in_sign": round(bb_deg, 4),
            "house": bb_house,
            "nakshatra": bb_nakshatra,
            "nakshatra_pada": bb_pada,
        },
        "gulika": {
            "name": "Gulika",
            "longitude": gk_lon,
            "sign": RASHI_NAMES[gk_rashi_num - 1],
            "sign_num": gk_rashi_num,
            "degree_in_sign": round(gk_deg, 4),
            "house": gk_house,
            "nakshatra": gk_nakshatra,
            "nakshatra_pada": gk_pada,
        },
    }
