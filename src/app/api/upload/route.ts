import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

type ExtractedTx = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
};

async function extractWithAI(text: string): Promise<ExtractedTx[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `You are a bank statement parser. Extract all transactions from the text and return a JSON object with key "transactions" containing an array.
Each transaction must have:
- date: ISO date string (YYYY-MM-DD)
- description: merchant/purpose name (string)
- amount: positive number (no currency symbols)
- type: "income" or "expense"
- category: one of [Food & Dining, Transport, Shopping, Entertainment, Health, Education, Bills & Utilities, Travel, Housing, Salary, Freelance, Investment, Other]

Rules:
- Credits/deposits/salary = income
- Debits/withdrawals/purchases = expense
- Ignore header rows, balance rows, and non-transaction lines
- If date is unclear, use today's date
Return only valid JSON.

Extract transactions from this bank statement:

${text.slice(0, 8000)}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  return parsed.transactions || [];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  let text = "";

  try {
    if (ext === "csv" || ext === "txt") {
      text = await file.text();
    } else if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const rows: string[] = [];
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(ws);
        rows.push(csv);
      });
      text = rows.join("\n");
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, CSV, XLS, or XLSX." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from file." }, { status: 400 });
  }

  let extracted: ExtractedTx[] = [];
  try {
    extracted = await extractWithAI(text);
  } catch {
    return NextResponse.json({ error: "AI extraction failed." }, { status: 500 });
  }

  if (extracted.length === 0) {
    return NextResponse.json({ error: "No transactions found in the file." }, { status: 400 });
  }

  // Save all to DB
  const created = await prisma.transaction.createMany({
    data: extracted.map((t) => ({
      userId,
      type: t.type,
      amount: Math.abs(t.amount),
      description: t.description,
      category: t.category || "Other",
      date: new Date(t.date),
      note: "Imported from statement",
    })),
    skipDuplicates: false,
  });

  return NextResponse.json({
    imported: created.count,
    transactions: extracted,
  });
}
