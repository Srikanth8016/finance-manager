import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.investment.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      type: body.type ?? existing.type,
      investedAmount: body.investedAmount ? parseFloat(body.investedAmount) : existing.investedAmount,
      currentValue: body.currentValue !== undefined ? parseFloat(body.currentValue) : existing.currentValue,
      units: body.units !== undefined ? parseFloat(body.units) : existing.units,
      buyPrice: body.buyPrice !== undefined ? parseFloat(body.buyPrice) : existing.buyPrice,
      notes: body.notes ?? existing.notes,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.investment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
