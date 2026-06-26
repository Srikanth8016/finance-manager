"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK = [
  "How can I save money?",
  "What's my biggest expense?",
  "Will I overspend this month?",
  "How much can I invest?",
];

export default function FloatingChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      setMessages([...updated, {
        role: "assistant",
        content: data.reply ?? data.error ?? "Something went wrong.",
      }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Network error. Try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: 440 }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white shrink-0">
            <Sparkles size={16} />
            <span className="font-semibold text-sm flex-1">AI Finance Assistant</span>
            <button onClick={() => setOpen(false)} className="hover:opacity-70">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 pb-2">
                <Bot size={28} className="text-blue-300" />
                <p className="text-xs text-gray-400 text-center">Ask me anything about your finances</p>
                <div className="flex flex-col gap-1.5 w-full">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)}
                      className="text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}>
                      {m.content.split("\n").map((line, j) => (
                        <span key={j}>{line}{j < m.content.split("\n").length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-gray-100 px-3 py-2 rounded-xl flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2 px-3 py-3 border-t border-gray-100 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors shrink-0">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open AI assistant"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </div>
  );
}
