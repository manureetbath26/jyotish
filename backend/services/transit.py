"""
Transit chart calculations for Vedic Astrology.

Calculates current planetary transits against natal positions and
identifies favorable/unfavorable periods for different life areas.
"""

import swisseph as swe
from datetime import datetime, timedelta
import math
from typing import Dict, List, Tuple, Optional
from models.schemas import PlanetPosition

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

# Life area associations
LIFE_AREA_RULES = {
    "love_life": {
        "favorable_planets": ["Venus", "Moon", "Mercury"],
        "unfavorable_planets": ["Mars", "Saturn", "Rahu"],
        "houses": [5, 7, 12],  # 5th romance, 7th partner, 12th intimacy
        "houses_unfav": [6, 8]  # 6th conflict, 8th complications
    },
    "health": {
        "favorable_planets": ["Sun", "Moon", "Mercury"],
        "unfavorable_planets": ["Mars", "Saturn", "Rahu"],
        "houses": [1, 6],  # 1st body, 6th health issues
        "houses_unfav": [6, 8, 12]
    },
    "career": {
        "favorable_planets": ["Sun", "Jupiter", "Saturn"],
        "unfavorable_planets": ["Rahu", "Mars"],
        "houses": [10, 6],  # 10th career, 6th service
        "houses_unfav": [8, 12]
    },
    "finances": {
        "favorable_planets": ["Jupiter", "Venus", "Mercury"],
        "unfavorable_planets": ["Saturn", "Rahu", "Mars"],
        "houses": [2, 5, 11],  # 2nd wealth, 5th gains, 11th income
        "houses_unfav": [8, 12]
    },
    "family": {
        "favorable_planets": ["Moon", "Venus", "Jupiter"],
        "unfavorable_planets": ["Saturn", "Mars", "Rahu"],
        "houses": [4, 9],  # 4th family, 9th father/religion
        "houses_unfav": [6, 8, 12]
    }
}

# ---------------------------------------------------------------------------
# Interpretation tables (Vedic astrology)
# ---------------------------------------------------------------------------

