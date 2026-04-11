import { prisma } from "@/lib/prisma";

export async function GET() {
  const catalog = await prisma.reportCatalog.findMany({
    where: { active: true },
    select: {
      slug: true,
      name: true,
      description: true,
      price: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(catalog);
}
