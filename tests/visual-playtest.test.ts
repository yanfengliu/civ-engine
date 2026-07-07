import { describe, expect, it } from 'vitest';
import {
  buildVisualPlaytestPrompt,
  getErrorCode,
  MemorySink,
  redactVisualPlaytestObservation,
  runVisualPlaytestLoop,
  SessionRecorder,
  visualPlaytestFindingToMarker,
  visualPlaytestFindingsFromMarkers,
  World,
  type VisualPlaytestAgent,
  type VisualPlaytestFinding,
  type VisualPlaytestHost,
  type VisualPlaytestObservation,
} from '../src/index.js';

const baseObservation = (): VisualPlaytestObservation => ({
  screenshot: {
    path: 'artifacts/step-0.png',
    dataUrl: 'data:image/png;base64,SECRET',
    mime: 'image/png',
    width: 800,
    height: 600,
  },
  visibleText: ['Gold: 10', 'Build Farm'],
  controls: [
    {
      id: 'build-farm',
      label: 'Build Farm',
      actionKinds: ['click'],
      bounds: { x: 12, y: 20, width: 90, height: 28 },
      enabled: true,
    },
  ],
  state: [
    {
      label: 'resource ledger',
      audience: 'agent',
      summary: 'gold=10 food=4',
      value: { gold: 10, food: 4 },
    },
    {
      label: 'review-only nav queue',
      audience: 'reviewer',
      summary: 'worker #1 path is blocked',
      value: { worker: 1, blocked: true },
    },
    {
      label: 'rng seed',
      audience: 'traceOnly',
      summary: 'deterministic replay seed',
      value: { seed: 'secret-seed' },
      sensitive: true,
    },
  ],
  metadata: { tick: 7 },
});

describe('runVisualPlaytestLoop', () => {
  it('rejects invalid maxSteps with a coded engine error', async () => {
    let code: string | null = null;
    try {
      await runVisualPlaytestLoop({
        host: { observe: () => baseObservation(), performAction: () => ({ ok: true }) },
        agent: { decide: () => ({ actions: [] }) },
        maxSteps: 0,
      });
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('visual_playtest_max_steps_invalid');
  });

  it('observes, asks the agent, performs multiple player actions, records findings, and stops explicitly', async () => {
    const calls: string[] = [];
    const host: VisualPlaytestHost = {
      observe: ({ step }) => {
        calls.push(`observe:${step}`);
        return { ...baseObservation(), metadata: { step } };
      },
      performAction: (action, { step, actionIndex }) => {
        calls.push(`action:${step}:${actionIndex}:${action.kind}`);
        return { ok: true, message: `performed ${action.kind}` };
      },
      annotate: (finding, { step }) => {
        calls.push(`annotate:${step}:${finding.title}`);
      },
    };
    const agent: VisualPlaytestAgent = {
      decide: ({ step }) => {
        calls.push(`decide:${step}`);
        if (step === 0) {
          return {
            actions: [
              { kind: 'click', target: 'build-farm', reason: 'test the visible button' },
              { kind: 'wait', durationMs: 50, reason: 'let the UI respond' },
            ],
            findings: [
              {
                title: 'Button text is visible',
                severity: 'info',
                category: 'visual',
                observed: 'The Build Farm button is visible and enabled.',
                evidence: { step, screenshotPath: 'artifacts/step-0.png' },
              },
            ],
          };
        }
        return { actions: [{ kind: 'stop', reason: 'enough evidence' }] };
      },
    };

    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 3,
      promptMode: 'oracleAssisted',
    });

    expect(result.ok).toBe(true);
    expect(result.stopReason).toBe('agentStop');
    expect(result.stepsRun).toBe(2);
    expect(result.findings.map((f) => f.title)).toEqual(['Button text is visible']);
    expect(result.trace.map((entry) => entry.action?.kind)).toEqual(['click', 'wait', 'stop']);
    expect(calls).toEqual([
      'observe:0',
      'decide:0',
      'annotate:0:Button text is visible',
      'action:0:0:click',
      'action:0:1:wait',
      'observe:1',
      'decide:1',
    ]);
    expect(result.trace[0].observation.screenshot?.dataUrl).toBeUndefined();
    expect(result.trace[0].observation.state?.find((s) => s.label === 'rng seed')?.value).toBeUndefined();
  });

  it('stops with actionFailed when the host rejects a player action', async () => {
    const host: VisualPlaytestHost = {
      observe: () => baseObservation(),
      performAction: (action) => ({ ok: false, action, message: 'button is disabled' }),
    };
    const agent: VisualPlaytestAgent = {
      decide: () => ({ actions: [{ kind: 'click', target: 'build-farm' }] }),
    };

    const result = await runVisualPlaytestLoop({ host, agent, maxSteps: 3 });

    expect(result.ok).toBe(false);
    expect(result.stopReason).toBe('actionFailed');
    expect(result.stepsRun).toBe(1);
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0].result?.ok).toBe(false);
    expect(result.trace[0].result?.message).toBe('button is disabled');
  });

  it('reports host and agent errors without throwing the outer loop promise', async () => {
    const observeError = await runVisualPlaytestLoop({
      host: {
        observe: () => {
          throw new Error('canvas unavailable');
        },
        performAction: () => ({ ok: true }),
      },
      agent: { decide: () => ({ actions: [] }) },
      maxSteps: 1,
    });
    expect(observeError.ok).toBe(false);
    expect(observeError.stopReason).toBe('hostError');
    expect(observeError.error?.message).toBe('canvas unavailable');

    const agentError = await runVisualPlaytestLoop({
      host: { observe: () => baseObservation(), performAction: () => ({ ok: true }) },
      agent: {
        decide: () => {
          throw new Error('model quota exhausted');
        },
      },
      maxSteps: 1,
    });
    expect(agentError.ok).toBe(false);
    expect(agentError.stopReason).toBe('agentError');
    expect(agentError.error?.message).toBe('model quota exhausted');
  });

  it('stops at maxSteps when the agent keeps acting', async () => {
    let actions = 0;
    const result = await runVisualPlaytestLoop({
      host: {
        observe: () => baseObservation(),
        performAction: () => {
          actions++;
          return { ok: true };
        },
      },
      agent: { decide: () => ({ actions: [{ kind: 'wait', durationMs: 1 }] }) },
      maxSteps: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.stopReason).toBe('maxSteps');
    expect(result.stepsRun).toBe(2);
    expect(actions).toBe(2);
  });
});

