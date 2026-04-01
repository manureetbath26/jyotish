"""
Vedic Yoga calculator.

Detects classical yogas from planetary positions and house assignments.
Each yoga entry includes: name, category, planets involved, house(s),
strength assessment, effects, and interpretation.
"""

from typing import List, Dict, Optional, Any

# ── Constants ────────────────────────────────────────────────────────────────

KENDRAS   = {1, 4, 7, 10}
TRIKONAS  = {1, 5, 9}
DUSTHANAS = {6, 8, 12}
UPACHAYAS = {3, 6, 10, 11}

SIGN_LORDS = {
    1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun",
    6: "Mercury", 7: "Venus", 8: "Mars", 9: "Jupiter",
    10: "Saturn", 11: "Saturn", 12: "Jupiter",
}

# Exaltation signs per planet
EXALTATION_SIGN = {
    "Sun": 1, "Moon": 2, "Mars": 10, "Mercury": 6,
    "Jupiter": 4, "Venus": 12, "Saturn": 7,
}

# Own signs per planet
OWN_SIGNS = {
    "Sun": [5], "Moon": [4], "Mars": [1, 8], "Mercury": [3, 6],
    "Jupiter": [9, 12], "Venus": [2, 7], "Saturn": [10, 11],
}

# Debilitation signs
DEBILITATION_SIGN = {
    "Sun": 7, "Moon": 8, "Mars": 4, "Mercury": 12,
    "Jupiter": 10, "Venus": 6, "Saturn": 1,
}

