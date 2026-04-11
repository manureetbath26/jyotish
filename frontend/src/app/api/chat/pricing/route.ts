import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const tiers = await prisma.chatPricingTier.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return Response.json(tiers);
}
