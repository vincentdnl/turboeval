import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureGEval,
  createRunId,
  formatCostReports,
  recordCost,
  reportCosts,
  setupTurboEval,
} from "turboeval";
import type { Judge, JevResponse } from "turboeval";

let directory: string;
let runId: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "turboeval-"));
  runId = setupTurboEval({
    directory,
    getTestInfo: () => ({
      name: "records costs",
      path: "/tests/reporter.test.ts",
    }),
  });
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("reporter", () => {
  it("creates unique run ids", () => {
    expect(createRunId()).not.toBe(createRunId());
  });

  it("records and summarizes the costs of a run", async () => {
    await recordCost(runId, {
      cost: { inputTokens: 10, outputTokens: 5, totalCost: 0.002 },
      judge: { provider: "openrouter", model: "typesafe/jev-1.13" },
      measurement: {
        name: "correctness",
        result: {
          success: true,
          score: 1,
          threshold: 0.7,
          answers: {},
          model: "typesafe/jev-1.13",
        },
      },
    });
    await recordCost(runId, {
      cost: { inputTokens: 20, outputTokens: 7, totalCost: 0.003 },
      judge: { provider: "openrouter", model: "typesafe/jev-1.13" },
      measurement: {
        name: "clarity",
        result: {
          success: false,
          score: 0,
          threshold: 0.7,
          answers: {},
          model: "typesafe/jev-1.13",
        },
      },
    });

    const report = await reportCosts(runId);

    expect(report.count).toBe(2);
    expect(report.totalCost).toBeCloseTo(0.005);
    expect(report.inputTokens).toBe(30);
    expect(report.outputTokens).toBe(12);
    expect(report.records[0]).toMatchObject({
      runId,
      testName: "records costs",
      testPath: "/tests/reporter.test.ts",
      judge: { provider: "openrouter", model: "typesafe/jev-1.13" },
      measurement: { name: "correctness" },
    });
    expect(report.records[0]?.timestamp).toBeDefined();
  });

  it("only summarizes the records of the requested run", async () => {
    await recordCost(runId, {
      cost: { inputTokens: 1, outputTokens: 1, totalCost: 0.001 },
      judge: { provider: "openrouter", model: "typesafe/jev-1.13" },
      measurement: {
        name: "correctness",
        result: {
          success: true,
          score: 1,
          threshold: 0.7,
          answers: {},
          model: "typesafe/jev-1.13",
        },
      },
    });
    await recordCost(createRunId(), {
      cost: { inputTokens: 99, outputTokens: 99, totalCost: 9.99 },
      judge: { provider: "openrouter", model: "typesafe/jev-1.13" },
      measurement: {
        name: "correctness",
        result: {
          success: true,
          score: 1,
          threshold: 0.7,
          answers: {},
          model: "typesafe/jev-1.13",
        },
      },
    });

    const report = await reportCosts(runId);

    expect(report.count).toBe(1);
    expect(report.totalCost).toBeCloseTo(0.001);
  });

  it("returns an empty report when no records exist", async () => {
    const report = await reportCosts(createRunId());

    expect(report).toMatchObject({
      count: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      records: [],
    });
  });

  it("formats a readable cost line", () => {
    const [line] = formatCostReports([
      {
        runId: "0123456789abcdef",
        count: 1,
        totalCost: 0.000018,
        inputTokens: 419,
        outputTokens: 23,
        records: [],
      },
    ]);

    expect(line).toBe(
      "[turboeval] run 01234567 — $0.000018 — 1 judge call — 419 in / 23 out tokens",
    );
  });
});

describe("cost recording during a measurement", () => {
  it("records the judge usage returned by the judge", async () => {
    const judge: Judge = Object.assign(
      async (): Promise<JevResponse> => ({
        model: "fake/model",
        answers: { correctness: { type: "noul", noul: 1 } },
        usage: { input_tokens: 12, output_tokens: 4, cost: 0.001 },
      }),
      { provider: "fake-provider" },
    );
    const gEval = configureGEval({ judge, threshold: 0.7 });

    const result = await gEval.correctness().measure({
      input: "a question",
      actualOutput: "an answer",
    });

    expect(result.success).toBe(true);

    const report = await reportCosts(runId);

    expect(report.count).toBe(1);
    expect(report.totalCost).toBeCloseTo(0.001);
    expect(report.inputTokens).toBe(12);
    expect(report.outputTokens).toBe(4);
    expect(report.records[0]?.judge).toEqual({
      provider: "fake-provider",
      model: "fake/model",
    });
    expect(report.records[0]?.measurement.name).toBe("correctness");
    expect(report.records[0]?.measurement.result.score).toBe(1);
  });
});
