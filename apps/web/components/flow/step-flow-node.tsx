"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import type { StepNodeData } from "@/lib/flow-graph";

export function StepFlowNode({ data }: NodeProps<Node<StepNodeData>>) {
  return (
    <div className="bg-surface-container-high text-card-foreground min-w-[140px] rounded-md px-3 py-2 text-sm shadow-none ring-1 ring-outline-variant/25">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted !border-outline-variant !size-2"
      />
      <div className="font-medium">{data.stepType}</div>
      <div className="text-muted-foreground max-w-[200px] truncate font-mono text-xs">
        {data.detail}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted !border-outline-variant !size-2"
      />
    </div>
  );
}
