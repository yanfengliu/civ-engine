import { EngineRangeError } from './engine-error.js';
import type { JsonValue } from './json.js';
import type { Marker } from './session-bundle.js';
import type { NewMarker } from './session-recorder.js';
import type {
  VisualPlaytestAction,
  VisualPlaytestActionResult,
  VisualPlaytestControl,
  VisualPlaytestDecision,
  VisualPlaytestErrorShape,
  VisualPlaytestFinding,
  VisualPlaytestLoopConfig,
  VisualPlaytestLoopResult,
  VisualPlaytestObservation,
  VisualPlaytestPromptMode,
  VisualPlaytestRedactionOptions,
  VisualPlaytestScreenshot,
  VisualPlaytestStateChannel,
  VisualPlaytestStopReason,
  VisualPlaytestTraceEntry,
} from './visual-playtest-types.js';
export type {
  VisualPlaytestAction,
  VisualPlaytestActionContext,
  VisualPlaytestActionKind,
  VisualPlaytestActionResult,
  VisualPlaytestAgent,
  VisualPlaytestAgentInput,
  VisualPlaytestAnnotationContext,
  VisualPlaytestBudget,
  VisualPlaytestControl,
  VisualPlaytestDecision,
  VisualPlaytestErrorShape,
  VisualPlaytestFinding,
  VisualPlaytestFindingCategory,
  VisualPlaytestFindingEvidence,
  VisualPlaytestFindingSeverity,
  VisualPlaytestHost,
  VisualPlaytestLoopConfig,
  VisualPlaytestLoopResult,
  VisualPlaytestObservation,
  VisualPlaytestObserveInput,
  VisualPlaytestPoint,
  VisualPlaytestPromptInput,
  VisualPlaytestPromptMode,
  VisualPlaytestPromptPart,
  VisualPlaytestRect,
  VisualPlaytestRedactionOptions,
  VisualPlaytestScreenshot,
  VisualPlaytestStateAudience,
  VisualPlaytestStateChannel,
  VisualPlaytestStopReason,
  VisualPlaytestTraceEntry,
  VisualPlaytestViewport,
} from './visual-playtest-types.js';
export { buildVisualPlaytestPrompt, buildVisualPlaytestPromptParts } from './visual-playtest-prompt.js';

