# Add a new computed astrological point

Add a new sensitive point (like Bhrigu Bindu or Gulika) to the chart end-to-end.
Point name and classical method: **$ARGUMENTS**

## Full implementation checklist

### 1. Backend computation  `backend/services/astrology.py`

Add a `compute_<point>(...)` function:
- Accept only pre-computed inputs (Julian Day, sidereal longitudes, lat/lng) — no geocoding inside
- Return a plain `float` (sidereal longitude 0–360)
- Document the classical source in the docstring (BPHS chapter, Phaladeepika, etc.)
- Add constants at the top of the file near `GULIKA_PORTIONS` if needed

Integrate into `calculate_full_chart()`:
```python
pt_lon = compute_<point>(...)
pt_rashi_num, pt_deg = longitude_to_rashi(pt_lon)
pt_nakshatra, pt_pada = longitude_to_nakshatra(pt_lon)
pt_house = ((pt_rashi_num - lagna_rashi_num) % 12) + 1
```
Add to the return dict:
```python
"<point_key>": {
    "name": "<DisplayName>",
    "longitude": pt_lon,
    "sign": RASHI_NAMES[pt_rashi_num - 1],
    "sign_num": pt_rashi_num,
    "degree_in_sign": round(pt_deg, 4),
    "house": pt_house,
    "nakshatra": pt_nakshatra,
    "nakshatra_pada": pt_pada,
},
```
**Bump `_chart_version`** (run `/bump-cache-version` after this step).

### 2. Backend schema  `backend/models/schemas.py`
The `UpagrahaInfo` Pydantic model already exists — reuse it:
```python
class UpagrahaInfo(BaseModel):
    name: str
    longitude: float
    sign: str
    sign_num: int
    degree_in_sign: float
    house: int
    nakshatra: str
    nakshatra_pada: int
```
Add to `ChartResponse`:
```python
<point_key>: Optional[UpagrahaInfo] = None
```

### 3. Backend router  `backend/routers/chart.py`
In the `/api/chart/calculate` handler, pass the new field:
```python
<point_key>=UpagrahaInfo(**chart["<point_key>"]) if chart.get("<point_key>") else None
```

### 4. Frontend API type  `frontend/src/lib/api.ts`
Add to the `ChartResponse` interface:
```ts
<point_key>?: UpagrahaInfo;   // UpagrahaInfo interface already exists
```

### 5. Rule table  `frontend/prisma/schema.prisma`
Add a `<Point>Rule` model (12 rows, one per house):
```prisma
model <Point>Rule {
  id       String   @id
  point    String   // "<DisplayName>"
  house    Int      // 1–12
  tone     String   // "positive" | "negative" | "mixed" | "neutral"
  effect   String
  detail   String
  keywords String[]
  source   String
}
```
Then run `/new-rule-table <Point>Rule` for the full seed + cache + API scaffold.

### 6. Chart display  `frontend/src/components/charts/NorthIndianChart.tsx`
Add a color constant near `SPECIAL_POINT_COLOR`:
```ts
SPECIAL_POINT_COLOR["<DisplayName>"] = "#<hex>";
```
Add to the `houseSpecialPoints` builder so the point renders in the correct house cell (same logic as BhriguBindu / Gulika).

### 7. Interpretation panel  `frontend/src/components/ChartDisplay.tsx`
Add a `<Name>Interpretation` inline component following the `GalikaInterpretation` pattern:
- Fetch rules from the DB via the API route
- Display tone badge + effect + detail + source
- Add to `SpecialPointsPanel` when the point is present

### 8. Client-side fallback (if derivable from existing planet data)
If the point can be computed purely from longitudes already in `chart.planets` (like BB = midpoint of Moon + Rahu), add a `derive<Name>FromPlanets(chart)` fallback in `ChartDisplay.tsx` so it shows even from cached charts that predate the backend change.

## Verification
After implementing:
```bash
python backend/verify_<point>.py   # write a quick script to spot-check a known birth
cd frontend && npx tsc --noEmit
```
Check that the point appears in the kundli chart and the interpretation panel renders correctly.
