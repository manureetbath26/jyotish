# Scaffold a new Next.js API route

Create a new typed, auth-gated API route.
Route path and purpose: **$ARGUMENTS**

## Standard route template

```ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },   // omit if no dynamic segment
) {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Params (always await — params is a Promise in this Next.js version)
  const { id } = await params;

  // 3. Ownership check
  const record = await prisma.<model>.findUnique({ where: { id } });
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  if (record.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Cache hit (if applicable)
  // ...

  // 5. Compute / fetch
  // ...

  return Response.json({ ... });
}
```

## Rules to follow

### Params
- `params` is **always** `Promise<{ ... }>` in this codebase — always `await params` before destructuring. Never access `params.id` directly.

### Auth
- Every route that touches user data MUST call `auth()` first
- Public rule endpoints (yoga/rules, ashtakvarga/rules, moon-transit-rules) are the only exceptions — they serve static DB content, no auth needed

### Cache pattern (for expensive computations)
Follow `frontend/src/app/api/profiles/[id]/chart/route.ts`:
1. Check DB cache first → return if fresh
2. Detect staleness with a `_version` field in the stored JSON
3. Compute from backend if stale/missing
4. Upsert (not create) to handle concurrent requests: `prisma.<model>.upsert({ where: ..., create: ..., update: ... })`

### Version stamping
If the route stores computed JSON:
- Include `_chart_version: CURRENT_CHART_VERSION` or a domain-specific version field
- The consuming route must check this version before serving from cache

### Error shape
Always return `{ error: string }` with an appropriate HTTP status — never throw unhandled or return raw exception objects.

### Response helpers
Use `Response.json()` — not `NextResponse.json()`. This codebase uses the native `Response` API throughout.

## File placement
- Dynamic segment routes: `src/app/api/<resource>/[id]/route.ts`
- Collection routes: `src/app/api/<resource>/route.ts`
- Sub-resource routes: `src/app/api/<resource>/[id]/<sub>/route.ts`

## After creating
Run `npx tsc --noEmit` — zero errors required.
