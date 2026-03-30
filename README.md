# Micro UI Agent Builder

pnpm monorepo: **`@repo/shared`** (Zod schemas) + **Next.js 15** app in `apps/web` with AI SDK v6, file-backed studio store, and a small studio UI (Flows, Run, Prompts, Tools, MCP).

## Documentation

| Doc | Audience |
|-----|----------|
| **[AGENTS.md](AGENTS.md)** | AI agents and contributors — guardrails, quick start, standards |
| **[docs/agents.md](docs/agents.md)** | Full repo map, persistence, env, API detail, Vercel troubleshooting, Supabase / Tabletop Studio migration pointer |

## Requirements

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Set at least one LLM key in apps/web/.env.local (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY preferred for GenUI)
```

## Scripts (repo root)

| Command | Description |
|--------|-------------|
| `pnpm dev` | Next dev server (`apps/web`) |
| `pnpm build` | Build shared package + Next production build |
| `pnpm lint` | ESLint in workspaces |
| `pnpm typecheck` | `tsc --noEmit` in workspaces |
| `pnpm test` | Vitest in `packages/shared` |

## Environment

See **`apps/web/.env.example`**. **`POST /api/agent/run`** and **`POST /api/agent/genui`** need at least one of **`GOOGLE_GENERATIVE_AI_API_KEY`**, **`GEMINI_API_KEY`**, **`GOOGLE_GENAI_API_KEY`**, or **`NEXT_PUBLIC_GEMINI_API_KEY`** (preferred for structured outputs / GenUI), **`GROQ_API_KEY`**, **`OPENAI_API_KEY`**, or **`AI_GATEWAY_API_KEY`** (Vercel AI Gateway only).

Optional Supabase (same project as **Tabletop Studio**): set **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** (server-only). The app then reads/writes the studio document in Postgres schema **`agent_builder`** (`studio_snapshots`, id **`default`**) instead of the local file. RLS blocks **`anon`** / **`authenticated`**; the service role key bypasses RLS and must never be exposed to the browser. **`POST /api/studio/backup`** uploads JSON to the private Storage bucket **`agent-builder`** and inserts a row in **`agent_builder.studio_artifacts`**. The migration file lives in the Tabletop Studio repo: **`supabase/migrations/20260325195000_agent_builder_schema_and_storage.sql`**.

Full variable matrix and behavior: **[docs/agents.md#environment-variables](docs/agents.md#environment-variables)**.

### Telemetry providers

Langfuse tracing is server-only and opt-in. Use **`LANGFUSE_TRACING_ENABLED=true`** only when **`LANGFUSE_PUBLIC_KEY`** and **`LANGFUSE_SECRET_KEY`** are set (optional **`LANGFUSE_BASEURL`**). Canonical variable definitions live in **`apps/web/.env.example`** and **[docs/agents.md#langfuse-tracing-optional-server-only](docs/agents.md#langfuse-tracing-optional-server-only)**.

## Data / persistence

**With Supabase env vars set:** studio state is stored in **`agent_builder.studio_snapshots`** (durable, shared across instances).

**Without Supabase:** the studio API reads and writes JSON under **`apps/web/data/`** (created on first use). When **`VERCEL=1`**, the store file is written under **`/tmp/micro-ui-agent-builder/data`** because Vercel serverless only allows writes in `/tmp`. That `/tmp` data is **ephemeral** (lost on cold starts, not shared across instances).

More detail: **[docs/agents.md#persistence](docs/agents.md#persistence)**.

## Vercel

`apps/web/vercel.json` runs **`pnpm install`** and **`pnpm build`** from the **monorepo root** so `@repo/shared` resolves. In the Vercel project, set **Root Directory** to **`apps/web`**, framework **Next.js**, and add at least one LLM env var (plus Supabase vars if you want durable studio state).

**Full dashboard steps, CLI commands, and troubleshooting** (including “No Output Directory named `public`”): **[docs/agents.md#vercel-deployment](docs/agents.md#vercel-deployment)**.

## API overview

| Method | Path | Notes |
|--------|------|-------|
| GET/PUT | `/api/studio` | Read/write full studio store (Zod-validated on PUT) |
| POST | `/api/studio/backup` | JSON backup to Storage + `studio_artifacts` (requires Supabase env) |
| POST | `/api/agent/run` | Streaming chat; body `{ messages, flowId? }` (Groq → Google → OpenAI resolution; usage logged on finish) |
| POST | `/api/agent/genui` | Structured UI tree; body `{ instruction, flowId? }` (`generateObject` + shared Zod schema; optional provider fallback) |
| POST | `/api/agent/approve` | Stub: clears a `pausedRuns` session |
| POST | `/api/mcp/proxy` | Forwards JSON to registered **`http`** MCP URLs; body `{ mcpServerId, request }` |

Route-level notes: **[docs/agents.md#api-routes](docs/agents.md#api-routes)**.

## License

Private prototype — adjust as needed.
