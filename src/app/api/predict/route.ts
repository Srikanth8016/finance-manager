import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfMonth, subMonths, format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now = new Date();

  // Get last 4 months of transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      date: { gte: startOfMonth(subMonths(now, 3)) },
    },
  });

  // Build monthly category totals
  const monthlyData: Record<string, Record<string, number>> = {};
  for (let i = 3; i >= 0; i--) {
    const key = format(subMonths(now, i), "yyyy-MM");
    monthlyData[key] = {};
  }

  transactions.forEach((t) => {
    const key = format(t.date, "yyyy-MM");
    if (monthlyData[key] !== undefined) {
      monthlyData[key][t.category] = (monthlyData[key][t.category] || 0) + t.amount;
    }
  });

  const months = Object.keys(monthlyData).sort();
  const allCategories = [...new Set(transactions.map((t) => t.category))];

  // Predict next month using weighted average (recent months weighted more)
  const weights = [0.1, 0.2, 0.3, 0.4]; // oldest to newest
  const predictions: Record<string, number> = {};

  allCategories.forEach((cat) => {
    const values = months.map((m) => monthlyData[m][cat] || 0);
    const weighted = values.reduce((sum, val, i) => sum + val * weights[i], 0);
    if (weighted > 0) predictions[cat] = Math.round(weighted);
  });

  // Monthly trend per category
  const trends = allCategories.map((cat) => ({
    category: cat,
    history: months.map((m) => ({ month: m, amount: monthlyData[m][cat] || 0 })),
    predicted: predictions[cat] || 0,
  })).sort((a, b) => b.predicted - a.predicted);

  const totalPredicted = Object.values(predictions).reduce((s, v) => s + v, 0);

  return NextResponse.json({ trends, totalPredicted, nextMonth: format(subMonths(now, -1), "MMMM yyyy") });
}
