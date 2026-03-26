"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FlowDiagramReadonly } from "@/components/flow/flow-diagram";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function FlowDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, loading, error, refetch } = useStudioApi();
  const flow = data?.flows.find((f) => f.id === id);

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title={flow?.name ?? "Flow"}
        description={
          flow?.description ??
          "Linear steps and optional canvas layout. Execution still follows step order."
        }
        loading={loading}
        onRefresh={refetch}
      />
      {error && !loading ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && !flow ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            No flow with id <code className="text-xs">{id}</code>.
          </p>
          <Link
            href="/flows"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to flows
          </Link>
        </div>
      ) : null}
      {flow ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/flows/${encodeURIComponent(flow.id)}/edit`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Edit layout
            </Link>
            <Link
              href={`/run?flowId=${encodeURIComponent(flow.id)}`}
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              Open in Run
            </Link>
            <Link
              href="/flows"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              All flows
            </Link>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Diagram</h2>
            <p className="text-muted-foreground text-xs">
              Read-only view. Custom edges are shown when saved; otherwise a
              linear chain follows step order.
            </p>
            <FlowDiagramReadonly flow={flow} />
          </div>
        </>
      ) : null}
    </div>
  );
}
