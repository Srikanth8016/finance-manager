import { geminiChat, ChatMessage } from "./gemini";
import { ollamaChat } from "./ollama";

export type { ChatMessage };

export type AIProvider = "gemini" | "ollama";

/**
 * Unified chat function. Picks the provider from AI_PROVIDER env var.
 * Defaults to "gemini" if not set.
 */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "gemini") as AIProvider;

  switch (provider) {
    case "ollama":
      return ollamaChat(messages, systemPrompt);
    case "gemini":
    default:
      return geminiChat(messages, systemPrompt);
  }
}
