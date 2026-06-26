import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { ExtractedTx } from "../route";

type ConfirmBody = {
  transactions: ExtractedTx[];  // only the rows the user selected
};

// POST /api/upload/confirm  — insert exactly the rows sent by the client
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body: ConfirmBody = await req.json();
  const { transactions } = body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((t) => ({
      userId,
      type:        t.type,
      amount:      Math.abs(t.amount),
      description: t.description,
      category:    t.category || "Other",
      date:        new Date(t.date),
      note:        "Imported from statement",
    })),
    skipDuplicates: false,
  });

  return NextResponse.json({ imported: created.count });
}
