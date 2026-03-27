"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnReconnect,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RunChat } from "@/app/(studio)/run/run-chat";
import type { FlowCanvasRunPhase } from "@/app/(studio)/run/run-types";
import { FlowCanvasInteractionDialog } from "@/components/flow/flow-canvas-interaction-dialog";
import { FlowEditorCanvasRail } from "@/components/flow/flow-editor-canvas-rail";
import { FlowEditorTopHud } from "@/components/flow/flow-editor-top-hud";
import { FlowZoomIndicator } from "@/components/flow/flow-zoom-indicator";
import { FlowNodeQuickAddPanel } from "@/components/flow/flow-node-quick-add-panel";
import { FlowSettingsDialog } from "@/components/studio/flow-settings-dialog";
import { cn } from "@/lib/utils";
import type {
  FlowDocument,
  FlowStep,
  FlowValidationIssue,
  StudioStore,
} from "@repo/shared";
import { validateFlowSteps } from "@repo/shared";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  applyPositionsToSteps,
  buildFlowGraph,
  stepToNodeData,
  type StepNodeData,
} from "@/lib/flow-graph";
import {
  createDefaultFlowStep,
  DEFAULT_FLOW_NODE_TYPE,
} from "@/lib/flow-default-step";
import { useFlowCanvasInteractionSettings } from "@/hooks/use-flow-canvas-interaction-settings";
import { useStudioResourceStatus } from "@/hooks/use-studio-resource-status";
import { flowCanvasInteractionToReactFlow } from "@/lib/flow-canvas-interaction";
import { FlowEdgeConfigPanel } from "./flow-edge-config-panel";
import { FlowNodeConfigPanel } from "./flow-node-config-panel";
import { StepFlowNode } from "./step-flow-node";

const nodeTypes = { step: StepFlowNode };

const defaultEdgeOptions = {
  style: { stroke: "#5cf4ff", strokeWidth: 2.5 },
  labelStyle: { fill: "#e2e8f0", fontSize: 11, fontWeight: 500 },
  labelBgStyle: { fill: "rgba(15, 23, 42, 0.92)", fillOpacity: 1 },
};

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

