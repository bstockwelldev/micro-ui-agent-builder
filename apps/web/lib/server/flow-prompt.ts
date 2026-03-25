import type { FlowDocument, StudioStore } from "@repo/shared";

export function buildSystemPromptFromFlow(
  flow: FlowDocument | undefined,
  store: StudioStore,
): string {
  if (!flow) {
    return "You are a helpful assistant for the Agent Builder prototype.";
  }
  const chunks: string[] = [];
  const steps = [...flow.steps].sort((a, b) => a.order - b.order);
  for (const step of steps) {
    if (step.type === "system" && step.refId) {
      const p = store.prompts.find((x) => x.id === step.refId);
      if (p) chunks.push(p.body);
    }
    if (step.type === "user" && step.content) {
      chunks.push(`[Flow context — user step]\n${step.content}`);
    }
  }
  if (chunks.length === 0) {
    return `You are running flow "${flow.name}" (${flow.id}). Assist the user.`;
  }
  return chunks.join("\n\n");
}
