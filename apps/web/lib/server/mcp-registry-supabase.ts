import { getSupabaseAdmin, isSupabaseStudioEnabled } from "./supabase-admin";

/**
 * Loads enabled `mcp_server_id` values from `agent_builder.flow_mcp_links` for a studio flow.
 * Requires `MCP_REGISTRY_FROM_SUPABASE=true` and service-role Supabase env vars.
 */
export async function fetchMcpServerIdsForFlowFromSupabase(
  flowId: string,
): Promise<string[]> {
  if (!isSupabaseStudioEnabled()) return [];
  if (process.env.MCP_REGISTRY_FROM_SUPABASE !== "true") return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .schema("agent_builder")
      .from("flow_mcp_links")
      .select("mcp_server_id")
      .eq("flow_id", flowId)
      .eq("enabled", true);

    if (error) {
      console.error("[mcp-registry] flow_mcp_links query failed", error);
      return [];
    }
    const rows = (data ?? []) as { mcp_server_id: string }[];
    return rows.map((r) => r.mcp_server_id).filter(Boolean);
  } catch (e) {
    console.error("[mcp-registry] fetch failed", e);
    return [];
  }
}
