import { describe, expect, it } from 'vitest';
import {
  bundleSummary,
  runAgentPlaytest,
  type AgentDriver,
  World,
  type WorldConfig,
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
