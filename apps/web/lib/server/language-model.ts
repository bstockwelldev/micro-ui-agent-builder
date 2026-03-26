import { createGatewayProvider } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import {
  config as aiRegistryConfig,
  hasEnabledCatalogProvider,
  tryResolveRegistryLanguageModelId,
} from "@/lib/ai-config";

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
/** Default for auto / bare ids — supports JSON schema structured outputs (e.g. GenUI). */
export const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
/** Vercel AI Gateway default when that is the only configured key */
const DEFAULT_GATEWAY_MODEL = "meta/llama-3.3-70b";
/** OpenAI-compatible endpoint at Ollama (see https://github.com/ollama/ollama/blob/main/docs/openai.md). */
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

export type ProviderEnv = {
  hasGroq: boolean;
  hasGoogle: boolean;
  hasOpenAI: boolean;
  hasGateway: boolean;
  hasOllama: boolean;
};

function getGoogleApiKey(): string | undefined {
  const k =
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
  return k || undefined;
}

/** Normalized OpenAI-compatible base URL (…/v1). */
export function getOllamaBaseUrl(): string | undefined {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  if (!raw) return undefined;
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/v1")) return noTrail;
  return `${noTrail}/v1`;
}

export function getProviderEnv(): ProviderEnv {
  return {
    hasGroq: Boolean(process.env.GROQ_API_KEY?.trim()),
    hasGoogle: Boolean(getGoogleApiKey()),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()),
    hasGateway: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    hasOllama: Boolean(getOllamaBaseUrl()),
  };
}

export function missingProviderMessage(): string {
  const e = getProviderEnv();
  if (
    e.hasGroq ||
    e.hasGoogle ||
    e.hasOpenAI ||
    e.hasGateway ||
    e.hasOllama ||
    hasEnabledCatalogProvider()
  )
    return "";
  return [
    "No LLM API key configured.",
    "Set one of: GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or NEXT_PUBLIC_GEMINI_API_KEY (preferred for structured outputs),",
    "GROQ_API_KEY, OPENAI_API_KEY, AI_GATEWAY_API_KEY (Vercel AI Gateway),",
    "MISTRAL_API_KEY, OPENROUTER_API_KEY, TOGETHER_API_KEY (see lib/ai-config.ts),",
    "or OLLAMA_BASE_URL for a local OpenAI-compatible Ollama endpoint.",
  ].join(" ");
}

export function parseModelRef(requested?: string): {
  provider: "groq" | "google" | "openai" | "gateway" | "ollama" | "auto";
  modelId: string;
} {
  const raw = requested?.trim() ?? "";
  if (!raw) return { provider: "auto", modelId: "" };
  const lower = raw.toLowerCase();
  if (lower.startsWith("gateway/")) {
    return { provider: "gateway", modelId: raw.slice("gateway/".length).trim() };
  }
  const idx = raw.indexOf("/");
  if (idx > 0) {
    const p = raw.slice(0, idx).toLowerCase();
    const id = raw.slice(idx + 1);
    if (p === "groq") return { provider: "groq", modelId: id || DEFAULT_GROQ_MODEL };
    if (p === "google" || p === "gemini") {
      return { provider: "google", modelId: id || DEFAULT_GOOGLE_MODEL };
    }
    if (p === "openai") return { provider: "openai", modelId: id || DEFAULT_OPENAI_MODEL };
    if (p === "ollama")
      return { provider: "ollama", modelId: id || DEFAULT_OLLAMA_MODEL };
    if (p === "mistral" || p === "together" || p === "openrouter") {
      return { provider: "auto", modelId: raw };
    }
  }
  if (lower.includes("gemini")) return { provider: "google", modelId: raw };
  if (
    lower.startsWith("gpt") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4")
  ) {
    return { provider: "openai", modelId: raw };
  }
  // Bare ids: Groq-style names vs default to Gemini (json_schema / structured outputs).
  if (
    /^(llama|meta-|mixtral|mistral|qwen|deepseek)/i.test(raw.trim()) ||
    (lower.includes("llama") && lower.includes("versatile"))
  ) {
    return { provider: "groq", modelId: raw || DEFAULT_GROQ_MODEL };
  }
  return { provider: "google", modelId: raw || DEFAULT_GOOGLE_MODEL };
}

export type ResolvedLanguageModel = {
  model: LanguageModel;
  providerLabel: string;
  fallback?: LanguageModel;
  fallbackLabel?: string;
};

