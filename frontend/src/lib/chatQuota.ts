/**
 * Chat-question wallet helpers.
 *
 * One UserQuestionBalance row per purchase/grant. Total quota for a user
 * is the SUM of (questionLimit - questionsUsed) across active rows.
 * Asking a question consumes from the OLDEST active row (FIFO) — when
 * that row hits its limit, mark it exhausted and the next consumes from
 * the next-oldest. UI surfaces aggregate but DB keeps audit trail.
 *
 * Strictly chat-only — separate from ReportPurchase, Subscription.
 */

import { prisma } from "./prisma";

export interface QuotaIdentity {
  userId?: string | null;
  guestEmail?: string | null;
}

export interface QuotaSummary {
  /** Sum across active balances. UNLIMITED_LIMIT for unlimited coupons. */
  totalLimit: number;
  totalUsed: number;
  remaining: number;
  /** True if any active balance is the unlimited tier (999999). */
  hasUnlimited: boolean;
  /** Per-balance breakdown (active only), oldest first. */
  balances: Array<{
    id: string;
    source: string;
    sourceTierId: string | null;
    sourceCouponCode: string | null;
    questionLimit: number;
    questionsUsed: number;
    remaining: number;
    amount: number;
    createdAt: Date;
  }>;
}

const UNLIMITED_LIMIT = 999999;

function whereClause(identity: QuotaIdentity) {
  if (identity.userId) return { userId: identity.userId };
  if (identity.guestEmail) return { guestEmail: identity.guestEmail.toLowerCase() };
  throw new Error("Quota lookup requires userId or guestEmail");
}

export async function getQuotaSummary(identity: QuotaIdentity): Promise<QuotaSummary> {
  // Pull ALL balances (active + exhausted) so totals reflect the user's
  // full purchase + usage history, not just what's currently "active".
  // The UI surfaces aggregate ("X of Y") and only the active balances
  // matter for "remaining".
  const all = await prisma.userQuestionBalance.findMany({
    where: { ...whereClause(identity) },
    orderBy: { createdAt: "asc" },
  });
  const totalLimit = all.reduce((s, b) => s + b.questionLimit, 0);
  const totalUsed = all.reduce((s, b) => s + b.questionsUsed, 0);
  const active = all.filter((b) => b.status === "active");
  const hasUnlimited = active.some((b) => b.questionLimit >= UNLIMITED_LIMIT);
  return {
    totalLimit,
    totalUsed,
    remaining: hasUnlimited ? UNLIMITED_LIMIT : Math.max(0, totalLimit - totalUsed),
    hasUnlimited,
    // Only active balances in the breakdown — exhausted ones are history.
    balances: active.map((b) => ({
      id: b.id,
      source: b.source,
      sourceTierId: b.sourceTierId,
      sourceCouponCode: b.sourceCouponCode,
      questionLimit: b.questionLimit,
      questionsUsed: b.questionsUsed,
      remaining: Math.max(0, b.questionLimit - b.questionsUsed),
      amount: b.amount,
      createdAt: b.createdAt,
    })),
  };
}

/**
 * Atomically consume one question from the oldest active balance.
 * Returns {ok: false, reason} if no balance has remaining capacity.
 */
export async function consumeQuestion(
  identity: QuotaIdentity,
): Promise<{ ok: true; balanceId: string } | { ok: false; reason: "no_balance" | "exhausted" }> {
  return await prisma.$transaction(async (tx) => {
    const candidate = await tx.userQuestionBalance.findFirst({
      where: { ...whereClause(identity), status: "active" },
      orderBy: { createdAt: "asc" },
    });
    if (!candidate) return { ok: false, reason: "no_balance" } as const;
    if (candidate.questionsUsed >= candidate.questionLimit) {
      // Defensive: mark exhausted then signal failure so caller can retry
      await tx.userQuestionBalance.update({
        where: { id: candidate.id },
        data: { status: "exhausted" },
      });
      return { ok: false, reason: "exhausted" } as const;
    }
    const newUsed = candidate.questionsUsed + 1;
    const newStatus = newUsed >= candidate.questionLimit ? "exhausted" : "active";
    await tx.userQuestionBalance.update({
      where: { id: candidate.id },
      data: { questionsUsed: newUsed, status: newStatus },
    });
    return { ok: true, balanceId: candidate.id } as const;
  });
}

export interface CreateBalanceInput {
  userId?: string | null;
  guestEmail?: string | null;
  source: "free" | "tier" | "coupon";
  sourceTierId?: string | null;
  sourceCouponCode?: string | null;
  upiTransactionId?: string | null;
  questionLimit: number;
  amount: number;
}

export async function createBalance(input: CreateBalanceInput) {
  return prisma.userQuestionBalance.create({
    data: {
      userId: input.userId ?? null,
      guestEmail: input.guestEmail?.toLowerCase() ?? null,
      source: input.source,
      sourceTierId: input.sourceTierId ?? null,
      sourceCouponCode: input.sourceCouponCode ?? null,
      upiTransactionId: input.upiTransactionId ?? null,
      questionLimit: input.questionLimit,
      amount: input.amount,
      status: input.questionLimit > 0 ? "active" : "exhausted",
    },
  });
}

/**
 * One-free-balance-per-identity check. Used by /api/chat/session POST
 * before granting a free balance, since each user/guest is allowed at
 * most one free 2-question grant.
 */
export async function hasExistingFreeBalance(identity: QuotaIdentity): Promise<boolean> {
  const existing = await prisma.userQuestionBalance.findFirst({
    where: { ...whereClause(identity), source: "free" },
  });
  return existing !== null;
}
