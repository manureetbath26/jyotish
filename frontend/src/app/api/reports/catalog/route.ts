import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Check if current user is admin
  let isAdmin = false;
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      isAdmin = user?.role === "admin";
    }
  } catch { /* not logged in */ }

  const catalog = await prisma.reportCatalog.findMany({
    where: {
      active: true,
      // Non-admins only see public reports; admins see all active reports
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
