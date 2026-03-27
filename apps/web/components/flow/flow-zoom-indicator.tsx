"use client";

import { Panel, useViewport } from "@xyflow/react";

export function FlowZoomIndicator() {
  const { zoom } = useViewport();
  const pct = Math.round(zoom * 100);

  return (
    <Panel
      position="bottom-right"
      className="!m-0 pointer-events-none !mb-[max(5.5rem,env(safe-area-inset-bottom))] !mr-3 sm:!mb-24 sm:!mr-4"
    >
      <div
        className="border-outline-variant/20 bg-surface-container-high/90 text-muted-foreground rounded-lg border px-2 py-1 font-mono text-[10px] tabular-nums shadow-md backdrop-blur-sm"
        aria-live="polite"
        aria-label={`Canvas zoom ${pct} percent`}
      >
        {pct}%
      </div>
    </Panel>
  );
}
