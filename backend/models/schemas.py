from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class BirthDataInput(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    time: str = Field(..., description="Time in HH:MM format (24h)")
    place: str = Field(..., description="Place name for geocoding")
    ayanamsha: str = Field(default="lahiri", description="lahiri | krishnamurti | raman")

    model_config = {
        "json_schema_extra": {
            "example": {
                "date": "1990-05-15",
                "time": "10:30",
                "place": "Mumbai, India",
                "ayanamsha": "lahiri"
            }
        }
    }


class PlanetPosition(BaseModel):
    name: str
    longitude: float          # Sidereal longitude (0–360)
    rashi: str                 # Zodiac sign name
    rashi_num: int             # 1–12
    degree_in_rashi: float     # 0–30
    house: int                 # 1–12 (Whole Sign)
    nakshatra: str
    nakshatra_pada: int        # 1–4
    is_retrograde: bool
    dignity: Optional[str]     # exalted | debilitated | own | moolatrikona | None
    lord_of_houses: List[int]  # Houses this planet lords


class HouseInfo(BaseModel):
    house_num: int
    rashi: str
    rashi_num: int
    lord: str
    occupants: List[str]


class DashaEntry(BaseModel):
    planet: str
    start_date: str
    end_date: str
    years: float
    antardashas: Optional[List["AntardhashaEntry"]] = None


class AntardhashaEntry(BaseModel):
    planet: str
    start_date: str
    end_date: str


DashaEntry.model_rebuild()


class NavamsaPosition(BaseModel):
    name: str
    rashi: str
    rashi_num: int
    house: int
    degree_in_rashi: float


class YogaEntry(BaseModel):
    name: str
    category: str          # mahapurusha | raja | conjunction | dhana | moon | solar | exchange | benefic
    planets_involved: List[str]
    houses: List[int]
    strength: str          # strong | moderate | weak
    effects: str           # one-line summary
    interpretation: str    # detailed paragraph


class ChartResponse(BaseModel):
    # Input echo
    date: str
    time: str
    place: str
    latitude: float
    longitude: float
    timezone: str
    ayanamsha: str
    ayanamsha_value: float

    # Core chart data
    lagna: str                          # Ascendant sign
    lagna_degree: float                 # Exact degree of lagna
    planets: List[PlanetPosition]
    houses: List[HouseInfo]

    # Dasha
    current_dasha: DashaEntry
    current_antardasha: AntardhashaEntry
    dasha_sequence: List[DashaEntry]

    # Navamsa
    navamsa_lagna: str
    navamsa_planets: List[NavamsaPosition]

    # Yogas
    yogas: List[YogaEntry]

    # Meta
    julian_day: float
    calculation_time: str


class SaveChartRequest(BaseModel):
    name: str
    chart_data: Dict[str, Any]


class UserChartResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    chart_data: Dict[str, Any]


class TransitDetail(BaseModel):
    planet: str
    influence: str  # "favorable" | "unfavorable"
    transit_rashi: str
    transit_degree: float
    transit_house: int
    reason: str  # e.g. "conjunct natal Venus" or "transiting house 7"
    transit_date: Optional[str] = None  # YYYY-MM-DD; day this snapshot represents


class TransitPeriod(BaseModel):
    start_date: str
    end_date: str
    type: str  # "favorable" | "unfavorable" | "neutral"
    duration_days: int
    strength: str  # "strong" | "moderate" | "weak"
    active_planets: List[str]
    description: str = ""
    guidance: str = ""
    rating: int = 3  # 1-5 scale: 1=Very Challenging, 5=Very Good
    rating_label: str = "Neutral"
    transit_details: List[TransitDetail] = []


class TransitTimelineResponse(BaseModel):
    life_area: str
    periods: List[TransitPeriod]


class MajorTransitEvent(BaseModel):
    date: str
    type: str
    planet: str
    natal_position: float
    transit_position: float


class CurrentTransitRequest(BaseModel):
    ayanamsha_value: float
    natal_lagna_degree: float


class LifetimeTransitRequest(BaseModel):
    """Request slow-planet transit positions sampled monthly from birth to age 100."""
    ayanamsha_value: float
    natal_lagna_degree: float
    birth_year: int
    birth_month: int = 1


class SlowPlanetSnapshot(BaseModel):
    """Planet positions at a single sample date."""
    date: str  # YYYY-MM-DD
    planets: Dict[str, int]  # planet_name -> house (1-12)


class LifetimeTransitResponse(BaseModel):
    """Monthly slow-planet positions across a lifetime."""
    snapshots: List[SlowPlanetSnapshot]


class CurrentTransitResponse(BaseModel):
    transit_date: str
    planets: List[PlanetPosition]
    houses: List[HouseInfo]
    lagna: str
    lagna_degree: float


class TransitChartRequest(BaseModel):
    chart_data: Dict[str, Any]
    start_date: str = Field(..., description="Date in YYYY-MM-DD format")
    end_date: str = Field(..., description="Date in YYYY-MM-DD format")
    life_areas: Optional[List[str]] = Field(
        default=None,
        description="Filter by life areas: love_life, health, career, finances, family, self_confidence"
    )


class TransitChartResponse(BaseModel):
    start_date: str
    end_date: str
    timelines: Dict[str, List[TransitPeriod]]
    major_transits: List[MajorTransitEvent]
    summary: Dict[str, str]  # Summary text for each life area


# ── Ingress-event timeline (Apr 2026 redesign) ───────────────────────────────
# Replaces the favorability-period model with a transit-event model:
# show where each planet sits at start_date, then list each ingress
# (sign-change) for the tracked planets across the window.

class PlanetSnapshot(BaseModel):
    """A planet's position at a single moment (used in opening_snapshot)."""
    planet: str
    sign: str
    sign_num: int  # 1-12
    degree: float  # 0-30 within the sign
    house: int     # 1-12 from natal lagna
    is_retrograde: bool
    nakshatra: Optional[str] = None


class IngressEvent(BaseModel):
    """One sign-change of a tracked planet, framed for a single life area."""
    date: str          # YYYY-MM-DD
    planet: str
    from_sign: str
    to_sign: str
    from_house: int    # from natal lagna
    to_house: int
    is_retrograde: bool
    duration_days: int            # days the planet stays in to_sign within window
    next_ingress_date: Optional[str] = None  # date planet leaves to_sign (or None if past window)
    classification: str  # "favorable" | "unfavorable" | "neutral"
    # Composed interpretation: house theme + planet vibe + area-specific lens.
    # Built per (planet, to_house, area, classification) so H6 vs H7 reads
    # genuinely different rather than reusing one (planet,area) string.
    interpretation: str
    life_area: str


class TransitIngressResponse(BaseModel):
    start_date: str
    end_date: str
    opening_snapshot: List[PlanetSnapshot]  # all 9 planets at start_date
    events_by_area: Dict[str, List[IngressEvent]]


# ── Panchang & Avakhada ──────────────────────────────────────────────────────

class TithiInfo(BaseModel):
    number: int           # 1–30
    name: str             # e.g. "Pratipada"
    paksha: str           # "Shukla" | "Krishna"
    nature: str
    deity: str
    interpretation: str


class KaranInfo(BaseModel):
    name: str
    number: int
    is_chara: bool
    nature: str
    interpretation: str


class YogaInfo(BaseModel):
    number: int
    name: str
    nature: str
    interpretation: str


class NakshatraInfo(BaseModel):
    name: str
    number: int           # 1–27
    pada: int             # 1–4
    lord: str
    interpretation: str


class VaraInfo(BaseModel):
    name: str             # weekday name
    lord: str
    interpretation: str


class SunriseSunsetInfo(BaseModel):
    sunrise_utc: Optional[str]
    sunset_utc: Optional[str]
    sunrise_local: Optional[str]
    sunset_local: Optional[str]


class AvakhadaInfo(BaseModel):
    varna: str
    vashya: str
    yoni: str
    gan: str
    nadi: str
    moon_sign: str
    sign_lord: str
    nakshatra: str
    nakshatra_charan: int    # pada 1–4
    yoga: str
    karan: str
    tithi: str
    yunja: str
    tatva: str
    name_alphabet: List[str]
    paya: str


class AvakhadaInterpretations(BaseModel):
    varna: str
    gan: str
    nadi: str
    yoni: str
    paya: str


class PanchangRequest(BaseModel):
    date: str             # YYYY-MM-DD
    time: str             # HH:MM
    place: str
    ayanamsha: str = "lahiri"


class PanchangResponse(BaseModel):
    # Echo
    date: str
    time: str
    place: str
    latitude: float
    longitude: float
    timezone: str

    # Panchang (5 limbs)
    vara: VaraInfo
    tithi: TithiInfo
    nakshatra: NakshatraInfo
    yoga: YogaInfo
    karan: KaranInfo

    # Sunrise/Sunset on birth date
    sun_times: SunriseSunsetInfo

    # Avakhada Chakra
    avakhada: AvakhadaInfo
    avakhada_interpretations: AvakhadaInterpretations


