from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from timezonefinder import TimezoneFinder
import pytz
from datetime import datetime
from typing import Tuple, Dict
import asyncio
import json
import os
import time


geolocator = Nominatim(user_agent="vedic_astrology_app/1.0")
tf = TimezoneFinder()


# ---------------------------------------------------------------------------
# Persistent disk-backed cache
# ---------------------------------------------------------------------------
# Nominatim has an aggressive rate limit. We persist successful geocodes to
# disk so common places (e.g. "Mumbai, India") need only one API call across
# the entire lifetime of the server, even across restarts.
_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "geocode_cache.json"
)


def _load_cache() -> Dict[str, Tuple[float, float, str]]:
    if not os.path.exists(_CACHE_FILE):
        return {}
    try:
        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        # JSON stores tuples as lists; coerce back
        return {k: (float(v[0]), float(v[1]), str(v[2])) for k, v in raw.items()}
    except Exception:
        # Corrupt cache — start fresh rather than crash
        return {}


def _save_cache(cache: Dict[str, Tuple[float, float, str]]) -> None:
    try:
        tmp_path = _CACHE_FILE + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump({k: list(v) for k, v in cache.items()}, f, ensure_ascii=False)
        os.replace(tmp_path, _CACHE_FILE)
    except Exception:
        # Best-effort; don't fail a request over cache write
        pass


_geocode_cache: Dict[str, Tuple[float, float, str]] = _load_cache()

# Rate-limit: track last request time across all requests
_last_request_time: float = 0.0
_MIN_INTERVAL: float = 1.2  # seconds between Nominatim requests

# Retry config for HTTP 429 (too many requests)
_RETRY_DELAYS: Tuple[float, ...] = (3.0, 8.0, 20.0)


def _is_rate_limit_error(exc: Exception) -> bool:
    """Detect 429 / quota-exceeded in a geopy exception."""
    msg = str(exc).lower()
    return "429" in msg or "too many requests" in msg or "quota" in msg


async def geocode_place(place: str) -> Tuple[float, float, str]:
    """
    Geocode a place name to (latitude, longitude, timezone_str).

    Uses a disk-backed cache so repeated requests for the same place never hit
    the Nominatim API after the first success. On HTTP 429 (rate limit) we
    retry with exponential backoff before surfacing an error.
    """
    cache_key = place.strip().lower()

    # Return cached result if available
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    # Per-process rate limit
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _MIN_INTERVAL:
        await asyncio.sleep(_MIN_INTERVAL - elapsed)

    loop = asyncio.get_event_loop()

    # Try, then retry on 429 with backoff
    last_exc: Exception = ValueError("No attempts made")
    attempts = [0.0, *_RETRY_DELAYS]  # first attempt immediate, then backoffs

    for delay in attempts:
        if delay > 0:
            await asyncio.sleep(delay)

        try:
            _last_request_time = time.time()
            location = await loop.run_in_executor(
                None,
                lambda: geolocator.geocode(place, timeout=10),
            )
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            last_exc = e
            if _is_rate_limit_error(e):
                # Retry after backoff
                continue
            # Other service errors — surface immediately
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

        # Cache the result (memory + disk)
        result = (lat, lng, tz_str)
        _geocode_cache[cache_key] = result
        _save_cache(_geocode_cache)

        return result

    # All retries exhausted — return a helpful message
    raise ValueError(
        f"Geocoding service is rate-limited. Please retry in a minute. "
        f"(Place: '{place}'; last error: {last_exc})"
    )


def local_to_utc(date_str: str, time_str: str, tz_str: str) -> datetime:
    """Convert local date+time to UTC datetime."""
    tz = pytz.timezone(tz_str)
    naive_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    local_dt = tz.localize(naive_dt, is_dst=None)
    return local_dt.astimezone(pytz.utc)
