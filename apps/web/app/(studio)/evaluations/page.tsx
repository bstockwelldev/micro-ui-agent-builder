import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";

const checks = [
  { name: "Prompt injection shield", coverage: "Flows + Run", state: "planned" as const },
  { name: "Tool approval audit", coverage: "Run", state: "live" as const },
  { name: "GenUI schema validation", coverage: "/api/agent/genui", state: "live" as const },
];

export default function EvaluationsPage() {
  return (
    <StudioPage>
      <StudioPageHeader
        title="Evaluations & guardrails"
        description="Central place for rubrics, red-team batches, and production monitors. Aligns with layered prompt controls (lint, eval, runtime)."
      />
      <div className="bg-surface-container-low/50 ring-outline-variant/20 space-y-4 rounded-lg p-5 ring-1">
        <h2 className="text-sm font-medium">Active checks</h2>
        <ul className="space-y-3">
          {checks.map((c) => (
            <li
              key={c.name}
              className="bg-surface-container-high/60 flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-muted-foreground font-mono text-xs">{c.coverage}</p>
              </div>
              <Badge variant={c.state === "live" ? "default" : "outline"}>{c.state}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </StudioPage>
  );
}