# What each planet signifies for each life area when transiting favorably
PLANET_FAVORABLE_MEANINGS: Dict[str, Dict[str, str]] = {
    "Sun": {
        "love_life":  "Sun boosts your charisma and confidence in relationships. Your natural magnetism draws admiration.",
        "health":     "Sun strengthens vitality and immunity. Energy levels are high; an excellent time to start health routines.",
        "career":     "Sun illuminates your professional reputation. Authority figures notice your work; recognition and promotion are likely.",
        "finances":   "Sun supports steady income and government-related financial gains. Father or authority figures may assist.",
        "family":     "Sun energizes family leadership and paternal bonds. Father figures and elders offer support.",
    },
    "Moon": {
        "love_life":  "Moon heightens emotional sensitivity and romantic intuition. Deep emotional bonding is possible.",
        "health":     "Moon stabilises mental wellbeing. Sleep improves and emotional stress reduces significantly.",
        "career":     "Moon favours careers involving the public, hospitality, or nurturing roles. Popularity rises.",
        "finances":   "Moon supports gains through public dealings, real estate, or maternal inheritance.",
        "family":     "Moon strengthens bonds with mother and female family members. Home atmosphere becomes nurturing.",
    },
    "Mars": {
        "love_life":  "Mars adds passion and drive to romantic pursuits. Physical chemistry is heightened.",
        "health":     "Mars boosts physical strength and stamina. Good for exercise and recovery.",
        "career":     "Mars provides competitive energy. Excellent for leadership, sports, engineering, or military roles.",
        "finances":   "Mars supports bold financial moves and real-estate gains. Courage in investments pays off.",
        "family":     "Mars energises brothers and siblings. Protective instincts for family are strong.",
    },
    "Mercury": {
        "love_life":  "Mercury enhances communication in relationships. Meaningful conversations deepen understanding with partners.",
        "health":     "Mercury supports nervous system health. Mental clarity reduces anxiety and stress-related ailments.",
        "career":     "Mercury accelerates business, trade, writing, and communication. Contracts and negotiations go smoothly.",
        "finances":   "Mercury favours short-term trading, intellectual income, and business deals. Quick financial gains.",
        "family":     "Mercury improves communication within the family. Misunderstandings are resolved through dialogue.",
    },
    "Jupiter": {
        "love_life":  "Jupiter expands love and brings blessings in relationships. Marriage, engagement, or new romance is highly favoured.",
        "health":     "Jupiter protects overall health and supports liver and immune function. Recovery from illness is swift.",
        "career":     "Jupiter brings growth, promotions, and expansion of professional opportunities. Teachers or mentors assist.",
        "finances":   "Jupiter is the strongest planet for wealth. Investments, savings, and unexpected financial gains are strongly indicated.",
        "family":     "Jupiter blesses family harmony, children, and wisdom from elders. Religious or spiritual family events are likely.",
    },
    "Venus": {
        "love_life":  "Venus is the planet of love — this is one of the best periods for romance, marriage, and deep emotional connection.",
        "health":     "Venus supports hormonal balance, skin, and reproductive health. Beauty and wellbeing are enhanced.",
        "career":     "Venus favours creative fields, fashion, arts, luxury, and diplomacy. Charm opens professional doors.",
        "finances":   "Venus brings luxury purchases, artistic income, and material comforts. Financial pleasure is indicated.",
        "family":     "Venus promotes love, peace, and beauty in home life. Relationships with spouse and women in family improve.",
    },
    "Saturn": {
        "love_life":  "Saturn brings stable, long-term commitment. While slow, relationships formed now are built to last.",
        "health":     "Saturn rewards disciplined health habits. Chronic conditions can be managed through sustained effort.",
        "career":     "Saturn rewards hard work with lasting career progress. Long-term projects and structured roles thrive.",
        "finances":   "Saturn supports disciplined saving and long-term investments. Frugality now brings future security.",
        "family":     "Saturn strengthens family responsibilities and respect for elders. Commitment to family duties is rewarded.",
    },
    "Rahu": {
        "love_life":  "Rahu creates unconventional romantic opportunities. Foreign or unusual connections may arise.",
        "health":     "Rahu supports alternative or unconventional healing methods. Sudden improvements are possible.",
        "career":     "Rahu accelerates ambition and foreign career opportunities. Technology and innovation sectors benefit.",
        "finances":   "Rahu can bring sudden, unexpected financial gains through unconventional means.",
        "family":     "Rahu may bring in foreign or unconventional family influences. New family connections are possible.",
    },
}

