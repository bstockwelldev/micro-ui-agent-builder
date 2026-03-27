import Link from "next/link";
import type { DashboardCommandCenterPayload } from "@repo/shared";
import {
  BarChart3,
  Bot,
  FileText,
  History,
  Layers,
  Play,
  Plus,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const buildQuickLinks = [
  {
    href: "/flows",
    label: "Flows",
    description: "Flow library, runner, and canvas.",
    icon: Workflow,
  },
  {
    href: "/agents",
    label: "Agents",
    description: "Agent definitions.",
    icon: Bot,
  },
  {
    href: "/prompts",
    label: "Prompts",
    description: "Prompt templates and versions.",
    icon: FileText,
  },
  {
    href: "/tools",
    label: "Tools",
    description: "Tool registry.",
    icon: Wrench,
  },
  {
    href: "/genui",
    label: "GenUI",
    description: "Generative UI surfaces.",
    icon: Layers,
  },
  {
    href: "/mcp",
    label: "MCP",
    description: "MCP server connections.",
    icon: Server,
  },
] as const;

const opsQuickLinks = [
  {
    href: "/history",
    label: "History",
    description: "Run and change history.",
    icon: History,
  },
  {
    href: "/deployments",
    label: "Deployments",
    description: "Ship and track releases.",
    icon: Rocket,
  },
  {
    href: "/evaluations",
    label: "Evaluations",
    description: "Quality and regression checks.",
    icon: ShieldCheck,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Usage and performance.",
    icon: BarChart3,
  },
] as const;

function SparklineStrip({
  values,
  tone,
}: {
  values: number[];
  tone: "primary" | "secondary";
}) {
  if (values.length === 0) {
    return (
      <div className="text-muted-foreground flex h-8 items-center font-mono text-[10px]">
        No series data
      </div>
    );
  }
  return (
    <div className="flex h-8 w-full items-end gap-px">
      {values.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-full min-w-0 rounded-t-[1px] transition-colors",
            tone === "primary" ? "bg-primary/25" : "bg-secondary/25",
          )}
          style={{ height: `${Math.max(8, h)}%` }}
        />
      ))}
    </div>
  );
}

