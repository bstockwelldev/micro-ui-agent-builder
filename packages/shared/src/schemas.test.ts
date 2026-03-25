import { describe, expect, it } from "vitest";
import { flowDocumentSchema, studioStoreSchema } from "./schemas.js";

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
