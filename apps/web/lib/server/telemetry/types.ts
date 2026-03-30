export type TelemetryTraceKind = "agent_run" | "agent_genui";

export type TelemetryStatus = "ok" | "error";

export type TelemetryTraceContext = {
  traceId: string;
  kind: TelemetryTraceKind;
  flowId: string | null;
  agentId: string | null;
  runId?: string | null;
};

export type TelemetryModelEvent = {
  phase:
    | "preflight"
    | "model_selection"
    | "generation_start"
    | "generation_finish";
  providerLabel?: string | null;
  modelRef?: string | null;
  fallbackProviderLabel?: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type TelemetryToolEvent = {
  phase: "tool_call_start" | "tool_call_finish" | "tool_call_error";
  toolName: string;
  metadata?: Record<string, unknown>;
};

export interface ServerTelemetry {
  startTrace(context: TelemetryTraceContext): void;
  recordModelEvent(traceId: string, event: TelemetryModelEvent): void;
  recordToolEvent(traceId: string, event: TelemetryToolEvent): void;
  captureError(
    traceId: string,
    error: unknown,
    metadata?: Record<string, unknown>,
  ): void;
  finishTrace(
    traceId: string,
    status: TelemetryStatus,
    metadata?: Record<string, unknown>,
  ): void;
}
