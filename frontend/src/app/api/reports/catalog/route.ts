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

  const catalog = await prisma.reportCatalog.findMany({
    where: {
      active: true,
      ...(isAdmin ? {} : { adminOnly: false }),
    },
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
