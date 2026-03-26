import { NextResponse } from "next/server";

import { buildStudioResourceStatus } from "@/lib/server/studio-resource-status";
import { readStudioStore } from "@/lib/server/studio-store";

export async function GET() {
  const store = await readStudioStore();
  const payload = await buildStudioResourceStatus(store);
  return NextResponse.json(payload);
}
