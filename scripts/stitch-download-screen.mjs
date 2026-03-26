/**
 * Fetch Stitch screenshot + HTML URLs via @google/stitch-sdk, then download bytes.
 *
 * Requires STITCH_API_KEY (or STITCH_ACCESS_TOKEN + GOOGLE_CLOUD_PROJECT per SDK docs).
 *
 * Usage:
 *   node scripts/stitch-download-screen.mjs [projectId] [screenId] [slug]
 *
 * Example:
 *   node scripts/stitch-download-screen.mjs 4397125726045291654 aab0d9e6ec59425eb3f5b00013481a04 advanced-flow-builder "Advanced Flow Builder (Canvas)"
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const defaultOut = join(repoRoot, "docs", "stitch-reference");

const projectId = process.argv[2] ?? "4397125726045291654";
const screenId = process.argv[3] ?? "aab0d9e6ec59425eb3f5b00013481a04";
const slug = process.argv[4] ?? "advanced-flow-builder";
const titleArg = process.argv[5];
const title =
  titleArg ??
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

async function downloadToFile(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`GET ${url.slice(0, 80)}… → ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return buf.length;
}

async function main() {
  if (!process.env.STITCH_API_KEY && !process.env.STITCH_ACCESS_TOKEN) {
    console.error(
      "Missing STITCH_API_KEY (or OAuth STITCH_ACCESS_TOKEN). Set it and re-run.",
    );
    process.exit(1);
  }

  const project = stitch.project(projectId);
  const screen = await project.getScreen(screenId);
  const imageUrl = await screen.getImage();
  const htmlUrl = await screen.getHtml();

  const shotPath = join(defaultOut, "screenshots", `${slug}.png`);
  const htmlPath = join(defaultOut, "html", `${slug}.html`);
  const manifestPath = join(defaultOut, "screens-manifest.json");

  const pngBytes = await downloadToFile(imageUrl, shotPath);
  let htmlBytes = 0;
  let htmlNote = "ok";
  try {
    htmlBytes = await downloadToFile(htmlUrl, htmlPath);
  } catch (e) {
    htmlNote = e instanceof Error ? e.message : String(e);
    console.warn("HTML download failed (often 403 without browser cookies):", htmlNote);
  }

  let manifest = [];
  try {
    const raw = await readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw);
  } catch {
    /* empty */
  }
  const entry = {
    slug,
    title,
    projectId,
    screenId,
    screenshotPath: `screenshots/${slug}.png`,
    htmlPath: htmlBytes ? `html/${slug}.html` : null,
    htmlNote: htmlBytes ? null : htmlNote,
    fetchedAt: new Date().toISOString(),
  };
  const idx = manifest.findIndex((m) => m.screenId === screenId);
  if (idx >= 0) manifest[idx] = entry;
  else manifest.push(entry);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      { shotPath, pngBytes, htmlPath, htmlBytes, htmlNote, imageUrl, htmlUrl },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
