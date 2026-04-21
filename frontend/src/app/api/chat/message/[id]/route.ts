import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/chat/message/:id
 * Body: { saved: boolean }
 * Toggle the "saved" flag on a chat message. Saved messages survive
 * "clear chat". Assistant messages only — saving user messages makes
 * no semantic sense for this app.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.saved !== "boolean") {
    return Response.json({ error: "body must include boolean 'saved'" }, { status: 400 });
  }

  const msg = await prisma.chatMessage.findUnique({
    where: { id },
    include: { session: { select: { userId: true } } },
  });
  if (!msg) return Response.json({ error: "Not found" }, { status: 404 });
  if (msg.session.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (msg.role !== "assistant") {
    return Response.json({ error: "Only assistant answers can be saved" }, { status: 400 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id },
    data: { saved: body.saved },
  });
  return Response.json({ id: updated.id, saved: updated.saved });
}
