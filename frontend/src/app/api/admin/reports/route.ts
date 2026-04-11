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

  const reports = await prisma.reportPurchase.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      reportType: true,
      amount: true,
      upiTransactionId: true,
      status: true,
      birthName: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAgg, monthlyAgg] = await prisma.$transaction([
    prisma.reportPurchase.aggregate({
      where: { status: "verified" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.reportPurchase.aggregate({
      where: {
        status: "verified",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  return Response.json({
    reports,
    stats: {
      total: totalAgg._sum.amount ?? 0,
      monthlyTotal: monthlyAgg._sum.amount ?? 0,
      count: totalAgg._count ?? 0,
    },
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return Response.json({ error: "id and status required" }, { status: 400 });
  }

  if (!["verified", "pending", "rejected"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.reportPurchase.update({
    where: { id },
    data: { status },
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

  await prisma.reportPurchase.delete({ where: { id } });
  return Response.json({ success: true });
}
