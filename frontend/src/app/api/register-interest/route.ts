import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ detail: "Invalid email" }, { status: 400 });
    }

    await prisma.interestEmail.upsert({
      where:  { email: email.trim().toLowerCase() },
      update: {},   // already registered — do nothing
      create: { email: email.trim().toLowerCase() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { detail: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const emails = await prisma.interestEmail.findMany({
      orderBy: { registeredAt: "desc" },
    });
    return Response.json({ count: emails.length, emails });
  } catch (error) {
    return Response.json(
      { detail: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
