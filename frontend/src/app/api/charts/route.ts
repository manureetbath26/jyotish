import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const charts = await prisma.chart.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      chartData: true,
    },
  });

  return Response.json(charts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, chart_data } = body;

  if (!name || !chart_data) {
    return Response.json({ error: "Missing name or chart_data" }, { status: 400 });
  }

  const chart = await prisma.chart.create({
    data: {
      userId: session.user.id,
      name,
      chartData: chart_data,
    },
  });

  return Response.json(chart, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const chart = await prisma.chart.findUnique({ where: { id } });
  if (!chart || chart.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chart.delete({ where: { id } });
  return Response.json({ success: true });
}
