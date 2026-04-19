import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Interpretation rules are classical and stable — cache aggressively
export const dynamic = "force-static";
export const revalidate = 3600;

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