# What each planet signifies for each life area when transiting unfavorably
PLANET_UNFAVORABLE_MEANINGS: Dict[str, Dict[str, str]] = {
    "Mars": {
        "love_life":  "Mars increases arguments, impatience, and aggression in relationships. Avoid confrontations; anger can damage bonds.",
        "health":     "Mars raises risk of accidents, fevers, inflammation, and injuries. Avoid reckless physical activity.",
        "career":     "Mars creates conflicts with colleagues or superiors. Impulsive decisions can derail progress.",
        "finances":   "Mars risks hasty financial decisions, losses from overconfidence, and unexpected expenses.",
        "family":     "Mars stirs conflicts with brothers and male family members. Heated arguments are likely.",
    },
    "Saturn": {
        "love_life":  "Saturn creates distance, delays, and coldness in relationships. Loneliness or separation may be felt.",
        "health":     "Saturn weakens immunity, causes fatigue, and may trigger chronic ailments. Conserve energy.",
        "career":     "Saturn brings obstacles, delays, and hard lessons at work. Patience and perseverance are essential.",
        "finances":   "Saturn restricts cash flow, brings unexpected bills, and warns against risky investments.",
        "family":     "Saturn creates burdens, grief, or separation in family matters. Responsibilities feel heavy.",
    },
    "Rahu": {
        "love_life":  "Rahu creates confusion, obsession, and deception in relationships. Hidden agendas or illusions may surface.",
        "health":     "Rahu brings mysterious ailments, mental unrest, and anxiety. Seek professional guidance for unusual symptoms.",
        "career":     "Rahu causes sudden disruptions, instability, and deceptive colleagues. Verify everything carefully.",
        "finances":   "Rahu risks financial fraud, unexpected losses, and poor judgement in investments. Be very cautious.",
        "family":     "Rahu can cause hidden conflicts, misunderstandings, and sudden changes in family dynamics.",
    },
    "Sun": {
        "love_life":  "Sun's ego can create power struggles and pride issues in relationships. Avoid being domineering.",
        "health":     "Sun's harsh energy may cause headaches, eye strain, or fever. Rest and stay hydrated.",
        "career":     "Sun can make authority figures difficult. Conflicts with bosses or government bodies are possible.",
        "finances":   "Sun can bring financial ego-driven decisions. Avoid overspending on status symbols.",
        "family":     "Sun may create conflicts with father or authority figures at home.",
    },
    "Moon": {
        "love_life":  "Moon creates emotional volatility and mood swings in relationships. Oversensitivity can cause issues.",
        "health":     "Moon disturbs sleep, causes water retention, and increases emotional instability.",
        "career":     "Moon brings instability and inconsistency at work. Avoid making important decisions on impulse.",
        "finances":   "Moon causes impulsive spending and financial instability tied to emotional states.",
        "family":     "Moon creates tension with mother or maternal figures. Emotional misunderstandings at home.",
    },
    "Mercury": {
        "love_life":  "Mercury causes miscommunication and misunderstandings in relationships. Think before speaking.",
        "health":     "Mercury may trigger nervous system issues, anxiety, or skin problems. Mental rest is important.",
        "career":     "Mercury creates communication errors, contract disputes, and travel delays. Double-check everything.",
        "finances":   "Mercury risks poor financial decisions, fraudulent dealings, and contract disputes.",
        "family":     "Mercury causes arguments and miscommunication within family. Listen more, talk less.",
    },
    "Venus": {
        "love_life":  "Venus's affliction can bring jealousy, indulgence, and relationship dissatisfaction.",
        "health":     "Venus may cause hormonal imbalances, skin issues, or overindulgence affecting health.",
        "career":     "Venus can cause laziness, over-reliance on charm, and conflicts in creative fields.",
        "finances":   "Venus risks overspending on luxuries, financial excess, and poor material judgements.",
        "family":     "Venus can create disputes over wealth, possessions, or aesthetic differences in family.",
    },
    "Jupiter": {
        "love_life":  "Jupiter's affliction brings overconfidence and unrealistic expectations in relationships.",
        "health":     "Jupiter may cause excess — weight gain, liver overload, or overeating. Moderation is key.",
        "career":     "Jupiter's affliction can lead to overexpansion, poor judgement, and failed big plans.",
        "finances":   "Jupiter afflicted risks overconfidence in investments and expansion beyond means.",
        "family":     "Jupiter afflicted may cause disputes with elders, religious differences, or family overreach.",
    },
}

