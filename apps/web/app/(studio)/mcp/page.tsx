"use client";

import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function McpPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const servers = data?.mcpServers ?? [];

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="MCP"
        description={
          <>
            Registered MCP servers.{" "}
            <code className="text-xs">POST /api/mcp/proxy</code> forwards JSON
            to <code className="text-xs">transport=http</code> URLs (JSON body{" "}
            <code className="text-xs">mcpServerId</code> +{" "}
            <code className="text-xs">request</code>).
          </>
        }
        loading={loading}
        onRefresh={refetch}
      />
      {error && !loading ? (
        <div
          className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !error ? (
        <>
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
          {servers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No MCP servers configured.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
