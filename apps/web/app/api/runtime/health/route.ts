import { NextResponse } from "next/server";

import { getRuntimeConfigHealthStatus } from "@/lib/server/runtime-config";

export async function GET() {
  const health = getRuntimeConfigHealthStatus();
  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
    headers: {
      "cache-control": "no-store",
    },
  });
}
