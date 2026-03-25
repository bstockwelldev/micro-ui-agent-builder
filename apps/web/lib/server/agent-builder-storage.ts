import type { StudioStore } from "@repo/shared";

import { getSupabaseAdmin, isSupabaseStudioEnabled } from "./supabase-admin";

export const AGENT_BUILDER_BUCKET = "agent-builder";

/**
 * Uploads the current studio JSON to Storage and records a row in agent_builder.studio_artifacts.
 */
export async function uploadStudioBackup(
  store: StudioStore,
): Promise<{ objectPath: string; artifactId: string }> {
  if (!isSupabaseStudioEnabled()) {
    throw new Error("Supabase is not configured");
  }
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const objectPath = `backups/studio-${timestamp}.json`;
  const body = JSON.stringify(store, null, 2);

  const { error: uploadError } = await supabase.storage
    .from(AGENT_BUILDER_BUCKET)
    .upload(objectPath, body, {
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: insertError } = await supabase
    .schema("agent_builder")
    .from("studio_artifacts")
    .insert({
      bucket_id: AGENT_BUILDER_BUCKET,
      object_path: objectPath,
      kind: "backup",
      label: `studio backup ${timestamp}`,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return { objectPath, artifactId: data.id as string };
}
