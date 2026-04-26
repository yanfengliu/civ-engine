import { assertJsonCompatible, type JsonValue } from './json.js';
import type { OccupancyGrid } from './occupancy-grid.js';
import type { PathRequestQueueStats } from './path-service.js';
import type { VisibilityMap, VisibilityPlayerId } from './visibility-map.js';
import type { TickDiff } from './diff.js';
import type { EntityId, Position } from './types.js';
import type { TickFailure, World, WorldMetrics } from './world.js';
import { WORLD_DEBUG_SCHEMA_VERSION } from './ai-contract.js';

export type DebugSeverity = 'info' | 'warn' | 'error';

export interface DebugWarning {
  severity: DebugSeverity;
  code: string;
  message: string;
}

export interface DebugIssue extends DebugWarning {
  subsystem: string;
  entityIds?: EntityId[];
  details?: JsonValue | null;
  suggestedActions?: string[];
}

export interface DebugComponentSummary {
  key: string;
  entityCount: number;
}

export interface DebugResourceSummary {
  key: string;
  entityCount: number;
  totalCurrent: number;
  boundedEntities: number;
  unboundedEntities: number;
}

export interface DebugSpatialCell {
  x: number;
  y: number;
  count: number;
}

export interface DebugSpatialSummary {
  positionKey: string;
  entitiesWithPosition: number;
  entitiesWithoutPosition: number;
  occupiedCells: number;
  maxStack: number;
  densestCells: DebugSpatialCell[];
}

export interface DebugEventSummary {
  type: string;
  count: number;
}

export interface DebugDiffSummary {
  tick: number;
  created: number;
  destroyed: number;
  changedEntities: number;
  componentSets: Array<[string, number]>;
  componentRemoved: Array<[string, number]>;
  resourceSets: Array<[string, number]>;
  resourceRemoved: Array<[string, number]>;
  overlappingEntityIds: EntityId[];
}

export interface OccupancyDebugSnapshot {
  width: number;
  height: number;
  version: number;
  blockedCells: number;
  occupiedEntities: number;
  occupiedCells: number;
  reservedEntities: number;
  reservedCells: number;
}

export interface VisibilityPlayerDebugSnapshot {
  playerId: VisibilityPlayerId;
  sourceCount: number;
  visibleCells: number;
  exploredCells: number;
}

export interface VisibilityDebugSnapshot {
  width: number;
  height: number;
  players: VisibilityPlayerDebugSnapshot[];
}

export interface DebugProbe<TValue = unknown> {
  key: string;
  capture(): TValue;
}

export interface WorldDebugSnapshot {
  schemaVersion: typeof WORLD_DEBUG_SCHEMA_VERSION;
  tick: number;
  entityCount: number;
  componentStoreCount: number;
  components: DebugComponentSummary[];
  resources: DebugResourceSummary[];
  spatial: DebugSpatialSummary;
  metrics: WorldMetrics | null;
  diff: DebugDiffSummary | null;
  tickFailure: TickFailure | null;
  events: DebugEventSummary[];
  probes: Record<string, JsonValue>;
  issues: DebugIssue[];
  warnings: DebugWarning[];
}

export class WorldDebugger<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private readonly world: World<TEventMap, TCommandMap>;
  private readonly probes = new Map<string, () => unknown>();

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    probes?: Array<DebugProbe>;
  }) {
    this.world = config.world;
    for (const probe of config.probes ?? []) {
      this.addProbe(probe);
    }
  }

  addProbe<TValue>(probe: DebugProbe<TValue>): void {
    this.probes.set(probe.key, () => probe.capture());
  }

  removeProbe(key: string): void {
    this.probes.delete(key);
  }

  capture(): WorldDebugSnapshot {
    const snapshot = this.world.serialize({ inspectPoisoned: true });
    const metrics = this.world.getMetrics();
    const diff = summarizeDiff(this.world.getDiff());
    const tickFailure = this.world.getLastTickFailure();
    const events = summarizeEvents(this.world.getEvents());
    const entityCount = countAlive(snapshot.entities.alive);
    const components = summarizeComponents(snapshot.components);
    const resources = summarizeResources(
      'resources' in snapshot ? snapshot.resources.pools : {},
    );
    const spatial = summarizeSpatial(
      snapshot.components[snapshot.config.positionKey ?? 'position'] ?? [],
      snapshot.config.positionKey ?? 'position',
      entityCount,
      snapshot.config.gridWidth,
    );
    const probes = this.captureProbes();
    const issues = collectIssues(metrics, diff, tickFailure);

    const result: WorldDebugSnapshot = {
      schemaVersion: WORLD_DEBUG_SCHEMA_VERSION,
      tick: snapshot.tick,
      entityCount,
      componentStoreCount: Object.keys(snapshot.components).length,
      components,
      resources,
      spatial,
      metrics,
      diff,
      tickFailure,
      events,
      probes,
      issues,
      warnings: issues.map(({ severity, code, message }) => ({
        severity,
        code,
        message,
      })),
    };
    assertJsonCompatible(result, 'world debugger snapshot');
    return result;
  }

  private captureProbes(): Record<string, JsonValue> {
    const probes: Record<string, JsonValue> = {};
    for (const [key, capture] of [...this.probes.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      const value = capture();
      assertJsonCompatible(value, `debug probe '${key}'`);
      probes[key] = value as JsonValue;
    }
    return probes;
  }
}

