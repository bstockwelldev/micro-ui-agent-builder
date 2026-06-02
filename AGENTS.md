# AGENTS.md — Micro UI Agent Builder

## Purpose

- Give AI agents and contributors **guardrails and quick orientation** without loading the full repo map here.
- Point all **non-trivial work** to the detailed guide: **[docs/agents.md](docs/agents.md)** (persistence, APIs, Vercel, Supabase, directory map).

## Minimal public-safe agent stack policy

- **PP-GLOSS handoffs**: when drafting a “new chat starter” or cross-tool handoff, include a short **GLOSS** (IDs → one-line defs), **RES** (how to resolve IDs), then the task body. Keep it generic and never include secrets (env var **names** only).
- **Prompt validation**: treat `packages/shared/src/schemas.ts` as the contract for studio store + structured outputs; prefer Zod validation at boundaries (`/api/*`, server helpers).
- **Optional git hygiene**: use Conventional Commits if the repo already follows them; otherwise don’t introduce new commit policy.
- **Explicitly avoid** committing tracker/workflow coupling (Linear, Jira, “change-plan” stacks) unless the user asks.

## Project snapshot

| Area | Summary |
|------|---------|
| **Monorepo** | pnpm workspaces: `apps/web` (Next.js 15), `packages/shared` (`@repo/shared`, Zod schemas) |
| **Product** | Studio UI: Flows, Run (streaming chat), Prompts, Tools, MCP; AI SDK v6 + multiple LLM providers |
| **Data** | Studio JSON via `/api/studio` — file store locally, `/tmp` on Vercel without Supabase, or Postgres `agent_builder` + optional Storage backups with Supabase |
| **APIs** | `studio`, `studio/backup`, `agent/run`, `agent/genui`, `agent/approve`, `mcp/proxy` under `apps/web/app/api/` |

## Quick start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Set at least one LLM key in apps/web/.env.local
pnpm dev
```

**Core checks (repo root):** `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`

## Repo shape (brief)

- `apps/web/` — Next.js App Router, `app/(studio)/`, `app/api/`, `components/`, `hooks/`, `lib/`
- `packages/shared/` — Zod schemas and tests (Vitest)
- `docs/agents.md` — **Full** entry points, env matrix, API notes, Vercel troubleshooting, Tabletop Studio migration reference

## Standards

- **Server vs client**: LLM calls, Supabase service role, and studio persistence belong in **server** code (Route Handlers, `lib/server/*`). Do not expose `SUPABASE_SERVICE_ROLE_KEY` or provider secrets to the browser.
- **Validation**: Use `@repo/shared` Zod schemas for studio store and structured outputs; keep PUT `/api/studio` aligned with those schemas.
- **Persistence**: Use `lib/server/studio-store.ts` and `lib/server/paths.ts` — avoid ad-hoc reads/writes to `data/` or `/tmp`.
- **Tests**: Schema and shared logic tests live in `packages/shared`; run `pnpm test` before merging behavioral changes to schemas.

## Always / Ask first / Never

**Always**

- Read [docs/agents.md](docs/agents.md) before changing persistence, env contracts, API bodies, or deployment docs.
- Run `pnpm lint` and `pnpm typecheck` when touching TypeScript.
- Rebuild or rely on workspace build order for `@repo/shared` when schemas change (`pnpm build` or `pnpm typecheck` from root).

**Ask first**

- Adding new environment variables or changing provider resolution order.
- New Supabase tables or RLS policies (migration may live in Tabletop Studio repo).

**Never**

- Commit real API keys or service role keys.
- Send the Supabase service role key to the client or prefix it with `NEXT_PUBLIC_`.

## Redirect

**Before non-trivial work, read [docs/agents.md](docs/agents.md).**

User-facing onboarding remains in [README.md](README.md); deep operational detail lives in `docs/agents.md` to avoid drift.
