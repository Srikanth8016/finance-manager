"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, FileSpreadsheet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type ExtractedTx = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported: number; transactions: ExtractedTx[] } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText size={20} className="text-red-500" />;
    if (ext === "csv") return <FileText size={20} className="text-green-500" />;
    return <FileSpreadsheet size={20} className="text-blue-500" />;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  }

  async function handleUpload() {
    if (!file) return;
    setState("uploading");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setState("error");
      } else {
        setResult(data);
        setState("success");
      }
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Upload Statement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your bank statement and AI will extract all transactions automatically.
        </p>
      </div>

      {/* Supported formats */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "PDF", color: "bg-red-50 text-red-600 border-red-200" },
          { label: "CSV", color: "bg-green-50 text-green-600 border-green-200" },
          { label: "Excel (.xlsx)", color: "bg-blue-50 text-blue-600 border-blue-200" },
          { label: "XLS", color: "bg-blue-50 text-blue-600 border-blue-200" },
        ].map(({ label, color }) => (
          <span key={label} className={`text-xs px-3 py-1 rounded-full border font-medium ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {state !== "success" && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 lg:p-12 text-center cursor-pointer transition-all ${
              dragging
                ? "border-blue-400 bg-blue-50"
                : file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                  {getFileIcon(file.name)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="text-gray-400 hover:text-red-500 absolute top-4 right-4"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Upload size={24} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">
                    Drop your statement here, or <span className="text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, CSV, XLSX up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload button */}
          {file && state !== "uploading" && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={16} />
              Extract Transactions with AI
            </button>
          )}

          {state === "uploading" && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-700">Processing your statement...</p>
                <p className="text-xs text-blue-500 mt-0.5">AI is reading and categorizing transactions</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Upload failed</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
                <button onClick={reset} className="mt-2 text-xs text-red-600 underline">Try again</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Success state */}
      {state === "success" && result && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <CheckCircle size={24} className="text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">
                Successfully imported {result.imported} transactions!
              </p>
              <p className="text-sm text-green-600 mt-1">
                All transactions have been added to your account and categorized by AI.
              </p>
            </div>
            <button
              onClick={reset}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium shrink-0"
            >
              Upload Another
            </button>
          </div>

          {/* Extracted transactions preview */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Extracted Transactions</h2>
              <p className="text-xs text-gray-400 mt-0.5">{result.transactions.length} transactions found</p>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions.map((t, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{t.description}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>{t.type}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${
                        t.type === "income" ? "text-green-600" : "text-red-500"
                      }`}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {result.transactions.map((t, i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                    }`}>
                      {t.type === "income" ? "+" : "-"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400">{t.category} · {formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${
                    t.type === "income" ? "text-green-600" : "text-red-500"
                  }`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      {state === "idle" && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Upload your statement", desc: "PDF, CSV, or Excel from any bank" },
              { step: "2", title: "AI reads & extracts", desc: "GPT-4 parses every transaction automatically" },
              { step: "3", title: "Review & track", desc: "All transactions are saved and categorized" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {step}
                </div>
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
