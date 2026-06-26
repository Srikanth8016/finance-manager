import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

// Escape a CSV cell — wrap in quotes and double any internal quotes
function cell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Escape double-quotes and wrap in quotes if needed
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function row(...cols: (string | number | null | undefined)[]): string {
  return cols.map(cell).join(",");
}

// GET /api/export/csv?month=2026-06&category=Food&type=expense
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const month    = searchParams.get("month");
  const category = searchParams.get("category");
  const type     = searchParams.get("type"); // "income" | "expense" | null = all

  const where: Record<string, unknown> = { userId };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (category) where.category = category;
  if (type && (type === "income" || type === "expense")) where.type = type;

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

  // ── build CSV ────────────────────────────────────────────────
  const header = row("ID", "Date", "Description", "Category", "Type", "Amount", "Note", "Created At");

  const dataRows = transactions.map((t) =>
    row(
      t.id,
      format(new Date(t.date), "yyyy-MM-dd"),
      t.description,
      t.category,
      t.type,
      t.amount,
      t.note ?? "",
      format(new Date(t.createdAt), "yyyy-MM-dd HH:mm:ss"),
    )
  );

  // Summary footer
  const income   = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const summary  = [
    "",
    row("", "", "", "", "Total Income",  income,          "", ""),
    row("", "", "", "", "Total Expenses", expenses,        "", ""),
    row("", "", "", "", "Net Savings",    income - expenses, "", ""),
  ];

  const csv = [header, ...dataRows, ...summary].join("\r\n");

  // ── filename ─────────────────────────────────────────────────
  const label = month ?? format(new Date(), "yyyy-MM");
  const filename = `transactions_${label}${category ? `_${category.replace(/\s+/g, "_")}` : ""}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // BOM so Excel opens UTF-8 CSV correctly
      "X-Content-Type-Options": "nosniff",
    },
  });
}
