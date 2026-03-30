import type {
  ServerTelemetry,
  TelemetryModelEvent,
  TelemetryStatus,
  TelemetryToolEvent,
  TelemetryTraceContext,
} from "./types";
import { normalizeTelemetryMetadata } from "./serialize";

export function createNoopTelemetry(): ServerTelemetry {
  return {
    startTrace: (context: TelemetryTraceContext) => {
      void context;
    },
    recordModelEvent: (traceId: string, event: TelemetryModelEvent) => {
      void traceId;
      void event;
    },
    recordToolEvent: (traceId: string, event: TelemetryToolEvent) => {
      void traceId;
      void event;
    },
    captureError: (traceId: string, error: unknown, metadata?: Record<string, unknown>) => {
      void traceId;
      void error;
      void metadata;
    },
    finishTrace: (traceId: string, status: TelemetryStatus, metadata?: Record<string, unknown>) => {
      void traceId;
      void status;
      void metadata;
    },
  };
}

export function createConsoleTelemetry(): ServerTelemetry {
  return {
    startTrace: (context) => {
      console.log(
        JSON.stringify({
          event: "trace_start",
          ...normalizeTelemetryMetadata(context),
        }),
      );
    },
    recordModelEvent: (traceId, event) => {
      console.log(
        JSON.stringify({
          event: "trace_model",
          ...normalizeTelemetryMetadata({ traceId, ...event }),
        }),
      );
    },
    recordToolEvent: (traceId, event) => {
      console.log(
        JSON.stringify({
          event: "trace_tool",
          ...normalizeTelemetryMetadata({ traceId, ...event }),
        }),
      );
    },
    captureError: (traceId, error, metadata) => {
      console.error(
        JSON.stringify({
          event: "trace_error",
          ...normalizeTelemetryMetadata({
            traceId,
            error: error instanceof Error ? error.message : String(error),
            metadata: metadata ?? null,
          }),
        }),
      );
    },
    finishTrace: (traceId, status, metadata) => {
      console.log(
        JSON.stringify({
          event: "trace_finish",
          ...normalizeTelemetryMetadata({
            traceId,
            status,
            metadata: metadata ?? null,
          }),
        }),
      );
    },
  };
}
