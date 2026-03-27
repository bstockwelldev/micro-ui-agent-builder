"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import { cn } from "@/lib/utils";
import type { StepNodeData } from "@/lib/flow-graph";
import {
  Bot,
  Brain,
  ClipboardCheck,
  Code2,
  FileOutput,
  GitBranch,
  Handshake,
  PersonStanding,
  RefreshCw,
  Shield,
  Wrench,
} from "lucide-react";

function TypeIcon({ type }: { type: StepNodeData["stepType"] }) {
  const cls = "size-4 shrink-0";
  switch (type) {
    case "system":
      return <Bot className={cn(cls, "text-primary")} aria-hidden />;
    case "llm":
      return <Brain className={cn(cls, "text-secondary-foreground")} aria-hidden />;
    case "tool_loop":
      return <RefreshCw className={cn(cls, "text-cyan-300/95")} aria-hidden />;
    case "code_exec":
      return <Code2 className={cn(cls, "text-fuchsia-300/90")} aria-hidden />;
    case "user":
      return <PersonStanding className={cn(cls, "text-muted-foreground")} aria-hidden />;
    case "tool":
      return <Wrench className={cn(cls, "text-muted-foreground")} aria-hidden />;
    case "human_gate":
      return <Handshake className={cn(cls, "text-amber-400/90")} aria-hidden />;
    case "output":
      return <FileOutput className={cn(cls, "text-sky-400/90")} aria-hidden />;
    case "guardrail":
      return <Shield className={cn(cls, "text-emerald-400/90")} aria-hidden />;
    case "rubric":
      return <ClipboardCheck className={cn(cls, "text-violet-400/90")} aria-hidden />;
    case "branch":
      return <GitBranch className={cn(cls, "text-orange-400/90")} aria-hidden />;
  }
}

