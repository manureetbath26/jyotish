from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import pytz

from models.schemas import (
    BirthDataInput, ChartResponse, TransitChartRequest, TransitChartResponse,
    PanchangRequest, PanchangResponse,
)
from services.geocoding import geocode_place, local_to_utc
from services.astrology import calculate_full_chart
from services.dasha import build_dasha_sequence, get_current_dasha_antardasha
from services.yogas import calculate_yogas
from services.transit import calculate_transit_periods, get_next_major_transit
from services.panchang import calculate_panchang

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


@router.post("/transits", response_model=TransitChartResponse)
async def calculate_transits(body: TransitChartRequest):
    """
    Calculate transit periods and major transit events.

    - Analyzes planetary transits against natal positions
    - Identifies favorable/unfavorable periods for life areas:
      - Love life, Health, Career, Finances, Family relationships
    - Includes major transit events (conjunctions, aspects)
    - Returns timelines and strength assessments
    """
    try:
        # Parse dates
        start_date = datetime.strptime(body.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(body.end_date, "%Y-%m-%d")

        if start_date >= end_date:
            raise ValueError("Start date must be before end date")

        # Get ayanamsha value from chart data
        ayanamsha_val = body.chart_data.get("ayanamsha_value", 0)

        # Get current dasha from chart
        current_dasha = body.chart_data.get("current_dasha", {})
        current_dasha_planet = current_dasha.get("planet") if current_dasha else None

        # Calculate transit periods
        timelines = calculate_transit_periods(
            body.chart_data,
            start_date,
            end_date,
            ayanamsha_val,
            current_dasha=current_dasha_planet
        )

        # Filter by requested life areas if specified
        if body.life_areas:
            timelines = {k: v for k, v in timelines.items() if k in body.life_areas}

        # Get major transit events
        major_transits = get_next_major_transit(
            body.chart_data,
            start_date,
            ayanamsha_val,
            months_ahead=int((end_date - start_date).days / 30)
        )

        # Generate summaries for each life area
        summary = {}
        for life_area, periods in timelines.items():
            favorable = [p for p in periods if p["type"] == "favorable"]
            unfavorable = [p for p in periods if p["type"] == "unfavorable"]

            favorable_days = sum(p["duration_days"] for p in favorable)
            unfavorable_days = sum(p["duration_days"] for p in unfavorable)

            if favorable_days > unfavorable_days:
                summary[life_area] = f"Generally favorable period with {len(favorable)} good periods and {len(unfavorable)} challenging periods"
            elif unfavorable_days > favorable_days:
                summary[life_area] = f"Mixed period with {len(favorable)} good periods and {len(unfavorable)} challenging periods. Exercise caution."
            else:
                summary[life_area] = f"Balanced period with equal favorable and unfavorable influences"

        return TransitChartResponse(
            start_date=body.start_date,
            end_date=body.end_date,
            timelines=timelines,
            major_transits=major_transits,
            summary=summary
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transit calculation error: {e}")
