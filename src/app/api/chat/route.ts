import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

type Tx = { type: string; amount: number; category: string; description: string; date: Date };
type Bgt = { category: string; limit: number };
type Gol = { title: string; targetAmount: number; currentAmount: number; targetDate: Date };
type BgtStatus = { category: string; limit: number; spent: number; remaining: number };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "User ID not found in session. Please sign out and sign in again." }, { status: 401 });

  const { messages } = await req.json();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [thisMonthTx, lastMonthTx, budgets, goals, allTx] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 100 }),
  ]);

  const thisIncome = (thisMonthTx as Tx[]).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const thisExpenses = (thisMonthTx as Tx[]).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const lastIncome = (lastMonthTx as Tx[]).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const lastExpenses = (lastMonthTx as Tx[]).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const catSpend: Record<string, number> = {};
  (thisMonthTx as Tx[]).filter((t) => t.type === "expense").forEach((t) => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
  });

  const budgetStatus: BgtStatus[] = (budgets as Bgt[]).map((b) => ({
    category: b.category,
    limit: b.limit,
    spent: catSpend[b.category] || 0,
    remaining: b.limit - (catSpend[b.category] || 0),
  }));

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const financialContext = `
Today: ${format(now, "dd MMM yyyy")} | Month: ${format(now, "MMMM yyyy")}

THIS MONTH: Income ${fmt(thisIncome)} | Expenses ${fmt(thisExpenses)} | Savings ${fmt(thisIncome - thisExpenses)}
LAST MONTH: Income ${fmt(lastIncome)} | Expenses ${fmt(lastExpenses)} | Savings ${fmt(lastIncome - lastExpenses)}

SPENDING BY CATEGORY THIS MONTH:
${Object.entries(catSpend).map(([c, a]) => `- ${c}: ${fmt(a)}`).join("\n") || "No expenses yet"}

BUDGET STATUS:
${budgetStatus.length > 0
    ? budgetStatus.map((b) =>
        `- ${b.category}: spent ${fmt(b.spent)} of ${fmt(b.limit)} (${b.remaining >= 0 ? `${fmt(b.remaining)} left` : `OVER by ${fmt(Math.abs(b.remaining))}`})`
      ).join("\n")
    : "No budgets set"}

GOALS:
${(goals as Gol[]).length > 0
    ? (goals as Gol[]).map((g) =>
        `- ${g.title}: target ${fmt(g.targetAmount)}, saved ${fmt(g.currentAmount)}, deadline ${format(g.targetDate, "MMM yyyy")}`
      ).join("\n")
    : "No goals set"}

RECENT TRANSACTIONS:
${(allTx as Tx[]).slice(0, 20).map((t) =>
    `- ${format(t.date, "dd MMM")}: ${t.description} (${t.category}) ${t.type === "income" ? "+" : "-"}${fmt(t.amount)}`
  ).join("\n")}`.trim();

  const systemPrompt = `You are a smart, friendly AI personal finance assistant for an Indian user.
You have access to their real financial data. Use it to give precise, personalized answers.
Use ₹ symbol and Indian number formatting. Be concise but specific with numbers.
Never make up data — only use what's provided below.

USER'S FINANCIAL DATA:
${financialContext}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert messages array to Gemini chat history format
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history,
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini error";
    console.error("Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