# Practical guidance per life area and type
PERIOD_GUIDANCE: Dict[str, Dict[str, List[str]]] = {
    "love_life": {
        "favorable": [
            "Ideal time to express your feelings and deepen romantic bonds.",
            "Consider proposing, committing, or rekindling a relationship.",
            "Social outings and romantic gestures will be well-received.",
            "New romantic connections made now carry long-term potential.",
        ],
        "unfavorable": [
            "Avoid major relationship decisions — wait for a better period.",
            "Practice patience; misunderstandings will pass if not escalated.",
            "Focus on self-reflection and what you want in a relationship.",
            "If tensions arise, take space rather than confronting impulsively.",
        ],
    },
    "health": {
        "favorable": [
            "Start new health routines, diets, or fitness plans now.",
            "A supportive period for health-related efforts and treatments.",
            "Energy is high — leverage it for physical and mental wellbeing.",
            "This is a good time for preventive health check-ups.",
        ],
        "unfavorable": [
            "Rest adequately and avoid overexertion during this period.",
            "Be mindful of accidents, infections, and chronic conditions.",
            "Focus on stress management and mental health practices.",
            "Gentle, restorative activities like yoga and meditation are especially beneficial now.",
        ],
    },
    "career": {
        "favorable": [
            "Apply for promotions, new roles, or business opportunities.",
            "Launch projects, sign contracts, and pitch important ideas.",
            "Visibility with superiors is high — make your contributions count.",
            "Network actively; introductions made now can be career-defining.",
        ],
        "unfavorable": [
            "Avoid confrontations with superiors or colleagues.",
            "Hold off on major career decisions, resignations, or launches.",
            "Focus on completing existing work rather than starting new projects.",
            "Stay low-profile and document your work carefully.",
        ],
    },
    "finances": {
        "favorable": [
            "Invest, save, or make important financial commitments now.",
            "Negotiate salary, close business deals, or expand revenue streams.",
            "Long-term financial planning made now will prove fruitful.",
            "Property, stocks, or assets purchased now have growth potential.",
        ],
        "unfavorable": [
            "Avoid risky investments, large purchases, or speculation.",
            "Review contracts carefully before signing financial agreements.",
            "Build a financial buffer; unexpected expenses may arise.",
            "This is a better time to audit spending than to expand.",
        ],
    },
    "family": {
        "favorable": [
            "Organise family gatherings, celebrations, or important discussions.",
            "Resolve long-standing family differences — the atmosphere is receptive.",
            "Home improvements or property decisions are well-supported.",
            "Strengthening bonds with parents and elders brings lasting rewards.",
        ],
        "unfavorable": [
            "Avoid confrontational family discussions during this period.",
            "Be patient with difficult family members rather than reacting.",
            "Postpone major family decisions (property, inheritance, moves).",
            "Focus on your own inner stability as family dynamics settle.",
        ],
    },
}

# Dasha lords effectiveness (some planets are more powerful in certain areas)
DASHA_EFFECTIVENESS = {
    "Sun": ["career", "health"],
    "Moon": ["love_life", "health", "family"],
    "Mars": ["career", "finances"],
    "Mercury": ["career", "finances", "love_life"],
    "Jupiter": ["finances", "family", "love_life"],
    "Venus": ["love_life", "finances", "family"],
    "Saturn": ["career", "health"],
    "Rahu": [],  # Generally unfavorable
    "Ketu": []   # Generally unfavorable
}


def compute_rating(period_type: str, strength: str) -> Tuple[int, str]:
    """
    Map period type + strength to a 1-5 rating.

    Returns:
        (rating, label) e.g. (5, "Very Good")
    """
    if period_type == "favorable":
        if strength == "strong":
            return (5, "Very Good")
        return (4, "Good")
    if period_type == "unfavorable":
        if strength == "strong":
            return (1, "Very Challenging")
        return (2, "Challenging")
    return (3, "Neutral")


