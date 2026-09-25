export type ToolCall = {
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
};

export type Golden = {
  readonly input: string;
  readonly expectedOutput?: string;
  readonly expectedTools?: ReadonlyArray<ToolCall>;
};

export type TestCase = {
  readonly input: string;
  readonly actualOutput?: string;
  readonly toolsCalled?: ReadonlyArray<ToolCall>;
  readonly expectedOutput?: string;
  readonly expectedTools?: ReadonlyArray<ToolCall>;
};
