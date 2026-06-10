import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { title, targetAmount, currentAmount, targetDate } = await req.json();
  if (!title || !targetAmount || !targetDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || "0"),
      targetDate: new Date(targetDate),
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
