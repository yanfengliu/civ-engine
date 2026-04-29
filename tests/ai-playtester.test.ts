import { describe, expect, it } from 'vitest';
import {
  bundleSummary,
  MemorySink,
  runAgentPlaytest,
  SessionRecordingError,
  SessionReplayer,
  type AgentDriver,
  type SessionTickEntry,
  World,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
});

interface Cmds { tick: { v: number } }
interface Events { e: { id: number } }

const mkWorld = (): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig());
  w.registerHandler('tick', () => undefined);
  return w;
};

describe('runAgentPlaytest', () => {
  it('rejects non-positive maxTicks', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    await expect(runAgentPlaytest({ world: w, agent, maxTicks: 0 })).rejects.toThrow(/maxTicks/);
    await expect(runAgentPlaytest({ world: w, agent, maxTicks: -1 })).rejects.toThrow(/maxTicks/);
  });

  it('rejects poisoned worlds', async () => {
    const w = mkWorld();
    w.registerSystem({ name: 'boom', phase: 'update', execute: () => { throw new Error('x'); } });
    try { w.step(); } catch { /* expected */ }
    expect(w.isPoisoned()).toBe(true);
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    await expect(runAgentPlaytest({ world: w, agent, maxTicks: 1 })).rejects.toThrow(/poisoned/);
  });

  it('runs N ticks with a sync agent and returns a synthetic bundle', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex } }],
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    expect(result.stopReason).toBe('maxTicks');
    expect(result.ok).toBe(true);
    expect(result.ticksRun).toBe(3);
    expect(result.bundle.metadata.sourceKind).toBe('synthetic');
    expect(result.bundle.metadata.sourceLabel).toBe('agent');
    expect(result.bundle.commands.length).toBe(3);
  });

  it('runs with an async agent that awaits work between ticks', async () => {
    const w = mkWorld();
    const decisions: number[] = [];
    const agent: AgentDriver<Events, Cmds> = {
      decide: async (ctx) => {
        await Promise.resolve();
        decisions.push(ctx.tickIndex);
        return [{ type: 'tick', data: { v: ctx.tickIndex } }];
      },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 4 });
    expect(decisions).toEqual([0, 1, 2, 3]);
    expect(result.ticksRun).toBe(4);
  });

  it('honors stopWhen predicate', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    const result = await runAgentPlaytest({
      world: w,
      agent,
      maxTicks: 100,
      stopWhen: (ctx) => ctx.tickIndex >= 2,
    });
    expect(result.stopReason).toBe('stopWhen');
    expect(result.ticksRun).toBe(2);
    expect(result.ok).toBe(true);
  });

  it('captures world poisoning as stopReason: poisoned', async () => {
    const w = mkWorld();
    let stepNo = 0;
    w.registerSystem({
      name: 'late-boom', phase: 'update',
      execute: () => { if (stepNo++ === 1) throw new Error('intentional'); },
    });
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 5 });
    expect(result.stopReason).toBe('poisoned');
    expect(result.ok).toBe(false);
    // Bundle is still produced (recorder disconnects cleanly even though world is poisoned).
    expect(result.bundle).toBeDefined();
    expect(result.ticksRun).toBe(1);
  });

  it('captures agent.decide throwing as stopReason: agentError', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: () => { throw new Error('agent crashed'); },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    expect(result.stopReason).toBe('agentError');
    expect(result.ok).toBe(false);
    expect(result.agentError?.error.message).toBe('agent crashed');
  });

  it('captures agent.report return value', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: () => [],
      report: (bundle) => ({ summary: `ran ${bundle.metadata.durationTicks} ticks` }),
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 2 });
    expect(result.report).toEqual({ summary: 'ran 2 ticks' });
  });

  it('captures agent.report throwing without rejecting the outer promise', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: () => [],
      report: () => { throw new Error('report crashed'); },
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 1 });
    expect(result.ok).toBe(true);
    expect((result.report as { error: { message: string } }).error.message).toBe('report crashed');
  });

  it('captures async agent.decide rejection as agentError', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: () => Promise.reject(new Error('async crash')),
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    expect(result.stopReason).toBe('agentError');
    expect(result.agentError?.error.message).toBe('async crash');
  });

  it('captures throwing stopWhen as agentError', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    const result = await runAgentPlaytest({
      world: w,
      agent,
      maxTicks: 5,
      stopWhen: () => { throw new Error('stop crashed'); },
    });
    expect(result.stopReason).toBe('agentError');
    expect(result.agentError?.error.message).toBe('stop crashed');
  });

  it('classifies submit-time validator throws as agentError, not sinkError', async () => {
    const w = mkWorld();
    // Validator that throws on second call. Validators that throw during
    // submit() bubble up — runAgentPlaytest must catch them and classify
    // as agentError, not let the outer try/catch label them sinkError.
    let callCount = 0;
    w.registerValidator('tick', () => {
      if (callCount++ >= 1) throw new Error('validator boom');
      return true;
    });
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex } }],
    };
    const result = await runAgentPlaytest({ world: w, agent, maxTicks: 5 });
    // submit() throws on second call → agentError, NOT sinkError.
    expect(result.stopReason).toBe('agentError');
    expect(result.agentError?.error.message).toContain('validator boom');
  });

  it('sinkError: per-tick recorder.lastError check stops the loop', async () => {
    const w = mkWorld();
    // Stub sink that throws on second writeTick.
    let tickWrites = 0;
    const baseSink = new MemorySink();
    const flakySink: typeof baseSink = new Proxy(baseSink, {
      get(target, prop, receiver) {
        if (prop === 'writeTick') {
          return (entry: SessionTickEntry) => {
            tickWrites++;
            if (tickWrites === 2) throw new SessionRecordingError('disk full', { code: 'sink_disk_full' });
            return target.writeTick(entry);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex } }],
    };
    const result = await runAgentPlaytest({
      world: w,
      agent,
      maxTicks: 5,
      sink: flakySink,
    });
    expect(result.stopReason).toBe('sinkError');
    expect(result.ok).toBe(false);
    expect(result.agentError?.error.message).toContain('disk full');
  });

  it('rejects on connect-time sink failure (no agent.decide called)', async () => {
    const w = mkWorld();
    // Sink whose open() throws.
    const baseSink = new MemorySink();
    const failingSink: typeof baseSink = new Proxy(baseSink, {
      get(target, prop, receiver) {
        if (prop === 'open') {
          return () => { throw new SessionRecordingError('open failed', { code: 'sink_open_failed' }); };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    let decideCalls = 0;
    const agent: AgentDriver<Events, Cmds> = {
      decide: () => { decideCalls++; return []; },
    };
    await expect(runAgentPlaytest({
      world: w,
      agent,
      maxTicks: 5,
      sink: failingSink,
    })).rejects.toThrow(/open failed/);
    // No agent calls before the failure surfaces.
    expect(decideCalls).toBe(0);
  });

  it('post-step stopWhen ctx uses world.tick (just-completed tick), matching runSynthPlaytest', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    const observed: number[] = [];
    const result = await runAgentPlaytest({
      world: w,
      agent,
      maxTicks: 3,
      stopWhen: (ctx) => { observed.push(ctx.tick); return false; },
    });
    // After tick 1 advances world.tick to 1, stopWhen sees ctx.tick === 1.
    expect(observed).toEqual([1, 2, 3]);
    expect(result.ticksRun).toBe(3);
  });

  it('determinism: deterministic agent produces equal recorded content (commands/events/snapshots) across runs', async () => {
    // The bundle includes timing-derived `metrics.durationMs` fields from
    // performance.now() that vary between runs — those are intentional
    // observability, not part of the deterministic recording surface. Compare
    // the deterministic content (commands, executions, events, snapshots,
    // diffs sans metrics) and skip the per-tick metrics.
    const buildAgent = (): AgentDriver<Events, Cmds> => ({
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex * 7 } }],
    });
    const run1 = await runAgentPlaytest({ world: mkWorld(), agent: buildAgent(), maxTicks: 4 });
    const run2 = await runAgentPlaytest({ world: mkWorld(), agent: buildAgent(), maxTicks: 4 });
    const stripDeterministic = (b: typeof run1.bundle): unknown => ({
      schemaVersion: b.schemaVersion,
      initialSnapshot: b.initialSnapshot,
      commands: b.commands,
      executions: b.executions,
      ticks: b.ticks.map((t) => ({ tick: t.tick, diff: t.diff, events: t.events })),
      snapshots: b.snapshots,
      failures: b.failures,
      markers: b.markers,
    });
    expect(JSON.stringify(stripDeterministic(run1.bundle))).toEqual(
      JSON.stringify(stripDeterministic(run2.bundle)),
    );
  });

  it('replay: SessionReplayer.openAt reproduces world state from the recorded bundle', async () => {
    const w = mkWorld();
    w.registerComponent('hp');
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex } }],
    };
    const { bundle } = await runAgentPlaytest({ world: w, agent, maxTicks: 3 });
    const worldFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
      const fresh = new World<Events, Cmds>(mkConfig());
      fresh.registerHandler('tick', () => undefined);
      fresh.registerComponent('hp');
      fresh.applySnapshot(snap);
      return fresh;
    };
    const replayer = SessionReplayer.fromBundle(bundle, { worldFactory });
    const opened = replayer.openAt(3);
    expect(opened.tick).toBe(3);
  });
});

