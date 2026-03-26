"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RunDetailPage() {
  const params = useParams();
  const runId = typeof params.runId === "string" ? params.runId : "";

  return (
    <StudioPage>
      <StudioPageHeader
        title={runId ? `Run ${runId}` : "Run detail"}
        description="Tool traces, approvals, token usage, and structured outputs. Populate from runner persistence or export logs."
      />
      <div className="flex flex-wrap gap-2">
        <Link href="/history" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to history
        </Link>
        <Link href="/run" className={cn(buttonVariants({ variant: "synth", size: "sm" }))}>
          Open Run
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-surface-container-high ring-outline-variant/20 space-y-2 rounded-lg p-4 ring-1 lg:col-span-2">
          <h2 className="text-sm font-medium">Timeline</h2>
          <p className="text-muted-foreground text-xs">
            Placeholder timeline. Map steps to <span className="font-mono">runId</span> events
            when available.
          </p>
          <pre className="bg-surface-container-lowest/80 mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-[11px] ring-1 ring-outline-variant/15">
            {`{\n  "runId": "${runId || "…"}",\n  "events": []\n}`}
          </pre>
        </div>
        <div className="bg-surface-container-low ring-outline-variant/20 space-y-3 rounded-lg p-4 ring-1">
          <h2 className="text-sm font-medium">Summary</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Latency —</Badge>
            <Badge variant="outline">Model —</Badge>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" disabled>
            Export trace (soon)
          </Button>
        </div>
      </div>
    </StudioPage>
  );
}