function FlowEditorInner({
  flow,
  store,
  onSaved,
  onRefresh,
  openFlowSettingsFromQuery = false,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
  onRefresh?: () => void;
  openFlowSettingsFromQuery?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [flowSettingsOpen, setFlowSettingsOpen] = useState(false);

  useEffect(() => {
    if (!openFlowSettingsFromQuery) return;
    setFlowSettingsOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    if (!next.has("flowSettings")) return;
    next.delete("flowSettings");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [openFlowSettingsFromQuery, pathname, router, searchParams]);

  const [stepsSnapshot, setStepsSnapshot] = useState<FlowStep[]>(flow.steps);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>(
    buildFlowGraph(flow).nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildFlowGraph(flow).edges,
  );

  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [minimapVisible, setMinimapVisible] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [canvasRunPhase, setCanvasRunPhase] =
    useState<FlowCanvasRunPhase>("idle");
  const [canvasInteractionOpen, setCanvasInteractionOpen] = useState(false);
  const { settings: canvasInteraction, updateSettings, resetToDefaults } =
    useFlowCanvasInteractionSettings();
  const rfCanvas = useMemo(
    () => flowCanvasInteractionToReactFlow(canvasInteraction),
    [canvasInteraction],
  );
  const { data: resourceStatus, loading: resourceStatusLoading } =
    useStudioResourceStatus();

  const onCanvasRunPhaseChange = useCallback((phase: FlowCanvasRunPhase) => {
    setCanvasRunPhase(phase);
  }, []);

  const onFlowSelectionChange = useCallback(
    ({
      nodes: selNodes,
      edges: selEdges,
    }: OnSelectionChangeParams<Node<StepNodeData>>) => {
      if (selEdges.length > 0) {
        setSelectedEdgeId(selEdges[0].id);
        setSelectedStepId(null);
        setPanelOpen(false);
        return;
      }
      if (selNodes.length === 0) {
        setSelectedStepId(null);
        setPanelOpen(false);
        setSelectedEdgeId(null);
        return;
      }
      setSelectedEdgeId(null);
      setSelectedStepId(selNodes[0].id);
      setPanelOpen(true);
    },
    [],
  );

  useEffect(() => {
    setCanvasRunPhase("idle");
    setTestPanelOpen(false);
    setValidationPanelOpen(false);
  }, [flow.id]);

  const flowRef = useRef(flow);
  flowRef.current = flow;

  useEffect(() => {
    const f = flowRef.current;
    setStepsSnapshot(f.steps);
    const g = buildFlowGraph({ ...f, steps: f.steps });
    setNodes(g.nodes);
    setEdges(g.edges);
    setSelectedStepId(null);
    setSelectedEdgeId(null);
  }, [flow.id, flow.updatedAt, setNodes, setEdges]);

  useEffect(() => {
    if (selectedEdgeId && !edges.some((e) => e.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

  const validationResult = useMemo(
    () => validateFlowSteps(stepsSnapshot),
    [stepsSnapshot],
  );

  const issuesByStepId = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const i of validationResult.issues) {
      const list = m.get(i.stepId) ?? [];
      list.push(i.message);
      m.set(i.stepId, list);
    }
    return m;
  }, [validationResult.issues]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (validationResult.ok) return;
    console.warn("[flow-validation]", {
      issueCount: validationResult.issues.length,
      issues: validationResult.issues.map(
        (i: FlowValidationIssue) =>
          `[${i.stepType}] ${i.stepId}: ${i.message}`,
      ),
    });
  }, [validationResult]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const q = search.trim().toLowerCase();
        const hay = `${n.data.detail} ${n.data.title} ${n.data.stepType}`.toLowerCase();
        const msgs = issuesByStepId.get(n.id);
        const data: StepNodeData = {
          ...n.data,
          validationMessages:
            msgs && msgs.length > 0 ? msgs : undefined,
        };
        return {
          ...n,
          data,
          hidden: Boolean(q) && !hay.includes(q),
        };
      }),
    [nodes, search, issuesByStepId],
  );

  const selectedStep = useMemo(
    () => stepsSnapshot.find((s) => s.id === selectedStepId) ?? null,
    [stepsSnapshot, selectedStepId],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const selectedEdgeSourceTitle = useMemo(() => {
    if (!selectedEdge) return "";
    const s = stepsSnapshot.find((x) => x.id === selectedEdge.source);
    return s ? stepToNodeData(s).title : selectedEdge.source;
  }, [selectedEdge, stepsSnapshot]);

  const selectedEdgeTargetTitle = useMemo(() => {
    if (!selectedEdge) return "";
    const s = stepsSnapshot.find((x) => x.id === selectedEdge.target);
    return s ? stepToNodeData(s).title : selectedEdge.target;
  }, [selectedEdge, stepsSnapshot]);

  const selectedStepValidationIssues = useMemo(
    () =>
      selectedStepId
        ? validationResult.issues.filter((i) => i.stepId === selectedStepId)
        : [],
    [validationResult.issues, selectedStepId],
  );

  const maxOrder = useMemo(
    () => stepsSnapshot.reduce((m, s) => Math.max(m, s.order), -1),
    [stepsSnapshot],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e-${nanoid(8)}`,
            style: defaultEdgeOptions.style,
            labelStyle: defaultEdgeOptions.labelStyle,
            labelBgStyle: defaultEdgeOptions.labelBgStyle,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, newConnection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  const handleEdgeLabelChange = useCallback(
    (label: string) => {
      if (!selectedEdgeId) return;
      const trimmed = label.trim();
      setEdges((eds) =>
        eds.map((e) =>
          e.id === selectedEdgeId
            ? {
                ...e,
                label: trimmed.length > 0 ? trimmed : undefined,
              }
            : e,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges]);

  const handleEdgePanelClose = useCallback(() => {
    setSelectedEdgeId(null);
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setEdges]);

  const persistFromState = useCallback(async () => {
    setSaveError(null);
    const steps = applyPositionsToSteps(stepsSnapshot, nodes);
    const preSaveValidation = validateFlowSteps(steps);
    if (!preSaveValidation.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[flow-validation] save blocked", preSaveValidation.issues);
      }
      setSaveError(
        `Fix ${preSaveValidation.issues.length} validation issue(s) before saving. Open the Validation panel for details.`,
      );
      setValidationPanelOpen(true);
      return;
    }
    setSaving(true);
    try {
      const outEdges: FlowDocument["edges"] = edges.map((e: Edge) => {
        const label =
          typeof e.label === "string" && e.label.trim().length > 0
            ? e.label.trim()
            : undefined;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          ...(label ? { label } : {}),
        };
      });
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
  }, [edges, flow, nodes, onSaved, stepsSnapshot, store]);

  const handleAddStep = useCallback(
    (step: FlowStep) => {
      setStepsSnapshot((prev) => [...prev, step]);
      setNodes((prev) => [
        ...prev,
        {
          id: step.id,
          type: "step",
          position: step.position ?? { x: 0, y: 0 },
          data: stepToNodeData(step),
        },
      ]);
      setSelectedStepId(step.id);
      setPanelOpen(true);
    },
    [setNodes],
  );

  const handleApplyPatch = useCallback(
    (patch: Partial<FlowStep>) => {
      if (!selectedStepId) return;
      let updated: FlowStep | undefined;
      setStepsSnapshot((prev) => {
        const current = prev.find((s) => s.id === selectedStepId);
        if (!current) return prev;

        const newType = patch.type;
        const patchKeys = Object.keys(patch);
        const isTypeOnlyChange =
          newType !== undefined &&
          newType !== current.type &&
          patchKeys.length === 1 &&
          patchKeys[0] === "type";

        if (isTypeOnlyChange) {
          const pos = current.position ?? { x: 0, y: 0 };
          let nextStep = createDefaultFlowStep(
            newType,
            current.id,
            current.order,
            pos,
          );
          if (current.displayLabel) {
            nextStep = { ...nextStep, displayLabel: current.displayLabel };
          }
          const next = prev.map((s) =>
            s.id === selectedStepId ? nextStep : s,
          );
          updated = next.find((s) => s.id === selectedStepId);
          return next;
        }

        const next = prev.map((s) =>
          s.id === selectedStepId ? { ...s, ...patch } : s,
        );
        updated = next.find((s) => s.id === selectedStepId);
        return next;
      });
      if (updated) {
        const step = updated;
        setNodes((ns) =>
          ns.map((n) =>
            n.id === selectedStepId
              ? { ...n, data: stepToNodeData(step) }
              : n,
          ),
        );
      }
    },
    [selectedStepId, setNodes],
  );

  const runHref = `/flows/${encodeURIComponent(flow.id)}`;

  const flowOptions = useMemo(
    () => store.flows.map((f) => ({ id: f.id, name: f.name })),
    [store.flows],
  );

  const runStatusLabel =
    canvasRunPhase === "running"
      ? "Agent run in progress"
      : canvasRunPhase === "error"
        ? "Agent run failed"
        : canvasRunPhase === "success"
          ? "Agent run completed"
          : "";

  const closePanels = useCallback(() => {
    setValidationPanelOpen(false);
    setTestPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!validationPanelOpen && !testPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setValidationPanelOpen(false);
      setTestPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [validationPanelOpen, testPanelOpen]);

  const bottomSheetOpen = validationPanelOpen || testPanelOpen;

  return (
    <TooltipProvider delay={350}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <FlowEditorTopHud
        flowName={flow.name}
        flowId={flow.id}
        runHref={runHref}
        onOpenFlowSettings={() => setFlowSettingsOpen(true)}
        search={search}
        onSearchChange={setSearch}
        flowOptions={flowOptions}
        onRefresh={onRefresh}
        validationPanelOpen={validationPanelOpen}
        onValidationPanelToggle={() => {
          setValidationPanelOpen((o) => {
            const next = !o;
            if (next) setTestPanelOpen(false);
            return next;
          });
        }}
        validationOk={validationResult.ok}
        issueCount={validationResult.issues.length}
        testPanelOpen={testPanelOpen}
        onTestPanelToggle={() => {
          setTestPanelOpen((o) => {
            const next = !o;
            if (next) setValidationPanelOpen(false);
            return next;
          });
        }}
        onMobileAdd={() => {
          const step = createDefaultFlowStep(
            DEFAULT_FLOW_NODE_TYPE,
            nanoid(10),
            maxOrder + 1,
            { x: 360, y: 200 },
          );
          handleAddStep(step);
        }}
        onClosePanels={closePanels}
        onSave={() => void persistFromState()}
        saving={saving}
        onOpenCanvasInteraction={() => setCanvasInteractionOpen(true)}
      />

      <FlowCanvasInteractionDialog
        open={canvasInteractionOpen}
        onOpenChange={setCanvasInteractionOpen}
        settings={canvasInteraction}
        onChange={updateSettings}
        onReset={resetToDefaults}
      />

      <FlowSettingsDialog
        flowId={flow.id}
        open={flowSettingsOpen}
        onOpenChange={setFlowSettingsOpen}
        onFlowDeleted={() => router.push("/flows")}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="sr-only" aria-live="polite">
          {runStatusLabel}
        </span>
        <span className="sr-only" aria-live="polite">
          {validationResult.ok
            ? "Flow validation passed."
            : `${validationResult.issues.length} flow validation issue(s).`}
        </span>

        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col",
            bottomSheetOpen && "pb-[min(44vh,380px)] md:pb-[min(40vh,360px)]",
          )}
        >
          <div
            className={cn(
              "flow-builder-canvas bg-surface-container-lowest ring-outline-variant/30 relative flex min-h-0 w-full flex-1 flex-col rounded-lg ring-1",
              canvasRunPhase === "running" && "flow-editor-canvas-glow-running",
              canvasRunPhase === "error" && "flow-editor-canvas-glow-error",
              canvasRunPhase === "success" && "flow-editor-canvas-glow-success",
            )}
          >
            <ReactFlow
              className={cn(
                "!bg-transparent h-full min-h-[min(320px,50dvh)] w-full flex-1",
                rfCanvas.paneCursorClassName,
              )}
              aria-label="Flow builder canvas"
              nodes={displayNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onFlowSelectionChange}
              onNodeClick={(_, n) => {
                setSelectedEdgeId(null);
                setSelectedStepId(n.id);
                setPanelOpen(true);
              }}
              onPaneClick={() => {
                setSelectedStepId(null);
                setPanelOpen(false);
                setSelectedEdgeId(null);
              }}
              onReconnect={onReconnect}
              deleteKeyCode={["Backspace", "Delete"]}
              edgesReconnectable
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineStyle={{ stroke: "#9ae8ff", strokeWidth: 2.5 }}
              fitView
              panOnDrag={rfCanvas.panOnDrag}
              zoomOnScroll={rfCanvas.zoomOnScroll}
              panOnScroll={rfCanvas.panOnScroll}
              zoomOnPinch
              zoomOnDoubleClick={false}
              selectionOnDrag={rfCanvas.selectionOnDrag}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                id="flow-dots"
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1.35}
                color="rgba(148, 163, 184, 0.42)"
              />
              <FlowEditorCanvasRail
                minimapVisible={minimapVisible}
                onMinimapToggle={() => setMinimapVisible((v) => !v)}
              />
              <FlowZoomIndicator />
              <FlowNodeQuickAddPanel
                maxOrder={maxOrder}
                onCreate={handleAddStep}
              />
              <FitViewEffect
                nodeCount={displayNodes.filter((n) => !n.hidden).length}
              />
            </ReactFlow>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute right-3 left-3 z-30 sm:right-auto sm:left-8",
              bottomSheetOpen
                ? "bottom-[min(46vh,400px)] sm:bottom-[min(42vh,380px)]"
                : "bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-8",
            )}
          >
            <Button
              type="button"
              variant="synth"
              disabled={saving}
              className="pointer-events-auto w-full rounded-full px-4 py-5 shadow-[0_10px_30px_rgba(0,218,243,0.25)] sm:w-auto sm:px-6 sm:py-6"
              onClick={() => void persistFromState()}
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              Save layout to studio
            </Button>
          </div>

          {saveError ? (
            <p
              className={cn(
                "text-destructive absolute right-3 left-3 z-30 max-w-full min-w-0 break-words text-sm sm:right-auto sm:left-8 sm:max-w-sm",
                bottomSheetOpen
                  ? "bottom-[calc(min(46vh,400px)+4.5rem)]"
                  : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
              )}
              role="alert"
            >
              {saveError}
            </p>
          ) : null}
        </div>

        <div
          id="flow-editor-validation-panel"
          role="region"
          aria-label="Flow validation log"
          aria-hidden={!validationPanelOpen}
          inert={!validationPanelOpen}
          className={cn(
            "border-outline-variant/20 bg-surface-container-low/98 absolute right-2 bottom-2 left-2 z-40 flex max-h-[min(42vh,380px)] min-h-[100px] flex-col overflow-hidden rounded-2xl border shadow-[0_-8px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[opacity,transform] duration-200 md:right-4 md:left-4",
            validationPanelOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 p-3 pb-0">
            <p className="text-muted-foreground text-xs">
              UX checks run on every edit and before save. Failed steps are
              outlined on the canvas; details mirror the browser console in dev (
              <code className="text-foreground/80">[flow-validation]</code>
              ).
            </p>
            {validationResult.ok ? (
              <span className="text-emerald-400/90 font-mono text-[10px] uppercase">
                All checks passed
              </span>
            ) : (
              <span className="text-destructive font-mono text-[10px] uppercase">
                {validationResult.issues.length} issue(s)
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3">
            {validationResult.ok ? (
              <p className="text-muted-foreground text-sm">
                No blocking issues for system/user prompts, models, tools, or
                gate/output text.
              </p>
            ) : (
              <ul
                className="border-outline-variant/20 bg-surface-container-highest/40 font-mono text-[11px] leading-relaxed overflow-y-auto rounded-lg border p-3"
                role="list"
              >
                {validationResult.issues.map((issue, idx) => (
                  <li key={`${issue.stepId}-${issue.field ?? "x"}-${idx}`}>
                    <span className="text-destructive">{issue.stepId}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      ({issue.stepType}
                      {issue.field ? ` · ${issue.field}` : ""}):{" "}
                    </span>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          id="flow-editor-test-run-panel"
          role="region"
          aria-label="Test run against this flow"
          aria-hidden={!testPanelOpen}
          inert={!testPanelOpen}
          className={cn(
            "border-outline-variant/20 bg-surface-container-low/98 absolute right-2 bottom-2 left-2 z-40 flex max-h-[min(46vh,420px)] min-h-[180px] flex-col overflow-hidden rounded-2xl border shadow-[0_-8px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[opacity,transform] duration-200 md:right-4 md:left-4",
            testPanelOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 p-3 pb-0">
            <p className="text-muted-foreground text-xs">
              Same runner as the{" "}
              <Link
                href={runHref}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                full flow workspace
              </Link>
              — messages stay in this session until you close the panel.
            </p>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3">
            <RunChat
              key={flow.id}
              flowId={flow.id}
              variant="panel"
              visible={testPanelOpen}
              suspendWhenHidden
              onCanvasRunPhaseChange={onCanvasRunPhaseChange}
            />
          </div>
        </div>

        <FlowEdgeConfigPanel
          edge={selectedEdge}
          open={selectedEdgeId !== null && selectedEdge !== null}
          sourceTitle={selectedEdgeSourceTitle}
          targetTitle={selectedEdgeTargetTitle}
          onClose={handleEdgePanelClose}
          onLabelChange={handleEdgeLabelChange}
          onDelete={handleDeleteSelectedEdge}
        />

        <FlowNodeConfigPanel
          step={selectedStep}
          open={panelOpen && selectedStep !== null && selectedEdgeId === null}
          prompts={store.prompts}
          tools={store.tools}
          resourceStatus={resourceStatus}
          resourceStatusLoading={resourceStatusLoading}
          validationIssues={selectedStepValidationIssues}
          onClose={() => setPanelOpen(false)}
          onApply={handleApplyPatch}
        />
      </div>
    </div>
    </TooltipProvider>
  );
}

export function FlowEditor({
  flow,
  store,
  onSaved,
  onRefresh,
  openFlowSettingsFromQuery = false,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
  onRefresh?: () => void;
  openFlowSettingsFromQuery?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner
        flow={flow}
        store={store}
        onSaved={onSaved}
        onRefresh={onRefresh}
        openFlowSettingsFromQuery={openFlowSettingsFromQuery}
      />
    </ReactFlowProvider>
  );
}