/** Resolve a single Ollama (OpenAI-compatible) model; null if OLLAMA_BASE_URL is unset. */
export function resolveOllamaLanguageModel(
  requestedFlowModel?: string,
): ResolvedLanguageModel | null {
  const base = getOllamaBaseUrl();
  if (!base) return null;

  const envModel = process.env.OLLAMA_MODEL?.trim();
  const parsed = parseModelRef(requestedFlowModel);
  const fromFlow =
    parsed.provider === "ollama" && parsed.modelId
      ? parsed.modelId
      : undefined;
  const bare = parsed.modelId || "";
  const heuristic =
    bare &&
    !bare.toLowerCase().includes("gemini") &&
    !/^(gpt|o[134])/i.test(bare.trim())
      ? bare.split("/").pop()!.trim() || bare
      : undefined;

  const id =
    envModel || fromFlow || heuristic || DEFAULT_OLLAMA_MODEL;

  const ollama = createOpenAI({
    baseURL: base,
    apiKey: process.env.OLLAMA_API_KEY?.trim() || "ollama",
  });

  return {
    model: ollama(id),
    providerLabel: `ollama:${id}`,
  };
}

function gatewayModel(fullId: string): ResolvedLanguageModel {
  const apiKey = process.env.AI_GATEWAY_API_KEY!;
  const gw = createGatewayProvider({ apiKey });
  const id = fullId || DEFAULT_GATEWAY_MODEL;
  return { model: gw(id), providerLabel: `gateway:${id}` };
}

/**
 * Google (Gemini) first when configured — needed for JSON-schema structured outputs (GenUI).
 * Then Groq, then OpenAI. Use `groq/<model>` in the flow when you want Groq explicitly.
 * AI Gateway: use flow model `gateway/<provider/model>` or configure only AI_GATEWAY_API_KEY.
 */
