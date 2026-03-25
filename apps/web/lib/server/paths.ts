import path from "node:path";

/**
 * Studio JSON lives on disk for local dev. On Vercel, only `/tmp` is writable for
 * Node serverless routes — using `process.cwd()/data` causes persist to fail and
 * `/api/studio` to 500 after the first read (see seed + write path).
 */
export function getDataDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "micro-ui-agent-builder", "data");
  }
  return path.join(process.cwd(), "data");
}

export function getStoreFilePath(): string {
  return path.join(getDataDir(), "store.json");
}
