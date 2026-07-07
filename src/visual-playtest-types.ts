import type { JsonValue } from './json.js';
import type { MarkerRefs } from './session-bundle.js';

export type MaybePromise<T> = T | Promise<T>;

export type VisualPlaytestActionKind =
  | 'click'
  | 'hover'
  | 'drag'
  | 'key'
  | 'type'
  | 'wheel'
  | 'select'
  | 'wait'
  | 'viewport'
  | 'stop';

export type VisualPlaytestPromptMode = 'playerBlind' | 'oracleAssisted';
export type VisualPlaytestStateAudience = 'agent' | 'reviewer' | 'traceOnly';
export type VisualPlaytestFindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type VisualPlaytestFindingCategory =
  | 'visual'
  | 'usability'
  | 'rules'
  | 'performance'
  | 'accessibility'
  | 'regression'
  | 'bug'
  | 'opportunity';

export interface VisualPlaytestPoint {
  x: number;
  y: number;
}

export interface VisualPlaytestRect extends VisualPlaytestPoint {
  width: number;
  height: number;
}

export interface VisualPlaytestViewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface VisualPlaytestScreenshot {
  path?: string;
  dataUrl?: string;
  mime?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface VisualPlaytestStateChannel {
  label: string;
  audience: VisualPlaytestStateAudience;
  summary?: string;
  value?: JsonValue;
  sensitive?: boolean;
  redaction?: 'value' | 'channel' | 'none';
  redacted?: true;
}

export interface VisualPlaytestControl {
  id?: string;
  label: string;
  actionKinds?: readonly VisualPlaytestActionKind[];
  target?: string;
  bounds?: VisualPlaytestRect;
  enabled?: boolean;
  description?: string;
}

export interface VisualPlaytestObservation {
  screenshot?: VisualPlaytestScreenshot;
  visibleText?: readonly string[];
  controls?: readonly VisualPlaytestControl[];
  state?: readonly VisualPlaytestStateChannel[];
  metadata?: JsonValue;
}

interface VisualPlaytestActionBase {
  kind: VisualPlaytestActionKind;
  reason?: string;
  label?: string;
}

export type VisualPlaytestAction =
  | (VisualPlaytestActionBase & {
      kind: 'click';
      target?: string;
      point?: VisualPlaytestPoint;
      button?: 'left' | 'middle' | 'right';
      clickCount?: number;
    })
  | (VisualPlaytestActionBase & { kind: 'hover'; target?: string; point?: VisualPlaytestPoint })
  | (VisualPlaytestActionBase & {
      kind: 'drag';
      from: VisualPlaytestPoint;
      to: VisualPlaytestPoint;
      durationMs?: number;
    })
  | (VisualPlaytestActionBase & { kind: 'key'; key: string; modifiers?: readonly string[] })
  | (VisualPlaytestActionBase & { kind: 'type'; text: string; target?: string })
  | (VisualPlaytestActionBase & {
      kind: 'wheel';
      deltaX?: number;
      deltaY?: number;
      point?: VisualPlaytestPoint;
    })
  | (VisualPlaytestActionBase & { kind: 'select'; target: string; value: string })
  | (VisualPlaytestActionBase & { kind: 'wait'; durationMs?: number })
  | (VisualPlaytestActionBase & { kind: 'viewport'; viewport: VisualPlaytestViewport })
  | (VisualPlaytestActionBase & { kind: 'stop'; reason?: string });

export interface VisualPlaytestFindingEvidence {
  step?: number;
  tick?: number;
  actionIndex?: number;
  screenshotPath?: string;
  stateLabels?: readonly string[];
}

export interface VisualPlaytestFinding {
  title: string;
  severity: VisualPlaytestFindingSeverity;
  category: VisualPlaytestFindingCategory;
  observed: string;
  expected?: string;
  suggestion?: string;
  area?: string;
  evidence?: VisualPlaytestFindingEvidence;
  refs?: MarkerRefs;
  data?: JsonValue;
}

export interface VisualPlaytestDecision {
  rationale?: string;
  action?: VisualPlaytestAction;
  actions?: readonly VisualPlaytestAction[];
  findings?: readonly VisualPlaytestFinding[];
  stopReason?: string;
}

export interface VisualPlaytestErrorShape {
  name: string;
  message: string;
  stack: string | null;
}

export interface VisualPlaytestActionResult {
  ok: boolean;
  action?: VisualPlaytestAction;
  message?: string;
  observation?: VisualPlaytestObservation;
  error?: VisualPlaytestErrorShape;
}

export interface VisualPlaytestObserveInput {
  step: number;
  previousActionResult?: VisualPlaytestActionResult;
}

export interface VisualPlaytestAgentInput {
  step: number;
  maxSteps: number;
  mode: VisualPlaytestPromptMode;
  observation: VisualPlaytestObservation;
  trace: readonly VisualPlaytestTraceEntry[];
}

export interface VisualPlaytestActionContext {
  step: number;
  actionIndex: number;
  observation: VisualPlaytestObservation;
}

export interface VisualPlaytestAnnotationContext {
  step: number;
  observation: VisualPlaytestObservation;
}

export interface VisualPlaytestHost {
  observe(input: VisualPlaytestObserveInput): MaybePromise<VisualPlaytestObservation>;
  performAction(
    action: VisualPlaytestAction,
    ctx: VisualPlaytestActionContext,
  ): MaybePromise<VisualPlaytestActionResult | void>;
  annotate?(finding: VisualPlaytestFinding, ctx: VisualPlaytestAnnotationContext): MaybePromise<void>;
}

export interface VisualPlaytestAgent {
  decide(input: VisualPlaytestAgentInput): MaybePromise<VisualPlaytestDecision>;
}

export type VisualPlaytestStopReason =
  | 'maxSteps'
  | 'agentStop'
  | 'noActions'
  | 'actionFailed'
  | 'hostError'
  | 'agentError';

export interface VisualPlaytestTraceEntry {
  step: number;
  actionIndex: number;
  observation: VisualPlaytestObservation;
  action?: VisualPlaytestAction;
  decision?: VisualPlaytestDecision;
  result?: VisualPlaytestActionResult;
  findings?: readonly VisualPlaytestFinding[];
  error?: VisualPlaytestErrorShape;
}

export interface VisualPlaytestLoopConfig {
  host: VisualPlaytestHost;
  agent: VisualPlaytestAgent;
  maxSteps: number;
  promptMode?: VisualPlaytestPromptMode;
  traceObservation?: 'redacted' | 'full';
}

export interface VisualPlaytestLoopResult {
  ok: boolean;
  stopReason: VisualPlaytestStopReason;
  stepsRun: number;
  trace: VisualPlaytestTraceEntry[];
  findings: VisualPlaytestFinding[];
  error?: VisualPlaytestErrorShape;
}

export interface VisualPlaytestPromptInput {
  observation: VisualPlaytestObservation;
  mode?: VisualPlaytestPromptMode;
  objective?: string;
  maxActions?: number;
}

export interface VisualPlaytestRedactionOptions {
  includeScreenshotDataUrl?: boolean;
  includeSensitiveState?: boolean;
  includeStateValues?: boolean;
}
