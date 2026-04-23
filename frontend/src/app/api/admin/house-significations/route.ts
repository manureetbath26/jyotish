import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshHouseSignifications } from "@/lib/houseSignificationsServer";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") return null;
  return session;
}

/** GET — admin view, same rows as public endpoint but bypasses cache. */
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.houseSignification.findMany({
    orderBy: { house: "asc" },
  });
  return Response.json(rows);
}

/**
 * PATCH /api/admin/house-significations
 * Body: { house: number, name?: string, short?: string, themes?: string }
 *
 * Updates a single row. Busts the server cache so the next public GET
 * picks up the fresh copy within the browser TTL (5 min).
 */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.house !== "number" || body.house < 1 || body.house > 12) {
    return Response.json({ error: "house must be an integer 1..12" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const k of ["name", "short", "themes"] as const) {
    if (typeof body[k] === "string" && body[k].trim().length > 0) {
      data[k] = body[k].trim();
    }
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const updated = await prisma.houseSignification.update({
    where: { house: body.house },
    data,
  });
  refreshHouseSignifications();
  return Response.json(updated);
}
