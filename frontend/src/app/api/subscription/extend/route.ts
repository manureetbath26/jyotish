import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { upiTransactionId, topupType } = await request.json();

  if (!upiTransactionId || typeof upiTransactionId !== "string" || !upiTransactionId.trim()) {
    return Response.json({ error: "UPI transaction ID is required" }, { status: 400 });
  }

  if (!topupType || !["transit", "dasha"].includes(topupType)) {
    return Response.json({ error: "topupType must be 'transit' or 'dasha'" }, { status: 400 });
  }

  // Find the user's most recent subscription
  const existing = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { endDate: "desc" },
  });

  if (!existing) {
    return Response.json(
      { error: "No existing subscription found. Please purchase a monthly plan first." },
      { status: 400 }
    );
  }

  // Must have active subscription to top up
  if (existing.endDate < new Date()) {
    return Response.json(
      { error: "Your subscription has expired. Please renew your monthly plan before adding top-ups." },
      { status: 400 }
    );
  }

  const now = new Date();
  const updateData: Record<string, Date> = {};
  let description = "";

  if (topupType === "transit") {
    // +1 year of transit from current limit or now, whichever is later
    const base = existing.transitAccessUntil && existing.transitAccessUntil > now
      ? new Date(existing.transitAccessUntil)
      : new Date(now);
    base.setFullYear(base.getFullYear() + 1);
    updateData.transitAccessUntil = base;
    description = `Transit access extended to ${base.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
  } else {
    // +2 years of dasha from current limit or now, whichever is later
    const base = existing.dashaAccessUntil && existing.dashaAccessUntil > now
      ? new Date(existing.dashaAccessUntil)
      : new Date(now);
    base.setFullYear(base.getFullYear() + 2);
    updateData.dashaAccessUntil = base;
    description = `Dasha access extended to ${base.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: 20000, // ₹200 in paise
        method: "upi",
        upiTransactionId: upiTransactionId.trim(),
        status: "verified",
      },
    }),
    prisma.subscription.update({
      where: { id: existing.id },
      data: updateData,
    }),
  ]);

  return Response.json({
    payment,
    message: `Top-up confirmed! ${description}`,
  });
}
