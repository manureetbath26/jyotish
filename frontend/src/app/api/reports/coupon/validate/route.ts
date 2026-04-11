import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupon } = body;

  if (!coupon || typeof coupon !== "string") {
    return Response.json({ valid: false, error: "No coupon provided" }, { status: 400 });
  }

  const code = coupon.trim().toUpperCase();

  // Look up coupon in the database (same table used by subscriptions)
  const entry = await prisma.coupon.findUnique({ where: { code } });

  if (!entry || !entry.active) {
    return Response.json({ valid: false, error: "Invalid coupon code" }, { status: 400 });
  }

  // Check expiry
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    return Response.json({ valid: false, error: "Coupon has expired" }, { status: 400 });
  }

  // Check max uses
  if (entry.maxUses != null && entry.usedCount >= entry.maxUses) {
    return Response.json({ valid: false, error: "Coupon usage limit reached" }, { status: 400 });
  }

  // Calculate discount percentage
  let discount = 0;
  if (entry.type === "unlimited") {
    discount = 100;
  } else if (entry.type === "percentage") {
    discount = entry.value ?? 0;
  }
  // "fixed" type: discount is an amount in paise, handled at purchase time

  return Response.json({
    valid: true,
    discount,
    type: entry.type,
    value: entry.value,
  });
}
