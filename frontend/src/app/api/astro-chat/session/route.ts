// ─────────────────────────────────────────────────────────────────────────────
// /api/astro-chat/session
//
// GET  — list sessions for current user
// POST — create a new session
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/astro-chat/session
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.astroChatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return Response.json(sessions);
}

// POST /api/astro-chat/session
// Body: { chartData: ChartResponse, birthData: BirthData, title?: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { chartData, birthData, title } = body;

  if (!chartData) {
    return Response.json({ error: "chartData required" }, { status: 400 });
  }

  const chatSession = await prisma.astroChatSession.create({
    data: {
      userId:    session.user.id,
      chartData: chartData,
      birthData: birthData ?? null,
      title:     title ?? null,
    },
  });

  return Response.json(chatSession, { status: 201 });
}
