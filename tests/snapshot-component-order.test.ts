import { describe, expect, it } from 'vitest';
import { MemorySink, SessionRecorder, World, snapshotAtTick } from '../src/index.js';
import type { SessionBundle } from '../src/index.js';

type Snapshot = ReturnType<World['serialize']>;
type Origin = { name: string; baseTick: number; snapshotInterval: number | null };

const origins: Origin[] = [
  { name: 'initial snapshot', baseTick: 0, snapshotInterval: null },
  { name: 'periodic snapshot', baseTick: 3, snapshotInterval: 3 },
];

function payload(label: string, amount: number) {
  return { label, amount, owner: null, details: { ratio: 0.5, flags: [true, false] } };
}

function makeWorld(includeLow: boolean): World {
  const world = new World({ gridWidth: 4, gridHeight: 4, tps: 20 });
  world.registerComponent<ReturnType<typeof payload>>('payload');
  world.registerComponent<{ label: string; layers: number[] }>('stable');
  const ids = Array.from({ length: 12 }, () => world.createEntity());
  expect(ids).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  // Numeric rather than lexical order matters: 2 must precede 10 and 11.
  if (includeLow) world.addComponent(2, 'payload', payload('original-low', 2));
  world.addComponent(10, 'payload', payload('high', 10));
  world.addComponent(11, 'payload', payload('highest', 11));
  world.addComponent(0, 'stable', { label: 'unchanged-first', layers: [3, 1] });
  world.addComponent(1, 'stable', { label: 'unchanged-second', layers: [8, 5] });
  return world;
}

function record(
  world: World,
  origin: Origin,
  change: (world: World, relativeTick: number) => void,
): { bundle: SessionBundle; live: Map<number, Snapshot> } {
  world.registerSystem({
    name: 'componentLifecycle',
    execute: (current) => change(current, current.tick - origin.baseTick),
  });
  const recorder = new SessionRecorder({
    world,
    sink: new MemorySink(),
    snapshotInterval: origin.snapshotInterval,
  });
  const live = new Map<number, Snapshot>();
  recorder.connect();
  try {
    for (let tick = 0; tick < origin.baseTick + 3; tick++) {
      expect(world.stepWithResult().ok).toBe(true);
      live.set(world.tick, world.serialize());
    }
  } finally {
    recorder.disconnect();
  }
  expect(recorder.lastError).toBeNull();
  return { bundle: recorder.toBundle(), live };
}

function expectFold(
  bundle: SessionBundle,
  live: Snapshot,
  origin: Origin,
  expectedIds: number[],
  expectedLow: ReturnType<typeof payload> | null,
): void {
  expect(live.tick).toBeGreaterThan(origin.baseTick);
  expect(live.tick).toBeLessThan(bundle.metadata.endTick);
  // The target must actually fold, never select a recorder-written target snapshot.
  expect(bundle.snapshots.some((entry) => entry.tick === live.tick)).toBe(false);
  if (origin.baseTick > 0) {
    expect(bundle.snapshots.some((entry) => entry.tick === origin.baseTick)).toBe(true);
  }
  const beforeBundle = structuredClone(bundle);
  const beforeLive = structuredClone(live);
  const folded = snapshotAtTick(bundle, live.tick);
  const expectedRows = [
    ...(expectedLow === null ? [] : [[2, expectedLow]]),
    [10, payload('high', 10)],
    [11, payload('highest', 11)],
  ];
  expect(live.components.payload).toStrictEqual(expectedRows);
  expect(folded.components.payload?.map(([id]) => id)).toStrictEqual(expectedIds);
  // Compare complete values and array order; do not sort or project expected rows.
  expect(folded.components.payload).toStrictEqual(live.components.payload);
  expect(folded.components.stable).toStrictEqual([
    [0, { label: 'unchanged-first', layers: [3, 1] }],
    [1, { label: 'unchanged-second', layers: [8, 5] }],
  ]);
  expect(folded.components).toStrictEqual(live.components);
  expect(bundle).toStrictEqual(beforeBundle);
  expect(live).toStrictEqual(beforeLive);
  // A caller modifying the returned arrays must not modify source/expected inputs.
  folded.components.payload?.reverse();
  folded.components.stable?.push([99, { label: 'caller-only', layers: [] }]);
  expect(bundle).toStrictEqual(beforeBundle);
  expect(live).toStrictEqual(beforeLive);
}

describe.each(origins)('snapshotAtTick component order from $name', (origin) => {
  it('places a component added later on a lower live ID before higher IDs', () => {
    const world = makeWorld(false);
    const { bundle, live } = record(world, origin, (current, tick) => {
      if (tick === 0) current.addComponent(2, 'payload', payload('new-low', 7));
    });
    expectFold(bundle, live.get(origin.baseTick + 1)!, origin, [2, 10, 11], payload('new-low', 7));
  });

  it('restores numeric order when a lower-ID component is removed and re-added', () => {
    const world = makeWorld(true);
    const { bundle, live } = record(world, origin, (current, tick) => {
      if (tick === 0) current.removeComponent(2, 'payload');
      if (tick === 1) current.addComponent(2, 'payload', payload('re-added-low', 17));
    });
    expectFold(bundle, live.get(origin.baseTick + 1)!, origin, [10, 11], null);
    expectFold(bundle, live.get(origin.baseTick + 2)!, origin, [2, 10, 11], payload('re-added-low', 17));
  });

  it('restores numeric order when a destroyed lower entity ID is recycled', () => {
    const world = makeWorld(true);
    const recycled: number[] = [];
    const { bundle, live } = record(world, origin, (current, tick) => {
      if (tick === 0) current.destroyEntity(2);
      if (tick === 1) {
        const entity = current.createEntity();
        recycled.push(entity);
        current.addComponent(entity, 'payload', payload('recycled-low', 27));
      }
    });
    expect(recycled).toStrictEqual([2]);
    expect(live.get(origin.baseTick + 2)!.entities.generations[2]).toBe(1);
    expectFold(bundle, live.get(origin.baseTick + 1)!, origin, [10, 11], null);
    expectFold(bundle, live.get(origin.baseTick + 2)!, origin, [2, 10, 11], payload('recycled-low', 27));
  });
});
