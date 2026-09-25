# turboeval

Fast, minimalistic, framework-agnostic, LLM as Judge eval framework based on Jev and Jev-like models. Written in TypeScript. Functional programming first.

## Install

 ```sh                                                                                                                        
   npm install github:vincentdnl/turboeval                                                                                    
 ```     

## Basic usage

```ts
import { configureGEval, jevOpenRouter } from "turboeval";
import type { TestCase } from "turboeval";

const gEval = configureGEval({ judge: jevOpenRouter, threshold: 0.7 });

const testCase: TestCase = {
  input: "I want a refund for order #4521",
  expectedOutput: "The refund for order #4521 was issued.",
  actualOutput: "I've issued your refund for order #4521.",
};

const result = await gEval.correctness().measure(testCase);

if (!result.success) {
  throw new Error(`Score ${result.score} is below ${result.threshold}`);
}
```

## Usage with vitest

See [`tests/tool-correctness.test.ts`](tests/tool-correctness.test.ts)

### Enable cost reporting

Create a thin wrapper around the turboeval primitives like in [`tests/vitest-reporter.ts`](tests/vitest-reporter.ts)

Add it to your [`vitest.config.ts`](vitest.config.ts)

Setup turboeval with `setupTurboEval` in [`tests/setup.ts`](tests/setup.ts)

At the end of the run you get a line like:

```
[turboeval] run 78cb9a37 — $0.000018 — 1 judge call — 419 in / 23 out tokens
```

### API

#### gEval

- `configureGEval({ judge, threshold })` — build the measurements.
- `gEval.correctness()` / `.clarity()` / `.toolCorrectness()` / `.toolClarity()` — return a `Measurement`.

#### Judges

- `jevOpenRouter` — built-in OpenRouter judge; reads `OPENROUTER_API_KEY`.
- `createJudgeProvider(provider, options?)` — wrap a custom provider as a `Judge`.

#### Cost reporting

- `createRunId()` — generate a run id.
- `setupTurboEval({ runId?, directory?, getTestInfo? })` — register the active run.
- `recordCost(runId, { cost, judge, measurement })` — append one cost record.
- `reportCosts(runId)` — read the records and summarize a run.
- `summarizeCostsSince(timestamp)` — summarize records written after a point in time.
- `formatCostReports(reports)` — format summary lines.
