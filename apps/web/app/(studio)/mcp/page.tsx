"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { McpServerConfig } from "@repo/shared";

export default function McpPage() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/studio");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setServers(data.mcpServers ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load MCP config");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MCP</h1>
        <p className="text-muted-foreground text-sm">
          Registered MCP server endpoints (proxy is a stub —{" "}
          <code className="text-xs">POST /api/mcp/proxy</code> returns 501).
        </p>
      </div>
      <ul className="space-y-4">
        {servers.map((s) => (
          <li key={s.id}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Badge variant="secondary">{s.transport}</Badge>
                </div>
                <CardDescription className="font-mono text-xs break-all">
                  {s.url}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">id: {s.id}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {servers.length === 0 && (
        <p className="text-muted-foreground text-sm">No MCP servers configured.</p>
      )}
    </div>
  );
}
