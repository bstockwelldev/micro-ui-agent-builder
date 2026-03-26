import Link from "next/link";

import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";

const placeholderRuns = [
  {
    id: "run_demo_seed",
    flow: "demo-flow",
    status: "completed" as const,
    startedAt: "2h ago",
  },
  {
    id: "run_preview_7f3a",
    flow: "demo-flow",
    status: "failed" as const,
    startedAt: "Yesterday",
  },
];

export default function HistoryPage() {
  return (
    <StudioPage>
      <StudioPageHeader
        title="Flow execution history"
        description="Recent runs across flows. Connect to persisted runner logs to replace sample rows."
      />
      <div className="bg-surface-container-low/40 ring-outline-variant/20 overflow-hidden rounded-lg ring-1">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-outline-variant/30 text-muted-foreground border-b text-xs tracking-wide uppercase">
              <th className="px-4 py-3 font-medium">Run</th>
              <th className="px-4 py-3 font-medium">Flow</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {placeholderRuns.map((r) => (
              <tr
                key={r.id}
                className="border-outline-variant/20 hover:bg-surface-container-high/50 border-b transition-colors last:border-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/runs/${encodeURIComponent(r.id)}`}
                    className="text-primary font-mono text-xs font-medium underline-offset-4 hover:underline"
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{r.flow}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === "failed" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-4 py-3">{r.startedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        Sample data for layout parity with Stitch. Wire{" "}
        <code className="font-mono">GET /api/runs</code> when the store exposes it.
      </p>
    </StudioPage>
  );
}
