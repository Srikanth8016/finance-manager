import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type ExtractedTx = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
};

export type AnnotatedTx = ExtractedTx & { status: "new" | "duplicate" };

// ── PDF text extraction using pdfjs-dist directly ─────────────────────────────
// Avoids pdf-parse v2's @napi-rs/canvas native addon which can't be bundled.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // No worker thread in Node.js — run in-process
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n");
}

// ── AI extraction ─────────────────────────────────────────────────────────────
async function extractWithAI(text: string): Promise<ExtractedTx[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
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

// ── POST /api/upload — extract + annotate only, NO DB writes ──────────────────
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
      text = await extractPdfText(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const rows: string[] = [];
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        rows.push(XLSX.utils.sheet_to_csv(ws));
      });
      text = rows.join("\n");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, CSV, XLS, or XLSX." },
        { status: 400 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] file read error:", msg);
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from file." }, { status: 400 });
  }

  let extracted: ExtractedTx[] = [];
  try {
    extracted = await extractWithAI(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] AI extraction error:", msg);
    return NextResponse.json({ error: "AI extraction failed." }, { status: 500 });
  }

  if (extracted.length === 0) {
    return NextResponse.json({ error: "No transactions found in the file." }, { status: 400 });
  }

  // ── Duplicate detection (read-only) ──────────────────────────────────────────
  const dates = extracted.map((t) => new Date(t.date).getTime()).filter((d) => !isNaN(d));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);

  const existing = await prisma.transaction.findMany({
    where: { userId, date: { gte: minDate, lte: maxDate } },
    select: { date: true, amount: true, description: true },
  });

  const existingKeys = new Set(
    existing.map((t) => {
      const d = new Date(t.date).toISOString().slice(0, 10);
      return `${d}|${t.amount}|${t.description.trim().toLowerCase()}`;
    })
  );

  function makeKey(t: ExtractedTx): string {
    const d = new Date(t.date).toISOString().slice(0, 10);
    return `${d}|${Math.abs(t.amount)}|${t.description.trim().toLowerCase()}`;
  }

  const annotated: AnnotatedTx[] = extracted.map((t) => ({
    ...t,
    status: existingKeys.has(makeKey(t)) ? "duplicate" : "new",
  }));

  return NextResponse.json({
    total:        annotated.length,
    newCount:     annotated.filter((t) => t.status === "new").length,
    duplicates:   annotated.filter((t) => t.status === "duplicate").length,
    transactions: annotated,
  });
}
