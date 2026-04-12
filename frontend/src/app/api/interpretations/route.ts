import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/interpretations?category=chara_role
 * GET /api/interpretations?category=chara_by_planet&key1=AK
 * GET /api/interpretations?category=naisargika_in_house&key1=Sun&key2=5
 *
 * Public read-only endpoint for interpretation content.
 * Supports filtering by category, key1, and key2.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  if (!category) {
    return Response.json({ error: "category parameter is required" }, { status: 400 });
  }

  const where: Record<string, string> = { category };

  const key1 = searchParams.get("key1");
  if (key1) where.key1 = key1;

  const key2 = searchParams.get("key2");
  if (key2) where.key2 = key2;

  const rows = await prisma.interpretation.findMany({
    where,
    orderBy: [{ key1: "asc" }, { key2: "asc" }],
  });

  return Response.json(rows);
}
