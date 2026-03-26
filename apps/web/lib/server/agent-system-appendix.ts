import type { AgentProfile } from "@repo/shared";

function buildAgentProfileAppendix(agent: AgentProfile | undefined): string {
  if (!agent) return "";
  const parts: string[] = [];
  if (agent.systemInstructions?.trim()) {
    parts.push(
      "[Agent profile: system instructions]\n" + agent.systemInstructions.trim(),
    );
  }
  if (agent.optionalElements?.length) {
    const lines = agent.optionalElements.map((e) => e.trim()).filter(Boolean);
    if (lines.length) {
      parts.push(
        "[Agent profile: optional elements]\n" +
          lines.map((l) => `- ${l}`).join("\n"),
      );
    }
  }
  return parts.join("\n\n");
}

/** Appends agent profile blocks after the flow-compiled system text. */
export function mergeAgentProfileIntoSystemPrompt(
  baseSystem: string,
  agent: AgentProfile | undefined,
): string {
  const appendix = buildAgentProfileAppendix(agent);
  if (!appendix) return baseSystem;
  return `${baseSystem.trimEnd()}\n\n${appendix}`;
}
