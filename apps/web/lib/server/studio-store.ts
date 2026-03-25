import fs from "node:fs/promises";

import {
  parseStudioStore,
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
    description: "System prompt → user context → LLM with catalog tools",
    updatedAt: now,
    steps: [
      { id: "s0", type: "system", refId: "sys_studio", order: 0 },
      {
        id: "s1",
        type: "user",
        order: 1,
        content: "The user is testing flows in the Agent Builder studio.",
      },
      { id: "s2", type: "llm", order: 2, model: "gpt-4o-mini" },
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
        name: "Local stub",
        url: "http://127.0.0.1:9999",
        transport: "http",
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
