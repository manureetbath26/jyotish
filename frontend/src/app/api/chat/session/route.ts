import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetAnonId, readAnonId } from "@/lib/anonSession";
import {
  createBalance,
  getQuotaSummary,
  hasExistingFreeBalance,
} from "@/lib/chatQuota";

export const dynamic = "force-dynamic";

const FREE_QUESTION_LIMIT = 2;

/**
 * GET /api/chat/session
 * List the caller's chat sessions (one per chart they've discussed).
 * Logged-in users see all their sessions; guests see whatever sessions
 * are tied to their anon cookie.
 *
 * Quota lives in UserQuestionBalance (wallet) — sessions no longer carry
 * questionLimit/questionsUsed. Use GET /api/chat/balance for quota info.
 */
export async function GET() {
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

/**
 * POST /api/chat/session
 * Open (or resume) a chat thread for a given chart.
 *
 * Quota model (Apr 2026 wallet refactor): this endpoint NO LONGER carries
 * paid-tier purchase logic. It just:
 *   - validates the caller (logged-in or guest with name+email)
 *   - ensures the caller has a free balance if they don't already
 *   - creates a ChatSession row (one per chart thread)
 *
 * To buy more questions, use POST /api/chat/balance — that's the wallet
 * top-up endpoint. The wallet pools across all of a user's chat threads,
 * so they buy ONCE and use across all profile charts.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const isGuest = !session?.user?.id;

  const body = await req.json();
  const { chartData, birthData, guestName, guestEmail } = body;

  if (!chartData) {
    return Response.json({ error: "chartData is required" }, { status: 400 });
  }

  // ── Guest validation: name + email required ───────────────────────────
  let normalisedGuestEmail: string | null = null;
  let normalisedGuestName: string | null = null;
  if (isGuest) {
    if (typeof guestName !== "string" || guestName.trim().length === 0) {
      return Response.json(
        { error: "Please enter your name to start." },
        { status: 400 },
      );
    }
    if (
      typeof guestEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())
    ) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    normalisedGuestEmail = guestEmail.trim().toLowerCase();
    normalisedGuestName = guestName.trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalisedGuestEmail },
      select: { id: true },
    });
    if (existingUser) {
      return Response.json(
        {
          error: "This email is registered. Please sign in to continue.",
          shouldSignIn: true,
        },
        { status: 409 },
      );
    }
  }

  // ── Free-balance provisioning ─────────────────────────────────────────
  // First time the caller opens a chat → grant the free 2-question balance.
  // If they already have a free balance (used or unused), skip — they can't
  // get a second free grant on the same identity.
  const identity = isGuest
    ? { guestEmail: normalisedGuestEmail }
    : { userId: session!.user!.id };

  // Admins are exempt — they can get unlimited free sessions for testing.
  let isAdmin = false;
  if (!isGuest) {
    const user = await prisma.user.findUnique({
      where: { id: session!.user!.id },
      select: { role: true },
    });
    isAdmin = user?.role === "admin";
  }

  const alreadyHasFree = isAdmin ? false : await hasExistingFreeBalance(identity);
  if (!alreadyHasFree) {
    await createBalance({
      ...identity,
      source: "free",
      questionLimit: FREE_QUESTION_LIMIT,
      amount: 0,
    });
  }

  // ── Create the chat thread row ────────────────────────────────────────
  // Quota fields on ChatSession are deprecated (kept on the model for
  // backward compat with old rows). New rows leave them at default 0.
  const anonSessionId = isGuest ? await getOrSetAnonId() : null;

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: isGuest ? null : session!.user!.id,
      anonSessionId,
      guestEmail: normalisedGuestEmail,
      guestName: normalisedGuestName,
      chartData,
      birthData: birthData || null,
      // Legacy quota fields — set to 0 so old code paths reading them
      // see "no quota" and defer to the wallet.
      questionLimit: 0,
      questionsUsed: 0,
      amount: 0,
      status: "active",
    },
  });

  // Return the session + current quota snapshot for the UI.
  const quota = await getQuotaSummary(identity);
  return Response.json({ ...chatSession, quota }, { status: 201 });
}
