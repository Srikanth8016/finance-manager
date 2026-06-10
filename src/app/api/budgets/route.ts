import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/budgets
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({ where: { userId }, orderBy: { category: "asc" } }),
    prisma.transaction.findMany({
      where: { userId, type: "expense", date: { gte: monthStart, lt: monthEnd } },
      select: { category: true, amount: true },
    }),
  ]);

  // Calculate spent per category
  const spent: Record<string, number> = {};
  transactions.forEach((t) => {
    spent[t.category] = (spent[t.category] || 0) + t.amount;
  });

  const result = budgets.map((b) => ({
    ...b,
    spent: spent[b.category] || 0,
  }));

  return NextResponse.json(result);
}

// POST /api/budgets
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { category, limit, period } = await req.json();
  if (!category || !limit) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Upsert — one budget per category per user
  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId, category } },
    update: { limit: parseFloat(limit), period: period || "monthly" },
    create: { userId, category, limit: parseFloat(limit), period: period || "monthly" },
  });

  return NextResponse.json(budget, { status: 201 });
}
