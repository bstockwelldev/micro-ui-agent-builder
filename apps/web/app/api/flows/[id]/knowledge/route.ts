import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  missingEmbeddingProviderMessage,
  resolveEmbeddingModel,
} from "@/lib/server/embedding-model";
import { chunkText, embedKnowledgeChunks } from "@/lib/server/flow-knowledge-rag";
import {
  getFlowKnowledgeEntry,
  readFlowKnowledgeRoot,
  summarizeEntryForApi,
  writeFlowKnowledgeRoot,
  type FlowKnowledgeChunk,
  type FlowKnowledgeDocument,
  type FlowKnowledgeEntry,
} from "@/lib/server/flow-knowledge-store";
import { getFlowById, readStudioStore } from "@/lib/server/studio-store";

const MAX_UPLOAD_BYTES = 400 * 1024;
const EMBED_BATCH = 64;

const ALLOWED_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream",
]);

function isProbablyTextFile(name: string, mime: string): boolean {
  if (ALLOWED_MIME.has(mime)) {
    if (mime === "application/octet-stream") {
      const lower = name.toLowerCase();
      return (
        lower.endsWith(".txt") ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown")
      );
    }
    return true;
  }
  const lower = name.toLowerCase();
  return lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
}

async function ensureFlowExists(flowId: string): Promise<boolean> {
  const store = await readStudioStore();
  return Boolean(getFlowById(store, flowId));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: flowId } = await ctx.params;
  if (!flowId?.trim()) {
    return NextResponse.json({ error: "Missing flow id" }, { status: 400 });
  }
  if (!(await ensureFlowExists(flowId))) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }
  const root = await readFlowKnowledgeRoot();
  const entry = getFlowKnowledgeEntry(root, flowId);
  return NextResponse.json({
    flowId,
    ...summarizeEntryForApi(entry),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: flowId } = await ctx.params;
  if (!flowId?.trim()) {
    return NextResponse.json({ error: "Missing flow id" }, { status: 400 });
  }
  if (!(await ensureFlowExists(flowId))) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  const resolution = resolveEmbeddingModel();
  if (!resolution) {
    return NextResponse.json(
      { error: missingEmbeddingProviderMessage() },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Expected form field "file"' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_UPLOAD_BYTES} bytes)` },
      { status: 400 },
    );
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  const name = file.name || "upload.txt";
  if (!isProbablyTextFile(name, mime)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload .txt or .md (text/plain or text/markdown).",
      },
      { status: 400 },
    );
  }

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    text = buf.toString("utf8");
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  const pieces = chunkText(text);
  if (pieces.length === 0) {
    return NextResponse.json({ error: "No text content to index" }, { status: 400 });
  }

  const root = await readFlowKnowledgeRoot();
  let entry: FlowKnowledgeEntry = root.flows[flowId] ?? {
    embeddingProvider: resolution.provider,
    embeddingModelId: resolution.modelId,
    documents: [],
    chunks: [],
  };

  if (entry.chunks.length > 0 || entry.documents.length > 0) {
    if (
      entry.embeddingProvider !== resolution.provider ||
      entry.embeddingModelId !== resolution.modelId
    ) {
      return NextResponse.json(
        {
          error:
            "This flow's knowledge was indexed with a different embedding provider/model. Remove all documents and re-upload, or restore the same API keys and embedding model env vars.",
        },
        { status: 409 },
      );
    }
  } else {
    entry = {
      embeddingProvider: resolution.provider,
      embeddingModelId: resolution.modelId,
      documents: [],
      chunks: [],
    };
  }

  const docId = randomUUID();
  const now = new Date().toISOString();
  const doc: FlowKnowledgeDocument = {
    id: docId,
    name,
    mimeType: mime,
    uploadedAt: now,
    charCount: text.length,
  };

  const newChunks: FlowKnowledgeChunk[] = [];
  for (let i = 0; i < pieces.length; i += EMBED_BATCH) {
    const batch = pieces.slice(i, i + EMBED_BATCH);
    const vectors = await embedKnowledgeChunks(resolution, batch);
    if (vectors.length !== batch.length) {
      return NextResponse.json(
        { error: "Embedding provider returned unexpected batch size" },
        { status: 502 },
      );
    }
    for (let j = 0; j < batch.length; j++) {
      newChunks.push({
        id: randomUUID(),
        documentId: docId,
        text: batch[j]!,
        vector: vectors[j]!,
      });
    }
  }

  entry.documents.push(doc);
  entry.chunks.push(...newChunks);
  root.flows[flowId] = entry;
  await writeFlowKnowledgeRoot(root);

  return NextResponse.json({
    ok: true,
    documentId: docId,
    addedChunkCount: newChunks.length,
    ...summarizeEntryForApi(entry),
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: flowId } = await ctx.params;
  if (!flowId?.trim()) {
    return NextResponse.json({ error: "Missing flow id" }, { status: 400 });
  }
  if (!(await ensureFlowExists(flowId))) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const documentId = url.searchParams.get("documentId")?.trim();
  if (!documentId) {
    return NextResponse.json(
      { error: "Query parameter documentId is required" },
      { status: 400 },
    );
  }

  const root = await readFlowKnowledgeRoot();
  const entry = root.flows[flowId];
  if (!entry) {
    return NextResponse.json({ error: "No knowledge for this flow" }, { status: 404 });
  }

  const before = entry.documents.length;
  entry.documents = entry.documents.filter((d) => d.id !== documentId);
  entry.chunks = entry.chunks.filter((c) => c.documentId !== documentId);
  if (entry.documents.length === before) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (entry.documents.length === 0) {
    delete root.flows[flowId];
  } else {
    root.flows[flowId] = entry;
  }
  await writeFlowKnowledgeRoot(root);

  return NextResponse.json({ ok: true, ...summarizeEntryForApi(root.flows[flowId]) });
}
