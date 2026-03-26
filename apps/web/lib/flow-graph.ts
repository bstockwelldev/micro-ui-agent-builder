import type { Edge, Node } from "@xyflow/react";
import type { FlowDocument, FlowNodeType, FlowStep } from "@repo/shared";

export type StepNodeData = {
  title: string;
  stepType: FlowNodeType;
  detail: string;
  blocks: { label: string; value: string }[];
  /** Populated in the editor from `validateFlowSteps` for diagram highlighting. */
  validationMessages?: string[];
};

const TYPE_TITLES: Record<FlowNodeType, string> = {
  system: "System prompt",
  user: "User / context",
  llm: "Agent model",
  tool: "Tool routing",
  human_gate: "Human gate",
  output: "Output contract",
  guardrail: "Input guardrail",
  rubric: "Prompt rubric (static)",
  branch: "Branch gate",
};

function stepDetail(s: FlowStep): string {
  const parts: string[] = [];
  if (s.refId) parts.push(s.refId);
  if (s.model) parts.push(s.model);
  if (s.content) {
    parts.push(
      s.content.length > 48 ? `${s.content.slice(0, 48)}…` : s.content,
    );
  }
  return parts.join(" · ") || "—";
}

function stepBlocks(s: FlowStep): { label: string; value: string }[] {
  switch (s.type) {
    case "system":
      return [
        {
          label: "Trigger",
          value: s.refId?.trim() || s.content?.trim() || "—",
        },
      ];
    case "user":
      return [
        {
          label: "Query",
          value: s.content?.trim() || s.refId?.trim() || "—",
        },
      ];
    case "llm":
      return [
        {
          label: "Model",
          value: s.model?.trim() || "—",
        },
        {
          label: "Instruction",
          value: s.content?.trim()
            ? s.content.length > 64
              ? `${s.content.slice(0, 64)}…`
              : s.content
            : "—",
        },
      ];
    case "tool":
      return [
        { label: "Tool", value: s.refId?.trim() || "—" },
        {
          label: "Args",
          value: s.content?.trim()
            ? s.content.length > 48
              ? `${s.content.slice(0, 48)}…`
              : s.content
            : "—",
        },
      ];
    case "human_gate":
      return [{ label: "Gate", value: s.content?.trim() || "—" }];
    case "output":
      return [{ label: "Format", value: s.content?.trim() || "—" }];
    case "guardrail":
      return [
        {
          label: "Policy",
          value: s.allowUrls ? "URLs allowed" : "URLs blocked (default)",
        },
        {
          label: "Notes",
          value: s.content?.trim()
            ? s.content.length > 64
              ? `${s.content.slice(0, 64)}…`
              : s.content
            : "prompt-guardrails-core validatePromptInput",
        },
      ];
    case "rubric":
      return [
        {
          label: "Gate",
          value: s.rubricFailOnFindings ? "Fail on any finding" : "Advisory only",
        },
        {
          label: "Scope",
          value: s.content?.trim()
            ? s.content.length > 48
              ? `${s.content.slice(0, 48)}…`
              : s.content
            : "Full compiled prompt",
        },
      ];
    case "branch":
      return [
        {
          label: "Require in user text",
          value: s.content?.trim() || "— (no gate)",
        },
      ];
  }
}

export function stepToNodeData(s: FlowStep): StepNodeData {
  return {
    title: (s.displayLabel?.trim() || TYPE_TITLES[s.type]) ?? s.type,
    stepType: s.type,
    detail: stepDetail(s),
    blocks: stepBlocks(s),
  };
}

export function buildFlowGraph(flow: FlowDocument): {
  nodes: Node<StepNodeData>[];
  edges: Edge[];
} {
  const sorted = [...flow.steps].sort((a, b) => a.order - b.order);
  const nodes: Node<StepNodeData>[] = sorted.map((s, i) => ({
    id: s.id,
    type: "step",
    position: s.position ?? {
      x: (i % 4) * 220,
      y: Math.floor(i / 4) * 140,
    },
    data: stepToNodeData(s),
  }));
  const edges: Edge[] =
    flow.edges && flow.edges.length > 0
      ? flow.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          style: { stroke: "#00e5ff", strokeWidth: 2 },
        }))
      : sorted.slice(0, -1).map((s, i) => ({
          id: `linear-${s.id}-${sorted[i + 1]!.id}`,
          source: s.id,
          target: sorted[i + 1]!.id,
          style: { stroke: "#00e5ff", strokeWidth: 2 },
        }));
  return { nodes, edges };
}

/** Merge server step list with current node positions (after drag). */
export function applyPositionsToSteps(
  steps: FlowStep[],
  nodes: Node<StepNodeData>[],
): FlowStep[] {
  return steps.map((step) => {
    const n = nodes.find((x) => x.id === step.id);
    return {
      ...step,
      position: n?.position ?? step.position,
    };
  });
}
