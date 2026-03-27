"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";

import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  createDefaultFlowStep,
  DEFAULT_FLOW_NODE_TYPE,
} from "@/lib/flow-default-step";
import { cn } from "@/lib/utils";
import type { FlowNodeType, FlowStep } from "@repo/shared";
import { Bot, MessageSquare, Plus, Send, Terminal } from "lucide-react";

const QUICK: {
  type: FlowNodeType;
  label: string;
  Icon: typeof Terminal;
}[] = [
  {
    type: "system",
    label: "Add system prompt step",
    Icon: Terminal,
  },
  {
    type: "user",
    label: "Add user / context step",
    Icon: MessageSquare,
  },
  {
    type: "llm",
    label: "Add agent model step",
    Icon: Bot,
  },
  {
    type: "output",
    label: "Add output contract step",
    Icon: Send,
  },
];

export function FlowNodeQuickAddPanel({
  maxOrder,
  onCreate,
}: {
  maxOrder: number;
  onCreate: (step: FlowStep) => void;
}) {
  const rf = useReactFlow();

  const addAtCenter = (type: FlowNodeType) => {
    const b = document
      .querySelector(".flow-builder-canvas .react-flow__viewport")
      ?.getBoundingClientRect();
    const x = b ? b.left + b.width * 0.45 : window.innerWidth * 0.5;
    const y = b ? b.top + b.height * 0.35 : window.innerHeight * 0.4;
    const pos = rf.screenToFlowPosition({ x, y });
    const id = nanoid(10);
    onCreate(createDefaultFlowStep(type, id, maxOrder + 1, pos));
  };

  return (
    <Panel
      position="bottom-left"
      className="!m-2 !mb-[max(7rem,env(safe-area-inset-bottom)+5.5rem)] !ml-2 md:!mb-32"
    >
      <div
        className="border-outline-variant/15 bg-surface-container-high/95 flex flex-col gap-0.5 rounded-xl border p-1 shadow-lg backdrop-blur-sm"
        role="toolbar"
        aria-label="Flow canvas add steps"
      >
        <SimpleTooltip label="Add node" side="right">
          <button
            type="button"
            className={cn(
              "bg-primary text-primary-foreground hover:brightness-110 flex size-10 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95 sm:rounded-xl",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            )}
            aria-label="Add node"
            onClick={() => addAtCenter(DEFAULT_FLOW_NODE_TYPE)}
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </SimpleTooltip>
        <div
          className="border-outline-variant/10 mx-0.5 border-t"
          aria-hidden
        />
        {QUICK.map(({ type, label, Icon }) => (
          <SimpleTooltip key={type} label={label} side="right">
            <button
              type="button"
              className={cn(
                "text-muted-foreground hover:bg-primary/15 hover:text-primary flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              )}
              aria-label={label}
              onClick={() => addAtCenter(type)}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          </SimpleTooltip>
        ))}
      </div>
    </Panel>
  );
}
