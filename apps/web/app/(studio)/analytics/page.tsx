import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";

export default function AnalyticsPage() {
  return (
    <StudioPage>
      <StudioPageHeader
        title="Analytics & ROI"
        description="Usage, cost per flow, tool success rates, and human-in-the-loop time. Connect product analytics when events are instrumented."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {["Invocations", "Tokens", "Spend"].map((label) => (
          <div
            key={label}
            className="bg-surface-container-high ring-outline-variant/20 rounded-lg p-5 ring-1"
          >
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">—</p>
            <p className="text-muted-foreground mt-1 text-xs">Placeholder metric</p>
          </div>
        ))}
      </div>
      <div className="bg-surface-container-lowest/80 ring-outline-variant/15 mt-2 rounded-lg p-4 ring-1">
        <p className="text-muted-foreground text-sm">
          Chart region reserved for trend visualizations (daily rollups, cohorts by flow). Use
          the Stitch reference for density and monospace legends.
        </p>
      </div>
    </StudioPage>
  );
}
