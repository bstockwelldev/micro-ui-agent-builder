import { Langfuse, type LangfuseTraceClient } from "langfuse";

import { requireLangfuseEnvIfEnabled } from "../langfuse-env";

import type {
  ServerTelemetry,
  TelemetryModelEvent,
  TelemetryStatus,
  TelemetryToolEvent,
  TelemetryTraceContext,
} from "./types";
import { normalizeTelemetryMetadata } from "./serialize";

type TraceRegistry = Map<string, LangfuseTraceClient>;

class LangfuseTelemetry implements ServerTelemetry {
  private readonly client: Langfuse;
  private readonly traces: TraceRegistry = new Map();

  constructor(client: Langfuse) {
    this.client = client;
  }

  startTrace(context: TelemetryTraceContext): void {
    const trace = this.client.trace({
      id: context.traceId,
      name: context.kind,
      sessionId: context.runId ?? undefined,
      metadata: normalizeTelemetryMetadata({
        flowId: context.flowId,
        agentId: context.agentId,
        runId: context.runId ?? null,
      }),
    });
    this.traces.set(context.traceId, trace);
  }

  recordModelEvent(traceId: string, event: TelemetryModelEvent): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    trace.event({
      name: `model_${event.phase}`,
      metadata: normalizeTelemetryMetadata({
        providerLabel: event.providerLabel ?? null,
        modelRef: event.modelRef ?? null,
        fallbackProviderLabel: event.fallbackProviderLabel ?? null,
        finishReason: event.finishReason ?? null,
        usage: event.usage ?? null,
        ...event.metadata,
      }),
    });
  }

  recordToolEvent(traceId: string, event: TelemetryToolEvent): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    trace.event({
      name: `tool_${event.phase}`,
      metadata: normalizeTelemetryMetadata({
        toolName: event.toolName,
        ...(event.metadata ?? {}),
      }),
    });
  }

  captureError(
    traceId: string,
    error: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    trace.event({
      name: "trace_error",
      level: "ERROR",
      metadata: normalizeTelemetryMetadata({
        error: error instanceof Error ? error.message : String(error),
        ...(metadata ?? {}),
      }),
    });
  }

  finishTrace(
    traceId: string,
    status: TelemetryStatus,
    metadata?: Record<string, unknown>,
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    trace.update({
      output: normalizeTelemetryMetadata({
        status,
        ...(metadata ?? {}),
      }),
    });
    this.traces.delete(traceId);
    void this.client.flushAsync();
  }
}

let singleton: ServerTelemetry | null = null;

export function getLangfuseTelemetry(): ServerTelemetry {
  if (singleton) return singleton;
  const env = requireLangfuseEnvIfEnabled();
  if (!env) {
    throw new Error("Langfuse telemetry requested while tracing is disabled.");
  }
  const client = new Langfuse({
    publicKey: env.publicKey,
    secretKey: env.secretKey,
    baseUrl: env.baseUrl,
  });
  singleton = new LangfuseTelemetry(client);
  return singleton;
}
