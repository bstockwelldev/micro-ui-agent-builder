import type { Edge, Node } from "@xyflow/react";
import type { FlowDocument } from "@repo/shared";

export type StepNodeData = {
  stepType: string;
  detail: string;
};

function stepDetail(s: FlowDocument["steps"][number]): string {
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
    data: {
      stepType: s.type,
      detail: stepDetail(s),
    },
  }));
  const edges: Edge[] =
    flow.edges && flow.edges.length > 0
      ? flow.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        }))
      : sorted.slice(0, -1).map((s, i) => ({
          id: `linear-${s.id}-${sorted[i + 1]!.id}`,
          source: s.id,
          target: sorted[i + 1]!.id,
        }));
  return { nodes, edges };
}
