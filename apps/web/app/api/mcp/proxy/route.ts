import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "MCP proxy is not implemented in this prototype. Configure MCP servers in the studio for future wiring; local tools use the catalog only.",
      code: "MCP_PROXY_STUB",
    },
    { status: 501 },
  );
}
