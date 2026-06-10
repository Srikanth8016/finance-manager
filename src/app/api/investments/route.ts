import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(investments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { name, type, investedAmount, currentValue, units, buyPrice, notes } = body;
  if (!name || !type || !investedAmount || currentValue === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const inv = await prisma.investment.create({
    data: {
      userId, name, type,
      investedAmount: parseFloat(investedAmount),
      currentValue: parseFloat(currentValue),
      units: units ? parseFloat(units) : null,
      buyPrice: buyPrice ? parseFloat(buyPrice) : null,
      notes: notes || null,
    },
  });
  return NextResponse.json(inv, { status: 201 });
}