export function StepFlowNode({
  data,
  selected,
  id: nodeId,
}: NodeProps<Node<StepNodeData>>) {
  const validationMessages = data.validationMessages ?? [];
  const hasValidationError = validationMessages.length > 0;
  const isSystem = data.stepType === "system";
  const isLlm = data.stepType === "llm";
  const isToolLoop = data.stepType === "tool_loop";
  const isCodeExec = data.stepType === "code_exec";
  const isPrimaryModel = isLlm || isToolLoop;
  const isUser = data.stepType === "user";
  const isGuardrail = data.stepType === "guardrail";
  const isRubric = data.stepType === "rubric";
  const isBranch = data.stepType === "branch";
  const isHumanGate = data.stepType === "human_gate";
  const isOutput = data.stepType === "output";
  const isTool = data.stepType === "tool";
  const isPreflightStyle = isGuardrail || isRubric || isBranch;

  return (
    <div
      className={cn(
        "text-card-foreground w-64 rounded-xl border p-4 text-sm shadow-xl transition-[box-shadow,opacity,border-color]",
        hasValidationError &&
          "border-destructive/80 shadow-[0_0_0_2px_rgba(239,68,68,0.35),0_8px_24px_rgba(0,0,0,0.4)] ring-destructive/40 ring-2",
        isSystem &&
          "glass-panel border-primary/45 shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
        isUser &&
          "glass-panel border-white/18 opacity-95 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:opacity-100",
        isPrimaryModel &&
          "bg-surface-container-highest border-2 border-primary/55 shadow-[0_0_36px_rgba(0,229,255,0.22),0_6px_20px_rgba(0,0,0,0.35)]",
        isPrimaryModel && selected && "border-primary",
        isCodeExec &&
          "bg-surface-container-highest border-2 border-fuchsia-500/40 shadow-[0_0_28px_rgba(217,70,239,0.12),0_6px_20px_rgba(0,0,0,0.35)]",
        isCodeExec && selected && "border-fuchsia-400/70",
        isGuardrail &&
          "bg-surface-container-highest border-emerald-400/45 shadow-[0_0_28px_rgba(52,211,153,0.14),0_6px_20px_rgba(0,0,0,0.35)]",
        isRubric &&
          "bg-surface-container-highest border-violet-400/45 shadow-[0_0_28px_rgba(167,139,250,0.14),0_6px_20px_rgba(0,0,0,0.35)]",
        isBranch &&
          "bg-surface-container-highest border-orange-400/45 shadow-[0_0_28px_rgba(251,146,60,0.14),0_6px_20px_rgba(0,0,0,0.35)]",
        isHumanGate &&
          "bg-surface-container-highest border-amber-400/40 shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
        isOutput &&
          "bg-surface-container-highest border-sky-400/40 shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
        isTool &&
          "bg-surface-container-highest border-white/22 shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
        !isPrimaryModel &&
          !isCodeExec &&
          !isSystem &&
          !isUser &&
          !isPreflightStyle &&
          !isHumanGate &&
          !isOutput &&
          !isTool &&
          "bg-surface-container-highest border-white/22 shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
        selected && !isPrimaryModel && !isCodeExec && "ring-primary/55 ring-2",
        selected && isGuardrail && "ring-emerald-400/45",
        selected && isRubric && "ring-violet-400/45",
        selected && isBranch && "ring-orange-400/45",
        hasValidationError && "ring-destructive/50",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!border-surface !size-4 !border-4 !shadow-md",
          isPrimaryModel
            ? "!bg-secondary"
            : isCodeExec
              ? "!bg-fuchsia-400"
              : isUser
              ? "!bg-[#fec931]"
              : isGuardrail
                ? "!bg-emerald-400"
                : isRubric
                  ? "!bg-violet-400"
                  : isBranch
                    ? "!bg-orange-400"
                    : "!bg-primary",
        )}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              isSystem && "bg-[#f3bf26] animate-pulse",
              isPrimaryModel && "bg-secondary shadow-[0_0_8px_#cdbdff]",
              isCodeExec && "bg-fuchsia-400",
              isUser && "bg-[#fec931]",
              isGuardrail && "bg-emerald-400",
              isRubric && "bg-violet-400",
              isBranch && "bg-orange-400",
              isHumanGate && "bg-amber-400",
              isOutput && "bg-sky-400",
              isTool && "bg-muted-foreground",
              !isSystem &&
                !isPrimaryModel &&
                !isCodeExec &&
                !isUser &&
                !isPreflightStyle &&
                !isHumanGate &&
                !isOutput &&
                !isTool &&
                "bg-muted-foreground",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "font-mono text-xs font-bold tracking-tight",
              isSystem && "text-primary",
              isPrimaryModel && !selected && "text-foreground",
              isCodeExec && "text-fuchsia-200/95",
              isGuardrail && "text-emerald-300/95",
              isRubric && "text-violet-300/95",
              isBranch && "text-orange-300/95",
            )}
          >
            {data.title}
          </span>
        </div>
        <TypeIcon type={data.stepType} />
      </div>
      <div className="space-y-2">
        {data.blocks.map((b) => (
          <div
            key={b.label}
            className={cn(
              "rounded-lg border p-2",
              isPrimaryModel && b.label === "Model"
                ? "border-primary/25 bg-surface-container-low/80"
                : "border-white/12 bg-surface-container-low/60",
            )}
          >
            <div
              className={cn(
                "text-[10px] font-mono uppercase",
                isPrimaryModel && b.label === "Model"
                  ? "mb-1 text-secondary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {b.label}
            </div>
            <div
              className={cn(
                "text-xs font-medium",
                b.label === "Instruction" && "text-foreground/80 italic",
              )}
            >
              {b.value}
            </div>
          </div>
        ))}
      </div>
      {hasValidationError ? (
        <div
          id={`step-validation-${nodeId}`}
          className="border-destructive/40 bg-destructive/10 mt-3 space-y-1 rounded-lg border p-2"
          role="status"
        >
          <p className="text-destructive font-mono text-[9px] font-bold uppercase tracking-wider">
            Validation
          </p>
          <ul className="text-destructive/95 list-inside list-disc text-[11px] leading-snug">
            {validationMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!border-surface !size-4 !cursor-crosshair !border-4 !shadow-md",
            isSystem
            ? "!bg-primary"
            : isPrimaryModel
              ? "!bg-secondary"
              : isCodeExec
                ? "!bg-fuchsia-400"
                : isGuardrail
                ? "!bg-emerald-400"
                : isRubric
                  ? "!bg-violet-400"
                  : isBranch
                    ? "!bg-orange-400"
                    : "!bg-[#fec931]",
        )}
      />
      {selected && isPrimaryModel ? (
        <div
          className="border-primary/30 pointer-events-none absolute inset-0 rounded-xl border"
          aria-hidden
        />
      ) : null}
      {selected && isCodeExec ? (
        <div
          className="border-fuchsia-400/35 pointer-events-none absolute inset-0 rounded-xl border"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
