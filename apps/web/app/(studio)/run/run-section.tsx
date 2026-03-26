"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { FlowDiagramReadonly } from "@/components/flow/flow-diagram";
import { FlowQuickSwitch } from "@/components/studio/flow-quick-switch";
import { useStudioApi } from "@/hooks/use-studio-api";

import { RunChat } from "./run-chat";

export function RunSection() {
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flowId") ?? undefined;
  const agentId = searchParams.get("agentId") ?? undefined;
  const { data, loading, error } = useStudioApi();

  const flowOptions = useMemo(
    () => (data?.flows ?? []).map((f) => ({ id: f.id, name: f.name })),
    [data?.flows],
  );

  const selectedFlow = useMemo(
    () =>
      flowId && data?.flows
        ? data.flows.find((f) => f.id === flowId)
        : undefined,
    [flowId, data?.flows],
  );

  const selectedAgent = useMemo(
    () =>
      agentId && data?.agents
        ? data.agents.find((a) => a.id === agentId)
        : undefined,
    [agentId, data?.agents],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm">
            {flowId ? (
              <>
                Active flow:{" "}
                <code className="text-foreground font-mono text-xs">{flowId}</code>
              </>
            ) : (
              <>
                No <code className="font-mono text-xs">flowId</code> in the URL — the server
                uses the default flow. Pick a flow below or open one from{" "}
                <Link href="/flows" className="text-primary underline-offset-4 hover:underline">
                  Flows
                </Link>
                .
              </>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            Past runs appear in{" "}
            <Link href="/history" className="text-primary underline-offset-4 hover:underline">
              History
            </Link>
            ; open a row for the full trace.
          </p>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-xs">Loading flows…</p>
        ) : error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : (
          <FlowQuickSwitch
            mode="run"
            flows={flowOptions}
            currentFlowId={flowId ?? ""}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Link
          href={flowId ? `/flows/${encodeURIComponent(flowId)}` : "/flows"}
          className="text-primary underline-offset-4 hover:underline"
        >
          {flowId ? "Edit this flow in the canvas" : "Browse flows"}
        </Link>
      </div>
      {flowId && !loading && !error ? (
        selectedFlow ? (
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Flow diagram</h2>
            <p className="text-muted-foreground text-xs">
              Read-only view of the selected flow (same graph as the editor).
            </p>
            <FlowDiagramReadonly flow={selectedFlow} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm" role="status">
            No flow named in the store for this <code className="font-mono text-xs">flowId</code>.
          </p>
        )
      ) : null}
      <RunChat flowId={flowId} />
    </div>
  );
}
