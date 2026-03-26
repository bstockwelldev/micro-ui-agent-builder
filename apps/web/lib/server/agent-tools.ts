import { dynamicTool, type ToolSet } from "ai";
import { z } from "zod";

import type { StudioStore, ToolDefinition } from "@repo/shared";

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

function catalogMockTool(def: ToolDefinition) {
  return dynamicTool({
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

export function buildToolSetFromStore(store: StudioStore): ToolSet {
  const tools: ToolSet = {};
  for (const def of store.tools) {
    const name = toolNameFromId(def.id);
    const builtin = builtinToolForDefinition(def);
    tools[name] = builtin ?? catalogMockTool(def);
  }
  return tools;
}
