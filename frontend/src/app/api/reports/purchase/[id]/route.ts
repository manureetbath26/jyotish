import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const purchase = await prisma.reportPurchase.findUnique({
    where: { id },
  });

  if (!purchase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow access if: user owns it, or it's the same session user
  if (purchase.userId && session?.user?.id !== purchase.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(purchase);
}
