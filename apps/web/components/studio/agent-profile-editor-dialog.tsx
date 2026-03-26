"use client";

import type { AgentProfile } from "@repo/shared";
import { useState } from "react";

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
import { optionalElementsFromMultiline } from "@/lib/agent-profile-form";
import { STUDIO_NATIVE_SELECT_CLASS } from "@/lib/studio-native-select-class";
import { cn } from "@/lib/utils";

export type FlowSelectOption = { id: string; name: string };

function seedAgentDraft(
  editing: AgentProfile | null,
  newAgentId: string,
  flows: FlowSelectOption[],
): AgentProfile {
  if (editing) return editing;
  return {
    id: newAgentId,
    name: "",
    description: undefined,
    defaultFlowId: flows[0]?.id,
    systemInstructions: undefined,
    optionalElements: undefined,
  };
}

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
  const seed = seedAgentDraft(editing, newAgentId, flows);
  const [formId, setFormId] = useState(seed.id);
  const [formName, setFormName] = useState(seed.name);
  const [formDescription, setFormDescription] = useState(seed.description ?? "");
  const [formDefaultFlowId, setFormDefaultFlowId] = useState(seed.defaultFlowId ?? "");
  const [formSystemInstructions, setFormSystemInstructions] = useState(
    seed.systemInstructions ?? "",
  );
  const [formOptionalLines, setFormOptionalLines] = useState(
    (seed.optionalElements ?? []).join("\n"),
  );

  function handleSave() {
    if (!formId.trim() || !formName.trim()) return;
    const row: AgentProfile = {
      id: formId.trim(),
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      defaultFlowId: formDefaultFlowId.trim() || undefined,
      systemInstructions: formSystemInstructions.trim() || undefined,
      optionalElements: optionalElementsFromMultiline(formOptionalLines),
    };
    void onSave(row);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit agent" : "New agent"}</DialogTitle>
          <DialogDescription>
            ID is stable once saved; changing it creates a new row unless you remove the old one.
            System instructions and optional elements are merged into the run system prompt when Run
            is opened with this agent in the URL (
            <code className="font-mono text-xs">agentId</code>
            ).
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="agent-id">Id</Label>
            <Input
              id="agent-id"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              disabled={Boolean(editing)}
              className={cn(editing && "opacity-80")}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-desc">Description (optional)</Label>
            <Textarea
              id="agent-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-flow">Default flow (optional)</Label>
            <select
              id="agent-flow"
              className={STUDIO_NATIVE_SELECT_CLASS}
              value={formDefaultFlowId}
              onChange={(e) => setFormDefaultFlowId(e.target.value)}
            >
              <option value="">None</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.id})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-system">System instructions (optional)</Label>
            <Textarea
              id="agent-system"
              value={formSystemInstructions}
              onChange={(e) => setFormSystemInstructions(e.target.value)}
              rows={5}
              placeholder="Behavior, tone, and constraints for this agent when Run includes agentId…"
              className="min-h-[6rem] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-optional">Optional elements (optional)</Label>
            <Textarea
              id="agent-optional"
              value={formOptionalLines}
              onChange={(e) => setFormOptionalLines(e.target.value)}
              rows={4}
              placeholder={"One per line, e.g.\nCatalog tools\nMarkdown output"}
              className="min-h-[5rem] font-mono text-xs"
            />
            <p className="text-muted-foreground text-xs">
              Each non-empty line becomes a bullet in the system prompt under “optional elements”.
            </p>
          </div>
        </div>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
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
