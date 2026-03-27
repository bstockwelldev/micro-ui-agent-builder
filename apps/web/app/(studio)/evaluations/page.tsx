"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import type { LlmProfile } from "@repo/shared";

import { LlmProfileEditorDialog } from "@/components/studio/llm-profile-editor-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  studioCardEditHint,
  studioResourceCardInteractiveClass,
  StudioCardDeleteIconButton,
  StudioCardEditIconButton,
} from "@/components/studio/studio-resource-card-actions";
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
  const [newLlmProfileId, setNewLlmProfileId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LlmProfile | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setNewLlmProfileId(`llm_${nanoid(8)}`);
    setEditorOpen(true);
  }

  function openEdit(p: LlmProfile) {
    clearSaveError();
    setEditing(p);
    setEditorOpen(true);
  }

  async function handleSaveLlmProfile(row: LlmProfile) {
    if (!data) return;
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
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit LLM profile ${p.name}`}
                      className={cn(studioResourceCardInteractiveClass)}
                      onClick={() => openEdit(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEdit(p);
                        }
                      }}
                    >
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
                            <p className="text-muted-foreground pt-1 text-[11px]">
                              {studioCardEditHint}
                            </p>
                          </div>
                          <div
                            className="flex flex-wrap items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <StudioCardEditIconButton
                              label={p.name}
                              disabled={saving || !data}
                              onClick={() => openEdit(p)}
                            />
                            <StudioCardDeleteIconButton
                              label={p.name}
                              disabled={saving || !data}
                              onClick={() => {
                                clearSaveError();
                                setDeleteTarget(p);
                              }}
                            />
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

      <LlmProfileEditorDialog
        key={editing?.id ?? newLlmProfileId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        newProfileId={newLlmProfileId}
        defaultModel="gemini-2.5-flash-lite"
        saving={saving}
        onSave={(row) => void handleSaveLlmProfile(row)}
      />

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
