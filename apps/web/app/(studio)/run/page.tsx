import { Suspense } from "react";

import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";

import { RunSection } from "./run-section";

export default function RunPage() {
  return (
    <StudioPage>
      <StudioPageHeader
        title="Run"
        description={
          <>
            Chat uses <code className="font-mono text-xs">/api/agent/run</code> with your
            configured providers; enable the &quot;Use Ollama&quot; option to force the local OpenAI-compatible
            endpoint when <code className="font-mono text-xs">OLLAMA_BASE_URL</code> is set. Use{" "}
            <code className="font-mono text-xs">flowId</code> in the query string to load a flow;
            the diagram below updates for that selection. The Structured UI tab calls{" "}
            <code className="font-mono text-xs">/api/agent/genui</code>. Session log supports copy
            and JSON download for review.
          </>
        }
      />
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <RunSection />
      </Suspense>
    </StudioPage>
  );
}
