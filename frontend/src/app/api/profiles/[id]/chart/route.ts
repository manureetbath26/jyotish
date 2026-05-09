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

  // Cache hit — bust if stale.
  //   v1 (initial): gulika field missing entirely
  //   v2 (May 2026): corrected BPHS Gulika portion table + _chart_version stamp
  // Any chart without _chart_version >= 2 must be recomputed.
  if (profile.chart) {
    const cd = profile.chart.chartData as Record<string, unknown>;
    const version = typeof cd._chart_version === "number" ? cd._chart_version : 0;
    const isStale = version < 2;
    if (!isStale) {
      return Response.json({
        chartData: cd,
        cached: true,
        generatedAt: profile.chart.createdAt,
      });
    }
    // Stale cache — delete it and fall through to recompute.
    // Also delete today's DailyReading so it is regenerated from fresh data.
    const todayISO = new Date().toISOString().slice(0, 10);
    await Promise.all([
      prisma.profileChart.deleteMany({ where: { profileId: profile.id } }),
      prisma.dailyReading.deleteMany({ where: { profileId: profile.id, readingDate: todayISO } }),
    ]);
  }

  // Cache miss (or busted stale cache) — compute via backend
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

    // Store in cache (upsert so re-entrant calls from concurrent requests don't conflict)
    await prisma.profileChart.upsert({
      where:  { profileId: profile.id },
      create: { profileId: profile.id, chartData },
      update: { chartData },
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
