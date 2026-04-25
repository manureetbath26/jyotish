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

# ---------------------------------------------------------------------------
# Classical Gochar (Transit) Rules — from Phaladeepika & BPHS
# Each planet has specific houses where it gives favorable results when
# transiting from the Lagna (Ascendant).
# ---------------------------------------------------------------------------
CLASSICAL_FAVORABLE_HOUSES: Dict[str, set] = {
    "Sun":     {3, 6, 10, 11},
    "Moon":    {1, 3, 6, 10, 11},
    "Mars":    {3, 6, 10, 11},
    "Mercury": {2, 4, 6, 8, 10, 11},
    "Jupiter": {2, 5, 7, 9, 11},
    "Venus":   {1, 2, 3, 4, 5, 8, 9, 11, 12},
    "Saturn":  {3, 6, 11},
    "Rahu":    {3, 6, 10, 11},
}

# Karaka (significator) planets per life area.
# Karakas get a score bonus and are NEVER counted as unfavorable for their area.
LIFE_AREA_RULES = {
    "love_life": {
        "karakas": ["Venus", "Moon", "Jupiter"],
    },
    "health": {
        "karakas": ["Sun", "Moon", "Mars"],
    },
    "career": {
        "karakas": ["Sun", "Jupiter", "Saturn", "Mercury"],
    },
    "finances": {
        "karakas": ["Jupiter", "Venus", "Mercury"],
    },
    "family": {
        "karakas": ["Moon", "Venus", "Jupiter"],
    },
    "self_confidence": {
        "karakas": ["Sun", "Mars", "Jupiter"],
    },
}

