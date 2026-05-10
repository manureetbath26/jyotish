# Add a new DB-backed rule table

Add a new rule table end-to-end following the established pattern.
Table name / purpose: **$ARGUMENTS**

## Full checklist

### 1. Prisma model  `frontend/prisma/schema.prisma`
Add the model following existing conventions:
- `id String @id` (use `@default(cuid())` unless rows have natural IDs)
- Every field that is an enum value → store as `String`, validate in code
- Add `@@index` on any field used in `where` clauses
- Run `npx prisma migrate dev --name add_<table_name>` after editing schema
- Run `npx prisma generate` to regenerate the client

### 2. Seed file  `frontend/prisma/seed-<table-name>.ts`
Copy the header pattern from `frontend/prisma/seed-moon-transit-rules.ts`:
```ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```
- Use `prisma.<model>.upsert()` (not `create`) so the seed is idempotent
- Add a `main()` + `main().catch(console.error).finally(() => prisma.$disconnect())`
- Run with: `npx tsx prisma/seed-<table-name>.ts`

### 3. Cached server function  `frontend/src/lib/rulesServer.ts`
Add a new cache block following the exact pattern of `getCachedMoonTransitRules()`:
```ts
let <name>Cached: <ModelType>[] | null = null;
let <name>LoadedAt = 0;
let <name>InFlight: Promise<<ModelType>[]> | null = null;

export async function getCached<Name>Rules(): Promise<<ModelType>[]> {
  const now = Date.now();
  if (<name>Cached && now - <name>LoadedAt < TTL_MS) return <name>Cached;
  if (<name>InFlight) return <name>InFlight;
  <name>InFlight = (async () => {
    try {
      const rows = await prisma.<model>.findMany();
      <name>Cached = rows;
      <name>LoadedAt = Date.now();
      return rows;
    } catch (err) {
      console.warn("[rulesServer] <model> fetch failed:", err);
      if (<name>Cached) return <name>Cached;
      return [];
    } finally {
      <name>InFlight = null;
    }
  })();
  return <name>InFlight;
}
```
- TTL_MS is already defined (5 min) — reuse it, do not redeclare
- Import the type from `@/generated/prisma` and re-export it for consumers

### 4. API route  `frontend/src/app/api/<resource>/rules/route.ts`
```ts
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.<model>.findMany({ orderBy: { ... } });
  return Response.json(rows);
}
```
- No auth required for read-only rule endpoints (rules are not user data)
- Add a `PUT` or `POST` handler only if admin editing is needed

### 5. Admin UI (optional)
If admin editing is needed, add a page under `frontend/src/app/admin/` and an admin API route under `frontend/src/app/api/admin/<resource>/route.ts` following the pattern in `frontend/src/app/api/admin/interpretations/route.ts`.

## Key constraints
- Always re-export the Prisma-generated type from `rulesServer.ts` so consumers don't import from `@/generated/prisma` directly
- Never share the `TTL_MS` value by magic number — the existing constant is 5 * 60 * 1000
- Run `npx tsc --noEmit` before finishing
