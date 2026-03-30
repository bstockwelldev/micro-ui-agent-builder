import type { ToolSet } from "ai";

type ToolTelemetry = {
  recordToolEvent: (
    traceId: string,
    event: {
      phase: "tool_call_start" | "tool_call_finish" | "tool_call_error";
      toolName: string;
      metadata?: Record<string, unknown>;
    },
  ) => void;
};

export function wrapToolsWithTelemetry(
  tools: ToolSet,
  telemetry: ToolTelemetry,
  traceId: string,
): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([toolName, toolDef]) => {
      const execute = (toolDef as { execute?: unknown }).execute;
      if (typeof execute !== "function") return [toolName, toolDef];
      const wrapped = async (...args: unknown[]) => {
        telemetry.recordToolEvent(traceId, {
          phase: "tool_call_start",
          toolName,
        });
        try {
          const value = await execute(...args);
          telemetry.recordToolEvent(traceId, {
            phase: "tool_call_finish",
            toolName,
          });
          return value;
        } catch (error) {
          telemetry.recordToolEvent(traceId, {
            phase: "tool_call_error",
            toolName,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
          throw error;
        }
      };
      return [toolName, { ...toolDef, execute: wrapped }];
    }),
  ) as ToolSet;
}
