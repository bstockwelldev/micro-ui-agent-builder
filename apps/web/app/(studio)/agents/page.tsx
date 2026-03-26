"use client";

import { nanoid } from "nanoid";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AgentProfile } from "@repo/shared";

import { AgentProfileEditorDialog } from "@/components/studio/agent-profile-editor-dialog";
import { StudioApiStatusBanners } from "@/components/studio/studio-api-status-banners";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioApi } from "@/hooks/use-studio-api";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const agents = data?.agents ?? [];
  const flowOptions = useMemo(
    () => (data?.flows ?? []).map((f) => ({ id: f.id, name: f.name })),
    [data?.flows],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AgentProfile | null>(null);
  const [newAgentId, setNewAgentId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AgentProfile | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setNewAgentId(`agent_${nanoid(8)}`);
    setEditorOpen(true);
  }

  function openEdit(a: AgentProfile) {
    clearSaveError();
    setEditing(a);
    setEditorOpen(true);
  }

  async function handleSaveAgent(row: AgentProfile) {
    if (!data) return;
    const nextAgents = editing
      ? data.agents.map((x) => (x.id === editing.id ? row : x))
      : data.agents.some((x) => x.id === row.id)
        ? data.agents.map((x) => (x.id === row.id ? row : x))
        : [...data.agents, row];
    await saveStore({ ...data, agents: nextAgents });
    setEditorOpen(false);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore({
      ...data,
      agents: data.agents.filter((a) => a.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="Agents"
        description="Named profiles with default flow, system instructions, and optional elements. When you open Run with agentId in the URL, those fields are merged into the system prompt after the flow text."
        loading={loading}
        onRefresh={refetch}
      />
      <Button
        type="button"
        size="sm"
        variant="synth"
        className="mb-4"
        disabled={loading || !data || saving}
        onClick={openCreate}
      >
        New agent
      </Button>
      <StudioApiStatusBanners
        saveError={saveError}
        onDismissSaveError={clearSaveError}
        loadError={error}
        loading={loading}
        onRetryLoad={refetch}
      />
      {!loading && !error ? (
        <>
          <ul className="grid gap-5 sm:grid-cols-2">
            {agents.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{a.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {a.description ? (
                      <p className="text-muted-foreground text-sm">{a.description}</p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      Default flow:{" "}
                      <span className="text-foreground font-mono">
                        {a.defaultFlowId ?? "—"}
                      </span>
                    </p>
                    {a.systemInstructions ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        <span className="font-medium text-foreground">System: </span>
                        {a.systemInstructions}
                      </p>
                    ) : null}
                    {a.optionalElements?.length ? (
                      <p className="text-muted-foreground text-xs">
                        <span className="font-medium text-foreground">Elements: </span>
                        {a.optionalElements.join(" · ")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving || !data}
                        onClick={() => openEdit(a)}
                      >
                        Edit
                      </Button>
                      {a.defaultFlowId ? (
                        <Link
                          href={`/run?flowId=${encodeURIComponent(a.defaultFlowId)}&agentId=${encodeURIComponent(a.id)}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Run with agent
                        </Link>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={saving || !data}
                        onClick={() => {
                          clearSaveError();
                          setDeleteTarget(a);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {agents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No agents yet. Create one to track defaults per persona.
            </p>
          ) : null}
        </>
      ) : null}

      <AgentProfileEditorDialog
        key={editing?.id ?? newAgentId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        newAgentId={newAgentId}
        flows={flowOptions}
        saving={saving}
        onSave={handleSaveAgent}
      />

      <StudioConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete agent"
        description={
          deleteTarget ? `Remove “${deleteTarget.name}” (${deleteTarget.id})?` : ""
        }
        loading={saving}
        onConfirm={handleDelete}
      />
    </StudioPage>
  );
}
