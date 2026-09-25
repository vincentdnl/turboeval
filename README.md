# Turbo Eval

Fast, minimalistic LLM as Judge eval framework based on Jev and Jev-like models.

## Cost reporting

Every gEval measurement records the judge cost to `.turboeval/judge-costs.jsonl`
(append-only, one JSON object per line). Add `.turboeval/` to your `.gitignore`.

The reporter only considers records written during the current Vitest invocation
(by timestamp), so historical runs are never re-reported.

In your test setup file, generate the run id and hook the runner's test context
so records carry the test name and path:

```ts
// tests/setup.ts
import { expect } from "vitest";
import { setupTurboEval } from "turboeval";

setupTurboEval({
  getTestInfo: () => {
    const state = expect.getState();
    return { name: state.currentTestName ?? "", path: state.testPath ?? "" };
  },
});
```

To print the cost at the end of a run, plug a thin adapter. Turboeval ships no
runner-specific code; a Vitest reporter is a few lines:

```ts
// tests/vitest-reporter.ts
import { formatCostReports, summarizeCostsSince } from "turboeval";

export default class TurboEvalReporter {
  private startedAt = Date.now();

  onTestRunStart(): void {
    this.startedAt = Date.now();
  }

  async onTestRunEnd(): Promise<void> {
    const reports = await summarizeCostsSince(this.startedAt);
    formatCostReports(reports).forEach((line) => console.log(line));
  }
}
```

Then register it:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default", "./tests/vitest-reporter.ts"],
  },
});
```

At the end of the run you get a line like:

```
[turboeval] run 78cb9a37 — $0.000018 — 1 judge call — 419 in / 23 out tokens
```

### Primitives

- `createRunId()` — generate a run id.
- `setupTurboEval({ runId?, directory?, getTestInfo? })` — register the active run.
- `recordCost(runId, { cost, judge, measurement })` — append one cost record.
- `reportCosts(runId)` — read the records and summarize a run.
- `summarizeCostsSince(timestamp)` — summarize records written after a point in time.
- `formatCostReports(reports)` — format summary lines.

A runner adapter only needs `summarizeCostsSince` + `formatCostReports` and its
own lifecycle hooks.