export async function runVisualPlaytestLoop(
  config: VisualPlaytestLoopConfig,
): Promise<VisualPlaytestLoopResult> {
  if (!Number.isInteger(config.maxSteps) || config.maxSteps < 1) {
    throw new EngineRangeError(
      'visual_playtest_max_steps_invalid',
      `maxSteps must be a positive integer (got ${config.maxSteps})`,
      { details: { maxSteps: Number.isFinite(config.maxSteps) ? config.maxSteps : null } },
    );
  }

  validateLoopOptions(config);

  const mode = config.promptMode ?? 'playerBlind';
  const now = config.now ?? Date.now;
  const maxWallClockMs = config.budget?.maxWallClockMs;
  const startedAt = maxWallClockMs !== undefined ? now() : 0;
  const maxActionsPerStep = config.budget?.maxActionsPerStep;
  const maxActionFailures = config.budget?.maxActionFailures;
  const continueOnFailure = config.onActionFailure === 'continue';
  const redactedBoundary = config.agentObservation !== 'raw';
  const trace: VisualPlaytestTraceEntry[] = [];
  const agentTrace: VisualPlaytestTraceEntry[] = redactedBoundary ? [] : trace;
  const findings: VisualPlaytestFinding[] = [];
  let previousActionResult: VisualPlaytestActionResult | undefined;
  let stepsRun = 0;
  let actionFailures = 0;

  const pushTrace = (entry: VisualPlaytestTraceEntry): void => {
    trace.push(entry);
    if (redactedBoundary) agentTrace.push(traceEntryForAgent(entry, mode));
  };

  const interruption = (): VisualPlaytestLoopResult | null => {
    if (config.signal?.aborted) {
      return stop(false, 'aborted', stepsRun, trace, findings, abortErrorShape(config.signal));
    }
    if (maxWallClockMs !== undefined && now() - startedAt > maxWallClockMs) {
      return stop(true, 'budgetExceeded', stepsRun, trace, findings);
    }
    return null;
  };

  for (let step = 0; step < config.maxSteps; step++) {
    const interruptedBeforeStep = interruption();
    if (interruptedBeforeStep) return interruptedBeforeStep;

    let observation: VisualPlaytestObservation;
    try {
      observation = await config.host.observe({ step, previousActionResult });
    } catch (e) {
      return stop(false, 'hostError', stepsRun, trace, findings, errorShape(e));
    }

    const interruptedAfterObserve = interruption();
    if (interruptedAfterObserve) return interruptedAfterObserve;

    const agentView = redactedBoundary ? observationForAgent(observation, mode) : observation;

    let decision: VisualPlaytestDecision;
    try {
      decision = await config.agent.decide({
        step,
        maxSteps: config.maxSteps,
        mode,
        observation: agentView,
        trace: agentTrace,
      });
    } catch (e) {
      return stop(false, 'agentError', stepsRun, trace, findings, errorShape(e));
    }

    const stepFindings = [...(decision.findings ?? [])];
    if (stepFindings.length > 0) findings.push(...stepFindings);
    if (config.signal?.aborted) {
      stepsRun = step + 1;
      return stop(false, 'aborted', stepsRun, trace, findings, abortErrorShape(config.signal));
    }
    if (stepFindings.length > 0 && config.host.annotate) {
      try {
        for (const finding of stepFindings) {
          await config.host.annotate(finding, { step, observation });
        }
      } catch (e) {
        return stop(false, 'hostError', stepsRun, trace, findings, errorShape(e));
      }
    }

    stepsRun = step + 1;
    const interruptedAfterDecide = interruption();
    if (interruptedAfterDecide) return interruptedAfterDecide;

    const traceClone = (): VisualPlaytestObservation =>
      config.traceObservation === 'full'
        ? cloneObservation(observation, { includeScreenshotDataUrl: true, includeSensitiveState: true })
        : redactVisualPlaytestObservation(observation);

    const allActions = actionsFromDecision(decision);
    const actions = maxActionsPerStep !== undefined ? allActions.slice(0, maxActionsPerStep) : allActions;
    if (actions.length === 0) {
      return stop(true, decision.stopReason ? 'agentStop' : 'noActions', stepsRun, trace, findings);
    }

    let failedThisStep = false;
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const interruptedBeforeAction = interruption();
      if (interruptedBeforeAction) return interruptedBeforeAction;

      const action = actions[actionIndex];
      const observationForTrace = traceClone();
      if (action.kind === 'stop') {
        pushTrace({
          step,
          actionIndex,
          observation: observationForTrace,
          decision,
          action,
          findings: stepFindings,
          result: { ok: true, action, message: action.reason ?? decision.stopReason ?? 'agent stopped' },
        });
        return stop(true, 'agentStop', stepsRun, trace, findings);
      }

      let result: VisualPlaytestActionResult;
      try {
        result = normalizeActionResult(await config.host.performAction(action, {
          step,
          actionIndex,
          observation,
        }), action);
      } catch (e) {
        const error = errorShape(e);
        pushTrace({ step, actionIndex, observation: observationForTrace, decision, action, error });
        if (!continueOnFailure) {
          return stop(false, 'actionFailed', stepsRun, trace, findings, error);
        }
        actionFailures += 1;
        if (maxActionFailures !== undefined && actionFailures > maxActionFailures) {
          return stop(false, 'actionFailed', stepsRun, trace, findings, error);
        }
        previousActionResult = { ok: false, action, error };
        failedThisStep = true;
        break;
      }

      pushTrace({
        step,
        actionIndex,
        observation: observationForTrace,
        decision,
        action,
        result: actionResultForTrace(result, config.traceObservation === 'full'),
        findings: stepFindings,
      });
      previousActionResult = result;
      if (!result.ok) {
        if (!continueOnFailure) {
          return stop(false, 'actionFailed', stepsRun, trace, findings, result.error);
        }
        actionFailures += 1;
        if (maxActionFailures !== undefined && actionFailures > maxActionFailures) {
          return stop(false, 'actionFailed', stepsRun, trace, findings, result.error);
        }
        failedThisStep = true;
        break;
      }
    }

    if (!failedThisStep && actions.length < allActions.length) {
      const truncatedStop = allActions.slice(actions.length).find((action) => action.kind === 'stop');
      if (truncatedStop) {
        pushTrace({
          step,
          actionIndex: actions.length,
          observation: traceClone(),
          decision,
          action: truncatedStop,
          findings: stepFindings,
          result: {
            ok: true,
            action: truncatedStop,
            message: truncatedStop.reason ?? decision.stopReason ?? 'agent stopped',
          },
        });
        return stop(true, 'agentStop', stepsRun, trace, findings);
      }
    }
  }

  return stop(true, 'maxSteps', stepsRun, trace, findings);
}

