# Agent and contributor guide — Micro UI Agent Builder

Read this file before non-trivial work: architecture, persistence, API routes, environment, and deployment. For a fast guardrails-only view, see [AGENTS.md](../AGENTS.md) in the repo root.

## Contents

- [Project snapshot](#project-snapshot)
- [Repository layout](#repository-layout)
- [Entry points](#entry-points)
- [Persistence](#persistence)
- [Environment variables](#environment-variables)
- [Orchestration and telemetry rollout](#orchestration-and-telemetry-rollout)
- [API routes](#api-routes)
- [Shared package](#shared-package)
- [Vercel deployment](#vercel-deployment)
- [Supabase and Tabletop Studio](#supabase-and-tabletop-studio)
- [Quality gates](#quality-gates)
- [GitHub CLI](#github-cli)
- [Documentation ownership](#documentation-ownership)

## Project snapshot

- **Monorepo**: pnpm workspaces — `apps/*`, `packages/*` ([pnpm-workspace.yaml](../pnpm-workspace.yaml)).
- **Web app**: `apps/web` — Next.js **15** App Router, React 19, Tailwind 4, Turbopack for dev/build ([apps/web/package.json](../apps/web/package.json)).
- **AI**: Vercel AI SDK **v6** (`ai` package); providers via `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/openai`, `@ai-sdk/gateway`.
- **Validation**: Zod; shared schemas in `@repo/shared` consumed by the app and API routes.
- **Studio UI**: Flows (React Flow), Run (streaming chat), Prompts, Tools, MCP registration and proxy.

## Repository layout

### Root

| Path | Role |
|------|------|
| [package.json](../package.json) | Workspace scripts: `dev`, `build`, `lint`, `typecheck`, `test` |
| [pnpm-workspace.yaml](../pnpm-workspace.yaml) | Workspace package globs |
| [README.md](../README.md) | User onboarding, quick setup, API summary |
| [AGENTS.md](../AGENTS.md) | Lean agent guardrails and redirect here |

### `packages/shared` (`@repo/shared`)

| Path | Role |
|------|------|
| [src/schemas.ts](../packages/shared/src/schemas.ts) | Zod schemas (studio store, GenUI tree, etc.) |
| [src/index.ts](../packages/shared/src/index.ts) | Package exports |
| [src/schemas.test.ts](../packages/shared/src/schemas.test.ts) | Vitest tests |

### `apps/web`

| Path | Role |
|------|------|
| `app/page.tsx` | Landing / entry |
| `app/layout.tsx` | Root layout |
| `app/(studio)/layout.tsx` | Studio chrome |
| `app/(studio)/flows/` | Flow list and detail/edit pages |
| `app/(studio)/run/` | Run page and chat UI |
| `app/(studio)/prompts/` | Prompts management |
| `app/(studio)/tools/` | Tools management |
| `app/(studio)/mcp/` | MCP servers UI |
| `app/api/studio/route.ts` | GET/PUT studio store |
| `app/api/studio/backup/route.ts` | POST backup to Supabase Storage + DB |
| `app/api/agent/run/route.ts` | POST streaming agent run |
| `app/api/agent/genui/route.ts` | POST structured GenUI generation |
| `app/api/agent/approve/route.ts` | POST stub for paused runs |
| `app/api/mcp/proxy/route.ts` | POST forward to HTTP MCP URLs |
| `components/flow/` | Flow editor, diagram, nodes |
| `components/studio/` | Shell, headers |
| `components/genui-renderer.tsx` | Renders GenUI output |
| `components/ai-elements/` | Vercel AI Elements–based chat (Conversation, Message, PromptInput, Tool, Reasoning) |
| `components/ui/` | shadcn-style primitives |
| `hooks/use-studio-api.ts` | Client hooks for `/api/studio` |
| `lib/server/paths.ts` | Data directory (`data/` vs `/tmp` on Vercel) |
| `lib/server/studio-store.ts` | File or Supabase-backed store |
| `lib/server/supabase-admin.ts` | Server Supabase client |
| `lib/server/agent-builder-storage.ts` | Storage bucket helpers |
| `lib/server/language-model.ts` | Model resolution for agents |
| `lib/server/agent-tools.ts` | Tool definitions for runs |
| `lib/server/flow-prompt.ts` | Flow-scoped prompt assembly |
| `lib/flow-graph.ts` | Flow graph utilities (client-safe where used) |
| `lib/utils.ts` | Shared UI utilities |
| `.env.example` | Documented environment variables |

## Entry points

- **Product UX**: `(studio)` routes under `app/(studio)/` — primary navigation for flows, run, prompts, tools, MCP.
- **Data contract**: `@repo/shared` schemas — keep API request/response shapes aligned with Zod in `packages/shared`.
- **Persistence**: `lib/server/studio-store.ts` + `lib/server/paths.ts` — all studio JSON reads/writes should go through this layer, not ad-hoc filesystem access.

## Persistence

Studio state is a single logical document (validated with shared Zod schemas).

### Modes

1. **Supabase** — When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the app uses Postgres schema **`agent_builder`**, table **`studio_snapshots`** (row id **`default`**). Durable and shared across instances.
2. **Local filesystem** — Without Supabase, JSON is stored under **`apps/web/data/`** (created on first use). Path resolution: [apps/web/lib/server/paths.ts](../apps/web/lib/server/paths.ts) (`getDataDir`, `getStoreFilePath`).
3. **Vercel without Supabase** — When `VERCEL=1`, the data directory is **`/tmp/micro-ui-agent-builder/data`**. Writes are allowed but data is **ephemeral** (lost across cold starts, not shared between instances). For production durability on Vercel, use Supabase.

### Backups

- **`POST /api/studio/backup`**: Requires Supabase env. Uploads JSON to private Storage bucket **`agent-builder`** and records metadata in **`agent_builder.studio_artifacts`**.

## Environment variables

Canonical list: [apps/web/.env.example](../apps/web/.env.example).

### LLM keys (at least one required for agent routes)

| Variable | Notes |
|----------|--------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Generative AI |
| `GEMINI_API_KEY` | Often used interchangeably for Gemini |
| `GOOGLE_GENAI_API_KEY` | Alternate Google env name |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Readable on server for some code paths; **do not** rely on this for secrets — prefer server-only keys |
| `GROQ_API_KEY` | Groq |
| `OPENAI_API_KEY` | OpenAI |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway only |

`POST /api/agent/run` and `POST /api/agent/genui` need at least one working provider. Resolution order and behavior are implemented in [apps/web/lib/server/language-model.ts](../apps/web/lib/server/language-model.ts) and route handlers.

### Supabase (optional, server-only for service role)

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** — bypasses RLS; never expose to the browser |

RLS is expected to block `anon` / `authenticated` on `agent_builder` tables; the app uses the service role for server-side studio persistence.

### Orchestration runtime (optional, server-only)

#### Orchestration flags — single source of truth

| Variable | Allowed values | Purpose | Current effect |
|----------|----------------|---------|----------------|
| `ORCHESTRATION_BACKEND` | `ai_sdk` (default), `langgraph` | Runtime config gate for route execution backend selection. | `ai_sdk` executes via current AI SDK path. `langgraph` is currently **fail-closed** for route execution until a LangGraph executor is shipped. |
| `AGENT_ORCHESTRATION_EXECUTOR` | `current-ai-sdk` (default), `next-ai-sdk` | Internal executor selector used by orchestration resolver. | Both values currently resolve to the same `CurrentAiSdkOrchestrationExecutor` implementation (AI SDK executor contract parity flag). |
| `LANGGRAPH_API_URL` | non-empty URL | LangGraph endpoint for remote execution. | Required when `ORCHESTRATION_BACKEND=langgraph`; missing value fails closed. |
| `LANGGRAPH_API_KEY` | non-empty secret | LangGraph auth for remote execution. | Required when `ORCHESTRATION_BACKEND=langgraph`; missing value fails closed. |

**Precedence note**

1. `ORCHESTRATION_BACKEND` is evaluated first and gates route backend eligibility.
2. `AGENT_ORCHESTRATION_EXECUTOR` is only relevant when backend resolution stays on the AI SDK path.
3. If backend resolution is `langgraph` before LangGraph executor support exists (or required LangGraph env is missing), startup/request execution fails closed; executor selector does not override that gate.

**Startup behavior examples (missing/invalid values)**

- `ORCHESTRATION_BACKEND` unset → defaults to `ai_sdk`; runtime uses AI SDK execution path.
- `ORCHESTRATION_BACKEND=invalid` → runtime rejects backend config (503 fail-closed) with remediation guidance.
- `ORCHESTRATION_BACKEND=langgraph` with missing `LANGGRAPH_API_URL` or `LANGGRAPH_API_KEY` → fail-closed (503) with explicit missing-variable guidance.
- `AGENT_ORCHESTRATION_EXECUTOR` unset → defaults to `current-ai-sdk`.
- `AGENT_ORCHESTRATION_EXECUTOR=unknown` with `ORCHESTRATION_BACKEND=ai_sdk` → resolver falls back to `current-ai-sdk`.

**Migration note (when `langgraph-executor.ts` is introduced)**

- After `apps/web/lib/server/orchestration/langgraph-executor.ts` is added, update this table so `ORCHESTRATION_BACKEND=langgraph` maps to the real executor path, document any new `AGENT_ORCHESTRATION_EXECUTOR` values, and keep `ai_sdk` as rollback target until parity checks pass.

### Telemetry runtime (optional, server-only)

| Variable | Notes |
|----------|--------|
| `TELEMETRY_PROVIDER` | `noop` (default) or `langfuse` |
| `LANGFUSE_TRACING_ENABLED` | Legacy compatibility toggle. Prefer explicit `TELEMETRY_PROVIDER` |
| `LANGFUSE_PUBLIC_KEY` | Required when `TELEMETRY_PROVIDER=langfuse` |
| `LANGFUSE_SECRET_KEY` | **Server-only**. Required when `TELEMETRY_PROVIDER=langfuse` |
| `LANGFUSE_BASEURL` | Optional API base URL (defaults to `https://cloud.langfuse.com`) |


## Orchestration and telemetry rollout

Production-safe defaults are now **`ORCHESTRATION_BACKEND=ai_sdk`** and **`TELEMETRY_PROVIDER=noop`** when variables are unset.

### Rollout sequence

1. Deploy with defaults (no new flags) and confirm `/api/agent/run` + `/api/agent/genui` are healthy.
2. Verify `GET /api/runtime/health` returns `ok: true` before enabling optional providers.
3. If enabling Langfuse, set `TELEMETRY_PROVIDER=langfuse` plus `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`.
4. Restart deployment and verify traces are arriving.
5. Keep `ORCHESTRATION_BACKEND=ai_sdk` until `apps/web/lib/server/orchestration/langgraph-executor.ts` is deployed and validated.
6. Only then set `ORCHESTRATION_BACKEND=langgraph` with `LANGGRAPH_API_URL` and `LANGGRAPH_API_KEY`.

### Rollback sequence

1. On elevated errors, set `ORCHESTRATION_BACKEND=ai_sdk` immediately.
2. If telemetry causes failures, set `TELEMETRY_PROVIDER=noop`.
3. Redeploy/restart and validate API health checks.

### Guardrail behavior

- Invalid enum values (for `ORCHESTRATION_BACKEND` or `TELEMETRY_PROVIDER`) fail with explicit 503 errors.
- Invalid/missing orchestration flag combinations should be interpreted using the single-source-of-truth table above.
- `langgraph` backend without `LANGGRAPH_API_URL` + `LANGGRAPH_API_KEY` fails closed with remediation guidance.
- `langfuse` telemetry without required keys fails closed with remediation guidance.
- Conflict (`LANGFUSE_TRACING_ENABLED=true` + `TELEMETRY_PROVIDER=noop`) fails closed with a corrective message.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET, PUT | `/api/studio` | Read/write full studio store; PUT body Zod-validated |
| POST | `/api/studio/backup` | Backup to Storage + `studio_artifacts` (Supabase required) |
| POST | `/api/agent/run` | Streaming chat; body `{ messages, flowId? }` |
| POST | `/api/agent/genui` | Structured UI tree; body `{ instruction, flowId? }`; uses `generateObject` + shared schema |
| POST | `/api/agent/approve` | Stub: clears `pausedRuns` session |
| POST | `/api/mcp/proxy` | Forwards JSON to registered **http** MCP URLs; body `{ mcpServerId, request }` |
| GET | `/api/runtime/health` | Sanitized runtime config health (`ok` + backend/provider readiness) for rollout verification |

**Generative UI — two paths (both valid):**

1. **Inline in streamed chat** — `RunChatConversation` parses tool outputs with `tryParseGenuiSurfaceFromToolOutput` and renders `GenuiSurfaceView` when the payload matches the shared Zod schema. Flows can register `emit_genui_surface` ([`lib/server/agent-tools.ts`](../apps/web/lib/server/agent-tools.ts)) so the model can emit surfaces during `streamText`.
2. **Dedicated `POST /api/agent/genui`** — One-shot `generateObject` for the Run page “default” variant or tooling; prefer this when you want strong structured output from providers that handle JSON schema well (local Ollama may be weaker for inline tool JSON).

Implementation files live beside each route under `apps/web/app/api/`.

## Shared package

- **Name**: `@repo/shared`
- **Build**: `pnpm --filter shared build` (runs as part of root `pnpm build`)
- **Consumption**: `workspace:*` in `apps/web/package.json`

When you change schemas, rebuild shared before typechecking the web app if your editor does not watch `dist/`.

## Vercel deployment

`apps/web/vercel.json` sets **`installCommand`** and **`buildCommand`** to run from the **monorepo root** (`cd ../.. && pnpm install` / `pnpm build`) so `@repo/shared` resolves and pnpm is used consistently.

### Dashboard setup

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repository.
3. Set **Root Directory** to **`apps/web`**.
4. Framework preset: **Next.js**. Leave install/build overrides empty unless you need to change them — the repo’s `vercel.json` supplies the monorepo commands.
5. Add **Environment variables**: at least one LLM key (for example `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`). For durable studio state, add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (same Tabletop Studio Supabase project if you use that stack; apply the migration from that repo if not already applied).
6. Deploy.

### Vercel CLI

The CLI uploads **only the directory you run it from**. To include `packages/shared`, run commands from the **repository root** after linking that directory to your Vercel project.

**One-time (dashboard):** open the project → **Settings** → **General** → **Root Directory** → set to **`apps/web`**. Without this, Vercel reads the root `package.json` (no `next`) and the build fails.

If the interactive `vercel link` asked **“In which directory is your code located?”** and you chose **`./`**, that is correct for uploading the whole monorepo. It does **not** set the app root on the server. You still need **Root Directory = `apps/web`** in the dashboard (and **Framework Preset = Next.js**). Otherwise Vercel may treat the repo as a static site and fail with **“No Output Directory named `public` found”** after the build.

#### Troubleshooting: `No Output Directory named "public"`

That message means Vercel is **not** using the Next.js builder for `apps/web`. Fix it in the dashboard:

1. **Settings** → **General** → **Root Directory** → **`apps/web`** (Save).
2. **Framework Preset** → **Next.js** (not “Other” / static).
3. Under **Build & Development Settings**, clear a wrong **Output Directory** if it was set to `public` manually — Next.js deployments should use the default (no static `public` folder required at repo root).

Redeploy (push a commit or run `vercel deploy --prod` again from the monorepo root).

```bash
cd /path/to/micro-ui-agent-builder   # monorepo root
vercel login
vercel link --scope <your-team-slug>   # link this root to the project (Root Directory must be apps/web as above)
vercel env pull                        # optional
vercel deploy --scope <your-team-slug> --prod
```

Non-interactive example:

```bash
vercel deploy --yes --scope <your-team-slug> --prod
```

Set an LLM key in the dashboard (for example `vercel env add GROQ_API_KEY`).

The root **`package.json`** includes **`packageManager`** (`pnpm@9.x`) so Vercel can use pnpm consistently with the lockfile.

## Supabase and Tabletop Studio

The optional Supabase integration is designed to use the **same project** as **Tabletop Studio** when you want shared infrastructure.

- **Schema**: `agent_builder`
- **Tables**: `studio_snapshots` (primary document), `studio_artifacts` (backup metadata)
- **Storage**: private bucket **`agent-builder`**

The SQL migration is maintained in the Tabletop Studio repository:

**`supabase/migrations/20260325195000_agent_builder_schema_and_storage.sql`**

Apply that migration in your Supabase project before relying on server-side studio persistence or backups from this app.

## Quality gates

From the **repository root**:

| Command | Purpose |
|---------|---------|
| `pnpm lint` | ESLint across workspaces |
| `pnpm typecheck` | `tsc --noEmit` (builds `@repo/shared` first) |
| `pnpm test` | Vitest in `packages/shared` |
| `pnpm build` | Production build: shared + Next.js |

Run `lint` and `typecheck` before opening a PR.

## GitHub CLI

Examples (replace owner/repo):

```bash
gh issue create --repo OWNER/REPO --title "Title" --body "Description"
gh pr create --repo OWNER/REPO --title "Title" --body "Summary"
```

Use [.github/ISSUE_TEMPLATE](../.github/ISSUE_TEMPLATE/) and [.github/pull_request_template.md](../.github/pull_request_template.md) for consistent reports and PR descriptions.

## Documentation ownership

- **README.md**: Onboarding, requirements, scripts, short persistence summary, API table, link to this file for deep detail.
- **AGENTS.md**: Lean guardrails for AI agents; must stay short.
- **docs/agents.md** (this file): Operational truth for layout, env, APIs, Vercel, and Supabase.

When you change persistence behavior, API contracts, or deployment steps, update **this file** first, then trim **README** to summaries and links so there is a single detailed source.
