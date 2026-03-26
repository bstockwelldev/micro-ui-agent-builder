import { NextResponse } from "next/server";

import { readStudioStore } from "@/lib/server/studio-store";

type ProxyBody = {
  mcpServerId?: string;
  /** JSON-RPC or other JSON payload forwarded to the MCP HTTP endpoint */
  request?: unknown;
};

export async function POST(req: Request) {
  let body: ProxyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mcpServerId = body.mcpServerId?.trim();
  if (!mcpServerId) {
    return NextResponse.json(
      { error: "Expected mcpServerId" },
      { status: 400 },
    );
  }
  if (body.request === undefined) {
    return NextResponse.json(
      { error: "Expected request payload to forward" },
      { status: 400 },
    );
  }

  const store = await readStudioStore();
  const server = store.mcpServers.find((s) => s.id === mcpServerId);
  if (!server) {
    return NextResponse.json(
      { error: `Unknown MCP server: ${mcpServerId}` },
      { status: 404 },
    );
  }

  if (server.transport !== "http") {
    return NextResponse.json(
      {
        error:
          "This proxy only supports transport=http. Use a native MCP client for SSE or stdio.",
      },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  const url = server.url.trim();
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain;q=0.9,*/*;q=0.8",
      },
      body: JSON.stringify(body.request),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { raw: text };
    }

    console.log(
      JSON.stringify({
        event: "mcp_proxy_finish",
        mcpServerId,
        url,
        status: upstream.status,
        durationMs: Date.now() - t0,
      }),
    );

    return NextResponse.json(
      {
        status: upstream.status,
        body: parsed,
      },
      { status: upstream.ok ? 200 : upstream.status },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    console.log(
      JSON.stringify({
        event: "mcp_proxy_error",
        mcpServerId,
        url,
        durationMs: Date.now() - t0,
        message,
      }),
    );
    return NextResponse.json(
      { error: "Upstream MCP request failed", detail: message },
      { status: 502 },
    );
  }
}
