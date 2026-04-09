from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from timezonefinder import TimezoneFinder
import pytz
from datetime import datetime
from typing import Tuple, Dict
import asyncio
import time


geolocator = Nominatim(user_agent="vedic_astrology_app/1.0")
tf = TimezoneFinder()

# In-memory cache: place → (lat, lng, tz_str)
_geocode_cache: Dict[str, Tuple[float, float, str]] = {}

# Rate-limit: track last request time
_last_request_time: float = 0.0
_MIN_INTERVAL: float = 1.1  # seconds between Nominatim requests


async def geocode_place(place: str) -> Tuple[float, float, str]:
    """
    Geocode a place name to (latitude, longitude, timezone_str).
    Uses an in-memory cache to avoid repeated API calls.
    Raises ValueError if place not found.
    """
    cache_key = place.strip().lower()

    # Return cached result if available
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    # Rate-limit: wait if needed
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _MIN_INTERVAL:
        await asyncio.sleep(_MIN_INTERVAL - elapsed)

    loop = asyncio.get_event_loop()

    try:
        _last_request_time = time.time()
        location = await loop.run_in_executor(
            None,
            lambda: geolocator.geocode(place, timeout=10)
        )
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        raise ValueError(f"Geocoding service error: {e}")

    if location is None:
        raise ValueError(f"Could not geocode place: '{place}'")

    lat = location.latitude
    lng = location.longitude

    tz_str = tf.timezone_at(lat=lat, lng=lng)
    if tz_str is None:
        # Fallback: estimate from longitude
        offset_hours = round(lng / 15)
        tz_str = f"Etc/GMT{-offset_hours:+d}" if offset_hours != 0 else "UTC"

    # Cache the result
    result = (lat, lng, tz_str)
    _geocode_cache[cache_key] = result

    return result


def local_to_utc(date_str: str, time_str: str, tz_str: str) -> datetime:
    """Convert local date+time to UTC datetime."""
    tz = pytz.timezone(tz_str)
    naive_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    local_dt = tz.localize(naive_dt, is_dst=None)
    return local_dt.astimezone(pytz.utc)
