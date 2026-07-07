import { IMPROVEMENT_FINDING_SCHEMA_VERSION } from './ai-contract.js';
import { EngineRangeError, EngineTypeError } from './engine-error.js';
import { assertJsonCompatible, cloneJsonValue, type JsonValue } from './json.js';
import type { Marker } from './session-bundle.js';
import type { NewMarker } from './session-recorder.js';
import {
  visualPlaytestFindingToMarker,
  type VisualPlaytestFinding,
  type VisualPlaytestFindingCategory,
  type VisualPlaytestFindingEvidence,
  type VisualPlaytestFindingSeverity,
} from './visual-playtest.js';
import type {
  ImprovementDisposition,
  ImprovementEvidenceRef,
  ImprovementFinding,
  ImprovementNextAction,
  ImprovementVerificationStatus,
} from './improvement-loop-types.js';
export type {
  ImprovementDisposition,
  ImprovementEvidenceRef,
  ImprovementFinding,
  ImprovementNextAction,
  ImprovementRunManifest,
  ImprovementVerificationStatus,
} from './improvement-loop-types.js';

const SEVERITIES = new Set<VisualPlaytestFindingSeverity>(['info', 'low', 'medium', 'high', 'critical']);
const CATEGORIES = new Set<VisualPlaytestFindingCategory>([
  'visual',
  'usability',
  'rules',
  'performance',
  'accessibility',
  'regression',
  'bug',
  'opportunity',
]);
const VERIFICATION_STATUSES = new Set<ImprovementVerificationStatus>([
  'unverified',
  'verified',
  'falsePositive',
  'fixed',
  'regressed',
]);
const NEXT_ACTIONS = new Set<ImprovementNextAction>([
  'proposalOnly',
  'autoFix',
  'manualFix',
  'observeMore',
  'none',
]);
const DISPOSITIONS = new Set<ImprovementDisposition>(['candidate', 'accepted', 'rejected', 'deferred', 'wontFix']);
const EVIDENCE_KINDS = new Set<ImprovementEvidenceRef['kind']>([
  'tick',
  'step',
  'screenshot',
  'marker',
  'trace',
  'bundle',
  'metric',
  'text',
]);

export function improvementFindingToVisualPlaytestFinding(
  finding: ImprovementFinding,
): VisualPlaytestFinding {
  const safe = cloneImprovementFinding(finding);
  const evidence = visualEvidenceFromImprovementEvidence(safe.evidence);
  return {
    title: safe.title,
    severity: safe.severity,
    category: safe.category,
    observed: safe.observed,
    ...(safe.expected !== undefined ? { expected: safe.expected } : {}),
    ...(safe.suggestion !== undefined ? { suggestion: safe.suggestion } : {}),
    ...(safe.area !== undefined ? { area: safe.area } : {}),
    ...(safe.refs !== undefined ? { refs: safe.refs } : {}),
    ...(evidence ? { evidence } : {}),
    data: improvementLoopPayload(safe),
  };
}

export function improvementFindingToMarker(finding: ImprovementFinding): NewMarker {
  const safe = cloneImprovementFinding(finding);
  const visualFinding = improvementFindingToVisualPlaytestFinding(safe);
  const marker = visualPlaytestFindingToMarker(visualFinding);
  return {
    ...marker,
    data: {
      ...(isJsonRecord(marker.data) ? marker.data : {}),
      improvementLoop: improvementLoopFindingEnvelope(safe),
    } as JsonValue,
  };
}

export function improvementFindingsFromMarkers(markers: readonly Marker[]): ImprovementFinding[] {
  const findings: ImprovementFinding[] = [];
  for (const marker of markers) {
    const data = marker.data;
    if (!isRecord(data)) continue;
    const payload = data.improvementLoop;
    if (!isRecord(payload) || payload.type !== 'finding') continue;
    const finding = payload.finding;
    try {
      assertImprovementFinding(finding);
    } catch {
      continue;
    }
    findings.push(cloneJsonValue(finding, 'improvement finding'));
  }
  return findings;
}

export function assertImprovementFinding(value: unknown): asserts value is ImprovementFinding {
  if (!isRecord(value)) {
    throw new EngineTypeError('improvement_finding_invalid', 'improvement finding must be a plain object');
  }
  if (value.schemaVersion !== IMPROVEMENT_FINDING_SCHEMA_VERSION) {
    throw new EngineRangeError(
      'improvement_finding_invalid',
      `improvement finding schemaVersion must be ${IMPROVEMENT_FINDING_SCHEMA_VERSION}`,
      { details: { schemaVersion: serializableDetail(value.schemaVersion) } },
    );
  }
  requireNonEmptyString(value.id, 'improvement finding id');
  requireNonEmptyString(value.title, 'improvement finding title');
  requireSet(value.severity, SEVERITIES, 'improvement finding severity');
  requireSet(value.category, CATEGORIES, 'improvement finding category');
  requireNonEmptyString(value.observed, 'improvement finding observed');
  requireOptionalString(value.expected, 'improvement finding expected');
  requireOptionalString(value.suggestion, 'improvement finding suggestion');
  requireOptionalString(value.area, 'improvement finding area');
  requireSet(value.verificationStatus, VERIFICATION_STATUSES, 'improvement finding verificationStatus');
  requireSet(value.nextAction, NEXT_ACTIONS, 'improvement finding nextAction');
  if (value.disposition !== undefined) {
    requireSet(value.disposition, DISPOSITIONS, 'improvement finding disposition');
  }
  if (value.evidence !== undefined) assertEvidenceRefs(value.evidence);
  if (value.sourceRun !== undefined) assertSourceRun(value.sourceRun);
  if (value.data !== undefined) assertJsonCompatible(value.data, 'improvement finding data');
  if (value.refs !== undefined) assertJsonCompatible(value.refs, 'improvement finding refs');
  assertJsonCompatible(value, 'improvement finding');
}

