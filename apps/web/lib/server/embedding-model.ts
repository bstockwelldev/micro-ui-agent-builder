import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModel } from "ai";

export type FlowKnowledgeEmbeddingProvider = "openai" | "google";

export type ResolvedEmbeddingModel = {
  model: EmbeddingModel;
  provider: FlowKnowledgeEmbeddingProvider;
  modelId: string;
};

function getGoogleApiKey(): string | undefined {
  const k =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
  return k || undefined;
}

/**
 * Embeddings for flow knowledge: OpenAI first (text-embedding-3-small), else Google
 * (gemini-embedding-001). Matches LLM key env vars already used by the app.
 */
export function resolveEmbeddingModel(): ResolvedEmbeddingModel | null {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelId =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
    return {
      model: openai.embedding(modelId),
      provider: "openai",
      modelId,
    };
  }
  const googleKey = getGoogleApiKey();
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const modelId =
      process.env.GOOGLE_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
    return {
      model: google.embedding(modelId),
      provider: "google",
      modelId,
    };
  }
  return null;
}

export function missingEmbeddingProviderMessage(): string {
  return [
    "No embedding provider configured for flow knowledge uploads.",
    "Set OPENAI_API_KEY (preferred for text-embedding-3-small) or a Gemini key",
    "(GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY / NEXT_PUBLIC_GEMINI_API_KEY).",
  ].join(" ");
}
