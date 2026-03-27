"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { RefreshCw } from "lucide-react";

import { FlowKnowledgePanel } from "@/components/studio/flow-knowledge-panel";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStudioApi } from "@/hooks/use-studio-api";
import { storeAfterFlowRemoved } from "@/lib/studio-mutations";
import { cn } from "@/lib/utils";

export type FlowSettingsDialogProps = {
  flowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If set, called after delete instead of navigating to /flows. */
  onFlowDeleted?: () => void;
};

export function FlowSettingsDialog({
  flowId,
  open,
  onOpenChange,
  onFlowDeleted,
}: FlowSettingsDialogProps) {
  const router = useRouter();
  const idPrefix = useId();
  const nameId = `${idPrefix}-flow-meta-name`;
  const descId = `${idPrefix}-flow-meta-desc`;
  const kbId = `${idPrefix}-flow-kb-enabled`;

  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const flow = data?.flows.find((f) => f.id === flowId);

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
  }, [flowId, flow?.id, flow?.name, flow?.description, flow?.knowledgeBaseEnabled]);

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
    onOpenChange(false);
    if (onFlowDeleted) {
      onFlowDeleted();
    } else {
      router.push("/flows");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92vh,48rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <div className="border-outline-variant/20 flex shrink-0 items-start justify-between gap-3 border-b px-4 pt-4 pb-3">
            <DialogHeader className="min-w-0 flex-1 space-y-1 text-left">
              <DialogTitle className="pr-8 leading-tight">
                {flow?.name ?? "Flow settings"}
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                {flow?.description ??
                  "Name, description, knowledge base uploads, and deletion."}
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Refresh from server"
              aria-label="Refresh from server"
              disabled={loading}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {saveError ? (
              <div
                className="glass-panel ring-destructive/30 mb-4 space-y-2 rounded-lg p-3 ring-1"
                role="alert"
              >
                <p className="text-destructive text-sm">{saveError}</p>
                <Button type="button" size="sm" variant="outline" onClick={clearSaveError}>
                  Dismiss
                </Button>
              </div>
            ) : null}
            {error && !loading ? (
              <p className="text-destructive mb-3 text-sm" role="alert">
                {error}
              </p>
            ) : null}
            {!loading && !error && !flow ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  No flow with id <code className="font-mono text-xs">{flowId}</code>.
                </p>
                <Link href="/flows" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Back to flows
                </Link>
              </div>
            ) : null}
            {flow ? (
              <>
                <div className="flex flex-wrap gap-2 pb-4">
                  <Link
                    href={`/flows/${encodeURIComponent(flow.id)}`}
                    className={cn(buttonVariants({ size: "sm", variant: "synth" }))}
                  >
                    Open flow workspace
                  </Link>
                  <Link
                    href="/dashboard"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    Studio dashboard
                  </Link>
                </div>
                <div className="bg-surface-container-low/50 ring-outline-variant/20 space-y-4 rounded-lg p-4 ring-1">
                  <h2 className="text-sm font-medium">Details</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={nameId}>Name</Label>
                      <Input
                        id={nameId}
                        value={metaName}
                        onChange={(e) => setMetaName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={descId}>Description</Label>
                      <Textarea
                        id={descId}
                        value={metaDesc}
                        onChange={(e) => setMetaDesc(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pt-1">
                    <input
                      type="checkbox"
                      id={kbId}
                      checked={kbEnabled}
                      onChange={(e) => setKbEnabled(e.target.checked)}
                      disabled={saving}
                      className="mt-1 size-4 shrink-0 rounded border-input"
                      aria-describedby={`${kbId}-hint`}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={kbId} className="text-sm font-normal">
                        Use knowledge base when running this flow
                      </Label>
                      <p id={`${kbId}-hint`} className="text-muted-foreground text-xs">
                        After upload, Run and GenUI retrieve matching chunks and append them to
                        the model system prompt (after preflight).
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
                <div className="mt-4">
                  <FlowKnowledgePanel flowId={flow.id} />
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