export function createOccupancyDebugProbe(
  key: string,
  occupancy: OccupancyGrid,
): DebugProbe<OccupancyDebugSnapshot> {
  return {
    key,
    capture: () => {
      const state = occupancy.getState();
      return {
        width: state.width,
        height: state.height,
        version: state.version,
        blockedCells: state.blocked.length,
        occupiedEntities: state.occupied.length,
        occupiedCells: sumCellClaims(state.occupied),
        reservedEntities: state.reservations.length,
        reservedCells: sumCellClaims(state.reservations),
      };
    },
  };
}

export function createVisibilityDebugProbe(
  key: string,
  visibility: VisibilityMap,
): DebugProbe<VisibilityDebugSnapshot> {
  return {
    key,
    capture: () => {
      const state = visibility.getState();
      return {
        width: state.width,
        height: state.height,
        players: state.players
          .map(([playerId, player]) => ({
            playerId,
            sourceCount: player.sources.length,
            visibleCells: visibility.getVisibleCells(playerId).length,
            exploredCells: player.explored.length,
          }))
          .sort(compareByPlayerId),
      };
    },
  };
}

export function createPathQueueDebugProbe(
  key: string,
  queue: { getStats(): PathRequestQueueStats },
): DebugProbe<PathRequestQueueStats> {
  return {
    key,
    capture: () => queue.getStats(),
  };
}

function countAlive(alive: boolean[]): number {
  return alive.reduce((sum, current) => sum + (current ? 1 : 0), 0);
}

