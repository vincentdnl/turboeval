import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { GEvalResult } from "./gEval.js";

export type TestInfo = {
  readonly name: string;
  readonly path: string;
};

export type CostSummary = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalCost: number;
};

export type JudgeInfo = {
  readonly provider: string;
  readonly model: string;
};

export type MeasurementReport = {
  readonly name: string;
  readonly result: GEvalResult;
};

export type CostRecord = {
  readonly runId: string;
  readonly testName: string;
  readonly testPath: string;
  readonly timestamp: string;
  readonly cost: CostSummary;
  readonly judge: JudgeInfo;
  readonly measurement: MeasurementReport;
};

export type ReportCostInput = {
  readonly cost: CostSummary;
  readonly judge: JudgeInfo;
  readonly measurement: MeasurementReport;
};

export type CostReport = {
  readonly runId: string;
  readonly count: number;
  readonly totalCost: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly records: ReadonlyArray<CostRecord>;
};

export type TurboEvalSetup = {
  readonly runId?: string;
  readonly directory?: string;
  readonly getTestInfo?: () => TestInfo;
};

const DEFAULT_DIRECTORY = ".turboeval";
const COSTS_FILE = "judge-costs.jsonl";

const emptyTestInfo = (): TestInfo => ({ name: "", path: "" });

let activeRunId: string | undefined;
let reportDirectory = DEFAULT_DIRECTORY;
let testInfoResolver: () => TestInfo = emptyTestInfo;

export const createRunId = (): string => randomUUID();

export const setupTurboEval = (setup: TurboEvalSetup = {}): string => {
  const runId = setup.runId ?? createRunId();
  activeRunId = runId;
  reportDirectory = setup.directory ?? DEFAULT_DIRECTORY;
  testInfoResolver = setup.getTestInfo ?? emptyTestInfo;
  return runId;
};

export const getRunId = (): string | undefined => activeRunId;

const costsPath = (): string =>
  resolve(process.cwd(), reportDirectory, COSTS_FILE);

export const recordCost = async (
  runId: string,
  input: ReportCostInput,
): Promise<void> => {
  const test = testInfoResolver();
  const record: CostRecord = {
    runId,
    testName: test.name,
    testPath: test.path,
    timestamp: new Date().toISOString(),
    cost: input.cost,
    judge: input.judge,
    measurement: input.measurement,
  };
  const path = costsPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
};

const parseRecord = (line: string): CostRecord | undefined => {
  if (!line.trim()) return undefined;
  try {
    return JSON.parse(line) as CostRecord;
  } catch {
    return undefined;
  }
};

const readCostRecords = async (): Promise<
  ReadonlyArray<CostRecord>
> => {
  try {
    const content = await readFile(costsPath(), "utf8");
    return content
      .split("\n")
      .map(parseRecord)
      .filter((record): record is CostRecord => record !== undefined);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

const sum = (values: ReadonlyArray<number>): number =>
  values.reduce((total, value) => total + value, 0);

const summarizeCosts = (
  runId: string,
  records: ReadonlyArray<CostRecord>,
): CostReport => {
  const matching = records.filter((record) => record.runId === runId);
  return {
    runId,
    count: matching.length,
    totalCost: sum(matching.map((record) => record.cost.totalCost)),
    inputTokens: sum(matching.map((record) => record.cost.inputTokens)),
    outputTokens: sum(matching.map((record) => record.cost.outputTokens)),
    records: matching,
  };
};

const summarizeRecords = (
  records: ReadonlyArray<CostRecord>,
): ReadonlyArray<CostReport> => {
  const runIds = Array.from(new Set(records.map((record) => record.runId)));
  return runIds
    .map((runId) => summarizeCosts(runId, records))
    .filter((report) => report.count > 0);
};

export const summarizeCostsSince = async (
  since: number,
): Promise<ReadonlyArray<CostReport>> =>
  summarizeRecords(
    (await readCostRecords()).filter(
      (record) => Date.parse(record.timestamp) >= since,
    ),
  );

export const reportCosts = async (runId: string): Promise<CostReport> =>
  summarizeCosts(runId, await readCostRecords());

const totalCostReport = (
  reports: ReadonlyArray<CostReport>,
): CostReport => ({
  runId: "total",
  count: reports.reduce((total, report) => total + report.count, 0),
  totalCost: reports.reduce((total, report) => total + report.totalCost, 0),
  inputTokens: reports.reduce((total, report) => total + report.inputTokens, 0),
  outputTokens: reports.reduce(
    (total, report) => total + report.outputTokens,
    0,
  ),
  records: reports.flatMap((report) => report.records),
});

const formatUsd = (value: number): string => `$${value.toFixed(6)}`;

const formatCostReport = (report: CostReport): string => {
  const calls = report.count === 1 ? "judge call" : "judge calls";
  return [
    `[turboeval] run ${report.runId.slice(0, 8)}`,
    formatUsd(report.totalCost),
    `${report.count} ${calls}`,
    `${report.inputTokens} in / ${report.outputTokens} out tokens`,
  ].join(" — ");
};

export const formatCostReports = (
  reports: ReadonlyArray<CostReport>,
): ReadonlyArray<string> => {
  if (reports.length === 0) return [];
  const lines = reports.map(formatCostReport);
  return reports.length > 1
    ? [...lines, formatCostReport(totalCostReport(reports))]
    : lines;
};
