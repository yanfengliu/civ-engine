import { describe, expect, it } from 'vitest';
import {
  buildVisualPlaytestPrompt,
  buildVisualPlaytestPromptParts,
  getErrorCode,
  runVisualPlaytestLoop,
  type VisualPlaytestAgent,
  type VisualPlaytestHost,
  type VisualPlaytestObservation,
} from '../src/index.js';

const richObservation = (): VisualPlaytestObservation => ({
  tick: 42,
  screenshot: {
    path: 'artifacts/step-0.png',
    dataUrl: 'data:image/png;base64,PIXELS',
    mime: 'image/png',
    width: 800,
    height: 600,
  },
  visibleText: ['Gold: 10', 'Build Farm'],
  controls: [
    { id: 'build-farm', label: 'Build Farm', actionKinds: ['click'], enabled: true },
  ],
  state: [
    { label: 'resource ledger', audience: 'agent', summary: 'gold=10', value: { gold: 10 } },
    { label: 'agent secret', audience: 'agent', summary: 'debug seed', value: { seed: 'S' }, sensitive: true },
    { label: 'review queue', audience: 'reviewer', summary: 'blocked paths', value: { blocked: 1 } },
    { label: 'trace seed', audience: 'traceOnly', summary: 'replay seed', value: { seed: 'T' } },
  ],
  metadata: { scenario: 'smoke' },
});

const clickAgent = (): VisualPlaytestAgent => ({
  decide: () => ({ actions: [{ kind: 'click', target: 'build-farm' }] }),
});

const okHost = (onAction?: () => void): VisualPlaytestHost => ({
  observe: () => richObservation(),
  performAction: () => {
    onAction?.();
    return { ok: true };
  },
});

