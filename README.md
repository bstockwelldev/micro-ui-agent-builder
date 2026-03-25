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

`apps/web/vercel.json` sets **`installCommand`** / **`buildCommand`** to run `pnpm install` and `pnpm build` from the **monorepo root** (`cd ../..`), so `@repo/shared` resolves and **pnpm** is used (not `npm` in `apps/web` alone).

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repository.
3. Set **Root Directory** to **`apps/web`**.
4. Framework preset: **Next.js**. Leave install/build overrides empty unless you need to change them—the repo’s `vercel.json` supplies the monorepo commands.
5. Add **Environment variable**: `OPENAI_API_KEY` (Production + Preview as needed).
6. Deploy.

### Vercel CLI

The CLI uploads **only the directory you run it from**. To include `packages/shared`, run commands from the **repository root** after linking that directory to your Vercel project.

**One-time (dashboard):** open the project → **Settings** → **General** → **Root Directory** → set to **`apps/web`**. Without this, Vercel reads the root `package.json` (no `next`) and the build fails.

```bash
cd /path/to/micro-ui-agent-builder   # monorepo root
vercel login
vercel link --scope <your-team-slug>   # link this root to the project (Root Directory must be apps/web as above)
vercel env pull                        # optional
vercel deploy --scope <your-team-slug> --prod
```

Non-interactive example:

`vercel deploy --yes --scope brandon-stockwells-projects --prod`

Set **`OPENAI_API_KEY`** in the dashboard or with `vercel env add OPENAI_API_KEY`.

The root **`package.json`** includes **`packageManager`** (`pnpm@9.x`) so Vercel can use pnpm consistently with the lockfile.

## API overview

| Method | Path | Notes |
|--------|------|--------|
| GET/PUT | `/api/studio` | Read/write full studio store (Zod-validated on PUT) |
| POST | `/api/agent/run` | Streaming chat; body `{ messages, flowId? }` |
| POST | `/api/agent/approve` | Stub: clears a `pausedRuns` session |
| POST | `/api/mcp/proxy` | Stub: **501** |

## License

Private prototype — adjust as needed.
