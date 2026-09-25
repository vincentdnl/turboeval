type NoulQuestion = {
  readonly type: "noul";
  readonly instructions: string;
  readonly criteria: { readonly true: string; readonly false: string };
};

type ChoiceQuestion = {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: Readonly<Record<string, string>>;
};

type ScoreQuestion = {
  readonly type: "score";
  readonly instructions: string;
  readonly criteria: ReadonlyArray<string>;
};

export type JudgementQuestion =
  | NoulQuestion
  | ChoiceQuestion
  | ScoreQuestion;

export type JevState =
  | string
  | Readonly<Record<string, unknown>>
  | ReadonlyArray<unknown>;

export type JudgeRequest = {
  readonly state: JevState;
  readonly questions: Readonly<Record<string, JudgementQuestion>>;
};

export type NoulAnswer = {
  readonly type: "noul";
  readonly noul: number;
};

export type ChoiceAnswer = {
  readonly type: "choice";
  readonly choice: string;
  readonly confidence: number;
  readonly probabilities: Readonly<Record<string, number>>;
};

export type ScoreAnswer = {
  readonly type: "score";
  readonly score: number;
  readonly confidence: number;
  readonly legend?: Readonly<Record<string, string>>;
  readonly probabilities: Readonly<Record<string, number>>;
};

export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type JevUsage = {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cost?: number;
};

export type JevResponse = {
  readonly model: string;
  readonly answers: Readonly<Record<string, JevAnswer>>;
  readonly usage?: JevUsage;
};

export type Judge = {
  (request: JudgeRequest): Promise<JevResponse>;
  readonly provider?: string;
};

export type JudgeOptions = {
  readonly apiKey?: string;
  readonly model?: string;
  readonly fetch?: typeof fetch;
};

export type JudgeProvider = {
  readonly name: string;
  readonly decide: (
    request: JudgeRequest,
    options: JudgeOptions,
  ) => Promise<JevResponse>;
};

export const createJudgeProvider = (
  provider: JudgeProvider,
  options: JudgeOptions = {},
): Judge =>
  Object.assign(
    (request: JudgeRequest) => provider.decide(request, options),
    { provider: provider.name },
  );
