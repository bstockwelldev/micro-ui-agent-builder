import { randomUUID } from "node:crypto";

import { getServerTelemetry } from "./provider";
import type { ServerTelemetry, TelemetryTraceKind } from "./types";

export type RouteTraceContext = {
  telemetry: ServerTelemetry;
  traceId: string;
  runId: string;
};

export type TraceFailure = {
  traceId: string;
  error: string;
};

export function beginRouteTrace(
  req: Request,
  kind: TelemetryTraceKind,
  telemetry: ServerTelemetry = getServerTelemetry(),
): RouteTraceContext {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const runId = randomUUID();
  telemetry.startTrace({
    traceId,
    kind,
    flowId: null,
    agentId: null,
    runId,
  });
  return { telemetry, traceId, runId };
}

export function failTrace(
  context: RouteTraceContext,
  stage: string,
  error: unknown,
): TraceFailure {
  const message = error instanceof Error ? error.message : String(error);
  context.telemetry.captureError(context.traceId, error, { stage });
  context.telemetry.finishTrace(context.traceId, "error", { stage });
  return { traceId: context.traceId, error: message };
}
