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

  it("parses flow with knowledgeBaseEnabled", () => {
    const f = flowDocumentSchema.parse({
      id: "f-kb",
      name: "KB flow",
      knowledgeBaseEnabled: true,
      steps: [
        {
          id: "l1",
          type: "llm",
          order: 0,
          model: "gemini-2.5-flash-lite",
        },
      ],
    });
    expect(f.knowledgeBaseEnabled).toBe(true);
  });

  it("parses LLM step with topP and toolChoice", () => {
    const f = flowDocumentSchema.parse({
      id: "f3",
      name: "Gen settings",
      steps: [
        {
          id: "l1",
          type: "llm",
          order: 0,
          model: "gemini-2.5-flash-lite",
          temperature: 0.2,
          maxTokens: 1024,
          topP: 0.9,
          toolChoice: "required",
        },
      ],
    });
    const llm = f.steps[0];
    expect(llm?.type).toBe("llm");
    expect(llm?.topP).toBe(0.9);
    expect(llm?.toolChoice).toBe("required");
  });

  it("parses preflight steps before LLM (guardrail, rubric, branch)", () => {
    const f = flowDocumentSchema.parse({
      id: "f-preflight",
      name: "Layered gates",
      steps: [
        {
          id: "g1",
          type: "guardrail",
          order: 0,
          displayLabel: "Input safety",
          allowUrls: false,
          content: "No PII in user text",
        },
        {
          id: "r1",
          type: "rubric",
          order: 1,
          rubricFailOnFindings: true,
          content: "Static scan scope",
        },
        {
          id: "b1",
          type: "branch",
          order: 2,
          content: "APPROVE",
        },
        {
          id: "l1",
          type: "llm",
          order: 3,
          model: "groq/llama-3.3-70b-versatile",
        },
      ],
    });
    expect(f.steps).toHaveLength(4);
    expect(f.steps[0]?.type).toBe("guardrail");
    expect(f.steps[0]?.allowUrls).toBe(false);
    expect(f.steps[1]?.rubricFailOnFindings).toBe(true);
    expect(f.steps[2]?.content).toBe("APPROVE");
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
    expect(s.agents).toEqual([]);
    expect(s.llmProfiles).toEqual([]);
  });

  it("parses agents and llm profiles", () => {
    const s = studioStoreSchema.parse({
      flows: [],
      prompts: [],
      tools: [],
      mcpServers: [],
      agents: [
        {
          id: "a1",
          name: "Bot",
          defaultFlowId: "f1",
          systemInstructions: "Be brief.",
          optionalElements: ["tools"],
        },
      ],
      llmProfiles: [
        {
          id: "l1",
          name: "Fast",
          model: "gemini-2.5-flash-lite",
        },
      ],
    });
    expect(s.agents).toHaveLength(1);
    expect(s.llmProfiles[0]?.model).toBe("gemini-2.5-flash-lite");
  });
});
