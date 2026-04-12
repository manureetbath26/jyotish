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

/**
 * GET /api/admin/interpretations — list all (admin view with ids)
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where = category ? { category } : {};

  const rows = await prisma.interpretation.findMany({
    where,
    orderBy: [{ category: "asc" }, { key1: "asc" }, { key2: "asc" }],
  });

  return Response.json(rows);
}

/**
 * PUT /api/admin/interpretations — update content of an existing row
 * Body: { id, content } or { category, key1, key2, content }
 */
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, category, key1, key2, content } = body;

  if (!content) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  if (id) {
    const updated = await prisma.interpretation.update({
      where: { id },
      data: { content },
    });
    return Response.json(updated);
  }

  if (category && key1 !== undefined) {
    const updated = await prisma.interpretation.update({
      where: {
        category_key1_key2: { category, key1, key2: key2 ?? "" },
      },
      data: { content },
    });
    return Response.json(updated);
  }

  return Response.json(
    { error: "Provide either 'id' or 'category' + 'key1' (+ optional 'key2')" },
    { status: 400 },
  );
}

/**
 * POST /api/admin/interpretations — create a new row
 * Body: { category, key1, key2?, content }
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { category, key1, key2, content } = body;

  if (!category || key1 === undefined || !content) {
    return Response.json(
      { error: "category, key1, and content are required" },
      { status: 400 },
    );
  }

  const entry = await prisma.interpretation.create({
    data: { category, key1, key2: key2 ?? "", content },
  });

  return Response.json(entry, { status: 201 });
}

/**
 * DELETE /api/admin/interpretations?id=xxx
 */
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  await prisma.interpretation.delete({ where: { id } });
  return Response.json({ success: true });
}
