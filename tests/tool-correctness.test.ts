import { describe, it, expect } from "vitest";
import { configureGEval, jevOpenRouter } from "turboeval";
import type { Golden, TestCase } from "turboeval";

const gEval = configureGEval({ judge: jevOpenRouter, threshold: 0.7 });

describe("golden with a tool call", () => {
  it("passes when the agent calls the expected tool with the expected arguments", async () => {
    const golden: Golden = {
      input: "I want a refund for order #4521",
      expectedTools: [{ name: "issueRefund", args: { orderId: "4521" } }],
    };

    const actualOutput = "I've issued your refund for order #4521.";
    const toolsCalled = [{ name: "issueRefund", args: { orderId: "4521" } }];

    const testCase: TestCase = {
      input: golden.input,
      actualOutput,
      toolsCalled,
      expectedTools: golden.expectedTools,
    };

    const result = await gEval.toolCorrectness().measure(testCase);

    expect(result.success).toBe(true);
  });
});
