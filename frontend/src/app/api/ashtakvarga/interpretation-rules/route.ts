import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Use dynamic rendering to ensure DB is queried fresh on each request.
// (force-static with DB access can silently cache empty arrays if build
// happens before seed, which would hide the interpretation panel.)
export const dynamic = "force-dynamic";

/**
 * GET /api/ashtakvarga/interpretation-rules
 * Returns all Sarvashtakavarga interpretation rules grouped by category:
 *   { house: [...12 rules], trikona: [...4 rules], comparison: [...3 rules] }
 *
 * Source: https://shilaavinyaas.com/p/sarvashtakavarga-explained-house-wise-impacts-rules-remedies
 */
export async function GET(_req: NextRequest) {
  const rules = await prisma.sarvashtakvargaRule.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const grouped: Record<string, Array<{ ruleKey: string; content: unknown }>> = {
    house: [],
    trikona: [],
    comparison: [],
  };
  for (const r of rules) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push({ ruleKey: r.ruleKey, content: r.content });
  }

  return Response.json(grouped);
}