describe('runVisualPlaytestLoop budgets and abort', () => {
  it('stops with budgetExceeded when maxWallClockMs elapses during observe', async () => {
    let t = 0;
    let observes = 0;
    const host: VisualPlaytestHost = {
      observe: () => {
        observes += 1;
        t += 60;
        return richObservation();
      },
      performAction: () => ({ ok: true }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent: clickAgent(),
      maxSteps: 10,
      budget: { maxWallClockMs: 100 },
      now: () => t,
    });
    expect(result.stopReason).toBe('budgetExceeded');
    expect(result.ok).toBe(true);
    expect(result.stepsRun).toBe(1);
    expect(observes).toBe(2);
    expect(result.trace.filter((entry) => entry.action?.kind === 'click')).toHaveLength(1);
  });

  it('continues when elapsed wall-clock exactly equals the budget', async () => {
    let t = 0;
    let observes = 0;
    const host: VisualPlaytestHost = {
      observe: () => {
        observes += 1;
        t += 50;
        return richObservation();
      },
      performAction: () => ({ ok: true }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent: clickAgent(),
      maxSteps: 3,
      budget: { maxWallClockMs: 100 },
      now: () => t,
    });
    expect(result.stopReason).toBe('budgetExceeded');
    expect(result.stepsRun).toBe(2);
    expect(observes).toBe(3);
  });

  it('never reads the clock when no wall-clock budget is set', async () => {
    const result = await runVisualPlaytestLoop({
      host: okHost(),
      agent: clickAgent(),
      maxSteps: 2,
      now: () => {
        throw new Error('clock must not be read');
      },
    });
    expect(result.stopReason).toBe('maxSteps');
    expect(result.ok).toBe(true);
  });

  it('stops with budgetExceeded between actions inside a step', async () => {
    let t = 0;
    const host: VisualPlaytestHost = {
      observe: () => richObservation(),
      performAction: () => {
        t += 60;
        return { ok: true };
      },
    };
    const agent: VisualPlaytestAgent = {
      decide: () => ({
        actions: [
          { kind: 'click', target: 'build-farm' },
          { kind: 'click', target: 'build-farm' },
          { kind: 'click', target: 'build-farm' },
        ],
      }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 5,
      budget: { maxWallClockMs: 100 },
      now: () => t,
    });
    expect(result.stopReason).toBe('budgetExceeded');
    expect(result.ok).toBe(true);
    expect(result.stepsRun).toBe(1);
    expect(result.trace.filter((entry) => entry.result)).toHaveLength(2);
  });

  it('caps actions per step without stopping the loop', async () => {
    let performed = 0;
    const host = okHost(() => {
      performed += 1;
    });
    const agent: VisualPlaytestAgent = {
      decide: () => ({
        actions: [
          { kind: 'click', target: 'build-farm' },
          { kind: 'wait', durationMs: 5 },
          { kind: 'wait', durationMs: 5 },
          { kind: 'wait', durationMs: 5 },
        ],
      }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 2,
      budget: { maxActionsPerStep: 2 },
    });
    expect(result.stopReason).toBe('maxSteps');
    expect(result.ok).toBe(true);
    expect(performed).toBe(4);
    expect(result.trace).toHaveLength(4);
    expect(result.trace[0]?.decision?.actions).toHaveLength(4);
  });

  it('honors a stop action truncated off by maxActionsPerStep', async () => {
    let performed = 0;
    const host = okHost(() => {
      performed += 1;
    });
    const agent: VisualPlaytestAgent = {
      decide: () => ({
        actions: [
          { kind: 'click', target: 'build-farm' },
          { kind: 'stop', reason: 'route finished' },
        ],
      }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 5,
      budget: { maxActionsPerStep: 1 },
    });
    expect(result.stopReason).toBe('agentStop');
    expect(result.ok).toBe(true);
    expect(performed).toBe(1);
    expect(result.trace.map((entry) => entry.action?.kind)).toEqual(['click', 'stop']);
    expect(result.trace[1]?.result?.message).toBe('route finished');
  });

  it('prioritizes aborted over budgetExceeded when both trip', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runVisualPlaytestLoop({
      host: okHost(),
      agent: clickAgent(),
      maxSteps: 3,
      signal: controller.signal,
      budget: { maxWallClockMs: 1 },
      now: (() => {
        let t = 0;
        return () => (t += 1000);
      })(),
    });
    expect(result.stopReason).toBe('aborted');
    expect(result.ok).toBe(false);
  });

  it('stops with aborted when the signal aborts during decide', async () => {
    const controller = new AbortController();
    const agent: VisualPlaytestAgent = {
      decide: () => {
        controller.abort(new Error('operator cancelled'));
        return { actions: [{ kind: 'click', target: 'build-farm' }] };
      },
    };
    const result = await runVisualPlaytestLoop({
      host: okHost(),
      agent,
      maxSteps: 5,
      signal: controller.signal,
    });
    expect(result.stopReason).toBe('aborted');
    expect(result.ok).toBe(false);
    expect(result.error?.name).toBe('AbortError');
    expect(result.trace.filter((entry) => entry.result)).toHaveLength(0);
  });

  it('stops immediately on an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    let observes = 0;
    const host: VisualPlaytestHost = {
      observe: () => {
        observes += 1;
        return richObservation();
      },
      performAction: () => ({ ok: true }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent: clickAgent(),
      maxSteps: 5,
      signal: controller.signal,
    });
    expect(result.stopReason).toBe('aborted');
    expect(result.ok).toBe(false);
    expect(result.stepsRun).toBe(0);
    expect(observes).toBe(0);
  });

  it('rejects invalid budget values with a coded engine error', async () => {
    let code: string | null = null;
    try {
      await runVisualPlaytestLoop({
        host: okHost(),
        agent: clickAgent(),
        maxSteps: 3,
        budget: { maxWallClockMs: -1 },
      });
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('visual_playtest_config_invalid');
  });

  it('rejects maxActionFailures without onActionFailure continue', async () => {
    let code: string | null = null;
    try {
      await runVisualPlaytestLoop({
        host: okHost(),
        agent: clickAgent(),
        maxSteps: 3,
        budget: { maxActionFailures: 2 },
      });
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('visual_playtest_config_invalid');
  });
});

