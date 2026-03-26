import { Suspense } from "react";

import { RunSection } from "./run-section";

export default function RunPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Run</h1>
        <p className="text-muted-foreground text-sm">
          Chat uses <code className="text-xs">/api/agent/run</code> (Groq-first
          model resolution when keys are set). Use{" "}
          <code className="text-xs">flowId</code> from the query string. The
          Structured UI preview tab calls{" "}
          <code className="text-xs">/api/agent/genui</code>. Tools that
          require approval pause until you approve or deny.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
      >
        <RunSection />
      </Suspense>
    </div>
  );
}
