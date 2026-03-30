import { createConsoleTelemetry, createNoopTelemetry } from "./noop";
import type { ServerTelemetry } from "./types";

export function getServerTelemetry(): ServerTelemetry {
  return process.env.LANGFUSE_TRACING_ENABLED === "true"
    ? createConsoleTelemetry()
    : createNoopTelemetry();
}