describe('runVisualPlaytestLoop action-failure policy', () => {
  it('continues past a failed action, skips the rest of the step, and reports the failure to the next observe', async () => {
    const observedPrevious: Array<boolean | undefined> = [];
    let performed = 0;
    const host: VisualPlaytestHost = {
      observe: ({ previousActionResult }) => {
        observedPrevious.push(previousActionResult?.ok);
        return richObservation();
      },
      performAction: () => {
        performed += 1;
        if (performed === 1) return { ok: false, message: 'button disabled' };
        return { ok: true };
      },
    };
    const agent: VisualPlaytestAgent = {
      decide: ({ step }) => {
        if (step === 0) {
          return {
            actions: [
              { kind: 'click', target: 'build-farm' },
              { kind: 'wait', durationMs: 5 },
            ],
          };
        }
        return { actions: [{ kind: 'stop', reason: 'done' }] };
      },
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 5,
      onActionFailure: 'continue',
    });
    expect(result.stopReason).toBe('agentStop');
    expect(result.ok).toBe(true);
    expect(performed).toBe(1);
    expect(observedPrevious).toEqual([undefined, false]);
    const failedEntry = result.trace.find((entry) => entry.result?.ok === false);
    expect(failedEntry?.result?.message).toBe('button disabled');
  });

  it('continues past a throwing host action and reports the synthetic failure to the next observe', async () => {
    let performed = 0;
    const previousResults: Array<string | undefined> = [];
    const host: VisualPlaytestHost = {
      observe: ({ previousActionResult }) => {
        previousResults.push(previousActionResult?.error?.message);
        return richObservation();
      },
      performAction: () => {
        performed += 1;
        if (performed === 1) throw new Error('selector vanished');
        return { ok: true };
      },
    };
    const agent: VisualPlaytestAgent = {
      decide: ({ step }) =>
        step === 0
          ? { actions: [{ kind: 'click', target: 'gone' }] }
          : { actions: [{ kind: 'stop', reason: 'done' }] },
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 5,
      onActionFailure: 'continue',
    });
    expect(result.stopReason).toBe('agentStop');
    expect(result.ok).toBe(true);
    expect(previousResults).toEqual([undefined, 'selector vanished']);
    const errorEntry = result.trace.find((entry) => entry.error);
    expect(errorEntry?.error?.message).toBe('selector vanished');
  });

  it('stops with actionFailed once failures exceed maxActionFailures', async () => {
    const host: VisualPlaytestHost = {
      observe: () => richObservation(),
      performAction: () => ({ ok: false, message: 'always broken' }),
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent: clickAgent(),
      maxSteps: 10,
      onActionFailure: 'continue',
      budget: { maxActionFailures: 1 },
    });
    expect(result.stopReason).toBe('actionFailed');
    expect(result.ok).toBe(false);
    expect(result.stepsRun).toBe(2);
  });

  it('counts thrown actions toward maxActionFailures', async () => {
    const host: VisualPlaytestHost = {
      observe: () => richObservation(),
      performAction: () => {
        throw new Error('always throwing');
      },
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent: clickAgent(),
      maxSteps: 10,
      onActionFailure: 'continue',
      budget: { maxActionFailures: 1 },
    });
    expect(result.stopReason).toBe('actionFailed');
    expect(result.ok).toBe(false);
    expect(result.stepsRun).toBe(2);
    expect(result.error?.message).toBe('always throwing');
  });
});

describe('tick and prompt parts', () => {
  it('surfaces the observation tick in the string prompt', () => {
    const prompt = buildVisualPlaytestPrompt({ observation: richObservation(), mode: 'playerBlind' });
    expect(prompt).toContain('Simulation tick: 42');
  });

  it('keeps the tick on trace observations', async () => {
    const result = await runVisualPlaytestLoop({
      host: okHost(),
      agent: clickAgent(),
      maxSteps: 1,
    });
    expect(result.trace[0]?.observation.tick).toBe(42);
  });

  it('builds typed prompt parts with a single image part carrying the screenshot payload', () => {
    const parts = buildVisualPlaytestPromptParts({ observation: richObservation(), mode: 'oracleAssisted' });
    const images = parts.filter((part) => part.type === 'image');
    expect(images).toHaveLength(1);
    const image = images[0];
    if (image.type !== 'image') throw new Error('unreachable');
    expect(image.source.dataUrl).toBe('data:image/png;base64,PIXELS');
    expect(image.source.path).toBe('artifacts/step-0.png');
    expect(image.source.mime).toBe('image/png');
    expect(image.source.width).toBe(800);
    const text = parts.filter((part) => part.type === 'text').map((part) => (part.type === 'text' ? part.text : '')).join('\n');
    expect(text).toContain('Mode: oracleAssisted.');
    expect(text).toContain('Simulation tick: 42');
    expect(text).toContain('- Gold: 10');
    expect(text).toContain('resource ledger');
    expect(text).not.toContain('review queue');
    expect(text).not.toContain('data:image/png;base64,PIXELS');
  });

  it('emits no image part when the observation has no screenshot', () => {
    const observation = { ...richObservation() };
    delete (observation as { screenshot?: unknown }).screenshot;
    const parts = buildVisualPlaytestPromptParts({ observation, mode: 'playerBlind' });
    expect(parts.every((part) => part.type === 'text')).toBe(true);
  });
});