BENEFICS  = {"Moon", "Mercury", "Jupiter", "Venus"}
MALEFICS  = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}
NATURAL_BENEFICS = {"Jupiter", "Venus", "Mercury", "Moon"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _planet_map(planets: List[Dict]) -> Dict[str, Dict]:
    return {p["name"]: p for p in planets}

def _house_map(planets: List[Dict]) -> Dict[int, List[str]]:
    """house number → list of planet names in that house."""
    hmap: Dict[int, List[str]] = {i: [] for i in range(1, 13)}
    for p in planets:
        hmap[p["house"]].append(p["name"])
    return hmap

def _house_of(planet_name: str, pm: Dict[str, Dict]) -> Optional[int]:
    return pm[planet_name]["house"] if planet_name in pm else None

def _rashi_of(planet_name: str, pm: Dict[str, Dict]) -> Optional[int]:
    return pm[planet_name]["rashi_num"] if planet_name in pm else None

def _in_own_or_exalt(planet: str, rashi_num: int) -> bool:
    return (rashi_num in OWN_SIGNS.get(planet, []) or
            EXALTATION_SIGN.get(planet) == rashi_num)

def _house_from(base_house: int, target_house: int) -> int:
    """Return the house number of target relative to base (1-indexed)."""
    return ((target_house - base_house) % 12) + 1

def _yoga_entry(
    name: str,
    category: str,
    planets_involved: List[str],
    houses: List[int],
    strength: str,
    effects: str,
    interpretation: str,
) -> Dict[str, Any]:
    return {
        "name": name,
        "category": category,
        "planets_involved": planets_involved,
        "houses": houses,
        "strength": strength,
        "effects": effects,
        "interpretation": interpretation,
    }


# ── Yoga Detectors ────────────────────────────────────────────────────────────

def _budha_aditya(pm, hm) -> Optional[Dict]:
    """Sun + Mercury in same house → intellect, fame, leadership."""
    sh, mh = _house_of("Sun", pm), _house_of("Mercury", pm)
    if sh is None or mh is None or sh != mh:
        return None
    sun_deg  = pm["Sun"]["degree_in_rashi"]
    merc_deg = pm["Mercury"]["degree_in_rashi"]
    diff = abs(sun_deg - merc_deg)
    strength = "weak" if diff < 6 else ("strong" if diff > 10 else "moderate")
    return _yoga_entry(
        "Budha-Aditya Yoga",
        "conjunction",
        ["Sun", "Mercury"],
        [sh],
        strength,
        "Sharp intellect, eloquence, administrative ability, fame and success in career.",
        f"Sun and Mercury are conjunct in house {sh} ({pm['Sun']['rashi']}). "
        f"This gives you a razor-sharp analytical mind, eloquence in speech and writing, "
        f"and the ability to excel in roles that combine authority with intelligence — "
        f"such as government, law, academia, or business leadership. "
        + ("Mercury is very close to Sun (possibly combust), which can slightly reduce "
           "the intellectual clarity and independence of thought."
           if diff < 6 else
           "The separation between Sun and Mercury is healthy, giving full expression to both planets.")
    )


def _chandra_mangal(pm, hm) -> Optional[Dict]:
    """Moon + Mars in same house → wealth through initiative, bold emotions."""
    mh, mah = _house_of("Moon", pm), _house_of("Mars", pm)
    if mh is None or mah is None or mh != mah:
        return None
    return _yoga_entry(
        "Chandra-Mangal Yoga",
        "conjunction",
        ["Moon", "Mars"],
        [mh],
        "moderate",
        "Wealth through bold action, entrepreneurial spirit, emotional courage.",
        f"Moon and Mars are conjunct in house {mh} ({pm['Moon']['rashi']}). "
        f"This powerful combination drives you to act on your emotions, giving entrepreneurial "
        f"energy and the courage to take financial risks. You are likely to earn wealth through "
        f"your own initiative. There can also be impulsiveness or emotional intensity to manage."
    )


def _guru_chandal(pm, hm) -> Optional[Dict]:
    """Jupiter + Rahu in same house → spiritual unorthodoxy, foreign connections."""
    jh, rh = _house_of("Jupiter", pm), _house_of("Rahu", pm)
    if jh is None or rh is None or jh != rh:
        return None
    return _yoga_entry(
        "Guru-Chandal Yoga",
        "conjunction",
        ["Jupiter", "Rahu"],
        [jh],
        "strong",
        "Unconventional wisdom, foreign/cross-cultural connections, spiritual restlessness.",
        f"Jupiter and Rahu are conjunct in house {jh} ({pm['Jupiter']['rashi']}). "
        f"This yoga creates an unorthodox seeker — one who challenges traditional beliefs and "
        f"is drawn to foreign philosophies, esoteric knowledge, or unconventional teachers. "
        f"While it can bring brilliant, outside-the-box thinking, it may also lead to confusion "
        f"between genuine wisdom and illusion. Spiritual discipline is highly recommended."
    )


def _gaja_kesari(pm, hm) -> Optional[Dict]:
    """Jupiter in kendra from Moon → fame, generosity, prosperity."""
    jh, mh = _house_of("Jupiter", pm), _house_of("Moon", pm)
    if jh is None or mh is None:
        return None
    rel = _house_from(mh, jh)
    if rel not in KENDRAS:
        return None
    # Strength: stronger if Jupiter is also in kendra from Lagna
    strength = "strong" if jh in KENDRAS else "moderate"
    return _yoga_entry(
        "Gaja-Kesari Yoga",
        "moon",
        ["Jupiter", "Moon"],
        [jh, mh],
        strength,
        "Fame, prosperity, generous nature, respected by many, elephant-like majesty.",
        f"Jupiter is in house {jh} ({pm['Jupiter']['rashi']}), which is a kendra "
        f"(house {rel}) from your Moon in house {mh} ({pm['Moon']['rashi']}). "
        f"One of the most celebrated Vedic yogas — it bestows natural authority, wisdom, "
        f"and a generous spirit. People with this yoga are often respected leaders, teachers, "
        f"or philanthropists. The strength increases if Jupiter is also well-placed from the Lagna."
    )


def _pancha_mahapurusha(pm, hm) -> List[Dict]:
    """Five great Mahapurusha yogas: Ruchaka, Bhadra, Hamsa, Malavya, Shasha."""
    configs = [
        ("Ruchaka Yoga",  "Mars",    [1, 8, 10],
         "Courageous, athletic, commanding presence, leadership in military/sports/administration.",
         "Mars is in its own or exalted sign in a kendra, giving you exceptional physical courage, "
         "competitive drive, and natural authority. You are a born leader who thrives under pressure. "
         "This yoga often appears in charts of military commanders, athletes, and strong administrators."),
        ("Bhadra Yoga",   "Mercury", [3, 6],
         "Brilliant intellect, mastery of language and business, analytical genius.",
         "Mercury is in its own or exalted sign in a kendra, bestowing exceptional intelligence, "
         "communication skills, and business acumen. You excel in writing, mathematics, trading, "
         "technology, or any field requiring sharp analytical thinking."),
        ("Hamsa Yoga",    "Jupiter", [4, 9, 12],
         "Wisdom, spiritual grace, respected teacher, philanthropic nature.",
         "Jupiter is in its own or exalted sign in a kendra, one of the most auspicious placements. "
         "You carry a natural wisdom and generosity that draws people to seek your guidance. "
         "This yoga is associated with great teachers, judges, and spiritual leaders."),
        ("Malavya Yoga",  "Venus",   [2, 7, 12],
         "Beauty, artistic talent, luxury, romantic charisma, material pleasures.",
         "Venus is in its own or exalted sign in a kendra, granting exceptional charm, aesthetic "
         "sensibility, and the enjoyment of life's pleasures. You are naturally attractive and "
         "talented in the arts. Financial success often comes through creative or luxury fields."),
        ("Shasha Yoga",   "Saturn",  [7, 10, 11],
         "Disciplined authority, mastery through hard work, longevity, political power.",
         "Saturn is in its own or exalted sign in a kendra, conferring iron discipline and the "
         "ability to build lasting structures. You earn authority through perseverance and "
         "responsibility. This yoga is common in charts of successful politicians and executives."),
    ]
    results = []
    for yoga_name, planet, own_signs, effects, interp_template in configs:
        h = _house_of(planet, pm)
        r = _rashi_of(planet, pm)
        if h is None or r is None:
            continue
        if h in KENDRAS and r in own_signs:
            strength = "strong" if h in {1, 10} else "moderate"
            results.append(_yoga_entry(
                yoga_name, "mahapurusha", [planet], [h], strength,
                effects,
                f"{planet} is in {pm[planet]['rashi']} (house {h}). " + interp_template
            ))
    return results


def _raja_yogas(pm, hm, houses: List[Dict]) -> List[Dict]:
    """Kendra lord + Trikona lord conjunction or mutual aspect."""
    results = []

    # Map house number → lord
    house_lord: Dict[int, str] = {h["house_num"]: h["lord"] for h in houses}

    # Find planets that lord both a kendra AND a trikona
    for planet in pm:
        if planet in ("Rahu", "Ketu"):
            continue
        lorded = pm[planet].get("lord_of_houses", [])
        kendra_lordship  = [h for h in lorded if h in KENDRAS]
        trikona_lordship = [h for h in lorded if h in TRIKONAS]
        if kendra_lordship and trikona_lordship:
            h = _house_of(planet, pm)
            rashi = pm[planet]["rashi"]
            results.append(_yoga_entry(
                f"Raja Yoga ({planet})",
                "raja",
                [planet],
                [h] if h else [],
                "strong" if h in KENDRAS or h in TRIKONAS else "moderate",
                f"Authority, rise in career, recognition, and political or social power.",
                f"{planet} lords both a kendra (house {kendra_lordship[0]}) and a trikona "
                f"(house {trikona_lordship[0]}), making it a singularly powerful planet in "
                f"your chart. Placed in {rashi} (house {h}), it acts as a natural raja yoga "
                f"karaka, promising notable career achievement and social recognition."
            ))

    # Kendra lord + Trikona lord in same house (different planets)
    kendra_lords  = set(house_lord.get(h, "") for h in KENDRAS)
    trikona_lords = set(house_lord.get(h, "") for h in TRIKONAS)
    kendra_lords.discard("")
    trikona_lords.discard("")

    for kl in kendra_lords:
        for tl in trikona_lords:
            if kl == tl or kl in ("Rahu","Ketu") or tl in ("Rahu","Ketu"):
                continue
            kh = _house_of(kl, pm)
            th = _house_of(tl, pm)
            if kh is not None and th is not None and kh == th:
                results.append(_yoga_entry(
                    f"Raja Yoga ({kl}+{tl})",
                    "raja",
                    [kl, tl],
                    [kh],
                    "strong",
                    "Conjunction of kendra and trikona lords — significant rise in life.",
                    f"{kl} (kendra lord) and {tl} (trikona lord) are conjunct in house {kh} "
                    f"({pm[kl]['rashi']}). This is a classic raja yoga — a powerful indicator "
                    f"of career success, authority, and recognition. The combined energy of "
                    f"action (kendra) and fortune (trikona) supports a notable rise in status."
                ))
    return results


def _dhana_yogas(pm, hm, houses: List[Dict]) -> List[Dict]:
    """Lords of wealth houses (1,2,5,9,11) associating."""
    results = []
    house_lord = {h["house_num"]: h["lord"] for h in houses}
    wealth_houses = [1, 2, 5, 9, 11]
    wealth_lords = set(house_lord.get(h, "") for h in wealth_houses)
    wealth_lords.discard("")
    wealth_lords -= {"Rahu", "Ketu"}

    # Check pairs of wealth house lords in same house
    lord_list = list(wealth_lords)
    for i in range(len(lord_list)):
        for j in range(i+1, len(lord_list)):
            p1, p2 = lord_list[i], lord_list[j]
            if p1 not in pm or p2 not in pm:
                continue
            h1, h2 = _house_of(p1, pm), _house_of(p2, pm)
            if h1 is not None and h1 == h2:
                results.append(_yoga_entry(
                    f"Dhana Yoga ({p1}+{p2})",
                    "dhana",
                    [p1, p2],
                    [h1],
                    "moderate",
                    "Wealth accumulation, financial prosperity, material success.",
                    f"{p1} and {p2}, both lords of wealth-giving houses, are conjunct in "
                    f"house {h1} ({pm[p1]['rashi']}). This Dhana yoga supports financial "
                    f"prosperity and the accumulation of resources — especially during the "
                    f"dashas of these planets."
                ))
    return results


def _viparita_raja_yoga(pm, hm, houses: List[Dict]) -> List[Dict]:
    """Lords of dusthana (6,8,12) placed in dusthanas → reversal of misfortune."""
    results = []
    house_lord = {h["house_num"]: h["lord"] for h in houses}
    dusthana_lords = {house_lord.get(h, ""): h for h in DUSTHANAS}
    dusthana_lords.pop("", None)

    for planet, lorded_house in dusthana_lords.items():
        if planet in ("Rahu","Ketu") or planet not in pm:
            continue
        ph = _house_of(planet, pm)
        if ph in DUSTHANAS:
            results.append(_yoga_entry(
                f"Viparita Raja Yoga ({planet})",
                "raja",
                [planet],
                [ph],
                "moderate",
                "Unexpected rise from adversity, gains through enemies' downfall, resilience.",
                f"{planet}, lord of house {lorded_house} (a dusthana), is placed in house {ph} "
                f"(also a dusthana). This Viparita Raja Yoga indicates a remarkable ability to "
                f"turn setbacks into victories. Obstacles that derail others become springboards "
                f"for your success, especially during {planet}'s dasha period."
            ))
    return results


def _parivartana_yoga(pm, hm) -> List[Dict]:
    """Mutual sign exchange between two planets."""
    results = []
    planets = [p for p in pm if p not in ("Rahu", "Ketu")]
    checked = set()

    for p1 in planets:
        for p2 in planets:
            if p1 >= p2 or (p1, p2) in checked:
                continue
            checked.add((p1, p2))
            r1 = _rashi_of(p1, pm)
            r2 = _rashi_of(p2, pm)
            if r1 is None or r2 is None:
                continue
            # p1 is in a sign owned by p2, and p2 is in a sign owned by p1
            if r1 in OWN_SIGNS.get(p2, []) and r2 in OWN_SIGNS.get(p1, []):
                h1 = _house_of(p1, pm)
                h2 = _house_of(p2, pm)
                both_dusthana = h1 in DUSTHANAS and h2 in DUSTHANAS
                results.append(_yoga_entry(
                    f"Parivartana Yoga ({p1}↔{p2})",
                    "exchange",
                    [p1, p2],
                    [h1, h2],
                    "weak" if both_dusthana else "strong",
                    "Mutual empowerment of two planets — each gains the other's strength and house significations.",
                    f"{p1} is in {pm[p1]['rashi']} (owned by {p2}) and {p2} is in "
                    f"{pm[p2]['rashi']} (owned by {p1}). This exchange (Parivartana) "
                    f"creates a deep link between houses {h1} and {h2}, blending their "
                    f"themes powerfully in your life. Both planets act as though placed "
                    f"in each other's houses, amplifying the results of both."
                ))
    return results


def _kemadruma(pm, hm) -> Optional[Dict]:
    """No planets in 2nd or 12th from Moon (except Sun) → isolation, struggle."""
    mh = _house_of("Moon", pm)
    if mh is None:
        return None
    second_from_moon  = ((mh) % 12) + 1
    twelfth_from_moon = ((mh - 2) % 12) + 1
    flanking = set(hm.get(second_from_moon, [])) | set(hm.get(twelfth_from_moon, []))
    flanking.discard("Sun")
    flanking.discard("Rahu")
    flanking.discard("Ketu")
    if flanking:
        return None
    return _yoga_entry(
        "Kemadruma Yoga",
        "moon",
        ["Moon"],
        [mh],
        "moderate",
        "Emotional isolation, financial fluctuations, tendency toward self-reliance.",
        f"Moon in house {mh} has no planets in the adjacent houses (2nd and 12th from Moon). "
        f"This Kemadruma yoga can indicate periods of emotional or financial isolation, "
        f"relying on one's own resources. It often builds tremendous self-sufficiency and "
        f"resilience. Its negative effects are mitigated if Moon is strong or aspected by benefics."
    )


def _adhi_yoga(pm, hm) -> Optional[Dict]:
    """Mercury, Jupiter, Venus all in 6th/7th/8th from Moon → leadership."""
    mh = _house_of("Moon", pm)
    if mh is None:
        return None
    target_houses = {((mh + offset - 1) % 12) + 1 for offset in [5, 6, 7]}  # 6,7,8 from Moon
    benefics_in_target = []
    for planet in ["Mercury", "Jupiter", "Venus"]:
        ph = _house_of(planet, pm)
        if ph in target_houses:
            benefics_in_target.append(planet)
    if len(benefics_in_target) < 2:
        return None
    strength = "strong" if len(benefics_in_target) == 3 else "moderate"
    return _yoga_entry(
        "Adhi Yoga",
        "moon",
        benefics_in_target,
        list(target_houses),
        strength,
        "Leadership, defeat of enemies, prosperity, comfortable life.",
        f"{', '.join(benefics_in_target)} are placed in the 6th/7th/8th houses from your Moon "
        f"(houses {list(target_houses)}). Adhi Yoga grants the ability to overcome opposition, "
        f"rise to leadership positions, and enjoy a comfortable, prosperous life. "
        + ("All three benefics present makes this a full and highly powerful Adhi Yoga."
           if len(benefics_in_target) == 3
           else "Partial Adhi Yoga with two benefics is still quite beneficial.")
    )


def _neecha_bhanga(pm, hm) -> List[Dict]:
    """Debilitated planet's debilitation cancelled by specific conditions."""
    results = []
    for planet, deb_sign in DEBILITATION_SIGN.items():
        if planet not in pm:
            continue
        if pm[planet]["rashi_num"] != deb_sign:
            continue
        # Condition 1: lord of debilitation sign is in kendra from lagna or Moon
        deb_sign_lord = SIGN_LORDS[deb_sign]
        dsl_house = _house_of(deb_sign_lord, pm)
        moon_house = _house_of("Moon", pm)

        cancellation = []
        if dsl_house in KENDRAS:
            cancellation.append(f"the lord of the debilitation sign ({deb_sign_lord}) is in a kendra (house {dsl_house})")

        # Condition 2: exaltation lord of debilitated planet is in kendra
        exalt_sign = EXALTATION_SIGN.get(planet)
        if exalt_sign:
            exalt_lord = SIGN_LORDS[exalt_sign]
            el_house = _house_of(exalt_lord, pm)
            if el_house in KENDRAS:
                cancellation.append(f"the exaltation lord ({exalt_lord}) is in a kendra (house {el_house})")

        if cancellation:
            ph = pm[planet]["house"]
            results.append(_yoga_entry(
                f"Neecha Bhanga Raja Yoga ({planet})",
                "raja",
                [planet],
                [ph],
                "moderate",
                "Cancellation of debilitation — the planet's weakness is reversed into strength.",
                f"{planet} is debilitated in {pm[planet]['rashi']} (house {ph}), but the "
                f"debilitation is cancelled because {' and '.join(cancellation)}. "
                f"Neecha Bhanga Raja Yoga transforms the initial weakness of a debilitated planet "
                f"into a source of strength after struggle. Those with this yoga often overcome "
                f"significant hardships to achieve remarkable success."
            ))
    return results


def _surya_yogas(pm, hm) -> List[Dict]:
    """Voshi, Veshi, Ubhayachari — planets relative to Sun."""
    results = []
    sh = _house_of("Sun", pm)
    if sh is None:
        return results

    second_from_sun  = (sh % 12) + 1
    twelfth_from_sun = ((sh - 2) % 12) + 1

    second_planets  = [p for p in hm.get(second_from_sun, [])
                       if p not in ("Moon", "Rahu", "Ketu")]
    twelfth_planets = [p for p in hm.get(twelfth_from_sun, [])
                       if p not in ("Moon", "Rahu", "Ketu")]

    if second_planets and twelfth_planets:
        results.append(_yoga_entry(
            "Ubhayachari Yoga",
            "solar",
            second_planets + twelfth_planets,
            [second_from_sun, twelfth_from_sun],
            "strong",
            "Balanced, regal personality — respected on all sides, natural authority.",
            f"Planets surround your Sun on both sides: {', '.join(second_planets)} in house "
            f"{second_from_sun} and {', '.join(twelfth_planets)} in house {twelfth_from_sun}. "
            f"Ubhayachari yoga grants a well-rounded, kingly personality with support from all "
            f"directions. You project natural authority and are respected by people of varied backgrounds."
        ))
    elif second_planets:
        results.append(_yoga_entry(
            "Veshi Yoga",
            "solar",
            second_planets,
            [second_from_sun],
            "moderate",
            "Wealth, happiness, virtuous character.",
            f"{', '.join(second_planets)} are placed in house {second_from_sun}, the 2nd from your Sun. "
            f"Veshi yoga gives a fortunate, virtuous character with a natural ability to accumulate "
            f"resources and maintain happiness. The specific effects depend on which planet is involved."
        ))
    elif twelfth_planets:
        results.append(_yoga_entry(
            "Voshi Yoga",
            "solar",
            twelfth_planets,
            [twelfth_from_sun],
            "moderate",
            "Generous, spiritual inclinations, memory and learning.",
            f"{', '.join(twelfth_planets)} are placed in house {twelfth_from_sun}, the 12th from your Sun. "
            f"Voshi yoga indicates a giving, spiritually inclined nature with good memory and "
            f"learning ability. The specific character of the yoga depends on the planet involved."
        ))
    return results


def _amala_yoga(pm, hm) -> Optional[Dict]:
    """Only natural benefics in 10th from Lagna (house 10) → spotless reputation."""
    tenth_occupants = hm.get(10, [])
    if not tenth_occupants:
        return None
    has_malefic = any(p in MALEFICS for p in tenth_occupants)
    has_benefic = any(p in NATURAL_BENEFICS for p in tenth_occupants)
    if has_benefic and not has_malefic:
        benefics_there = [p for p in tenth_occupants if p in NATURAL_BENEFICS]
        return _yoga_entry(
            "Amala Yoga",
            "benefic",
            benefics_there,
            [10],
            "strong",
            "Spotless reputation, charitable fame, lasting legacy.",
            f"{', '.join(benefics_there)} — natural benefic(s) — occupy your 10th house with "
            f"no malefic influence. Amala yoga bestows an unblemished reputation and the kind "
            f"of fame that outlasts one's lifetime. You are remembered for good deeds, generosity, "
            f"and integrity in your professional life."
        )
    return None


# ── Main entry point ──────────────────────────────────────────────────────────

def calculate_yogas(planets: List[Dict], houses: List[Dict]) -> List[Dict]:
    """
    Detect all applicable yogas from the chart.
    Returns a list of yoga dicts, sorted by category then strength.
    """
    pm = _planet_map(planets)
    hm = _house_map(planets)

    yogas: List[Dict] = []

    # Single-check yogas
    for fn in [_budha_aditya, _chandra_mangal, _guru_chandal,
               _gaja_kesari, _kemadruma, _adhi_yoga, _amala_yoga]:
        result = fn(pm, hm)
        if result:
            yogas.append(result)

    # Multi-result yogas
    yogas.extend(_pancha_mahapurusha(pm, hm))
    yogas.extend(_raja_yogas(pm, hm, houses))
    yogas.extend(_dhana_yogas(pm, hm, houses))
    yogas.extend(_viparita_raja_yoga(pm, hm, houses))
    yogas.extend(_parivartana_yoga(pm, hm))
    yogas.extend(_neecha_bhanga(pm, hm))
    yogas.extend(_surya_yogas(pm, hm))

    # Sort: strong first, then by category importance
    strength_order = {"strong": 0, "moderate": 1, "weak": 2}
    category_order = {"mahapurusha": 0, "raja": 1, "conjunction": 2,
                      "dhana": 3, "moon": 4, "solar": 5, "exchange": 6,
                      "benefic": 7, "other": 8}

    yogas.sort(key=lambda y: (
        strength_order.get(y["strength"], 9),
        category_order.get(y["category"], 9),
        y["name"]
    ))

    return yogas
