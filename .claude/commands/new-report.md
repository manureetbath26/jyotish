# Scaffold a new paid report type

Scaffold a complete new paid report following the established freeze pattern.
The report slug/name is: **$ARGUMENTS**

## What to build (in order)

### 1. Computation engine  `frontend/src/lib/<slug>Engine.ts`
- Export a pure function `generate<Name>Report(chart: ChartResponse, ...deps): <Name>Report`
- Export the `<Name>Report` TypeScript type
- Engine must be deterministic — same chart → same output (no `Date.now()` inside)
- Fetch any DB rules via arguments (passed in from the page/view), not inside the engine

### 2. View component  `frontend/src/components/reports/<Name>ReportView.tsx`
```tsx
interface Props {
  chart: ChartResponse;
  userName?: string;
  onBack?: () => void;
  /** Pre-computed frozen report — skips computation when provided */
  frozenReport?: <Name>Report;
  /** Called once after a fresh report is generated (not for frozen) */
  onReportReady?: (report: <Name>Report) => void;
}
```
- If `frozenReport` is supplied → render it directly, skip all fetches/computation
- After fresh generation, call `onReportReady?.(report)` exactly once (use a `useRef` flag to prevent duplicate calls on re-renders)
- Loading/error states required
- Use `<ReportShell onBack={onBack}>` as wrapper (import from `@/components/ReportShell`)

### 3. Report page  `frontend/src/app/reports/<slug>/page.tsx`
Follow **exactly** the pattern in `frontend/src/app/reports/career/page.tsx`:
- `"use client"` + `Suspense` wrapper
- Steps: `"birth" | "preview" | "payment" | "report"`
- `const [frozenReport, setFrozenReport] = useState<<Name>Report | null>(null)`
- `const [purchaseId, setPurchaseId] = useState<string | null>(reportId)`
- Load existing report: fetch `/api/reports/purchase/${reportId}` → if `data.reportData` exists, `setFrozenReport(data.reportData as <Name>Report)`
- On purchase (both UPI and coupon paths): capture `data.id` → `setPurchaseId(data.id)`
- `handleReportReady` callback: `PATCH /api/reports/purchase/${purchaseId}` with `{ reportData: report }` — best-effort, wrapped in `.catch(() => {})`
- Pass `frozenReport={frozenReport ?? undefined}` and `onReportReady={handleReportReady}` to the view

### 4. Catalog entry
Add the new report slug + price to the `ReportCatalog` table via a direct `prisma.reportCatalog.upsert()` script or note it for the admin panel. `reportType` string must match the slug.

### 5. Navigation
Add a card/link to `frontend/src/app/reports/page.tsx` for the new report.

## Key constraints
- PATCH `/api/reports/purchase/[id]` already exists — do not recreate it
- `reportData` field already exists on `ReportPurchase` model — no migration needed
- Never call `Date.now()` or use today's date inside the engine function itself
- Always run `npx tsc --noEmit` before finishing — zero type errors required
