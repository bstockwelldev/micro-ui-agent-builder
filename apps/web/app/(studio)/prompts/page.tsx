"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import type { PromptTemplate } from "@repo/shared";

import { StudioApiStatusBanners } from "@/components/studio/studio-api-status-banners";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
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
import { useStudioApi } from "@/hooks/use-studio-api";
import { cn } from "@/lib/utils";

export default function PromptsPage() {
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const prompts = data?.prompts ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplate | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setFormId(`prompt_${nanoid(8)}`);
    setFormName("");
    setFormBody("");
    setEditorOpen(true);
  }

  function openEdit(p: PromptTemplate) {
    clearSaveError();
    setEditing(p);
    setFormId(p.id);
    setFormName(p.name);
    setFormBody(p.body);
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!data || !formId.trim() || !formName.trim() || !formBody.trim()) return;
    const row: PromptTemplate = {
      id: formId.trim(),
      name: formName.trim(),
      body: formBody.trim(),
    };
    const next = editing
      ? data.prompts.map((x) => (x.id === editing.id ? row : x))
      : data.prompts.some((x) => x.id === row.id)
        ? data.prompts.map((x) => (x.id === row.id ? row : x))
        : [...data.prompts, row];
    await saveStore({ ...data, prompts: next });
    setEditorOpen(false);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore({
      ...data,
      prompts: data.prompts.filter((p) => p.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="Prompt Lab"
        description="Prompt templates referenced by flow steps (system / user nodes). Compare versions and attach eval hooks when the runner persists drafts."
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
        New prompt
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
          <ul className="space-y-4">
            {prompts.map((p) => (
              <li key={p.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
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
                  <CardContent>
                    <pre className="bg-surface-container-lowest/90 max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs whitespace-pre-wrap ring-1 ring-outline-variant/20">
                      {p.body}
                    </pre>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {prompts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prompt templates.</p>
          ) : null}
        </>
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit prompt" : "New prompt"}</DialogTitle>
            <DialogDescription>
              Flow steps reference prompts by id. Changing id may break existing refs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="prompt-id">Id</Label>
              <Input
                id="prompt-id"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={Boolean(editing)}
                className={cn(editing && "opacity-80")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt-body">Body</Label>
              <Textarea
                id="prompt-body"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={10}
                className="font-mono text-xs"
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
                  !formId.trim() || !formName.trim() || !formBody.trim() || saving
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
        title="Delete prompt"
        description={
          deleteTarget ? `Remove “${deleteTarget.name}” (${deleteTarget.id})?` : ""
        }
        loading={saving}
        onConfirm={handleDelete}
      />
    </StudioPage>
  );
}
