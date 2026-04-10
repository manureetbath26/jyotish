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

  // Find the user's most recent subscription
  const existing = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { endDate: "desc" },
  });

  if (!existing) {
    return Response.json(
      { error: "No existing subscription found. Please purchase a new plan first." },
      { status: 400 }
    );
  }

  // Extend from the current endDate if still active, or from now if expired
  const now = new Date();
  const baseDate = existing.endDate > now ? existing.endDate : now;
  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + 365);

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: 20000, // 200 INR in paise
        method: "upi",
        upiTransactionId: upiTransactionId.trim(),
        status: "verified",
      },
    }),
    prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "active",
        endDate: newEndDate,
      },
    }),
  ]);

  return Response.json({
    payment,
    newEndDate,
    message: `Subscription extended by 1 year until ${newEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
  });
}