def build_period_interpretation(
    life_area: str,
    period_type: str,
    active_planets: List[str],
    strength: str,
    duration_days: int,
) -> Dict[str, str]:
    """
    Generate a human-readable description and guidance for a transit period.

    Returns:
        {"description": "...", "guidance": "..."}
    """
    meanings_table = (
        PLANET_FAVORABLE_MEANINGS if period_type == "favorable"
        else PLANET_UNFAVORABLE_MEANINGS
    )

    # Collect planet-specific meanings
    planet_sentences = []
    for planet in active_planets:
        meaning = meanings_table.get(planet, {}).get(life_area)
        if meaning:
            planet_sentences.append(f"• {planet}: {meaning}")

    # Duration descriptor
    if duration_days <= 7:
        duration_desc = "a brief"
    elif duration_days <= 21:
        duration_desc = "a short"
    elif duration_days <= 60:
        duration_desc = "a moderate"
    else:
        duration_desc = "an extended"

    # Strength descriptor
    strength_desc = {"strong": "strong", "moderate": "noticeable", "weak": "mild"}.get(strength, "moderate")

    life_area_labels = {
        "love_life": "love life", "health": "health", "career": "career",
        "finances": "finances", "family": "family relationships"
    }
    area_label = life_area_labels.get(life_area, life_area)

    if period_type == "favorable":
        opening = f"This is {duration_desc} window of {strength_desc} positive planetary support for your {area_label}."
    else:
        opening = f"This is {duration_desc} period of {strength_desc} planetary tension affecting your {area_label}."

    # Combine description
    if planet_sentences:
        description = opening + "\n" + "\n".join(planet_sentences)
    else:
        description = opening

    # Guidance
    guidance_options = PERIOD_GUIDANCE.get(life_area, {}).get(period_type, [])
    guidance = " ".join(guidance_options[:2]) if guidance_options else ""

    return {"description": description, "guidance": guidance}


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


def calculate_angular_distance(lon1: float, lon2: float) -> float:
    """
    Calculate shortest angular distance between two longitudes.
    Range: 0-180 degrees
    """
    diff = abs(lon1 - lon2)
    if diff > 180:
        diff = 360 - diff
    return diff


def is_conjunction(
    transit_lon: float, natal_lon: float,
    orb: float = 8.0
) -> bool:
    """Check if transit planet is in conjunction with natal position."""
    distance = calculate_angular_distance(transit_lon, natal_lon)
    return distance <= orb


def is_aspect(
    transit_lon: float, natal_lon: float,
    aspect_type: str, orb: float = 8.0
) -> bool:
    """
    Check if transit planet is in major aspect with natal position.

    Aspect types: "opposition" (180°), "square" (90°), "trine" (120°), "sextile" (60°)
    """
    aspect_angles = {
        "opposition": 180,
        "square": 90,
        "trine": 120,
        "sextile": 60,
        "quincunx": 150
    }

    if aspect_type not in aspect_angles:
        return False

    target_angle = aspect_angles[aspect_type]
    distance = calculate_angular_distance(transit_lon, natal_lon)

    return abs(distance - target_angle) <= orb


def assess_period_strength(
    planet_name: str,
    life_area: str,
    current_dasha: Optional[str] = None,
    is_favorable_transit: bool = True,
    days_until_change: int = 1
) -> str:
    """
    Assess the strength of a favorable/unfavorable period.

    Returns: "strong" | "moderate" | "weak"
    """
    # Dasha effectiveness boost
    dasha_boost = planet_name in DASHA_EFFECTIVENESS.get(current_dasha or "", [])

    # Recency factor (more imminent = stronger)
    recency_bonus = days_until_change <= 7

    if is_favorable_transit:
        if dasha_boost and recency_bonus:
            return "strong"
        elif dasha_boost or recency_bonus:
            return "moderate"
        else:
            return "weak"
    else:
        if dasha_boost and recency_bonus:
            return "strong"
        elif dasha_boost or recency_bonus:
            return "moderate"
        else:
            return "weak"


