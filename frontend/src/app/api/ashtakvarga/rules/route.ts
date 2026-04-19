import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Rules rarely change; cache them aggressively on the CDN.
export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

/**
 * GET /api/ashtakvarga/rules
 * Returns all 56 Ashtakvarga bindu contribution rules.
 * Publicly readable — these are classical reference data, not user-scoped.
 */
export async function GET(_req: NextRequest) {
  const rules = await prisma.ashtakvargaRule.findMany({
    select: { planet: true, source: true, houses: true },
    orderBy: [{ planet: "asc" }, { source: "asc" }],
  });

  return Response.json(rules);
}
