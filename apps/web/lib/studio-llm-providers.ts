/** Studio UI labels for LLM routing (same strings as flow step `modelProvider`). */

export const STUDIO_LLM_PROVIDERS = [
  "Google Gemini (Vertex AI)",
  "OpenAI GPT-4o",
  "Anthropic Claude 3.5",
] as const;

export type StudioLlmProviderLabel = (typeof STUDIO_LLM_PROVIDERS)[number];

export type StudioModelPreset = { value: string; label: string };

export const STUDIO_LLM_MODEL_PRESETS: Record<
  StudioLlmProviderLabel,
  readonly StudioModelPreset[]
> = {
  "Google Gemini (Vertex AI)": [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  "OpenAI GPT-4o": [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  "Anthropic Claude 3.5": [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
};

export function inferStudioLlmProviderLabel(
  model: string | undefined,
): StudioLlmProviderLabel {
  if (!model) return STUDIO_LLM_PROVIDERS[0];
  const m = model.toLowerCase();
  if (m.includes("gpt")) return "OpenAI GPT-4o";
  if (m.includes("claude")) return "Anthropic Claude 3.5";
  return "Google Gemini (Vertex AI)";
}

export function defaultModelForStudioProvider(
  provider: StudioLlmProviderLabel,
): string {
  return STUDIO_LLM_MODEL_PRESETS[provider][0]?.value ?? "";
}

/** If stored label is unknown, infer from `model` so `<select>` stays valid. */
export function coerceStudioLlmProviderLabel(
  stored: string | undefined,
  model: string | undefined,
): StudioLlmProviderLabel {
  if (
    stored &&
    (STUDIO_LLM_PROVIDERS as readonly string[]).includes(stored)
  ) {
    return stored as StudioLlmProviderLabel;
  }
  return inferStudioLlmProviderLabel(model);
}
