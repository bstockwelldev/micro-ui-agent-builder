"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { useState } from "react";
import type { FlowDocument } from "@repo/shared";

import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
        "border-outline-variant/40 bg-surface-container-low/30 text-muted-foreground hover:border-primary/45 hover:bg-surface-container-low/50 hover:text-foreground focus-visible:ring-ring flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      )}
      aria-label="Create new flow"
    >
      <span className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full">
        <span className="text-2xl font-light leading-none">+</span>
      </span>
      <span className="text-foreground text-sm font-semibold">New flow</span>
      <span className="max-w-[14rem] text-xs">
        Add a flow with a starter LLM step, then arrange steps on the canvas.
      </span>
    </button>
  );
}

export default function FlowsPage() {
  const router = useRouter();
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const flows = data?.flows ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FlowDocument | null>(null);

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
    router.push(`/flows/${encodeURIComponent(id)}`);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore(storeAfterFlowRemoved(data, deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="Flows"
        description="Linear flow documents drive system context and model selection for Run."
        loading={loading}
        onRefresh={refetch}
      />
      <div className="flex flex-wrap items-center gap-3">
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
          className="bg-surface-container-low/50 ghost-border flex max-w-xl flex-1 flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground"
          role="status"
          aria-label="Search and filters for flows are not available yet"
        >
          <span>Search flows…</span>
          <Badge variant="outline" className="ml-auto text-[10px] tracking-wide uppercase">
            Soon
          </Badge>
        </div>
      </div>
      {saveError ? (
        <div
          className="glass-panel ring-destructive/30 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{saveError}</p>
          <Button type="button" size="sm" variant="outline" onClick={clearSaveError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {error && !loading ? (
        <div
          className="glass-panel ring-destructive/30 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !error ? (
        <>
          <ul className="grid gap-5 sm:grid-cols-2">
            {flows.map((flow) => (
              <li key={flow.id}>
                <Card
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${flow.name} in editor`}
                  className={cn(
                    "ring-outline-variant/20 cursor-pointer transition-[box-shadow,ring-color] hover:ring-primary/30 focus-visible:ring-primary/50 border-outline-variant/25 border focus-visible:ring-2 focus-visible:outline-none",
                  )}
                  onClick={() => {
                    router.push(`/flows/${encodeURIComponent(flow.id)}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/flows/${encodeURIComponent(flow.id)}`);
                    }
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{flow.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {flow.description ?? flow.id}
                    </CardDescription>
                    <p className="text-muted-foreground pt-1 text-[11px]">
                      Click card to edit · or use actions below
                    </p>
                  </CardHeader>
                  <CardContent
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Badge variant="secondary">{flow.steps.length} steps</Badge>
                    <Link
                      href={`/flows/${encodeURIComponent(flow.id)}/settings`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Settings
                    </Link>
                    <Link
                      href={`/run?flowId=${encodeURIComponent(flow.id)}`}
                      className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                    >
                      Open in Run
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={saving || !data}
                      onClick={() => {
                        clearSaveError();
                        setDeleteTarget(flow);
                      }}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
            <li>
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
            <p className="text-muted-foreground text-sm">
              No flows yet — use the dashed <strong>New flow</strong> card in the grid or the
              button above. If this looks wrong, check{" "}
              <code className="font-mono text-xs">/api/studio</code>.
            </p>
          ) : null}
        </>
      ) : null}

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
    </StudioPage>
  );
}
