import { resolveOrchestrationExecutor } from "@/lib/server/orchestration/executor";

export async function POST(req: Request) {
  return resolveOrchestrationExecutor().executeGenUi(req);
}
