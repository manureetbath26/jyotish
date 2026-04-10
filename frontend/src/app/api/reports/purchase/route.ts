import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { email, upiTransactionId, reportType, birthName, birthData, chartData, reportData } = body;

  if (!email || !reportType || !birthData || !chartData) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const purchase = await prisma.reportPurchase.create({
    data: {
      userId: session?.user?.id ?? null,
      email,
      reportType,
      amount: 20000, // INR 200 in paise
      upiTransactionId: upiTransactionId || null,
      status: "verified", // auto-verify for now (admin can review later)
      birthName: birthName || null,
      birthData,
      chartData,
      reportData: reportData || null,
    },
  });

  return Response.json(purchase, { status: 201 });
}
