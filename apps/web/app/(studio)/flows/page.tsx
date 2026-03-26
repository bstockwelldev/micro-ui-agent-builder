"use client";

import Link from "next/link";

import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function FlowsPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const flows = data?.flows ?? [];

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Flows"
        description="Linear flow documents drive system context and model selection for Run."
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
          <ul className="grid gap-4 sm:grid-cols-2">
            {flows.map((flow) => (
              <li key={flow.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{flow.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {flow.description ?? flow.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{flow.steps.length} steps</Badge>
                    <Link
                      href={`/flows/${encodeURIComponent(flow.id)}`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Diagram
                    </Link>
                    <Link
                      href={`/flows/${encodeURIComponent(flow.id)}/edit`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Edit layout
                    </Link>
                    <Link
                      href={`/run?flowId=${encodeURIComponent(flow.id)}`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Open in Run
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {flows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No flows in the store. The server seeds a demo flow on first successful
              read; if this stays empty, check deployment logs for{" "}
              <code className="text-xs">/api/studio</code> errors.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
