"use client";

import type { ResourceState } from "@/lib/studio-resource-status-types";
import { cn } from "@/lib/utils";

const LABELS: Record<ResourceState, string> = {
  live: "Live",
  offline: "Offline",
  available: "Available",
  na: "N/A",
  unknown: "Unknown",
};

const DOT: Record<ResourceState, string> = {
  live: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  offline: "bg-rose-500/90",
  available: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.45)]",
  na: "bg-muted-foreground/50",
  unknown: "bg-amber-400/80",
};

type Props = {
  state: ResourceState;
  className?: string;
  note?: string;
  compact?: boolean;
};

export function StudioResourceStatusBadge({
  state,
  className,
  note,
  compact,
}: Props) {
  const label = LABELS[state];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-outline-variant/25 bg-surface-container-high/60 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-foreground/90",
        compact && "px-1.5 py-0",
        className,
      )}
      title={note}
      aria-label={note ? `${label}. ${note}` : label}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", DOT[state])}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
