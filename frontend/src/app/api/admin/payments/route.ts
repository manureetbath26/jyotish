import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAgg, monthlyAgg] = await prisma.$transaction([
    prisma.payment.aggregate({
      where: { status: "verified" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        status: "verified",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  return Response.json({
    payments,
    stats: {
      total: totalAgg._sum.amount ?? 0,
      monthlyTotal: monthlyAgg._sum.amount ?? 0,
      count: totalAgg._count ?? 0,
    },
  });
}
