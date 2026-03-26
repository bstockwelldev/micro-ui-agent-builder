import type { ResourceState, StudioResourceStatusPayload } from "@/lib/studio-resource-status-types";

import { inferProviderIdFromModelRef } from "@/lib/model-ref-infer";

export function toolStatusById(
  payload: StudioResourceStatusPayload | null | undefined,
  toolId: string,
): { state: ResourceState; note?: string } | undefined {
  return payload?.tools.find((t) => t.toolId === toolId);
}

export function mcpStatusById(
  payload: StudioResourceStatusPayload | null | undefined,
  serverId: string,
): { state: ResourceState; note?: string } | undefined {
  return payload?.mcpServers.find((s) => s.serverId === serverId);
}

export function llmProfileStatusById(
  payload: StudioResourceStatusPayload | null | undefined,
  profileId: string,
): { state: ResourceState; providerLabel: string } | undefined {
  return payload?.llmProfiles.find((p) => p.profileId === profileId);
}

export function providerStateForModelRef(
  payload: StudioResourceStatusPayload | null | undefined,
  modelRef: string | undefined,
): { state: ResourceState; providerId: string } | undefined {
  if (!payload) return undefined;
  const id = inferProviderIdFromModelRef(modelRef);
  if (id === "unknown") {
    return { state: "unknown", providerId: "unknown" };
  }
  const row = payload.providers.find((p) => p.id === id);
  if (!row) return { state: "unknown", providerId: id };
  return { state: row.state, providerId: id };
}