function summarizeComponents(
  components: Record<string, Array<[EntityId, unknown]>>,
): DebugComponentSummary[] {
  return Object.entries(components)
    .map(([key, entries]) => ({
      key,
      entityCount: entries.length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function summarizeResources(
  pools: Record<string, Array<[EntityId, { current: number; max: number | null }]>>,
): DebugResourceSummary[] {
  return Object.entries(pools)
    .map(([key, entries]) => ({
      key,
      entityCount: entries.length,
      totalCurrent: round(
        entries.reduce((sum, [, pool]) => sum + pool.current, 0),
      ),
      boundedEntities: entries.filter(([, pool]) => pool.max !== null).length,
      unboundedEntities: entries.filter(([, pool]) => pool.max === null).length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function summarizeSpatial(
  positions: Array<[EntityId, unknown]>,
  positionKey: string,
  entityCount: number,
  gridWidth: number,
): DebugSpatialSummary {
  const counts = new Map<number, { x: number; y: number; count: number }>();

  for (const [, value] of positions) {
    const position = value as Position;
    const index = position.y * gridWidth + position.x;
    const current = counts.get(index);
    if (current) {
      current.count++;
    } else {
      counts.set(index, { x: position.x, y: position.y, count: 1 });
    }
  }

  const densestCells = [...counts.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    })
    .slice(0, 5)
    .map((cell) => ({ x: cell.x, y: cell.y, count: cell.count }));

  return {
    positionKey,
    entitiesWithPosition: positions.length,
    entitiesWithoutPosition: Math.max(0, entityCount - positions.length),
    occupiedCells: counts.size,
    maxStack: densestCells[0]?.count ?? 0,
    densestCells,
  };
}

function summarizeEvents(
  events: ReadonlyArray<{ type: PropertyKey; data: unknown }>,
): DebugEventSummary[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const type = String(event.type);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

function summarizeDiff(diff: TickDiff | null): DebugDiffSummary | null {
  if (!diff) return null;

  const overlappingEntityIds = diff.entities.created.filter((id) =>
    diff.entities.destroyed.includes(id),
  );
  const changedEntities = new Set<EntityId>([
    ...diff.entities.created,
    ...diff.entities.destroyed,
  ]);

  const componentSets: Array<[string, number]> = [];
  const componentRemoved: Array<[string, number]> = [];
  for (const [key, changes] of Object.entries(diff.components).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    componentSets.push([key, changes.set.length]);
    componentRemoved.push([key, changes.removed.length]);
    for (const [id] of changes.set) changedEntities.add(id);
    for (const id of changes.removed) changedEntities.add(id);
  }

  const resourceSets: Array<[string, number]> = [];
  const resourceRemoved: Array<[string, number]> = [];
  for (const [key, changes] of Object.entries(diff.resources).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    resourceSets.push([key, changes.set.length]);
    resourceRemoved.push([key, changes.removed.length]);
    for (const [id] of changes.set) changedEntities.add(id);
    for (const id of changes.removed) changedEntities.add(id);
  }

  return {
    tick: diff.tick,
    created: diff.entities.created.length,
    destroyed: diff.entities.destroyed.length,
    changedEntities: changedEntities.size,
    componentSets,
    componentRemoved,
    resourceSets,
    resourceRemoved,
    overlappingEntityIds: overlappingEntityIds.sort((a, b) => a - b),
  };
}

function collectIssues(
  metrics: WorldMetrics | null,
  diff: DebugDiffSummary | null,
  tickFailure: TickFailure | null,
): DebugIssue[] {
  const issues: DebugIssue[] = [];

  if (tickFailure) {
    issues.push({
      severity: 'error',
      code: tickFailure.code,
      message: tickFailure.message,
      subsystem: tickFailure.subsystem,
      details: {
        phase: tickFailure.phase,
        commandType: tickFailure.commandType,
        submissionSequence: tickFailure.submissionSequence,
        systemName: tickFailure.systemName,
        error: tickFailure.error,
        details: tickFailure.details,
      },
      suggestedActions: suggestedActionsForTickFailure(tickFailure),
    });
  }

  if (diff && diff.overlappingEntityIds.length > 0) {
    issues.push({
      severity: 'warn',
      code: 'entity-id-recycled-in-diff',
      message:
        'The last diff both destroyed and created at least one entity ID. Raw TickDiff clients should resync or use generation-aware projections.',
      subsystem: 'diff',
      entityIds: diff.overlappingEntityIds,
      details: {
        overlappingEntityIds: diff.overlappingEntityIds,
      },
      suggestedActions: [
        'Request a fresh snapshot before continuing from raw TickDiff state.',
        'Prefer generation-aware projections through RenderAdapter.',
      ],
    });
  }

  if (metrics) {
    const overBudgetMs =
      metrics.durationMs.total - metrics.simulation.tickBudgetMs;
    const warningThresholdMs = Math.max(1, metrics.simulation.tickBudgetMs * 0.25);
    if (overBudgetMs > warningThresholdMs) {
      issues.push({
        severity: 'warn',
        code: 'tick-budget-exceeded',
        message:
          'The last tick exceeded the configured tick budget. An AI client should inspect slow systems before trusting real-time pacing assumptions.',
        subsystem: 'performance',
        details: {
          tps: metrics.simulation.tps,
          tickBudgetMs: round(metrics.simulation.tickBudgetMs),
          totalMs: round(metrics.durationMs.total),
          overBudgetMs: round(overBudgetMs),
          pendingCommands: metrics.commandStats.pendingBeforeTick,
          processedCommands: metrics.commandStats.processed,
          slowSystems: metrics.systems
            .slice()
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, 3)
            .map((system) => ({
              name: system.name,
              phase: system.phase,
              durationMs: round(system.durationMs),
            })),
        },
        suggestedActions: [
          'Inspect the slowSystems list and move the hottest logic behind narrower queries or cheaper data paths.',
          'Reduce work per tick or lower TPS if the current real-time budget is not required.',
        ],
      });
    }
  }

  return issues;
}

function suggestedActionsForTickFailure(
  failure: TickFailure,
): string[] {
  switch (failure.phase) {
    case 'commands':
      return [
        'Inspect the matching command submission and execution results before retrying the command.',
        'Verify that the handler exists and that command payload invariants are checked in validators.',
      ];
    case 'systems':
      return [
        'Inspect the named system and the entities it touches in the recorded tick history.',
        'Turn repeated assumptions into validators or explicit invariant checks with stable codes.',
      ];
    case 'listeners':
      return [
        'Inspect diff listeners or adapter callbacks rather than the simulation state itself.',
        'Treat listener failures as integration bugs and retry after the observer is fixed.',
      ];
    default:
      return [
        'Inspect the phase-specific runtime failure details before retrying the scenario.',
      ];
  }
}

function sumCellClaims(
  claims: Array<[EntityId, number[]]>,
): number {
  return claims.reduce((sum, [, cells]) => sum + cells.length, 0);
}

function compareByPlayerId(
  a: VisibilityPlayerDebugSnapshot,
  b: VisibilityPlayerDebugSnapshot,
): number {
  return normalizePlayerId(a.playerId).localeCompare(normalizePlayerId(b.playerId));
}

function normalizePlayerId(playerId: VisibilityPlayerId): string {
  return typeof playerId === 'number' ? `n:${playerId}` : `s:${playerId}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
