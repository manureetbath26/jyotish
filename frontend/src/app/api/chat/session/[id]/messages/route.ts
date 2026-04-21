import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/chat/session/:id/messages
 *
 * Clears the chat session — deletes all UNSAVED messages plus their
 * paired user question (if both are unsaved). Saved assistant messages
 * and the user questions that produced them are preserved so the user
 * can revisit their bookmarked answers in context.
 *
 * Question quota is NOT refunded — this is a UI/display action only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!chatSession) return Response.json({ error: "Not found" }, { status: 404 });
  if (chatSession.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Load all messages ordered by creation time so we can pair user Qs
  // with their assistant As by adjacency.
  const all = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  // Find saved assistant message IDs and the user question immediately
  // preceding each (the Q that produced the saved A).
  const keepIds = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    const m = all[i];
    if (m.role === "assistant" && m.saved) {
      keepIds.add(m.id);
      // Nearest previous user message is the question that produced this answer
      for (let j = i - 1; j >= 0; j--) {
        if (all[j].role === "user") {
          keepIds.add(all[j].id);
          break;
        }
      }
    }
  }

  const toDelete = all.filter((m) => !keepIds.has(m.id)).map((m) => m.id);
  if (toDelete.length > 0) {
    await prisma.chatMessage.deleteMany({ where: { id: { in: toDelete } } });
  }

  return Response.json({
    deleted: toDelete.length,
    kept: keepIds.size,
  });
}
