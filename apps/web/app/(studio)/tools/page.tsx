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

export default function ToolsPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const tools = data?.tools ?? [];

  return (
    <StudioPage>
      <StudioPageHeader
        title="Tool registry"
        description="Catalog definitions exposed to the agent. Approval-required tools show approve/deny in Run."
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
          <ul className="grid gap-5 md:grid-cols-2">
            {tools.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="font-mono text-base">{t.id}</CardTitle>
                      {t.requiresApproval ? (
                        <Badge variant="outline">Approval</Badge>
                      ) : null}
                    </div>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-surface-container-lowest/90 max-h-36 overflow-auto rounded-lg p-2 font-mono text-[11px] ring-1 ring-outline-variant/20">
                      {t.parametersJson}
                    </pre>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {tools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools configured.</p>
          ) : null}
        </>
      ) : null}
    </StudioPage>
  );
}
