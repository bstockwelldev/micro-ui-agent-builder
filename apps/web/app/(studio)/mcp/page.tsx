"use client";

import { StudioPage } from "@/components/studio/studio-page";
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
    <StudioPage>
      <StudioPageHeader
        title="MCP & connectors"
        description={
          <>
            Registered MCP servers.{" "}
            <code className="font-mono text-xs">POST /api/mcp/proxy</code> forwards JSON to{" "}
            <code className="font-mono text-xs">transport=http</code> URLs (JSON body{" "}
            <code className="font-mono text-xs">mcpServerId</code> +{" "}
            <code className="font-mono text-xs">request</code>).
          </>
        }
        loading={loading}
        onRefresh={refetch}
      />
      {error && !loading ? (
        <div
          className="glass-panel ring-destructive/30 space-y-2 rounded-lg p-4 ring-1"
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
          <ul className="grid gap-5 lg:grid-cols-2">
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
                    <p className="text-muted-foreground font-mono text-xs">
                      id: <span className="text-foreground">{s.id}</span>
                    </p>
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
    </StudioPage>
  );
}
