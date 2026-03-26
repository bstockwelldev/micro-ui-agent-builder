"use client";

import type { AgentProfile } from "@repo/shared";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  agentProfileFromFormInput,
  buildAgentProfileDraft,
  type FlowSelectOption,
} from "@/lib/agent-profile-form";

import { AgentProfileFormFields } from "./agent-profile-form-fields";

type AgentProfileEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AgentProfile | null;
  newAgentId: string;
  flows: FlowSelectOption[];
  saving: boolean;
  onSave: (agent: AgentProfile) => void | Promise<void>;
};

export function AgentProfileEditorDialog({
  open,
  onOpenChange,
  editing,
  newAgentId,
  flows,
  saving,
  onSave,
}: AgentProfileEditorDialogProps) {
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDefaultFlowId, setFormDefaultFlowId] = useState("");
  const [formSystemInstructions, setFormSystemInstructions] = useState("");
  const [formOptionalLines, setFormOptionalLines] = useState("");

  /** Full reset when opening or switching create vs edit / agent id. */
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormId(editing.id);
      setFormName(editing.name);
      setFormDescription(editing.description ?? "");
      setFormDefaultFlowId(editing.defaultFlowId ?? "");
      setFormSystemInstructions(editing.systemInstructions ?? "");
      setFormOptionalLines((editing.optionalElements ?? []).join("\n"));
      return;
    }
    const blank = buildAgentProfileDraft(null, newAgentId, []);
    setFormId(blank.id);
    setFormName(blank.name);
    setFormDescription(blank.description ?? "");
    setFormSystemInstructions(blank.systemInstructions ?? "");
    setFormOptionalLines((blank.optionalElements ?? []).join("\n"));
    setFormDefaultFlowId(blank.defaultFlowId ?? "");
  }, [open, editing, newAgentId]);

  /** Create mode: when flows hydrate after open, default the select without wiping other fields. */
  useEffect(() => {
    if (!open || editing) return;
    const first = flows[0]?.id;
    if (!first) return;
    setFormDefaultFlowId((prev) => (prev === "" ? first : prev));
  }, [open, editing, flows]);

  function handleSave() {
    if (!formId.trim() || !formName.trim()) return;
    const row = agentProfileFromFormInput({
      id: formId,
      name: formName,
      description: formDescription,
      defaultFlowId: formDefaultFlowId,
      systemInstructions: formSystemInstructions,
      optionalElementsMultiline: formOptionalLines,
    });
    void onSave(row);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,52rem)] max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-outline-variant/10 shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>{editing ? "Edit agent" : "New agent"}</DialogTitle>
          <DialogDescription>
            ID is stable once saved; changing it creates a new row unless you remove the old one.
            System instructions and optional elements are merged into the run system prompt when{" "}
            <code className="font-mono text-xs">agentId</code> is present in the Run URL.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AgentProfileFormFields
            flows={flows}
            idLocked={Boolean(editing)}
            formId={formId}
            onFormIdChange={setFormId}
            formName={formName}
            onFormNameChange={setFormName}
            formDescription={formDescription}
            onFormDescriptionChange={setFormDescription}
            formSystemInstructions={formSystemInstructions}
            onFormSystemInstructionsChange={setFormSystemInstructions}
            formOptionalLines={formOptionalLines}
            onFormOptionalLinesChange={setFormOptionalLines}
            formDefaultFlowId={formDefaultFlowId}
            onFormDefaultFlowIdChange={setFormDefaultFlowId}
          />
        </div>
        <DialogFooter className="border-outline-variant/10 shrink-0 border-t bg-transparent px-6 py-4 sm:justify-end">
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="synth"
              disabled={!formId.trim() || !formName.trim() || saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
