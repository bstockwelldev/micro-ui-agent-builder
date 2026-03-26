import { z } from "zod";

/**
 * Flow node kinds — aligned with layered agent build: prompts, model, tools,
 * runtime guardrails (FluxFlow-style validate-before-execute), static rubric
 * eval, and branch gates before the primary LLM step.
 */
export const flowNodeTypeSchema = z.enum([
  "system",
  "user",
  "llm",
  "tool",
  "human_gate",
  "output",
  /** Input validation: @bstockwelldev/prompt-guardrails-core (injection, length, URLs). */
  "guardrail",
  /** Static prompt quality findings: @bstockwelldev/prompt-rubric analyzePromptSource. */
  "rubric",
  /** Require latest user text to contain `content` (case-insensitive substring); else refuse run. */
  "branch",
]);

export type FlowNodeType = z.infer<typeof flowNodeTypeSchema>;

/** Maps to AI SDK `streamText` / `generateText` `toolChoice`. */
export const flowToolChoiceSchema = z.enum(["auto", "required", "none"]);

export type FlowToolChoice = z.infer<typeof flowToolChoiceSchema>;

export const flowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export type FlowEdge = z.infer<typeof flowEdgeSchema>;

export const flowStepSchema = z.object({
  id: z.string().min(1),
  type: flowNodeTypeSchema,
  /** Overrides the default canvas title for this node (e.g. "Planner", "Safety gate"). */
  displayLabel: z.string().optional(),
  /** Prompt template id for system/user, tool id for tool, etc. */
  refId: z.string().optional(),
  content: z.string().optional(),
  model: z.string().optional(),
  /** Display / routing label for LLM steps (e.g. Google Gemini, OpenAI). */
  modelProvider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
  /** Nucleus sampling; forwarded to the model provider when supported. */
  topP: z.number().min(0).max(1).optional(),
  /** When set on an LLM step, forwarded to `streamText({ toolChoice })`. */
  toolChoice: flowToolChoiceSchema.optional(),
  /** Guardrail step: allow URLs in user text when true (passed to PromptPolicy.constraints). */
  allowUrls: z.boolean().optional(),
  /** Rubric step: if true, any static finding blocks the run (CI-style gate). */
  rubricFailOnFindings: z.boolean().optional(),
  order: z.number().int().nonnegative(),
  /** Canvas position for the flow builder (XYFlow). */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export type FlowStep = z.infer<typeof flowStepSchema>;

export const flowDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(flowStepSchema),
  /** Custom edges; when omitted, the UI derives a linear chain from step order. */
  edges: z.array(flowEdgeSchema).optional(),
  updatedAt: z.string().datetime().optional(),
  /**
   * When true, run routes retrieve top-matching chunks from this flow's uploaded
   * knowledge (see server `flow-knowledge-store`) and append them to the system prompt.
   */
  knowledgeBaseEnabled: z.boolean().optional(),
});

export type FlowDocument = z.infer<typeof flowDocumentSchema>;

export const toolDefinitionSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  /** JSON-schema-like shape as string for catalog display */
  parametersJson: z.string().default("{}"),
  /** When true, model tool calls require client approval (AI SDK needsApproval). */
  requiresApproval: z.boolean().optional().default(false),
});

/** Parsed tool row (explicit shape so app `tsc` matches Zod output across zod versions). */
export type ToolDefinition = {
  id: string;
  description: string;
  parametersJson: string;
  requiresApproval: boolean;
};

export const mcpServerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  transport: z.enum(["http", "sse", "stdio"]).default("http"),
});

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;

export const promptTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  body: z.string().min(1),
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

export const agentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  /** Optional default flow when opening Run from this agent. */
  defaultFlowId: z.string().optional(),
  /** Merged into the compiled system prompt when `agentId` is sent to run APIs. */
  systemInstructions: z.string().optional(),
  /** Short labels or capability hints (one logical item per array entry). */
  optionalElements: z.array(z.string().min(1)).optional(),
});

export type AgentProfile = z.infer<typeof agentProfileSchema>;

export const llmProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Model ref string (same convention as flow LLM steps, e.g. gemini-2.5-flash-lite). */
  model: z.string().min(1),
  description: z.string().optional(),
});

export type LlmProfile = z.infer<typeof llmProfileSchema>;

export const studioStoreSchema = z.object({
  flows: z.array(flowDocumentSchema),
  prompts: z.array(promptTemplateSchema),
  tools: z.array(toolDefinitionSchema),
  mcpServers: z.array(mcpServerConfigSchema),
  agents: z.array(agentProfileSchema).default([]),
  llmProfiles: z.array(llmProfileSchema).default([]),
  /** sessionId -> paused run state */
  pausedRuns: z
    .record(
      z.string(),
      z.object({
        flowId: z.string(),
        stepIndex: z.number(),
        pendingTool: z.string().optional(),
        pendingArgs: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
});

type InferredStudioStore = z.infer<typeof studioStoreSchema>;

export type StudioStore = Omit<InferredStudioStore, "tools"> & {
  tools: ToolDefinition[];
};

export function parseFlowDocument(input: unknown): FlowDocument {
  return flowDocumentSchema.parse(input);
}

export function parseStudioStore(input: unknown): StudioStore {
  return studioStoreSchema.parse(input) as StudioStore;
}

/** Recursive GenUI surface node (AI SDK structured output). */
export type GenuiNode =
  | {
      type: "Stack";
      id?: string;
      props?: { gap?: number; direction?: "col" | "row" };
      children: GenuiNode[];
    }
  | { type: "Text"; id?: string; props: { content: string } }
  | {
      type: "Button";
      id: string;
      props: { label: string; actionId?: string };
    }
  | {
      type: "Card";
      id?: string;
      props?: { title?: string };
      children?: GenuiNode[];
    }
  | {
      type: "FormField";
      id: string;
      props: { label: string; inputType?: "text" | "number" };
    };

export const genuiNodeSchema: z.ZodType<GenuiNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("Stack"),
      id: z.string().optional(),
      props: z
        .object({
          gap: z.number().optional(),
          direction: z.enum(["col", "row"]).optional(),
        })
        .optional(),
      children: z.array(genuiNodeSchema),
    }),
    z.object({
      type: z.literal("Text"),
      id: z.string().optional(),
      props: z.object({ content: z.string() }),
    }),
    z.object({
      type: z.literal("Button"),
      id: z.string(),
      props: z.object({
        label: z.string(),
        actionId: z.string().optional(),
      }),
    }),
    z.object({
      type: z.literal("Card"),
      id: z.string().optional(),
      props: z.object({ title: z.string().optional() }).optional(),
      children: z.array(genuiNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("FormField"),
      id: z.string(),
      props: z.object({
        label: z.string(),
        inputType: z.enum(["text", "number"]).optional(),
      }),
    }),
  ]),
);

export const genuiSurfaceSchema = z.object({
  root: genuiNodeSchema,
});

export type GenuiSurface = z.infer<typeof genuiSurfaceSchema>;

export function parseGenuiSurface(input: unknown): GenuiSurface {
  return genuiSurfaceSchema.parse(input);
}
