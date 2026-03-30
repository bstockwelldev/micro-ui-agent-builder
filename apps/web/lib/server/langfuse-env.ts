import { getServerRuntimeConfig } from "@/lib/server/runtime-config";

/**
 * Loads and validates server runtime config, including Langfuse keys when
 * TELEMETRY_PROVIDER=langfuse (or legacy LANGFUSE_TRACING_ENABLED).
 */
export function requireLangfuseEnvIfEnabled(): void {
  getServerRuntimeConfig();
}
