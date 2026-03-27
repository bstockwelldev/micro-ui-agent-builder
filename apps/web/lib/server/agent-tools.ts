import { dynamicTool, type ToolSet } from "ai";
import { z } from "zod";

import type { FlowDocument, StudioStore, ToolDefinition } from "@repo/shared";

import { buildMcpToolSetForServers } from "./mcp-bridge";
import { fetchMcpServerIdsForFlowFromSupabase } from "./mcp-registry-supabase";
import { filterCatalogToolsByFlow } from "./flow-tool-allowlist";
import { evaluateArithmeticExpression } from "./safe-calculator";

/** Catalog ids with server-side implementations (match seed / docs). */
export const BUILTIN_WEB_SEARCH_ID = "web_search";
export const BUILTIN_CALCULATOR_ID = "calculator";

/** Tool ids that execute real logic vs mock echo in `buildToolSetFromStore`. */
export const BUILTIN_TOOL_IDS = [BUILTIN_WEB_SEARCH_ID, BUILTIN_CALCULATOR_ID] as const;

/** Safe tool name for AI SDK `ToolSet` keys (matches flow tool `refId` via `toolNameFromId`). */
export function toolNameFromId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return safe || "tool";
}

const webSearchInputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(10).optional(),
});

const calculatorInputSchema = z.object({
  expression: z.string().min(1),
});

async function duckDuckGoInstantAnswer(query: string, maxTopics: number) {
  const u = new URL("https://api.duckduckgo.com/");
  u.searchParams.set("q", query);
  u.searchParams.set("format", "json");
  u.searchParams.set("no_html", "1");
  u.searchParams.set("skip_disambig", "1");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "MicroUIAgentBuilder/1.0 (web_search tool)" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: { Text?: string }[];
    };
    const related = (data.RelatedTopics ?? [])
      .map((t) => t.Text)
      .filter((x): x is string => Boolean(x))
      .slice(0, maxTopics);
    return {
      source: "duckduckgo",
      heading: data.Heading ?? null,
      abstract: data.AbstractText ?? null,
      url: data.AbstractURL ?? null,
      relatedTopics: related,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Empty `{}` JSON schemas confuse some providers into malformed tool names (e.g. `echo:{}`). */
function catalogInputSchema(def: ToolDefinition) {
  const t = (def.parametersJson ?? "").trim();
  if (!t || t === "{}") {
    return z.object({
      message: z.string().optional().describe("Optional short text to echo or annotate"),
      payload: z.record(z.string(), z.unknown()).optional(),
    });
  }
  return z.record(z.unknown());
}

function catalogMockTool(def: ToolDefinition) {
  return dynamicTool({
    description: `${def.description} (catalog id: ${def.id})`,
    inputSchema: catalogInputSchema(def),
    needsApproval: def.requiresApproval === true,
    execute: async (input) => ({
      toolId: def.id,
      input,
      finishedAt: new Date().toISOString(),
    }),
  });
}

function builtinToolForDefinition(def: ToolDefinition): ReturnType<typeof dynamicTool> | null {
  if (def.id === BUILTIN_WEB_SEARCH_ID) {
    return dynamicTool({
      description: `${def.description} (catalog id: ${def.id}; DuckDuckGo instant answer API)`,
      inputSchema: webSearchInputSchema,
      needsApproval: def.requiresApproval === true,
      execute: async (input) => {
        const parsed = webSearchInputSchema.parse(input);
        const max = parsed.maxResults ?? 5;
        try {
          const result = await duckDuckGoInstantAnswer(parsed.query, max);
          return {
            toolId: def.id,
            query: parsed.query,
            ...result,
            finishedAt: new Date().toISOString(),
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Search failed";
          return {
            toolId: def.id,
            query: parsed.query,
            error: msg,
            finishedAt: new Date().toISOString(),
          };
        }
      },
    });
  }

  if (def.id === BUILTIN_CALCULATOR_ID) {
    return dynamicTool({
      description: `${def.description} (catalog id: ${def.id}; safe arithmetic)`,
      inputSchema: calculatorInputSchema,
      needsApproval: def.requiresApproval === true,
      execute: async (input) => {
        const parsed = calculatorInputSchema.parse(input);
        try {
          const result = evaluateArithmeticExpression(parsed.expression);
          return {
            toolId: def.id,
            expression: parsed.expression,
            result,
            finishedAt: new Date().toISOString(),
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Invalid expression";
          return {
            toolId: def.id,
            expression: parsed.expression,
            error: msg,
            finishedAt: new Date().toISOString(),
          };
        }
      },
    });
  }

  return null;
}

function buildCatalogToolSetFromDefinitions(defs: ToolDefinition[]): ToolSet {
  const tools: ToolSet = {};
  for (const def of defs) {
    const name = toolNameFromId(def.id);
    const builtin = builtinToolForDefinition(def);
    tools[name] = builtin ?? catalogMockTool(def);
  }
  return tools;
}

export function buildToolSetFromStore(store: StudioStore): ToolSet {
  return buildCatalogToolSetFromDefinitions(store.tools);
}

/**
 * Merges flow-scoped catalog tools + namespaced MCP tools (HTTP).
 * Set `MCP_TOOL_RESOLUTION_ENABLED=false` to skip remote MCP (catalog only).
 */
export async function resolveMcpServerIdsForFlow(
  flow: FlowDocument | undefined,
  flowId: string | undefined,
): Promise<string[]> {
  const ids = new Set<string>(flow?.mcpServerIds ?? []);
  if (flowId) {
    const fromDb = await fetchMcpServerIdsForFlowFromSupabase(flowId);
    for (const id of fromDb) ids.add(id);
  }
  return [...ids];
}

export async function buildToolSetForAgentRun(
  store: StudioStore,
  flow: FlowDocument | undefined,
  flowId: string | undefined,
): Promise<{ tools: ToolSet; appendix: string }> {
  const filtered = filterCatalogToolsByFlow(store.tools, flow);
  let merged: ToolSet = buildCatalogToolSetFromDefinitions(filtered);

  const mcpEnabled = process.env.MCP_TOOL_RESOLUTION_ENABLED !== "false";
  if (mcpEnabled && flow) {
    const serverIds = await resolveMcpServerIdsForFlow(flow, flowId);
    if (serverIds.length > 0) {
      const mcpTools = await buildMcpToolSetForServers(store.mcpServers, serverIds);
      merged = { ...merged, ...mcpTools };
    }
  }

  const names = Object.keys(merged);
  const appendix =
    names.length > 0
      ? `\n\n[Callable tools — call only these exact tool names: ${names.join(", ")}. Do not append JSON or colons to the name.]`
      : "";
  return { tools: merged, appendix };
}

/** Appended to system so models use SDK-registered names only (must match `buildToolSetFromStore` keys). */
export function buildToolCatalogAppendix(store: StudioStore): string {
  if (!store.tools.length) return "";
  const names = store.tools.map((t) => toolNameFromId(t.id));
  return `\n\n[Callable tools — call only these exact tool names: ${names.join(", ")}. Do not append JSON or colons to the name.]`;
}
