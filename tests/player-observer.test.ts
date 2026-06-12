import { describe, expect, it } from 'vitest';
import { PlayerObserver, VisibilityMap, World } from '../src/index.js';

type Pos = { x: number; y: number };
type Components = { position: Pos; hp: { v: number } };
type Events = { boom: { x: number; y: number } };

function makeWorld() {
  const world = new World<Events, Record<string, never>, Components>({
    gridWidth: 8,
    gridHeight: 8,
    tps: 60,
    // 1.0: several tests mutate between ticks by design (the observer reads
    // positional truth live); they pin non-strict-compatible behavior.
    strict: false,
  });
  world.registerComponent<Pos>('position');
  world.registerComponent<{ v: number }>('hp');
  // TickDiff covers mutations made DURING the tick (step() clears dirty
  // tracking at tick start), so tests drive mutations through a scripted
  // system — the same path real games use.
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

function spawnAt(world: W, x: number, y: number, hp = 1) {
  const e = world.createEntity();
  world.addComponent(e, 'position', { x, y });
  world.addComponent(e, 'hp', { v: hp });
  return e;
}

/** Player '1' sees a radius-2 disc around (1, 1); (6, 6) is deep fog. */
function makeObserver(world: W, config?: Partial<{ positionless: 'hidden' | 'visible' }>) {
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

describe('engine prerequisites', () => {
  it('getStateKeys: sorted, reflects set/delete, isolated', () => {
    const { world } = makeWorld();
    expect(world.getStateKeys()).toEqual([]);
    world.setState('zeta', 1);
    world.setState('alpha', 2);
    const keys = world.getStateKeys();
    expect(keys).toEqual(['alpha', 'zeta']);
    keys.push('intruder');
    expect(world.getStateKeys()).toEqual(['alpha', 'zeta']);
    world.deleteState('alpha');
    expect(world.getStateKeys()).toEqual(['zeta']);
  });

  it('getMetaEntries: round-trip, isolation, empty, dead entity throws entity_not_alive', () => {
    const { world } = makeWorld();
    const e = world.createEntity();
    expect(world.getMetaEntries(e)).toEqual({});
    world.setMeta(e, 'name', 'scout');
    world.setMeta(e, 'level', 3);
    const meta = world.getMetaEntries(e);
    expect(meta).toEqual({ name: 'scout', level: 3 });
    meta.name = 'tampered';
    expect(world.getMeta(e, 'name')).toBe('scout');
    world.destroyEntity(e);
    let code = '';
    try {
      world.getMetaEntries(e);
    } catch (err) {
      code = (err as { code: string }).code;
    }
    expect(code).toBe('entity_not_alive');
  });
});

describe('PlayerObserver.snapshot', () => {
  it('returns full data for visible entities only; positionless hidden by default', () => {
    const { world } = makeWorld();
    world.registerResource('gold');
    const seen = spawnAt(world, 1, 1);
    world.addResource(seen, 'gold', 10);
    world.addTag(seen, 'unit');
    world.setMeta(seen, 'name', 'scout');
    spawnAt(world, 6, 6); // fog
    world.createEntity(); // positionless
    const { observer } = makeObserver(world);
    const snap = observer.snapshot();
    expect(snap.tick).toBe(world.tick);
    expect(snap.entities).toHaveLength(1);
    const obs = snap.entities[0];
    expect(obs.ref.id).toBe(seen);
    expect(obs.components).toEqual({ position: { x: 1, y: 1 }, hp: { v: 1 } });
    expect(obs.resources).toEqual({ gold: { current: 10, max: null } });
    expect(obs.tags).toEqual(['unit']);
    expect(obs.meta).toEqual({ name: 'scout' });
    expect(snap.worldState).toEqual({});
  });

  it("positionless: 'visible' opts global entities in", () => {
    const { world } = makeWorld();
    const g = world.createEntity();
    world.setMeta(g, 'name', 'clock');
    const { observer } = makeObserver(world, { positionless: 'visible' });
    const snap = observer.snapshot();
    expect(snap.entities.map((e) => e.ref.id)).toEqual([g]);
  });
});

describe('enter/exit/update semantics', () => {
  it('spawn in view -> entered with full data; spawn in fog -> silent', () => {
    const { world } = makeWorld();
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    const inView = spawnAt(world, 2, 1);
    spawnAt(world, 7, 7);
    world.step();
    const obs = observer.observeTick();
    expect(obs.entered.map((e) => e.ref.id)).toEqual([inView]);
    expect(obs.entered[0].components.position).toEqual({ x: 2, y: 1 });
    expect(obs.exited).toEqual([]);
  });

  it('movement into view -> entered; out of view -> exited fog', () => {
    const { world } = makeWorld();
    const walker = spawnAt(world, 6, 6);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    world.setPosition(walker, { x: 1, y: 2 });
    world.step();
    expect(observer.observeTick().entered.map((e) => e.ref.id)).toEqual([walker]);
    world.setPosition(walker, { x: 6, y: 6 });
    world.step();
    const out = observer.observeTick();
    expect(out.exited).toEqual([{ ref: expect.objectContaining({ id: walker }), reason: 'fog' }]);
  });

  it('fog recede/advance (vision source moves) -> entered then exited', () => {
    const { world } = makeWorld();
    const idle = spawnAt(world, 5, 5);
    const { vis, observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    vis.setSource('1', 'eye', { x: 5, y: 4, radius: 2 });
    world.step();
    expect(observer.observeTick().entered.map((e) => e.ref.id)).toEqual([idle]);
    vis.setSource('1', 'eye', { x: 1, y: 1, radius: 2 });
    world.step();
    expect(observer.observeTick().exited[0]).toEqual(
      { ref: expect.objectContaining({ id: idle }), reason: 'fog' },
    );
  });

  it('destroy in view -> exited destroyed; destroy in fog after fog-exit -> no leak', () => {
    const { world, act } = makeWorld();
    const victim = spawnAt(world, 1, 1);
    const hidden = spawnAt(world, 6, 6);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    act((w) => {
      w.destroyEntity(victim);
      w.destroyEntity(hidden);
    });
    world.step();
    const obs = observer.observeTick();
    expect(obs.exited).toEqual([
      { ref: expect.objectContaining({ id: victim }), reason: 'destroyed' },
    ]);
  });

  it('move-then-die same tick: attributed via last OBSERVED position (documented mis-attribution)', () => {
    const { world, act } = makeWorld();
    const victim = spawnAt(world, 1, 1);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    // Dies far away, but the observer last saw it at (1,1), which is still
    // visible post-tick -> honest attribution says 'destroyed'.
    act((w) => {
      w.setPosition(victim, { x: 7, y: 7 });
      w.destroyEntity(victim);
    });
    world.step();
    expect(observer.observeTick().exited[0].reason).toBe('destroyed');
  });

  it('same-tick id recycling reads as exited + entered, never as one continuing entity (impl-1)', () => {
    const { world, act } = makeWorld();
    const victim = spawnAt(world, 1, 1);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    const oldRef = world.getEntityRef(victim)!;
    let recycled = -1;
    act((w) => {
      w.destroyEntity(victim);
      recycled = w.createEntity(); // free-list recycles the id immediately
      w.addComponent(recycled, 'position', { x: 1, y: 2 });
      w.addComponent(recycled, 'hp', { v: 7 });
    });
    world.step();
    const obs = observer.observeTick();
    expect(recycled).toBe(victim); // precondition: the id actually recycled
    expect(obs.exited).toEqual([{ ref: oldRef, reason: 'destroyed' }]);
    expect(obs.entered).toHaveLength(1);
    expect(obs.entered[0].ref.id).toBe(victim);
    expect(obs.entered[0].ref.generation).not.toBe(oldRef.generation);
    expect(obs.entered[0].components.hp).toEqual({ v: 7 });
    expect(obs.updated).toEqual([]);
  });

  it('updated: component change + removal, resource change + removal, tag and meta full replacement', () => {
    const { world, act } = makeWorld();
    world.registerResource('gold');
    const e = spawnAt(world, 1, 1);
    world.addResource(e, 'gold', 5);
    world.addTag(e, 'a');
    world.setMeta(e, 'k', 1);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();

    act((w) => {
      w.setComponent(e, 'hp', { v: 9 });
      w.addResource(e, 'gold', 5);
      w.addTag(e, 'b');
      w.setMeta(e, 'k', 2);
    });
    world.step();
    let upd = observer.observeTick().updated;
    expect(upd).toHaveLength(1);
    expect(upd[0].components).toEqual({ hp: { v: 9 } });
    expect(upd[0].componentsRemoved).toEqual([]);
    expect(upd[0].resources).toEqual({ gold: { current: 10, max: null } });
    expect(upd[0].tags?.sort()).toEqual(['a', 'b']);
    expect(upd[0].meta).toEqual({ k: 2 });

    act((w) => w.removeComponent(e, 'hp'));
    world.step();
    upd = observer.observeTick().updated;
    expect(upd[0].componentsRemoved).toEqual(['hp']);
    // Pool removal only happens via entity destruction today, so the
    // resourcesRemoved channel stays empty for continuing entities; the
    // projection keeps the channel for diff-shape fidelity.
    expect(upd[0].resourcesRemoved).toEqual([]);
    expect(upd[0].tags).toBeUndefined();
  });

  it('moving while visible -> updated with new position, not entered/exited', () => {
    const { world, act } = makeWorld();
    const e = spawnAt(world, 1, 1);
    const { observer } = makeObserver(world);
    world.step();
    observer.observeTick();
    act((w) => w.setPosition(e, { x: 2, y: 1 }));
    world.step();
    const obs = observer.observeTick();
    expect(obs.entered).toEqual([]);
    expect(obs.exited).toEqual([]);
    expect(obs.updated[0].components.position).toEqual({ x: 2, y: 1 });
  });

  it("position-component removal while visible: 'hidden' -> exited fog; 'visible' -> stays", () => {
    const { world: hiddenWorld, act: act1 } = makeWorld();
    const e1 = spawnAt(hiddenWorld, 1, 1);
    const { observer: o1 } = makeObserver(hiddenWorld);
    hiddenWorld.step();
    o1.observeTick();
    act1((w) => w.removeComponent(e1, 'position'));
    hiddenWorld.step();
    expect(o1.observeTick().exited[0]).toEqual(
      { ref: expect.objectContaining({ id: e1 }), reason: 'fog' },
    );

    const { world: visibleWorld, act: act2 } = makeWorld();
    const e2 = spawnAt(visibleWorld, 1, 1);
    const { observer: o2 } = makeObserver(visibleWorld, { positionless: 'visible' });
    visibleWorld.step();
    o2.observeTick();
    act2((w) => w.removeComponent(e2, 'position'));
    visibleWorld.step();
    const obs = o2.observeTick();
    expect(obs.exited).toEqual([]);
    expect(obs.updated[0].componentsRemoved).toEqual(['position']);
  });
});
