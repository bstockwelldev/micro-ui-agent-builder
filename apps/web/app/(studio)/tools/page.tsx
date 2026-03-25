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

export default function ToolsPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const tools = data?.tools ?? [];

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Tools"
        description="Catalog definitions exposed to the agent. Approval-required tools show approve/deny in Run."
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
          <ul className="grid gap-4 md:grid-cols-2">
            {tools.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{t.id}</CardTitle>
                      {t.requiresApproval ? (
                        <Badge variant="outline">Approval</Badge>
                      ) : null}
                    </div>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted/40 max-h-36 overflow-auto rounded-md p-2 text-[11px]">
                      {t.parametersJson}
                    </pre>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {tools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools in catalog.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
