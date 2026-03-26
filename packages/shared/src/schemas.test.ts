import { describe, expect, it } from "vitest";
import {
  flowDocumentSchema,
  parseGenuiSurface,
  studioStoreSchema,
} from "./schemas.js";

describe("flowDocumentSchema", () => {
  it("parses minimal flow", () => {
    const f = flowDocumentSchema.parse({
      id: "f1",
      name: "Test",
      steps: [
        { id: "s1", type: "llm", order: 0, model: "openai/gpt-4o-mini" },
      ],
    });
    expect(f.steps).toHaveLength(1);
  });

  it("parses flow with positions and edges", () => {
    const f = flowDocumentSchema.parse({
      id: "f2",
      name: "With layout",
      steps: [
        {
          id: "a",
          type: "system",
          order: 0,
          position: { x: 0, y: 0 },
        },
        {
          id: "b",
          type: "llm",
          order: 1,
          model: "groq/llama-3.3-70b-versatile",
          position: { x: 100, y: 0 },
        },
      ],
      edges: [{ id: "e1", source: "a", target: "b" }],
    });
    expect(f.edges).toHaveLength(1);
    expect(f.steps[0]?.position).toEqual({ x: 0, y: 0 });
  });
});

describe("parseGenuiSurface", () => {
  it("parses a shallow Stack tree", () => {
    const g = parseGenuiSurface({
      root: {
        type: "Stack",
        children: [
          { type: "Text", props: { content: "Hi" } },
          { type: "Button", id: "b1", props: { label: "Go" } },
        ],
      },
    });
    expect(g.root.type).toBe("Stack");
    if (g.root.type === "Stack") {
      expect(g.root.children).toHaveLength(2);
    }
  });
});

describe("studioStoreSchema", () => {
  it("parses empty store", () => {
    const s = studioStoreSchema.parse({
      flows: [],
      prompts: [],
      tools: [],
      mcpServers: [],
    });
    expect(s.flows).toEqual([]);
  });
});
