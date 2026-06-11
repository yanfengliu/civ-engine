import { describe, expect, it } from 'vitest';
import { PlayerObserver, VisibilityMap, World, isEngineError } from '../src/index.js';
import type { PlayerObserverConfig } from '../src/index.js';

type Pos = { x: number; y: number };
type Components = { position: Pos; hp: { v: number } };
type Events = { boom: { x: number; y: number } };

function makeWorld() {
  const world = new World<Events, Record<string, never>, Components>({
    gridWidth: 8,
    gridHeight: 8,
    tps: 60,
  });
  world.registerComponent<Pos>('position');
  world.registerComponent<{ v: number }>('hp');
  // In-tick mutation device: TickDiff only covers during-the-tick changes.
  const actions: Array<(w: typeof world) => void> = [];
  world.registerSystem({
    name: 'script',
    execute: (w) => {
      for (const fn of actions.splice(0)) fn(w as typeof world);
    },
  });
  const act = (fn: (w: typeof world) => void) => actions.push(fn);
  return { world, act };
}

type W = ReturnType<typeof makeWorld>['world'];

function makeObserver(
  world: W,
  config?: Partial<PlayerObserverConfig<Events, Components>>,
) {
  const vis = new VisibilityMap(8, 8);
  vis.setSource('1', 'eye', { x: 1, y: 1, radius: 2 });
  const observer = new PlayerObserver<Events, Components>({
    world: world as never,
    visibility: vis,
    playerId: '1',
    ...config,
  });
  return { vis, observer };
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    if (isEngineError(e)) {
      expect(e.code).toBe(code);
      return;
    }
    throw e;
  }
  throw new Error(`expected throw with code ${code}`);
}

describe('worldState modes', () => {
  it("default 'none' leaks nothing; 'all' and predicate filter the diff state channel", () => {
    const { world, act } = makeWorld();
    world.setState('public.score', 1);
    world.setState('secret.plan', 'attack');
    const none = makeObserver(world).observer;
    const all = makeObserver(world, { worldState: 'all' }).observer;
    const pub = makeObserver(world, {
      worldState: (key) => key.startsWith('public.'),
    }).observer;

    expect(none.snapshot().worldState).toEqual({});
    expect(all.snapshot().worldState).toEqual({ 'public.score': 1, 'secret.plan': 'attack' });
    expect(pub.snapshot().worldState).toEqual({ 'public.score': 1 });

    act((w) => {
      w.setState('public.score', 2);
      w.setState('secret.plan', 'retreat');
      w.deleteState('secret.plan');
    });
    world.step();
    expect(none.observeTick().worldState).toEqual({ set: {}, removed: [] });
    const allTick = all.observeTick().worldState;
    expect(allTick.set).toEqual({ 'public.score': 2 });
    expect(allTick.removed).toEqual(['secret.plan']);
    const pubTick = pub.observeTick().worldState;
    expect(pubTick.set).toEqual({ 'public.score': 2 });
    expect(pubTick.removed).toEqual([]);
  });
});

describe('event modes', () => {
  function emitBoomAt(world: W, x: number, y: number) {
    world.registerSystem({ name: 'boomer', execute: (w) => (w as W).emit('boom', { x, y }) });
  }

  it("default 'none' -> no events; 'all' -> everything; resolver gets a working isVisible", () => {
    const { world } = makeWorld();
    emitBoomAt(world, 1, 1);
    const none = makeObserver(world).observer;
    const all = makeObserver(world, { events: 'all' }).observer;
    const filtered = makeObserver(world, {
      events: (event, isVisible) => {
        const d = event.data as { x: number; y: number };
        return isVisible(d.x, d.y);
      },
    }).observer;
    world.step();
    expect(none.observeTick().events).toEqual([]);
    expect(all.observeTick().events).toEqual([{ type: 'boom', data: { x: 1, y: 1 } }]);
    expect(filtered.observeTick().events).toEqual([{ type: 'boom', data: { x: 1, y: 1 } }]);
  });

  it('resolver isVisible is total: false for fog, out-of-grid, and fractional coordinates', () => {
    const { world } = makeWorld();
    const probes: boolean[] = [];
    const { observer } = makeObserver(world, {
      events: (_event, isVisible) => {
        probes.push(isVisible(6, 6), isVisible(99, 0), isVisible(-1, 0), isVisible(1.5, 1));
        return false;
      },
    });
    world.registerSystem({ name: 'boomer', execute: (w) => (w as W).emit('boom', { x: 0, y: 0 }) });
    world.step();
    expect(observer.observeTick().events).toEqual([]);
    expect(probes).toEqual([false, false, false, false]);
    expect(observer.isVisible(1, 1)).toBe(true);
  });
});

