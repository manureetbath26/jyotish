import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const normalisedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email: normalisedEmail, password: hashed },
    select: { id: true, email: true, name: true },
  });

  // Adopt any orphan guest sessions matching this email — the user keeps
  // their chat history (and used-question count) from the free trial.
  const adopted = await prisma.chatSession.updateMany({
    where: { userId: null, guestEmail: normalisedEmail },
    data: { userId: user.id },
  });

  return Response.json({ ...user, adoptedSessions: adopted.count }, { status: 201 });
}
