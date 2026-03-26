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
    <div className="bg-card border-border min-w-[140px] rounded-md border px-3 py-2 text-sm shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-border !bg-muted"
      />
      <div className="font-medium">{data.stepType}</div>
      <div className="text-muted-foreground max-w-[200px] truncate text-xs">
        {data.detail}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-border !bg-muted"
      />
    </div>
  );
}
