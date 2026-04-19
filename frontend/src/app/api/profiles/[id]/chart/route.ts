import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:8000";

/**
 * GET /api/profiles/[id]/chart
 *
 * Returns the cached natal chart for the given profile. If no chart is
 * cached yet, calls the backend to compute it, stores it, then returns.
 *
 * Idempotent: safe to call repeatedly. Cache is invalidated when the
 * profile's birth details change (handled in PATCH /api/profiles/[id]).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { chart: true },
  });
  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }
  if (profile.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cache hit
  if (profile.chart) {
    return Response.json({
      chartData: profile.chart.chartData,
      cached: true,
      generatedAt: profile.chart.createdAt,
    });
  }

  // Cache miss — compute via backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/chart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: profile.dateOfBirth,
        time: profile.timeOfBirth,
        place: profile.placeOfBirth,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return Response.json(
        { error: err.detail || "Chart calculation failed" },
        { status: 502 },
      );
    }

    const chartData = await res.json();

    // Store in cache
    await prisma.profileChart.create({
      data: {
        profileId: profile.id,
        chartData,
      },
    });

    return Response.json({
      chartData,
      cached: false,
      generatedAt: new Date(),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/profiles/[id]/chart
 * Force-invalidates the cached chart. Next GET will recompute.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }
  if (profile.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.profileChart.deleteMany({ where: { profileId: id } });
  return Response.json({ success: true });
}
