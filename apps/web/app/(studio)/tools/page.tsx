"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import type { ToolDefinition } from "@repo/shared";

import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { StudioResourceStatusBadge } from "@/components/studio/studio-resource-status-badge";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useStudioResourceStatus } from "@/hooks/use-studio-resource-status";
import { toolStatusById } from "@/lib/studio-resource-status-helpers";
import { cn } from "@/lib/utils";

function normalizeParametersJson(raw: string): string {
  const t = raw.trim();
  if (!t) return "{}";
  try {
    return JSON.stringify(JSON.parse(t));
  } catch {
    return t;
  }
}

export default function ToolsPage() {
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const {
    data: statusPayload,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useStudioResourceStatus();
  const tools = data?.tools ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ToolDefinition | null>(null);
  const [formId, setFormId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParametersJson, setFormParametersJson] = useState("{}");
  const [formRequiresApproval, setFormRequiresApproval] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ToolDefinition | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setFormId(`tool_${nanoid(8)}`);
    setFormDescription("");
    setFormParametersJson("{}");
    setFormRequiresApproval(false);
    setEditorOpen(true);
  }

  function openEdit(t: ToolDefinition) {
    clearSaveError();
    setEditing(t);
    setFormId(t.id);
    setFormDescription(t.description);
    setFormParametersJson(t.parametersJson || "{}");
    setFormRequiresApproval(Boolean(t.requiresApproval));
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!data || !formId.trim() || !formDescription.trim()) return;
    const row: ToolDefinition = {
      id: formId.trim(),
      description: formDescription.trim(),
      parametersJson: normalizeParametersJson(formParametersJson),
      requiresApproval: formRequiresApproval,
    };
    const next = editing
      ? data.tools.map((x) => (x.id === editing.id ? row : x))
      : data.tools.some((x) => x.id === row.id)
        ? data.tools.map((x) => (x.id === row.id ? row : x))
        : [...data.tools, row];
    await saveStore({ ...data, tools: next });
    setEditorOpen(false);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore({
      ...data,
      tools: data.tools.filter((t) => t.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="Tool registry"
        description="Catalog definitions exposed to the agent. Approval-required tools show approve/deny in Run."
        loading={loading}
        onRefresh={() => {
          void refetch();
          void refetchStatus();
        }}
      />
      {statusError ? (
        <p className="text-muted-foreground mb-3 text-xs" role="status">
          Resource status unavailable: {statusError}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="synth"
        className="mb-4"
        disabled={loading || !data || saving}
        onClick={openCreate}
      >
        New tool
      </Button>
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
          <ul className="grid gap-5 md:grid-cols-2">
            {tools.map((t) => {
              const st = toolStatusById(statusPayload, t.id);
              return (
              <li key={t.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="font-mono text-base">{t.id}</CardTitle>
                        {statusLoading ? (
                          <span className="text-muted-foreground text-[10px]">…</span>
                        ) : st ? (
                          <StudioResourceStatusBadge state={st.state} note={st.note} />
                        ) : null}
                        {t.requiresApproval ? (
                          <Badge variant="outline">Approval</Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving || !data}
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={saving || !data}
                          onClick={() => {
                            clearSaveError();
                            setDeleteTarget(t);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {t.description}
                      {st?.note ? (
                        <span className="text-muted-foreground mt-1 block font-mono text-[10px]">
                          {st.note}
                        </span>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-surface-container-lowest/90 max-h-36 overflow-auto rounded-lg p-2 font-mono text-[11px] ring-1 ring-outline-variant/20">
                      {t.parametersJson}
                    </pre>
                  </CardContent>
                </Card>
              </li>
            );
            })}
          </ul>
          {tools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools configured.</p>
          ) : null}
        </>
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tool" : "New tool"}</DialogTitle>
            <DialogDescription>
              Id matches the tool name in flow steps and the runtime catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tool-id">Id</Label>
              <Input
                id="tool-id"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={Boolean(editing)}
                className={cn("font-mono text-sm", editing && "opacity-80")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tool-desc">Description</Label>
              <Textarea
                id="tool-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tool-params">Parameters (JSON)</Label>
              <Textarea
                id="tool-params"
                value={formParametersJson}
                onChange={(e) => setFormParametersJson(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tool-approval"
                type="checkbox"
                checked={formRequiresApproval}
                onChange={(e) => setFormRequiresApproval(e.target.checked)}
                className="border-input size-4 rounded border"
              />
              <Label htmlFor="tool-approval" className="font-normal">
                Requires human approval in Run
              </Label>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="synth"
                disabled={!formId.trim() || !formDescription.trim() || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudioConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete tool"
        description={
          deleteTarget ? `Remove tool “${deleteTarget.id}”? Flow steps may reference it.` : ""
        }
        loading={saving}
        onConfirm={handleDelete}
      />
    </StudioPage>
  );
}
