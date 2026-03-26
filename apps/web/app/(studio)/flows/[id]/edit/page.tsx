"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FlowEditor } from "@/components/flow/flow-editor";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function FlowEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, loading, error, refetch } = useStudioApi();
  const flow = data?.flows.find((f) => f.id === id);

  return (
    <StudioPage>
      <StudioPageHeader
        title={flow ? `Edit: ${flow.name}` : "Edit flow"}
        description="Drag nodes and connect handles. Saving updates positions and edges via PUT /api/studio. The runner still executes steps in order."
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
            No flow with id <code className="font-mono text-xs">{id}</code>.
          </p>
          <Link
            href="/flows"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to flows
          </Link>
        </div>
      ) : null}
      {flow && data ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/flows/${encodeURIComponent(flow.id)}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              View diagram
            </Link>
            <Link
              href="/flows"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              All flows
            </Link>
          </div>
          <FlowEditor flow={flow} store={data} onSaved={() => void refetch()} />
        </>
      ) : null}
    </StudioPage>
  );
}
