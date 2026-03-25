import path from "node:path";

export function getDataDir(): string {
  return path.join(process.cwd(), "data");
}

export function getStoreFilePath(): string {
  return path.join(getDataDir(), "store.json");
}
