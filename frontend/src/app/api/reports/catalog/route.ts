import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Check if current user is admin — use JWT role directly
  let isAdmin = false;
  try {
    const session = await auth();
    isAdmin = session?.user?.role === "admin";
  } catch {
    // not logged in — treat as public
  }

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
