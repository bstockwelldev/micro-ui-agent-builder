import { dynamicTool, type ToolSet } from "ai";
import { z } from "zod";

import type { StudioStore } from "@repo/shared";

function toolNameFromId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return safe || "tool";
}

export function buildToolSetFromStore(store: StudioStore): ToolSet {
  const tools: ToolSet = {};
  for (const def of store.tools) {
    const name = toolNameFromId(def.id);
    tools[name] = dynamicTool({
      description: `${def.description} (catalog id: ${def.id})`,
      inputSchema: z.record(z.unknown()),
      needsApproval: def.requiresApproval === true,
      execute: async (input) => ({
        toolId: def.id,
        input,
        finishedAt: new Date().toISOString(),
      }),
    });
  }
  return tools;
}
