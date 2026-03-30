# MicroUIAgentBuilder-FutureAIStack-ContextualPRD

## 0) Context-grounded instruction outline

- Establish a migration target: **Next.js App Router + Vercel AI SDK v6 UI streaming + LangGraph orchestration + Langfuse observability** while preserving current product surface (Flows, Run, GenUI, Tools, MCP).
- Keep changes server-first for runtime internals (`app/api/*`, `lib/server/*`) and maintain existing client chat contract (`@ai-sdk/react` + stream transport).
- Introduce orchestration and observability as composable adapters to avoid coupling core route handlers to one implementation.
- Validate with existing quality gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) and define explicit rollout acceptance criteria.

## 1) Problem statement and goals

### Current baseline (from repo)

- Streaming runtime is concentrated in `POST /api/agent/run` using `streamText`, flow preflight, dynamic tools, model resolution, and finish hooks for analytics logs.
- Structured GenUI runtime is exposed via `POST /api/agent/genui` using `generateObject` and shared Zod schema.
- Client chat UX already uses AI SDK UI primitives (`useChat`, `DefaultChatTransport`) and supports tool approval UX and inline GenUI rendering.
- Observability exists as local JSONL run analytics (`appendRunAnalyticsRecord`) and dashboard aggregation; no external tracing layer is present.

### Target outcomes

1. Preserve existing chat UX and streaming behavior while moving orchestration logic into a LangGraph-compatible execution layer.
2. Add Langfuse trace/span/generation telemetry for run + genui routes without exposing secrets client-side.
3. Keep AI SDK v6 as the transport/UI abstraction to minimize front-end churn.
4. Keep flow document schemas backward-compatible while enabling optional graph-derived execution metadata.

### Non-goals

- Replacing the current Studio flow editor data model.
- Replacing `@repo/shared` GenUI schema contracts.
- Introducing client-side secret handling or browser-side tracing ingestion.

## 2) Proposed architecture (incremental)

### A. Runtime layering

- **Presentation layer (unchanged first):** `RunChatConversation` + AI SDK UI transport.
- **API boundary (minimal change):** existing route handlers remain entry points.
- **Execution adapter (new):** `lib/server/orchestration/*` with an interface:
  - `executeChatRun(request): AsyncIterable<UIMessageChunk>`
  - `executeGenuiRun(request): Promise<GenuiSurface>`
- **Implementation v1:** wraps existing `streamText`/`generateObject` behavior.
- **Implementation v2:** LangGraph-backed adapter preserving input/output shapes.

### B. Observability layering

- **Telemetry adapter (new):** `lib/server/telemetry/*` abstraction:
  - `startRunTrace`, `recordModelCall`, `recordToolCall`, `finishRunTrace`, `captureError`.
- **Implementation v1:** no-op + existing JSONL analytics.
- **Implementation v2:** Langfuse implementation with environment-gated activation.

### C. Data contracts

- Maintain current request contracts for:
  - `/api/agent/run` (`messages`, `flowId?`, `agentId?`, `preferOllama?`)
  - `/api/agent/genui` (`instruction`, `flowId?`, `agentId?`)
- Add optional metadata fields only when strictly additive (e.g., `orchestrationVersion`, `traceId`) and keep clients tolerant.

## 3) Change-set plan with workstreams

### WS-01 — Orchestration abstraction and parity harness

- Build a stable orchestration interface around current server logic.
- Add parity checks to ensure output/tool behavior matches current routes.

### WS-02 — LangGraph execution backend

- Implement LangGraph executor for chat/genui workflows.
- Map existing flow preflight + tool registration + model selection into graph nodes.

### WS-03 — Langfuse telemetry backend

- Add server-only telemetry adapter and emit traces/spans around route executions and tool/model calls.

### WS-04 — Progressive rollout + fallback controls

- Add feature flags for executor and telemetry selection with safe default behavior.
- Keep rollback path to current runtime.

### WS-05 — QA, reliability, and deployment hardening

- Extend tests for adapter behavior and run/build checks.
- Validate Vercel/serverless compatibility and secret scoping.

```mermaid
flowchart TD
  WS01[WS-01 Orchestration Abstraction] --> WS02[WS-02 LangGraph Backend]
  WS01 --> WS03[WS-03 Telemetry Abstraction]
  WS02 --> WS04[WS-04 Rollout Controls]
  WS03 --> WS04
  WS04 --> WS05[WS-05 QA + Deploy Hardening]
```

## 4) Executable task stubs

