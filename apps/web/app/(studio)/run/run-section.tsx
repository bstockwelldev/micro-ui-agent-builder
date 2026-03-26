"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RunChat } from "./run-chat";

export function RunSection() {
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flowId") ?? undefined;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {flowId ? (
          <>
            Active flow:{" "}
            <code className="text-foreground font-mono text-xs">{flowId}</code>
          </>
        ) : (
          <>
            No <code className="font-mono text-xs">flowId</code> in the URL — the server uses
            the default flow. Open a flow from{" "}
            <Link href="/flows" className="text-primary underline-offset-4 hover:underline">
              Flows
            </Link>{" "}
            to set one.
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
      <RunChat flowId={flowId} />
    </div>
  );
}
