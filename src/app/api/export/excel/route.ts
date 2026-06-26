import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import * as XLSX from "xlsx";

// GET /api/export/excel?month=2026-06&category=Food&type=expense
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const month    = searchParams.get("month");
  const category = searchParams.get("category");
  const type     = searchParams.get("type");

  const where: Record<string, unknown> = { userId };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (category) where.category = category;
  if (type === "income" || type === "expense") where.type = type;

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      description: true,
      category: true,
      type: true,
      amount: true,
      note: true,
      createdAt: true,
    },
  });

  // ── workbook ─────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Transactions ─────────────────────────────────────
  const txRows = transactions.map((t) => ({
    ID:           t.id,
    Date:         format(new Date(t.date), "yyyy-MM-dd"),
    Description:  t.description,
    Category:     t.category,
    Type:         t.type,
    Amount:       t.amount,
    Note:         t.note ?? "",
    "Created At": format(new Date(t.createdAt), "yyyy-MM-dd HH:mm:ss"),
  }));

  const txSheet = XLSX.utils.json_to_sheet(txRows);

  // Column widths
  txSheet["!cols"] = [
    { wch: 28 }, // ID
    { wch: 12 }, // Date
    { wch: 32 }, // Description
    { wch: 18 }, // Category
    { wch: 10 }, // Type
    { wch: 14 }, // Amount
    { wch: 24 }, // Note
    { wch: 20 }, // Created At
  ];

  XLSX.utils.book_append_sheet(wb, txSheet, "Transactions");

  // ── Sheet 2: Summary ──────────────────────────────────────────
  const income   = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const catMap: Record<string, { income: number; expenses: number }> = {};
  for (const t of transactions) {
    if (!catMap[t.category]) catMap[t.category] = { income: 0, expenses: 0 };
    if (t.type === "income")  catMap[t.category].income   += t.amount;
    else                      catMap[t.category].expenses += t.amount;
  }

  const summaryRows = [
    { Metric: "Period",         Value: month ?? "All time" },
    { Metric: "Total Transactions", Value: transactions.length },
    { Metric: "",               Value: "" },
    { Metric: "Total Income",   Value: income },
    { Metric: "Total Expenses", Value: expenses },
    { Metric: "Net Savings",    Value: income - expenses },
    { Metric: "Savings Rate",   Value: income > 0 ? `${((( income - expenses) / income) * 100).toFixed(1)}%` : "N/A" },
    { Metric: "",               Value: "" },
    { Metric: "--- Category Breakdown ---", Value: "" },
    ...Object.entries(catMap)
      .sort((a, b) => b[1].expenses - a[1].expenses)
      .map(([cat, v]) => ({
        Metric: cat,
        Value:  `Expenses: ${v.expenses.toFixed(2)}  |  Income: ${v.income.toFixed(2)}`,
      })),
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ── write to buffer ───────────────────────────────────────────
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const label    = month ?? format(new Date(), "yyyy-MM");
  const catLabel = category ? `_${category.replace(/\s+/g, "_")}` : "";
  const filename = `transactions_${label}${catLabel}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