:::task-stub{title="micro-ui-agent-builder-FutureAIStack-WS01-OrchestrationInterface"}
1. Create `apps/web/lib/server/orchestration/types.ts` with route-facing request/response contracts.
2. Create `apps/web/lib/server/orchestration/executor.ts` interface + resolver by feature flag.
3. Extract current route runtime logic into `apps/web/lib/server/orchestration/current-ai-sdk-executor.ts` without behavior changes.
4. Refactor `app/api/agent/run/route.ts` and `app/api/agent/genui/route.ts` to call the executor.
:::

:::task-stub{title="micro-ui-agent-builder-FutureAIStack-WS02-LangGraphExecutor"}
1. Implement `apps/web/lib/server/orchestration/langgraph-executor.ts`.
2. Model graph nodes for preflight, system prompt build, knowledge augmentation, toolset resolution, model selection, and execution.
3. Ensure node outputs preserve existing API response shape and error semantics.
4. Add parity tests against representative flows (guardrail, tool loop, MCP-enabled).
:::

:::task-stub{title="micro-ui-agent-builder-FutureAIStack-WS03-LangfuseTelemetry"}
1. Add `apps/web/lib/server/telemetry/types.ts` abstraction for tracing events.
2. Add `apps/web/lib/server/telemetry/langfuse.ts` and `noop.ts` implementations.
3. Instrument route lifecycle + model/tool execution boundaries.
4. Propagate `traceId` to server logs and optional API metadata fields.
:::

:::task-stub{title="micro-ui-agent-builder-FutureAIStack-WS04-FeatureFlagsAndRollback"}
1. Define server-only flags for executor and telemetry providers.
2. Add startup validation + safe defaults in non-configured environments.
3. Add operational runbook section in `docs/agents.md` for rollout/rollback.
:::

:::task-stub{title="micro-ui-agent-builder-FutureAIStack-WS05-QAAndRelease"}
1. Add unit tests for executor selection and telemetry gating.
2. Add integration tests for route-level success/failure and fallback paths.
3. Run quality gates: lint, typecheck, test, build.
4. Produce release checklist and post-deploy verification steps.
:::

## 5) Acceptance criteria

- **AC-01:** Existing Run chat UX streams responses and tool calls without front-end API contract changes.
- **AC-02:** GenUI route still validates against shared schema and returns same top-level JSON envelope.
- **AC-03:** LangGraph executor can be enabled/disabled by configuration with deterministic fallback.
- **AC-04:** Langfuse telemetry can be enabled/disabled by configuration with no impact when disabled.
- **AC-05:** Existing analytics JSONL pipeline remains functional during migration.
- **AC-06:** Root quality gates pass in CI and local dev.

## 6) Risks and mitigations

- **Risk:** Streaming semantics diverge between current direct `streamText` and LangGraph runner.
  - **Mitigation:** WS-01 parity harness + golden route fixtures before enabling WS-02 by default.
- **Risk:** Duplicate telemetry (JSONL + Langfuse) or missing trace correlation.
  - **Mitigation:** central telemetry adapter with explicit event mapping and traceId propagation.
- **Risk:** Tool approval or MCP tool naming behavior regresses.
  - **Mitigation:** preserve existing tool name normalization and approval event payload contracts.

## 7) Test-first rollout matrix

- **Pre-change baseline tests:** snapshot current route behavior (success, preflight fail, provider fail, tool output).
- **Migration tests:** run same fixtures with LangGraph executor and compare envelope + error shape.
- **Regression tests:** verify existing dashboards still compute from JSONL analytics records.
- **Deployment tests:** Vercel preview with and without Supabase; ensure no server secret leaks to client bundle.

## 8) Improvement proposal backlog (grounded)

- `#refactor` Extract route runtime internals into server services to reduce `route.ts` complexity and improve testability.
- `#tech-debt` Replace ad-hoc `console.log` events with structured telemetry adapter events to align analytics + tracing.
- `#upkeep` Consolidate provider/env capability checks into a single documented configuration contract.
- `#other` Add explicit orchestration state schema for run lifecycle transitions (queued, preflight, model, tool, complete, failed).

## 9) Open questions (required before implementation)

1. Should LangGraph be the default executor immediately after parity, or staged by environment (dev/staging/prod)?
2. Is Langfuse self-hosted or cloud, and what data retention/privacy constraints apply to prompt/tool payload capture?
3. Should existing JSONL analytics remain long-term, or be treated as fallback only once Langfuse is stable?
4. Do we require end-user visible trace IDs in the Studio UI, or only server logs/API metadata?
5. Is there a required compatibility window for old flow definitions if orchestration metadata is added?
