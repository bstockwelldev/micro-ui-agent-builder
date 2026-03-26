import type { StudioStore } from "@repo/shared";

import type { ResourceState, StudioResourceStatusPayload } from "@/lib/studio-resource-status-types";

import {
  BUILTIN_CALCULATOR_ID,
  BUILTIN_WEB_SEARCH_ID,
} from "./agent-tools";
import { getProviderEnv, parseModelRef } from "./language-model";

export type { ResourceState, StudioResourceStatusPayload } from "@/lib/studio-resource-status-types";

function toolCatalogState(toolId: string): { state: ResourceState; note?: string } {
  if (toolId === BUILTIN_WEB_SEARCH_ID) {
    return {
      state: "available",
      note: "DuckDuckGo instant answer (no API key)",
    };
  }
  if (toolId === BUILTIN_CALCULATOR_ID) {
    return { state: "available", note: "Safe arithmetic (+ − × ÷, parentheses)" };
  }
  return {
    state: "available",
    note: "Catalog mock (echo payload)",
  };
}

function llmProfileAvailability(
  model: string,
): { state: ResourceState; providerLabel: string } {
  const env = getProviderEnv();
  const { provider, modelId } = parseModelRef(model);

  const labelFor = (
    p: "groq" | "google" | "openai" | "gateway",
    id: string,
  ) => `${p}:${id || "default"}`;

  if (provider === "gateway") {
    const live = env.hasGateway;
    return {
      state: live ? "live" : "offline",
      providerLabel: labelFor("gateway", modelId),
    };
  }

  if (provider === "groq") {
    const live = env.hasGroq;
    return {
      state: live ? "live" : "offline",
      providerLabel: labelFor("groq", modelId),
    };
  }

  if (provider === "openai") {
    const live = env.hasOpenAI;
    return {
      state: live ? "live" : "offline",
      providerLabel: labelFor("openai", modelId),
    };
  }

  if (provider === "google") {
    const live = env.hasGoogle;
    return {
      state: live ? "live" : "offline",
      providerLabel: labelFor("google", modelId),
    };
  }

  // auto: same priority as resolveLanguageModel (Google first when configured)
  if (env.hasGoogle) {
    return { state: "live", providerLabel: "google:auto" };
  }
  if (env.hasGroq) {
    return { state: "live", providerLabel: "groq:auto" };
  }
  if (env.hasOpenAI) {
    return { state: "live", providerLabel: "openai:auto" };
  }
  if (env.hasGateway) {
    return { state: "live", providerLabel: "gateway:auto" };
  }
  return { state: "offline", providerLabel: "auto" };
}

async function probeHttpUrl(url: string): Promise<ResourceState> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (res.ok) return "live";
    if (res.status === 405 || res.status === 404 || res.status === 401) {
      return "live";
    }
    if (res.status >= 500) return "offline";
    return "unknown";
  } catch {
    return "offline";
  }
}

export async function buildStudioResourceStatus(
  store: StudioStore,
): Promise<StudioResourceStatusPayload> {
  const env = getProviderEnv();
  const generatedAt = new Date().toISOString();

  const providers: StudioResourceStatusPayload["providers"] = [
    {
      id: "google",
      label: "Google Gemini",
      state: env.hasGoogle ? "live" : "offline",
    },
    {
      id: "groq",
      label: "Groq",
      state: env.hasGroq ? "live" : "offline",
    },
    {
      id: "openai",
      label: "OpenAI",
      state: env.hasOpenAI ? "live" : "offline",
    },
    {
      id: "gateway",
      label: "Vercel AI Gateway",
      state: env.hasGateway ? "live" : "offline",
    },
  ];

  const tools = store.tools.map((t) => {
    const { state, note } = toolCatalogState(t.id);
    return { toolId: t.id, state, note };
  });

  const mcpServers = await Promise.all(
    store.mcpServers.map(async (s) => {
      if (s.transport !== "http") {
        return {
          serverId: s.id,
          state: "na" as const,
          note: "Studio proxy supports HTTP transport only",
        };
      }
      const reach = await probeHttpUrl(s.url);
      return {
        serverId: s.id,
        state: reach,
        note:
          reach === "live"
            ? "Endpoint responded (HEAD)"
            : reach === "offline"
              ? "Unreachable from server"
              : "Could not classify reachability",
      };
    }),
  );

  const llmProfiles = store.llmProfiles.map((p) => {
    const { state, providerLabel } = llmProfileAvailability(p.model);
    return {
      profileId: p.id,
      model: p.model,
      state,
      providerLabel,
    };
  });

  return {
    generatedAt,
    providers,
    tools,
    mcpServers,
    llmProfiles,
  };
}
