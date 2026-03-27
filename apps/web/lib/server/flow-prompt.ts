import type { FlowDocument, StudioStore } from "@repo/shared";

import { toolNameFromId } from "@/lib/server/agent-tools";

/**
 * Builds the `system` string for AI SDK `streamText` / `generateText`.
 * Maps flow step kinds to prompt sections (system templates, user templates,
 * LLM instructions, tool hints, HITL gates, output contracts).
 */
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
    if (step.type === "system") {
      if (step.refId) {
        const p = store.prompts.find((x) => x.id === step.refId);
        if (p) chunks.push(`[System — prompt template: ${p.name}]\n${p.body}`);
      }
      if (step.content?.trim()) {
        chunks.push(`[System — inline]\n${step.content.trim()}`);
      }
    }
    if (step.type === "user") {
      if (step.refId) {
        const p = store.prompts.find((x) => x.id === step.refId);
        if (p) {
          chunks.push(`[User message template — ${p.name}]\n${p.body}`);
        }
      }
      if (step.content?.trim()) {
        chunks.push(`[User / context template]\n${step.content.trim()}`);
      }
    }
    if (step.type === "llm" && step.content?.trim()) {
      chunks.push(
        `[Model instructions — LLM step]\n${step.content.trim()}`,
      );
    }
    if (step.type === "tool_loop" && step.content?.trim()) {
      chunks.push(
        `[Model instructions — tool-loop agent]\n${step.content.trim()}`,
      );
      if (step.maxToolIterations != null) {
        chunks.push(
          `[Tool-loop runtime — maxSteps=${step.maxToolIterations}]\nIterate tool calls until the task completes or this cap is reached.`,
        );
      }
    }
    if (step.type === "code_exec") {
      const lang = step.codeExecLanguage ?? "unspecified";
      if (step.content?.trim()) {
        chunks.push(
          `[Code execution — language: ${lang}]\n${step.content.trim()}`,
        );
      }
      if (step.refId) {
        const name = toolNameFromId(step.refId);
        const t = store.tools.find((x) => x.id === step.refId);
        const desc = t?.description?.trim() ?? "see tool catalog";
        chunks.push(
          `[Code execution — linked tool \`${name}\`]\n${desc}`,
        );
      }
    }
    if (step.type === "tool" && step.refId) {
      const name = toolNameFromId(step.refId);
      const t = store.tools.find((x) => x.id === step.refId);
      const desc = t?.description?.trim() ?? "see tool catalog";
      chunks.push(
        `[Tool routing — use \`${name}\` when appropriate]\nCatalog id: ${step.refId}\n${desc}`,
      );
      if (step.content?.trim()) {
        chunks.push(
          `[Suggested tool input shape / notes]\n${step.content.trim()}`,
        );
      }
    }
    if (step.type === "human_gate" && step.content?.trim()) {
      chunks.push(`[Human-in-the-loop checkpoint]\n${step.content.trim()}`);
    }
    if (step.type === "human_gate" && step.genuiCheckpointSurfaceJson?.trim()) {
      chunks.push(
        `[GenUI checkpoint surface — render for structured approval / input]\n${step.genuiCheckpointSurfaceJson.trim()}`,
      );
    }
    if (step.type === "output" && step.content?.trim()) {
      chunks.push(
        `[Output contract — follow when responding]\n${step.content.trim()}`,
      );
    }
    if (step.type === "guardrail") {
      const note =
        step.content?.trim() ||
        "Runtime: user text is validated with prompt-guardrails-core before the model runs.";
      chunks.push(`[Input guardrail — policy note]\n${note}`);
    }
    if (step.type === "rubric") {
      const note =
        step.content?.trim() ||
        "Runtime: compiled prompt is scanned with prompt-rubric static findings (D1–D7 style).";
      chunks.push(`[Prompt quality rubric — static eval context]\n${note}`);
    }
    if (step.type === "branch") {
      const req = step.content?.trim();
      chunks.push(
        req
          ? `[Branch gate — latest user message must contain: "${req}" (enforced server-side)]`
          : `[Branch gate — no substring requirement (documentation only)]`,
      );
    }
  }
  if (chunks.length === 0) {
    return `You are running flow "${flow.name}" (${flow.id}). Assist the user.`;
  }
  return chunks.join("\n\n");
}
