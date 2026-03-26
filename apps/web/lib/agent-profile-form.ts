import type { AgentProfile } from "@repo/shared";

export type FlowSelectOption = { id: string; name: string };

/** Parse a multiline textarea into non-empty optional element strings for `AgentProfile`. */
export function optionalElementsFromMultiline(text: string): string[] | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

/** Initial row for create vs edit in the agent editor. */
export function buildAgentProfileDraft(
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

export type AgentProfileFormInput = {
  id: string;
  name: string;
  description: string;
  defaultFlowId: string;
  systemInstructions: string;
  optionalElementsMultiline: string;
};

/** Normalize trimmed form state into a persisted `AgentProfile`. */
export function agentProfileFromFormInput(input: AgentProfileFormInput): AgentProfile {
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    description: input.description.trim() || undefined,
    defaultFlowId: input.defaultFlowId.trim() || undefined,
    systemInstructions: input.systemInstructions.trim() || undefined,
    optionalElements: optionalElementsFromMultiline(input.optionalElementsMultiline),
  };
}
