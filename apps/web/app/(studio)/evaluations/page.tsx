"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import type { LlmProfile } from "@repo/shared";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudioResourceStatusBadge } from "@/components/studio/studio-resource-status-badge";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useStudioResourceStatus } from "@/hooks/use-studio-resource-status";
import { llmProfileStatusById } from "@/lib/studio-resource-status-helpers";
import { cn } from "@/lib/utils";

const checks = [
  { name: "Prompt injection shield", coverage: "Flows + Run", state: "planned" as const },
  { name: "Tool approval audit", coverage: "Run", state: "live" as const },
  { name: "GenUI schema validation", coverage: "/api/agent/genui", state: "live" as const },
];

export default function EvaluationsPage() {
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const {
    data: statusPayload,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useStudioResourceStatus();
  const llmProfiles = data?.llmProfiles ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LlmProfile | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LlmProfile | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setFormId(`llm_${nanoid(8)}`);
    setFormName("");
    setFormModel("gemini-2.5-flash-lite");
    setFormDescription("");
    setEditorOpen(true);
  }

  function openEdit(p: LlmProfile) {
    clearSaveError();
    setEditing(p);
    setFormId(p.id);
    setFormName(p.name);
    setFormModel(p.model);
    setFormDescription(p.description ?? "");
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!data || !formId.trim() || !formName.trim() || !formModel.trim()) return;
    const row: LlmProfile = {
      id: formId.trim(),
      name: formName.trim(),
      model: formModel.trim(),
      description: formDescription.trim() || undefined,
    };
    const next = editing
      ? data.llmProfiles.map((x) => (x.id === editing.id ? row : x))
      : data.llmProfiles.some((x) => x.id === row.id)
        ? data.llmProfiles.map((x) => (x.id === row.id ? row : x))
        : [...data.llmProfiles, row];
    await saveStore({ ...data, llmProfiles: next });
    setEditorOpen(false);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore({
      ...data,
      llmProfiles: data.llmProfiles.filter((p) => p.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="Evaluations & guardrails"
        description="Central place for rubrics, red-team batches, production monitors, and named LLM presets for flows and eval."
        loading={loading}
        onRefresh={() => {
          void refetch();
          void refetchStatus();
        }}
      />
      {statusError ? (
        <p className="text-muted-foreground mb-3 text-xs" role="status">
          Provider status unavailable: {statusError}
        </p>
      ) : null}
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
          className="glass-panel ring-destructive/30 mb-4 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="guardrails" className="w-full">
        <TabsList variant="line" className="mb-4 w-full max-w-md">
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="llms">LLM profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="guardrails" className="mt-0">
          <div className="bg-surface-container-low/50 ring-outline-variant/20 space-y-4 rounded-lg p-5 ring-1">
            <h2 className="text-sm font-medium">Active checks</h2>
            <ul className="space-y-3">
              {checks.map((c) => (
                <li
                  key={c.name}
                  className="bg-surface-container-high/60 flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">{c.coverage}</p>
                  </div>
                  <Badge variant={c.state === "live" ? "default" : "outline"}>{c.state}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="llms" className="mt-0 space-y-4">
          {statusPayload?.providers?.length ? (
            <div className="bg-surface-container-low/50 ring-outline-variant/20 rounded-lg p-4 ring-1">
              <h3 className="text-muted-foreground mb-2 font-mono text-[10px] uppercase tracking-wider">
                LLM providers (env)
              </h3>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {statusPayload.providers.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="text-foreground text-xs font-medium">{p.label}</span>
                    <StudioResourceStatusBadge state={p.state} note={p.label} compact />
                  </li>
                ))}
              </ul>
            </div>
          ) : statusLoading ? (
            <p className="text-muted-foreground text-xs">Loading provider status…</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="synth"
            disabled={loading || !data || saving}
            onClick={openCreate}
          >
            New LLM profile
          </Button>
          {!loading && !error ? (
            <>
              <ul className="grid gap-5 sm:grid-cols-2">
                {llmProfiles.map((p) => {
                  const prof = llmProfileStatusById(statusPayload, p.id);
                  return (
                  <li key={p.id}>
                    <Card>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <CardTitle className="text-base">{p.name}</CardTitle>
                              {statusLoading ? (
                                <span className="text-muted-foreground text-[10px]">…</span>
                              ) : prof ? (
                                <StudioResourceStatusBadge
                                  state={prof.state}
                                  note={`${prof.providerLabel} · ${p.model}`}
                                />
                              ) : null}
                            </div>
                            <CardDescription className="font-mono text-xs">{p.id}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving || !data}
                              onClick={() => openEdit(p)}
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
                                setDeleteTarget(p);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-muted-foreground text-xs">
                          Model:{" "}
                          <span className="text-foreground font-mono">{p.model}</span>
                        </p>
                        {prof?.providerLabel ? (
                          <p className="text-muted-foreground font-mono text-[10px]">
                            Resolved: {prof.providerLabel}
                          </p>
                        ) : null}
                        {p.description ? (
                          <p className="text-muted-foreground text-sm">{p.description}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                );
                })}
              </ul>
              {llmProfiles.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No LLM profiles. Create presets to align flow steps and eval with the same model
                  strings.
                </p>
              ) : null}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit LLM profile" : "New LLM profile"}</DialogTitle>
            <DialogDescription>
              Use the same model identifier as flow LLM steps (e.g. gemini-2.5-flash-lite).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="llm-id">Id</Label>
              <Input
                id="llm-id"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={Boolean(editing)}
                className={cn("font-mono text-sm", editing && "opacity-80")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-name">Display name</Label>
              <Input
                id="llm-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model</Label>
              <Input
                id="llm-model"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-desc">Description (optional)</Label>
              <Textarea
                id="llm-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
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
                disabled={
                  !formId.trim() || !formName.trim() || !formModel.trim() || saving
                }
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
        title="Delete LLM profile"
        description={
          deleteTarget ? `Remove “${deleteTarget.name}” (${deleteTarget.id})?` : ""
        }
        loading={saving}
        onConfirm={handleDelete}
      />
    </StudioPage>
  );
}
