import { describe, expect, it } from 'vitest';
import { World, WorldHistoryRecorder, runScenario } from '../src/index.js';
import type { RecordedCommand, WorldConfig } from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number; phase?: string } }

describe('WorldHistoryRecorder.captureCommandPayloads', () => {
  it('default config: recordedCommands is undefined; commands is CommandSubmissionResult[]', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec = new WorldHistoryRecorder<Record<string, never>, Cmds>({ world });
    rec.connect();
    world.submit('spawn', { x: 1, y: 2 });
    world.step();
    const state = rec.getState();
    expect(state.recordedCommands).toBeUndefined();
    expect(state.commands).toHaveLength(1);
    rec.disconnect();
  });

  it('captureCommandPayloads:true populates recordedCommands with full payload', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec = new WorldHistoryRecorder<Record<string, never>, Cmds>({
      world, captureCommandPayloads: true,
    });
    rec.connect();
    world.submit('spawn', { x: 1, y: 2 });
    world.submit('spawn', { x: 3, y: 4 });
    world.step();
    const state = rec.getState();
    const recorded = state.recordedCommands as RecordedCommand<Cmds>[];
    expect(recorded).toHaveLength(2);
    expect(recorded[0].type).toBe('spawn');
    expect(recorded[0].data).toEqual({ x: 1, y: 2 });
    expect(recorded[1].data).toEqual({ x: 3, y: 4 });
    rec.disconnect();
  });

  it('two recorders with captureCommandPayloads:true cannot coexist on same world', () => {
    const world = new World(mkConfig());
    const rec1 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    const rec2 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    expect(() => rec2.connect()).toThrow(/recorder_already_attached|already attached/);
    rec1.disconnect();
  });

  it('default-config recorder + payload-capturing recorder coexist', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec1 = new WorldHistoryRecorder<Record<string, never>, Cmds>({ world });
    const rec2 = new WorldHistoryRecorder<Record<string, never>, Cmds>({
      world, captureCommandPayloads: true,
    });
    rec1.connect();
    rec2.connect();
    world.submit('spawn', { x: 0, y: 0 });
    world.step();
    expect(rec1.getState().commands).toHaveLength(1);
    expect((rec2.getState().recordedCommands as RecordedCommand<Cmds>[])).toHaveLength(1);
    rec1.disconnect();
    rec2.disconnect();
  });

  it('disconnect unwraps submitWithResult; payload slot cleared', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec1 = new WorldHistoryRecorder<Record<string, never>, Cmds>({
      world, captureCommandPayloads: true,
    });
    rec1.connect();
    expect(world.__payloadCapturingRecorder).toBeDefined();
    rec1.disconnect();
    expect(world.__payloadCapturingRecorder).toBeUndefined();
    // Behavioral: post-disconnect submission isn't recorded
    world.submit('spawn', { x: 99, y: 99 });
    world.step();
    const recorded = (rec1.getState().recordedCommands as RecordedCommand<Cmds>[]) ?? [];
    expect(recorded.find((rc) => rc.data.x === 99)).toBeUndefined();
  });

  it('submit() and submitWithResult() both captured (single wrap on submitWithResult)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec = new WorldHistoryRecorder<Record<string, never>, Cmds>({
      world, captureCommandPayloads: true,
    });
    rec.connect();
    world.submit('spawn', { x: 0, y: 0, phase: 'submit' });
    world.submitWithResult('spawn', { x: 0, y: 0, phase: 'submitWithResult' });
    const recorded = rec.getState().recordedCommands as RecordedCommand<Cmds>[];
    expect(recorded).toHaveLength(2);
    expect(recorded[0].data.phase).toBe('submit');
    expect(recorded[1].data.phase).toBe('submitWithResult');
    rec.disconnect();
  });

  it('clear() resets recordedCommands (so post-setup scenario rebase is clean)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const rec = new WorldHistoryRecorder<Record<string, never>, Cmds>({
      world, captureCommandPayloads: true,
    });
    rec.connect();
    world.submit('spawn', { x: 0, y: 0, phase: 'setup' });
    world.step();
    expect((rec.getState().recordedCommands as RecordedCommand<Cmds>[])).toHaveLength(1);
    rec.clear();
    expect((rec.getState().recordedCommands as RecordedCommand<Cmds>[])).toHaveLength(0);
    world.submit('spawn', { x: 0, y: 0, phase: 'run' });
    world.step();
    const after = rec.getState().recordedCommands as RecordedCommand<Cmds>[];
    expect(after).toHaveLength(1);
    expect(after[0].data.phase).toBe('run');
    rec.disconnect();
  });

  it('runScenario({ history: { captureCommandPayloads: true } }) threads option through', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 't4-thread-test',
      world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 1, y: 2 }); },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const recorded = result.history.recordedCommands as RecordedCommand<Cmds>[] | undefined;
    expect(recorded).toBeDefined();
    expect(recorded).toHaveLength(1);
    expect(recorded![0].data).toEqual({ x: 1, y: 2 });
  });

  it('runScenario default (no captureCommandPayloads) does not populate recordedCommands', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runScenario<Record<string, never>, Cmds>({
      name: 't4-no-payload',
      world,
      setup: () => undefined,
      run: (ctx) => { ctx.submit('spawn', { x: 1, y: 2 }); },
      checks: [],
      history: { capacity: 100 },  // no captureCommandPayloads
    });
    expect(result.history.recordedCommands).toBeUndefined();
    expect(result.history.commands).toHaveLength(1);
  });
});
