import { assertJsonCompatible, type JsonValue } from './json.js';
import type { TickDiff } from './diff.js';
import type { WorldSnapshot } from './serializer.js';
import type { EntityId } from './types.js';
import type {
  CommandSubmissionResult,
  World,
  WorldMetrics,
} from './world.js';
import type {
  DebugSeverity,
  WorldDebugSnapshot,
} from './world-debugger.js';
import {
  WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION,
  WORLD_HISTORY_SCHEMA_VERSION,
} from './ai-contract.js';

export interface WorldHistoryTick<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  tick: number;
  diff: TickDiff;
  events: Array<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}

export interface WorldHistoryState<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof WORLD_HISTORY_SCHEMA_VERSION;
  initialSnapshot: WorldSnapshot | null;
  ticks: Array<WorldHistoryTick<TEventMap, TDebug>>;
  commands: Array<CommandSubmissionResult<keyof TCommandMap>>;
}

export interface WorldHistoryIssueSummary {
  code: string;
  severity: DebugSeverity;
  count: number;
}

export interface WorldHistoryRangeSummary {
  schemaVersion: typeof WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION;
  startTick: number;
  endTick: number;
  tickCount: number;
  ticks: number[];
  changedEntityIds: EntityId[];
  commandOutcomes: {
    total: number;
    accepted: number;
    rejected: number;
    codes: Array<[string, number]>;
  };
  events: Array<[string, number]>;
  issues: WorldHistoryIssueSummary[];
  diff: {
    created: number;
    destroyed: number;
    changedEntities: number;
    componentSets: Array<[string, number]>;
    componentRemoved: Array<[string, number]>;
    resourceSets: Array<[string, number]>;
    resourceRemoved: Array<[string, number]>;
  };
}

export class WorldHistoryRecorder<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  private readonly world: World<TEventMap, TCommandMap>;
  private readonly tickCapacity: number;
  private readonly commandCapacity: number;
  private readonly debugCapture?: () => TDebug | null;
  private readonly captureInitialSnapshot: boolean;
  private readonly tickEntries: Array<WorldHistoryTick<TEventMap, TDebug>> = [];
  private readonly commandEntries: Array<
    CommandSubmissionResult<keyof TCommandMap>
  > = [];
  private initialSnapshot: WorldSnapshot | null = null;
  private connected = false;
  private readonly diffListener: (diff: TickDiff) => void;
  private readonly commandListener: (
    result: CommandSubmissionResult<keyof TCommandMap>,
  ) => void;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    capacity?: number;
    commandCapacity?: number;
    debug?: { capture(): TDebug | null };
    captureInitialSnapshot?: boolean;
  }) {
    this.world = config.world;
    this.tickCapacity = config.capacity ?? 64;
    this.commandCapacity = config.commandCapacity ?? Math.max(this.tickCapacity * 4, 64);
    this.debugCapture = config.debug?.capture.bind(config.debug);
    this.captureInitialSnapshot = config.captureInitialSnapshot ?? true;
    this.diffListener = (diff) => this.recordTick(diff);
    this.commandListener = (result) => this.recordCommand(result);
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    if (this.captureInitialSnapshot) {
      this.initialSnapshot = cloneJsonValue(this.world.serialize(), 'history initial snapshot');
    }

    this.world.onDiff(this.diffListener);
    this.world.onCommandResult(this.commandListener);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.world.offDiff(this.diffListener);
    this.world.offCommandResult(this.commandListener);
  }

  clear(): void {
    this.tickEntries.length = 0;
    this.commandEntries.length = 0;
    this.initialSnapshot = this.captureInitialSnapshot
      ? cloneJsonValue(this.world.serialize(), 'history initial snapshot')
      : null;
  }

  getTickHistory(): Array<WorldHistoryTick<TEventMap, TDebug>> {
    return this.tickEntries.map((entry) => cloneJsonValue(entry, 'history tick entry'));
  }

  getCommandHistory(): Array<CommandSubmissionResult<keyof TCommandMap>> {
    return this.commandEntries.map((entry) =>
      cloneJsonValue(entry, 'history command entry'),
    );
  }

  findTick(tick: number): WorldHistoryTick<TEventMap, TDebug> | null {
    const entry = this.tickEntries.find((candidate) => candidate.tick === tick);
    return entry ? cloneJsonValue(entry, `history tick ${tick}`) : null;
  }

  getState(): WorldHistoryState<TEventMap, TCommandMap, TDebug> {
    return {
      schemaVersion: WORLD_HISTORY_SCHEMA_VERSION,
      initialSnapshot: this.initialSnapshot
        ? cloneJsonValue(this.initialSnapshot, 'history initial snapshot')
        : null,
      ticks: this.getTickHistory(),
      commands: this.getCommandHistory(),
    };
  }

  private recordTick(diff: TickDiff): void {
    const debug = this.captureDebug();
    const entry: WorldHistoryTick<TEventMap, TDebug> = {
      tick: diff.tick,
      diff: cloneJsonValue(diff, `history diff tick ${diff.tick}`),
      events: cloneJsonValue(
        [...this.world.getEvents()],
        `history events tick ${diff.tick}`,
      ),
      metrics: this.world.getMetrics(),
      debug,
    };
    pushBounded(this.tickEntries, entry, this.tickCapacity);
  }

  private recordCommand(
    result: CommandSubmissionResult<keyof TCommandMap>,
  ): void {
    pushBounded(
      this.commandEntries,
      cloneJsonValue(result, `history command result ${result.sequence}`),
      this.commandCapacity,
    );
  }

  private captureDebug(): TDebug | null {
    const debug = this.debugCapture?.() ?? null;
    if (debug !== null) {
      assertJsonCompatible(debug, 'history debug payload');
    }
    return debug;
  }
}