describe('visual playtest hidden state, prompts, and marker bridge', () => {
  it('builds player-blind and oracle-assisted prompts with explicit hidden-state audience rules', () => {
    const playerBlind = buildVisualPlaytestPrompt({
      objective: 'Find usability bugs.',
      observation: baseObservation(),
      mode: 'playerBlind',
    });
    expect(playerBlind).toContain('Find usability bugs.');
    expect(playerBlind).toContain('Gold: 10');
    expect(playerBlind).toContain('Build Farm');
    expect(playerBlind).not.toContain('resource ledger');
    expect(playerBlind).not.toContain('review-only nav queue');
    expect(playerBlind).not.toContain('secret-seed');

    const oracle = buildVisualPlaytestPrompt({
      observation: baseObservation(),
      mode: 'oracleAssisted',
    });
    expect(oracle).toContain('resource ledger');
    expect(oracle).toContain('"gold":10');
    expect(oracle).not.toContain('review-only nav queue');
    expect(oracle).not.toContain('secret-seed');
  });

  it('redacts screenshot data URLs and sensitive hidden-state values by default', () => {
    const observation = baseObservation();
    const redacted = redactVisualPlaytestObservation(observation);

    expect(redacted.screenshot?.path).toBe('artifacts/step-0.png');
    expect(redacted.screenshot?.dataUrl).toBeUndefined();
    expect(redacted.state?.find((s) => s.label === 'resource ledger')?.value).toEqual({
      gold: 10,
      food: 4,
    });
    const seed = redacted.state?.find((s) => s.label === 'rng seed');
    expect(seed?.value).toBeUndefined();
    expect(seed?.redacted).toBe(true);
    expect(observation.screenshot?.dataUrl).toBe('data:image/png;base64,SECRET');
  });

  it('honors explicit state-channel redaction metadata', () => {
    const observation: VisualPlaytestObservation = {
      state: [
        { label: 'raw economy', audience: 'agent', value: { gold: 10 }, redaction: 'value' },
        { label: 'full fog map', audience: 'agent', value: { cells: [1, 2, 3] }, redaction: 'channel' },
        { label: 'sensitive but allowed', audience: 'agent', value: { seed: 'debug' }, sensitive: true, redaction: 'none' },
      ],
    };

    const redacted = redactVisualPlaytestObservation(observation);
    expect(redacted.state?.map((s) => s.label)).toEqual(['raw economy', 'sensitive but allowed']);
    expect(redacted.state?.find((s) => s.label === 'raw economy')?.value).toBeUndefined();
    expect(redacted.state?.find((s) => s.label === 'raw economy')?.redacted).toBe(true);
    expect(redacted.state?.find((s) => s.label === 'sensitive but allowed')?.value).toEqual({ seed: 'debug' });

    const prompt = buildVisualPlaytestPrompt({ observation, mode: 'oracleAssisted' });
    expect(prompt).toContain('raw economy');
    expect(prompt).not.toContain('"gold":10');
    expect(prompt).not.toContain('full fog map');
    expect(prompt).toContain('"seed":"debug"');
  });

  it('redacts nested action-result observations in safe traces without redacting host feedback', async () => {
    let nextObserveSawRawResult = false;
    const result = await runVisualPlaytestLoop({
      host: {
        observe: ({ step, previousActionResult }) => {
          if (step === 1) {
            nextObserveSawRawResult =
              previousActionResult?.observation?.screenshot?.dataUrl === 'data:image/png;base64,SECRET';
          }
          return baseObservation();
        },
        performAction: () => ({ ok: true, observation: baseObservation() }),
      },
      agent: {
        decide: ({ step }) => ({
          actions: step === 0 ? [{ kind: 'wait', durationMs: 1 }] : [{ kind: 'stop', reason: 'done' }],
        }),
      },
      maxSteps: 2,
    });

    expect(nextObserveSawRawResult).toBe(true);
    expect(result.trace[0].result?.observation?.screenshot?.dataUrl).toBeUndefined();
    expect(result.trace[0].result?.observation?.state?.find((s) => s.label === 'rng seed')?.value).toBeUndefined();
  });

  it('preserves full observations when full trace capture is explicitly requested', async () => {
    const result = await runVisualPlaytestLoop({
      host: {
        observe: () => baseObservation(),
        performAction: () => ({ ok: true, observation: baseObservation() }),
      },
      agent: {
        decide: ({ step }) => ({
          actions: step === 0 ? [{ kind: 'wait', durationMs: 1 }] : [{ kind: 'stop', reason: 'done' }],
        }),
      },
      maxSteps: 2,
      traceObservation: 'full',
    });

    expect(result.trace[0].observation.screenshot?.dataUrl).toBe('data:image/png;base64,SECRET');
    expect(result.trace[0].observation.state?.find((s) => s.label === 'rng seed')?.value).toEqual({
      seed: 'secret-seed',
    });
    expect(result.trace[0].result?.observation?.screenshot?.dataUrl).toBe('data:image/png;base64,SECRET');
  });

  it('converts visual findings to session markers and recovers them from recorded bundles', () => {
    const world = new World({
      gridWidth: 8,
      gridHeight: 8,
      tps: 60,
      positionKey: 'position',
    });
    const sink = new MemorySink();
    const recorder = new SessionRecorder({ world, sink });
    recorder.connect();
    const finding: VisualPlaytestFinding = {
      title: 'Worker path is blocked',
      severity: 'high',
      category: 'rules',
      area: 'worker controls',
      observed: 'The worker accepted the move command but stayed still.',
      expected: 'The worker should either move or reject the command.',
      suggestion: 'Expose blocked-path feedback near the cursor.',
      evidence: { step: 2, tick: world.tick, screenshotPath: 'artifacts/step-2.png' },
      refs: { tickRange: { from: world.tick, to: world.tick } },
    };

    const markerId = recorder.addMarker(visualPlaytestFindingToMarker(finding));
    recorder.disconnect();

    const bundle = recorder.toBundle();
    expect(bundle.markers).toHaveLength(1);
    expect(bundle.markers[0].id).toBe(markerId);
    expect(bundle.markers[0].kind).toBe('annotation');
    expect(bundle.markers[0].text).toContain('[high/rules] Worker path is blocked');
    expect(bundle.markers[0].data).toMatchObject({
      visualPlaytest: { type: 'finding', finding: { title: 'Worker path is blocked' } },
    });
    expect(visualPlaytestFindingsFromMarkers(bundle.markers)).toEqual([finding]);
  });
});
