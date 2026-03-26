import { embed, embedMany } from "ai";
import type { UIMessage } from "ai";

import type {
  FlowKnowledgeChunk,
  FlowKnowledgeEntry,
} from "@/lib/server/flow-knowledge-store";
import {
  resolveEmbeddingModel,
  type ResolvedEmbeddingModel,
} from "@/lib/server/embedding-model";

const CHUNK_TARGET = 900;
const CHUNK_OVERLAP = 100;
const TOP_K = 5;

/** Exported for tests — splits long text into overlapping chunks. */
export function chunkText(
  text: string,
  maxLen = CHUNK_TARGET,
  overlap = CHUNK_OVERLAP,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxLen, normalized.length);
    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const lastPara = slice.lastIndexOf("\n\n");
      const lastSpace = slice.lastIndexOf(" ");
      const breakAt =
        lastPara > maxLen * 0.45 ? lastPara + 2 : lastSpace > maxLen * 0.45 ? lastSpace + 1 : end;
      end = Math.min(start + breakAt, normalized.length);
    }
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    const nextStart = end - overlap;
    start = nextStart <= start ? start + 1 : nextStart;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-12 ? 0 : dot / denom;
}

function embeddingModelForEntry(
  entry: FlowKnowledgeEntry,
): ResolvedEmbeddingModel | null {
  const current = resolveEmbeddingModel();
  if (!current) return null;
  if (current.provider !== entry.embeddingProvider) return null;
  if (current.modelId !== entry.embeddingModelId) return null;
  return current;
}

export function lastUserTextFromUiMessages(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role !== "user") continue;
    const parts = m.parts ?? [];
    const texts: string[] = [];
    for (const p of parts) {
      if (p.type === "text" && "text" in p && typeof p.text === "string") {
        texts.push(p.text);
      }
    }
    const s = texts.join("\n").trim();
    if (s) return s;
  }
  return "";
}

function googleProviderOptions(
  role: "document" | "query",
): { google: { taskType: string } } | undefined {
  return {
    google: {
      taskType: role === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
    },
  };
}

export async function embedKnowledgeChunks(
  resolution: ResolvedEmbeddingModel,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: resolution.model,
    values: texts,
    providerOptions:
      resolution.provider === "google"
        ? googleProviderOptions("document")
        : undefined,
  });
  return embeddings;
}

export async function embedKnowledgeQuery(
  resolution: ResolvedEmbeddingModel,
  query: string,
): Promise<number[]> {
  const { embedding } = await embed({
    model: resolution.model,
    value: query,
    providerOptions:
      resolution.provider === "google"
        ? googleProviderOptions("query")
        : undefined,
  });
  return embedding;
}

export function topKChunksByEmbedding(
  queryVector: number[],
  chunks: FlowKnowledgeChunk[],
  documentNames: Map<string, string>,
  k: number,
): Array<{ documentName: string; text: string; score: number }> {
  const scored = chunks.map((c) => ({
    documentName: documentNames.get(c.documentId) ?? c.documentId,
    text: c.text,
    score: cosineSimilarity(queryVector, c.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function formatKnowledgeAugmentation(
  hits: Array<{ documentName: string; text: string }>,
): string {
  if (hits.length === 0) return "";
  const lines = hits.map(
    (h, i) => `### Snippet ${i + 1} (${h.documentName})\n${h.text}`,
  );
  return [
    "",
    "[Flow knowledge base — retrieved snippets; prefer facts from here when relevant; cite by snippet number if useful]",
    ...lines,
  ].join("\n");
}

/**
 * When the flow has KB enabled and chunks exist, embed the latest user message and
 * append top-k snippets to the system prompt.
 */
export async function augmentSystemWithFlowKnowledge(
  system: string,
  entry: FlowKnowledgeEntry | undefined,
  messages: UIMessage[],
): Promise<string> {
  if (!entry || entry.chunks.length === 0) return system;
  const query = lastUserTextFromUiMessages(messages);
  if (!query) return system;
  const model = embeddingModelForEntry(entry);
  if (!model) {
    console.warn(
      "[flow-knowledge] embedding provider/model mismatch or missing keys; skip RAG",
    );
    return system;
  }
  try {
    const qv = await embedKnowledgeQuery(model, query);
    const nameByDoc = new Map(entry.documents.map((d) => [d.id, d.name]));
    const hits = topKChunksByEmbedding(qv, entry.chunks, nameByDoc, TOP_K).filter(
      (h) => h.score > 0.15,
    );
    const block = formatKnowledgeAugmentation(hits);
    return block ? `${system}${block}` : system;
  } catch (e) {
    console.warn("[flow-knowledge] retrieval failed", e);
    return system;
  }
}

/** GenUI and other single-string prompts use the instruction as the retrieval query. */
export async function augmentSystemWithFlowKnowledgeForQuery(
  system: string,
  entry: FlowKnowledgeEntry | undefined,
  query: string,
): Promise<string> {
  if (!entry || entry.chunks.length === 0) return system;
  const q = query.trim();
  if (!q) return system;
  const model = embeddingModelForEntry(entry);
  if (!model) {
    console.warn(
      "[flow-knowledge] embedding provider/model mismatch or missing keys; skip RAG",
    );
    return system;
  }
  try {
    const qv = await embedKnowledgeQuery(model, q);
    const nameByDoc = new Map(entry.documents.map((d) => [d.id, d.name]));
    const hits = topKChunksByEmbedding(qv, entry.chunks, nameByDoc, TOP_K).filter(
      (h) => h.score > 0.15,
    );
    const block = formatKnowledgeAugmentation(hits);
    return block ? `${system}${block}` : system;
  } catch (e) {
    console.warn("[flow-knowledge] retrieval failed", e);
    return system;
  }
}
