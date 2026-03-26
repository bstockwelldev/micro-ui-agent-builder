import { NextResponse } from "next/server";

import { getAnalyticsDashboard } from "@/lib/server/analytics-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAnalyticsDashboard();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
