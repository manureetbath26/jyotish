import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const catalog = await prisma.reportCatalog.findMany({
    orderBy: { createdAt: "asc" },
  });

  return Response.json(catalog);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { slug, name, description, price, active, adminOnly } = body;

  if (!slug || !name || price == null) {
    return Response.json({ error: "slug, name, and price are required" }, { status: 400 });
  }

  const existing = await prisma.reportCatalog.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: "A report with this slug already exists" }, { status: 409 });
  }

  const entry = await prisma.reportCatalog.create({
    data: {
      slug,
      name,
      description: description || null,
      price: parseInt(price),
      active: active ?? true,
      adminOnly: adminOnly ?? false,
    },
  });

  return Response.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, description, price, active, adminOnly } = body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description || null;
  if (price !== undefined) data.price = parseInt(price);
  if (active !== undefined) data.active = active;
  if (adminOnly !== undefined) data.adminOnly = adminOnly;

  const updated = await prisma.reportCatalog.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  await prisma.reportCatalog.delete({ where: { id } });
  return Response.json({ success: true });
}
