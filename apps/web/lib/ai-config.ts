/**
 * March 2026 free-tier LLM registry for the Vercel AI SDK.
 *
 * Install (pnpm): `pnpm add ai @ai-sdk/groq @ai-sdk/google @ai-sdk/mistral @ai-sdk/togetherai @openrouter/ai-sdk-provider`
 * Note: Together’s package is `@ai-sdk/togetherai` (there is no `@ai-sdk/together` on npm).
 *
 * Usage:
 * ```ts
 * import { createProviderRegistry } from "ai";
 * import { config } from "@/lib/ai-config";
 * const registry = createProviderRegistry(config.providers);
 * const model = registry.languageModel("gemini:gemini-3.1-pro");
 * ```
 *
 * Set env in `.env.local` / Vercel. Providers without a non-empty API key are omitted from `config.providers`.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createProviderRegistry } from "ai";

export type ModelCapability =
  | "text"
  | "json"
  | "tools"
  | "vision"
  | "audio";

export type CatalogModel = {
  id: string;
  name: string;
  capabilities: ModelCapability[];
};

export type CatalogProvider = {
  /** npm package name for docs / tooling */
  package: string;
  apiKeyEnv: string;
  baseURL?: string;
  models: Record<string, CatalogModel>;
};

export const AI_PROVIDER_CATALOG = {
  groq: {
    package: "@ai-sdk/groq",
    apiKeyEnv: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    models: {
      "llama-3.3-70b-versatile": {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        capabilities: ["text", "json", "tools"],
      },
      "gemma2-27b-it": {
        id: "gemma2-27b-it",
        name: "Gemma 2 27B IT",
        capabilities: ["text", "json", "tools"],
      },
    },
  },
  gemini: {
    package: "@ai-sdk/google",
    apiKeyEnv: "GOOGLE_API_KEY",
    models: {
      "gemini-3.1-pro": {
        id: "gemini-3.1-pro",
        name: "Gemini 3.1 Pro",
        capabilities: ["text", "json", "tools", "vision", "audio"],
      },
      "gemini-2.5-flash": {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        capabilities: ["text", "json", "tools", "vision"],
      },
    },
  },
  openrouter: {
    package: "@openrouter/ai-sdk-provider",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    models: {
      "meta-llama/llama-3.3-70b-instruct:free": {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B Instruct (Free)",
        capabilities: ["text", "json", "tools"],
      },
      "qwen/qwen3-72b-instruct:free": {
        id: "qwen/qwen3-72b-instruct:free",
        name: "Qwen 3 72B Instruct (Free)",
        capabilities: ["text", "json", "tools"],
      },
    },
  },
  mistral: {
    package: "@ai-sdk/mistral",
    apiKeyEnv: "MISTRAL_API_KEY",
    baseURL: "https://api.mistral.ai/v1",
    models: {
      "mistral-large-3": {
        id: "mistral-large-3",
        name: "Mistral Large 3",
        capabilities: ["text", "json", "tools"],
      },
      "open-mistral-nemo": {
        id: "open-mistral-nemo",
        name: "Mistral Nemo",
        capabilities: ["text", "json", "tools"],
      },
    },
  },
  together: {
    package: "@ai-sdk/togetherai",
    apiKeyEnv: "TOGETHER_API_KEY",
    baseURL: "https://api.together.xyz/v1",
    models: {
      "meta-llama/Llama-3.3-70B-Instruct": {
        id: "meta-llama/Llama-3.3-70B-Instruct",
        name: "Llama 3.3 70B Instruct",
        capabilities: ["text", "json", "tools"],
      },
      "Qwen/Qwen3-72B-Instruct": {
        id: "Qwen/Qwen3-72B-Instruct",
        name: "Qwen 3 72B Instruct",
        capabilities: ["text", "json", "tools"],
      },
    },
  },
} as const satisfies Record<string, CatalogProvider>;

export type RegistryProviderId = keyof typeof AI_PROVIDER_CATALOG;

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** Google key for the `gemini` registry provider: explicit GOOGLE_API_KEY plus existing app aliases. */
function googleKeyForGemini(): string | undefined {
  return (
    trimEnv("GOOGLE_API_KEY") ||
    trimEnv("GOOGLE_GENERATIVE_AI_API_KEY") ||
    trimEnv("GEMINI_API_KEY") ||
    trimEnv("GOOGLE_GENAI_API_KEY") ||
    trimEnv("NEXT_PUBLIC_GEMINI_API_KEY")
  );
}

export type ProviderAvailability = {
  enabled: boolean;
  apiKeyEnv: string;
  package: string;
  reason?: string;
};

function buildProviderInstances(): Parameters<typeof createProviderRegistry>[0] {
  const out: Parameters<typeof createProviderRegistry>[0] = {};

  const groqKey = trimEnv("GROQ_API_KEY");
  if (groqKey) {
    out.groq = createGroq({
      apiKey: groqKey,
      baseURL: AI_PROVIDER_CATALOG.groq.baseURL,
    });
  }

  const gKey = googleKeyForGemini();
  if (gKey) {
    out.gemini = createGoogleGenerativeAI({ apiKey: gKey });
  }

  const orKey = trimEnv("OPENROUTER_API_KEY");
  if (orKey) {
    out.openrouter = createOpenRouter({
      apiKey: orKey,
      baseURL: AI_PROVIDER_CATALOG.openrouter.baseURL,
    });
  }

  const mistralKey = trimEnv("MISTRAL_API_KEY");
  if (mistralKey) {
    out.mistral = createMistral({
      apiKey: mistralKey,
      baseURL: AI_PROVIDER_CATALOG.mistral.baseURL,
    });
  }

  const togetherKey = trimEnv("TOGETHER_API_KEY");
  if (togetherKey) {
    out.together = createTogetherAI({
      apiKey: togetherKey,
      baseURL: AI_PROVIDER_CATALOG.together.baseURL,
    });
  }

  return out;
}

