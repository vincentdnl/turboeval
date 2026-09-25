# Init and foundation

## Goal

- Be able to launch golden tests from terminal using the vitest command

## Technical

- TypeScript
- Functional programming first
- Lightweight
  - Don't invent things that are not needed
  - internal structure is more lean flat modules than a full-fledged DDD
- Be a package
  - The package must have no dependency
  - Let consumer compile the TS. Ship the TS natively (this is not a frontend module, this is a Node.js package)
  - Everything is imported from the root module, no subpath for imports
- Very few primitives (the API surface must be minimalist)
- Doesn't re-implement a test runner (we will use `vitest` for testing)
  - `vitest` should be installed in a way that it is not bundled with the package
- Based on the Jev model from TypeSafe AI
  - Jev should be used in a way that it's easy to change it
  - I will use it first from the OpenRouter provider (https://openrouter.ai/~typesafe/jev-latest)
  - In the future we will also allow directly TypeSafe AI as a provider
  - Use my OPENROUTER_API_KEY
- For the agent, there will be no coupling with a golden testcase. The user will call their agent manually first and pass the output to the golden. Ex: `result = agent.run(...)`
- ESM only `"type": "module"`
- Sources are in the `src/` folder
- Don't make comments in code
- Turboeval must be framework-agnostic

API endpoint (probable) for using Jev:

```ts
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "typesafe/jev-latest",
    messages: [
      {
        role: "user",
        content: "Your evaluation prompt here",
      },
    ],
  }),
});
```

Jev response (probable):

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "topic":    { "type": "choice", "choice": "billing",
                  "confidence": 1.0,
                  "probabilities": { "billing": 1.0, "bug": 0.0, "account": 0.0 } },
    "severity": { "type": "score", "score": 3.0, "confidence": 1.0,
                  "legend": { "0": "routine", "3": "critical, about to churn" },
                  "probabilities": { "0": 0.0, "3": 1.0 } },
    "escalate": { "type": "noul", "noul": 0.8 }
  },
  "usage": { "input_tokens": 434, "output_tokens": 75 }
}
```

### API

#### Functions

- `createJudgeProvider(...)`: the primitive to create a judge, with a provider (for example `jevOpenRouter` and `jevTypeSafe`)
  - `jevOpenRouter` is the default judge for the moment
- `configureGEval({ judge: jev, threshold: 0.7 })`: returns a `GEval` object (configuration is a `GEvalConfig`)
- `gEval.correctness()`
- `gEval.clarity()`
- `gEval.toolCorrectness()`
- `gEval.toolClarity()`

#### Types

- `GEval`: global GEval object containing all the methods to perform the testing
- `GEvalConfig`
- `Golden`
- `TestCase`

## Testing

- We will do TDD for this project. Always start with a test. Use the testing skill
- The tests during development will not be bundled in the package
- The tests will use my DeepSeek API key for the examples
- I want to start by just a simple test that is a golden with a tool call

## Example usage

```ts
import { describe, it, expect } from "vitest";
import { Golden, TestCase, configureGEval, jevOpenRouter } from "turboeval";
import { myAgent } from "../src/agent";

const gEval = configureGEval({ judge: jevOpenRouter, threshold: 0.7 });

describe("refund policy agent", () => {
  it("is correct", async () => {
    const golden: Golden = {
      input: "What's your refund policy?",
      expectedOutput: "Refunds are available within 30 days of purchase.",
    };
    const actualOutput = await myAgent.run(golden.input);
    const testCase: TestCase = { input: golden.input, actualOutput, expectedOutput: golden.expectedOutput };

    const result = await gEval.correctness().measure(testCase);
    expect(result.success).toBe(true);
  });

  it("calls the correct tool with the correct arguments", async () => {
    const golden: Golden = {
      input: "I want a refund for order #4521",
      expectedTools: [{ name: "issueRefund", args: { orderId: "4521" } }],
    };
    const { output: actualOutput, toolsCalled } = await myAgent.run(golden.input);
    const testCase: TestCase = { input: golden.input, actualOutput, toolsCalled, expectedTools: golden.expectedTools };

    const result = await gEval.toolCorrectness().measure(testCase);
    expect(result.success).toBe(true);
  });

  it("clearly explains the refund tool result", async () => {
    const golden: Golden = { input: "I want a refund for order #4521" };
    const { output: actualOutput, toolsCalled } = await myAgent.run(golden.input);
    const testCase: TestCase = { input: golden.input, actualOutput, toolsCalled };

    const result = await gEval.toolResultClarity("issueRefund").measure(testCase);
    expect(result.success).toBe(true);
  });
});
```

## Misc

- Ignore the `testing` skill as it is more relevant for the web than for a package.