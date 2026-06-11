// Type declarations for benchmark-gate.mjs (consumed by tests/benchmark-gate.test.ts).

export const BASELINE_SCHEMA_VERSION: 1;
export const DEFAULT_RATIO_MAX: number;

export interface BaselineScenario {
  counters: Record<string, number>;
  timeRatio: number;
}

export interface Baseline {
  schemaVersion: number;
  generatedWith: Record<string, unknown>;
  scenarios: Record<string, BaselineScenario>;
}

export interface RunScenario {
  name: string;
  counters: Record<string, number>;
  timeRatio: number;
}

export interface GateFailure {
  kind: 'scenario_set' | 'counter' | 'time_ratio';
  scenario: string;
  problem?: string;
  counter?: string;
  expected?: number | null;
  actual?: number | null;
  baselineRatio?: number;
  actualRatio?: number;
  multiplier?: number;
}

export function validateBaseline(json: unknown): { ok: boolean; errors: string[] };
export function checkReport(
  baseline: Baseline,
  run: { scenarios: RunScenario[] },
  options?: { ratioMax?: number },
): { ok: boolean; failures: GateFailure[] };
export function formatFailures(failures: GateFailure[]): string[];
export function round(value: number): number;
export function medianOf(fn: () => number, n: number): number;
export function calibrationWorkload(): number;
export function runCalibration(): number;
export function renderMarkdown(report: unknown): string;
