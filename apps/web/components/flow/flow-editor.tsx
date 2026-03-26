"use client";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlowDocument, StudioStore } from "@repo/shared";

import { Button } from "@/components/ui/button";
import { buildFlowGraph, type StepNodeData } from "@/lib/flow-graph";

import { StepFlowNode } from "./step-flow-node";

const nodeTypes = { step: StepFlowNode };

function FitViewEffect({ nodeCount }: { nodeCount: number }) {
  const rf = useReactFlow();
  const ready = useNodesInitialized();
  useEffect(() => {
    if (ready && nodeCount > 0) {
      void rf.fitView({ padding: 0.15, duration: 200 });
    }
  }, [ready, nodeCount, rf]);
  return null;
}

function FlowEditorInner({
  flow,
  store,
  onSaved,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
}) {
  const initial = useMemo(() => buildFlowGraph(flow), [flow]);
  const [nodes, setNodes, onNodesChange] = useNodesState<
    Node<StepNodeData>
  >(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [flow.id, flow.updatedAt, initial.nodes, initial.edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e-${nanoid(8)}`,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveLayout() {
    setSaveError(null);
    setSaving(true);
    try {
      const steps = flow.steps.map((step) => {
        const n = nodes.find((x) => x.id === step.id);
        return {
          ...step,
          position: n?.position ?? step.position,
        };
      });
      const outEdges: FlowDocument["edges"] = edges.map((e: Edge) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));
      const nextFlow: FlowDocument = {
        ...flow,
        steps,
        edges: outEdges,
        updatedAt: new Date().toISOString(),
      };
      const nextStore: StudioStore = {
        ...store,
        flows: store.flows.map((f) => (f.id === flow.id ? nextFlow : f)),
      };
      const res = await fetch("/api/studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextStore),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text.trim() || `HTTP ${res.status}`);
      }
      onSaved?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="border-border h-[min(60vh,560px)] w-full min-h-[400px] rounded-lg border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap />
          <FitViewEffect nodeCount={nodes.length} />
        </ReactFlow>
      </div>
      {saveError ? (
        <p className="text-destructive text-sm" role="alert">
          {saveError}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={saving}
        onClick={() => void saveLayout()}
      >
        {saving ? "Saving…" : "Save layout to studio"}
      </Button>
    </div>
  );
}

export function FlowEditor({
  flow,
  store,
  onSaved,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner flow={flow} store={store} onSaved={onSaved} />
    </ReactFlowProvider>
  );
}
