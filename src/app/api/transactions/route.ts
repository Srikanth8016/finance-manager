import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/utils";

// AI categorization
async function categorize(description: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a finance categorizer. Given a transaction description, return ONLY one category from this list, nothing else:\n${CATEGORIES.join(", ")}\n\nTransaction: ${description}`;
    const result = await model.generateContent(prompt);
    const cat = result.response.text().trim();
    return CATEGORIES.includes(cat as (typeof CATEGORIES)[number]) ? cat : "Other";
  } catch {
    return "Other";
  }
}

// GET /api/transactions?page=1&limit=20&month=2026-06&category=Food
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const month    = searchParams.get("month");       // "2026-06"
  const category = searchParams.get("category");
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip     = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (category) where.category = category;

  // Run count + page fetch in parallel
  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { type, amount, description, category, date, note } = body;

  if (!type || !amount || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const finalCategory = category && category !== "auto"
    ? category
    : await categorize(description);

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: parseFloat(amount),
      description,
      category: finalCategory,
      date: date ? new Date(date) : new Date(),
      note: note || null,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