export function resolveLanguageModel(requested?: string): ResolvedLanguageModel {
  const env = getProviderEnv();
  const { provider, modelId } = parseModelRef(requested);

  if (env.hasGateway && provider === "gateway") {
    return gatewayModel(modelId || DEFAULT_GATEWAY_MODEL);
  }

  if (
    env.hasGateway &&
    !env.hasGroq &&
    !env.hasGoogle &&
    !env.hasOpenAI &&
    !env.hasOllama
  ) {
    const raw = requested?.trim() ?? "";
    const id =
      raw.replace(/^gateway\//i, "").includes("/") ? raw.replace(/^gateway\//i, "") : DEFAULT_GATEWAY_MODEL;
    return gatewayModel(id);
  }

  const groq = env.hasGroq
    ? createGroq({ apiKey: process.env.GROQ_API_KEY })
    : null;
  const googleKey = getGoogleApiKey();
  const google =
    env.hasGoogle && googleKey
      ? createGoogleGenerativeAI({ apiKey: googleKey })
      : null;
  const openaiClient = env.hasOpenAI
    ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
  const ollamaBase = getOllamaBaseUrl();
  const ollamaClient =
    env.hasOllama && ollamaBase
      ? createOpenAI({
          baseURL: ollamaBase,
          apiKey: process.env.OLLAMA_API_KEY?.trim() || "ollama",
        })
      : null;

  function groqModel(id: string) {
    if (!groq) throw new Error("NO_GROQ");
    return groq(id || DEFAULT_GROQ_MODEL);
  }
  function googleModel(id: string) {
    if (!google) throw new Error("NO_GOOGLE");
    return google(id || DEFAULT_GOOGLE_MODEL);
  }
  function openaiModel(id: string) {
    if (!openaiClient) throw new Error("NO_OPENAI");
    return openaiClient(id || DEFAULT_OPENAI_MODEL);
  }
  function ollamaModel(id: string) {
    if (!ollamaClient) throw new Error("NO_OLLAMA");
    return ollamaClient(id || DEFAULT_OLLAMA_MODEL);
  }

  function build(
    p: "groq" | "google" | "openai" | "ollama",
    id: string,
  ): LanguageModel | null {
    if (p === "groq" && groq) return groqModel(id);
    if (p === "google" && google) return googleModel(id);
    if (p === "openai" && openaiClient) return openaiModel(id);
    if (p === "ollama" && ollamaClient) return ollamaModel(id);
    return null;
  }

  /** Next provider when the primary (cloud or local) fails — Ollama is last for cloud primaries. */
  function pickFallback(
    used: "groq" | "google" | "openai" | "ollama",
  ): { model: LanguageModel; label: string } | undefined {
    const c: { model: LanguageModel; label: string }[] = [];
    if (used === "groq") {
      if (google)
        c.push({
          model: googleModel(DEFAULT_GOOGLE_MODEL),
          label: `google:${DEFAULT_GOOGLE_MODEL}`,
        });
      if (openaiClient)
        c.push({
          model: openaiModel(DEFAULT_OPENAI_MODEL),
          label: `openai:${DEFAULT_OPENAI_MODEL}`,
        });
    } else if (used === "google") {
      if (openaiClient)
        c.push({
          model: openaiModel(DEFAULT_OPENAI_MODEL),
          label: `openai:${DEFAULT_OPENAI_MODEL}`,
        });
      if (groq)
        c.push({
          model: groqModel(DEFAULT_GROQ_MODEL),
          label: `groq:${DEFAULT_GROQ_MODEL}`,
        });
    } else if (used === "openai") {
      if (groq)
        c.push({
          model: groqModel(DEFAULT_GROQ_MODEL),
          label: `groq:${DEFAULT_GROQ_MODEL}`,
        });
      if (google)
        c.push({
          model: googleModel(DEFAULT_GOOGLE_MODEL),
          label: `google:${DEFAULT_GOOGLE_MODEL}`,
        });
    } else if (used === "ollama") {
      if (google)
        c.push({
          model: googleModel(DEFAULT_GOOGLE_MODEL),
          label: `google:${DEFAULT_GOOGLE_MODEL}`,
        });
      if (groq)
        c.push({
          model: groqModel(DEFAULT_GROQ_MODEL),
          label: `groq:${DEFAULT_GROQ_MODEL}`,
        });
      if (openaiClient)
        c.push({
          model: openaiModel(DEFAULT_OPENAI_MODEL),
          label: `openai:${DEFAULT_OPENAI_MODEL}`,
        });
    }
    if (used !== "ollama" && ollamaClient) {
      c.push({
        model: ollamaModel(DEFAULT_OLLAMA_MODEL),
        label: `ollama:${DEFAULT_OLLAMA_MODEL}`,
      });
    }
    return c[0];
  }

  const fromRegistry = tryResolveRegistryLanguageModelId(requested);
  if (fromRegistry) {
    const model = aiRegistryConfig.registry.languageModel(
      fromRegistry.fullId as never,
    );
    const fbKey =
      fromRegistry.registryId === "gemini"
        ? ("google" as const)
        : fromRegistry.registryId === "groq"
          ? ("groq" as const)
          : ("openai" as const);
    const fb = pickFallback(fbKey);
    return {
      model,
      providerLabel: fromRegistry.fullId,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }

  if (provider === "ollama") {
    if (!ollamaClient) throw new Error("NO_PROVIDER");
    const id = modelId || DEFAULT_OLLAMA_MODEL;
    const fb = pickFallback("ollama");
    return {
      model: ollamaModel(id),
      providerLabel: `ollama:${id}`,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }

  if (provider !== "auto" && provider !== "gateway") {
    const primary = build(provider, modelId);
    if (primary) {
      const fb = pickFallback(provider);
      return {
        model: primary,
        providerLabel: `${provider}:${modelId || "default"}`,
        fallback: fb?.model,
        fallbackLabel: fb?.label,
      };
    }
  }

  const bare = modelId || "";
  if (google) {
    const id =
      provider === "auto"
        ? bare && bare.toLowerCase().includes("gemini")
          ? bare
          : DEFAULT_GOOGLE_MODEL
        : modelId || DEFAULT_GOOGLE_MODEL;
    const fb = pickFallback("google");
    return {
      model: googleModel(id),
      providerLabel: `google:${id}`,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }
  if (groq) {
    const id =
      provider === "auto" && bare && !bare.toLowerCase().includes("gemini")
        ? bare.includes("/")
          ? bare.split("/").pop()!
          : bare
        : DEFAULT_GROQ_MODEL;
    const fb = pickFallback("groq");
    return {
      model: groqModel(id),
      providerLabel: `groq:${id}`,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }
  if (openaiClient) {
    const id =
      provider === "auto"
        ? bare && bare.toLowerCase().startsWith("gpt")
          ? bare
          : DEFAULT_OPENAI_MODEL
        : modelId || DEFAULT_OPENAI_MODEL;
    const fb = pickFallback("openai");
    return {
      model: openaiModel(id),
      providerLabel: `openai:${id}`,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }

  if (ollamaClient) {
    const id =
      provider === "auto" && bare && !bare.toLowerCase().includes("gemini")
        ? bare.includes("/")
          ? bare.split("/").pop()!
          : bare
        : DEFAULT_OLLAMA_MODEL;
    const fb = pickFallback("ollama");
    return {
      model: ollamaModel(id),
      providerLabel: `ollama:${id}`,
      fallback: fb?.model,
      fallbackLabel: fb?.label,
    };
  }

  throw new Error("NO_PROVIDER");
}
