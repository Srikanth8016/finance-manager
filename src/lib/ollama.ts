/**
 * Simple Ollama helper for one-shot prompts (no chat history).
 * For full conversational AI with financial context, use /api/chat instead.
 *
 * Uses /api/generate (raw completion) — suitable for single-turn tasks
 * like quick suggestions, summaries, or analysis snippets.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export async function askFinanceAI(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.response as string;
}
