import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAnonId } from "@/lib/anonSession";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/chat/message/:id
 * Body: { saved: boolean }
 * Toggle the "saved" flag on a chat message. Saved messages survive
 * "clear chat". Assistant messages only — saving user messages makes
 * no semantic sense for this app. Allowed for both logged-in users and
 * guests (matched on the anon cookie).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.saved !== "boolean") {
    return Response.json({ error: "body must include boolean 'saved'" }, { status: 400 });
  }

  const msg = await prisma.chatMessage.findUnique({
    where: { id },
    include: { session: { select: { userId: true, anonSessionId: true } } },
  });
  if (!msg) return Response.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const anonId = await readAnonId();
  const isOwner =
    (session?.user?.id && msg.session.userId === session.user.id) ||
    (anonId && msg.session.anonSessionId === anonId);
  if (!isOwner) {
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
