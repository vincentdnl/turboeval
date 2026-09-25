import type { Judge, JevAnswer, JudgeRequest, JevUsage } from "./judge.js";
import { getRunId, recordCost } from "./reporter.js";
import type { CostSummary } from "./reporter.js";
import type { TestCase } from "./types.js";

export type GEvalConfig = {
  readonly judge: Judge;
  readonly threshold: number;
};

export type GEvalResult = {
  readonly success: boolean;
  readonly score: number;
  readonly threshold: number;
  readonly answers: Readonly<Record<string, JevAnswer>>;
  readonly model: string;
};

export type Measurement = {
  readonly measure: (testCase: TestCase) => Promise<GEvalResult>;
};

export type GEval = {
  readonly correctness: () => Measurement;
  readonly clarity: () => Measurement;
  readonly toolCorrectness: () => Measurement;
  readonly toolClarity: () => Measurement;
};

const primaryAnswer = (
  answers: Readonly<Record<string, JevAnswer>>,
): JevAnswer => {
  const [first] = Object.values(answers);
  if (!first) {
    throw new Error("Jev returned no answers");
  }
  return first;
};

const noulScore = (answer: JevAnswer): number => {
  if (answer.type !== "noul") {
    throw new Error(`Expected a noul answer, received "${answer.type}"`);
  }
  return answer.noul;
};

const summarizeUsage = (usage?: JevUsage): CostSummary => ({
  inputTokens: usage?.input_tokens ?? 0,
  outputTokens: usage?.output_tokens ?? 0,
  totalCost: usage?.cost ?? 0,
});

const correctnessRequest = (testCase: TestCase): JudgeRequest => ({
  state: {
    input: testCase.input,
    expected_output: testCase.expectedOutput,
    actual_output: testCase.actualOutput,
  },
  questions: {
    correctness: {
      type: "noul",
      instructions:
        "Is the actual output correct and consistent with the expected output for the given input?",
      criteria: {
        true: "The actual output matches the meaning of the expected output.",
        false:
          "The actual output is wrong, incomplete, or contradicts the expected output.",
      },
    },
  },
});

const clarityRequest = (testCase: TestCase): JudgeRequest => ({
  state: {
    input: testCase.input,
    actual_output: testCase.actualOutput,
  },
  questions: {
    clarity: {
      type: "noul",
      instructions:
        "Is the actual output clear and easy to understand for the user?",
      criteria: {
        true: "The output is clear, well-structured, and unambiguous.",
        false: "The output is confusing, vague, or hard to follow.",
      },
    },
  },
});

const toolCorrectnessRequest = (testCase: TestCase): JudgeRequest => ({
  state: {
    input: testCase.input,
    expected_tools: testCase.expectedTools,
    actual_tools: testCase.toolsCalled,
  },
  questions: {
    tool_correctness: {
      type: "noul",
      instructions:
        "Did the agent call exactly the expected tools with the expected arguments?",
      criteria: {
        true: "Every expected tool was called with matching arguments and no unexpected tool was called.",
        false:
          "A tool is missing, extra, or was called with different arguments.",
      },
    },
  },
});

const toolClarityRequest = (testCase: TestCase): JudgeRequest => ({
  state: {
    input: testCase.input,
    actual_output: testCase.actualOutput,
    tools_called: testCase.toolsCalled,
  },
  questions: {
    tool_clarity: {
      type: "noul",
      instructions:
        "Does the actual output clearly explain the results of the tools the agent called?",
      criteria: {
        true: "The output explains what the tools did and their results clearly.",
        false: "The output omits, misrepresents, or obscures the tool results.",
      },
    },
  },
});

export const configureGEval = ({
  judge,
  threshold,
}: GEvalConfig): GEval => {
  const measurement = (
    name: string,
    buildRequest: (testCase: TestCase) => JudgeRequest,
  ): Measurement => ({
    measure: async (testCase) => {
      const response = await judge(buildRequest(testCase));
      const score = noulScore(primaryAnswer(response.answers));
      const result: GEvalResult = {
        success: score >= threshold,
        score,
        threshold,
        answers: response.answers,
        model: response.model,
      };
      const runId = getRunId();
      if (runId) {
        await recordCost(runId, {
          cost: summarizeUsage(response.usage),
          judge: {
            provider: judge.provider ?? "unknown",
            model: response.model,
          },
          measurement: { name, result },
        });
      }
      return result;
    },
  });

  return {
    correctness: () => measurement("correctness", correctnessRequest),
    clarity: () => measurement("clarity", clarityRequest),
    toolCorrectness: () =>
      measurement("toolCorrectness", toolCorrectnessRequest),
    toolClarity: () => measurement("toolClarity", toolClarityRequest),
  };
};
