"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlowDocument } from "@repo/shared";

import { FlowLibraryCard } from "@/components/studio/flow-library-card";
import { FlowSettingsDialog } from "@/components/studio/flow-settings-dialog";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStudioApi } from "@/hooks/use-studio-api";
import { storeAfterFlowRemoved } from "@/lib/studio-mutations";
import { cn } from "@/lib/utils";

function NewFlowPlaceholderCard({
  disabled,
  onOpen,
}: {
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      className={cn(
        "border-outline-variant/40 bg-surface-container-low/30 text-muted-foreground hover:border-primary/45 hover:bg-surface-container-low/50 hover:text-foreground focus-visible:ring-ring flex min-h-[min(200px,32vh)] w-full min-w-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:min-h-[220px] sm:p-6",
      )}
      aria-label="Create new flow"
    >
      <span className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full">
        <span className="text-2xl font-light leading-none">+</span>
      </span>
      <span className="text-foreground text-sm font-semibold">New flow</span>
      <span className="max-w-56 text-xs">
        Add a flow with a starter LLM step, then arrange steps on the canvas.
      </span>
    </button>
  );
}

function flowWorkspaceHref(flowId: string, agentId: string | undefined) {
  const path = `/flows/${encodeURIComponent(flowId)}`;
  if (!agentId) return path;
  return `${path}?agentId=${encodeURIComponent(agentId)}`;
}

export default function FlowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const flows = useMemo(() => data?.flows ?? [], [data?.flows]);
  const agentId = searchParams.get("agentId") ?? undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FlowDocument | null>(null);
  const [settingsFlowId, setSettingsFlowId] = useState<string | null>(null);

  /** Legacy `/flows?flowId=…` → full canvas route */
  useEffect(() => {
    const fid = searchParams.get("flowId");
    if (!fid) return;
    router.replace(flowWorkspaceHref(fid, agentId));
  }, [router, searchParams, agentId]);

  const openFlow = useCallback(
    (flowId: string) => {
      router.push(flowWorkspaceHref(flowId, agentId));
    },
    [router, agentId],
  );

  async function handleCreate() {
    if (!data || !newName.trim()) return;
    const id = `flow_${nanoid(10)}`;
    const now = new Date().toISOString();
    const flow: FlowDocument = {
      id,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      updatedAt: now,
      steps: [
        {
          id: "s0",
          type: "llm",
          order: 0,
          model: "gemini-2.5-flash-lite",
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    };
    await saveStore({ ...data, flows: [...data.flows, flow] });
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    router.push(flowWorkspaceHref(id, agentId));
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore(storeAfterFlowRemoved(data, deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <StudioPage viewport>
      <StudioPageHeader
        className="shrink-0"
        title="Flows"
        description="Browse your flow library. Open a flow to use the full-screen canvas, validation, and runner."
        loading={loading}
        onRefresh={refetch}
      />
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <Button
          type="button"
          size="sm"
          variant="synth"
          disabled={loading || !data || saving}
          onClick={() => {
            clearSaveError();
            setCreateOpen(true);
          }}
        >
          New flow
        </Button>
        <div
          className="bg-surface-container-low/50 ghost-border flex min-w-0 max-w-xl flex-1 flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground sm:gap-3 sm:px-4 sm:py-3"
          role="status"
          aria-label="Search and filters for flows are not available yet"
        >
          <span className="min-w-0 truncate">Search flows…</span>
          <Badge variant="outline" className="ml-auto shrink-0 text-[10px] tracking-wide uppercase">
            Soon
          </Badge>
        </div>
      </div>
      {saveError ? (
        <div
          className="glass-panel ring-destructive/30 max-w-full shrink-0 space-y-2 overflow-hidden rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm break-words">{saveError}</p>
          <Button type="button" size="sm" variant="outline" onClick={clearSaveError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {error && !loading ? (
        <div
          className="glass-panel ring-destructive/30 max-w-full shrink-0 space-y-2 overflow-hidden rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm break-words">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!loading && !error ? (
          <div
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]"
            role="region"
            aria-label="Flow library"
          >
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
              {flows.map((flow) => (
                <li key={flow.id} className="min-w-0">
                  <FlowLibraryCard
                    flow={flow}
                    disabled={saving || !data}
                    onOpenFlow={openFlow}
                    onDelete={(target) => {
                      clearSaveError();
                      setDeleteTarget(target);
                    }}
                    onOpenFlowSettings={(fid) => {
                      clearSaveError();
                      setSettingsFlowId(fid);
                    }}
                    editHref={`/flows/${encodeURIComponent(flow.id)}`}
                  />
                </li>
              ))}
              <li className="min-w-0">
                <NewFlowPlaceholderCard
                  disabled={loading || !data || saving}
                  onOpen={() => {
                    clearSaveError();
                    setCreateOpen(true);
                  }}
                />
              </li>
            </ul>
            {flows.length === 0 ? (
              <p className="text-muted-foreground mt-4 max-w-full text-sm break-words">
                No flows yet — use the dashed <strong>New flow</strong> card in the grid or the
                button above. If this looks wrong, check{" "}
                <code className="font-mono text-xs break-all">/api/studio</code>.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New flow</DialogTitle>
            <DialogDescription>
              Starts with a single LLM step. You will open in the visual editor to arrange steps
              and connections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="flow-name">Name</Label>
              <Input
                id="flow-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Support triage"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flow-desc">Description (optional)</Label>
              <Textarea
                id="flow-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="What this flow is for…"
              />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="synth"
                disabled={!newName.trim() || saving}
                onClick={() => void handleCreate()}
              >
                {saving ? "Saving…" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudioConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete flow"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” (${deleteTarget.id})? Agents that used this flow as default will have that link cleared.`
            : ""
        }
        confirmLabel="Delete flow"
        loading={saving}
        onConfirm={handleDelete}
      />

      {settingsFlowId ? (
        <FlowSettingsDialog
          flowId={settingsFlowId}
          open={settingsFlowId !== null}
          onOpenChange={(o) => {
            if (!o) setSettingsFlowId(null);
          }}
          onFlowDeleted={() => {
            setSettingsFlowId(null);
          }}
        />
      ) : null}
    </StudioPage>
  );
}
