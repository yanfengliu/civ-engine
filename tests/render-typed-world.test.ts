import { describe, expect, expectTypeOf, it } from 'vitest';
import { World, RenderAdapter, type RenderProjector, type RenderServerMessage } from '../src/index.js';

type Events = { alert: { code: number } };
type Commands = { move: { dx: number } };
type Components = { health: { hp: number } };
type State = { score: number };
type GameWorld = World<Events, Commands, Components, State>;
type View = { hp: number };
type Frame = { score: number };

function createWorld(): GameWorld {
  const world = new World<Events, Commands, Components, State>({ gridWidth: 4, gridHeight: 4, tps: 10 });
  world.registerComponent('health');
  const id = world.createEntity();
  world.addComponent(id, 'health', { hp: 7 });
  world.setState('score', 3);
  return world;
}

describe('typed render projection', () => {
  it('infers the full world in entity and frame projectors and preserves messages', () => {
    const world = createWorld();
    const messages: RenderServerMessage<View, Frame>[] = [];
    const adapter = new RenderAdapter({
      world,
      projector: {
        projectEntity(ref, projectedWorld) {
          expectTypeOf(projectedWorld).toEqualTypeOf<GameWorld>();
          expectTypeOf(projectedWorld.getComponent(ref.id, 'health')).toEqualTypeOf<{ hp: number } | undefined>();
          return projectedWorld.getComponent(ref.id, 'health') ?? null;
        },
        projectFrame(projectedWorld) {
          expectTypeOf(projectedWorld).toEqualTypeOf<GameWorld>();
          expectTypeOf(projectedWorld.getState('score')).toEqualTypeOf<number | undefined>();
          return { score: projectedWorld.getState('score') ?? 0 };
        },
      },
      send: (message) => messages.push(message),
    });
    adapter.connect();
    world.registerSystem((w) => { w.setComponent([...w.getAliveEntities()][0], 'health', { hp: 9 }); w.setState('score', 4); });
    world.step();
    const snapshot = messages[0];
    if (snapshot.type !== 'renderSnapshot') throw new Error('Expected snapshot');
    expect(snapshot.data.render.entities.map((entity) => entity.view)).toEqual([{ hp: 7 }]);
    const tick = messages[1];
    if (tick.type !== 'renderTick') throw new Error('Expected tick');
    expect(tick.data.render.updated.map((entity) => entity.view)).toEqual([{ hp: 9 }]);
    expect(tick.data.render.frame).toEqual({ score: 4 });
    adapter.disconnect();
  });

  it('accepts an explicitly typed projector and adapter without compatibility casts', () => {
    const projector: RenderProjector<Events, Commands, View, Frame, Components, State> = {
      projectEntity: (ref, world) => world.getComponent(ref.id, 'health') ?? null,
      projectFrame: (world) => ({ score: world.getState('score') ?? 0 }),
    };
    const adapter = new RenderAdapter<Events, Commands, View, Frame, unknown, Components, State>({
      world: createWorld(), projector, send: () => {},
    });
    adapter.connect();
    adapter.disconnect();
  });

  it('keeps the existing generic parameter positions and defaults compatible', () => {
    const world = new World<Events, Commands>({ gridWidth: 4, gridHeight: 4, tps: 10 });
    const projector: RenderProjector<Events, Commands, View, Frame> = {
      projectEntity: () => ({ hp: 1 }), projectFrame: () => ({ score: 0 }),
    };
    const adapter = new RenderAdapter<Events, Commands, View, Frame, { tick: number }>({
      world, projector, debug: { capture: () => ({ tick: world.tick }) }, send: () => {},
    });
    adapter.connect();
    adapter.disconnect();
  });
});

// These calls are checked by tsc, never executed: preserving inference must not
// widen commands or events into unchecked values. World intentionally retains
// explicit generic fallbacks for unregistered component and state keys.
function rejectedWrites(projector: RenderProjector<Events, Commands, View, Frame, Components, State>, world: GameWorld) {
  // @ts-expect-error command payloads retain their declared type
  world.submitCommand('move', { dx: 'invalid' });
  // @ts-expect-error event payloads retain their declared type
  world.emit('alert', { code: 'invalid' });
  projector.projectEntity({ id: 0, generation: 0 }, world, null);
}
void rejectedWrites;
