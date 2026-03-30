import { resolveOrchestrationExecutor } from "@/lib/server/orchestration/executor";

export const maxDuration = 60;

export async function POST(req: Request) {
  return resolveOrchestrationExecutor().executeRun(req);
}
