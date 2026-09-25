import { createJudgeProvider } from "./judge.js";
import type {
  Judge,
  JudgeProvider,
  JevResponse,
} from "./judge.js";

const OPENROUTER_DECISIONS_URL =
  "https://openrouter.ai/api/alpha/decisions";

export const DEFAULT_JEV_MODEL = "typesafe/jev-1.13";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJevResponse = (value: unknown): JevResponse => {
  if (
    !isRecord(value) ||
    typeof value.model !== "string" ||
    !isRecord(value.answers)
  ) {
    throw new Error("Malformed Jev response");
  }
  return value as unknown as JevResponse;
};

export const jevOpenRouterProvider: JudgeProvider = {
  name: "jevOpenRouter",
  decide: async (request, options) => {
    const apiKey =
      options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    const model = options.model ?? DEFAULT_JEV_MODEL;
    const fetchImpl = options.fetch ?? fetch;

    const response = await fetchImpl(OPENROUTER_DECISIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, ...request }),
    });

    if (!response.ok) {
      throw new Error(
        `Jev request failed (${response.status}): ${await response.text()}`,
      );
    }

    return parseJevResponse(await response.json());
  },
};

export const jevOpenRouter: Judge = createJudgeProvider(
  jevOpenRouterProvider,
  { model: DEFAULT_JEV_MODEL },
);
