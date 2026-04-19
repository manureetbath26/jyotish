import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles/[id] — fetch a single profile (must belong to user)
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

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (profile.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(profile);
}

/**
 * PATCH /api/profiles/[id] — update a profile's editable fields
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.profile.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    dateOfBirth?: string;
    timeOfBirth?: string;
    placeOfBirth?: string;
    gender?: string | null;
    relationship?: string | null;
    notes?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim().length > 0) {
    data.name = body.name.trim();
  }
  if (typeof body.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) {
    data.dateOfBirth = body.dateOfBirth;
  }
  if (typeof body.timeOfBirth === "string" && /^\d{1,2}:\d{2}$/.test(body.timeOfBirth)) {
    data.timeOfBirth = body.timeOfBirth;
  }
  if (typeof body.placeOfBirth === "string" && body.placeOfBirth.trim().length > 0) {
    data.placeOfBirth = body.placeOfBirth.trim();
  }
  if ("gender" in body) {
    data.gender = body.gender || null;
  }
  if ("relationship" in body) {
    data.relationship = body.relationship || null;
  }
  if ("notes" in body) {
    data.notes = body.notes || null;
  }
  // isOwn is NOT editable — it's set once at creation

  // If any birth-affecting field changed, invalidate the cached chart
  const birthChanged =
    (data.dateOfBirth !== undefined && data.dateOfBirth !== existing.dateOfBirth) ||
    (data.timeOfBirth !== undefined && data.timeOfBirth !== existing.timeOfBirth) ||
    (data.placeOfBirth !== undefined && data.placeOfBirth !== existing.placeOfBirth);

  const updated = await prisma.profile.update({
    where: { id },
    data,
  });

  if (birthChanged) {
    await prisma.profileChart.deleteMany({ where: { profileId: id } });
  }

  return Response.json(updated);
}

/**
 * DELETE /api/profiles/[id] — delete a profile.
 * Own profile (isOwn=true) cannot be deleted — must be replaced instead.
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

  const existing = await prisma.profile.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.isOwn) {
    return Response.json(
      { error: "Your own kundli cannot be deleted. Edit it instead." },
      { status: 400 },
    );
  }

  await prisma.profile.delete({ where: { id } });
  return Response.json({ success: true });
}
