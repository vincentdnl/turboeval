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