describe('bundleSummary', () => {
  it('produces a JSON-serializable summary with counts and rates', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = {
      decide: (ctx) => [{ type: 'tick', data: { v: ctx.tickIndex } }],
    };
    const { bundle } = await runAgentPlaytest({ world: w, agent, maxTicks: 5 });
    const s = bundleSummary(bundle);
    expect(s.sourceKind).toBe('synthetic');
    expect(s.sourceLabel).toBe('agent');
    expect(s.totalCommands).toBe(5);
    expect(s.acceptedCommands).toBe(5);
    expect(s.acceptedCommandRate).toBe(1);
    expect(s.commandTypeCounts).toEqual({ tick: 5 });
    expect(s.durationTicks).toBe(5);
    expect(s.failureCount).toBe(0);
    // JSON round-trip should succeed
    const round = JSON.parse(JSON.stringify(s));
    expect(round.totalCommands).toBe(5);
  });

  it('handles empty bundles gracefully', async () => {
    const w = mkWorld();
    const agent: AgentDriver<Events, Cmds> = { decide: () => [] };
    const { bundle } = await runAgentPlaytest({ world: w, agent, maxTicks: 1 });
    const s = bundleSummary(bundle);
    expect(s.totalCommands).toBe(0);
    expect(s.acceptedCommandRate).toBe(0);
    expect(s.commandTypeCounts).toEqual({});
  });
});
