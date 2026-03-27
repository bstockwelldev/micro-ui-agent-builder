import { dynamicTool, type ToolSet } from "ai";
import { z } from "zod";

import type { McpServerConfig } from "@repo/shared";

import { mcpCallTool, mcpListToolsHttp, type McpToolListItem } from "./mcp-jsonrpc-http";

function safeToolKeySegment(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return safe || "tool";
}

/** Canonical identity: serverId.remoteName — used in descriptions; SDK keys are sanitized. */
export function namespaceMcpToolIdentity(serverId: string, remoteName: string): string {
  return `${serverId}.${remoteName}`;
}

/**
 * Stable key for AI SDK ToolSet (alphanumeric + underscore). Uniquely identifies server + remote tool.
 */
export function namespaceMcpToolKey(serverId: string, remoteName: string): string {
  return `mcp_${safeToolKeySegment(serverId)}_${safeToolKeySegment(remoteName)}`;
}

function inputSchemaForMcpTool(_item: McpToolListItem): z.ZodTypeAny {
  // JSON Schema → full fidelity would need a converter; keep permissive for v1.
  return z.record(z.unknown());
}

/**
 * Builds dynamic tools for HTTP MCP servers. Unknown server ids or non-http transports are skipped (degraded).
 */
export async function buildMcpToolSetForServers(
  servers: McpServerConfig[],
  serverIds: string[],
): Promise<ToolSet> {
  const byId = new Map(servers.map((s) => [s.id, s]));
  const out: ToolSet = {};

  for (const sid of serverIds) {
    const server = byId.get(sid);
    if (!server) {
      console.warn(`[mcp-bridge] unknown MCP server id (not in store): ${sid}`);
      continue;
    }
    if (server.transport !== "http") {
      console.warn(
        `[mcp-bridge] skipping server ${sid}: transport=${server.transport} (only http supported in runtime)`,
      );
      continue;
    }

    let listed: McpToolListItem[];
    try {
      listed = await mcpListToolsHttp(server.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[mcp-bridge] tools/list failed for ${sid}: ${msg}`);
      continue;
    }

    for (const t of listed) {
      if (!t?.name?.trim()) continue;
      const key = namespaceMcpToolKey(sid, t.name);
      const identity = namespaceMcpToolIdentity(sid, t.name);
      out[key] = dynamicTool({
        description: `[${identity}] ${t.description ?? t.name}`,
        inputSchema: inputSchemaForMcpTool(t),
        execute: async (input) => {
          try {
            const result = await mcpCallTool(server.url, t.name, input);
            return {
              mcp: identity,
              result,
              finishedAt: new Date().toISOString(),
            };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return {
              mcp: identity,
              error: msg,
              finishedAt: new Date().toISOString(),
            };
          }
        },
      });
    }
  }

  return out;
}
