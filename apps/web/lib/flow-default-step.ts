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
    case "tool_loop":
      return {
        ...base,
        type: "tool_loop",
        model: "gemini-2.5-flash-lite",
        toolChoice: "auto",
        maxToolIterations: 8,
        content:
          "You are a tool-using agent. Call catalog tools as needed; iterate until the task is complete or you must ask the user.",
      };
    case "code_exec":
      return {
        ...base,
        type: "code_exec",
        codeExecLanguage: "javascript",
        content:
          "When execution is needed, emit correct code for the selected language; prefer the linked code/sandbox tool when available.",
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

/** Default step kind when adding a node from the palette (+) or mobile add — change type in the node config panel. */
export const DEFAULT_FLOW_NODE_TYPE = "llm" satisfies FlowNodeType;

export const FLOW_NODE_TYPE_OPTIONS: { value: FlowNodeType; label: string }[] = [
  { value: "llm", label: "Agent model" },
  { value: "tool_loop", label: "Tool-loop agent" },
  { value: "code_exec", label: "Code execution" },
  { value: "guardrail", label: "Input guardrail" },
  { value: "rubric", label: "Prompt rubric (static)" },
  { value: "branch", label: "Branch gate" },
  { value: "system", label: "System prompt" },
  { value: "user", label: "User / context" },
  { value: "tool", label: "Tool routing" },
  { value: "human_gate", label: "Human gate" },
  { value: "output", label: "Output contract" },
];
