import type { FlowStep } from "@repo/shared";
import { analyzePromptSource } from "@bstockwelldev/prompt-rubric";
import {
  PromptGuardrailsError,
  validatePromptInput,
  type PromptPolicy,
} from "@bstockwelldev/prompt-guardrails-core";

export type PreflightFailure = {
  code: "guardrail" | "rubric" | "branch";
  message: string;
  details?: unknown;
};

/** Minimal policy for flow guardrail steps; merges per-step URL allowance. */
function policyFromStep(step: FlowStep): PromptPolicy {
  return {
    id: "micro-ui-agent-builder-flow",
    version: "1.0.0",
    key: `guardrail:${step.id}`,
    system: "flow-preflight",
    constraints: {
      maxTokens: 128000,
      allowUrls: step.allowUrls === true,
    },
  };
}

function latestUserTextFromMessages(
  messages: { role: string; parts?: { type: string; text?: string }[] }[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user" || !m.parts) continue;
    const texts = m.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string);
    const joined = texts.join("\n").trim();
    if (joined) return joined;
  }
  return "";
}

/**
 * Runs ordered steps before the first LLM or tool-loop node: guardrail (user text), rubric (compiled system),
 * branch (substring gate on user text). Aligns with validate-before-execute and static rubric gates.
 */
export function runFlowPreflight(params: {
  stepsBeforeLlm: FlowStep[];
  compiledSystemPrompt: string;
  messages: { role: string; parts?: { type: string; text?: string }[] }[];
}): PreflightFailure | null {
  const userText = latestUserTextFromMessages(params.messages);

  for (const step of params.stepsBeforeLlm) {
    if (step.type === "guardrail") {
      try {
        validatePromptInput(userText, policyFromStep(step));
      } catch (e) {
        if (e instanceof PromptGuardrailsError) {
          return {
            code: "guardrail",
            message: e.message,
            details: { reason: e.reason, details: e.details },
          };
        }
        throw e;
      }
    }
    if (step.type === "rubric") {
      const findings = analyzePromptSource(
        params.compiledSystemPrompt,
        "flow-compiled-system.txt",
      );
      if (step.rubricFailOnFindings && findings.length > 0) {
        return {
          code: "rubric",
          message: `Rubric reported ${findings.length} finding(s); this flow is configured to fail on any finding.`,
          details: findings.slice(0, 20),
        };
      }
    }
    if (step.type === "branch") {
      const required = step.content?.trim();
      if (required) {
        const hay = userText.toLowerCase();
        const needle = required.toLowerCase();
        if (!hay.includes(needle)) {
          return {
            code: "branch",
            message: `Branch gate: user message must contain "${required}" (case-insensitive).`,
          };
        }
      }
    }
  }

  return null;
}

export function stepsOrderedBeforeFirstLlm(
  steps: FlowStep[] | undefined,
): FlowStep[] {
  if (!steps?.length) return [];
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const firstModel = ordered.findIndex(
    (s) => s.type === "llm" || s.type === "tool_loop",
  );
  if (firstModel < 0) return ordered;
  return ordered.slice(0, firstModel);
}
