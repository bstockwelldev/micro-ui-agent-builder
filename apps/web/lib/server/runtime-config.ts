export type OrchestrationBackend = "ai_sdk" | "langgraph";
export type TelemetryProvider = "noop" | "langfuse";

export type ServerRuntimeConfig = {
  orchestrationBackend: OrchestrationBackend;
  telemetryProvider: TelemetryProvider;
  langgraph: {
    apiUrl: string | null;
    apiKey: string | null;
  };
  langfuse: {
    publicKey: string | null;
    secretKey: string | null;
    baseUrl: string;
  };
};

export type RuntimeConfigHealthStatus = {
  ok: boolean;
  config: {
    orchestrationBackend: OrchestrationBackend | "invalid";
    telemetryProvider: TelemetryProvider | "invalid";
    legacyLangfuseTracingEnabled: boolean;
    langgraphConfigured: boolean;
    langfuseConfigured: boolean;
  };
  error?: string;
};

function isTruthy(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOrchestrationBackend(raw: string | undefined): OrchestrationBackend {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === "ai_sdk") return "ai_sdk";
  if (normalized === "langgraph") return "langgraph";
  throw new Error(
    `Invalid ORCHESTRATION_BACKEND=\"${raw}\". Use \"ai_sdk\" (default) or \"langgraph\".`,
  );
}

function parseTelemetryProvider(raw: string | undefined): TelemetryProvider {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === "noop") return "noop";
  if (normalized === "langfuse") return "langfuse";
  throw new Error(
    `Invalid TELEMETRY_PROVIDER=\"${raw}\". Use \"noop\" (default) or \"langfuse\".`,
  );
}

function validateConfig(config: ServerRuntimeConfig): ServerRuntimeConfig {
  if (config.orchestrationBackend === "langgraph") {
    if (!config.langgraph.apiUrl || !config.langgraph.apiKey) {
      throw new Error(
        "ORCHESTRATION_BACKEND=langgraph requires LANGGRAPH_API_URL and LANGGRAPH_API_KEY. Set both values or revert ORCHESTRATION_BACKEND=ai_sdk.",
      );
    }
  }

  if (config.telemetryProvider === "langfuse") {
    if (!config.langfuse.publicKey || !config.langfuse.secretKey) {
      throw new Error(
        "TELEMETRY_PROVIDER=langfuse requires LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY. Set both values or switch TELEMETRY_PROVIDER=noop.",
      );
    }
  }

  return config;
}

let cachedConfig: ServerRuntimeConfig | null = null;

/**
 * Server-only runtime config for orchestration + telemetry selection.
 * Defaults are production-safe: AI SDK executor + noop telemetry.
 */
export function getServerRuntimeConfig(): ServerRuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const legacyLangfuseEnabled = isTruthy(process.env.LANGFUSE_TRACING_ENABLED);
  const telemetryProvider = parseTelemetryProvider(process.env.TELEMETRY_PROVIDER);
  const finalTelemetryProvider =
    telemetryProvider === "noop" && legacyLangfuseEnabled ? "langfuse" : telemetryProvider;

  if (
    legacyLangfuseEnabled &&
    process.env.TELEMETRY_PROVIDER?.trim().toLowerCase() === "noop"
  ) {
    throw new Error(
      "Conflicting telemetry flags: LANGFUSE_TRACING_ENABLED=true but TELEMETRY_PROVIDER=noop. Set TELEMETRY_PROVIDER=langfuse or disable LANGFUSE_TRACING_ENABLED.",
    );
  }

  const config = validateConfig({
    orchestrationBackend: parseOrchestrationBackend(process.env.ORCHESTRATION_BACKEND),
    telemetryProvider: finalTelemetryProvider,
    langgraph: {
      apiUrl: normalizeOptional(process.env.LANGGRAPH_API_URL),
      apiKey: normalizeOptional(process.env.LANGGRAPH_API_KEY),
    },
    langfuse: {
      publicKey: normalizeOptional(process.env.LANGFUSE_PUBLIC_KEY),
      secretKey: normalizeOptional(process.env.LANGFUSE_SECRET_KEY),
      baseUrl:
        normalizeOptional(process.env.LANGFUSE_BASEURL) ?? "https://cloud.langfuse.com",
    },
  });

  cachedConfig = config;
  return config;
}

function parseForHealth<T extends string>(
  parser: (raw: string | undefined) => T,
  raw: string | undefined,
): T | "invalid" {
  try {
    return parser(raw);
  } catch {
    return "invalid";
  }
}

export function getRuntimeConfigHealthStatus(): RuntimeConfigHealthStatus {
  const legacyLangfuseTracingEnabled = isTruthy(process.env.LANGFUSE_TRACING_ENABLED);
  const config = {
    orchestrationBackend: parseForHealth(
      parseOrchestrationBackend,
      process.env.ORCHESTRATION_BACKEND,
    ),
    telemetryProvider: parseForHealth(
      parseTelemetryProvider,
      process.env.TELEMETRY_PROVIDER,
    ),
    legacyLangfuseTracingEnabled,
    langgraphConfigured: Boolean(
      normalizeOptional(process.env.LANGGRAPH_API_URL) &&
        normalizeOptional(process.env.LANGGRAPH_API_KEY),
    ),
    langfuseConfigured: Boolean(
      normalizeOptional(process.env.LANGFUSE_PUBLIC_KEY) &&
        normalizeOptional(process.env.LANGFUSE_SECRET_KEY),
    ),
  };

  try {
    getServerRuntimeConfig();
    return { ok: true, config };
  } catch (error) {
    return {
      ok: false,
      config,
      error: error instanceof Error ? error.message : "Invalid server runtime configuration.",
    };
  }
}

/**
 * Guard current runtime routes that still execute through AI SDK code paths.
 */
export function requireAiSdkExecutorForRoute(): ServerRuntimeConfig {
  const config = getServerRuntimeConfig();
  if (config.orchestrationBackend !== "ai_sdk") {
    throw new Error(
      "ORCHESTRATION_BACKEND=langgraph is configured, but this deployment has not enabled the LangGraph executor yet. Roll back to ORCHESTRATION_BACKEND=ai_sdk to restore service.",
    );
  }
  return config;
}
