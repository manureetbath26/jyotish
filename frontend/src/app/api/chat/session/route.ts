import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetAnonId, readAnonId } from "@/lib/anonSession";

export const dynamic = "force-dynamic";

const FREE_QUESTION_LIMIT = 2;
const UNLIMITED_LIMIT = 999999;

export async function GET() {
  // Logged-in users see all their sessions; guests see whatever session
  // is tied to their anon cookie (at most one).
  const session = await auth();
  if (session?.user?.id) {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return Response.json(sessions);
  }

  const anonId = await readAnonId();
  if (!anonId) return Response.json([]);
  const guestSessions = await prisma.chatSession.findMany({
    where: { anonSessionId: anonId },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return Response.json(guestSessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const isGuest = !session?.user?.id;

  const body = await req.json();
  const { chartData, birthData, tierId, upiTransactionId, couponCode } = body;

  if (!chartData) {
    return Response.json({ error: "chartData is required" }, { status: 400 });
  }

  // Guests get the free tier only — no coupons, no paid tiers (those
  // require an account to support refunds and audit). They're nudged to
  // sign up after their 2 free questions are used.
  if (isGuest && (couponCode || tierId)) {
    return Response.json(
      { error: "Sign in to apply a coupon or buy more questions." },
      { status: 401 },
    );
  }

  let questionLimit = FREE_QUESTION_LIMIT;
  let amount = 0;

  // Check coupon first
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (coupon && coupon.active) {
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return Response.json({ error: "Coupon has expired" }, { status: 400 });
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return Response.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }

      if (coupon.type === "unlimited") {
        // Full free access — unlimited questions
        questionLimit = UNLIMITED_LIMIT;
        amount = 0;

        // Increment coupon usage
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      } else if (coupon.type === "percentage" && coupon.value) {
        // Percentage discount — still need a tier
        if (tierId) {
          const tier = await prisma.chatPricingTier.findUnique({ where: { id: tierId } });
          if (tier) {
            questionLimit = tier.questionCount;
            amount = Math.round(tier.price * (1 - coupon.value / 100));
          }
        }
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    } else {
      return Response.json({ error: "Invalid coupon code" }, { status: 400 });
    }
  } else if (tierId) {
    // Paid tier
    const tier = await prisma.chatPricingTier.findUnique({ where: { id: tierId } });
    if (!tier || !tier.active) {
      return Response.json({ error: "Invalid pricing tier" }, { status: 400 });
    }
    questionLimit = tier.questionCount;
    amount = tier.price;

    if (!upiTransactionId && amount > 0) {
      return Response.json({ error: "Payment required — please provide UPI transaction ID" }, { status: 400 });
    }
  } else {
    // Free tier — one free session per identity (user OR anon cookie).
    if (isGuest) {
      const anonId = await readAnonId();
      if (anonId) {
        const existingFree = await prisma.chatSession.findFirst({
          where: { anonSessionId: anonId, amount: 0, couponCode: null },
        });
        if (existingFree) {
          return Response.json(
            {
              error: "You've already used your free trial. Sign up to buy more questions.",
              existingSessionId: existingFree.id,
            },
            { status: 400 },
          );
        }
      }
    } else {
      const existingFree = await prisma.chatSession.findFirst({
        where: { userId: session!.user!.id, amount: 0, couponCode: null },
      });
      const user = await prisma.user.findUnique({
        where: { id: session!.user!.id },
        select: { role: true },
      });
      const isAdmin = user?.role === "admin";
      if (existingFree && !isAdmin) {
        return Response.json(
          {
            error: "You've already used your free trial. Purchase a plan for more questions.",
            existingSessionId: existingFree.id,
          },
          { status: 400 },
        );
      }
    }
  }

  // For guests, mint (or read) the anon cookie and key the session by it.
  const anonSessionId = isGuest ? await getOrSetAnonId() : null;

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: isGuest ? null : session!.user!.id,
      anonSessionId,
      chartData,
      birthData: birthData || null,
      tierId: tierId || null,
      questionLimit,
      amount,
      upiTransactionId: upiTransactionId || null,
      couponCode: couponCode?.trim().toUpperCase() || null,
      status: "active",
    },
  });

  return Response.json(chatSession, { status: 201 });
}
