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

  // Monthly subscription: 30 days premium access
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  // Base includes: 1 year of transit + 2 years of dasha
  const transitUntil = new Date(now);
  transitUntil.setFullYear(transitUntil.getFullYear() + 1);

  const dashaUntil = new Date(now);
  dashaUntil.setFullYear(dashaUntil.getFullYear() + 2);

  // Check if user has existing subscription with top-ups — carry forward
  const existing = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { endDate: "desc" },
  });

  // If existing top-ups go beyond the new defaults, keep the further date
  const finalTransit = existing?.transitAccessUntil && existing.transitAccessUntil > transitUntil
    ? existing.transitAccessUntil
    : transitUntil;
  const finalDasha = existing?.dashaAccessUntil && existing.dashaAccessUntil > dashaUntil
    ? existing.dashaAccessUntil
    : dashaUntil;

  const [payment, subscription] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: 50000, // ₹500 in paise
        method: "upi",
        upiTransactionId: upiTransactionId.trim(),
        status: "verified",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: session.user.id,
        status: "active",
        plan: "monthly",
        amount: 50000,
        startDate: now,
        endDate,
        transitAccessUntil: finalTransit,
        dashaAccessUntil: finalDasha,
      },
    }),
  ]);

  return Response.json({
    payment,
    subscription,
    message: "Payment confirmed! Premium features unlocked for 30 days.",
  });
}
