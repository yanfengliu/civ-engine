import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import { RenderAdapter } from '../src/render-adapter.js';
import type { RenderServerMessage } from '../src/render-adapter.js';
import { WorldDebugger } from '../src/world-debugger.js';
import type { Position } from '../src/types.js';

type Events = { ping: { id: number } };
type Commands = Record<string, never>;

interface Renderable {
  asset: string;
  hidden?: boolean;
}

interface Health {
  hp: number;
}

interface RenderView {
  asset: string;
  x: number;
  y: number;
  hp: number | null;
}

function createWorld(): World<Events, Commands> {
  const world = new World<Events, Commands>({
    gridWidth: 8,
    gridHeight: 8,
    tps: 10,
  });
  world.registerComponent<Position>('position');
  world.registerComponent<Renderable>('renderable');
  world.registerComponent<Health>('health');
  return world;
}

function createAdapter(
  world: World<Events, Commands>,
  messages: Array<RenderServerMessage<RenderView, { tick: number }, { probe: number }>>,
  includeDebug = false,
): RenderAdapter<Events, Commands, RenderView, { tick: number }, { probe: number }> {
  const debug = includeDebug
    ? new WorldDebugger({
        world,
        probes: [
          {
            key: 'probe',
            capture: () => 1,
          },
        ],
      })
    : undefined;

  return new RenderAdapter({
    world,
    projector: {
      projectEntity: (ref, w) => {
        const renderable = w.getComponent<Renderable>(ref.id, 'renderable');
        if (!renderable || renderable.hidden) return null;
        const position = w.getComponent<Position>(ref.id, 'position')!;
        const health = w.getComponent<Health>(ref.id, 'health');
        return {
          asset: renderable.asset,
          x: position.x,
          y: position.y,
          hp: health?.hp ?? null,
        };
      },
      projectFrame: (w, diff) => ({ tick: diff?.tick ?? w.tick }),
    },
    send: (message) => messages.push(message),
    debug: includeDebug
      ? {
          capture: () => ({ probe: debug!.capture().probes.probe as number }),
        }
      : undefined,
  });
}

describe('RenderAdapter', () => {
  it('connect() sends an initial render snapshot', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 2, y: 3 });
    world.addComponent(unit, 'renderable', { asset: 'unit.villager' });
    world.addComponent(unit, 'health', { hp: 15 });
    const messages: Array<
      RenderServerMessage<RenderView, { tick: number }, { probe: number }>
    > = [];
    const adapter = createAdapter(world, messages);

    adapter.connect();

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('renderSnapshot');
    if (messages[0].type === 'renderSnapshot') {
      expect(messages[0].data.render).toEqual({
        tick: 0,
        entities: [
          {
            ref: { id: unit, generation: 0 },
            view: { asset: 'unit.villager', x: 2, y: 3, hp: 15 },
          },
        ],
        frame: { tick: 0 },
      });
      expect(messages[0].data.debug).toBeNull();
    }
  });

  it('streams created and updated render entities after each tick', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 1, y: 1 });
    world.addComponent(unit, 'renderable', { asset: 'unit.villager' });
    world.addComponent(unit, 'health', { hp: 10 });

    let spawned = false;
    world.registerSystem((w) => {
      if (spawned) return;
      spawned = true;
      w.patchComponent<Health>(unit, 'health', (health) => {
        health.hp = 9;
      });
      const spawnedUnit = w.createEntity();
      w.setPosition(spawnedUnit, { x: 4, y: 5 });
      w.addComponent(spawnedUnit, 'renderable', { asset: 'unit.scout' });
    });

    const messages: Array<
      RenderServerMessage<RenderView, { tick: number }, { probe: number }>
    > = [];
    const adapter = createAdapter(world, messages);
    adapter.connect();
    messages.length = 0;

    world.step();

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('renderTick');
    if (messages[0].type === 'renderTick') {
      expect(messages[0].data.render.created).toEqual([
        {
          ref: { id: 1, generation: 0 },
          view: { asset: 'unit.scout', x: 4, y: 5, hp: null },
        },
      ]);
      expect(messages[0].data.render.updated).toEqual([
        {
          ref: { id: unit, generation: 0 },
          view: { asset: 'unit.villager', x: 1, y: 1, hp: 9 },
        },
      ]);
      expect(messages[0].data.render.destroyed).toEqual([]);
      expect(messages[0].data.render.frame).toEqual({ tick: 1 });
    }
  });

  it('disambiguates entity ID recycling with generation-aware destroyed and created refs', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 0, y: 0 });
    world.addComponent(unit, 'renderable', { asset: 'unit.old' });

    let recycled = false;
    world.registerSystem((w) => {
      if (recycled) return;
      recycled = true;
      w.destroyEntity(unit);
      const replacement = w.createEntity();
      expect(replacement).toBe(unit);
      w.setPosition(replacement, { x: 7, y: 7 });
      w.addComponent(replacement, 'renderable', { asset: 'unit.new' });
    });

    const messages: Array<
      RenderServerMessage<RenderView, { tick: number }, { probe: number }>
    > = [];
    const adapter = createAdapter(world, messages);
    adapter.connect();
    messages.length = 0;

    world.step();

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('renderTick');
    if (messages[0].type === 'renderTick') {
      expect(messages[0].data.render.destroyed).toEqual([
        { id: unit, generation: 0 },
      ]);
      expect(messages[0].data.render.created).toEqual([
        {
          ref: { id: unit, generation: 1 },
          view: { asset: 'unit.new', x: 7, y: 7, hp: null },
        },
      ]);
      expect(messages[0].data.render.updated).toEqual([]);
    }
  });

  it('removes a render entity when projection returns null without destroying the entity', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 3, y: 2 });
    world.addComponent(unit, 'renderable', { asset: 'unit.villager' });

    let hidden = false;
    world.registerSystem((w) => {
      if (hidden) return;
      hidden = true;
      w.patchComponent<Renderable>(unit, 'renderable', (renderable) => {
        renderable.hidden = true;
      });
    });

    const messages: Array<
      RenderServerMessage<RenderView, { tick: number }, { probe: number }>
    > = [];
    const adapter = createAdapter(world, messages);
    adapter.connect();
    messages.length = 0;

    world.step();

    expect(world.isAlive(unit)).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('renderTick');
    if (messages[0].type === 'renderTick') {
      expect(messages[0].data.render.created).toEqual([]);
      expect(messages[0].data.render.updated).toEqual([]);
      expect(messages[0].data.render.destroyed).toEqual([
        { id: unit, generation: 0 },
      ]);
    }
  });

  it('can include debugger payloads in render messages', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 2, y: 2 });
    world.addComponent(unit, 'renderable', { asset: 'unit.villager' });
    const messages: Array<
      RenderServerMessage<RenderView, { tick: number }, { probe: number }>
    > = [];
    const adapter = createAdapter(world, messages, true);

    adapter.connect();

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('renderSnapshot');
    if (messages[0].type === 'renderSnapshot') {
      expect(messages[0].data.debug).toEqual({ probe: 1 });
    }
  });
});
