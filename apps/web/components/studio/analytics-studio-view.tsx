import type {
  AnalyticsDashboardPayload,
  AnalyticsDailyPoint,
  AnalyticsFlowRow,
} from "@/lib/server/analytics-dashboard";

import { StudioPage } from "./studio-page";
import { StudioPageHeader } from "./studio-page-header";

function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    n,
  );
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function DailyTrendSvg({ daily }: { daily: AnalyticsDailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
        No runs yet. Complete a flow in Run to populate daily rollups.
      </p>
    );
  }

  const W = 720;
  const H = 200;
  const padL = 44;
  const padR = 44;
  const padT = 16;
  const padB = 52;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxRuns = Math.max(1, ...daily.map((d) => d.invocations));
  const maxTok = Math.max(1, ...daily.map((d) => d.tokens));
  const n = daily.length;
  const slot = innerW / Math.max(n, 1);

  const barW = Math.min(28, slot * 0.45);
  const linePts: string[] = [];

  for (let i = 0; i < n; i++) {
    const cx = padL + slot * i + slot / 2;
    const yTok =
      padT + innerH - (daily[i]!.tokens / maxTok) * innerH * 0.92 - 4;
    linePts.push(`${cx},${yTok}`);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="text-foreground/90 w-full max-w-full"
      role="img"
      aria-label="Daily invocations and token usage"
    >
      <text
        x={padL}
        y={12}
        className="fill-muted-foreground font-mono text-[9px] uppercase"
      >
        runs (bars) · tokens (line)
      </text>
      {/* grid */}
      {[0, 0.5, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <line
            key={t}
            x1={padL}
            x2={W - padR}
            y1={y}
            y2={y}
            className="stroke-outline-variant/25"
            strokeWidth={1}
          />
        );
      })}
      {daily.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const h = (d.invocations / maxRuns) * innerH * 0.85;
        const y = padT + innerH - h;
        return (
          <rect
            key={d.date}
            x={cx - barW / 2}
            y={y}
            width={barW}
            height={Math.max(h, 1)}
            rx={3}
            className="fill-primary/55"
          />
        );
      })}
      {linePts.length > 1 && (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-foreground/70"
          points={linePts.join(" ")}
        />
      )}
      {linePts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return (
          <circle
            key={daily[i]!.date}
            cx={x}
            cy={y}
            r={3.5}
            className="fill-surface-container-high stroke-foreground/50"
            strokeWidth={1}
          />
        );
      })}
      {daily.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const short = d.date.slice(5);
        return (
          <text
            key={`lbl-${d.date}`}
            x={cx}
            y={H - 18}
            textAnchor="middle"
            className="fill-muted-foreground font-mono text-[8px]"
          >
            {short}
          </text>
        );
      })}
    </svg>
  );
}

function FlowCohortSvg({ rows }: { rows: AnalyticsFlowRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
        No per-flow data yet.
      </p>
    );
  }

  const W = 720;
  const rowH = 28;
  const padL = 200;
  const padR = 56;
  const H = rows.length * rowH + 36;
  const maxInv = Math.max(1, ...rows.map((r) => r.invocations));
  const barMaxW = W - padL - padR;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="text-foreground/90 w-full max-w-full"
      role="img"
      aria-label="Invocations by flow"
    >
      <text
        x={8}
        y={14}
        className="fill-muted-foreground font-mono text-[9px] uppercase"
      >
        invocations by flow
      </text>
      {rows.map((r, i) => {
        const y = 24 + i * rowH;
        const bw = (r.invocations / maxInv) * barMaxW;
        const label =
          r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name;
        return (
          <g key={`${r.flowId ?? "null"}-${i}`}>
            <text
              x={8}
              y={y + 16}
              className="fill-foreground/85 font-mono text-[10px]"
            >
              {label}
            </text>
            <rect
              x={padL}
              y={y + 4}
              width={Math.max(bw, 2)}
              height={18}
              rx={4}
              className="fill-primary/45"
            />
            <text
              x={padL + bw + 8}
              y={y + 16}
              className="fill-muted-foreground font-mono text-[9px] tabular-nums"
            >
              {r.invocations}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AnalyticsStudioView({ data }: { data: AnalyticsDashboardPayload }) {
  const { totals, daily, byFlow } = data;
  const hasData = totals.invocations > 0;

  return (
    <StudioPage>
      <StudioPageHeader
        title="Analytics & ROI"
        description="Usage, estimated spend from token counts (heuristic rates by provider), and rollups by day and flow. Data is stored locally with the studio (JSONL); on Vercel serverless it uses /tmp and resets when the instance recycles."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-surface-container-high ring-outline-variant/20 rounded-lg p-5 ring-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Invocations
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {hasData ? formatInt(totals.invocations) : "—"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {hasData
              ? `Avg duration ${formatInt(totals.avgDurationMs)} ms`
              : "No completed runs recorded"}
          </p>
        </div>
        <div className="bg-surface-container-high ring-outline-variant/20 rounded-lg p-5 ring-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Tokens
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {hasData ? formatInt(totals.totalTokens) : "—"}
          </p>
          <p className="text-muted-foreground mt-1 font-mono text-[10px]">
            {hasData
              ? `in ${formatInt(totals.inputTokens)} · out ${formatInt(totals.outputTokens)}`
              : "Prompt + completion totals"}
          </p>
        </div>
        <div className="bg-surface-container-high ring-outline-variant/20 rounded-lg p-5 ring-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Spend (est.)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {hasData ? formatUsd(totals.estimatedUsd) : "—"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Heuristic $/1M tokens by provider — not invoice actuals
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest/80 ring-outline-variant/15 mt-2 space-y-8 rounded-lg p-5 ring-1">
        <div>
          <h2 className="text-foreground/90 mb-3 font-mono text-[10px] font-semibold tracking-widest uppercase">
            Daily trend (last {daily.length} days with data)
          </h2>
          <DailyTrendSvg daily={daily} />
        </div>
        <div>
          <h2 className="text-foreground/90 mb-3 font-mono text-[10px] font-semibold tracking-widest uppercase">
            Cohort by flow
          </h2>
          <FlowCohortSvg rows={byFlow} />
        </div>
      </div>
    </StudioPage>
  );
}
