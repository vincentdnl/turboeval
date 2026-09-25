import { expect } from "vitest";
import { setupTurboEval } from "turboeval";

try {
  process.loadEnvFile();
} catch {}

setupTurboEval({
  getTestInfo: () => {
    const state = expect.getState();
    return {
      name: state.currentTestName ?? "",
      path: state.testPath ?? "",
    };
  },
});
