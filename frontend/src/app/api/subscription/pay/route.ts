import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { upiTransactionId } = await request.json();

  if (!upiTransactionId || typeof upiTransactionId !== "string" || !upiTransactionId.trim()) {
    return Response.json({ error: "UPI transaction ID is required" }, { status: 400 });
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 365);

  const [payment, subscription] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: 50000,
        method: "upi",
        upiTransactionId: upiTransactionId.trim(),
        status: "verified",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: session.user.id,
        status: "active",
        plan: "yearly",
        amount: 50000,
        startDate: now,
        endDate,
      },
    }),
  ]);

  return Response.json({ payment, subscription, message: "Payment confirmed! Premium features unlocked for 1 year." });
}
