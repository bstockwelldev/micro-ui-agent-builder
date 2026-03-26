/**
 * Wraps fetch for /api/agent/run so JSON error bodies from flow preflight
 * (guardrail / rubric / branch) surface as readable chat errors.
 */
function formatAgentRunErrorBody(text: string, status: number): Error {
  try {
    const j = JSON.parse(text) as {
      error?: string;
      code?: string;
      details?: unknown;
    };
    const base =
      typeof j.error === "string" && j.error.length > 0 ? j.error : text;
    const labeled =
      typeof j.code === "string" && j.code.length > 0
        ? `[${j.code}] ${base}`
        : base;
    const detailsSuffix =
      j.details !== undefined && j.details !== null
        ? `\n\nDetails:\n${JSON.stringify(j.details, null, 2)}`
        : "";
    return new Error(labeled + detailsSuffix);
  } catch {
    return new Error(text.trim() || `HTTP ${status}`);
  }
}

export function createAgentRunFetch(): typeof fetch {
  return async (input, init) => {
    const res = await globalThis.fetch(input, init);
    if (res.ok) return res;
    const text = await res.text();
    throw formatAgentRunErrorBody(text, res.status);
  };
}
