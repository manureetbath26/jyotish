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

/**
 * PATCH /api/reports/purchase/[id]
 * Saves generated reportData to an existing purchase so it can be frozen.
 * Only the owning user may update their own purchase.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchase = await prisma.reportPurchase.findUnique({ where: { id } });

  if (!purchase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (purchase.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { reportData } = body as { reportData?: unknown };

  if (reportData === undefined) {
    return Response.json({ error: "reportData is required" }, { status: 400 });
  }

  await prisma.reportPurchase.update({
    where: { id },
    data: { reportData: reportData as object },
  });

  return Response.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchase = await prisma.reportPurchase.findUnique({
    where: { id },
  });

  if (!purchase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (purchase.userId !== session.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.reportPurchase.delete({ where: { id } });

  return Response.json({ success: true });
}
