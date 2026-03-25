"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RunChat } from "./run-chat";

export function RunSection() {
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flowId") ?? undefined;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {flowId ? (
          <>
            Active flow:{" "}
            <code className="text-foreground text-xs">{flowId}</code>
          </>
        ) : (
          <>
            No <code className="text-xs">flowId</code> in the URL — the server
            uses the default flow. Open a flow from{" "}
            <Link href="/flows" className="text-primary underline-offset-4 hover:underline">
              Flows
            </Link>{" "}
            to set one.
          </>
        )}
      </p>
      <RunChat flowId={flowId} />
    </div>
  );
}
