import type { StudioStore } from "@repo/shared";

/** Remove a flow and clear any agent default that pointed at it. */
export function storeAfterFlowRemoved(
  store: StudioStore,
  removedFlowId: string,
): StudioStore {
  return {
    ...store,
    flows: store.flows.filter((f) => f.id !== removedFlowId),
    agents: store.agents.map((a) =>
      a.defaultFlowId === removedFlowId ? { ...a, defaultFlowId: undefined } : a,
    ),
  };
}
