"""
Vedic Dosha (affliction) calculator.

Detects classical doshas from planetary positions, aspects and house placements.
Each dosha entry includes:
  name, severity (high/medium/low), present (bool), planets_involved,
  houses, description, effects, remedies.
"""

from typing import List, Dict, Optional, Any

# ─── Constants ────────────────────────────────────────────────────────────────

SIGN_LORDS = {
    1: "Mars",  2: "Venus",  3: "Mercury", 4: "Moon",    5: "Sun",
    6: "Mercury", 7: "Venus", 8: "Mars",   9: "Jupiter",
    10: "Saturn", 11: "Saturn", 12: "Jupiter",
}

# Combustion orbs (degrees from Sun within which a planet is combust)
COMBUST_ORBS: Dict[str, float] = {
    "Moon":    12.0,
    "Mars":     17.0,
    "Mercury":  14.0,   # direct; retrograde = 12°
    "Jupiter":  11.0,
    "Venus":    10.0,   # direct; retrograde = 8°
    "Saturn":   15.0,
}

NATURAL_MALEFICS = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}
NATURAL_BENEFICS = {"Jupiter", "Venus", "Mercury", "Moon"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _pm(planets: List[Dict]) -> Dict[str, Dict]:
    return {p["name"]: p for p in planets}

def _hm(planets: List[Dict]) -> Dict[int, List[str]]:
    h: Dict[int, List[str]] = {i: [] for i in range(1, 13)}
    for p in planets:
        h[p["house"]].append(p["name"])
    return h

def _house_of(name: str, pm: Dict) -> Optional[int]:
    return pm[name]["house"] if name in pm else None

def _lon_of(name: str, pm: Dict) -> Optional[float]:
    return pm[name]["longitude"] if name in pm else None

def _rashi_of(name: str, pm: Dict) -> Optional[int]:
    return pm[name]["rashi_num"] if name in pm else None

def _deg_diff(lon1: float, lon2: float) -> float:
    """Shortest angular distance between two ecliptic longitudes."""
    d = abs(lon1 - lon2) % 360
    return d if d <= 180 else 360 - d

def _dosha(
    name: str,
    severity: str,          # high | medium | low
    present: bool,
    planets_involved: List[str],
    houses: List[int],
    description: str,
    effects: str,
    remedies: List[str],
) -> Dict[str, Any]:
    return {
        "name":             name,
        "severity":         severity,
        "present":          present,
        "planets_involved": planets_involved,
        "houses":           houses,
        "description":      description,
        "effects":          effects,
        "remedies":         remedies,
    }


# ─── Individual Dosha Detectors ───────────────────────────────────────────────

def _mangal_dosha(pm: Dict, hm: Dict) -> Dict:
    """
    Mars in houses 1, 2, 4, 7, 8, or 12 from Lagna causes Mangal Dosha.
    Also checked from Moon and Venus (partial dosha).
    """
    MANGAL_HOUSES = {1, 2, 4, 7, 8, 12}
    mars_house = _house_of("Mars", pm)

    if mars_house is None:
        return _dosha("Mangal Dosha (Kuja Dosha)", "high", False,
                      ["Mars"], [], "", "", [])

    from_lagna  = mars_house in MANGAL_HOUSES
    moon_house  = _house_of("Moon", pm)
    venus_house = _house_of("Venus", pm)

    # Mars house relative to Moon
    from_moon = False
    if moon_house:
        rel_moon = ((mars_house - moon_house) % 12) + 1
        from_moon = rel_moon in MANGAL_HOUSES

    # Mars house relative to Venus
    from_venus = False
    if venus_house:
        rel_venus = ((mars_house - venus_house) % 12) + 1
        from_venus = rel_venus in MANGAL_HOUSES

    present = from_lagna or from_moon or from_venus
    if not present:
        severity = "low"
        desc = (f"Mars is in house {mars_house}, which does not form Mangal Dosha "
                f"from Lagna, Moon, or Venus.")
        effects = "No significant Mars-related affliction to partnerships."
        remedies = []
    elif from_lagna and from_moon and from_venus:
        severity = "high"
        desc = (f"Mars is in house {mars_house} — a Mangal Dosha house from Lagna, "
                f"Moon ({moon_house}), and Venus ({venus_house}). This is a strong Mangal Dosha.")
        effects = ("Strong potential for friction in marriage and partnerships. Impulsiveness, "
                   "accidents, or conflicts may arise if unchecked. Partner ideally also has Mangal Dosha.")
        remedies = [
            "Chant Mangal Beej Mantra: 'Om Kram Kreem Kraum Sah Bhaumaya Namah' 108× on Tuesdays",
            "Perform Kumbh Vivah (symbolic marriage) before actual marriage if advised by a Jyotishi",
            "Wear red coral (Moonga) in gold on right ring finger after consultation",
            "Donate red lentils, jaggery, and red cloth on Tuesdays",
            "Fast on Tuesdays and offer Sindoor to Hanuman ji",
        ]
    else:
        severity = "medium"
        sources = []
        if from_lagna:  sources.append("Lagna")
        if from_moon:   sources.append(f"Moon (house {moon_house})")
        if from_venus:  sources.append(f"Venus (house {venus_house})")
        desc = (f"Mars is in house {mars_house} — partial Mangal Dosha from "
                f"{', '.join(sources)}.")
        effects = ("Moderate impact on partnerships; potential impulsiveness or stubbornness "
                   "in relationships. Mitigated if Mars is in own/exalted sign.")
        remedies = [
            "Chant Mangal Beej Mantra on Tuesdays",
            "Offer red flowers to Hanuman ji on Tuesdays",
            "Avoid scheduling important relationship decisions during Mars retrograde",
        ]

    return _dosha("Mangal Dosha (Kuja Dosha)", severity, present,
                  ["Mars"], [mars_house], desc, effects, remedies)


def _kaal_sarp_dosha(pm: Dict, hm: Dict) -> Dict:
    """
    All 7 classical planets (Sun–Saturn) fall between Rahu and Ketu
    on the same side of the chart.
    """
    rahu_lon = _lon_of("Rahu", pm)
    ketu_lon = _lon_of("Ketu", pm)
    if rahu_lon is None or ketu_lon is None:
        return _dosha("Kaal Sarp Dosha", "high", False, ["Rahu", "Ketu"], [], "", "", [])

    classical = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    classic_lons = [_lon_of(p, pm) for p in classical if _lon_of(p, pm) is not None]

    # Rahu is always ~180° from Ketu; check if all planets are within the arc from Rahu→Ketu
    def in_arc(lon: float, start: float, end: float) -> bool:
        """Is lon in the arc going clockwise from start to end?"""
        if start <= end:
            return start <= lon <= end
        return lon >= start or lon <= end

    # Arc from Rahu to Ketu (clockwise)
    r = rahu_lon % 360
    k = ketu_lon % 360
    all_in_rahu_ketu = all(in_arc(l % 360, r, k) for l in classic_lons)
    all_in_ketu_rahu = all(in_arc(l % 360, k, r) for l in classic_lons)
    present = all_in_rahu_ketu or all_in_ketu_rahu

    rahu_house  = _house_of("Rahu", pm)
    ketu_house  = _house_of("Ketu", pm)

    # Name by Rahu house
    KSD_NAMES = {
        1: "Anant", 2: "Kulik", 3: "Vasuki", 4: "Shankhpal",
        5: "Padma", 6: "Mahapadma", 7: "Takshak", 8: "Karkotak",
        9: "Shankhachur", 10: "Ghatak", 11: "Vishdhar", 12: "Sheshnag"
    }
    ksd_name = KSD_NAMES.get(rahu_house, "") if rahu_house else ""
    full_name = f"Kaal Sarp Dosha ({ksd_name})" if ksd_name else "Kaal Sarp Dosha"

    if not present:
        return _dosha(full_name, "high", False,
                      ["Rahu", "Ketu"], [rahu_house or 0, ketu_house or 0],
                      "All planets are NOT enclosed between Rahu and Ketu — no Kaal Sarp Dosha.",
                      "No serpent-axis affliction present.", [])

    return _dosha(
        full_name, "high", True,
        ["Rahu", "Ketu"], [rahu_house or 0, ketu_house or 0],
        (f"All classical planets fall between Rahu (house {rahu_house}) and Ketu "
         f"(house {ketu_house}), forming {ksd_name} Kaal Sarp Dosha."),
        ("Delays and obstacles in career, marriage, and life goals despite sincere effort. "
         "Intense karmic lessons around ambition, attachment, and liberation. "
         "Often a powerful indicator of a life marked by struggle followed by significant spiritual growth."),
        [
            "Perform Kaal Sarp Dosha Shanti Puja at Tryambakeshwar or Ujjain",
            "Chant Maha Mrityunjaya Mantra 108× daily",
            "Recite Rahu-Ketu stotras on Saturdays",
            "Offer milk and flowers to a Shiva lingam on Nag Panchami",
            "Donate blankets or dark-blue cloth on Saturdays",
            "Wear Gomed (Hessonite) for Rahu after consultation with a Jyotishi",
        ]
    )


def _grahan_dosha(pm: Dict, hm: Dict) -> List[Dict]:
    """Sun or Moon conjunct Rahu or Ketu (within 20°)."""
    results = []
    rahu_lon = _lon_of("Rahu", pm)
    ketu_lon = _lon_of("Ketu", pm)
    sun_lon  = _lon_of("Sun", pm)
    moon_lon = _lon_of("Moon", pm)

    pairs = [
        ("Sun",  "Rahu",  rahu_lon, "Surya Grahan Dosha"),
        ("Sun",  "Ketu",  ketu_lon, "Surya Grahan Dosha (Ketu)"),
        ("Moon", "Rahu",  rahu_lon, "Chandra Grahan Dosha"),
        ("Moon", "Ketu",  ketu_lon, "Chandra Grahan Dosha (Ketu)"),
    ]

    for luminary, node, node_lon, dosha_name in pairs:
        lum_lon = sun_lon if luminary == "Sun" else moon_lon
        if lum_lon is None or node_lon is None:
            continue
        diff = _deg_diff(lum_lon, node_lon)
        if diff > 20:
            continue

        lum_house  = _house_of(luminary, pm)
        node_house = _house_of(node, pm)
        same_house = lum_house == node_house
        if not same_house:
            continue  # require same house conjunction

        severity = "high" if diff <= 10 else "medium"
        is_rahu = node == "Rahu"

        results.append(_dosha(
            dosha_name, severity, True,
            [luminary, node], [lum_house or 0],
            (f"{luminary} and {node} are conjunct in house {lum_house} "
             f"({pm[luminary]['rashi']}), {diff:.1f}° apart."),
            (f"{'Solar' if luminary == 'Sun' else 'Lunar'} eclipse energy at birth. "
             + ("Self-expression, confidence, and paternal relationships may carry karmic intensity. "
                "Ego challenges and authority issues may arise. "
                if luminary == 'Sun' else
                "Emotional patterns, mind, and maternal relationships carry eclipse-like intensity. "
                "Mental restlessness, anxiety, or psychic sensitivity may be heightened. ")
             + ("Rahu amplifies worldly desires and ambitions."
                if is_rahu else
                "Ketu brings past-life karma and a sense of spiritual detachment.")),
            [
                f"Chant {'Aditya Hridayam' if luminary == 'Sun' else 'Chandra Kavacham'} daily",
                "Offer water to the Sun at sunrise daily",
                f"Fast on {'Sundays' if luminary == 'Sun' else 'Mondays'}",
                "Worship Rahu/Ketu through Sarpa Dosha Nivaran puja",
                f"Donate {'wheat and jaggery' if luminary == 'Sun' else 'rice and white cloth'} on the relevant day",
            ]
        ))
    return results


def _vish_dosha(pm: Dict, hm: Dict) -> Dict:
    """Saturn + Moon in same house — Vish (poison) Yoga / Dosha."""
    sh = _house_of("Saturn", pm)
    mh = _house_of("Moon", pm)
    present = sh is not None and mh is not None and sh == mh

    if not present:
        return _dosha("Vish Dosha (Shani-Chandra)", "medium", False,
                      ["Saturn", "Moon"], [], "", "", [])

    return _dosha(
        "Vish Dosha (Shani-Chandra)", "medium", True,
        ["Saturn", "Moon"], [sh],
        f"Saturn and Moon are conjunct in house {sh} ({pm['Moon']['rashi']}), forming Vish Dosha.",
        ("Emotional heaviness, pessimism, and mental stress are likely themes. "
         "Relationship with mother or maternal figures may be strained or carry burdens. "
         "The native often carries deep responsibilities from a young age. "
         "However, this also builds exceptional resilience, discipline, and depth of character."),
        [
            "Recite Chandra Kavacham or Shiva Panchakshara Stotram daily",
            "Offer milk to a Shiva lingam on Mondays",
            "Fast on Mondays for mental and emotional peace",
            "Donate milk, rice, and white items on Mondays",
            "Wear natural Pearl (Moti) in silver on right little finger after consultation",
            "Meditate regularly; practices like Yoga Nidra help calm the Saturn-Moon tension",
        ]
    )


def _shrapit_dosha(pm: Dict, hm: Dict) -> Dict:
    """Saturn + Rahu in same house — Shrapit (cursed) Dosha."""
    sh = _house_of("Saturn", pm)
    rh = _house_of("Rahu", pm)
    present = sh is not None and rh is not None and sh == rh

    if not present:
        return _dosha("Shrapit Dosha (Shani-Rahu)", "medium", False,
                      ["Saturn", "Rahu"], [], "", "", [])

    return _dosha(
        "Shrapit Dosha (Shani-Rahu)", "medium", True,
        ["Saturn", "Rahu"], [sh],
        f"Saturn and Rahu are conjunct in house {sh} ({pm['Saturn']['rashi']}), forming Shrapit Dosha.",
        ("Karmic debts from past actions create repeated delays and obstacles, especially "
         "in career and personal ambitions. The native may feel cursed or blocked despite hard work. "
         "This dosha intensifies during Saturn or Rahu dashas. It demands patience, "
         "ethical conduct, and service to overcome karmic patterns."),
        [
            "Perform Shrapit Dosha Nivaran Puja on Amavasya (new moon)",
            "Chant Shani Chalisa every Saturday",
            "Feed crows (Saturn/Rahu's bird) daily with rice or bread",
            "Donate black sesame seeds, mustard oil, and iron on Saturdays",
            "Serve the elderly, disabled, or underprivileged regularly",
            "Light a mustard oil lamp under a Peepal tree on Saturdays",
        ]
    )


def _angarak_dosha(pm: Dict, hm: Dict) -> Dict:
    """Mars + Rahu in same house — Angarak Dosha."""
    mh = _house_of("Mars", pm)
    rh = _house_of("Rahu", pm)
    present = mh is not None and rh is not None and mh == rh

    if not present:
        return _dosha("Angarak Dosha (Mars-Rahu)", "medium", False,
                      ["Mars", "Rahu"], [], "", "", [])

    return _dosha(
        "Angarak Dosha (Mars-Rahu)", "medium", True,
        ["Mars", "Rahu"], [mh],
        f"Mars and Rahu are conjunct in house {mh} ({pm['Mars']['rashi']}), forming Angarak Dosha.",
        ("Explosive anger, impulsiveness, and accident-proneness may be heightened. "
         "Ambition is intensified to the point of recklessness. There can be conflicts "
         "with authority figures and a tendency toward unconventional or aggressive actions. "
         "Positively, this combination creates fearless pioneers when channeled well."),
        [
            "Chant Mangal Beej Mantra: 'Om Kram Kreem Kraum Sah Bhaumaya Namah'",
            "Recite Hanuman Chalisa daily, especially on Tuesdays",
            "Avoid major decisions when angry; practice anger management",
            "Donate red lentils on Tuesdays and sesame on Saturdays",
            "Avoid red meat; adopt a sattvic diet",
            "Physical exercise (Mars) channelled positively reduces aggression",
        ]
    )


def _pitra_dosha(pm: Dict, hm: Dict) -> Dict:
    """
    Sun afflicted by Rahu/Ketu/Saturn, or 9th house heavily afflicted.
    Indicates ancestral karma / issues with paternal lineage.
    """
    sun_house = _house_of("Sun", pm)
    rahu_house = _house_of("Rahu", pm)
    ketu_house = _house_of("Ketu", pm)
    saturn_house = _house_of("Saturn", pm)

    # Sun conjunct Rahu or Ketu in same house
    sun_with_rahu  = sun_house is not None and sun_house == rahu_house
    sun_with_ketu  = sun_house is not None and sun_house == ketu_house
    sun_with_saturn = sun_house is not None and sun_house == saturn_house

    # 9th house lord afflicted or 9th house occupied by malefics
    ninth_occupants = [p for p in (pm.keys()) if _house_of(p, pm) == 9]
    ninth_malefics  = [p for p in ninth_occupants if p in NATURAL_MALEFICS]
    ninth_afflicted = len(ninth_malefics) >= 2

    present = sun_with_rahu or sun_with_ketu or sun_with_saturn or ninth_afflicted

    if not present:
        return _dosha("Pitra Dosha", "medium", False,
                      ["Sun"], [sun_house or 0], "", "", [])

    causes = []
    planets = ["Sun"]
    houses  = [sun_house] if sun_house else []

    if sun_with_rahu:
        causes.append("Sun conjunct Rahu"); planets.append("Rahu")
    if sun_with_ketu:
        causes.append("Sun conjunct Ketu"); planets.append("Ketu")
    if sun_with_saturn:
        causes.append("Sun conjunct Saturn"); planets.append("Saturn")
    if ninth_afflicted:
        causes.append(f"9th house has multiple malefics ({', '.join(ninth_malefics)})")
        houses.append(9)

    severity = "high" if (sun_with_rahu or sun_with_ketu) and ninth_afflicted else "medium"

    return _dosha(
        "Pitra Dosha", severity, True,
        list(dict.fromkeys(planets)), list(dict.fromkeys(h for h in houses if h)),
        f"Pitra Dosha present due to: {'; '.join(causes)}.",
        ("Indicates unresolved ancestral karma. May manifest as obstacles placed by "
         "forefathers' unfulfilled wishes — delayed marriage, financial instability, "
         "health issues, or conflicts in the paternal line. Relationship with father "
         "or authority figures may be challenging. Spiritual practices for ancestors bring relief."),
        [
            "Perform Pitru Tarpan (ancestral water offering) on Amavasya and during Pitru Paksha",
            "Donate food and clothing to Brahmins or the needy in memory of ancestors",
            "Recite Gayatri Mantra 108× daily for Sun's strength",
            "Perform Narayan Nagbali or Tripindi Shraddha if advised by a Jyotishi",
            "Light a deepam (oil lamp) in the south-east corner of the home daily",
            "Plant a Peepal tree or perform Peepal puja on Saturdays",
        ]
    )


def _combust_planets(pm: Dict, hm: Dict) -> List[Dict]:
    """Planets within combustion orb of Sun lose their significations."""
    sun_lon  = _lon_of("Sun", pm)
    sun_house = _house_of("Sun", pm)
    if sun_lon is None:
        return []

    results = []
    for planet, orb in COMBUST_ORBS.items():
        p_lon = _lon_of(planet, pm)
        if p_lon is None:
            continue
        diff = _deg_diff(sun_lon, p_lon)
        if diff > orb:
            continue
        p_house = _house_of(planet, pm)
        severity = "high" if diff <= orb * 0.4 else "medium"
        results.append(_dosha(
            f"Combustion — {planet}",
            severity, True,
            ["Sun", planet], [sun_house or 0],
            (f"{planet} is {diff:.1f}° from Sun (combustion orb: {orb}°), "
             f"both in house {sun_house} ({pm['Sun']['rashi']})."),
            (f"{planet}'s natural significations are weakened: "
             + {
                "Moon":    "emotional sensitivity, mind, and mother-related matters may be suppressed.",
                "Mars":    "physical energy and initiative may be overshadowed by ego.",
                "Mercury": "intellect and communication may lack independence of thought.",
                "Jupiter": "wisdom and guidance may be dominated by the Sun (ego over dharma).",
                "Venus":   "love, beauty, and relationships may be compromised or delayed.",
                "Saturn":  "discipline and detachment may struggle against solar ego-drive.",
             }.get(planet, "natural qualities may be diminished.")),
            [
                f"Strengthen {planet} through its mantras and gemstone (after consultation)",
                f"Perform {planet}'s graha shanti homa",
                "Recite Aditya Hridayam to honour the Sun and reduce its domination",
                f"Fast on {'Mondays' if planet=='Moon' else 'Wednesdays' if planet=='Mercury' else 'Fridays' if planet=='Venus' else 'Saturdays' if planet=='Saturn' else 'Tuesdays' if planet=='Mars' else 'Thursdays'} for the combust planet",
            ]
        ))
    return results


def _graha_yuddha(pm: Dict, hm: Dict) -> List[Dict]:
    """
    Planetary war: two classical planets (not Sun/Moon) within 1° of each other.
    The planet with lower longitude (or lower latitude) wins; the other is weakened.
    """
    classical = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    results = []
    checked = set()

    for i, p1 in enumerate(classical):
        for p2 in classical[i+1:]:
            if (p1, p2) in checked:
                continue
            checked.add((p1, p2))
            l1 = _lon_of(p1, pm)
            l2 = _lon_of(p2, pm)
            if l1 is None or l2 is None:
                continue
            diff = _deg_diff(l1, l2)
            if diff > 1.0:
                continue

            h1 = _house_of(p1, pm)
            # Loser = higher longitude (traditional rule)
            loser  = p2 if l2 > l1 else p1
            winner = p1 if loser == p2 else p2

            results.append(_dosha(
                f"Graha Yuddha ({p1}–{p2})",
                "medium", True,
                [p1, p2], [h1 or 0],
                (f"{p1} ({l1:.2f}°) and {p2} ({l2:.2f}°) are only {diff:.2f}° apart — "
                 f"in planetary war. {winner} wins; {loser} is weakened."),
                (f"{loser}'s significations are severely weakened in this chart — "
                 f"the house it lords and the matters it represents may not fully fructify. "
                 f"{winner} dominates the energy of the house they share."),
                [
                    f"Strengthen {loser} through mantra, charity, and gemstone consultation",
                    f"Perform {loser}'s graha shanti puja",
                    "Consult a Jyotishi for the dasha-specific effects",
                ]
            ))
    return results


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def calculate_doshas(planets: List[Dict], houses: List[Dict]) -> List[Dict]:
    """
    Detect all doshas from the birth chart.
    Returns ALL doshas (present=True ones are afflictions; present=False means clear).
    """
    pm = _pm(planets)
    hm = _hm(planets)

    doshas: List[Dict] = []

    # Single-result doshas
    for fn in [_mangal_dosha, _kaal_sarp_dosha, _vish_dosha,
               _shrapit_dosha, _angarak_dosha, _pitra_dosha]:
        result = fn(pm, hm)
        if result:
            doshas.append(result)

    # Multi-result doshas
    doshas.extend(_grahan_dosha(pm, hm))
    doshas.extend(_combust_planets(pm, hm))
    doshas.extend(_graha_yuddha(pm, hm))

    # Sort: present first, then by severity
    sev_order = {"high": 0, "medium": 1, "low": 2}
    doshas.sort(key=lambda d: (0 if d["present"] else 1, sev_order.get(d["severity"], 9)))

    return doshas
