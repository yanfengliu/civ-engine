import { EngineRangeError, EngineTypeError } from './engine-error.js';
import { assertJsonCompatible, cloneJsonValue, type JsonValue } from './json.js';
import type { Marker } from './session-bundle.js';
import type { NewMarker } from './session-recorder.js';
import { ENGINE_VERSION } from './version.js';
import {
  visualPlaytestFindingToMarker,
  type VisualPlaytestFinding,
  type VisualPlaytestFindingCategory,
  type VisualPlaytestFindingEvidence,
  type VisualPlaytestFindingSeverity,
} from './visual-playtest.js';
import type {
  AssertImprovementFindingOptions,
  ImprovementDisposition,
  ImprovementEvidenceRef,
  ImprovementFinding,
  ImprovementFindingInit,
  ImprovementFindingSchemaVersion,
  ImprovementNextAction,
  ImprovementPromotionTarget,
  ImprovementRunManifest,
  ImprovementRunManifestInput,
  ImprovementVerificationMethod,
  ImprovementVerificationStatus,
} from './improvement-loop-types.js';
export type {
  AssertImprovementFindingOptions,
  ImprovementDisposition,
  ImprovementEvidenceRef,
  ImprovementFinding,
  ImprovementFindingInit,
  ImprovementFindingSchemaVersion,
  ImprovementGateResult,
  ImprovementNextAction,
  ImprovementPromotionTarget,
  ImprovementRunArtifact,
  ImprovementRunManifest,
  ImprovementRunManifestInput,
  ImprovementVerificationMethod,
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
const V1_NEXT_ACTIONS = new Set<ImprovementNextAction>([
  'proposalOnly',
  'autoFix',
  'manualFix',
  'observeMore',
  'none',
]);
const V2_ONLY_NEXT_ACTIONS = new Set<ImprovementNextAction>([
  'improveHarness',
  'fileEngineFeedback',
  'addRegression',
  'updateDesign',
]);
const NEXT_ACTIONS = new Set<ImprovementNextAction>([...V1_NEXT_ACTIONS, ...V2_ONLY_NEXT_ACTIONS]);
const VERIFICATION_METHODS = new Set<ImprovementVerificationMethod>([
  'replay',
  'state',
  'spec',
  'metric',
  'screenshot',
  'human',
]);
const PROMOTION_TARGETS = new Set<ImprovementPromotionTarget>([
  'test',
  'scenario',
  'fixture',
  'assertion',
  'backlog',
  'engineFeedback',
  'designQuestion',
]);
function isReplayableEvidenceRef(ref: ImprovementEvidenceRef): boolean {
  if (ref.kind === 'tick') return ref.tick !== undefined;
  if (ref.kind === 'marker') return typeof ref.markerId === 'string' && ref.markerId.length > 0;
  if (ref.kind === 'bundle') {
    return (
      (typeof ref.bundleId === 'string' && ref.bundleId.length > 0) ||
      (typeof ref.sessionId === 'string' && ref.sessionId.length > 0)
    );
  }
  return false;
}
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

export function assertImprovementFinding(
  value: unknown,
  options: AssertImprovementFindingOptions = {},
): asserts value is ImprovementFinding {
  if (!isRecord(value)) {
    throw new EngineTypeError('improvement_finding_invalid', 'improvement finding must be a plain object');
  }
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    throw new EngineRangeError(
      'improvement_finding_invalid',
      'improvement finding schemaVersion must be 1 or 2',
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
  if (value.schemaVersion === 1 && V2_ONLY_NEXT_ACTIONS.has(value.nextAction as ImprovementNextAction)) {
    throw new EngineRangeError(
      'improvement_finding_invalid',
      `improvement finding nextAction '${String(value.nextAction)}' requires schemaVersion 2`,
      { details: { nextAction: serializableDetail(value.nextAction) } },
    );
  }
  if (value.verificationMethod !== undefined) {
    requireSet(value.verificationMethod, VERIFICATION_METHODS, 'improvement finding verificationMethod');
  }
  if (value.promotionTarget !== undefined) {
    requireSet(value.promotionTarget, PROMOTION_TARGETS, 'improvement finding promotionTarget');
  }
  if (value.disposition !== undefined) {
    requireSet(value.disposition, DISPOSITIONS, 'improvement finding disposition');
  }
  if (value.evidence !== undefined) assertEvidenceRefs(value.evidence);
  if (value.sourceRun !== undefined) assertRunManifest(value.sourceRun, 'improvement sourceRun');
  if (value.data !== undefined) assertJsonCompatible(value.data, 'improvement finding data');
  if (value.refs !== undefined) assertJsonCompatible(value.refs, 'improvement finding refs');
  assertJsonCompatible(value, 'improvement finding');
  if (options.requireVerificationEvidence && value.verificationStatus === 'verified') {
    const evidence = (value.evidence ?? []) as readonly ImprovementEvidenceRef[];
    if (!evidence.some(isReplayableEvidenceRef)) {
      throw new EngineRangeError(
        'improvement_finding_invalid',
        'verified improvement findings require at least one addressed replayable evidence ref (tick with tick, marker with markerId, or bundle with bundleId/sessionId) under requireVerificationEvidence',
      );
    }
    if (value.verificationMethod === undefined) {
      throw new EngineRangeError(
        'improvement_finding_invalid',
        'verified improvement findings require verificationMethod under requireVerificationEvidence',
      );
    }
  }
}

export function assertImprovementRunManifest(value: unknown): asserts value is ImprovementRunManifest {
  assertRunManifest(value, 'improvement run manifest');
}

export function createImprovementRunManifest(input: ImprovementRunManifestInput): ImprovementRunManifest {
  const provided = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as ImprovementRunManifestInput;
  const manifest: ImprovementRunManifest = {
    schemaVersion: 1,
    ...provided,
    engineVersion: provided.engineVersion ?? ENGINE_VERSION,
  };
  assertImprovementRunManifest(manifest);
  return cloneJsonValue(manifest, 'improvement run manifest');
}

export function minimalImprovementFindingSchemaVersion(
  nextAction: ImprovementNextAction,
): ImprovementFindingSchemaVersion {
  return V2_ONLY_NEXT_ACTIONS.has(nextAction) ? 2 : 1;
}

export function visualPlaytestFindingToImprovementFinding(
  visual: VisualPlaytestFinding,
  init: ImprovementFindingInit,
): ImprovementFinding {
  const nextAction = init.nextAction ?? 'proposalOnly';
  const schemaVersion = minimalImprovementFindingSchemaVersion(nextAction);
  const evidence = improvementEvidenceFromVisualEvidence(visual.evidence);
  const finding: ImprovementFinding = {
    schemaVersion,
    id: init.id,
    title: visual.title,
    severity: visual.severity,
    category: visual.category,
    observed: visual.observed,
    ...(visual.expected !== undefined ? { expected: visual.expected } : {}),
    ...(visual.suggestion !== undefined ? { suggestion: visual.suggestion } : {}),
    ...(visual.area !== undefined ? { area: visual.area } : {}),
    ...(evidence ? { evidence } : {}),
    ...(visual.refs !== undefined ? { refs: visual.refs } : {}),
    verificationStatus: init.verificationStatus ?? 'unverified',
    ...(init.verificationMethod !== undefined ? { verificationMethod: init.verificationMethod } : {}),
    nextAction,
    ...(init.promotionTarget !== undefined ? { promotionTarget: init.promotionTarget } : {}),
    ...(init.disposition !== undefined ? { disposition: init.disposition } : {}),
    ...(init.sourceRun !== undefined ? { sourceRun: init.sourceRun } : {}),
    ...(init.data !== undefined ? { data: init.data } : {}),
  };
  assertImprovementFinding(finding);
  return cloneJsonValue(finding, 'improvement finding');
}

function improvementEvidenceFromVisualEvidence(
  evidence: VisualPlaytestFindingEvidence | undefined,
): ImprovementEvidenceRef[] | undefined {
  if (!evidence) return undefined;
  const refs: ImprovementEvidenceRef[] = [];
  if (evidence.tick !== undefined) refs.push({ kind: 'tick', tick: evidence.tick });
  if (evidence.step !== undefined) {
    refs.push({
      kind: 'step',
      step: evidence.step,
      ...(evidence.actionIndex !== undefined ? { actionIndex: evidence.actionIndex } : {}),
    });
  } else if (evidence.actionIndex !== undefined) {
    refs.push({ kind: 'trace', actionIndex: evidence.actionIndex });
  }
  if (evidence.screenshotPath !== undefined) {
    refs.push({ kind: 'screenshot', screenshotPath: evidence.screenshotPath });
  }
  if (evidence.stateLabels !== undefined) {
    refs.push({ kind: 'text', stateLabels: [...evidence.stateLabels] });
  }
  return refs.length > 0 ? refs : undefined;
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
    schemaVersion: finding.schemaVersion,
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

function assertRunManifest(value: unknown, label: string): asserts value is ImprovementRunManifest {
  if (!isRecord(value)) {
    throw new EngineTypeError('improvement_finding_invalid', `${label} must be a plain object`);
  }
  if (value.schemaVersion !== 1) {
    throw new EngineRangeError('improvement_finding_invalid', `${label} schemaVersion must be 1`);
  }
  requireNonEmptyString(value.id, `${label} id`);
  const stringKeys = [
    'gameId',
    'objective',
    'startedAt',
    'completedAt',
    'bundleId',
    'sessionId',
    'gitCommit',
    'engineVersion',
    'model',
    'provider',
    'stopReason',
  ] as const;
  for (const key of stringKeys) {
    requireOptionalString(value[key], `${label} ${key}`);
  }
  if (value.seed !== undefined && typeof value.seed !== 'string' && typeof value.seed !== 'number') {
    throw new EngineTypeError('improvement_finding_invalid', `${label} seed must be a string or number`);
  }
  for (const key of ['costUsd', 'durationMs'] as const) {
    if (value[key] !== undefined && !(typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)) {
      throw new EngineRangeError('improvement_finding_invalid', `${label} ${key} must be a non-negative finite number`);
    }
  }
  if (value.artifacts !== undefined) {
    if (
      !Array.isArray(value.artifacts) ||
      value.artifacts.some(
        (artifact) =>
          !isRecord(artifact) || typeof artifact.kind !== 'string' || typeof artifact.path !== 'string',
      )
    ) {
      throw new EngineTypeError(
        'improvement_finding_invalid',
        `${label} artifacts must be an array of { kind, path } string pairs`,
      );
    }
  }
  if (value.gates !== undefined) {
    if (
      !Array.isArray(value.gates) ||
      value.gates.some(
        (gate) =>
          !isRecord(gate) ||
          typeof gate.name !== 'string' ||
          typeof gate.ok !== 'boolean' ||
          (gate.detail !== undefined && typeof gate.detail !== 'string'),
      )
    ) {
      throw new EngineTypeError(
        'improvement_finding_invalid',
        `${label} gates must be an array of { name, ok, detail? } entries`,
      );
    }
  }
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string')) {
      throw new EngineTypeError('improvement_finding_invalid', `${label} tags must be an array of strings`);
    }
  }
  if (value.data !== undefined) assertJsonCompatible(value.data, `${label} data`);
  assertJsonCompatible(value, label);
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
