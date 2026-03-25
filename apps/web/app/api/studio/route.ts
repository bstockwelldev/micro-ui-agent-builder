import { NextResponse } from "next/server";

import { parseStudioStore } from "@repo/shared";

import { readStudioStore, writeStudioStore } from "@/lib/server/studio-store";

export async function GET() {
  const store = await readStudioStore();
  return NextResponse.json(store);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const store = parseStudioStore(body);
    await writeStudioStore(store);
    return NextResponse.json(store);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid store payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