def calculate_transit_periods(
    natal_chart: Dict,
    start_date: datetime,
    end_date: datetime,
    ayanamsha_val: float,
    current_dasha: Optional[str] = None,
    check_interval_days: int = 1
) -> Dict[str, List[Dict]]:
    """
    Calculate favorable and unfavorable periods for each life area.

    Args:
        natal_chart: ChartResponse data with planets and houses
        start_date: Start date for transit analysis
        end_date: End date for transit analysis
        ayanamsha_val: Ayanamsha value for sidereal calculations
        current_dasha: Current major dasha planet name (optional)
        check_interval_days: Interval for checking transits (default: daily)

    Returns:
        Dict with life areas as keys, each containing list of periods
    """
    timeline = {area: [] for area in LIFE_AREA_RULES.keys()}

    # Build natal planet position map
    natal_positions = {}
    for planet in natal_chart["planets"]:
        natal_positions[planet["name"]] = {
            "longitude": planet["longitude"],
            "house": planet["house"]
        }

    current_date = start_date
    previous_assessment: Dict[str, Dict] = {}
    # Track period start per life area independently
    period_starts: Dict[str, datetime] = {area: start_date for area in LIFE_AREA_RULES}

    while current_date <= end_date:
        current_assessment: Dict[str, Dict] = {}

        # Compute transit positions once per day (not per life area)
        transit_positions: Dict[str, float] = {}
        for planet_name in PLANET_NAMES.values():
            planet_nums = [k for k, v in PLANET_NAMES.items() if v == planet_name]
            if not planet_nums:
                continue
            transit_positions[planet_name] = get_planet_position_on_date(
                planet_nums[0], current_date, ayanamsha_val
            )

        # Check each life area
        for life_area, rules in LIFE_AREA_RULES.items():
            favorable_count = 0
            unfavorable_count = 0
            active_planets = []
            transit_details_day = []

            for planet_name, transit_lon in transit_positions.items():
                if planet_name not in natal_positions:
                    continue

                natal_lon = natal_positions[planet_name]["longitude"]
                natal_house = natal_positions[planet_name]["house"]

                conjoining = is_conjunction(transit_lon, natal_lon)
                in_favorable_house = natal_house in rules["houses"]
                in_unfavorable_house = natal_house in rules.get("houses_unfav", [])

                # Determine transit rashi
                transit_rashi_num = int(transit_lon / 30)
                transit_rashi = RASHI_NAMES[transit_rashi_num % 12]
                transit_house = ((transit_rashi_num - int(natal_positions.get("Sun", natal_positions.get(list(natal_positions.keys())[0]))["longitude"] / 30)) % 12) + 1

                if (conjoining or in_favorable_house) and planet_name in rules["favorable_planets"]:
                    favorable_count += 1
                    active_planets.append((planet_name, "favorable"))
                    reason = f"conjunct natal {planet_name}" if conjoining else f"transiting house {natal_house}"
                    transit_details_day.append({
                        "planet": planet_name,
                        "influence": "favorable",
                        "transit_rashi": transit_rashi,
                        "transit_degree": round(transit_lon % 30, 1),
                        "natal_house": natal_house,
                        "reason": reason,
                    })

                if (conjoining or in_unfavorable_house) and planet_name in rules["unfavorable_planets"]:
                    unfavorable_count += 1
                    active_planets.append((planet_name, "unfavorable"))
                    reason = f"conjunct natal {planet_name}" if conjoining else f"transiting house {natal_house}"
                    transit_details_day.append({
                        "planet": planet_name,
                        "influence": "unfavorable",
                        "transit_rashi": transit_rashi,
                        "transit_degree": round(transit_lon % 30, 1),
                        "natal_house": natal_house,
                        "reason": reason,
                    })

            if favorable_count > unfavorable_count:
                status = "favorable"
            elif unfavorable_count > favorable_count:
                status = "unfavorable"
            else:
                status = "neutral"

            current_assessment[life_area] = {
                "status": status,
                "planets": active_planets,
                "transit_details": transit_details_day,
            }

        # Detect status changes per life area and record completed periods
        for life_area, assessment in current_assessment.items():
            prev = previous_assessment.get(life_area)
            if prev is None:
                period_starts[life_area] = current_date
            elif prev["status"] != assessment["status"]:
                # Close out the previous period
                prev_status = prev["status"]
                if prev_status in ("favorable", "unfavorable"):
                    period_end = current_date - timedelta(days=1)
                    planets_list = prev.get("planets", [])
                    primary_planet = planets_list[0][0] if planets_list else "Moon"
                    active_planet_names = [p[0] for p in planets_list]
                    dur = max(1, (period_end - period_starts[life_area]).days + 1)
                    strength = assess_period_strength(
                        primary_planet, life_area, current_dasha,
                        prev_status == "favorable"
                    )
                    interp = build_period_interpretation(
                        life_area, prev_status, active_planet_names, strength, dur
                    )
                    rating, rating_label = compute_rating(prev_status, strength)
                    timeline[life_area].append({
                        "start_date": period_starts[life_area].strftime("%Y-%m-%d"),
                        "end_date": period_end.strftime("%Y-%m-%d"),
                        "type": prev_status,
                        "duration_days": dur,
                        "strength": strength,
                        "active_planets": active_planet_names,
                        "description": interp["description"],
                        "guidance": interp["guidance"],
                        "rating": rating,
                        "rating_label": rating_label,
                        "transit_details": prev.get("transit_details", []),
                    })
                period_starts[life_area] = current_date

        previous_assessment = current_assessment
        current_date += timedelta(days=check_interval_days)

    # Record the final open period for each life area
    for life_area, assessment in current_assessment.items():
        if assessment["status"] in ("favorable", "unfavorable"):
            planets_list = assessment.get("planets", [])
            primary_planet = planets_list[0][0] if planets_list else "Moon"
            active_planet_names = [p[0] for p in planets_list]
            dur = max(1, (end_date - period_starts[life_area]).days + 1)
            strength = assess_period_strength(
                primary_planet, life_area, current_dasha,
                assessment["status"] == "favorable"
            )
            interp = build_period_interpretation(
                life_area, assessment["status"], active_planet_names, strength, dur
            )
            rating, rating_label = compute_rating(assessment["status"], strength)
            timeline[life_area].append({
                "start_date": period_starts[life_area].strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "type": assessment["status"],
                "duration_days": dur,
                "strength": strength,
                "active_planets": active_planet_names,
                "description": interp["description"],
                "guidance": interp["guidance"],
                "rating": rating,
                "rating_label": rating_label,
                "transit_details": assessment.get("transit_details", []),
            })

    return timeline


