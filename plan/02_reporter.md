# Reporter

I want to be able to have the cost and other metrics reported after the run. I want to create a simple set of primitives that can be plugged as a reporter to Vitest first, but afterward to other test runners.

There should be:
- A function that will be called to record the cost, inside the function that calls the judge.
- A function that reads the call records and returns a summary of the costs

The cost records will be stored in a `.turboeval/judge-costs.jsonl` file at the root of the project. This file should be in the `.gitignore`.

Each entry should contain:
- run id
- the name of the test
- the timestamp
- path of the test
- summary of the cost
- information about the judge model and provider
- the gEval Measurement

We want to keep historical data for further audit about the cost.

In order to be able to group each run, we will give each run an id that will be provided in the test setup file. A function `createRunId()` will be added.

The function that reports costs will take a runId.

Create a `setupTurboEval()` function that will take care of the run id, and that will be used for future setups.
