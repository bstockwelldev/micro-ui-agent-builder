function normalizeValue(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return "[function]";
  if (typeof value === "symbol") return String(value);
  if (typeof value === "object") {
    return normalizeTelemetryMetadata(value as Record<string, unknown>);
  }
  return value;
}

export function normalizeTelemetryMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    out[key] = normalizeValue(value);
  }
  return out;
}
