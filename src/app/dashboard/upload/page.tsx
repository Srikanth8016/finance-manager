"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, CheckCircle, AlertCircle,
  Loader2, X, FileSpreadsheet, Copy,
} from "lucide-react";
import { formatCurrency, formatDate, CATEGORIES } from "@/lib/utils";

type AnnotatedTx = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  status: "new" | "duplicate";
};

type PreviewResult = {
  total: number;
  newCount: number;
  duplicates: number;
  transactions: AnnotatedTx[];
};

type ImportResult = { imported: number };

// "idle" → "uploading" → "review" → "importing" → "done" | "error"
type Stage = "idle" | "uploading" | "review" | "importing" | "done" | "error";

export default function UploadPage() {
  const [stage, setStage]             = useState<Stage>("idle");
  const [dragging, setDragging]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError]             = useState("");

  // review state
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [filter, setFilter]           = useState<"all" | "new" | "duplicate">("all");
  // inline edits: map from original index → patched fields
  const [edits, setEdits]             = useState<Record<number, Partial<AnnotatedTx>>>({});

  const inputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────
  function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText size={20} className="text-red-500" />;
    if (ext === "csv") return <FileText size={20} className="text-green-500" />;
    return <FileSpreadsheet size={20} className="text-blue-500" />;
  }

  function txAt(i: number): AnnotatedTx {
    return { ...(preview!.transactions[i]), ...(edits[i] ?? {}) };
  }

  function visibleIndices(): number[] {
    if (!preview) return [];
    return preview.transactions
      .map((_, i) => i)
      .filter((i) => {
        const t = txAt(i);
        if (filter === "new")       return t.status === "new";
        if (filter === "duplicate") return t.status === "duplicate";
        return true;
      });
  }

  // select / deselect
  function toggle(i: number) {
    setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function selectAll() {
    setSelected(new Set(visibleIndices()));
  }
  function deselectAll() {
    setSelected((s) => {
      const n = new Set(s);
      visibleIndices().forEach((i) => n.delete(i));
      return n;
    });
  }
  const visIdx    = visibleIndices();
  const allChecked = visIdx.length > 0 && visIdx.every((i) => selected.has(i));
  const someChecked = visIdx.some((i) => selected.has(i));

  // inline edit helper
  function patch(i: number, field: keyof AnnotatedTx, value: string) {
    setEdits((e) => ({ ...e, [i]: { ...e[i], [field]: value } }));
  }

  // ── reset ────────────────────────────────────────────────────
  function reset() {
    setStage("idle"); setFile(null); setPreview(null);
    setImportResult(null); setError(""); setSelected(new Set());
    setFilter("all"); setEdits({});
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── step 1: extract + annotate ────────────────────────────────
  async function handleUpload() {
    if (!file) return;
    setStage("uploading"); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed."); setStage("error"); return; }
      setPreview(data);
      // pre-select all "new" rows by default
      const newIdx = (data.transactions as AnnotatedTx[])
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.status === "new")
        .map(({ i }) => i);
      setSelected(new Set(newIdx));
      setStage("review");
    } catch {
      setError("Network error. Please try again."); setStage("error");
    }
  }

  // ── step 2: import selected ───────────────────────────────────
  async function handleConfirm() {
    if (!preview || selected.size === 0) return;
    setStage("importing");
    const toSend = [...selected].map((i) => txAt(i));
    try {
      const res  = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: toSend }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Import failed."); setStage("error"); return; }
      setImportResult(data);
      setStage("done");
    } catch {
      setError("Network error. Please try again."); setStage("error");
    }
  }

  // ── render ───────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Upload Statement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your bank statement — review every transaction before importing.
        </p>
      </div>

      {/* Format badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "PDF",  color: "bg-red-50 text-red-600 border-red-200" },
          { label: "CSV",  color: "bg-green-50 text-green-600 border-green-200" },
          { label: "Excel (.xlsx)", color: "bg-blue-50 text-blue-600 border-blue-200" },
          { label: "XLS",  color: "bg-blue-50 text-blue-600 border-blue-200" },
        ].map(({ label, color }) => (
          <span key={label} className={`text-xs px-3 py-1 rounded-full border font-medium ${color}`}>{label}</span>
        ))}
      </div>

      {/* ── Drop zone ─────────────────────────────────────────── */}
      {(stage === "idle" || stage === "error") && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 lg:p-12 text-center cursor-pointer transition-all ${
              dragging ? "border-blue-400 bg-blue-50"
              : file   ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.csv,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} className="hidden" />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">{getFileIcon(file.name)}</div>
                <div><p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p></div>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-gray-400 hover:text-red-500 absolute top-4 right-4"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center"><Upload size={24} className="text-blue-400" /></div>
                <div><p className="font-medium text-gray-700">Drop your statement here, or <span className="text-blue-600">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">PDF, CSV, XLSX up to 10 MB</p></div>
              </div>
            )}
          </div>
          {file && (
            <button onClick={handleUpload}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors">
              <Upload size={16} /> Extract &amp; Preview Transactions
            </button>
          )}
          {stage === "error" && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div><p className="text-sm font-medium text-red-700">Failed</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
                <button onClick={reset} className="mt-2 text-xs text-red-600 underline">Try again</button></div>
            </div>
          )}
        </>
      )}

      {/* Uploading spinner */}
      {stage === "uploading" && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
          <div><p className="text-sm font-medium text-blue-700">Processing your statement...</p>
            <p className="text-xs text-blue-500 mt-0.5">AI is extracting and checking for duplicates</p></div>
        </div>
      )}

      {/* ── Review stage ──────────────────────────────────────── */}
      {(stage === "review" || stage === "importing") && preview && (
        <div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-500">Found</p>
              <p className="text-2xl font-bold text-blue-700">{preview.total}</p>
              <p className="text-xs text-blue-400">in statement</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-500">New</p>
              <p className="text-2xl font-bold text-green-700">{preview.newCount}</p>
              <p className="text-xs text-green-400">ready to import</p>
            </div>
            <div className={`border rounded-xl p-4 ${preview.duplicates > 0 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
              <p className={`text-xs ${preview.duplicates > 0 ? "text-yellow-500" : "text-gray-400"}`}>Duplicates</p>
              <p className={`text-2xl font-bold ${preview.duplicates > 0 ? "text-yellow-700" : "text-gray-500"}`}>{preview.duplicates}</p>
              <p className={`text-xs ${preview.duplicates > 0 ? "text-yellow-400" : "text-gray-400"}`}>already in account</p>
            </div>
          </div>

          {/* Filter + select controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex gap-2">
              {(["all", "new", "duplicate"] as const).map((f) => {
                const cnt = f === "all" ? preview.total : f === "new" ? preview.newCount : preview.duplicates;
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === f
                        ? f === "duplicate" ? "bg-yellow-100 text-yellow-700" : "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}>
                    {f === "all" ? "All" : f === "new" ? "New" : "Duplicates"} <span className="opacity-60">{cnt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{selected.size} selected</span>
              <button onClick={allChecked ? deselectAll : selectAll}
                className="text-blue-600 hover:text-blue-700 font-medium">
                {allChecked ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => allChecked ? deselectAll() : selectAll()}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Description</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Category</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleIndices().map((i) => {
                    const t = txAt(i);
                    const checked = selected.has(i);
                    return (
                      <tr key={i} onClick={() => toggle(i)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${
                          checked
                            ? t.status === "duplicate" ? "bg-yellow-50" : "bg-blue-50/40"
                            : "hover:bg-gray-50 opacity-60"
                        }`}>
                        {/* checkbox */}
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={checked} onChange={() => toggle(i)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                        </td>
                        {/* status badge */}
                        <td className="px-3 py-2.5">
                          {t.status === "new"
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={9} />New</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full"><Copy size={9} />Duplicate</span>
                          }
                        </td>
                        {/* date */}
                        <td className="px-3 py-2.5 text-sm text-gray-500 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}>
                          <input type="date" value={new Date(t.date).toISOString().slice(0, 10)}
                            onChange={(e) => patch(i, "date", e.target.value)}
                            className="border-0 bg-transparent text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 w-32" />
                        </td>
                        {/* description */}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input value={t.description}
                            onChange={(e) => patch(i, "description", e.target.value)}
                            className="border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 w-40 lg:w-56" />
                        </td>
                        {/* category */}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <select value={t.category} onChange={(e) => patch(i, "category", e.target.value)}
                            className="border-0 bg-transparent text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        {/* type */}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <select value={t.type} onChange={(e) => patch(i, "type", e.target.value as "income" | "expense")}
                            className={`border-0 bg-transparent text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 ${
                              t.type === "income" ? "text-green-700" : "text-red-600"}`}>
                            <option value="income">income</option>
                            <option value="expense">expense</option>
                          </select>
                        </td>
                        {/* amount */}
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <input type="number" min="0" step="0.01"
                            value={t.amount}
                            onChange={(e) => patch(i, "amount", e.target.value)}
                            className={`border-0 bg-transparent text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 w-24 ${
                              t.type === "income" ? "text-green-600" : "text-red-500"}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleIndices().length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No transactions to show.</p>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selected.size}</span> of {preview.total} selected for import
            </div>
            <div className="flex gap-3">
              <button onClick={reset}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={selected.size === 0 || stage === "importing"}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {stage === "importing"
                  ? <><Loader2 size={15} className="animate-spin" /> Importing...</>
                  : <><CheckCircle size={15} /> Import {selected.size} Transaction{selected.size !== 1 ? "s" : ""}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Done state ────────────────────────────────────────── */}
      {stage === "done" && importResult && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800 text-lg">{importResult.imported} transaction{importResult.imported !== 1 ? "s" : ""} imported!</p>
              <p className="text-sm text-green-600 mt-1">Your transactions have been saved and categorized.</p>
            </div>
            <button onClick={reset}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* How it works (idle only) */}
      {stage === "idle" && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Upload statement",    desc: "PDF, CSV, or Excel from any bank" },
              { step: "2", title: "AI extracts",         desc: "Gemini reads and categorizes transactions" },
              { step: "3", title: "Review & edit",       desc: "Select rows, fix dates, categories, amounts" },
              { step: "4", title: "Import selected",     desc: "Only your chosen transactions are saved" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