function buildProviderAvailability(): Record<RegistryProviderId, ProviderAvailability> {
  return {
    groq: {
      enabled: Boolean(trimEnv("GROQ_API_KEY")),
      apiKeyEnv: AI_PROVIDER_CATALOG.groq.apiKeyEnv,
      package: AI_PROVIDER_CATALOG.groq.package,
      reason: trimEnv("GROQ_API_KEY") ? undefined : "Set GROQ_API_KEY",
    },
    gemini: {
      enabled: Boolean(googleKeyForGemini()),
      apiKeyEnv: `${AI_PROVIDER_CATALOG.gemini.apiKeyEnv} (or GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, …)`,
      package: AI_PROVIDER_CATALOG.gemini.package,
      reason: googleKeyForGemini() ? undefined : "Set GOOGLE_API_KEY or GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY",
    },
    openrouter: {
      enabled: Boolean(trimEnv("OPENROUTER_API_KEY")),
      apiKeyEnv: AI_PROVIDER_CATALOG.openrouter.apiKeyEnv,
      package: AI_PROVIDER_CATALOG.openrouter.package,
      reason: trimEnv("OPENROUTER_API_KEY") ? undefined : "Set OPENROUTER_API_KEY",
    },
    mistral: {
      enabled: Boolean(trimEnv("MISTRAL_API_KEY")),
      apiKeyEnv: AI_PROVIDER_CATALOG.mistral.apiKeyEnv,
      package: AI_PROVIDER_CATALOG.mistral.package,
      reason: trimEnv("MISTRAL_API_KEY") ? undefined : "Set MISTRAL_API_KEY",
    },
    together: {
      enabled: Boolean(trimEnv("TOGETHER_API_KEY")),
      apiKeyEnv: AI_PROVIDER_CATALOG.together.apiKeyEnv,
      package: AI_PROVIDER_CATALOG.together.package,
      reason: trimEnv("TOGETHER_API_KEY") ? undefined : "Set TOGETHER_API_KEY",
    },
  };
}

const providers = buildProviderInstances();
const providerAvailability = buildProviderAvailability();

/**
 * Provider map for `createProviderRegistry(config.providers)`.
 * Only includes providers with a configured API key.
 */
const registry = createProviderRegistry(providers);

export const config = {
  /** Static catalog (models, env names, packages). Safe to import anywhere. */
  catalog: AI_PROVIDER_CATALOG,
  /** Enabled provider instances only — omitting keys without API keys. */
  providers,
  /** Per-provider enablement for UI / diagnostics. */
  providerAvailability,
  /**
   * Shared registry over `providers`. Use `registry.languageModel("gemini:gemini-2.5-flash")`.
   * Suffix after `:` is the catalog model **key** (e.g. `gemini-2.5-flash`); the provider receives `CatalogModel.id`.
   */
  registry,
} as const;

/** True if at least one catalog provider has a key and is registered. */
export function hasEnabledCatalogProvider(): boolean {
  return Object.keys(config.providers).length > 0;
}

/**
 * Resolve catalog model API id for a registry provider + user ref (catalog key or raw `CatalogModel.id`).
 */
export function resolveCatalogModelApiId(
  registryId: RegistryProviderId,
  modelRef: string,
): string | null {
  const row = AI_PROVIDER_CATALOG[registryId];
  if (!row) return null;
  const models = row.models as Record<string, CatalogModel>;
  const byKey = models[modelRef];
  if (byKey) return byKey.id;
  for (const m of Object.values(models)) {
    if (m.id === modelRef) return m.id;
  }
  return null;
}

/**
 * Parse `groq/llama-3.3-70b-versatile`, `gemini/gemini-2.5-flash`, `openrouter/...`, etc.
 * First path segment is the registry id (with `google` → `gemini`).
 */
export function parseRegistryModelRef(requested: string | undefined): {
  registryId: RegistryProviderId;
  modelRef: string;
} | null {
  const raw = requested?.trim() ?? "";
  const i = raw.indexOf("/");
  if (i <= 0) return null;
  const prefix = raw.slice(0, i).toLowerCase();
  const rest = raw.slice(i + 1).trim();
  if (!rest) return null;

  const map: Record<string, RegistryProviderId> = {
    groq: "groq",
    gemini: "gemini",
    google: "gemini",
    openrouter: "openrouter",
    mistral: "mistral",
    together: "together",
  };
  const registryId = map[prefix];
  if (!registryId) return null;
  return { registryId, modelRef: rest };
}

/**
 * Build the registry language model id (`provider:apiModelId`) if the provider is enabled and the model exists.
 */
export function tryResolveRegistryLanguageModelId(
  requested: string | undefined,
): { fullId: string; registryId: RegistryProviderId; apiModelId: string } | null {
  const parsed = parseRegistryModelRef(requested);
  if (!parsed) return null;
  if (!config.providers[parsed.registryId]) return null;
  const apiId = resolveCatalogModelApiId(parsed.registryId, parsed.modelRef);
  if (!apiId) return null;
  return {
    fullId: `${parsed.registryId}:${apiId}`,
    registryId: parsed.registryId,
    apiModelId: apiId,
  };
}
