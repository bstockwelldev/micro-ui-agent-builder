/**
 * Client-safe provider guess from a flow model ref string (mirrors server
 * `parseModelRef` in language-model.ts without reading env).
 */
export type InferredProviderId = "google" | "groq" | "openai" | "gateway" | "unknown";

export function inferProviderIdFromModelRef(requested?: string): InferredProviderId {
  const raw = requested?.trim() ?? "";
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (lower.startsWith("gateway/")) return "gateway";
  const idx = raw.indexOf("/");
  if (idx > 0) {
    const p = raw.slice(0, idx).toLowerCase();
    if (p === "groq") return "groq";
    if (p === "google" || p === "gemini") return "google";
    if (p === "openai") return "openai";
  }
  if (lower.includes("gemini")) return "google";
  if (
    lower.startsWith("gpt") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4")
  ) {
    return "openai";
  }
  if (
    /^(llama|meta-|mixtral|mistral|qwen|deepseek)/i.test(raw.trim()) ||
    (lower.includes("llama") && lower.includes("versatile"))
  ) {
    return "groq";
  }
  return "google";
}
