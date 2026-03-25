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

Optional Supabase (same project as **Tabletop Studio**): set **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** (server-only). The app then reads/writes the studio document in Postgres schema **`agent_builder`** (`studio_snapshots`, id **`default`**) instead of the local file. RLS blocks **`anon`** / **`authenticated`**; the service role key bypasses RLS and must never be exposed to the browser. **`POST /api/studio/backup`** uploads JSON to the private Storage bucket **`agent-builder`** and inserts a row in **`agent_builder.studio_artifacts`**. The migration file lives in the Tabletop Studio repo: **`supabase/migrations/20260325195000_agent_builder_schema_and_storage.sql`**.

## Data / persistence

**With Supabase env vars set:** studio state is stored in **`agent_builder.studio_snapshots`** (durable, shared across instances).

**Without Supabase:** the studio API reads and writes JSON under **`apps/web/data/`** (created on first use). When **`VERCEL=1`**, the store file is written under **`/tmp/micro-ui-agent-builder/data`** because Vercel serverless only allows writes in `/tmp`. That `/tmp` data is **ephemeral** (lost on cold starts, not shared across instances).

## Vercel

`apps/web/vercel.json` sets **`installCommand`** / **`buildCommand`** to run `pnpm install` and `pnpm build` from the **monorepo root** (`cd ../..`), so `@repo/shared` resolves and **pnpm** is used (not `npm` in `apps/web` alone).

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repository.
3. Set **Root Directory** to **`apps/web`**.
4. Framework preset: **Next.js**. Leave install/build overrides empty unless you need to change them—the repo’s `vercel.json` supplies the monorepo commands.
5. Add **Environment variables**: `OPENAI_API_KEY` (Production + Preview as needed). For durable studio state, add **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** (same Tabletop Studio Supabase project; apply migration from that repo if not already applied).
6. Deploy.

### Vercel CLI

The CLI uploads **only the directory you run it from**. To include `packages/shared`, run commands from the **repository root** after linking that directory to your Vercel project.

**One-time (dashboard):** open the project → **Settings** → **General** → **Root Directory** → set to **`apps/web`**. Without this, Vercel reads the root `package.json` (no `next`) and the build fails.

If the interactive `vercel link` asked **“In which directory is your code located?”** and you chose **`./`**, that is correct for uploading the whole monorepo. It does **not** set the app root on the server. You still need **Root Directory = `apps/web`** in the dashboard (and **Framework Preset = Next.js**). Otherwise Vercel may treat the repo as a static site and fail with **“No Output Directory named `public` found”** after the build.

#### Troubleshooting: `No Output Directory named "public"`

That message means Vercel is **not** using the Next.js builder for `apps/web`. Fix it in the dashboard:

1. **Settings** → **General** → **Root Directory** → **`apps/web`** (Save).
2. **Framework Preset** → **Next.js** (not “Other” / static).
3. Under **Build & Development Settings**, clear a wrong **Output Directory** if it was set to `public` manually—Next.js deployments should use the default (no static `public` folder required at repo root).

Redeploy (push a commit or run `vercel deploy --prod` again from the monorepo root).

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
| POST | `/api/studio/backup` | JSON backup to Storage + `studio_artifacts` (requires Supabase env) |
| POST | `/api/agent/run` | Streaming chat; body `{ messages, flowId? }` |
| POST | `/api/agent/approve` | Stub: clears a `pausedRuns` session |
| POST | `/api/mcp/proxy` | Stub: **501** |

## License

Private prototype — adjust as needed.