function cloneImprovementFinding(finding: ImprovementFinding): ImprovementFinding {
  assertImprovementFinding(finding);
  return cloneJsonValue(finding, 'improvement finding');
}

function improvementLoopPayload(finding: ImprovementFinding): JsonValue {
  return {
    improvementLoop: improvementLoopFindingEnvelope(finding),
  };
}

function improvementLoopFindingEnvelope(finding: ImprovementFinding): JsonValue {
  return {
    schemaVersion: IMPROVEMENT_FINDING_SCHEMA_VERSION,
    type: 'finding',
    finding: cloneJsonValue(finding, 'improvement finding payload') as unknown as JsonValue,
  };
}

function visualEvidenceFromImprovementEvidence(
  evidence: readonly ImprovementEvidenceRef[] | undefined,
): VisualPlaytestFindingEvidence | undefined {
  if (!evidence?.length) return undefined;
  const out: VisualPlaytestFindingEvidence = {};
  for (const ref of evidence) {
    if (out.tick === undefined && ref.tick !== undefined) out.tick = ref.tick;
    if (out.step === undefined && ref.step !== undefined) out.step = ref.step;
    if (out.actionIndex === undefined && ref.actionIndex !== undefined) out.actionIndex = ref.actionIndex;
    if (out.screenshotPath === undefined && ref.screenshotPath !== undefined) {
      out.screenshotPath = ref.screenshotPath;
    }
    if (out.stateLabels === undefined && ref.stateLabels !== undefined) out.stateLabels = [...ref.stateLabels];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function assertEvidenceRefs(value: unknown): asserts value is readonly ImprovementEvidenceRef[] {
  if (!Array.isArray(value)) {
    throw new EngineTypeError('improvement_finding_invalid', 'improvement finding evidence must be an array');
  }
  for (const [index, ref] of value.entries()) {
    if (!isRecord(ref)) {
      throw new EngineTypeError('improvement_finding_invalid', `improvement evidence ${index} must be a plain object`);
    }
    requireSet(ref.kind, EVIDENCE_KINDS, `improvement evidence ${index} kind`);
    if (ref.kind === 'tick' && !isNonNegativeInteger(ref.tick)) {
      throw new EngineRangeError('improvement_finding_invalid', 'tick evidence must be a non-negative integer');
    }
    for (const key of ['tick', 'step', 'actionIndex'] as const) {
      if (ref[key] !== undefined && !isNonNegativeInteger(ref[key])) {
        throw new EngineRangeError(
          'improvement_finding_invalid',
          `improvement evidence ${index} ${key} must be a non-negative integer`,
        );
      }
    }
    for (const key of ['screenshotPath', 'markerId', 'bundleId', 'sessionId', 'label', 'value'] as const) {
      requireOptionalString(ref[key], `improvement evidence ${index} ${key}`);
    }
    if (ref.stateLabels !== undefined) {
      if (!Array.isArray(ref.stateLabels) || ref.stateLabels.some((label) => typeof label !== 'string')) {
        throw new EngineTypeError(
          'improvement_finding_invalid',
          `improvement evidence ${index} stateLabels must be an array of strings`,
        );
      }
    }
    if (ref.data !== undefined) assertJsonCompatible(ref.data, `improvement evidence ${index} data`);
  }
}

function assertSourceRun(value: unknown): void {
  if (!isRecord(value)) {
    throw new EngineTypeError('improvement_finding_invalid', 'improvement finding sourceRun must be a plain object');
  }
  if (value.schemaVersion !== 1) {
    throw new EngineRangeError('improvement_finding_invalid', 'improvement sourceRun schemaVersion must be 1');
  }
  requireNonEmptyString(value.id, 'improvement sourceRun id');
  for (const key of ['gameId', 'objective', 'startedAt', 'completedAt', 'bundleId', 'sessionId'] as const) {
    requireOptionalString(value[key], `improvement sourceRun ${key}`);
  }
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string')) {
      throw new EngineTypeError('improvement_finding_invalid', 'improvement sourceRun tags must be an array of strings');
    }
  }
  if (value.data !== undefined) assertJsonCompatible(value.data, 'improvement sourceRun data');
}

function requireNonEmptyString(value: unknown, label: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new EngineTypeError('improvement_finding_invalid', `${label} must be a non-empty string`);
  }
}

function requireOptionalString(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== 'string') {
    throw new EngineTypeError('improvement_finding_invalid', `${label} must be a string`);
  }
}

function requireSet<T extends string>(value: unknown, allowed: ReadonlySet<T>, label: string): asserts value is T {
  if (typeof value !== 'string' || !allowed.has(value as T)) {
    throw new EngineTypeError('improvement_finding_invalid', `${label} is not supported`);
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonRecord(value: unknown): value is Record<string, JsonValue> {
  return isRecord(value);
}

function serializableDetail(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  return String(value);
}
