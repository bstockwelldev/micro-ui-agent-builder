"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { FlowEditor } from "@/components/flow/flow-editor";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function FlowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const openFlowSettingsFromQuery = searchParams.get("flowSettings") === "1";
  const { data, loading, error, refetch } = useStudioApi();
  const flow = data?.flows.find((f) => f.id === id);

  if (flow && data) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <FlowEditor
          flow={flow}
          store={data}
          openFlowSettingsFromQuery={openFlowSettingsFromQuery}
          onSaved={() => void refetch()}
          onRefresh={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title={flow ? flow.name : "Flow"}
        description="Visual diagram editor. Drag nodes, connect handles, and save via PUT /api/studio. The runner still executes steps in order."
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
    </StudioPage>
  );
}
