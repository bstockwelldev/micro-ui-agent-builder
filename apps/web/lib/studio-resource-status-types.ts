export type ResourceState = "live" | "offline" | "available" | "na" | "unknown";

export type StudioResourceStatusPayload = {
  generatedAt: string;
  providers: { id: string; label: string; state: ResourceState }[];
  tools: { toolId: string; state: ResourceState; note?: string }[];
  mcpServers: { serverId: string; state: ResourceState; note?: string }[];
  llmProfiles: {
    profileId: string;
    model: string;
    state: ResourceState;
    providerLabel: string;
  }[];
};
