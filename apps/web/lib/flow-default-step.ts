import type { FlowNodeType, FlowStep } from "@repo/shared";

/** Defaults when adding a node from the builder palette (order + canvas position supplied by caller). */
export function createDefaultFlowStep(
  type: FlowNodeType,
  id: string,
  order: number,
  position: { x: number; y: number },
): FlowStep {
  const base = { id, order, position };
  switch (type) {
    case "llm":
      return {
        ...base,
        type: "llm",
        model: "gemini-2.5-flash-lite",
        content:
          "You are an expert architect. Analyze the flow defined in {{context}} and suggest structural optimizations.",
      };
    case "guardrail":
      return {
        ...base,
        type: "guardrail",
        content:
          "Validates the latest user message with prompt-guardrails-core (injection, length, URLs) before streamText.",
      };
    case "rubric":
      return {
        ...base,
        type: "rubric",
        rubricFailOnFindings: false,
        content:
          "Runs prompt-rubric analyzePromptSource on the compiled system string; toggle fail-on-findings for CI-style gates.",
      };
    case "branch":
      return {
        ...base,
        type: "branch",
        content: "",
      };
    case "system":
      return { ...base, type: "system", content: "" };
    case "user":
      return { ...base, type: "user", content: "" };
    case "tool":
      return { ...base, type: "tool", content: "" };
    case "human_gate":
      return {
        ...base,
        type: "human_gate",
        content: "Human approval required before the agent continues.",
      };
    case "output":
      return {
        ...base,
        type: "output",
        content: "Output: structured, cite sources, match downstream GenUI contract when applicable.",
      };
  }
}

export const FLOW_NODE_TYPE_OPTIONS: { value: FlowNodeType; label: string }[] = [
  { value: "llm", label: "Agent model" },
  { value: "guardrail", label: "Input guardrail" },
  { value: "rubric", label: "Prompt rubric (static)" },
  { value: "branch", label: "Branch gate" },
  { value: "system", label: "System prompt" },
  { value: "user", label: "User / context" },
  { value: "tool", label: "Tool routing" },
  { value: "human_gate", label: "Human gate" },
  { value: "output", label: "Output contract" },
];
