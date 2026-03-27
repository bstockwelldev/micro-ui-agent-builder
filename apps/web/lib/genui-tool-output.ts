import { genuiSurfaceSchema, type GenuiSurface } from "@repo/shared";

/**
 * Extract a validated GenUI surface from tool `output` (direct shape or nested keys).
 */
export function tryParseGenuiSurfaceFromToolOutput(
  output: unknown,
): GenuiSurface | null {
  if (output === null || output === undefined) {
    return null;
  }
  const direct = genuiSurfaceSchema.safeParse(output);
  if (direct.success) {
    return direct.data;
  }
  if (typeof output !== "object") {
    return null;
  }
  const o = output as Record<string, unknown>;
  for (const key of ["genuiSurface", "surface", "genui"] as const) {
    const nested = o[key];
    const parsed = genuiSurfaceSchema.safeParse(nested);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return null;
}
