import type { FlowDocument, FlowStep } from "@repo/shared";

/**
 * Collects catalog tool ids referenced by flow steps (tool / code_exec nodes with `refId`).
 */
export function collectFlowToolRefIds(flow: FlowDocument | undefined): Set<string> {
  const ids = new Set<string>();
  if (!flow?.steps?.length) return ids;
  for (const step of flow.steps) {
    if (
      (step.type === "tool" || step.type === "code_exec") &&
      step.refId?.trim()
    ) {
      ids.add(step.refId.trim());
    }
  }
  return ids;
}

/**
 * When the flow declares at least one tool/code_exec ref, restrict catalog tools to those ids.
 * When there are no such refs, returns all tools (backward compatible with flows that only use LLM).
 */
export function filterCatalogToolsByFlow<T extends { id: string }>(
  tools: T[],
  flow: FlowDocument | undefined,
): T[] {
  if (!flow) return tools;
  const refIds = collectFlowToolRefIds(flow);
  if (refIds.size === 0) return tools;
  return tools.filter((t) => refIds.has(t.id));
}

export function flowHasToolSteps(steps: FlowStep[] | undefined): boolean {
  if (!steps?.length) return false;
  return steps.some((s) => s.type === "tool" || s.type === "code_exec");
}
