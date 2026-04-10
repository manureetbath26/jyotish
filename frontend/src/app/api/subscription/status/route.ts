import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ premium: false });
  }

  // Admins always get premium
  if (session.user.role === "admin") {
    return Response.json({ premium: true });
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: "active",
      endDate: { gt: new Date() },
    },
    include: {
      coupon: true,
    },
    orderBy: { endDate: "desc" },
  });

  if (!subscription) {
    return Response.json({ premium: false });
  }

  const daysRemaining = Math.ceil(
    (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return Response.json({
    premium: true,
    subscription: {
      plan: subscription.plan,
      endDate: subscription.endDate,
      daysRemaining,
      couponCode: subscription.coupon?.code ?? undefined,
    },
  });
}
