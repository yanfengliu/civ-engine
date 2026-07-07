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
  VisualPlaytestPromptInput,
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
  VisualPlaytestRect,
  VisualPlaytestRedactionOptions,
  VisualPlaytestScreenshot,
  VisualPlaytestStateAudience,
  VisualPlaytestStateChannel,
  VisualPlaytestStopReason,
  VisualPlaytestTraceEntry,
  VisualPlaytestViewport,
} from './visual-playtest-types.js';

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

  const mode = config.promptMode ?? 'playerBlind';
  const trace: VisualPlaytestTraceEntry[] = [];
  const findings: VisualPlaytestFinding[] = [];
  let previousActionResult: VisualPlaytestActionResult | undefined;
  let stepsRun = 0;

  for (let step = 0; step < config.maxSteps; step++) {
    let observation: VisualPlaytestObservation;
    try {
      observation = await config.host.observe({ step, previousActionResult });
    } catch (e) {
      return stop(false, 'hostError', stepsRun, trace, findings, errorShape(e));
    }

    let decision: VisualPlaytestDecision;
    try {
      decision = await config.agent.decide({ step, maxSteps: config.maxSteps, mode, observation, trace });
    } catch (e) {
      return stop(false, 'agentError', stepsRun, trace, findings, errorShape(e));
    }

    const stepFindings = [...(decision.findings ?? [])];
    if (stepFindings.length > 0) {
      findings.push(...stepFindings);
      if (config.host.annotate) {
        try {
          for (const finding of stepFindings) {
            await config.host.annotate(finding, { step, observation });
          }
        } catch (e) {
          return stop(false, 'hostError', stepsRun, trace, findings, errorShape(e));
        }
      }
    }

    const actions = actionsFromDecision(decision);
    if (actions.length === 0) {
      stepsRun = step + 1;
      return stop(true, decision.stopReason ? 'agentStop' : 'noActions', stepsRun, trace, findings);
    }

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const action = actions[actionIndex];
      const observationForTrace =
        config.traceObservation === 'full'
          ? cloneObservation(observation, { includeScreenshotDataUrl: true, includeSensitiveState: true })
          : redactVisualPlaytestObservation(observation);
      if (action.kind === 'stop') {
        trace.push({
          step,
          actionIndex,
          observation: observationForTrace,
          decision,
          action,
          findings: stepFindings,
          result: { ok: true, action, message: action.reason ?? decision.stopReason ?? 'agent stopped' },
        });
        stepsRun = step + 1;
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
        trace.push({ step, actionIndex, observation: observationForTrace, decision, action, error });
        stepsRun = step + 1;
        return stop(false, 'actionFailed', stepsRun, trace, findings, error);
      }

      trace.push({
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
        stepsRun = step + 1;
        return stop(false, 'actionFailed', stepsRun, trace, findings, result.error);
      }
    }
    stepsRun = step + 1;
  }

  return stop(true, 'maxSteps', stepsRun, trace, findings);
}

export function buildVisualPlaytestPrompt(input: VisualPlaytestPromptInput): string {
  const mode = input.mode ?? 'playerBlind';
  const lines: string[] = [
    'You are playtesting a browser game through player-surface evidence.',
    `Mode: ${mode}.`,
  ];
  if (input.objective) lines.push(`Objective: ${input.objective}`);
  if (input.maxActions !== undefined) lines.push(`Maximum actions to return: ${input.maxActions}.`);

  const { observation } = input;
  if (observation.screenshot) {
    lines.push(`Screenshot: ${formatScreenshot(observation.screenshot)}`);
  }
  if (observation.visibleText?.length) {
    lines.push('Visible text:');
    for (const text of observation.visibleText) lines.push(`- ${text}`);
  }
  if (observation.controls?.length) {
    lines.push('Available controls:');
    for (const control of observation.controls) lines.push(`- ${formatControl(control)}`);
  }
  if (mode === 'oracleAssisted') {
    const channels = observation.state?.filter((channel) =>
      channel.audience === 'agent' && channel.redaction !== 'channel') ?? [];
    if (channels.length) {
      lines.push('Agent-visible hidden state:');
      for (const channel of channels) lines.push(`- ${formatStateChannelForPrompt(channel)}`);
    }
  }
  lines.push('Return only actions a player could take unless the host exposes a hidden-state diagnostic.');
  return lines.join('\n');
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

function formatScreenshot(screenshot: VisualPlaytestScreenshot): string {
  const source = screenshot.path ?? (screenshot.dataUrl ? '[inline data URL available]' : '[not provided]');
  const size = screenshot.width !== undefined && screenshot.height !== undefined
    ? ` ${screenshot.width}x${screenshot.height}`
    : '';
  const mime = screenshot.mime ? ` ${screenshot.mime}` : '';
  return `${source}${size}${mime}`.trim();
}

function formatControl(control: VisualPlaytestControl): string {
  const id = control.id ? `${control.id}: ` : '';
  const actions = control.actionKinds?.length ? ` actions=${control.actionKinds.join('|')}` : '';
  const enabled = control.enabled === false ? ' disabled' : '';
  const bounds = control.bounds
    ? ` bounds=${control.bounds.x},${control.bounds.y},${control.bounds.width},${control.bounds.height}`
    : '';
  return `${id}${control.label}${actions}${enabled}${bounds}`;
}

function formatStateChannelForPrompt(channel: VisualPlaytestStateChannel): string {
  const parts = [channel.label];
  const redaction = channel.redaction ?? (channel.sensitive ? 'value' : 'none');
  if (channel.summary) parts.push(channel.summary);
  if (channel.value !== undefined && redaction === 'none') parts.push(JSON.stringify(channel.value));
  if (channel.value !== undefined && redaction !== 'none') parts.push('[value redacted]');
  return parts.join(' - ');
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
