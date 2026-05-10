# Add a Python backend endpoint

Add a new FastAPI endpoint to the Python backend.
Endpoint description: **$ARGUMENTS**

## File structure
```
backend/
  routers/chart.py        ← add new routes here (or create a new router)
  services/astrology.py   ← add computation logic here
  models/schemas.py       ← add Pydantic request/response models here
  main.py                 ← register new routers here
```

## Step-by-step

### 1. Pydantic schemas  `backend/models/schemas.py`
- Request body: inherit from `BaseModel`, all fields typed
- Response: inherit from `BaseModel`, use `Optional[X] = None` for nullable fields
- Use `float` for all longitude/degree values, `int` for house numbers (1-12), `str` for sign names
- Example:
```python
class MyRequest(BaseModel):
    date: str           # "YYYY-MM-DD"
    time: str           # "HH:MM"
    place: str          # "City, Country"

class MyResponse(BaseModel):
    result: float
    sign: str
    house: int
    detail: Optional[str] = None
```

### 2. Service function  `backend/services/astrology.py`
- Pure function — no FastAPI imports, no HTTP concerns
- Always set ayanamsha at the top: `set_ayanamsha("lahiri")` (or accept it as parameter)
- Use `swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED` flag for all planet calculations
- Sidereal longitude formula: `(tropical_lon - swe.get_ayanamsa_ut(jd)) % 360`
- Whole-sign house: `((sign_num - lagna_sign_num) % 12) + 1`
- Always round output: `round(lon, 4)` for degrees
- Return a plain `dict` — the router converts it to Pydantic

### 3. Router  `backend/routers/chart.py`
```python
@router.post("/api/<resource>/<action>", response_model=MyResponse)
async def my_endpoint(req: MyRequest):
    try:
        utc_dt, lat, lng = await resolve_birth_data(req.date, req.time, req.place)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    result = my_service_function(utc_dt, lat, lng)
    return MyResponse(**result)
```
- Use `async def` for all route handlers
- Geocoding: reuse `resolve_birth_data()` (already handles caching, timezone conversion)
- `HTTPException(status_code=400, detail=...)` for bad input; 500 bubbles up automatically

### 4. Register router  `backend/main.py`
Only needed if creating a new router file — existing `chart.py` router is already registered.

## Key constraints

### Swiss Ephemeris patterns
- `swe.rise_trans()` signature: `ret, t = swe.rise_trans(jd, body, calc_flag, geopos, atpress, attemp, flag)`  — `geopos = (lng, lat, 0.0)`, result time is `t[0]`
- `swe.houses()` signature: `cusps, ascmc = swe.houses(jd, lat, lng, b'P')` — ascendant is `ascmc[0]`
- Always subtract ayanamsha after `swe.houses()`: `sidereal_asc = (ascmc[0] - swe.get_ayanamsa_ut(jd)) % 360`
- Weekday from Python datetime: `dt.weekday()` → Mon=0 … Sun=6

### Performance
- Geocoding results are cached in `geocode_cache.json` automatically via `resolve_birth_data()`
- For endpoints called on every page load, consider adding an in-memory TTL cache in `services/rules.py`
- Swiss Ephemeris file I/O is fast but not free — don't call `swe.calc_ut()` in a loop if avoidable

### Version stamping
If the endpoint contributes to the natal chart payload, increment `_chart_version` in `calculate_full_chart()` return dict and bump `CURRENT_CHART_VERSION` in `frontend/src/app/api/daily/route.ts` (currently 2).

## After adding
- Test with: `curl -X POST http://localhost:8000/api/<resource>/<action> -H "Content-Type: application/json" -d '{"date":"1990-01-01","time":"08:00","place":"Delhi, India"}'`
- Run frontend type check: `cd frontend && npx tsc --noEmit`
