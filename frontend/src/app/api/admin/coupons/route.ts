import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function verifyAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

export async function GET() {
  const { error } = await verifyAdmin();
  if (error) return error;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Response.json(coupons);
}

export async function POST(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { code, type, value, maxUses, active, expiresAt } = await request.json();

  if (!code || typeof code !== "string") {
    return Response.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: type ?? "unlimited",
      value: value ?? null,
      maxUses: maxUses ?? null,
      active: active ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return Response.json({ coupon });
}

export async function PUT(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id, code, type, value, maxUses, active, expiresAt } = await request.json();

  if (!id || typeof id !== "string") {
    return Response.json({ error: "Coupon ID is required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(code !== undefined && { code }),
      ...(type !== undefined && { type }),
      ...(value !== undefined && { value }),
      ...(maxUses !== undefined && { maxUses }),
      ...(active !== undefined && { active }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
  });

  return Response.json({ coupon });
}

export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Coupon ID is required" }, { status: 400 });
  }

  await prisma.coupon.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
