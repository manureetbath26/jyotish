import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles
 * List all profiles belonging to the current user.
 * Own profile (isOwn=true) is returned first, then the rest by name.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isOwn: "desc" }, { name: "asc" }],
  });

  return Response.json(profiles);
}

/**
 * POST /api/profiles
 * Create a new profile for the current user.
 * Body: { name, dateOfBirth, timeOfBirth, placeOfBirth, gender?, relationship?, isOwn?, notes? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    dateOfBirth,
    timeOfBirth,
    placeOfBirth,
    gender,
    relationship,
    isOwn,
    notes,
  } = body;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return Response.json({ error: "Valid date of birth (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!timeOfBirth || !/^\d{1,2}:\d{2}$/.test(timeOfBirth)) {
    return Response.json({ error: "Valid time of birth (HH:mm) required" }, { status: 400 });
  }
  if (!placeOfBirth || typeof placeOfBirth !== "string" || placeOfBirth.trim().length === 0) {
    return Response.json({ error: "Place of birth is required" }, { status: 400 });
  }

  // Enforce single "own" profile per user
  if (isOwn === true) {
    const existingOwn = await prisma.profile.findFirst({
      where: { userId: session.user.id, isOwn: true },
    });
    if (existingOwn) {
      return Response.json(
        { error: "You already have an own kundli profile. Edit the existing one instead." },
        { status: 409 },
      );
    }
  }

  const profile = await prisma.profile.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      dateOfBirth,
      timeOfBirth,
      placeOfBirth: placeOfBirth.trim(),
      gender: gender || null,
      relationship: relationship || null,
      isOwn: isOwn === true,
      notes: notes || null,
    },
  });

  return Response.json(profile, { status: 201 });
}
