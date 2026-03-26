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
            Chat uses{" "}
            <code className="font-mono text-xs">/api/agent/run</code> (Gemini-first when a
            Google/Gemini key is set; use <code className="font-mono text-xs">groq/…</code> in
            the flow for Groq). Use <code className="font-mono text-xs">flowId</code> from the
            query string. The Structured UI preview tab calls{" "}
            <code className="font-mono text-xs">/api/agent/genui</code>. Tools that require
            approval pause until you approve or deny.
          </>
        }
      />
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <RunSection />
      </Suspense>
    </StudioPage>
  );
}
