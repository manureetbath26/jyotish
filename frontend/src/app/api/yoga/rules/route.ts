import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/yoga/rules
 * Returns all yoga rules (from BPHS Ch 34-43) for client-side detection.
 */
export async function GET(_req: NextRequest) {
  const rules = await prisma.yogaRule.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  return Response.json(rules);
}
