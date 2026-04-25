from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import pytz

from models.schemas import (
    BirthDataInput, ChartResponse, TransitChartRequest,
    CurrentTransitRequest, CurrentTransitResponse,
    LifetimeTransitRequest, LifetimeTransitResponse,
    PanchangRequest, PanchangResponse,
    TransitIngressResponse,
)
from services.geocoding import geocode_place, local_to_utc
from services.astrology import calculate_full_chart
from services.dasha import build_dasha_sequence, get_current_dasha_antardasha
from services.yogas import calculate_yogas
from services.transit import (
    get_current_transit_positions,
    get_lifetime_transit_snapshots,
    calculate_opening_snapshot,
    calculate_transit_ingresses,
    calculate_pratyantardasha_events,
    compose_area_narrative,
)
from services.panchang import calculate_panchang
from services import rules as rules_module
router = APIRouter(prefix="/api/chart", tags=["chart"])


@router.post("/calculate", response_model=ChartResponse)
async def calculate_chart(body: BirthDataInput):
    """
    Calculate a complete Vedic birth chart.

    - Geocodes the place to lat/lng/timezone
    - Calculates sidereal planetary positions (Lahiri ayanamsha by default)
    - Assigns Whole Sign houses
    - Computes Vimshottari Dasha sequence
    - Returns Navamsa (D-9) positions
    """
    # --- Geocode ---
    try:
        lat, lng, tz_str = await geocode_place(body.place)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # --- Convert to UTC ---
    try:
        utc_dt = local_to_utc(body.date, body.time, tz_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time: {e}")

    # --- Calculate chart ---
    try:
        chart = calculate_full_chart(utc_dt, lat, lng, body.ayanamsha)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart calculation error: {e}")

    # --- Dasha ---
    try:
        dashas = build_dasha_sequence(utc_dt, chart["moon_longitude"])
        today = datetime.now(pytz.utc)
        current_dasha, current_antardasha = get_current_dasha_antardasha(dashas, today)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dasha calculation error: {e}")

    # --- Yogas ---
    try:
        yogas = calculate_yogas(chart["planets"], chart["houses"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yoga calculation error: {e}")

    return ChartResponse(
        date=body.date,
        time=body.time,
        place=body.place,
        latitude=round(lat, 6),
        longitude=round(lng, 6),
        timezone=tz_str,
        ayanamsha=body.ayanamsha,
        ayanamsha_value=chart["ayanamsha_value"],
        lagna=chart["lagna"],
        lagna_degree=chart["lagna_degree"],
        planets=chart["planets"],
        houses=chart["houses"],
        current_dasha=current_dasha,
        current_antardasha=current_antardasha,
        dasha_sequence=dashas,
        navamsa_lagna=chart["navamsa_lagna"],
        navamsa_planets=chart["navamsa_planets"],
        yogas=yogas,
        julian_day=chart["julian_day"],
        calculation_time=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/ayanamshas")
async def list_ayanamshas():
    """List available ayanamsha options."""
    return {
        "ayanamshas": [
            {"id": "lahiri",       "name": "Lahiri (Chitrapaksha)",  "description": "Most widely used in India"},
            {"id": "krishnamurti", "name": "Krishnamurti (KP)",      "description": "Used in KP astrology system"},
            {"id": "raman",        "name": "B.V. Raman",             "description": "Used by B.V. Raman school"},
        ]
    }


@router.post("/panchang", response_model=PanchangResponse)
async def get_panchang(body: PanchangRequest):
    """Calculate Panchang and Avakhada for a birth date/place."""
    try:
        lat, lng, tz_str = await geocode_place(body.place)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        utc_dt = local_to_utc(body.date, body.time, tz_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time: {e}")

    try:
        result = calculate_panchang(utc_dt, lat, lng, tz_str, body.ayanamsha)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Panchang calculation error: {e}")

    return PanchangResponse(
        date=body.date,
        time=body.time,
        place=body.place,
        latitude=round(lat, 6),
        longitude=round(lng, 6),
        timezone=tz_str,
        **result,
    )


# Legacy /transits endpoint removed Apr 2026 — replaced by /transit-ingresses.
# The favorability-period model never matched how astrologers actually read
# transits; the ingress-event timeline + per-area narrative composer is the
# canonical replacement.


@router.post("/lifetime-transits", response_model=LifetimeTransitResponse)
async def lifetime_transits(body: LifetimeTransitRequest):
    """Get slow-planet transit positions sampled monthly from birth to age 100."""
    try:
        snapshots = get_lifetime_transit_snapshots(
            body.ayanamsha_value,
            body.natal_lagna_degree,
            body.birth_year,
            body.birth_month,
        )
        return LifetimeTransitResponse(snapshots=snapshots)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lifetime transit error: {e}")


@router.post("/current-transits", response_model=CurrentTransitResponse)
async def current_transits(body: CurrentTransitRequest):
    """Get current planet positions for today, in the natal house framework."""
    try:
        result = get_current_transit_positions(
            body.ayanamsha_value,
            body.natal_lagna_degree,
        )
        return CurrentTransitResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Current transit error: {e}")


@router.post("/transit-ingresses", response_model=TransitIngressResponse)
async def transit_ingresses(body: TransitChartRequest):
    """
    Ingress-event timeline for the requested window + life areas.

    Returns:
      - opening_snapshot: every planet's position on start_date (sign,
        degree, house from natal lagna).
      - events_by_area: per requested life area, a chronological list
        of sign-changes for the tracked planets (Mars + the four slow
        ones), each framed for that area with classical favorable /
        unfavorable interpretation and duration to the next ingress.

    Window is capped to whatever the caller sends — the frontend caps
    to 1 year so the per-area card list stays scannable.
    """
    try:
        start_date = datetime.strptime(body.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(body.end_date, "%Y-%m-%d")
        if start_date >= end_date:
            raise ValueError("Start date must be before end date")

        ayanamsha_val = body.chart_data.get("ayanamsha_value", 0)
        life_areas = body.life_areas or []
        if not life_areas:
            raise ValueError("life_areas cannot be empty — pick at least one area")

        # Warm the rules cache in this async context so the sync
        # calculator below can read it without blocking on DB I/O.
        await rules_module.get_rules()

        opening_snapshot = calculate_opening_snapshot(
            body.chart_data, start_date, ayanamsha_val
        )

        ingress_events = calculate_transit_ingresses(
            body.chart_data, start_date, end_date, ayanamsha_val, life_areas
        )
        pd_events = calculate_pratyantardasha_events(
            body.chart_data, start_date, end_date, life_areas
        )

        # Merge ingress + PD events per area, sort chronologically by date.
        events_by_area: dict = {}
        for area in life_areas:
            combined = (ingress_events.get(area, []) + pd_events.get(area, []))
            combined.sort(key=lambda e: e["date"])
            events_by_area[area] = combined

        # Compose per-area narrative synthesis (current → next → background).
        rules = await rules_module.get_rules()
        today = datetime.utcnow()
        narrative_by_area: dict = {}
        for area in life_areas:
            try:
                narrative_by_area[area] = compose_area_narrative(
                    rules,
                    body.chart_data,
                    area,
                    events_by_area[area],
                    today,
                    end_date,
                    ayanamsha_val,
                )
            except Exception as ne:
                # Narrative is enrichment — never fail the whole response on it.
                print(f"[transit-ingresses] narrative compose failed for {area}: {ne}")
                narrative_by_area[area] = ""

        return TransitIngressResponse(
            start_date=body.start_date,
            end_date=body.end_date,
            opening_snapshot=opening_snapshot,
            events_by_area=events_by_area,
            narrative_by_area=narrative_by_area,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transit ingress error: {e}")
