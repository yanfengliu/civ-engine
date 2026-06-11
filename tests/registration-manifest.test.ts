import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  World,
  runScenario,
  scenarioResultToBundle,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 8, gridHeight: 8, tps: 60 });

type Events = Record<string, never>;
interface Cmds { spawn: { n: number }; boom: Record<string, never> }

function mkRegisteredWorld(): World<Events, Cmds> {
  const w = new World<Events, Cmds>(mkConfig());
  w.registerComponent<{ x: number; y: number }>('position');
  w.registerComponent<{ hp: number }>('health', { diffMode: 'semantic' });
  w.registerResource('wood');
  w.registerResource('gold');
  w.registerHandler('spawn', () => undefined);
  w.registerHandler('boom', () => undefined);
  w.registerValidator('spawn', () => true);
  w.registerValidator('spawn', () => true);
  w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
  w.registerSystem({ name: 'beta', phase: 'update', interval: 2, intervalOffset: 1, after: ['alpha'], execute: () => undefined });
  // 'input' phase registered LAST: resolved execution order puts it FIRST,
  // so the stability test genuinely pins registration order, not resolved
  // order (impl-review-1 Claude L3).
  w.registerSystem({ name: 'omega', phase: 'input', execute: () => undefined });
  w.onDestroy(() => undefined);
  return w;
}

describe('World.getRegistrationManifest', () => {
  it('captures every category with order and options', () => {
    const world = mkRegisteredWorld();
    const m = world.getRegistrationManifest();
    expect(m.schemaVersion).toBe(1);
    expect(m.components).toEqual([
      { key: 'position' },
      { key: 'health', options: { diffMode: 'semantic' } },
    ]);
    expect(m.systems).toEqual([
      { name: 'alpha', phase: 'update', interval: 1, intervalOffset: 0, before: [], after: [] },
      { name: 'beta', phase: 'update', interval: 2, intervalOffset: 1, before: [], after: ['alpha'] },
      { name: 'omega', phase: 'input', interval: 1, intervalOffset: 0, before: [], after: [] },
    ]);
    expect(m.handlers).toEqual(['boom', 'spawn']);
    expect(m.validators).toEqual([{ key: 'spawn', count: 2 }]);
    expect(m.resources).toEqual(['gold', 'wood']);
    expect(m.destroyCallbackCount).toBe(1);
  });

  it('is stable across ticks (registration array, not resolved order)', () => {
    const world = mkRegisteredWorld();
    const before = world.getRegistrationManifest();
    world.step();
    world.step();
    expect(world.getRegistrationManifest()).toEqual(before);
  });

  it('returns fresh arrays (mutation does not write through)', () => {
    const world = mkRegisteredWorld();
    const m = world.getRegistrationManifest();
    m.systems.pop();
    m.handlers.push('fake');
    expect(world.getRegistrationManifest().systems.length).toBe(3);
    expect(world.getRegistrationManifest().handlers).toEqual(['boom', 'spawn']);
  });
});

describe('registration capture points', () => {
  it('SessionRecorder.connect() stamps metadata.registration', () => {
    const world = mkRegisteredWorld();
    const rec = new SessionRecorder({ world, sink: new MemorySink() });
    rec.connect();
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle();
    expect(bundle.metadata.registration).toBeDefined();
    expect(bundle.metadata.registration!.systems.map((s) => s.name)).toEqual(['alpha', 'beta', 'omega']);
    expect(bundle.metadata.registration!.handlers).toEqual(['boom', 'spawn']);
  });

  it('runScenario captures registration on the result; adapter copies it', () => {
    const world = mkRegisteredWorld();
    const result = runScenario<Events, Cmds>({
      name: 'manifest-capture',
      world,
      setup: () => undefined,
      run: (ctx) => { ctx.step(); },
      checks: [],
      history: { capacity: 16, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    expect(result.registration).toBeDefined();
    expect(result.registration!.handlers).toEqual(['boom', 'spawn']);
    const bundle = scenarioResultToBundle(result);
    expect(bundle.metadata.registration).toEqual(result.registration);
  });

  it('scenarioResultToBundle options.registration overrides the captured one', () => {
    const world = mkRegisteredWorld();
    const result = runScenario<Events, Cmds>({
      name: 'manifest-override',
      world,
      setup: () => undefined,
      run: (ctx) => { ctx.step(); },
      checks: [],
      history: { capacity: 16, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const override = { ...result.registration!, destroyCallbackCount: 99 };
    const bundle = scenarioResultToBundle(result, { registration: override });
    expect(bundle.metadata.registration!.destroyCallbackCount).toBe(99);
  });
});
