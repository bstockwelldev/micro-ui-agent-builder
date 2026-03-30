import { afterEach, describe, expect, it } from "vitest";

import { resolveOrchestrationExecutor } from "./executor";
import { CurrentAiSdkOrchestrationExecutor } from "./current-ai-sdk-executor";

afterEach(() => {
  delete process.env.AGENT_ORCHESTRATION_EXECUTOR;
});

describe("resolveOrchestrationExecutor", () => {
  it("uses current-ai-sdk backend by default", () => {
    const executor = resolveOrchestrationExecutor();

    expect(executor).toBeInstanceOf(CurrentAiSdkOrchestrationExecutor);
  });

  it("uses current-ai-sdk when explicitly configured", () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "current-ai-sdk";

    const executor = resolveOrchestrationExecutor();

    expect(executor).toBeInstanceOf(CurrentAiSdkOrchestrationExecutor);
  });

  it("supports next-ai-sdk rollout flag while preserving executor contract", () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "next-ai-sdk";

    const executor = resolveOrchestrationExecutor();

    expect(executor).toBeInstanceOf(CurrentAiSdkOrchestrationExecutor);
    expect(typeof executor.executeRun).toBe("function");
    expect(typeof executor.executeGenUi).toBe("function");
  });

  it("falls back to current-ai-sdk for unknown values", () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "unknown-backend";

    const executor = resolveOrchestrationExecutor();

    expect(executor).toBeInstanceOf(CurrentAiSdkOrchestrationExecutor);
  });
});
