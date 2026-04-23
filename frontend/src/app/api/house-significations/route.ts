import { NextResponse } from "next/server";
import { getHouseSignifications } from "@/lib/houseSignificationsServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/house-significations
 *
 * Public endpoint — returns the 12 house signification rows (admin-editable).
 * Backed by the server-side module cache so repeated calls are effectively
 * free. Clients fetch once per page lifetime and override their compile-time
 * fallback with the result.
 */
export async function GET() {
  const map = await getHouseSignifications();
  const rows = Object.values(map).sort((a, b) => a.house - b.house);
  return NextResponse.json(rows, {
    headers: {
      // Short browser cache; admin edits bust the server cache so fresh
      // clients pick up new copy within this window.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
