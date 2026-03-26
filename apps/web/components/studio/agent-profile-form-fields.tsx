"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FlowSelectOption } from "@/lib/agent-profile-form";
import { STUDIO_NATIVE_SELECT_CLASS } from "@/lib/studio-native-select-class";
import { cn } from "@/lib/utils";

import { StudioFormSection } from "./studio-form-section";

export type AgentProfileFormFieldsProps = {
  flows: FlowSelectOption[];
  idLocked: boolean;
  formId: string;
  onFormIdChange: (v: string) => void;
  formName: string;
  onFormNameChange: (v: string) => void;
  formDescription: string;
  onFormDescriptionChange: (v: string) => void;
  formSystemInstructions: string;
  onFormSystemInstructionsChange: (v: string) => void;
  formOptionalLines: string;
  onFormOptionalLinesChange: (v: string) => void;
  formDefaultFlowId: string;
  onFormDefaultFlowIdChange: (v: string) => void;
};

export function AgentProfileFormFields({
  flows,
  idLocked,
  formId,
  onFormIdChange,
  formName,
  onFormNameChange,
  formDescription,
  onFormDescriptionChange,
  formSystemInstructions,
  onFormSystemInstructionsChange,
  formOptionalLines,
  onFormOptionalLinesChange,
  formDefaultFlowId,
  onFormDefaultFlowIdChange,
}: AgentProfileFormFieldsProps) {
  return (
    <div className="space-y-6">
      <StudioFormSection
        sectionId="agent-identity"
        title="Identity"
        hint="Stable id and display metadata. The id is used in Run URLs as agentId."
      >
        <div className="space-y-1.5">
          <Label htmlFor="agent-id">Id</Label>
          <Input
            id="agent-id"
            value={formId}
            onChange={(e) => onFormIdChange(e.target.value)}
            disabled={idLocked}
            className={cn(idLocked && "opacity-80")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            value={formName}
            onChange={(e) => onFormNameChange(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-desc">Description (optional)</Label>
          <Textarea
            id="agent-desc"
            value={formDescription}
            onChange={(e) => onFormDescriptionChange(e.target.value)}
            rows={2}
          />
        </div>
      </StudioFormSection>

      <StudioFormSection
        sectionId="agent-system-overlay"
        title="System prompt overlay"
        hint="Merged after the compiled flow system string when Run includes this agent (agentId). Use for behavior, tone, tools/output expectations, and short capability bullets."
      >
        <div className="space-y-1.5">
          <Label htmlFor="agent-system">System instructions (optional)</Label>
          <Textarea
            id="agent-system"
            value={formSystemInstructions}
            onChange={(e) => onFormSystemInstructionsChange(e.target.value)}
            rows={6}
            placeholder="e.g. Always cite sources. Prefer concise markdown. Refuse harmful requests."
            className="min-h-[7rem] font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-optional">Optional elements (optional)</Label>
          <Textarea
            id="agent-optional"
            value={formOptionalLines}
            onChange={(e) => onFormOptionalLinesChange(e.target.value)}
            rows={4}
            placeholder={"One capability or constraint per line, e.g.\nCatalog tools enabled\nJSON when asked"}
            className="min-h-[5rem] font-mono text-xs"
          />
          <p className="text-muted-foreground text-xs">
            Each non-empty line becomes a bullet under “optional elements” in the merged system
            prompt.
          </p>
        </div>
      </StudioFormSection>

      <StudioFormSection
        sectionId="agent-default-run"
        title="Default run"
        hint="Pre-selects a flow when opening Run with this agent. You can still override flowId in the URL."
      >
        <div className="space-y-1.5">
          <Label htmlFor="agent-flow">Default flow (optional)</Label>
          <select
            id="agent-flow"
            className={STUDIO_NATIVE_SELECT_CLASS}
            value={formDefaultFlowId}
            onChange={(e) => onFormDefaultFlowIdChange(e.target.value)}
          >
            <option value="">None</option>
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.id})
              </option>
            ))}
          </select>
        </div>
      </StudioFormSection>
    </div>
  );
}
