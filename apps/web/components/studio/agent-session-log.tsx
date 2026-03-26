"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type AgentSessionLogEntry = {
  at: string;
  kind: "status" | "error" | "info" | "genui";
  message: string;
  detail?: unknown;
};

type AgentSessionLogProps = {
  entries: AgentSessionLogEntry[];
  /** Merged into export JSON (e.g. full `messages`, GenUI state). */
  snapshot?: Record<string, unknown>;
  flowId: string | undefined;
  onClear: () => void;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hasExportableContent(
  entries: AgentSessionLogEntry[],
  snapshot: Record<string, unknown> | undefined,
) {
  if (entries.length > 0) return true;
  if (!snapshot) return false;
  for (const v of Object.values(snapshot)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
      continue;
    return true;
  }
  return false;
}

export function AgentSessionLog({
  entries,
  snapshot,
  flowId,
  onClear,
}: AgentSessionLogProps) {
  const [copied, setCopied] = useState(false);

  const exportPayload = useMemo(
    () => ({
      exportedAt: new Date().toISOString(),
      flowId: flowId ?? null,
      entryCount: entries.length,
      entries,
      snapshot: snapshot ?? {},
    }),
    [entries, flowId, snapshot],
  );

  const textPreview = useMemo(
    () => JSON.stringify(exportPayload, null, 2),
    [exportPayload],
  );

  const canExport = hasExportableContent(entries, snapshot);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textPreview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [textPreview]);

  return (
    <div className="border-border bg-surface-container-low/30 space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Session log</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copy()}
            disabled={!canExport}
          >
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const stamp = new Date().toISOString().replace(/[:.]/g, "-");
              downloadJson(`agent-session-${stamp}.json`, exportPayload);
            }}
            disabled={!canExport}
          >
            Download JSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={entries.length === 0}
          >
            Clear events
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Event timeline plus a live snapshot (messages, errors, GenUI). May include
        sensitive content — handle exports carefully.
      </p>
      <ScrollArea className="bg-surface-container-lowest/50 h-[min(200px,28vh)] rounded-md border p-2 font-mono text-[11px] leading-relaxed">
        {!canExport ? (
          <p className="text-muted-foreground p-2">
            No events or chat data yet this session.
          </p>
        ) : (
          <pre className="whitespace-pre-wrap break-words">{textPreview}</pre>
        )}
      </ScrollArea>
    </div>
  );
}
