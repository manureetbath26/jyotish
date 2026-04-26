import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAnonId } from "@/lib/anonSession";
import { createBalance, getQuotaSummary } from "@/lib/chatQuota";

export const dynamic = "force-dynamic";

const UNLIMITED_LIMIT = 999999;

/**
 * GET /api/chat/balance
 * Returns the caller's current chat-question quota — aggregate plus
 * per-pack breakdown. Powers the "X remaining (across all your charts)"
 * indicator and the "Buy more questions" CTA in the chat UI.
 *
 * Strictly chat-only — does NOT include report purchases or
 * subscription credits (those are separate wallets).
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.id) {
    const quota = await getQuotaSummary({ userId: session.user.id });
    return Response.json(quota);
  }
  const anonId = await readAnonId();
  if (!anonId) {
    return Response.json({
      totalLimit: 0,
      totalUsed: 0,
      remaining: 0,
      hasUnlimited: false,
      balances: [],
    });
  }
  // Find the guest's email via any of their chat sessions.
  const guestRow = await prisma.chatSession.findFirst({
    where: { anonSessionId: anonId },
    select: { guestEmail: true },
  });
  if (!guestRow?.guestEmail) {
    return Response.json({
      totalLimit: 0,
      totalUsed: 0,
      remaining: 0,
      hasUnlimited: false,
      balances: [],
    });
  }
  const quota = await getQuotaSummary({ guestEmail: guestRow.guestEmail });
  return Response.json(quota);
}

/**
 * POST /api/chat/balance
 * Top up the caller's chat-question wallet. Logged-in users only —
 * guests are funnelled to sign-up before they can buy.
 *
 * Body: { tierId?: string, couponCode?: string, upiTransactionId?: string }
 *   - tierId without coupon → standard paid pack
 *   - couponCode "unlimited" → grants UNLIMITED_LIMIT (one-shot per coupon use)
 *   - couponCode "percentage" + tierId → discounted paid pack
 *
 * Each successful call adds ONE new UserQuestionBalance row. Multiple
 * paid packs stack: their question limits are summed by the wallet.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "Sign in to buy more questions." },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  const body = await req.json();
  const { tierId, couponCode, upiTransactionId } = body;

  let questionLimit = 0;
  let amount = 0;
  let source: "tier" | "coupon" = "tier";
  let normalisedCoupon: string | null = null;

  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    normalisedCoupon = code;
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) {
      return Response.json({ error: "Invalid coupon code" }, { status: 400 });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return Response.json({ error: "Coupon has expired" }, { status: 400 });
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return Response.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    if (coupon.type === "unlimited") {
      source = "coupon";
      questionLimit = UNLIMITED_LIMIT;
      amount = 0;
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    } else if (coupon.type === "percentage" && coupon.value && tierId) {
      const tier = await prisma.chatPricingTier.findUnique({ where: { id: tierId } });
      if (!tier || !tier.active) {
        return Response.json({ error: "Invalid pricing tier" }, { status: 400 });
      }
      questionLimit = tier.questionCount;
      amount = Math.round(tier.price * (1 - coupon.value / 100));
      if (!upiTransactionId && amount > 0) {
        return Response.json(
          { error: "Payment required — please provide UPI transaction ID" },
          { status: 400 },
        );
      }
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    } else {
      return Response.json({ error: "Coupon requires a tier" }, { status: 400 });
    }
  } else if (tierId) {
    const tier = await prisma.chatPricingTier.findUnique({ where: { id: tierId } });
    if (!tier || !tier.active) {
      return Response.json({ error: "Invalid pricing tier" }, { status: 400 });
    }
    questionLimit = tier.questionCount;
    amount = tier.price;
    if (!upiTransactionId && amount > 0) {
      return Response.json(
        { error: "Payment required — please provide UPI transaction ID" },
        { status: 400 },
      );
    }
  } else {
    return Response.json(
      { error: "Specify a tierId or couponCode" },
      { status: 400 },
    );
  }

  const balance = await createBalance({
    userId,
    source,
    sourceTierId: tierId || null,
    sourceCouponCode: normalisedCoupon,
    upiTransactionId: upiTransactionId || null,
    questionLimit,
    amount,
  });

  const quota = await getQuotaSummary({ userId });
  return Response.json({ balance, quota }, { status: 201 });
}
