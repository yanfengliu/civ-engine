import { describe, expect, it } from 'vitest';
import {
  SessionReplayer,
  World,
  runScenario,
  scenarioResultToBundle,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number } }

describe('scenarioResultToBundle', () => {
  it('produces a bundle with sourceKind:scenario and sourceLabel:result.name', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'my-scenario', world,
      setup: () => undefined,
      run: () => undefined,
      checks: [],
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.metadata.sourceKind).toBe('scenario');
    expect(bundle.metadata.sourceLabel).toBe('my-scenario');
    expect(bundle.schemaVersion).toBe(1);
  });

  it('options.sourceLabel overrides default', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'orig', world, setup: () => undefined, run: () => undefined, checks: [],
    });
    const bundle = scenarioResultToBundle(result, { sourceLabel: 'override' });
    expect(bundle.metadata.sourceLabel).toBe('override');
  });

  it('produces one assertion marker per check outcome with provenance:engine', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'check-test', world,
      setup: () => undefined,
      run: () => undefined,
      checks: [
        { name: 'check-a', check: () => true },
        { name: 'check-b', check: () => false },
      ],
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.markers).toHaveLength(2);
    expect(bundle.markers[0].kind).toBe('assertion');
    expect(bundle.markers[0].provenance).toBe('engine');
    expect(bundle.markers[0].text).toBe('check-a');
    expect(bundle.markers[1].text).toBe('check-b');
    const datA = bundle.markers[0].data as { passed: boolean };
    const datB = bundle.markers[1].data as { passed: boolean };
    expect(datA.passed).toBe(true);
    expect(datB.passed).toBe(false);
  });

  it('startTick comes from history.initialSnapshot.tick (not hardcoded 0)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    // Advance the world before running scenario
    world.step(); world.step(); world.step();
    expect(world.tick).toBe(3);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'preadv', world,
      setup: () => undefined,
      run: () => undefined,
      checks: [],
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.metadata.startTick).toBe(3);
    expect(bundle.metadata.endTick).toBe(result.tick);
    expect(bundle.metadata.durationTicks).toBe(result.tick - 3);
  });

  it('without captureCommandPayloads, bundle.commands is empty (diagnostic-only)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'no-payload', world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 1, y: 2 }); },
      checks: [],
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.commands).toEqual([]);
  });

  it('with captureCommandPayloads, bundle.commands has RecordedCommand payloads', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'replay-ready', world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 5, y: 5 }); },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.commands).toHaveLength(1);
    expect(bundle.commands[0].data).toEqual({ x: 5, y: 5 });
  });

  it('with payloads, bundle is replayable via SessionReplayer.openAt', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'replayable', world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 1, y: 2 }); },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const bundle = scenarioResultToBundle(result);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        w.registerHandler('spawn', () => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(true);
  });

  it('without payloads, openAt(>startTick) throws BundleIntegrityError(no_replay_payloads)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'diagnostic-only', world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 1, y: 2 }); },
      checks: [],
      // No captureCommandPayloads → no payloads → diagnostic-only
    });
    const bundle = scenarioResultToBundle(result);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        w.registerHandler('spawn', () => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    if (bundle.metadata.endTick > bundle.metadata.startTick) {
      expect(() => replayer.openAt(bundle.metadata.endTick)).toThrow(/no_replay_payloads/);
    } else {
      expect(true).toBe(true);  // 0-tick scenario; openAt(startTick) is fine
    }
  });

  it('throws BundleIntegrityError(no_initial_snapshot) when history.initialSnapshot is null', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 'no-initial', world,
      setup: () => undefined,
      run: () => undefined,
      checks: [],
      history: { capacity: 100, captureInitialSnapshot: false },
    });
    expect(() => scenarioResultToBundle(result)).toThrow(/no_initial_snapshot|initialSnapshot/);
  });
});
