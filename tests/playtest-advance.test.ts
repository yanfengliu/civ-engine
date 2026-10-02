// Bound: literal pre-step authority/read-only publication, runner/replayer/fork identity and unchanged defaults.
import { describe, expect, it } from 'vitest';
import { MemorySink, SessionRecorder, SessionReplayer } from '../src/index.js';
import { makeWorld, prepareAndStep, run, runners, worldFactory } from './fixtures/advance-contract.js';
import type { SessionBundle, WorldSnapshot } from '../src/index.js';
import type { Commands, Events, TestWorld } from './fixtures/advance-contract.js';

function snapshotState(snapshot: WorldSnapshot): Record<string, unknown> {
  if (!('state' in snapshot)) throw new Error('literal fixture requires a state-bearing snapshot');
  return snapshot.state;
}

describe.each(runners)('%s enclosing simulation advancement', (runner) => {
  it('runs once after submitted commands, publishes before stopWhen, and replays/forks using fresh Worlds', async () => {
    const world = makeWorld();
    const order: string[] = [];
    world.onCommandResult(() => { order.push('submit'); });
    const sourceWorlds: TestWorld[] = [];
    const result = await run(runner, world, (supplied) => {
      sourceWorlds.push(supplied);
      order.push(`prepare:${supplied.tick}`);
      prepareAndStep(supplied);
      order.push(`publish:${supplied.getState('total')}`); // read-only derived output
    }, { stopWhen: () => { order.push('stop'); return false; } });
    expect(result).toMatchObject({ ok: true, stopReason: 'maxTicks', ticksRun: 3 });
    expect(sourceWorlds).toHaveLength(3); for (const supplied of sourceWorlds) expect(supplied).toBe(world);
    expect(order).toEqual(['submit', 'prepare:0', 'publish:11', 'stop', 'submit', 'prepare:1', 'publish:23', 'stop',
      'submit', 'prepare:2', 'publish:36', 'stop']);
    expect(world.getState('total')).toBe(36);
    expect(result.bundle.ticks.map((t) => t.events)).toEqual([
      [{ type: 'seen', data: { total: 11 } }], [{ type: 'seen', data: { total: 23 } }], [{ type: 'seen', data: { total: 36 } }],
    ]);
    const fresh: TestWorld[] = [];
    const advanced: TestWorld[] = [];
    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snapshot) => { const w = worldFactory(snapshot); fresh.push(w); return w; },
      advance: (supplied) => { advanced.push(supplied); prepareAndStep(supplied); },
    });
    expect(replayer.selfCheck()).toMatchObject({ ok: true, checkedSegments: 2, coverage: { complete: true } });
    expect(replayer.openAt(1).getState('total')).toBe(11);
    const builder = replayer.forkAt(1);
    expect(snapshotState(builder.snapshot())['total']).toBe(11);
    const fork = builder.run({ untilTick: 3 });
    expect(snapshotState(fork.bundle.snapshots.at(-1)!.snapshot)['total']).toBe(36);
    expect(fork.divergence.equivalent).toBe(true);
    expect(advanced).toHaveLength(7); // 3 self-check + 1 openAt + 1 fork reconstruction + 2 continuation
    for (const supplied of advanced) {
      expect(supplied).not.toBe(world);
      expect(fresh).toContain(supplied);
    }
    const omitted = SessionReplayer.fromBundle(result.bundle, { worldFactory });
    expect(omitted.selfCheck().ok).toBe(false);
    expect(omitted.openAt(1).getState('total')).toBe(10);
  });

  it('makes the inherited periodic snapshot bound visible for authoritative post-step mutation', async () => {
    const result = await run(runner, makeWorld(), (world) => {
      prepareAndStep(world);
      world.runMaintenance(() => { world.setState('published', world.tick); }); // deliberately outside the supported boundary
    });
    const replayer = SessionReplayer.fromBundle(result.bundle, { worldFactory, advance: (world) => {
      prepareAndStep(world); world.runMaintenance(() => { world.setState('published', world.tick); });
    } });
    const check = replayer.selfCheck();
    expect(check.ok).toBe(false);
    expect(check.stateDivergences[0]).toMatchObject({ fromTick: 0, toTick: 2 });
    expect(check.stateDivergences[0].firstDifferingPath).toBe('state.published');
    expect(snapshotState(result.bundle.snapshots.find((s) => s.tick === 2)!.snapshot)['published']).toBe(1);
    expect(snapshotState(result.bundle.snapshots.at(-1)!.snapshot)['published']).toBe(3);
  });

  it('does exactly three World ticks when advance is omitted', async () => {
    const world = makeWorld();
    let diffs = 0;
    world.onDiff(() => { diffs++; });
    const result = await run(runner, world);
    expect(result).toMatchObject({ ok: true, ticksRun: 3, stopReason: 'maxTicks' });
    expect(diffs).toBe(3);
    expect(result.bundle.ticks.map((t) => t.tick)).toEqual([1, 2, 3]);
    expect(world.getState('total')).toBe(30);
    expect(result.advanceError).toBeUndefined();
  });
});

it('supports a directly recorded source without runner-specific preparation', () => {
  const world = makeWorld();
  const sink = new MemorySink();
  const recorder = new SessionRecorder({ world, sink, snapshotInterval: 2 });
  try {
    recorder.connect();
    for (let i = 0; i < 3; i++) { world.submit('add', { value: 10 }); prepareAndStep(world); }
  } finally { recorder.disconnect(); }
  const bundle = recorder.toBundle();
  // Recorder retains the default-generic JSON middle. Verify literal names before static fixture narrowing.
  expect(bundle.ticks.flatMap(entry => entry.events)).toEqual([
    { type: 'seen', data: { total: 11 } }, { type: 'seen', data: { total: 23 } }, { type: 'seen', data: { total: 36 } },
  ]);
  expect(bundle.commands.map(command => ({ type: command.type, data: command.data }))).toEqual([
    { type: 'add', data: { value: 10 } }, { type: 'add', data: { value: 10 } }, { type: 'add', data: { value: 10 } },
  ]);
  expect(SessionReplayer.fromBundle(bundle as unknown as SessionBundle<Events, Commands>, { worldFactory, advance: prepareAndStep }).selfCheck().ok).toBe(true);
});
