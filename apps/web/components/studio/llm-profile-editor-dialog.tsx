"use client";

import type { LlmProfile } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";

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
import {
  buildLlmProfileDraft,
  llmProfileFromFormInput,
} from "@/lib/llm-profile-form";
import { STUDIO_NATIVE_SELECT_CLASS } from "@/lib/studio-native-select-class";
import {
  STUDIO_LLM_MODEL_PRESETS,
  STUDIO_LLM_PROVIDERS,
  coerceStudioLlmProviderLabel,
  defaultModelForStudioProvider,
  type StudioLlmProviderLabel,
} from "@/lib/studio-llm-providers";
import { cn } from "@/lib/utils";

import { StudioFormSection } from "./studio-form-section";
import { StudioModelRefAutocomplete } from "./studio-model-ref-autocomplete";

type LlmProfileEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LlmProfile | null;
  /** Used when `editing` is null (create mode). */
  newProfileId: string;
  defaultModel: string;
  saving: boolean;
  onSave: (profile: LlmProfile) => void | Promise<void>;
};

export function LlmProfileEditorDialog({
  open,
  onOpenChange,
  editing,
  newProfileId,
  defaultModel,
  saving,
  onSave,
}: LlmProfileEditorDialogProps) {
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState(defaultModel);
  const [formProvider, setFormProvider] = useState<StudioLlmProviderLabel>(
    STUDIO_LLM_PROVIDERS[0],
  );
  const [formDescription, setFormDescription] = useState("");

  const modelPresets = useMemo(
    () => STUDIO_LLM_MODEL_PRESETS[formProvider],
    [formProvider],
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormId(editing.id);
      setFormName(editing.name);
      setFormModel(editing.model);
      setFormProvider(
        coerceStudioLlmProviderLabel(editing.modelProvider, editing.model),
      );
      setFormDescription(editing.description ?? "");
      return;
    }
    const blank = buildLlmProfileDraft(null, newProfileId, defaultModel);
    setFormId(blank.id);
    setFormName(blank.name);
    setFormModel(blank.model);
    setFormProvider(
      coerceStudioLlmProviderLabel(blank.modelProvider, blank.model),
    );
    setFormDescription(blank.description ?? "");
  }, [open, editing, newProfileId, defaultModel]);

  function handleProviderChange(next: StudioLlmProviderLabel) {
    setFormProvider(next);
    const presets = STUDIO_LLM_MODEL_PRESETS[next];
    const stillValid = presets.some((p) => p.value === formModel);
    if (!stillValid) {
      setFormModel(defaultModelForStudioProvider(next));
    }
  }

  function handleSave() {
    if (!formId.trim() || !formName.trim() || !formModel.trim()) return;
    const row = llmProfileFromFormInput({
      id: formId,
      name: formName,
      model: formModel,
      modelProvider: formProvider,
      description: formDescription,
    });
    void onSave(row);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,40rem)] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-outline-variant/10 shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>{editing ? "Edit LLM profile" : "New LLM profile"}</DialogTitle>
          <DialogDescription>
            Pick a provider and model ref to match flow LLM steps (you can still type a
            custom ref).
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <StudioFormSection
            sectionId="llm-profile"
            title="Profile"
            hint="Named preset for evaluations and flow steps."
          >
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
              <Label htmlFor="llm-provider">Provider</Label>
              <select
                id="llm-provider"
                className={cn(STUDIO_NATIVE_SELECT_CLASS, "font-sans")}
                value={formProvider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as StudioLlmProviderLabel)
                }
              >
                {STUDIO_LLM_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model</Label>
              <StudioModelRefAutocomplete
                id="llm-model"
                value={formModel}
                onValueChange={setFormModel}
                presets={modelPresets}
                disabled={saving}
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
          </StudioFormSection>
        </div>
        <DialogFooter className="border-outline-variant/10 shrink-0 border-t px-6 py-4 sm:justify-end">
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="synth"
              disabled={
                !formId.trim() || !formName.trim() || !formModel.trim() || saving
              }
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
