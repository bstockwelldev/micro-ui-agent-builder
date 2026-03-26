import type { LlmProfile } from "@repo/shared";

import { inferStudioLlmProviderLabel } from "@/lib/studio-llm-providers";

export function buildLlmProfileDraft(
  editing: LlmProfile | null,
  newProfileId: string,
  defaultModel: string,
): LlmProfile {
  if (editing) return editing;
  return {
    id: newProfileId,
    name: "",
    model: defaultModel,
    modelProvider: inferStudioLlmProviderLabel(defaultModel),
    description: undefined,
  };
}

export function llmProfileFromFormInput(input: {
  id: string;
  name: string;
  model: string;
  modelProvider: string;
  description: string;
}): LlmProfile {
  const modelProvider = input.modelProvider.trim();
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    model: input.model.trim(),
    modelProvider: modelProvider || undefined,
    description: input.description.trim() || undefined,
  };
}
