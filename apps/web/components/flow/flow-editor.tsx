"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
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
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RunChat,
  type FlowCanvasRunPhase,
} from "@/app/(studio)/run/run-chat";
import { FlowQuickSwitch } from "@/components/studio/flow-quick-switch";
import { cn } from "@/lib/utils";
import type {
  FlowDocument,
  FlowNodeType,
  FlowStep,
  FlowValidationIssue,
  StudioStore,
} from "@repo/shared";
import { validateFlowSteps } from "@repo/shared";
import {
  AlertTriangle,
  Folder,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Terminal,
  BarChart3,
  Play,
  ChevronDown,
  ChevronUp,
  Search,
  Bell,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  applyPositionsToSteps,
  buildFlowGraph,
  stepToNodeData,
  type StepNodeData,
} from "@/lib/flow-graph";
import {
  createDefaultFlowStep,
  FLOW_NODE_TYPE_OPTIONS,
} from "@/lib/flow-default-step";
import { useStudioResourceStatus } from "@/hooks/use-studio-resource-status";
import { FlowNodeConfigPanel } from "./flow-node-config-panel";
import { StepFlowNode } from "./step-flow-node";

const nodeTypes = { step: StepFlowNode };

const defaultEdgeOptions = {
  style: { stroke: "#5cf4ff", strokeWidth: 2.5 },
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

function NewNodeToolbar({
  flowId,
  maxOrder,
  paletteType,
  onPaletteTypeChange,
  onCreate,
}: {
  flowId: string;
  maxOrder: number;
  paletteType: FlowNodeType;
  onPaletteTypeChange: (t: FlowNodeType) => void;
  onCreate: (step: FlowStep) => void;
}) {
  const rf = useReactFlow();
  return (
    <div className="border-outline-variant/10 border-t px-3 pt-4 pb-2">
      <label className="mb-2 block">
        <span className="text-muted-foreground mb-1 block font-mono text-[9px] uppercase tracking-wider">
          Node type
        </span>
        <select
          className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none"
          value={paletteType}
          onChange={(e) => onPaletteTypeChange(e.target.value as FlowNodeType)}
          aria-label="Node type to add"
        >
          {FLOW_NODE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="bg-primary text-primary-foreground hover:brightness-110 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95"
        onClick={() => {
          const b = document
            .querySelector(".flow-builder-canvas .react-flow__viewport")
            ?.getBoundingClientRect();
          const x = b ? b.left + b.width * 0.45 : window.innerWidth * 0.5;
          const y = b ? b.top + b.height * 0.35 : window.innerHeight * 0.4;
          const pos = rf.screenToFlowPosition({ x, y });
          const id = nanoid(10);
          const step = createDefaultFlowStep(paletteType, id, maxOrder + 1, pos);
          onCreate(step);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Add node
      </button>
      <p className="text-muted-foreground mt-2 text-center font-mono text-[10px] uppercase tracking-wider">
        Flow · {flowId.slice(0, 8)}…
      </p>
    </div>
  );
}

function FlowEditorInner({
  flow,
  store,
  onSaved,
  onRefresh,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
  onRefresh?: () => void;
}) {
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [paletteType, setPaletteType] = useState<FlowNodeType>("llm");
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [canvasRunPhase, setCanvasRunPhase] =
    useState<FlowCanvasRunPhase>("idle");
  const { data: resourceStatus, loading: resourceStatusLoading } =
    useStudioResourceStatus();

  const onCanvasRunPhaseChange = useCallback((phase: FlowCanvasRunPhase) => {
    setCanvasRunPhase(phase);
  }, []);

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
  }, [flow.id, flow.updatedAt, setNodes, setEdges]);

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
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

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

  const runHref = `/run?flowId=${encodeURIComponent(flow.id)}`;

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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-20">
      <header className="border-outline-variant/15 z-50 flex h-14 w-full shrink-0 items-center justify-between gap-4 border-b bg-surface px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-foreground shrink-0 text-lg font-black tracking-tighter sm:text-xl">
              GENUI
            </span>
            <span
              className="text-muted-foreground hidden max-w-[12rem] truncate border-l border-border pl-3 text-xs font-medium sm:inline sm:max-w-xs sm:text-sm"
              title={flow.name}
            >
              {flow.name}
            </span>
          </div>
          <nav
            className="flex shrink-0 items-center gap-3 text-sm sm:gap-6"
            aria-label="Flow workspace"
          >
            <span className="border-primary text-primary border-b-2 pb-0.5 font-semibold">
              Editor
            </span>
            <Link
              href={`/flows/${encodeURIComponent(flow.id)}/settings`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Flow settings
            </Link>
            <Link
              href={runHref}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Runner
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              className="border-outline-variant/20 bg-surface-container-lowest focus:border-primary focus:ring-primary w-64 rounded-xl border py-1.5 pr-9 pl-4 text-xs outline-none transition-all focus:ring-1"
              placeholder="Search components…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search nodes"
            />
            <Search className="text-muted-foreground pointer-events-none absolute top-1.5 right-3 size-4" />
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Settings"
          >
            <Settings className="size-5" />
          </button>
          <div
            className="border-outline-variant/30 bg-surface-container-highest size-8 shrink-0 overflow-hidden rounded-full border"
            aria-hidden
          />
        </div>
      </header>

      <div className="bg-surface-container-low border-outline-variant/10 flex h-11 shrink-0 items-center justify-between border-b px-4 sm:h-12 sm:px-6">
        <div className="text-foreground flex items-center gap-3 text-xs sm:gap-4">
          <Link
            href={`/flows/${encodeURIComponent(flow.id)}/settings`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md font-medium transition-colors"
          >
            <SlidersHorizontal className="size-4 shrink-0 opacity-80" aria-hidden />
            Flow settings
          </Link>
          <div className="bg-border h-4 w-px shrink-0" aria-hidden />
          <Link
            href="/flows"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md font-medium transition-colors"
          >
            <Folder className="size-4 shrink-0 opacity-80" aria-hidden />
            All flows
          </Link>
          <div className="bg-border h-4 w-px shrink-0" aria-hidden />
          <FlowQuickSwitch
            mode="editor"
            flows={flowOptions}
            currentFlowId={flow.id}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-1">
            <select
              className="border-outline-variant/20 bg-surface-container-lowest text-foreground max-w-[7rem] rounded border px-1 py-1 text-[9px]"
              value={paletteType}
              onChange={(e) =>
                setPaletteType(e.target.value as FlowNodeType)
              }
              aria-label="Node type to add"
            >
              {FLOW_NODE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="bg-primary/15 text-primary hover:bg-primary/25 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase"
              onClick={() => {
                const step = createDefaultFlowStep(
                  paletteType,
                  nanoid(10),
                  maxOrder + 1,
                  { x: 360, y: 200 },
                );
                handleAddStep(step);
              }}
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </button>
          </div>
          <button
            type="button"
            className="bg-surface-container-highest/50 text-muted-foreground hover:bg-surface-container-highest flex items-center gap-2 rounded px-3 py-1.5 text-[10px] uppercase tracking-widest transition-all active:scale-95"
            onClick={() => onRefresh?.()}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            className={cn(
              "relative flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95",
              validationPanelOpen
                ? "bg-destructive/15 text-destructive"
                : validationResult.ok
                  ? "bg-surface-container-highest/50 text-muted-foreground hover:bg-surface-container-highest"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/15",
            )}
            aria-expanded={validationPanelOpen}
            aria-controls="flow-editor-validation-panel"
            onClick={() => setValidationPanelOpen((o) => !o)}
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            Validation
            {!validationResult.ok ? (
              <span className="bg-destructive text-destructive-foreground min-w-[1.1rem] rounded px-1 py-0.5 text-center font-mono text-[9px]">
                {validationResult.issues.length}
              </span>
            ) : null}
            {validationPanelOpen ? (
              <ChevronDown className="size-3.5" aria-hidden />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95",
              testPanelOpen
                ? "bg-primary/20 text-primary"
                : "bg-surface-container-highest/50 text-muted-foreground hover:bg-surface-container-highest",
            )}
            aria-expanded={testPanelOpen}
            aria-controls="flow-editor-test-run-panel"
            onClick={() => setTestPanelOpen((o) => !o)}
          >
            <Terminal className="size-3.5" aria-hidden />
            Test run
            {testPanelOpen ? (
              <ChevronDown className="size-3.5" aria-hidden />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="sr-only" aria-live="polite">
          {runStatusLabel}
        </span>
        <span className="sr-only" aria-live="polite">
          {validationResult.ok
            ? "Flow validation passed."
            : `${validationResult.issues.length} flow validation issue(s).`}
        </span>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "flow-builder-canvas bg-surface-container-lowest ring-outline-variant/30 relative flex min-h-0 w-full flex-1 flex-col rounded-lg ring-1",
              canvasRunPhase === "running" && "flow-editor-canvas-glow-running",
              canvasRunPhase === "error" && "flow-editor-canvas-glow-error",
              canvasRunPhase === "success" && "flow-editor-canvas-glow-success",
            )}
          >
            <ReactFlow
              className="!bg-transparent h-full min-h-[min(320px,50dvh)] w-full flex-1 [&_.react-flow__pane]:cursor-grab [&_.react-flow__pane:active]:cursor-grabbing"
              nodes={displayNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => {
                setSelectedStepId(n.id);
                setPanelOpen(true);
              }}
              onPaneClick={() => {
                setSelectedStepId(null);
                setPanelOpen(false);
              }}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineStyle={{ stroke: "#9ae8ff", strokeWidth: 2.5 }}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background
                id="flow-dots"
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1.35}
                color="rgba(148, 163, 184, 0.42)"
              />
              <Controls className="!bg-surface-container-high !border-outline-variant/20 !shadow-lg" />
              <Panel
                position="top-left"
                className="!m-4 hidden w-56 md:block"
              >
                <div
                  className="border-outline-variant/10 bg-surface-container-low rounded-lg border shadow-lg"
                  aria-label="Flow actions"
                >
                  <div className="px-4 py-4">
                    <div className="text-foreground text-sm font-bold">
                      {flow.name}
                    </div>
                    <div className="text-muted-foreground mt-1 text-[10px] tracking-wide">
                      Flow builder
                    </div>
                  </div>
                  <NewNodeToolbar
                    flowId={flow.id}
                    maxOrder={maxOrder}
                    paletteType={paletteType}
                    onPaletteTypeChange={setPaletteType}
                    onCreate={handleAddStep}
                  />
                </div>
              </Panel>
              <FitViewEffect nodeCount={displayNodes.filter((n) => !n.hidden).length} />
            </ReactFlow>
          </div>

          <div className="pointer-events-none absolute bottom-8 left-8 z-30">
            <Button
              type="button"
              variant="synth"
              disabled={saving}
              className="pointer-events-auto rounded-full px-6 py-6 shadow-[0_10px_30px_rgba(0,218,243,0.25)]"
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
              className="text-destructive absolute bottom-24 left-8 z-30 max-w-sm text-sm"
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
          className={cn(
            "border-outline-variant/15 bg-surface-container-low/95 shrink-0 backdrop-blur-md",
            validationPanelOpen
              ? "flex max-h-[min(36vh,320px)] min-h-[120px] flex-col border-t p-3"
              : "hidden",
          )}
        >
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
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

        <div
          id="flow-editor-test-run-panel"
          role="region"
          aria-label="Test run against this flow"
          className={cn(
            "border-outline-variant/15 bg-surface-container-low/95 shrink-0 backdrop-blur-md",
            testPanelOpen
              ? "flex max-h-[min(42vh,420px)] min-h-[200px] flex-col border-t p-3"
              : "hidden",
          )}
        >
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Same runner as{" "}
              <Link
                href={runHref}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Run page
              </Link>
              — messages stay in this session until you close the panel.
            </p>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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

        <FlowNodeConfigPanel
          step={selectedStep}
          open={panelOpen && selectedStep !== null}
          prompts={store.prompts}
          tools={store.tools}
          resourceStatus={resourceStatus}
          resourceStatusLoading={resourceStatusLoading}
          validationIssues={selectedStepValidationIssues}
          onClose={() => setPanelOpen(false)}
          onApply={handleApplyPatch}
        />
      </div>

      <nav
        className="border-outline-variant/15 bg-background/80 fixed bottom-0 z-50 hidden w-full items-center justify-center gap-12 border-t py-3 shadow-[0_-4px_20px_rgba(0,229,255,0.05)] backdrop-blur-xl md:flex"
        aria-label="Flow quick actions"
      >
        <Link
          href={runHref}
          className="text-primary bg-primary/10 flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] font-bold uppercase transition-all active:scale-90"
        >
          <Play className="size-5" aria-hidden />
          Run flow
        </Link>
        <button
          type="button"
          className={cn(
            "relative flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] font-bold uppercase transition-all active:scale-90",
            validationPanelOpen
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground hover:bg-muted hover:text-primary",
          )}
          onClick={() => setValidationPanelOpen((o) => !o)}
          aria-expanded={validationPanelOpen}
        >
          <AlertTriangle className="size-5" aria-hidden />
          Validation
          {!validationResult.ok ? (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 min-w-[14px] rounded-full px-1 text-center font-mono text-[8px] leading-tight">
              {validationResult.issues.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-primary flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] font-bold uppercase transition-all active:scale-90"
          onClick={() => setTestPanelOpen((o) => !o)}
          aria-expanded={testPanelOpen}
        >
          <Terminal className="size-5" aria-hidden />
          Test run
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-primary flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] uppercase transition-all active:scale-90 disabled:opacity-50"
          disabled={saving}
          onClick={() => void persistFromState()}
        >
          <Save className="size-5" aria-hidden />
          Save
        </button>
        <Link
          href="/mcp"
          className="text-muted-foreground hover:bg-muted hover:text-primary flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] uppercase transition-all"
        >
          <Terminal className="size-5" aria-hidden />
          Terminal
        </Link>
        <Link
          href="/analytics"
          className="text-muted-foreground hover:bg-muted hover:text-primary flex flex-col items-center gap-1 rounded-xl px-4 py-1 text-[10px] uppercase transition-all"
        >
          <BarChart3 className="size-5" aria-hidden />
          Metrics
        </Link>
      </nav>
    </div>
  );
}

export function FlowEditor({
  flow,
  store,
  onSaved,
  onRefresh,
}: {
  flow: FlowDocument;
  store: StudioStore;
  onSaved?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner
        flow={flow}
        store={store}
        onSaved={onSaved}
        onRefresh={onRefresh}
      />
    </ReactFlowProvider>
  );
}
