import { expect } from "vitest";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function expectJsonErrorEnvelope(
  response: Response,
  status: number,
  message: string,
): Promise<void> {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: message });
}

export function expectTraceMetadataIsAdditive(
  body: { trace?: Record<string, string> },
  traceId: string,
): void {
  expect(body.trace?.traceId).toBe(traceId);
}
