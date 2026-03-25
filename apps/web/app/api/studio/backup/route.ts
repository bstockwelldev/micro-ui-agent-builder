import { NextResponse } from "next/server";

import { uploadStudioBackup } from "@/lib/server/agent-builder-storage";
import { readStudioStore } from "@/lib/server/studio-store";
import { isSupabaseStudioEnabled } from "@/lib/server/supabase-admin";

export async function POST() {
  if (!isSupabaseStudioEnabled()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const store = await readStudioStore();
    const result = await uploadStudioBackup(store);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backup failed";
    console.error("[studio/backup]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