export function observationForAgent(
  observation: VisualPlaytestObservation,
  mode: VisualPlaytestPromptMode = 'playerBlind',
): VisualPlaytestObservation {
  const clone = cloneObservation(observation, { includeScreenshotDataUrl: true });
  const { state, ...rest } = clone;
  if (mode !== 'oracleAssisted') return rest;
  const agentState = state?.filter((channel) => channel.audience === 'agent');
  return agentState && agentState.length > 0 ? { ...rest, state: agentState } : rest;
}

function traceEntryForAgent(
  entry: VisualPlaytestTraceEntry,
  mode: VisualPlaytestPromptMode,
): VisualPlaytestTraceEntry {
  return {
    ...entry,
    observation: observationForAgent(entry.observation, mode),
    ...(entry.result?.observation
      ? {
          result: {
            ...entry.result,
            observation: observationForAgent(entry.result.observation, mode),
          },
        }
      : {}),
  };
}

export function redactVisualPlaytestObservation(
  observation: VisualPlaytestObservation,
  options: VisualPlaytestRedactionOptions = {},
): VisualPlaytestObservation {
  return cloneObservation(observation, options);
}

export function visualPlaytestFindingToMarker(finding: VisualPlaytestFinding): NewMarker {
  return {
    kind: 'annotation',
    text: `[${finding.severity}/${finding.category}] ${finding.title}`,
    ...(finding.evidence?.tick !== undefined ? { tick: finding.evidence.tick } : {}),
    ...(finding.refs ? { refs: finding.refs } : {}),
    data: {
      visualPlaytest: {
        schemaVersion: 1,
        type: 'finding',
        finding: jsonRoundTrip(finding) as unknown as JsonValue,
      },
    } as JsonValue,
  };
}

export function visualPlaytestFindingsFromMarkers(
  markers: readonly Marker[],
): VisualPlaytestFinding[] {
  const findings: VisualPlaytestFinding[] = [];
  for (const marker of markers) {
    const data = marker.data;
    if (!isRecord(data)) continue;
    const visualPlaytest = data.visualPlaytest;
    if (!isRecord(visualPlaytest) || visualPlaytest.type !== 'finding') continue;
    const finding = visualPlaytest.finding;
    if (!isRecord(finding) || typeof finding.title !== 'string') continue;
    findings.push(finding as unknown as VisualPlaytestFinding);
  }
  return findings;
}

function actionsFromDecision(decision: VisualPlaytestDecision): VisualPlaytestAction[] {
  if (decision.actions) return [...decision.actions];
  return decision.action ? [decision.action] : [];
}

function normalizeActionResult(
  result: VisualPlaytestActionResult | void,
  action: VisualPlaytestAction,
): VisualPlaytestActionResult {
  if (!result) return { ok: true, action };
  return result.action ? result : { ...result, action };
}

