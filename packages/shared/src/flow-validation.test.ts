import { describe, expect, it } from "vitest";
import { validateFlowSteps } from "./flow-validation.js";
import type { FlowStep } from "./schemas.js";

function step(
  base: Pick<FlowStep, "id" | "type" | "order"> &
    Partial<Omit<FlowStep, "id" | "type" | "order">>,
): FlowStep {
  return { ...base } as FlowStep;
}

describe("validateFlowSteps", () => {
  it("passes when system has refId", () => {
    const { ok, issues } = validateFlowSteps([
      step({ id: "a", type: "system", order: 0, refId: "p1" }),
    ]);
    expect(ok).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("fails when system has neither refId nor content", () => {
    const { ok, issues } = validateFlowSteps([
      step({ id: "a", type: "system", order: 0 }),
    ]);
    expect(ok).toBe(false);
    expect(issues.some((i) => i.stepId === "a" && i.field === "prompt")).toBe(
      true,
    );
  });

  it("passes user with inline content only", () => {
    const { ok } = validateFlowSteps([
      step({ id: "u", type: "user", order: 0, content: "hello" }),
    ]);
    expect(ok).toBe(true);
  });

  it("requires llm model", () => {
    const { ok, issues } = validateFlowSteps([
      step({ id: "l", type: "llm", order: 0 }),
    ]);
    expect(ok).toBe(false);
    expect(issues[0]?.field).toBe("model");
  });

  it("requires tool refId", () => {
    const { ok, issues } = validateFlowSteps([
      step({ id: "t", type: "tool", order: 0 }),
    ]);
    expect(ok).toBe(false);
    expect(issues[0]?.field).toBe("refId");
  });

  it("allows empty branch content", () => {
    const { ok } = validateFlowSteps([
      step({ id: "b", type: "branch", order: 0, content: "" }),
    ]);
    expect(ok).toBe(true);
  });

  it("flags out-of-range temperature", () => {
    const { ok, issues } = validateFlowSteps([
      step({
        id: "l",
        type: "llm",
        order: 0,
        model: "x",
        temperature: 3,
      }),
    ]);
    expect(ok).toBe(false);
    expect(issues.some((i) => i.field === "temperature")).toBe(true);
  });
});
