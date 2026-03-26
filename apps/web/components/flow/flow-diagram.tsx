"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import type { FlowDocument } from "@repo/shared";

import { buildFlowGraph } from "@/lib/flow-graph";

import { StepFlowNode } from "./step-flow-node";

const nodeTypes = { step: StepFlowNode };

function FitViewEffect({ nodeCount }: { nodeCount: number }) {
  const rf = useReactFlow();
  const ready = useNodesInitialized();
  useEffect(() => {
    if (ready && nodeCount > 0) {
      void rf.fitView({ padding: 0.2, duration: 200 });
    }
  }, [ready, nodeCount, rf]);
  return null;
}

function FlowDiagramInner({ flow }: { flow: FlowDocument }) {
  const { nodes, edges } = useMemo(() => buildFlowGraph(flow), [flow]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap />
      <FitViewEffect nodeCount={nodes.length} />
    </ReactFlow>
  );
}

export function FlowDiagramReadonly({ flow }: { flow: FlowDocument }) {
  return (
    <div className="border-border h-[min(50vh,440px)] w-full min-h-[320px] rounded-lg border">
      <ReactFlowProvider>
        <FlowDiagramInner flow={flow} />
      </ReactFlowProvider>
    </div>
  );
}