# Karaka multiplier: karakas get 1.5x score when favorably placed
KARAKA_BONUS: float = 1.5

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
        "self_confidence": "Sun is the natural significator of self and confidence. This is one of the best periods for personal empowerment, leadership, and asserting your identity.",
    },
    "Moon": {
        "love_life":  "Moon heightens emotional sensitivity and romantic intuition. Deep emotional bonding is possible.",
        "health":     "Moon stabilises mental wellbeing. Sleep improves and emotional stress reduces significantly.",
        "career":     "Moon favours careers involving the public, hospitality, or nurturing roles. Popularity rises.",
        "finances":   "Moon supports gains through public dealings, real estate, or maternal inheritance.",
        "family":     "Moon strengthens bonds with mother and female family members. Home atmosphere becomes nurturing.",
        "self_confidence": "Moon brings emotional stability and inner peace. Self-awareness deepens and intuition guides confident decision-making.",
    },
    "Mars": {
        "love_life":  "Mars adds passion and drive to romantic pursuits. Physical chemistry is heightened.",
        "health":     "Mars boosts physical strength and stamina. Good for exercise and recovery.",
        "career":     "Mars provides competitive energy. Excellent for leadership, sports, engineering, or military roles.",
        "finances":   "Mars supports bold financial moves and real-estate gains. Courage in investments pays off.",
        "family":     "Mars energises brothers and siblings. Protective instincts for family are strong.",
        "self_confidence": "Mars ignites courage, willpower, and assertiveness. You feel bold, decisive, and ready to take on challenges head-on.",
    },
    "Mercury": {
        "love_life":  "Mercury enhances communication in relationships. Meaningful conversations deepen understanding with partners.",
        "health":     "Mercury supports nervous system health. Mental clarity reduces anxiety and stress-related ailments.",
        "career":     "Mercury accelerates business, trade, writing, and communication. Contracts and negotiations go smoothly.",
        "finances":   "Mercury favours short-term trading, intellectual income, and business deals. Quick financial gains.",
        "family":     "Mercury improves communication within the family. Misunderstandings are resolved through dialogue.",
        "self_confidence": "Mercury sharpens intellect and communication skills. You express yourself articulately, boosting self-assurance in social situations.",
    },
    "Jupiter": {
        "love_life":  "Jupiter expands love and brings blessings in relationships. Marriage, engagement, or new romance is highly favoured.",
        "health":     "Jupiter protects overall health and supports liver and immune function. Recovery from illness is swift.",
        "career":     "Jupiter brings growth, promotions, and expansion of professional opportunities. Teachers or mentors assist.",
        "finances":   "Jupiter is the strongest planet for wealth. Investments, savings, and unexpected financial gains are strongly indicated.",
        "family":     "Jupiter blesses family harmony, children, and wisdom from elders. Religious or spiritual family events are likely.",
        "self_confidence": "Jupiter expands wisdom, optimism, and self-belief. You feel guided by a higher purpose and radiate natural authority and grace.",
    },
    "Venus": {
        "love_life":  "Venus is the planet of love — this is one of the best periods for romance, marriage, and deep emotional connection.",
        "health":     "Venus supports hormonal balance, skin, and reproductive health. Beauty and wellbeing are enhanced.",
        "career":     "Venus favours creative fields, fashion, arts, luxury, and diplomacy. Charm opens professional doors.",
        "finances":   "Venus brings luxury purchases, artistic income, and material comforts. Financial pleasure is indicated.",
        "family":     "Venus promotes love, peace, and beauty in home life. Relationships with spouse and women in family improve.",
        "self_confidence": "Venus enhances personal charm, attractiveness, and social confidence. You feel comfortable in your own skin and draw people towards you.",
    },
    "Saturn": {
        "love_life":  "Saturn brings stable, long-term commitment. While slow, relationships formed now are built to last.",
        "health":     "Saturn rewards disciplined health habits. Chronic conditions can be managed through sustained effort.",
        "career":     "Saturn rewards hard work with lasting career progress. Long-term projects and structured roles thrive.",
        "finances":   "Saturn supports disciplined saving and long-term investments. Frugality now brings future security.",
        "family":     "Saturn strengthens family responsibilities and respect for elders. Commitment to family duties is rewarded.",
        "self_confidence": "Saturn builds quiet, earned confidence through discipline and perseverance. Self-worth grows from overcoming real challenges.",
    },
    "Rahu": {
        "love_life":  "Rahu creates unconventional romantic opportunities. Foreign or unusual connections may arise.",
        "health":     "Rahu supports alternative or unconventional healing methods. Sudden improvements are possible.",
        "career":     "Rahu accelerates ambition and foreign career opportunities. Technology and innovation sectors benefit.",
        "finances":   "Rahu can bring sudden, unexpected financial gains through unconventional means.",
        "family":     "Rahu may bring in foreign or unconventional family influences. New family connections are possible.",
        "self_confidence": "Rahu amplifies ambition and desire for recognition. You feel driven to break boundaries and reinvent yourself boldly.",
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
        "self_confidence": "Mars creates aggression, recklessness, and false bravado. Impulsive actions may lead to embarrassment or conflict.",
    },
    "Saturn": {
        "love_life":  "Saturn creates distance, delays, and coldness in relationships. Loneliness or separation may be felt.",
        "health":     "Saturn weakens immunity, causes fatigue, and may trigger chronic ailments. Conserve energy.",
        "career":     "Saturn brings obstacles, delays, and hard lessons at work. Patience and perseverance are essential.",
        "finances":   "Saturn restricts cash flow, brings unexpected bills, and warns against risky investments.",
        "family":     "Saturn creates burdens, grief, or separation in family matters. Responsibilities feel heavy.",
        "self_confidence": "Saturn brings self-doubt, fear of failure, and feelings of inadequacy. Patience is key — this period builds resilience through hardship.",
    },
    "Rahu": {
        "love_life":  "Rahu creates confusion, obsession, and deception in relationships. Hidden agendas or illusions may surface.",
        "health":     "Rahu brings mysterious ailments, mental unrest, and anxiety. Seek professional guidance for unusual symptoms.",
        "career":     "Rahu causes sudden disruptions, instability, and deceptive colleagues. Verify everything carefully.",
        "finances":   "Rahu risks financial fraud, unexpected losses, and poor judgement in investments. Be very cautious.",
        "family":     "Rahu can cause hidden conflicts, misunderstandings, and sudden changes in family dynamics.",
        "self_confidence": "Rahu creates identity confusion, obsessive comparison with others, and inflated ego. Ground yourself and avoid chasing illusions of grandeur.",
    },
    "Sun": {
        "love_life":  "Sun's ego can create power struggles and pride issues in relationships. Avoid being domineering.",
        "health":     "Sun's harsh energy may cause headaches, eye strain, or fever. Rest and stay hydrated.",
        "career":     "Sun can make authority figures difficult. Conflicts with bosses or government bodies are possible.",
        "finances":   "Sun can bring financial ego-driven decisions. Avoid overspending on status symbols.",
        "family":     "Sun may create conflicts with father or authority figures at home.",
        "self_confidence": "Sun afflicted creates arrogance, ego clashes, and a need for constant validation. Humility is the antidote.",
    },
    "Moon": {
        "love_life":  "Moon creates emotional volatility and mood swings in relationships. Oversensitivity can cause issues.",
        "health":     "Moon disturbs sleep, causes water retention, and increases emotional instability.",
        "career":     "Moon brings instability and inconsistency at work. Avoid making important decisions on impulse.",
        "finances":   "Moon causes impulsive spending and financial instability tied to emotional states.",
        "family":     "Moon creates tension with mother or maternal figures. Emotional misunderstandings at home.",
        "self_confidence": "Moon creates emotional fragility, self-pity, and indecisiveness. Inner stability wavers and overthinking erodes confidence.",
    },
    "Mercury": {
        "love_life":  "Mercury causes miscommunication and misunderstandings in relationships. Think before speaking.",
        "health":     "Mercury may trigger nervous system issues, anxiety, or skin problems. Mental rest is important.",
        "career":     "Mercury creates communication errors, contract disputes, and travel delays. Double-check everything.",
        "finances":   "Mercury risks poor financial decisions, fraudulent dealings, and contract disputes.",
        "family":     "Mercury causes arguments and miscommunication within family. Listen more, talk less.",
        "self_confidence": "Mercury afflicted brings nervousness, overthinking, and inability to express yourself clearly. Self-doubt creeps in through mental fog.",
    },
    "Venus": {
        "love_life":  "Venus's affliction can bring jealousy, indulgence, and relationship dissatisfaction.",
        "health":     "Venus may cause hormonal imbalances, skin issues, or overindulgence affecting health.",
        "career":     "Venus can cause laziness, over-reliance on charm, and conflicts in creative fields.",
        "finances":   "Venus risks overspending on luxuries, financial excess, and poor material judgements.",
        "family":     "Venus can create disputes over wealth, possessions, or aesthetic differences in family.",
        "self_confidence": "Venus afflicted makes you overly dependent on external validation and appearance. Self-worth becomes tied to others' approval.",
    },
    "Jupiter": {
        "love_life":  "Jupiter's affliction brings overconfidence and unrealistic expectations in relationships.",
        "health":     "Jupiter may cause excess — weight gain, liver overload, or overeating. Moderation is key.",
        "career":     "Jupiter's affliction can lead to overexpansion, poor judgement, and failed big plans.",
        "finances":   "Jupiter afflicted risks overconfidence in investments and expansion beyond means.",
        "family":     "Jupiter afflicted may cause disputes with elders, religious differences, or family overreach.",
        "self_confidence": "Jupiter afflicted creates overconfidence, poor judgement, and a false sense of invincibility. Stay grounded and realistic.",
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
    "self_confidence": {
        "favorable": [
            "Take initiative on projects and decisions you've been postponing.",
            "This is an excellent time to assert yourself and step into leadership.",
            "Public speaking, presentations, and self-promotion are well-favoured.",
            "Trust your instincts — your judgement is sharp during this period.",
        ],
        "unfavorable": [
            "Avoid making major decisions driven by ego or insecurity.",
            "Practice self-compassion rather than harsh self-criticism.",
            "This is a period for inner work — journaling, therapy, or meditation help.",
            "Seek trusted feedback rather than relying solely on your own perspective.",
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

# ---------------------------------------------------------------------------
# Planet weight system (slower/more impactful = higher weight)
# ---------------------------------------------------------------------------
PLANET_WEIGHTS: Dict[str, float] = {
    "Saturn": 5,
    "Jupiter": 4,
    "Rahu": 4,
    "Mars": 3,
    "Sun": 2,
    "Venus": 2,
    "Mercury": 2,
    "Moon": 1,
}

# Aspect type multipliers (how strongly an aspect triggers effects)
ASPECT_MULTIPLIERS: Dict[str, float] = {
    "conjunction": 1.0,
    "opposition": 0.8,
    "trine": 0.6,
    "square": 0.5,
    "house_transit": 0.5,
}

# Dasha match multiplier applied to total period score
DASHA_BOOST_MULTIPLIER: float = 1.3


def compute_rating(period_type: str, avg_score: float) -> Tuple[int, str]:
    """
    Map period type + average weighted score to a 1-5 rating.

    Args:
        period_type: "favorable", "unfavorable", or "neutral"
        avg_score: average daily weighted score across the period

    Returns:
        (rating, label) e.g. (5, "Very Good")
    """
    if period_type == "favorable":
        if avg_score >= 8:
            return (5, "Very Good")
        return (4, "Good")
    if period_type == "unfavorable":
        if avg_score >= 8:
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
        "finances": "finances", "family": "family relationships",
        "self_confidence": "self-confidence and personal power"
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


NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

RASHI_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}


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

    # Add Ketu (Rahu + 180°)
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

        # Ketu = Rahu + 180°
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


def score_to_strength(avg_score: float) -> str:
    """
    Convert an average daily weighted score to a strength label.

    Returns: "strong" | "moderate" | "weak"
    """
    if avg_score >= 8:
        return "strong"
    elif avg_score >= 4:
        return "moderate"
    else:
        return "weak"


def find_best_aspect(
    transit_lon: float,
    natal_lon: float,
    orb: float = 8.0,
) -> Optional[Tuple[str, float]]:
    """
    Check transit longitude against a natal longitude for conjunction and
    major Vedic aspects. Returns the strongest matching aspect.

    Returns:
        (aspect_name, multiplier) or None if no aspect is within orb.
    """
    # Check conjunction first (highest multiplier)
    if is_conjunction(transit_lon, natal_lon, orb):
        return ("conjunction", ASPECT_MULTIPLIERS["conjunction"])
    # Check remaining aspects in order of strength
    for aspect_name in ("opposition", "trine", "square"):
        if is_aspect(transit_lon, natal_lon, aspect_name, orb):
            return (aspect_name, ASPECT_MULTIPLIERS[aspect_name])
    return None


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

    # Get natal lagna rashi number (0-indexed) for computing transit houses
    natal_lagna_degree = natal_chart.get("lagna_degree", 0)
    natal_lagna_rashi_num = int(natal_lagna_degree / 30)

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
    # Accumulate daily scores per period for averaging
    period_score_sums: Dict[str, float] = {area: 0.0 for area in LIFE_AREA_RULES}
    period_day_counts: Dict[str, int] = {area: 0 for area in LIFE_AREA_RULES}

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

        # Precompute transit houses (same for all life areas)
        transit_house_map: Dict[str, int] = {}
        transit_rashi_map: Dict[str, str] = {}
        for planet_name, transit_lon in transit_positions.items():
            transit_rashi_num = int(transit_lon / 30)
            transit_rashi_map[planet_name] = RASHI_NAMES[transit_rashi_num % 12]
            transit_house_map[planet_name] = ((transit_rashi_num - natal_lagna_rashi_num) % 12) + 1

        # Check for Double Transit (Jupiter + Saturn both classically favorable)
        jupiter_classically_fav = transit_house_map.get("Jupiter", 0) in CLASSICAL_FAVORABLE_HOUSES.get("Jupiter", set())
        saturn_classically_fav = transit_house_map.get("Saturn", 0) in CLASSICAL_FAVORABLE_HOUSES.get("Saturn", set())
        double_transit_active = jupiter_classically_fav and saturn_classically_fav

        # Check each life area
        for life_area, rules in LIFE_AREA_RULES.items():
            favorable_score = 0.0
            unfavorable_score = 0.0
            active_planets = []
            transit_details_day = []
            karakas = set(rules["karakas"])

            for planet_name, transit_lon in transit_positions.items():
                planet_weight = PLANET_WEIGHTS.get(planet_name, 1)
                transit_house = transit_house_map[planet_name]
                transit_rashi = transit_rashi_map[planet_name]
                is_karaka = planet_name in karakas

                # --- Classical Gochar favorability ---
                # This is the PRIMARY determinant: is this planet classically
                # favorable or unfavorable in this transit house?
                classically_favorable = transit_house in CLASSICAL_FAVORABLE_HOUSES.get(planet_name, set())

                # --- Aspect check against natal planets ---
                # Aspects add strength (higher trigger multiplier) but do NOT
                # change the favorable/unfavorable classification from Gochar.
                best_aspect_name = None
                best_aspect_mult = 0.0
                best_natal_target = None

                for nat_name, nat_info in natal_positions.items():
                    natal_lon = nat_info["longitude"]
                    orb = 8.0 if nat_name == planet_name else 5.0
                    result = find_best_aspect(transit_lon, natal_lon, orb)
                    if result and result[1] > best_aspect_mult:
                        best_aspect_name, best_aspect_mult = result
                        best_natal_target = nat_name

                # Trigger multiplier: use the HIGHER of aspect or house transit
                # This ensures planets in any house always have a meaningful score
                has_aspect = best_aspect_name is not None
                trigger_mult = max(
                    best_aspect_mult if has_aspect else 0.0,
                    ASPECT_MULTIPLIERS["house_transit"],
                )

                # Build reason string. House info is shown separately in the
                # UI ("— House N") so we don't repeat it here.
                if has_aspect:
                    reason = f"transit {planet_name} {best_aspect_name} natal {best_natal_target}"
                else:
                    reason = f"transiting house {transit_house}"

                # --- Scoring based on Classical Gochar + Karaka principle ---
                if classically_favorable:
                    # Planet in classically favorable house: POSITIVE contribution
                    karaka_mult = KARAKA_BONUS if is_karaka else 1.0
                    score = planet_weight * trigger_mult * karaka_mult
                    favorable_score += score
                    influence = "favorable"
                elif is_karaka:
                    # Karaka in classically unfavorable house:
                    # Karakas NEVER count against their own life area.
                    # They still activate the area, so count as mildly favorable.
                    score = planet_weight * trigger_mult * 0.5
                    favorable_score += score
                    influence = "favorable"
                else:
                    # Non-karaka in classically unfavorable house: NEGATIVE
                    score = planet_weight * trigger_mult
                    unfavorable_score += score
                    influence = "unfavorable"

                active_planets.append((planet_name, influence, score))
                transit_details_day.append({
                    "planet": planet_name,
                    "influence": influence,
                    "score": round(score, 2),
                    "transit_rashi": transit_rashi,
                    "transit_degree": round(transit_lon % 30, 1),
                    "transit_house": transit_house,
                    "transit_date": current_date.strftime("%Y-%m-%d"),
                    "reason": reason,
                })

            # Double Transit boost (BPHS): when Jupiter AND Saturn are both
            # classically favorable, major positive life events are indicated.
            if double_transit_active and favorable_score > 0:
                favorable_score *= 1.25

            if favorable_score > unfavorable_score:
                status = "favorable"
                day_score = favorable_score
            elif unfavorable_score > favorable_score:
                status = "unfavorable"
                day_score = unfavorable_score
            else:
                status = "neutral"
                day_score = 0.0

            # Apply dasha boost
            if current_dasha:
                dasha_planets = [p[0] for p in active_planets]
                if current_dasha in dasha_planets:
                    day_score *= DASHA_BOOST_MULTIPLIER

            # Keep only top 3 most influential planets (by score)
            active_planets.sort(key=lambda x: x[2], reverse=True)
            top_planets = active_planets[:3]
            top_planet_names = {p[0] for p in top_planets}
            top_details = [d for d in transit_details_day if d["planet"] in top_planet_names]
            top_details.sort(key=lambda d: d["score"], reverse=True)

            current_assessment[life_area] = {
                "status": status,
                "planets": top_planets,
                "transit_details": top_details,
                "day_score": day_score,
            }

        # Accumulate scores and detect status changes per life area
        for life_area, assessment in current_assessment.items():
            prev = previous_assessment.get(life_area)
            if prev is None:
                period_starts[life_area] = current_date
                period_score_sums[life_area] = assessment["day_score"]
                period_day_counts[life_area] = 1
            elif prev["status"] != assessment["status"]:
                # Close out the previous period
                prev_status = prev["status"]
                period_end = current_date - timedelta(days=1)
                dur = max(1, (period_end - period_starts[life_area]).days + 1)
                avg_score = period_score_sums[life_area] / max(1, period_day_counts[life_area])

                if prev_status in ("favorable", "unfavorable"):
                    planets_list = prev.get("planets", [])
                    active_planet_names = list(dict.fromkeys(p[0] for p in planets_list))
                    strength = score_to_strength(avg_score)
                    interp = build_period_interpretation(
                        life_area, prev_status, active_planet_names, strength, dur
                    )
                    rating, rating_label = compute_rating(prev_status, avg_score)
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
                else:
                    # Neutral period
                    timeline[life_area].append({
                        "start_date": period_starts[life_area].strftime("%Y-%m-%d"),
                        "end_date": period_end.strftime("%Y-%m-%d"),
                        "type": "neutral",
                        "duration_days": dur,
                        "strength": "moderate",
                        "active_planets": [],
                        "description": "A balanced period with no dominant planetary influence. Day-to-day results depend on your own efforts and choices.",
                        "guidance": "Use this stable window to consolidate gains, plan ahead, and maintain steady progress. Neutral periods are ideal for routine work and self-improvement.",
                        "rating": 3,
                        "rating_label": "Neutral",
                        "transit_details": [],
                    })
                # Reset for new period
                period_starts[life_area] = current_date
                period_score_sums[life_area] = assessment["day_score"]
                period_day_counts[life_area] = 1
            else:
                # Same status continues — accumulate score
                period_score_sums[life_area] += assessment["day_score"]
                period_day_counts[life_area] += 1

        previous_assessment = current_assessment
        current_date += timedelta(days=check_interval_days)

    # Record the final open period for each life area
    for life_area, assessment in current_assessment.items():
        status = assessment["status"]
        dur = max(1, (end_date - period_starts[life_area]).days + 1)
        avg_score = period_score_sums[life_area] / max(1, period_day_counts[life_area])

        if status in ("favorable", "unfavorable"):
            planets_list = assessment.get("planets", [])
            active_planet_names = list(dict.fromkeys(p[0] for p in planets_list))
            strength = score_to_strength(avg_score)
            interp = build_period_interpretation(
                life_area, status, active_planet_names, strength, dur
            )
            rating, rating_label = compute_rating(status, avg_score)
            timeline[life_area].append({
                "start_date": period_starts[life_area].strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "type": status,
                "duration_days": dur,
                "strength": strength,
                "active_planets": active_planet_names,
                "description": interp["description"],
                "guidance": interp["guidance"],
                "rating": rating,
                "rating_label": rating_label,
                "transit_details": assessment.get("transit_details", []),
            })
        else:
            timeline[life_area].append({
                "start_date": period_starts[life_area].strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "type": "neutral",
                "duration_days": dur,
                "strength": "moderate",
                "active_planets": [],
                "description": "A balanced period with no dominant planetary influence. Day-to-day results depend on your own efforts and choices.",
                "guidance": "Use this stable window to consolidate gains, plan ahead, and maintain steady progress. Neutral periods are ideal for routine work and self-improvement.",
                "rating": 3,
                "rating_label": "Neutral",
                "transit_details": [],
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


# ────────────────────────────────────────────────────────────────────────────
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
# ────────────────────────────────────────────────────────────────────────────

# Tracked planets for the per-area event cards. Order matters for display
# (slow planets first — they shape the year, fast planets fill in detail).
INGRESS_TRACKED_PLANETS = ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"]

# Per-planet maximum lookback in days when finding the most recent
# ingress prior to start_date. Slightly bigger than the planet's max
# residency in any sign (Saturn can stay ~2.5y due to retrograde loops).
LOOKBACK_DAYS_PER_PLANET: Dict[str, int] = {
    "Mars": 60,
    "Jupiter": 400,
    "Saturn": 1100,
    "Rahu": 600,
    "Ketu": 600,
}


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


# ── Per-house signification short phrases ────────────────────────────────────
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

# ── Per-planet "vibe" — positive when classically favourable, cautious when
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


_MALEFIC_PLANETS: Set[str] = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}


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

    # ── 1. House activation lead ──
    house_theme = rules.house_signification.get(to_house, "")
    if house_theme:
        parts.append(
            f"{planet} now activates your {to_house}{_ord(to_house)} house — {house_theme}."
        )
    else:
        parts.append(f"{planet} moves into your {to_house}{_ord(to_house)} house.")

    # ── 2. Why this matters for the selected area (strongest connection) ──
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

    # ── 3. Planet vibe oriented by classification ──
    vibe_pair = rules.planet_vibe.get(planet, {})
    if classification == "favorable":
        vibe_phrase = vibe_pair.get("positive", "")
        if vibe_phrase:
            parts.append(f"{planet}'s supportive flavour active here: {vibe_phrase}.")
    elif classification == "unfavorable":
        vibe_phrase = vibe_pair.get("cautious", "")
        if vibe_phrase:
            parts.append(f"{planet}'s cautious flavour active here: {vibe_phrase}.")

    # ── 4. Modifier — dusthana / upachaya colouring ──
    house_tags = rules.house_classification.get(to_house, set())
    is_malefic = planet in _MALEFIC_PLANETS
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

    # ── 5. Area lens (the hand-written area-specific line) ──
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

    For Ketu, computes from Rahu + 180°.
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

    # Step 0: lookback pass — for each tracked planet, find the date it
    # entered its CURRENT sign (i.e. the most recent ingress prior to
    # start_date). This becomes the "currently here" card so the user
    # sees what's active *right now*, not just the next ingress.
    current_placements: List[Dict] = []
    for planet in INGRESS_TRACKED_PLANETS:
        max_days = LOOKBACK_DAYS_PER_PLANET.get(planet, 90)
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
    for planet in INGRESS_TRACKED_PLANETS:
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
            })

    return events_by_area

    return major_transits
