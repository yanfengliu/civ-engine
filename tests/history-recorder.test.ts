import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import {
  WorldHistoryRecorder,
  summarizeWorldHistoryRange,
} from '../src/history-recorder.js';
import { WorldDebugger } from '../src/world-debugger.js';
import type { Position } from '../src/types.js';

type Events = { moved: { entity: number; x: number; y: number } };
type Commands = { move: { entity: number; x: number; y: number } };

function createWorld(): World<Events, Commands> {
  const world = new World<Events, Commands>({
    gridWidth: 8,
    gridHeight: 8,
    tps: 10,
    detectInPlacePositionMutations: false,
  });
  world.registerComponent<Position>('position');
  world.registerComponent<{ hp: number }>('health');
  return world;
}

describe('WorldHistoryRecorder', () => {
  it('captures command outcomes and per-tick history', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 0, y: 0 });
    world.addComponent(unit, 'health', { hp: 10 });
    world.registerValidator('move', (data) =>
      data.x >= 0
        ? true
        : {
            code: 'blocked_target',
            message: 'Target x must be non-negative',
            details: { x: data.x, y: data.y },
          },
    );
    world.registerHandler('move', (data, activeWorld) => {
      activeWorld.setPosition(data.entity, { x: data.x, y: data.y });
      activeWorld.emit('moved', { entity: data.entity, x: data.x, y: data.y });
    });

    const recorder = new WorldHistoryRecorder({
      world,
      debug: new WorldDebugger({ world }),
    });
    recorder.connect();

    const rejected = world.submitWithResult('move', { entity: unit, x: -1, y: 0 });
    const accepted = world.submitWithResult('move', { entity: unit, x: 2, y: 3 });
    world.step();

    const state = recorder.getState();

    expect(state.schemaVersion).toBe(1);
    expect(state.initialSnapshot?.tick).toBe(0);
    expect(state.commands).toEqual([rejected, accepted]);
    expect(state.ticks).toHaveLength(1);
    expect(state.ticks[0].tick).toBe(1);
    expect(state.ticks[0].events).toEqual([
      { type: 'moved', data: { entity: unit, x: 2, y: 3 } },
    ]);
    expect(state.ticks[0].diff.tick).toBe(1);
    expect(state.ticks[0].metrics?.tick).toBe(1);
    expect(state.ticks[0].debug?.tick).toBe(1);
  });

  it('enforces bounded history capacity', () => {
    const world = createWorld();
    const recorder = new WorldHistoryRecorder<Events, Commands>({
      world,
      capacity: 2,
      commandCapacity: 2,
      captureInitialSnapshot: false,
    });
    world.registerHandler('move', () => {});
    recorder.connect();

    world.submitWithResult('move', { entity: 0, x: 1, y: 1 });
    world.submitWithResult('move', { entity: 0, x: 2, y: 2 });
    world.submitWithResult('move', { entity: 0, x: 3, y: 3 });
    world.step();
    world.step();
    world.step();

    expect(recorder.getCommandHistory()).toHaveLength(2);
    expect(recorder.getCommandHistory().map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(recorder.getTickHistory()).toHaveLength(2);
    expect(recorder.getTickHistory().map((entry) => entry.tick)).toEqual([2, 3]);
  });

  it('summarizes a tick range for AI-facing history comparisons', () => {
    const world = createWorld();
    const unit = world.createEntity();
    world.setPosition(unit, { x: 0, y: 0 });
    world.registerValidator('move', (data) =>
      data.x >= 0
        ? true
        : {
            code: 'blocked_target',
            message: 'Target x must be non-negative',
            details: { x: data.x, y: data.y },
          },
    );
    world.registerHandler('move', (data, activeWorld) => {
      activeWorld.setPosition(data.entity, { x: data.x, y: data.y });
      activeWorld.emit('moved', { entity: data.entity, x: data.x, y: data.y });
    });

    const recorder = new WorldHistoryRecorder({
      world,
      debug: new WorldDebugger({ world }),
    });
    recorder.connect();

    world.submitWithResult('move', { entity: unit, x: -1, y: 0 });
    world.submitWithResult('move', { entity: unit, x: 2, y: 3 });
    world.step();
    world.submitWithResult('move', { entity: unit, x: 4, y: 3 });
    world.step();

    const summary = summarizeWorldHistoryRange(recorder.getState(), {
      startTick: 1,
      endTick: 2,
    });

    expect(summary).toEqual({
      schemaVersion: 1,
      startTick: 1,
      endTick: 2,
      tickCount: 2,
      ticks: [1, 2],
      changedEntityIds: [unit],
      commandOutcomes: {
        total: 3,
        accepted: 2,
        rejected: 1,
        codes: [
          ['accepted', 2],
          ['blocked_target', 1],
        ],
      },
      events: [['moved', 2]],
      issues: [],
      diff: {
        created: 0,
        destroyed: 0,
        changedEntities: 1,
        componentSets: [['position', 2]],
        componentRemoved: [],
        resourceSets: [],
        resourceRemoved: [],
      },
    });
  });
});
