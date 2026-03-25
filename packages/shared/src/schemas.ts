import { z } from "zod";

export const flowNodeTypeSchema = z.enum([
  "system",
  "user",
  "llm",
  "tool",
  "human_gate",
  "output",
]);

export type FlowNodeType = z.infer<typeof flowNodeTypeSchema>;

export const flowStepSchema = z.object({
  id: z.string().min(1),
  type: flowNodeTypeSchema,
  /** Prompt template id for system/user, tool id for tool, etc. */
  refId: z.string().optional(),
  content: z.string().optional(),
  model: z.string().optional(),
  order: z.number().int().nonnegative(),
});

export type FlowStep = z.infer<typeof flowStepSchema>;

export const flowDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(flowStepSchema),
  updatedAt: z.string().datetime().optional(),
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

export const studioStoreSchema = z.object({
  flows: z.array(flowDocumentSchema),
  prompts: z.array(promptTemplateSchema),
  tools: z.array(toolDefinitionSchema),
  mcpServers: z.array(mcpServerConfigSchema),
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
