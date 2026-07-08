import { describe, expect, it } from 'vitest';
import {
  buildVisualPlaytestPrompt,
  buildVisualPlaytestPromptParts,
  observationForAgent,
  runVisualPlaytestLoop,
  type VisualPlaytestAgent,
  type VisualPlaytestHost,
  type VisualPlaytestObservation,
  type VisualPlaytestTraceEntry,
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
  controls: [{ id: 'build-farm', label: 'Build Farm', actionKinds: ['click'], enabled: true }],
  state: [
    { label: 'resource ledger', audience: 'agent', summary: 'gold=10', value: { gold: 10 } },
    { label: 'agent secret', audience: 'agent', summary: 'debug seed', value: { seed: 'S' }, sensitive: true },
    { label: 'review queue', audience: 'reviewer', summary: 'blocked paths', value: { blocked: 1 } },
    { label: 'trace seed', audience: 'traceOnly', summary: 'replay seed', value: { seed: 'T' } },
  ],
  metadata: { scenario: 'smoke' },
});

const clickHost = (): VisualPlaytestHost => ({
  observe: () => richObservation(),
  performAction: () => ({ ok: true }),
});

describe('agent observation redaction boundary', () => {
  it('hands the agent a redacted observation when agentObservation is redacted (oracleAssisted)', async () => {
    let seen: VisualPlaytestObservation | undefined;
    const agent: VisualPlaytestAgent = {
      decide: ({ observation }) => {
        seen = observation;
        return { actions: [] };
      },
    };
    await runVisualPlaytestLoop({
      host: clickHost(),
      agent,
      maxSteps: 1,
      promptMode: 'oracleAssisted',
      agentObservation: 'redacted',
    });
    expect(seen?.screenshot?.dataUrl).toBe('data:image/png;base64,PIXELS');
    const labels = (seen?.state ?? []).map((channel) => channel.label);
    expect(labels).toEqual(['resource ledger', 'agent secret']);
    expect(seen?.state?.find((channel) => channel.label === 'resource ledger')?.value).toEqual({ gold: 10 });
    const secret = seen?.state?.find((channel) => channel.label === 'agent secret');
    expect(secret?.value).toBeUndefined();
    expect(secret?.redacted).toBe(true);
    expect(seen?.tick).toBe(42);
  });

  it('hands the agent no hidden state at all when agentObservation is redacted (playerBlind)', async () => {
    let seen: VisualPlaytestObservation | undefined;
    const agent: VisualPlaytestAgent = {
      decide: ({ observation }) => {
        seen = observation;
        return { actions: [] };
      },
    };
    await runVisualPlaytestLoop({
      host: clickHost(),
      agent,
      maxSteps: 1,
      agentObservation: 'redacted',
    });
    expect(seen?.state).toBeUndefined();
    expect(seen?.screenshot?.dataUrl).toBe('data:image/png;base64,PIXELS');
    expect(seen?.visibleText).toEqual(['Gold: 10', 'Build Farm']);
  });

  it('keeps the raw observation at the agent boundary by default', async () => {
    let seen: VisualPlaytestObservation | undefined;
    const agent: VisualPlaytestAgent = {
      decide: ({ observation }) => {
        seen = observation;
        return { actions: [] };
      },
    };
    await runVisualPlaytestLoop({ host: clickHost(), agent, maxSteps: 1 });
    expect(seen?.state?.map((channel) => channel.label)).toContain('review queue');
    expect(seen?.screenshot?.dataUrl).toBe('data:image/png;base64,PIXELS');
  });

  it('observationForAgent filters audiences per mode and keeps the screenshot', () => {
    const oracle = observationForAgent(richObservation(), 'oracleAssisted');
    expect(oracle.state?.map((channel) => channel.label)).toEqual(['resource ledger', 'agent secret']);
    expect(oracle.screenshot?.dataUrl).toBe('data:image/png;base64,PIXELS');
    expect(oracle.tick).toBe(42);
    expect(oracle.metadata).toEqual({ scenario: 'smoke' });

    const blind = observationForAgent(richObservation(), 'playerBlind');
    expect(blind.state).toBeUndefined();
    expect(blind.controls?.map((control) => control.label)).toEqual(['Build Farm']);
  });
});

