/**
 * One-shot backfill: convert existing ChatSession quota fields into
 * UserQuestionBalance rows so the new wallet-based quota system has
 * accurate starting state.
 *
 * Run:  npx tsx prisma/backfill-question-balances.ts
 *
 * Idempotent: skips ChatSessions that already have a corresponding
 * balance row (matched by sessionId stamped into upiTransactionId for
 * derivation, or by source+createdAt+identity).
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${sessions.length} ChatSession rows`);

  let created = 0;
  let skipped = 0;

  for (const s of sessions) {
    if (s.questionLimit <= 0) {
      // shouldn't happen but guard anyway
      skipped++;
      continue;
    }

    // Idempotency: if a balance with the same identity + createdAt already
    // exists (within a 1-second window), skip.
    const existing = await prisma.userQuestionBalance.findFirst({
      where: {
        userId: s.userId,
        guestEmail: s.guestEmail,
        createdAt: {
          gte: new Date(s.createdAt.getTime() - 1000),
          lte: new Date(s.createdAt.getTime() + 1000),
        },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Derive source
    let source: string;
    if (s.couponCode) {
      source = "coupon";
    } else if (s.tierId) {
      source = "tier";
    } else {
      source = "free";
    }

    const status = s.questionsUsed >= s.questionLimit ? "exhausted" : "active";

    await prisma.userQuestionBalance.create({
      data: {
        userId: s.userId,
        guestEmail: s.guestEmail,
        source,
        sourceTierId: s.tierId,
        sourceCouponCode: s.couponCode,
        upiTransactionId: s.upiTransactionId,
        questionLimit: s.questionLimit,
        questionsUsed: s.questionsUsed,
        amount: s.amount,
        status,
        createdAt: s.createdAt,
      },
    });
    created++;
  }

  console.log(`\nDone. Created: ${created}, skipped (already migrated): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
