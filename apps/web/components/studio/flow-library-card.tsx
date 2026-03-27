"use client";

import Link from "next/link";
import type { FlowDocument } from "@repo/shared";
import { Pencil, Settings2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FlowLibraryCardProps = {
  flow: FlowDocument;
  disabled?: boolean;
  onOpenFlow: (flowId: string) => void;
  onDelete: (flow: FlowDocument) => void;
  onOpenFlowSettings: (flowId: string) => void;
  editHref: string;
};

export function FlowLibraryCard({
  flow,
  disabled = false,
  onOpenFlow,
  onDelete,
  onOpenFlowSettings,
  editHref,
}: FlowLibraryCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${flow.name} in full-screen canvas`}
      className={cn(
        "border-outline-variant/25 ring-outline-variant/20 w-full min-w-0 cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/10 hover:ring-primary/40 focus-visible:ring-primary/60 focus-visible:ring-2 focus-visible:outline-none",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={() => onOpenFlow(flow.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenFlow(flow.id);
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{flow.name}</CardTitle>
        </div>
        <CardDescription className="line-clamp-2">
          {flow.description ?? flow.id}
        </CardDescription>
        <p className="text-muted-foreground pt-1 text-[11px]">
          Click to open the full-screen flow workspace (canvas, validation, and runner).
        </p>
      </CardHeader>
      <CardContent
        className="flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Badge variant="secondary">{flow.steps.length} steps</Badge>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          aria-label={`Open settings for ${flow.name}`}
          title="Settings"
          onClick={() => onOpenFlowSettings(flow.id)}
        >
          <Settings2 className="size-4" aria-hidden />
        </button>
        <Link
          href={editHref}
          className="text-primary inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-cyan-500/10"
          aria-label={`Open ${flow.name} on canvas`}
          title="Open canvas"
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          className="text-destructive inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => onDelete(flow)}
          aria-label={`Delete ${flow.name}`}
          title="Delete"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </CardContent>
    </Card>
  );
}
