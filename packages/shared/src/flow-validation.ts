import type { FlowNodeType, FlowStep } from "./schemas.js";
import { parseGenuiSurface } from "./schemas.js";

export type FlowValidationIssue = {
  stepId: string;
  stepType: FlowNodeType;
  field?: string;
  message: string;
};

/**
 * Studio UX validation for flow steps (complements Zod schema — stricter empty checks).
 * Branch steps may omit `content` (document-only gate); see flow UI copy.
 */
export function validateFlowSteps(steps: FlowStep[]): {
  ok: boolean;
  issues: FlowValidationIssue[];
} {
  const issues: FlowValidationIssue[] = [];

  for (const s of steps) {
    const push = (field: string | undefined, message: string) => {
      issues.push({
        stepId: s.id,
        stepType: s.type,
        field,
        message,
      });
    };

    switch (s.type) {
      case "system":
      case "user": {
        const hasRef = Boolean(s.refId?.trim());
        const hasContent = Boolean(s.content?.trim());
        if (!hasRef && !hasContent) {
          push(
            "prompt",
            "Choose a prompt template or enter inline text (at least one is required).",
          );
        }
        break;
      }
      case "llm": {
        if (!s.model?.trim()) {
          push("model", "Model id is required for this step.");
        }
        if (s.maxToolIterations != null) {
          if (
            !Number.isInteger(s.maxToolIterations) ||
            s.maxToolIterations < 1 ||
            s.maxToolIterations > 64
          ) {
            push(
              "maxToolIterations",
              "Max tool iterations must be an integer from 1 to 64.",
            );
          }
        }
        break;
      }
      case "tool_loop": {
        if (!s.model?.trim()) {
          push("model", "Model id is required for this step.");
        }
        if (s.maxToolIterations == null) {
          push(
            "maxToolIterations",
            "Set max tool iterations (1–64) for the tool-loop agent.",
          );
        } else if (
          !Number.isInteger(s.maxToolIterations) ||
          s.maxToolIterations < 1 ||
          s.maxToolIterations > 64
        ) {
          push(
            "maxToolIterations",
            "Max tool iterations must be an integer from 1 to 64.",
          );
        }
        break;
      }
      case "code_exec": {
        if (!s.content?.trim()) {
          push(
            "content",
            "Describe code execution expectations, constraints, or sandbox contract.",
          );
        }
        break;
      }
      case "tool": {
        if (!s.refId?.trim()) {
          push("refId", "Select a tool from the catalog.");
        }
        break;
      }
      case "human_gate":
      case "output": {
        if (!s.content?.trim()) {
          push(
            "content",
            s.type === "human_gate"
              ? "Enter checkpoint instructions for the human gate."
              : "Describe the output contract or format expectations.",
          );
        }
        if (s.type === "human_gate" && s.genuiCheckpointSurfaceJson?.trim()) {
          try {
            parseGenuiSurface(JSON.parse(s.genuiCheckpointSurfaceJson));
          } catch {
            push(
              "genuiCheckpointSurfaceJson",
              "GenUI checkpoint must be valid JSON matching the GenUI surface schema.",
            );
          }
        }
        break;
      }
      case "branch":
      case "guardrail":
      case "rubric":
        break;
    }

    if (s.temperature !== undefined && s.temperature !== null) {
      if (Number.isNaN(s.temperature) || s.temperature < 0 || s.temperature > 2) {
        push("temperature", "Temperature must be between 0 and 2.");
      }
    }
    if (s.maxTokens !== undefined && s.maxTokens !== null) {
      if (
        !Number.isInteger(s.maxTokens) ||
        s.maxTokens < 1 ||
        s.maxTokens > 200_000
      ) {
        push("maxTokens", "Max tokens must be an integer from 1 to 200000.");
      }
    }
    if (s.topP !== undefined && s.topP !== null) {
      if (Number.isNaN(s.topP) || s.topP < 0 || s.topP > 1) {
        push("topP", "Top P must be between 0 and 1.");
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