def get_next_major_transit(
    natal_chart: Dict,
    from_date: datetime,
    ayanamsha_val: float,
    months_ahead: int = 12
) -> List[Dict]:
    """
    Get the next major transits (conjunctions, aspects) from a given date.

    Returns:
        List of major transit events
    """
    major_transits = []

    end_date = from_date + timedelta(days=30 * months_ahead)
    current_date = from_date

    natal_positions = {}
    for planet in natal_chart["planets"]:
        natal_positions[planet["name"]] = planet["longitude"]

    previous_conjunctions = set()

    while current_date <= end_date:
        # Check for conjunctions
        for planet_name, natal_lon in natal_positions.items():
            planet_nums = [k for k, v in PLANET_NAMES.items() if v == planet_name]
            if not planet_nums:
                continue  # Skip Ketu and any other untracked planets
            planet_num = planet_nums[0]
            transit_lon = get_planet_position_on_date(planet_num, current_date, ayanamsha_val)

            if is_conjunction(transit_lon, natal_lon, orb=3.0):
                conjunction_key = f"{planet_name}_{natal_lon:.1f}"
                if conjunction_key not in previous_conjunctions:
                    major_transits.append({
                        "date": current_date.strftime("%Y-%m-%d"),
                        "type": "conjunction",
                        "planet": planet_name,
                        "natal_position": round(natal_lon, 2),
                        "transit_position": round(transit_lon, 2)
                    })
                    previous_conjunctions.add(conjunction_key)

        current_date += timedelta(days=1)

    return major_transits
