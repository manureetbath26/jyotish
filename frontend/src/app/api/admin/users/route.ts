import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** Verify the caller is an admin. */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "admin") return null;
  return user;
}

/** GET /api/admin/users — list all users */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { charts: true } },
    },
  });

  return Response.json(users);
}

/** POST /api/admin/users — create a new user */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role } = await req.json();

  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      password: hashed,
      role: role === "admin" ? "admin" : "user",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return Response.json(user, { status: 201 });
}

/** PUT /api/admin/users — update a user (name, email, role, password) */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, email, role, password } = await req.json();
  if (!id) return Response.json({ error: "Missing user id" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  // Build update data
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role === "admin" ? "admin" : "user";
  if (password) data.password = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return Response.json(updated);
}

/** DELETE /api/admin/users?id=xxx — delete a user */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Prevent self-deletion
  if (id === admin.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return Response.json({ success: true });
}