describe('lifecycle contract', () => {
  it('construction primes: first observeTick after first step is valid with no spurious entered', () => {
    const { world } = makeWorld();
    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 1, y: 1 });
    const { observer } = makeObserver(world);
    world.step();
    const obs = observer.observeTick();
    expect(obs.entered).toEqual([]);
    expect(obs.exited).toEqual([]);
  });

  it('double observe throws player_observer_tick_already_observed', () => {
    const { world } = makeWorld();
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    expectCode(() => observer.observeTick(), 'player_observer_tick_already_observed');
  });

  it('skipped tick throws player_observer_tick_skipped; reset() re-primes', () => {
    const { world } = makeWorld();
    const { observer } = makeObserver(world);
    world.step();
    world.step();
    expectCode(() => observer.observeTick(), 'player_observer_tick_skipped');
    observer.reset();
    world.step();
    expect(() => observer.observeTick()).not.toThrow();
  });

  it('poisoned world throws player_observer_world_poisoned even when the tick looks sequential', () => {
    const { world } = makeWorld();
    const { observer } = makeObserver(world);
    world.onDiff(() => {
      throw new Error('listener boom');
    });
    const result = world.stepWithResult();
    expect(result.ok).toBe(false);
    expectCode(() => observer.observeTick(), 'player_observer_world_poisoned');
  });

  it('snapshot() re-primes mid-stream', () => {
    const { world } = makeWorld();
    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 1, y: 1 });
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    world.step();
    world.step();
    observer.snapshot();
    world.step();
    expect(observer.observeTick().entered).toEqual([]);
  });
});

describe('isolation and determinism', () => {
  it('mutating any returned surface affects neither the world nor later observations', () => {
    const { world } = makeWorld();
    world.registerResource('gold');
    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 1, y: 1 });
    world.addComponent(e, 'hp', { v: 5 });
    world.addResource(e, 'gold', 3);
    world.addTag(e, 'unit');
    world.setMeta(e, 'name', 'scout');
    world.setState('public.score', { points: 1 });
    const { observer } = makeObserver(world, { worldState: 'all' });
    const snap = observer.snapshot();
    const obs = snap.entities[0];
    (obs.components.hp as { v: number }).v = 999;
    (obs.components.position as Pos).x = 7;
    obs.resources.gold.current = 999;
    obs.tags.push('tampered');
    obs.meta.name = 'tampered';
    (snap.worldState['public.score'] as { points: number }).points = 999;
    expect(world.getComponent(e, 'hp')).toEqual({ v: 5 });
    expect(world.getResource(e, 'gold')?.current).toBe(3);
    expect([...world.getTags(e)]).toEqual(['unit']);
    expect(world.getMeta(e, 'name')).toBe('scout');
    expect(world.getState('public.score')).toEqual({ points: 1 });
    const again = observer.snapshot();
    expect(again.entities[0].components.hp).toEqual({ v: 5 });
  });

  it('two observers over identically-scripted worlds produce deep-equal streams', () => {
    const run = () => {
      const { world, act } = makeWorld();
      const { vis, observer } = makeObserver(world);
      const a = world.createEntity();
      world.addComponent(a, 'position', { x: 1, y: 1 });
      world.addComponent(a, 'hp', { v: 1 });
      const stream: unknown[] = [observer.snapshot()];
      world.step();
      stream.push(observer.observeTick());
      act((w) => w.setPosition(a, { x: 2, y: 2 }));
      vis.setSource('1', 'eye', { x: 2, y: 2, radius: 1 });
      world.step();
      stream.push(observer.observeTick());
      act((w) => w.destroyEntity(a));
      world.step();
      stream.push(observer.observeTick());
      return stream;
    };
    expect(run()).toEqual(run());
  });
});
