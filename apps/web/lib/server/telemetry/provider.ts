import { getServerRuntimeConfig } from "../runtime-config";

import { getLangfuseTelemetry } from "./langfuse";
import { createNoopTelemetry } from "./noop";
import type { ServerTelemetry } from "./types";

export function getServerTelemetry(): ServerTelemetry {
  const config = getServerRuntimeConfig();
  if (config.telemetryProvider === "noop") {
    return createNoopTelemetry();
  }
  return getLangfuseTelemetry(config);
}
