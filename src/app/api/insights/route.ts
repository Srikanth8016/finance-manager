import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genAI } from "@/lib/openai";
import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now = new Date();

  // Fetch last 3 months of transactions
  const threeMonthsAgo = startOfMonth(subMonths(now, 2));
  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: threeMonthsAgo } },
    orderBy: { date: "asc" },
  });

  // Build monthly summaries
  const months = [0, 1, 2].map((offset) => {
    const start = startOfMonth(subMonths(now, offset));
    const end = endOfMonth(subMonths(now, offset));
    const tx = transactions.filter((t) => t.date >= start && t.date <= end);
    const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const catSpend: Record<string, number> = {};
    tx.filter((t) => t.type === "expense").forEach((t) => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });
    return { month: start, income, expenses, savings: income - expenses, catSpend };
  }).reverse();

  // Current month category breakdown
  const currentCatSpend = months[2].catSpend;
  const prevCatSpend = months[1].catSpend;

  // Category changes
  const categoryChanges = Object.keys({ ...currentCatSpend, ...prevCatSpend }).map((cat) => {
    const curr = currentCatSpend[cat] || 0;
    const prev = prevCatSpend[cat] || 0;
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : null;
    return { category: cat, current: curr, previous: prev, changePercent: change };
  }).sort((a, b) => b.current - a.current);

  // Top spending category
  const topCategory = categoryChanges[0]?.category ?? "N/A";

  // AI-generated insights
  const summaryText = `
Monthly data (oldest to newest):
${months.map((m, i) => `Month ${i + 1}: Income ₹${m.income}, Expenses ₹${m.expenses}, Savings ₹${m.savings}`).join("\n")}

Category spending this month vs last month:
${categoryChanges.map((c) => `${c.category}: ₹${c.current} (prev ₹${c.previous}${c.changePercent !== null ? `, ${c.changePercent > 0 ? "+" : ""}${c.changePercent.toFixed(0)}%` : ""})`).join("\n")}
  `.trim();

  let aiInsights: string[] = [];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a personal finance analyst. Based on the user's spending data, generate exactly 4 short, specific, actionable insights.
Format: Return a JSON array of 4 strings. Each insight should be 1-2 sentences max. Use ₹ and Indian formatting. Be direct and specific.
Example: ["Your food spending rose 18% this month. Try cooking at home more.", "You saved ₹5,000 more than last month — great progress!"]

Respond with only a JSON object like: {"insights": ["...", "...", "...", "..."]}

${summaryText}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    aiInsights = parsed.insights || parsed.tips || Object.values(parsed)[0] as string[] || [];
  } catch {
    aiInsights = [
      `Your top spending category is ${topCategory}.`,
      `This month's savings: ₹${months[2].savings.toLocaleString("en-IN")}.`,
    ];
  }

  return NextResponse.json({
    months,
    categoryChanges,
    topCategory,
    aiInsights,
    currentMonth: months[2],
    prevMonth: months[1],
  });
}
