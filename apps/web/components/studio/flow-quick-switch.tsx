"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

export type FlowQuickSwitchMode = "editor" | "run";

type FlowOption = { id: string; name: string };

export function FlowQuickSwitch({
  flows,
  currentFlowId,
  mode,
  className,
  disabled,
}: {
  flows: FlowOption[];
  currentFlowId: string;
  mode: FlowQuickSwitchMode;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();

  const sorted = useMemo(
    () => [...flows].sort((a, b) => a.name.localeCompare(b.name)),
    [flows],
  );

  const ids = useMemo(() => new Set(sorted.map((f) => f.id)), [sorted]);
  const selectValue = currentFlowId && ids.has(currentFlowId) ? currentFlowId : "";

  if (sorted.length === 0) return null;

  return (
    <label className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="text-muted-foreground hidden font-mono text-[9px] uppercase tracking-wider sm:inline">
        {mode === "editor" ? "Flow" : "Run"}
      </span>
      <select
        className="border-outline-variant/25 bg-surface-container-lowest text-foreground focus:border-primary max-w-[10rem] truncate rounded-lg border px-2 py-1.5 text-xs outline-none sm:max-w-[14rem]"
        value={selectValue}
        disabled={disabled}
        aria-label={mode === "editor" ? "Switch flow in editor" : "Switch flow for runner"}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) {
            router.push("/dashboard");
            return;
          }
          if (mode === "editor") {
            router.push(`/flows/${encodeURIComponent(id)}`);
          } else {
            router.push(`/dashboard?flowId=${encodeURIComponent(id)}`);
          }
        }}
      >
        {mode === "run" ? (
          <option value="">Default / no flow…</option>
        ) : null}
        {sorted.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