describe('agent trace wall under agentObservation redacted', () => {
  it('filters prior trace observations handed to the agent (playerBlind) while the result trace keeps reviewer channels', async () => {
    const tracesSeen: Array<readonly VisualPlaytestTraceEntry[]> = [];
    const agent: VisualPlaytestAgent = {
      decide: ({ step, trace }) => {
        tracesSeen.push(trace.map((entry) => ({ ...entry })));
        return step === 0
          ? { actions: [{ kind: 'click', target: 'build-farm' }] }
          : { actions: [{ kind: 'stop', reason: 'done' }] };
      },
    };
    const result = await runVisualPlaytestLoop({
      host: clickHost(),
      agent,
      maxSteps: 3,
      agentObservation: 'redacted',
    });
    expect(result.stopReason).toBe('agentStop');
    expect(tracesSeen[1]).toHaveLength(1);
    const agentSeenObservation = tracesSeen[1][0].observation;
    expect(agentSeenObservation.state).toBeUndefined();
    expect(agentSeenObservation.tick).toBe(42);
    const resultTraceState = result.trace[0]?.observation.state ?? [];
    expect(resultTraceState.map((channel) => channel.label)).toContain('review queue');
  });

  it('audience-filters prior full-capture trace observations handed to the agent (oracleAssisted)', async () => {
    const tracesSeen: Array<readonly VisualPlaytestTraceEntry[]> = [];
    const agent: VisualPlaytestAgent = {
      decide: ({ step, trace }) => {
        tracesSeen.push(trace.map((entry) => ({ ...entry })));
        return step === 0
          ? { actions: [{ kind: 'click', target: 'build-farm' }] }
          : { actions: [{ kind: 'stop', reason: 'done' }] };
      },
    };
    const result = await runVisualPlaytestLoop({
      host: clickHost(),
      agent,
      maxSteps: 3,
      promptMode: 'oracleAssisted',
      agentObservation: 'redacted',
      traceObservation: 'full',
    });
    const agentSeen = tracesSeen[1][0].observation;
    expect(agentSeen.state?.map((channel) => channel.label)).toEqual(['resource ledger', 'agent secret']);
    expect(agentSeen.state?.find((channel) => channel.label === 'agent secret')?.value).toBeUndefined();
    expect(agentSeen.screenshot?.dataUrl).toBe('data:image/png;base64,PIXELS');
    const resultTrace = result.trace[0]?.observation;
    expect(resultTrace?.state?.find((channel) => channel.label === 'trace seed')?.value).toEqual({ seed: 'T' });
  });
});

describe('abort interplay with annotate', () => {
  it('skips annotate and reports aborted when the signal aborts during decide, still collecting findings', async () => {
    const controller = new AbortController();
    let annotateCalls = 0;
    const host: VisualPlaytestHost = {
      observe: () => richObservation(),
      performAction: () => ({ ok: true }),
      annotate: () => {
        annotateCalls += 1;
        throw new Error('browser already closed');
      },
    };
    const agent: VisualPlaytestAgent = {
      decide: () => {
        controller.abort(new Error('operator teardown'));
        return {
          actions: [{ kind: 'click', target: 'build-farm' }],
          findings: [
            {
              title: 'final finding',
              severity: 'info',
              category: 'visual',
              observed: 'captured right before teardown',
            },
          ],
        };
      },
    };
    const result = await runVisualPlaytestLoop({
      host,
      agent,
      maxSteps: 3,
      signal: controller.signal,
    });
    expect(result.stopReason).toBe('aborted');
    expect(result.ok).toBe(false);
    expect(result.error?.name).toBe('AbortError');
    expect(annotateCalls).toBe(0);
    expect(result.findings.map((finding) => finding.title)).toEqual(['final finding']);
  });
});

describe('prompt parts parity with the string prompt', () => {
  it('text parts match the string prompt with the screenshot line replaced by the image part', () => {
    const input = { observation: richObservation(), mode: 'oracleAssisted' as const, objective: 'smoke the build' };
    const prompt = buildVisualPlaytestPrompt(input);
    const promptWithoutScreenshotLine = prompt
      .split('\n')
      .filter((line) => !line.startsWith('Screenshot: '))
      .join('\n');
    const parts = buildVisualPlaytestPromptParts(input);
    const textJoined = parts
      .filter((part) => part.type === 'text')
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('\n');
    expect(textJoined).toBe(promptWithoutScreenshotLine);
    expect(parts.filter((part) => part.type === 'image')).toHaveLength(1);
  });

  it('falls back to the text descriptor for a screenshot without path or data URL', () => {
    const observation = { ...richObservation(), screenshot: { mime: 'image/png', width: 800, height: 600 } };
    const parts = buildVisualPlaytestPromptParts({ observation, mode: 'playerBlind' });
    expect(parts.every((part) => part.type === 'text')).toBe(true);
    const textJoined = parts
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('\n');
    expect(textJoined).toContain('Screenshot: [not provided]');
  });
});