function actionResultForTrace(
  result: VisualPlaytestActionResult,
  full: boolean,
): VisualPlaytestActionResult {
  return {
    ok: result.ok,
    ...(result.action ? { action: result.action } : {}),
    ...(result.message !== undefined ? { message: result.message } : {}),
    ...(result.observation ? {
      observation: full
        ? cloneObservation(result.observation, { includeScreenshotDataUrl: true, includeSensitiveState: true })
        : redactVisualPlaytestObservation(result.observation),
    } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}

function stop(
  ok: boolean,
  stopReason: VisualPlaytestStopReason,
  stepsRun: number,
  trace: VisualPlaytestTraceEntry[],
  findings: VisualPlaytestFinding[],
  error?: VisualPlaytestErrorShape,
): VisualPlaytestLoopResult {
  return {
    ok,
    stopReason,
    stepsRun,
    trace,
    findings,
    ...(error ? { error } : {}),
  };
}

function cloneObservation(
  observation: VisualPlaytestObservation,
  options: VisualPlaytestRedactionOptions = { },
): VisualPlaytestObservation {
  return {
    ...(observation.tick !== undefined ? { tick: observation.tick } : {}),
    ...(observation.screenshot ? { screenshot: cloneScreenshot(observation.screenshot, options) } : {}),
    ...(observation.visibleText ? { visibleText: [...observation.visibleText] } : {}),
    ...(observation.controls ? { controls: observation.controls.map(cloneControl) } : {}),
    ...(observation.state ? { state: observation.state.flatMap((state) => cloneStateChannel(state, options)) } : {}),
    ...(observation.metadata !== undefined ? { metadata: jsonClone(observation.metadata) } : {}),
  };
}

function cloneScreenshot(
  screenshot: VisualPlaytestScreenshot,
  options: VisualPlaytestRedactionOptions,
): VisualPlaytestScreenshot {
  return {
    ...(screenshot.path !== undefined ? { path: screenshot.path } : {}),
    ...(options.includeScreenshotDataUrl && screenshot.dataUrl !== undefined ? { dataUrl: screenshot.dataUrl } : {}),
    ...(screenshot.mime !== undefined ? { mime: screenshot.mime } : {}),
    ...(screenshot.width !== undefined ? { width: screenshot.width } : {}),
    ...(screenshot.height !== undefined ? { height: screenshot.height } : {}),
    ...(screenshot.alt !== undefined ? { alt: screenshot.alt } : {}),
  };
}

function cloneControl(control: VisualPlaytestControl): VisualPlaytestControl {
  return {
    ...(control.id !== undefined ? { id: control.id } : {}),
    label: control.label,
    ...(control.actionKinds ? { actionKinds: [...control.actionKinds] } : {}),
    ...(control.target !== undefined ? { target: control.target } : {}),
    ...(control.bounds ? { bounds: { ...control.bounds } } : {}),
    ...(control.enabled !== undefined ? { enabled: control.enabled } : {}),
    ...(control.description !== undefined ? { description: control.description } : {}),
  };
}

function cloneStateChannel(
  channel: VisualPlaytestStateChannel,
  options: VisualPlaytestRedactionOptions,
): VisualPlaytestStateChannel[] {
  const redaction = channel.redaction ?? (channel.sensitive ? 'value' : 'none');
  if (redaction === 'channel' && !options.includeSensitiveState) return [];
  const includeValue =
    channel.value !== undefined &&
    options.includeStateValues !== false &&
    (options.includeSensitiveState || redaction === 'none');
  return [{
    label: channel.label,
    audience: channel.audience,
    ...(channel.summary !== undefined ? { summary: channel.summary } : {}),
    ...(includeValue ? { value: jsonClone(channel.value as JsonValue) } : {}),
    ...(channel.sensitive !== undefined ? { sensitive: channel.sensitive } : {}),
    ...(channel.redaction !== undefined ? { redaction: channel.redaction } : {}),
    ...(!includeValue && channel.value !== undefined ? { redacted: true as const } : {}),
  }];
}

function jsonClone<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorShape(e: unknown): VisualPlaytestErrorShape {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack ?? null };
  }
  return { name: 'NonError', message: String(e), stack: null };
}

function abortErrorShape(signal: AbortSignal): VisualPlaytestErrorShape {
  const reason: unknown = signal.reason;
  if (reason instanceof Error) {
    return { name: 'AbortError', message: reason.message, stack: reason.stack ?? null };
  }
  return { name: 'AbortError', message: reason === undefined ? 'aborted' : String(reason), stack: null };
}

function validateLoopOptions(config: VisualPlaytestLoopConfig): void {
  const budget = config.budget;
  if (budget?.maxWallClockMs !== undefined && !(Number.isFinite(budget.maxWallClockMs) && budget.maxWallClockMs > 0)) {
    throw invalidLoopOption('budget.maxWallClockMs', budget.maxWallClockMs, 'a positive finite number');
  }
  if (budget?.maxActionsPerStep !== undefined && !(Number.isInteger(budget.maxActionsPerStep) && budget.maxActionsPerStep >= 1)) {
    throw invalidLoopOption('budget.maxActionsPerStep', budget.maxActionsPerStep, 'a positive integer');
  }
  if (budget?.maxActionFailures !== undefined && !(Number.isInteger(budget.maxActionFailures) && budget.maxActionFailures >= 1)) {
    throw invalidLoopOption('budget.maxActionFailures', budget.maxActionFailures, 'a positive integer');
  }
  if (budget?.maxActionFailures !== undefined && config.onActionFailure !== 'continue') {
    throw invalidLoopOption('budget.maxActionFailures', budget.maxActionFailures, "used with onActionFailure: 'continue'");
  }
  if (config.agentObservation !== undefined && config.agentObservation !== 'raw' && config.agentObservation !== 'redacted') {
    throw invalidLoopOption('agentObservation', config.agentObservation, "'raw' or 'redacted'");
  }
  if (config.onActionFailure !== undefined && config.onActionFailure !== 'abort' && config.onActionFailure !== 'continue') {
    throw invalidLoopOption('onActionFailure', config.onActionFailure, "'abort' or 'continue'");
  }
}

function invalidLoopOption(field: string, value: unknown, expected: string): EngineRangeError {
  return new EngineRangeError(
    'visual_playtest_config_invalid',
    `${field} must be ${expected} (got ${String(value)})`,
    { details: { field, value: typeof value === 'number' && Number.isFinite(value) ? value : null } },
  );
}
