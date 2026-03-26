"use client";

import Link from "next/link";

import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStudioApi } from "@/hooks/use-studio-api";
import { cn } from "@/lib/utils";

export default function FlowsPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const flows = data?.flows ?? [];

  return (
    <StudioPage>
      <StudioPageHeader
        title="Flows"
        description="Linear flow documents drive system context and model selection for Run."
        loading={loading}
        onRefresh={refetch}
      />
      <div
        className="bg-surface-container-low/50 ghost-border flex max-w-xl flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground"
        role="status"
        aria-label="Search and filters for flows are not available yet"
      >
        <span>Search flows…</span>
        <Badge variant="outline" className="ml-auto text-[10px] tracking-wide uppercase">
          Soon
        </Badge>
      </div>
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
          <ul className="grid gap-5 sm:grid-cols-2">
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
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Diagram
                    </Link>
                    <Link
                      href={`/flows/${encodeURIComponent(flow.id)}/edit`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Edit layout
                    </Link>
                    <Link
                      href={`/run?flowId=${encodeURIComponent(flow.id)}`}
                      className={cn(buttonVariants({ variant: "synth", size: "sm" }))}
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
              No flows in the store. The server seeds a demo flow on first successful read;
              if this stays empty, check deployment logs for{" "}
              <code className="font-mono text-xs">/api/studio</code> errors.
            </p>
          ) : null}
        </>
      ) : null}
    </StudioPage>
  );
}
