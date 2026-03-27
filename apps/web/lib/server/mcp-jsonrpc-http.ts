/**
 * Minimal JSON-RPC 2.0 client for MCP over HTTP POST (stateless per request).
 * Compatible with many MCP HTTP deployments; servers that require session headers need follow-up work.
 */

const TIMEOUT_MS = 25_000;

export type McpToolListItem = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

function parseJsonRpcResult(text: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`MCP response not JSON: ${text.slice(0, 200)}`);
  }
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const o = parsed as Record<string, unknown>;
  if ("error" in o && o.error) {
    const err = o.error as { message?: string; code?: number };
    throw new Error(err.message ?? `MCP error ${String(err.code ?? "")}`);
  }
  if ("result" in o) return o.result;
  return parsed;
}

export async function mcpJsonRpc(
  url: string,
  method: string,
  params: Record<string, unknown> | undefined,
  id: number,
): Promise<unknown> {
  const body = {
    jsonrpc: "2.0",
    id,
    method,
    params: params ?? {},
  };
  const res = await fetch(url.trim(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9,*/*;q=0.8",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return parseJsonRpcResult(text);
}

export async function mcpNotify(url: string, method: string, params: Record<string, unknown> = {}) {
  const body = {
    jsonrpc: "2.0",
    method,
    params,
  };
  const res = await fetch(url.trim(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9,*/*;q=0.8",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MCP notify HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

/**
 * Initialize session, send initialized notification, return tools/list entries.
 */
export async function mcpListToolsHttp(baseUrl: string): Promise<McpToolListItem[]> {
  await mcpJsonRpc(
    baseUrl,
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "micro-ui-agent-builder", version: "0.1.0" },
    },
    1,
  );
  await mcpNotify(baseUrl, "notifications/initialized", {});
  const listResult = await mcpJsonRpc(baseUrl, "tools/list", {}, 2);
  const obj =
    typeof listResult === "object" && listResult !== null
      ? (listResult as { tools?: McpToolListItem[] })
      : {};
  return Array.isArray(obj.tools) ? obj.tools : [];
}

export async function mcpCallTool(
  baseUrl: string,
  name: string,
  args: unknown,
): Promise<unknown> {
  const result = await mcpJsonRpc(
    baseUrl,
    "tools/call",
    {
      name,
      arguments: args,
    },
    1,
  );
  return result;
}
