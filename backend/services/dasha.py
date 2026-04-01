"""
Vimshottari Dasha calculation.

The dasha sequence is determined by the Moon's nakshatra at birth.
Total cycle = 120 years.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import math

# Vimshottari dasha sequence and years
DASHA_SEQUENCE = [
    ("Ketu",    7),
    ("Venus",   20),
    ("Sun",     6),
    ("Moon",    10),
    ("Mars",    7),
    ("Rahu",    18),
    ("Jupiter", 16),
    ("Saturn",  19),
    ("Mercury", 17),
]
TOTAL_YEARS = 120

# Nakshatra lords (0-indexed, 27 nakshatras → cycles through 9 lords)
NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury",
]

NAKSHATRA_SPAN = 360.0 / 27  # 13°20'


def get_dasha_start_planet_and_balance(moon_lon: float) -> Tuple[str, float]:
    """
    Given Moon's sidereal longitude, determine:
    - The ruling planet of Moon's nakshatra (starting dasha planet)
    - Balance of that dasha remaining at birth (in years)
    """
    nak_index = int(moon_lon / NAKSHATRA_SPAN)
    nak_index = min(nak_index, 26)

    # Fraction traversed within nakshatra
    traversed = (moon_lon - nak_index * NAKSHATRA_SPAN) / NAKSHATRA_SPAN
    balance_fraction = 1.0 - traversed  # fraction remaining

    ruling_planet = NAKSHATRA_LORDS[nak_index]

    # Find years for this dasha
    for planet, years in DASHA_SEQUENCE:
        if planet == ruling_planet:
            balance_years = years * balance_fraction
            return ruling_planet, balance_years

    return DASHA_SEQUENCE[0][0], DASHA_SEQUENCE[0][1]  # fallback


def add_years(dt: datetime, years: float) -> datetime:
    """Add fractional years to a datetime."""
    days = years * 365.25
    return dt + timedelta(days=days)


def build_dasha_sequence(birth_dt: datetime, moon_lon: float) -> List[Dict]:
    """
    Build full Vimshottari dasha sequence from birth.
    Returns list of dasha entries with antardasha sub-entries.
    """
    start_planet, balance_years = get_dasha_start_planet_and_balance(moon_lon)

    # Find index of starting planet in sequence
    start_idx = next(i for i, (p, _) in enumerate(DASHA_SEQUENCE) if p == start_planet)

    dashas = []
    current_date = birth_dt

    # Build ordered sequence starting from start_planet
    ordered = (
        list(DASHA_SEQUENCE[start_idx:]) +
        list(DASHA_SEQUENCE[:start_idx])
    )

    for i, (dasha_planet, full_years) in enumerate(ordered):
        if i == 0:
            actual_years = balance_years
        else:
            actual_years = float(full_years)

        dasha_end = add_years(current_date, actual_years)

        # Build antardashas
        antardasha_start = current_date
        antardashas = []

        # Antardashas follow same sequence starting from dasha planet
        ad_idx = next(j for j, (p, _) in enumerate(DASHA_SEQUENCE) if p == dasha_planet)
        ad_ordered = (
            list(DASHA_SEQUENCE[ad_idx:]) +
            list(DASHA_SEQUENCE[:ad_idx])
        )

        for ad_planet, ad_full_years in ad_ordered:
            # Antardasha duration = (dasha_years * ad_full_years) / 120
            ad_years = (actual_years * ad_full_years) / TOTAL_YEARS
            ad_end = add_years(antardasha_start, ad_years)
            antardashas.append({
                "planet": ad_planet,
                "start_date": antardasha_start.strftime("%Y-%m-%d"),
                "end_date": ad_end.strftime("%Y-%m-%d"),
            })
            antardasha_start = ad_end

        dashas.append({
            "planet": dasha_planet,
            "start_date": current_date.strftime("%Y-%m-%d"),
            "end_date": dasha_end.strftime("%Y-%m-%d"),
            "years": round(actual_years, 4),
            "antardashas": antardashas,
        })
        current_date = dasha_end

    return dashas


def get_current_dasha_antardasha(
    dashas: List[Dict],
    reference_date: datetime
) -> Tuple[Dict, Dict]:
    """Find current mahadasha and antardasha relative to reference_date."""
    ref_str = reference_date.strftime("%Y-%m-%d")

    current_dasha = dashas[-1]   # fallback to last
    current_antardasha = dashas[-1]["antardashas"][-1] if dashas[-1]["antardashas"] else {}

    for dasha in dashas:
        if dasha["start_date"] <= ref_str <= dasha["end_date"]:
            current_dasha = dasha
            for ad in dasha.get("antardashas", []):
                if ad["start_date"] <= ref_str <= ad["end_date"]:
                    current_antardasha = ad
                    break
            break

    return current_dasha, current_antardasha
