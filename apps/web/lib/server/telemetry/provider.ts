import { isLangfuseTracingEnabled } from "../langfuse-env";

import { getLangfuseTelemetry } from "./langfuse";
import { createConsoleTelemetry, createNoopTelemetry } from "./noop";
import type { ServerTelemetry } from "./types";

export function getServerTelemetry(): ServerTelemetry {
  if (!isLangfuseTracingEnabled()) {
    return createNoopTelemetry();
  }
  try {
    return getLangfuseTelemetry();
  } catch (error) {
    console.error("[telemetry] falling back to console telemetry", error);
    return createConsoleTelemetry();
  }
}
