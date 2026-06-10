"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my biggest expense category?",
  "Am I over budget anywhere?",
  "How much have I saved this month?",
  "Compare my spending vs last month",
  "How much should I save each month?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages([
          ...updated,
          { role: "assistant", content: `Error: ${data.error || "Something went wrong."}` },
        ]);
      } else {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      setMessages([
        ...updated,
        { role: "assistant", content: `Network error: ${err instanceof Error ? err.message : "Please try again."}` },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] max-h-[800px]">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Finance Assistant</h1>
          <p className="text-xs text-gray-400">Powered by your real financial data</p>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-200 p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={32} className="text-blue-500" />
            </div>
            <h2 className="font-semibold text-gray-800 mb-1">Ask me anything about your finances</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">
              I have access to your transactions, budgets, and goals. Ask away!
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-full transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={15} className="text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <User size={15} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Suggestion chips when chatting */}
      {messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 shrink-0 scrollbar-hide">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-500 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 mt-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
