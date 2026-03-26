import fs from "node:fs/promises";

import {
  parseStudioStore,
  type AgentProfile,
  type FlowDocument,
  type StudioStore,
} from "@repo/shared";

import { getDataDir, getStoreFilePath } from "./paths";
import { getSupabaseAdmin, isSupabaseStudioEnabled } from "./supabase-admin";

const AGENT_BUILDER_SCHEMA = "agent_builder";
const STUDIO_SNAPSHOTS_TABLE = "studio_snapshots";
const DEFAULT_SNAPSHOT_ID = "default";

export function seedStudioStore(): StudioStore {
  const now = new Date().toISOString();
  const demoFlow: FlowDocument = {
    id: "flow_demo",
    name: "Demo linear flow",
    description:
      "System prompt → user context → LLM with catalog tools (Gemini 2.5 Flash Lite default when a Google/Gemini key is set)",
    updatedAt: now,
    steps: [
      {
        id: "s0",
        type: "system",
        refId: "sys_studio",
        order: 0,
        position: { x: 0, y: 100 },
      },
      {
        id: "s1",
        type: "user",
        order: 1,
        content: "The user is testing flows in the Agent Builder studio.",
        position: { x: 240, y: 100 },
      },
      {
        id: "s2",
        type: "llm",
        order: 2,
        model: "gemini-2.5-flash-lite",
        position: { x: 480, y: 100 },
      },
    ],
    edges: [
      { id: "e_s0_s1", source: "s0", target: "s1" },
      { id: "e_s1_s2", source: "s1", target: "s2" },
    ],
  };
  return {
    flows: [demoFlow],
    prompts: [
      {
        id: "sys_studio",
        name: "Studio system",
        body: "You are a helpful assistant in the Agent Builder studio. Prefer concise answers. Use tools when they help.",
      },
    ],
    tools: [
      {
        id: "web_search",
        description:
          "Search the public web via DuckDuckGo instant answers (no API key). Returns snippets and related topics when available.",
        parametersJson:
          '{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"maxResults":{"type":"number","description":"Max results hint"}},"required":["query"]}',
        requiresApproval: false,
      },
      {
        id: "calculator",
        description:
          "Evaluate a safe arithmetic expression (+ − × ÷, parentheses, unary +/−).",
        parametersJson:
          '{"type":"object","properties":{"expression":{"type":"string","description":"Arithmetic expression e.g. (2+3)*4"}},"required":["expression"]}',
        requiresApproval: false,
      },
      {
        id: "echo",
        description: "Echo the provided payload for testing tool wiring.",
        parametersJson: "{}",
        requiresApproval: false,
      },
      {
        id: "destructive_demo",
        description:
          "Simulated sensitive action. In the prototype this requires human approval before execution.",
        parametersJson: "{}",
        requiresApproval: true,
      },
    ],
    mcpServers: [
      {
        id: "stub_local",
        name: "Local HTTP stub",
        url: "http://127.0.0.1:9999",
        transport: "http",
      },
      {
        id: "example_sse",
        name: "Example SSE (registry only)",
        url: "https://example.com/mcp",
        transport: "sse",
      },
    ],
    agents: [
      {
        id: "agent_demo",
        name: "Demo agent",
        description: "Points at the demo flow for quick testing in Run.",
        defaultFlowId: "flow_demo",
        systemInstructions:
          "You are the Studio demo agent: be concise, friendly, and explain tool usage when relevant.",
        optionalElements: ["Catalog tools enabled", "GenUI tab available"],
      },
    ],
    llmProfiles: [
      {
        id: "llm_gemini_lite",
        name: "Gemini 2.5 Flash Lite",
        model: "gemini-2.5-flash-lite",
        description: "Default when a Google / Gemini provider key is configured.",
      },
    ],
    pausedRuns: {},
  };
}

async function readStudioStoreFromFile(): Promise<StudioStore> {
  const file = getStoreFilePath();
  try {
    const raw = await fs.readFile(file, "utf-8");
    return parseStudioStore(JSON.parse(raw));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const seed = seedStudioStore();
      try {
        await writeStudioStoreToFile(seed);
      } catch (persistErr) {
        console.error(
          "[studio-store] could not persist seed (read-only or quota); returning in-memory seed",
          persistErr,
        );
      }
      return seed;
    }
    throw e;
  }
}

async function writeStudioStoreToFile(store: StudioStore): Promise<void> {
  const file = getStoreFilePath();
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), "utf-8");
}

async function readStudioStoreFromSupabase(): Promise<StudioStore | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .schema(AGENT_BUILDER_SCHEMA)
    .from(STUDIO_SNAPSHOTS_TABLE)
    .select("payload")
    .eq("id", DEFAULT_SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.payload) {
    return null;
  }
  return parseStudioStore(data.payload);
}

async function writeStudioStoreToSupabase(store: StudioStore): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .schema(AGENT_BUILDER_SCHEMA)
    .from(STUDIO_SNAPSHOTS_TABLE)
    .upsert(
      {
        id: DEFAULT_SNAPSHOT_ID,
        payload: store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}

export async function readStudioStore(): Promise<StudioStore> {
  if (isSupabaseStudioEnabled()) {
    const fromDb = await readStudioStoreFromSupabase();
    if (fromDb) {
      return fromDb;
    }
    const seed = seedStudioStore();
    await writeStudioStoreToSupabase(seed);
    return seed;
  }
  return readStudioStoreFromFile();
}

export async function writeStudioStore(store: StudioStore): Promise<void> {
  if (isSupabaseStudioEnabled()) {
    await writeStudioStoreToSupabase(store);
    return;
  }
  await writeStudioStoreToFile(store);
}

export function getFlowById(
  store: StudioStore,
  flowId: string | undefined,
): FlowDocument | undefined {
  if (!flowId) return store.flows[0];
  return store.flows.find((f) => f.id === flowId);
}

export function getAgentById(
  store: StudioStore,
  agentId: string | undefined,
): AgentProfile | undefined {
  if (!agentId?.trim()) return undefined;
  return store.agents.find((a) => a.id === agentId);
}
