import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.reportPurchase.findMany({
    where: { userId: session.user.id, status: "verified" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reportType: true,
      birthName: true,
      birthData: true,
      status: true,
      createdAt: true,
    },
  });

  return Response.json(reports);
}
