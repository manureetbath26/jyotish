import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Check if current user is admin
  let isAdmin = false;
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    isAdmin = user?.role === "admin";
  }

  // Admins see: all active reports + all adminOnly reports (even if paused)
  // Public sees: only active, non-adminOnly reports
  const catalog = await prisma.reportCatalog.findMany({
    where: isAdmin
      ? { OR: [{ active: true }, { adminOnly: true }] }
      : { active: true, adminOnly: false },
    select: {
      slug: true,
      name: true,
      description: true,
      price: true,
      adminOnly: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(catalog);
}
