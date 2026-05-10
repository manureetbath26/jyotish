# Audit codebase for pattern violations

Scan the codebase and report any deviations from the established patterns.
Focus area (leave blank for full audit): **$ARGUMENTS**

## What to check

### 1. Cache version consistency
- `backend/services/astrology.py`: what is `_chart_version` in `calculate_full_chart()` return dict?
- `frontend/src/app/api/profiles/[id]/chart/route.ts`: what is the `version < N` check?
- `frontend/src/app/api/daily/route.ts`: what are `CURRENT_CHART_VERSION` and `CURRENT_ENGINE_VERSION`?
- All three must agree. Report any mismatch.

### 2. Report freeze pattern
For each file in `frontend/src/app/reports/*/page.tsx` (career, finance, yoga, life-events, chara-dasha, ayurvedic):
- Does it track `purchaseId` state?
- Does it `setFrozenReport(data.reportData)` when loading an existing report?
- Does it call `PATCH /api/reports/purchase/${purchaseId}` after generation?
- Does it pass `frozenReport` and `onReportReady` to the view component?

For each view component in `frontend/src/components/reports/*ReportView.tsx`:
- Does it accept `frozenReport?` prop?
- Does it skip computation when `frozenReport` is provided?
- Does it call `onReportReady` exactly once (guarded by `useRef`)?

### 3. API route patterns
For each file in `frontend/src/app/api/**/*route.ts` that handles user data:
- Does it call `auth()` before touching the DB?
- Does it `await params` before destructuring? (never `params.id` directly)
- Does it return `{ error: string }` on failures (not thrown errors or raw objects)?
- Does it use `Response.json()` (not `NextResponse.json()`)?
- Upserts instead of creates where concurrent calls are possible?

### 4. rulesServer.ts cache pattern
For each cache block in `frontend/src/lib/rulesServer.ts`:
- Does it use the shared `TTL_MS` constant (not a magic number)?
- Does it use the `inFlight` promise deduplication pattern?
- Does it have a graceful fallback (return `[]` or stale cache) on DB error?
- Does it re-export its Prisma type so consumers don't import from `@/generated/prisma`?

### 5. Backend Swiss Ephemeris patterns
In `backend/services/astrology.py`:
- Is `swe.set_sid_mode()` called before every computation entry point? (check `set_ayanamsha()` usage)
- Are all `swe.houses()` results corrected with `- swe.get_ayanamsa_ut(jd)`?
- Are whole-sign houses computed as `((sign_num - lagna_sign_num) % 12) + 1`?

### 6. DailyReading staleness
- Does `frontend/src/app/api/daily/route.ts` check `_engine_version` before serving from cache?
- Does `frontend/src/app/api/profiles/[id]/chart/route.ts` delete today's `DailyReading` when busting `ProfileChart`?
- Does `frontend/src/app/api/daily/route.ts` check `_chart_version` before the DailyReading cache hit?

## Output format
For each check, report:
- ✅ Compliant — or —
- ❌ Violation: `<file>:<line>` — `<what's wrong>` — `<suggested fix>`

At the end, list any files that should follow a pattern but have not been touched yet (e.g. report pages missing freeze logic, new rule tables missing a cached server function).