export function summarizeWorldHistoryRange<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
>(
  state: WorldHistoryState<TEventMap, TCommandMap, WorldDebugSnapshot>,
  options?: {
    startTick?: number;
    endTick?: number;
  },
): WorldHistoryRangeSummary | null {
  const ticks = state.ticks.filter((entry) => {
    if (options?.startTick !== undefined && entry.tick < options.startTick) {
      return false;
    }
    if (options?.endTick !== undefined && entry.tick > options.endTick) {
      return false;
    }
    return true;
  });

  if (ticks.length === 0) {
    return null;
  }

  const startTick = ticks[0].tick;
  const endTick = ticks[ticks.length - 1].tick;
  const changedEntityIds = new Set<EntityId>();
  const commandCodes = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  const issueCounts = new Map<string, WorldHistoryIssueSummary>();
  const componentSets = new Map<string, number>();
  const componentRemoved = new Map<string, number>();
  const resourceSets = new Map<string, number>();
  const resourceRemoved = new Map<string, number>();
  let created = 0;
  let destroyed = 0;

  for (const tick of ticks) {
    created += tick.diff.entities.created.length;
    destroyed += tick.diff.entities.destroyed.length;
    addEntityIds(changedEntityIds, tick.diff.entities.created);
    addEntityIds(changedEntityIds, tick.diff.entities.destroyed);

    for (const [key, changes] of Object.entries(tick.diff.components)) {
      increment(componentSets, key, changes.set.length);
      increment(componentRemoved, key, changes.removed.length);
      addEntityIds(
        changedEntityIds,
        changes.set.map(([id]) => id),
      );
      addEntityIds(changedEntityIds, changes.removed);
    }

    for (const [key, changes] of Object.entries(tick.diff.resources)) {
      increment(resourceSets, key, changes.set.length);
      increment(resourceRemoved, key, changes.removed.length);
      addEntityIds(
        changedEntityIds,
        changes.set.map(([id]) => id),
      );
      addEntityIds(changedEntityIds, changes.removed);
    }

    for (const event of tick.events) {
      increment(eventCounts, String(event.type), 1);
    }

    const debug = tick.debug;
    if (debug !== null) {
      for (const issue of debug.issues) {
        const issueKey = `${issue.severity}:${issue.code}`;
        const current = issueCounts.get(issueKey);
        if (current) {
          current.count++;
        } else {
          issueCounts.set(issueKey, {
            code: issue.code,
            severity: issue.severity,
            count: 1,
          });
        }
      }
    }
  }

  const commands = state.commands.filter(
    (entry) => entry.tick >= Math.max(0, startTick - 1) && entry.tick <= endTick,
  );
  let accepted = 0;
  let rejected = 0;
  for (const command of commands) {
    if (command.accepted) {
      accepted++;
    } else {
      rejected++;
    }
    increment(commandCodes, command.code, 1);
  }

  const summary: WorldHistoryRangeSummary = {
    schemaVersion: WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION,
    startTick,
    endTick,
    tickCount: ticks.length,
    ticks: ticks.map((entry) => entry.tick),
    changedEntityIds: [...changedEntityIds].sort((a, b) => a - b),
    commandOutcomes: {
      total: commands.length,
      accepted,
      rejected,
      codes: sortTupleCounts(commandCodes),
    },
    events: sortTupleCounts(eventCounts),
    issues: [...issueCounts.values()].sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity.localeCompare(b.severity);
      }
      return a.code.localeCompare(b.code);
    }),
    diff: {
      created,
      destroyed,
      changedEntities: changedEntityIds.size,
      componentSets: sortTupleCounts(componentSets),
      componentRemoved: sortTupleCounts(componentRemoved),
      resourceSets: sortTupleCounts(resourceSets),
      resourceRemoved: sortTupleCounts(resourceRemoved),
    },
  };
  assertJsonCompatible(summary, 'history range summary');
  return summary;
}

function pushBounded<T>(target: T[], value: T, capacity: number): void {
  target.push(value);
  if (target.length > capacity) {
    target.splice(0, target.length - capacity);
  }
}

function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}

function increment(target: Map<string, number>, key: string, amount: number): void {
  if (amount === 0) {
    return;
  }
  target.set(key, (target.get(key) ?? 0) + amount);
}

function addEntityIds(target: Set<EntityId>, ids: Iterable<EntityId>): void {
  for (const id of ids) {
    target.add(id);
  }
}

function sortTupleCounts(counts: Map<string, number>): Array<[string, number]> {
  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });
}
