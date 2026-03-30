type LangfuseEnv = {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
};

function isTruthy(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Tracing is opt-in to avoid forcing keys in environments that do not use Langfuse.
 */
export function isLangfuseTracingEnabled(): boolean {
  return isTruthy(process.env.LANGFUSE_TRACING_ENABLED);
}

/**
 * Fail-fast validator for server routes that enable Langfuse tracing.
 */
export function requireLangfuseEnvIfEnabled(): LangfuseEnv | null {
  if (!isLangfuseTracingEnabled()) return null;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  const baseUrl =
    process.env.LANGFUSE_BASEURL?.trim() || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    throw new Error(
      "Langfuse tracing is enabled but LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is missing.",
    );
  }

  return { publicKey, secretKey, baseUrl };
}
