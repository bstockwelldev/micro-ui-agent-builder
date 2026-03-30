import {
  CurrentAiSdkOrchestrationExecutor,
} from "@/lib/server/orchestration/current-ai-sdk-executor";
import type { OrchestrationRouteExecutor } from "@/lib/server/orchestration/types";

type ExecutorFlag = "current-ai-sdk" | "next-ai-sdk";

const currentAiSdkExecutor = new CurrentAiSdkOrchestrationExecutor();

function resolveExecutorFlag(): ExecutorFlag {
  const raw = process.env.AGENT_ORCHESTRATION_EXECUTOR?.trim();
  if (raw === "current-ai-sdk") return raw;
  if (raw === "next-ai-sdk") return raw;
  return "current-ai-sdk";
}

export function resolveOrchestrationExecutor(): OrchestrationRouteExecutor {
  const flag = resolveExecutorFlag();

  switch (flag) {
    case "next-ai-sdk":
    case "current-ai-sdk":
    default:
      return currentAiSdkExecutor;
  }
}
