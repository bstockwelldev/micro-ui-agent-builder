# Micro UI Agent Builder

pnpm monorepo: **`@repo/shared`** (Zod schemas) + **Next.js 15** app in `apps/web` with AI SDK v6, file-backed studio store, and a small studio UI (Flows, Run, Prompts, Tools, MCP).

## Requirements

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Set OPENAI_API_KEY in apps/web/.env.local
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

See **`apps/web/.env.example`**. The agent route requires **`OPENAI_API_KEY`** for `POST /api/agent/run`.

## Data / persistence

The studio API reads and writes JSON under **`apps/web/data/`** (created on first use). On **Vercel serverless**, that filesystem is **ephemeral** and not shared across instances. For production, plan an external store (database, blob, KV) or accept dev-only persistence.

## Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repository.
3. Set **Root Directory** to **`apps/web`** (monorepo).
4. Framework preset: **Next.js**. Build command defaults are fine; the install step at the repo root should run `pnpm install` from the monorepo (Vercel detects pnpm workspace).
5. Add **Environment variable**: `OPENAI_API_KEY` (Production + Preview as needed).
6. Deploy.

### Vercel CLI (alternative)

From your machine, with [Vercel CLI](https://vercel.com/docs/cli) installed:

```bash
cd apps/web
vercel login
vercel link    # create new project or link existing; set scope/team as prompted
vercel env pull   # optional: fetch env into .env.local
vercel --prod     # production deploy
```

For a **new** project, `vercel link` walks you through linking the local directory to a Vercel project. Set **`OPENAI_API_KEY`** in the dashboard or with `vercel env add OPENAI_API_KEY`.

Ensure the Vercel project **Root Directory** is **`apps/web`** so builds resolve `workspace:*` to `@repo/shared`.

## API overview

| Method | Path | Notes |
|--------|------|--------|
| GET/PUT | `/api/studio` | Read/write full studio store (Zod-validated on PUT) |
| POST | `/api/agent/run` | Streaming chat; body `{ messages, flowId? }` |
| POST | `/api/agent/approve` | Stub: clears a `pausedRuns` session |
| POST | `/api/mcp/proxy` | Stub: **501** |

## License

Private prototype — adjust as needed.
