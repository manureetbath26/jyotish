import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { email, upiTransactionId, couponCode, reportType, birthName, birthData, chartData, reportData } = body;

  if (!email || !reportType || !birthData || !chartData) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Determine base price by report type (in paise)
  const REPORT_PRICES: Record<string, number> = {
    ayurvedic_wellness: 20000,       // INR 200
    life_events_prediction: 80000,   // INR 800
  };
  let amount = REPORT_PRICES[reportType] ?? 20000;
  let isFree = false;

  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (coupon && coupon.active) {
      const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date();
      const hasUses = coupon.maxUses == null || coupon.usedCount < coupon.maxUses;

      if (notExpired && hasUses) {
        if (coupon.type === "unlimited") {
          amount = 0;
          isFree = true;
        } else if (coupon.type === "percentage" && coupon.value) {
          amount = Math.round(amount * (1 - coupon.value / 100));
          if (amount <= 0) { amount = 0; isFree = true; }
        } else if (coupon.type === "fixed" && coupon.value) {
          amount = Math.max(0, amount - coupon.value);
          if (amount <= 0) { amount = 0; isFree = true; }
        }

        // Increment usage count
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }
  }

  // If not free, require UPI transaction ID
  if (!isFree && !upiTransactionId) {
    return Response.json({ error: "Payment reference required" }, { status: 400 });
  }

  const purchase = await prisma.reportPurchase.create({
    data: {
      userId: session?.user?.id ?? null,
      email,
      reportType,
      amount,
      upiTransactionId: isFree ? `COUPON:${couponCode.trim().toUpperCase()}` : (upiTransactionId || null),
      status: "verified",
      birthName: birthName || null,
      birthData,
      chartData,
      reportData: reportData || null,
    },
  });

  return Response.json(purchase, { status: 201 });
}
