import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import { OccupancyGrid } from '../src/occupancy-grid.js';
import { VisibilityMap } from '../src/visibility-map.js';
import { createGridPathQueue } from '../src/path-service.js';
import {
  WorldDebugger,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from '../src/world-debugger.js';
import type { Position } from '../src/types.js';

type Events = { ping: { id: number } };
type Commands = Record<string, never>;

describe('WorldDebugger', () => {
  it('captures core world summaries and external probe data', () => {
    const world = new World<Events, Commands>({
      gridWidth: 8,
      gridHeight: 8,
      tps: 10,
      detectInPlacePositionMutations: false,
    });
    world.registerComponent<Position>('position');
    world.registerComponent<{ role: string }>('unit');
    world.registerResource('gold', { defaultMax: 100 });

    const first = world.createEntity();
    world.setPosition(first, { x: 2, y: 2 });
    world.addComponent(first, 'unit', { role: 'worker' });
    world.addResource(first, 'gold', 10);

    const second = world.createEntity();
    world.setPosition(second, { x: 2, y: 2 });
    world.addComponent(second, 'unit', { role: 'soldier' });

    world.registerSystem((w) => {
      w.emit('ping', { id: first });
    });

    const occupancy = new OccupancyGrid(8, 8);
    occupancy.block([{ x: 0, y: 0 }]);
    occupancy.occupy(first, { x: 1, y: 1, width: 2, height: 1 });
    occupancy.reserve(second, [{ x: 4, y: 4 }]);

    const visibility = new VisibilityMap(8, 8);
    visibility.setSource('player-1', 'scout', { x: 2, y: 2, radius: 2 });
    visibility.update();

    const pathQueue = createGridPathQueue({ width: 8, height: 8 });
    pathQueue.enqueue({
      start: { x: 0, y: 0 },
      goal: { x: 7, y: 7 },
    });

    world.step();

    const debuggerSnapshot = new WorldDebugger({
      world,
      probes: [
        createOccupancyDebugProbe('occupancy', occupancy),
        createVisibilityDebugProbe('visibility', visibility),
        createPathQueueDebugProbe('paths', pathQueue),
      ],
    }).capture();

    expect(debuggerSnapshot.schemaVersion).toBe(1);
    expect(debuggerSnapshot.entityCount).toBe(2);
    expect(debuggerSnapshot.componentStoreCount).toBe(2);
    expect(debuggerSnapshot.components).toEqual([
      { key: 'position', entityCount: 2 },
      { key: 'unit', entityCount: 2 },
    ]);
    expect(debuggerSnapshot.resources).toEqual([
      {
        key: 'gold',
        entityCount: 1,
        totalCurrent: 10,
        boundedEntities: 1,
        unboundedEntities: 0,
      },
    ]);
    expect(debuggerSnapshot.spatial).toEqual({
      positionKey: 'position',
      entitiesWithPosition: 2,
      entitiesWithoutPosition: 0,
      occupiedCells: 1,
      maxStack: 2,
      densestCells: [{ x: 2, y: 2, count: 2 }],
    });
    expect(debuggerSnapshot.events).toEqual([{ type: 'ping', count: 1 }]);
    expect(debuggerSnapshot.probes).toEqual({
      occupancy: {
        width: 8,
        height: 8,
        version: 3,
        blockedCells: 1,
        occupiedEntities: 1,
        occupiedCells: 2,
        reservedEntities: 1,
        reservedCells: 1,
      },
      paths: {
        enqueued: 1,
        processed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        pending: 1,
        cacheSize: 0,
      },
      visibility: {
        width: 8,
        height: 8,
        players: [
          {
            playerId: 'player-1',
            sourceCount: 1,
            visibleCells: 13,
            exploredCells: 13,
          },
        ],
      },
    });
    expect(debuggerSnapshot.metrics?.tick).toBe(1);
    expect(debuggerSnapshot.diff?.tick).toBe(1);
    expect(debuggerSnapshot.issues).toEqual([]);
    expect(debuggerSnapshot.warnings).toEqual([]);
  });

  it('warns when the last diff recycled an entity ID in one tick', () => {
    const world = new World<Events, Commands>({
      gridWidth: 8,
      gridHeight: 8,
      tps: 10,
      detectInPlacePositionMutations: false,
    });
    world.registerComponent<Position>('position');
    world.registerComponent<{ asset: string }>('renderable');

    const entity = world.createEntity();
    world.setPosition(entity, { x: 0, y: 0 });
    world.addComponent(entity, 'renderable', { asset: 'old' });

    let recycled = false;
    world.registerSystem((w) => {
      if (recycled) return;
      recycled = true;
      w.destroyEntity(entity);
      const replacement = w.createEntity();
      expect(replacement).toBe(entity);
      w.setPosition(replacement, { x: 1, y: 1 });
      w.addComponent(replacement, 'renderable', { asset: 'new' });
    });

    world.step();

    const debuggerSnapshot = new WorldDebugger({ world }).capture();

    expect(debuggerSnapshot.diff?.overlappingEntityIds).toEqual([entity]);
    expect(debuggerSnapshot.issues).toEqual([
      {
        severity: 'warn',
        code: 'entity-id-recycled-in-diff',
        message:
          'The last diff both destroyed and created at least one entity ID. Raw TickDiff clients should resync or use generation-aware projections.',
        subsystem: 'diff',
        entityIds: [entity],
        details: {
          overlappingEntityIds: [entity],
        },
        suggestedActions: [
          'Request a fresh snapshot before continuing from raw TickDiff state.',
          'Prefer generation-aware projections through RenderAdapter.',
        ],
      },
    ]);
    expect(debuggerSnapshot.warnings).toEqual([
      {
        severity: 'warn',
        code: 'entity-id-recycled-in-diff',
        message:
          'The last diff both destroyed and created at least one entity ID. Raw TickDiff clients should resync or use generation-aware projections.',
      },
    ]);
  });

  it('reports a performance issue when a tick exceeds its budget', () => {
    const world = new World<Events, Commands>({
      gridWidth: 8,
      gridHeight: 8,
      tps: 1000,
      detectInPlacePositionMutations: false,
    });

    world.registerSystem({
      name: 'BusySystem',
      phase: 'update',
      execute: () => {
        const start = performance.now();
        while (performance.now() - start < 3) {
          // busy wait for a deterministic budget breach in tests
        }
      },
    });

    world.step();

    const debuggerSnapshot = new WorldDebugger({ world }).capture();
    const issue = debuggerSnapshot.issues.find(
      (candidate) => candidate.code === 'tick-budget-exceeded',
    );

    expect(issue).toBeDefined();
    expect(issue).toMatchObject({
      severity: 'warn',
      code: 'tick-budget-exceeded',
      subsystem: 'performance',
      details: {
        tps: 1000,
        tickBudgetMs: 1,
        pendingCommands: 0,
        processedCommands: 0,
        slowSystems: [
          {
            name: 'BusySystem',
            phase: 'update',
          },
        ],
      },
    });
  });
});
