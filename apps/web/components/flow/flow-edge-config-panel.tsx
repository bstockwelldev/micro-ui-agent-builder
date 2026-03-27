"use client";

import type { Edge } from "@xyflow/react";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type FlowEdgeConfigPanelProps = {
  edge: Edge | null;
  sourceTitle: string;
  targetTitle: string;
  open: boolean;
  onClose: () => void;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
};

export function FlowEdgeConfigPanel({
  edge,
  sourceTitle,
  targetTitle,
  open,
  onClose,
  onLabelChange,
  onDelete,
}: FlowEdgeConfigPanelProps) {
  const [labelDraft, setLabelDraft] = useState("");

  useEffect(() => {
    const raw = edge?.label;
    setLabelDraft(typeof raw === "string" ? raw : "");
  }, [edge]);

  if (!open || !edge) return null;

  return (
    <aside
      className="border-outline-variant/15 bg-surface-container-low absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
      aria-label="Connection configuration"
    >
      <div className="border-outline-variant/10 border-b p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-bold tracking-tight">
            Connection
          </h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            aria-label="Close connection panel"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="text-secondary-foreground font-mono text-[10px]">
          EDGE_ID: {edge.id}
        </p>
      </div>

      <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
            From
          </p>
          <p className="text-foreground font-medium">{sourceTitle}</p>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
            To
          </p>
          <p className="text-foreground font-medium">{targetTitle}</p>
        </div>

        <label className="block">
          <span className="text-muted-foreground mb-2 block font-mono text-[10px] uppercase tracking-widest">
            Label (optional)
          </span>
          <input
            className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 font-mono text-xs outline-none"
            value={labelDraft}
            onChange={(e) => {
              const v = e.target.value;
              setLabelDraft(v);
              onLabelChange(v);
            }}
            placeholder="Shown on the edge"
            maxLength={160}
          />
        </label>

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Drag either end of the line to reconnect it to another step. Use
          Delete or Backspace to remove the selected connection.
        </p>

        <Button
          type="button"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-auto w-full gap-2"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Remove connection
        </Button>
      </div>
    </aside>
  );
}
