import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Valid coupon codes (keep in sync with coupon/validate/route.ts)
const VALID_COUPONS: Record<string, { discount: number }> = {
  FREEFOREVER2026: { discount: 100 },
};

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
    const couponEntry = VALID_COUPONS[couponCode.trim().toUpperCase()];
    if (couponEntry && couponEntry.discount === 100) {
      amount = 0;
      isFree = true;
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
