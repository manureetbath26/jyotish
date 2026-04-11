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

  const tiers = await prisma.chatPricingTier.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return Response.json(tiers);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, questionCount, price, isMostPopular, active, sortOrder } = body;

  if (!name || questionCount == null || price == null) {
    return Response.json({ error: "name, questionCount, and price are required" }, { status: 400 });
  }

  const tier = await prisma.chatPricingTier.create({
    data: {
      name,
      questionCount: parseInt(questionCount),
      price: parseInt(price),
      isMostPopular: isMostPopular ?? false,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });

  return Response.json(tier, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, questionCount, price, isMostPopular, active, sortOrder } = body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (questionCount !== undefined) data.questionCount = parseInt(questionCount);
  if (price !== undefined) data.price = parseInt(price);
  if (isMostPopular !== undefined) data.isMostPopular = isMostPopular;
  if (active !== undefined) data.active = active;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);

  const updated = await prisma.chatPricingTier.update({
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

  await prisma.chatPricingTier.delete({ where: { id } });
  return Response.json({ success: true });
}
