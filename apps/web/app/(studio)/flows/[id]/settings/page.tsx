"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FlowDiagramReadonly } from "@/components/flow/flow-diagram";
import { FlowKnowledgePanel } from "@/components/studio/flow-knowledge-panel";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStudioApi } from "@/hooks/use-studio-api";
import { storeAfterFlowRemoved } from "@/lib/studio-mutations";
import { cn } from "@/lib/utils";

export default function FlowSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const flow = data?.flows.find((f) => f.id === id);

  const [metaName, setMetaName] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [kbEnabled, setKbEnabled] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (flow) {
      setMetaName(flow.name);
      setMetaDesc(flow.description ?? "");
      setKbEnabled(flow.knowledgeBaseEnabled === true);
    } else {
      setDeleteOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, flow?.id, flow?.name, flow?.description, flow?.knowledgeBaseEnabled]);

  async function saveMetadata() {
    if (!data || !flow || !metaName.trim()) return;
    const updated = {
      ...flow,
      name: metaName.trim(),
      description: metaDesc.trim() || undefined,
      knowledgeBaseEnabled: kbEnabled,
      updatedAt: new Date().toISOString(),
    };
    clearSaveError();
    await saveStore({
      ...data,
      flows: data.flows.map((f) => (f.id === flow.id ? updated : f)),
    });
  }

  async function confirmDelete() {
    if (!data || !flow) return;
    clearSaveError();
    await saveStore(storeAfterFlowRemoved(data, flow.id));
    setDeleteOpen(false);
    router.push("/flows");
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title={flow?.name ?? "Flow"}
        description={
          flow?.description ??
          "Name, description, and read-only diagram preview. Edit the canvas on the main flow page."
        }
        loading={loading}
        onRefresh={refetch}
      />
      {saveError ? (
        <div
          className="glass-panel ring-destructive/30 mb-4 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{saveError}</p>
          <Button type="button" size="sm" variant="outline" onClick={clearSaveError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {error && !loading ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && !flow ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            No flow with id <code className="font-mono text-xs">{id}</code>.
          </p>
          <Link
            href="/flows"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to flows
          </Link>
        </div>
      ) : null}
      {flow ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/flows/${encodeURIComponent(flow.id)}`}
              className={cn(buttonVariants({ size: "sm", variant: "synth" }))}
            >
              Open editor
            </Link>
            <Link
              href={`/run?flowId=${encodeURIComponent(flow.id)}`}
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              Open in Run
            </Link>
            <Link
              href="/flows"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              All flows
            </Link>
          </div>
          <div className="bg-surface-container-low/50 ring-outline-variant/20 mt-6 space-y-4 rounded-lg p-4 ring-1">
            <h2 className="text-sm font-medium">Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="flow-meta-name">Name</Label>
                <Input
                  id="flow-meta-name"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="flow-meta-desc">Description</Label>
                <Textarea
                  id="flow-meta-desc"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="flow-kb-enabled"
                checked={kbEnabled}
                onChange={(e) => setKbEnabled(e.target.checked)}
                disabled={saving}
                className="mt-1 size-4 shrink-0 rounded border-input"
                aria-describedby="flow-kb-hint"
              />
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="flow-kb-enabled" className="text-sm font-normal">
                  Use knowledge base when running this flow
                </Label>
                <p id="flow-kb-hint" className="text-muted-foreground text-xs">
                  After upload, Run and GenUI retrieve matching chunks and append them to the model
                  system prompt (after preflight).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="synth"
                disabled={saving || !metaName.trim()}
                onClick={() => void saveMetadata()}
              >
                {saving ? "Saving…" : "Save details"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                disabled={saving}
                onClick={() => {
                  clearSaveError();
                  setDeleteOpen(true);
                }}
              >
                Delete flow
              </Button>
            </div>
          </div>
          <FlowKnowledgePanel flowId={flow.id} />
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Diagram preview</h2>
            <p className="text-muted-foreground text-xs">
              Read-only. Custom edges are shown when saved; otherwise a linear chain follows step
              order.
            </p>
            <FlowDiagramReadonly flow={flow} />
          </div>
        </>
      ) : null}

      {flow ? (
        <StudioConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete flow"
          description={`Remove “${flow.name}”? Agent default links to this flow will be cleared.`}
          confirmLabel="Delete flow"
          loading={saving}
          onConfirm={confirmDelete}
        />
      ) : null}
    </StudioPage>
  );
}
