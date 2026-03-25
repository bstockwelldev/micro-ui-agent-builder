import { NextResponse } from "next/server";

import { readStudioStore, writeStudioStore } from "@/lib/server/studio-store";

/**
 * Prototype hook for human-in-the-loop session bookkeeping.
 * Tool execution approvals are handled client-side via useChat `addToolApprovalResponse`.
 * This route can clear pausedRuns entries or record audit metadata later.
 */
export async function POST(req: Request) {
  let body: { sessionId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const store = await readStudioStore();
  const paused = { ...(store.pausedRuns ?? {}) };
  delete paused[sessionId];
  await writeStudioStore({ ...store, pausedRuns: paused });

  return NextResponse.json({
    ok: true,
    clearedSessionId: sessionId,
    note: body.note,
  });
}
