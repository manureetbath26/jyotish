import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return Response.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!coupon) {
    return Response.json({ error: "Invalid or expired coupon code" }, { status: 400 });
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return Response.json({ error: "Coupon has reached its maximum usage limit" }, { status: 400 });
  }

  if (coupon.type === "unlimited") {
    const [subscription] = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId: session.user.id,
          status: "active",
          plan: "unlimited",
          amount: 0,
          startDate: new Date(),
          endDate: new Date("2099-12-31T23:59:59.999Z"),
          couponId: coupon.id,
        },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return Response.json({ subscription, message: "Coupon applied! Premium features unlocked." });
  }

  return Response.json({ error: "Unsupported coupon type" }, { status: 400 });
}
