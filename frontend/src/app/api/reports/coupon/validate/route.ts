import { NextRequest } from "next/server";

// Valid coupon codes — add more as needed
const VALID_COUPONS: Record<string, { discount: number; maxUses?: number }> = {
  FREEFOREVER2026: { discount: 100 },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupon } = body;

  if (!coupon || typeof coupon !== "string") {
    return Response.json({ valid: false, error: "No coupon provided" }, { status: 400 });
  }

  const entry = VALID_COUPONS[coupon.trim().toUpperCase()];

  if (!entry) {
    return Response.json({ valid: false, error: "Invalid coupon code" }, { status: 400 });
  }

  return Response.json({ valid: true, discount: entry.discount });
}
