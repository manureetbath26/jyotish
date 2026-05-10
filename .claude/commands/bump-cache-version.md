# Bump a cache version after a computation change

Use this when chart computation logic or daily engine logic has changed and
cached rows in the DB will produce wrong output if served as-is.

What changed: **$ARGUMENTS**

## Decide which version to bump

### Chart computation changed (`backend/services/astrology.py`)
Examples: Gulika table fix, lagna calculation change, new planet point added.

**Bump `_chart_version`:**

1. In `backend/services/astrology.py` → `calculate_full_chart()` return dict:
   ```python
   "_chart_version": <N+1>,   # was N
   ```

2. In `frontend/src/app/api/profiles/[id]/chart/route.ts`:
   ```ts
   const isStale = version < <N+1>;   // update the comparison
   ```
   Also update the comment above explaining what changed in this version.

3. In `frontend/src/app/api/daily/route.ts`:
   ```ts
   const CURRENT_CHART_VERSION = <N+1>;
   ```
   Also update the comment block above the constant.

**Effect:** Every `ProfileChart` row without `_chart_version >= N+1` will be deleted and recomputed on the next request to either `/api/profiles/[id]/chart` or `/api/daily`. Today's `DailyReading` rows are also deleted automatically (both routes handle this).

---

### Daily engine logic changed (`frontend/src/lib/dailyEngine.ts` or `dailyComposer.ts`)
Examples: Gochara bullet logic fix, new fact extraction, composer prompt change.

**Bump `CURRENT_ENGINE_VERSION`:**

1. In `frontend/src/app/api/daily/route.ts`:
   ```ts
   const CURRENT_ENGINE_VERSION = <M+1>;   // was M
   ```
   Update the version comment block above the constant to document what changed.

**Effect:** Every `DailyReading` row whose stored `facts._engine_version` is below `M+1` is deleted on the next request and the reading is regenerated from scratch. Chart data is NOT re-fetched (only the engine logic reruns).

---

## Both changed at once
Bump both versions independently. They are independent sentinels — do not try to unify them.

## After bumping

1. Verify the stale-detection logic by reading:
   - `frontend/src/app/api/profiles/[id]/chart/route.ts` — `version < CURRENT_CHART_VERSION`
   - `frontend/src/app/api/daily/route.ts` — `cachedEngineVersion >= CURRENT_ENGINE_VERSION`

2. Run `npx tsc --noEmit` — zero errors.

3. Commit with a message explaining what changed:
   ```
   fix(<area>): <what changed>; bump _chart_version to <N> / engine_version to <M>
   ```

4. After deploy: open the app, navigate to the chart or daily reading page — the stale detection will fire automatically on the first request. No manual DB cleanup needed.

## Current versions (update this comment when bumping)
- `_chart_version`: **2** (v2 = corrected BPHS Gulika table, May 2026)
- `CURRENT_ENGINE_VERSION`: **2** (v2 = Moon Gochara bullet uses actual tone, May 2026)