export function GenUICommandCenter({
  data,
}: {
  data: DashboardCommandCenterPayload;
}) {
  const {
    counts,
    hasFlows,
    hasAnalytics,
    recentFlows,
    recentRuns,
    metrics,
    activeAgents,
  } = data;

  const flowSlots = 3;

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-foreground mb-2 text-3xl font-black tracking-tight">
              GenUI{" "}
              <span className="text-primary">Command Center</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Orchestrate flows, agents, and run telemetry from one surface.
            </p>
          </div>
          <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
            Store · {counts.flows} flows · {counts.agents} agents
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/flows"
            className="border-outline-variant/30 bg-surface-container-low group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-6 text-center transition-all hover:border-primary/50"
          >
            <div className="bg-primary/10 group-hover:scale-110 mb-4 flex size-12 items-center justify-center rounded-full transition-transform">
              <Plus className="text-primary size-7" aria-hidden />
            </div>
            <h3 className="mb-1 font-bold">Create New Flow</h3>
            <p className="text-muted-foreground text-xs">
              Open the flow library and start a blank graph
            </p>
          </Link>

          {hasFlows ? (
            recentFlows.slice(0, flowSlots).map((f, idx) => {
              const icons = [Sparkles, Terminal, Layers] as const;
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={f.id}
                  className="border-outline-variant/5 bg-surface-container-high group relative overflow-hidden rounded-xl border border-transparent p-6 transition-all hover:border-primary/20"
                >
                  <div className="pointer-events-none absolute -top-8 -right-8 size-32 bg-primary/5 blur-3xl" />
                  <div className="mb-4 flex items-start justify-between">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Icon className="text-primary size-5" aria-hidden />
                    </div>
                    <span className="text-muted-foreground bg-surface-container-lowest rounded px-2 py-1 font-mono text-[10px]">
                      {f.updatedRelative}
                    </span>
                  </div>
                  <h3 className="text-foreground mb-1 font-bold">{f.name}</h3>
                  <p className="text-muted-foreground mb-6 text-xs">
                    Updated {f.updatedRelative}
                  </p>
                  <div className="flex items-center gap-3">
                    <Link
                      href={f.resumeHref}
                      className="bg-primary text-primary-foreground hover:brightness-110 flex-1 rounded-lg py-2 text-center text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Resume
                    </Link>
                    <Link
                      href={f.resumeHref}
                      className="bg-surface-container-lowest text-muted-foreground hover:text-primary rounded-lg p-2 transition-colors"
                      aria-label={`Open runner for ${f.name}`}
                    >
                      <Play className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="border-outline-variant/15 bg-surface-container-low/50 md:col-span-3 flex flex-col justify-center gap-3 rounded-xl border p-6 lg:col-span-3">
              <p className="text-foreground text-sm font-medium">
                No flows in your studio store yet.
              </p>
              <p className="text-muted-foreground text-xs">
                Create a flow to see it resume here, or jump straight to the
                library.
              </p>
              <Link
                href="/flows"
                className="text-primary inline-flex w-fit items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Open flows
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <h2 className="text-muted-foreground font-mono text-xs uppercase tracking-[0.3em]">
              Usage Pulse
            </h2>
            <div className="bg-outline-variant/10 h-px flex-1" />
          </div>

          {!hasAnalytics ? (
            <div className="border-outline-variant/15 bg-surface-container-low/50 rounded-xl border p-6">
              <p className="text-foreground mb-2 text-sm font-medium">
                No run analytics yet
              </p>
              <p className="text-muted-foreground mb-4 text-xs">
                Execute a flow from Run to populate token velocity, cost, and
                health signals.
              </p>
              <Link
                href="/run"
                className="text-primary inline-flex font-mono text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline"
              >
                Go to Run
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="border-outline-variant/5 bg-surface-container-low rounded-xl border p-5">
                <div className="mb-4 flex items-start justify-between">
                  <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                    Token velocity
                  </p>
                  <span className="text-primary font-mono text-xs" aria-hidden>
                    ↗
                  </span>
                </div>
                <h4 className="text-foreground mb-2 font-mono text-2xl font-bold">
                  {metrics.tokenVelocityLabel}
                </h4>
                <SparklineStrip values={metrics.tokenSparkline} tone="primary" />
              </div>
              <div className="border-outline-variant/5 bg-surface-container-low rounded-xl border p-5">
                <div className="mb-4 flex items-start justify-between">
                  <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                    Cost / 1k runs
                  </p>
                  <span className="text-secondary font-mono text-xs" aria-hidden>
                    $
                  </span>
                </div>
                <h4 className="text-foreground mb-2 font-mono text-2xl font-bold leading-tight">
                  {metrics.costPer1kLabel}
                </h4>
                <SparklineStrip
                  values={metrics.costSparkline}
                  tone="secondary"
                />
              </div>
              <div className="border-outline-variant/5 bg-surface-container-low rounded-xl border p-5">
                <div className="mb-4 flex items-start justify-between">
                  <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                    System health
                  </p>
                  <div
                    className="bg-primary size-2 animate-pulse rounded-full shadow-[0_0_8px_rgba(0,229,255,0.45)]"
                    aria-hidden
                  />
                </div>
                <h4 className="text-primary mb-2 font-mono text-2xl font-bold">
                  {metrics.healthPercent}%
                </h4>
                <div className="bg-surface-container-highest mt-4 h-1 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, metrics.healthPercent))}%`,
                    }}
                  />
                </div>
                {metrics.healthSubtext ? (
                  <p className="text-muted-foreground mt-2 font-mono text-[9px] uppercase">
                    {metrics.healthSubtext}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="border-outline-variant/5 bg-surface-container-low rounded-xl border p-6">
            <h3 className="mb-4 text-sm font-bold">Quick links</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...buildQuickLinks, ...opsQuickLinks].map(
                ({ href, label, description, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="bg-surface-container-high hover:bg-surface-container-highest group flex items-center gap-3 rounded-lg p-3 transition-all"
                  >
                    <div className="bg-primary/10 group-hover:bg-primary/20 rounded-md p-2">
                      <Icon
                        className="text-primary size-5 shrink-0"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-foreground text-[10px] font-bold leading-tight">
                        {label}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-[9px]">
                        {description}
                      </p>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-muted-foreground whitespace-nowrap font-mono text-xs uppercase tracking-[0.3em]">
              Agents
            </h2>
            <div className="bg-outline-variant/10 h-px flex-1" />
          </div>
          <div className="border-outline-variant/5 bg-surface-container-low overflow-hidden rounded-xl border">
            {activeAgents.length === 0 ? (
              <div className="text-muted-foreground p-6 text-xs">
                No agents defined yet.{" "}
                <Link href="/agents" className="text-primary font-medium">
                  Add agents
                </Link>
              </div>
            ) : (
              <ul className="divide-outline-variant/10 divide-y">
                {activeAgents.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.detailHref}
                      className="hover:bg-surface-container-highest/30 flex items-center justify-between gap-3 p-4 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-surface-container-high relative flex size-8 items-center justify-center rounded-lg">
                          <Bot className="text-primary size-4" aria-hidden />
                          <div className="border-surface-container-low bg-primary absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-xs font-bold">
                            {a.name}
                          </p>
                          <p className="text-muted-foreground font-mono text-[9px]">
                            {a.id}
                          </p>
                        </div>
                      </div>
                      <span className="text-primary font-mono text-[10px]">
                        VIEW
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/agents"
              className="border-outline-variant/10 text-muted-foreground hover:text-primary block w-full border-t py-3 text-center text-xs font-bold uppercase tracking-widest transition-colors"
            >
              All agents
            </Link>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-muted-foreground font-mono text-xs uppercase tracking-[0.3em]">
            Run log
          </h2>
          <div className="bg-outline-variant/10 h-px flex-1" />
        </div>
        <div className="border-outline-variant/15 bg-surface-container-lowest/80 font-mono text-xs">
          {recentRuns.length === 0 ? (
            <div className="text-muted-foreground p-4 text-[11px]">
              No runs recorded.{" "}
              <Link href="/run" className="text-primary">
                Start a run
              </Link>{" "}
              or see{" "}
              <Link href="/history" className="text-primary">
                history
              </Link>
              .
            </div>
          ) : (
            <ul className="max-h-64 divide-y divide-outline-variant/10 overflow-y-auto">
              {recentRuns.map((r) => (
                <li key={r.runId}>
                  <Link
                    href={r.runHref}
                    className="hover:bg-surface-container-low/80 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 transition-colors"
                  >
                    <span className="text-primary shrink-0">
                      {r.atRelative}
                    </span>
                    <span className="text-foreground min-w-0 truncate">
                      {r.flowName ?? "—"} · {r.finishReason}
                    </span>
                    <span className="text-muted-foreground ml-auto shrink-0">
                      {r.totalTokens} tok
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
