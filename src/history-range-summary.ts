// `summarizeWorldHistoryRange` + its private aggregation helpers. Extracted
// from `src/history-recorder.ts` (LOC-budget split, v0.8.15); re-exported
// from there so the import path and `index.ts` star-export are unchanged.

import { assertJsonCompatible } from './json.js';
import type { EntityId } from './types.js';
import type { WorldDebugSnapshot } from './world-debugger.js';
import { WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION } from './ai-contract.js';
import type {
  WorldHistoryIssueSummary,
  WorldHistoryRangeSummary,
  WorldHistoryState,
} from './history-recorder.js';

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

  const executions = state.executions.filter(
    (entry) => entry.tick >= startTick && entry.tick <= endTick,
  );
  const executionCodes = new Map<string, number>();
  let executed = 0;
  let failed = 0;
  for (const execution of executions) {
    if (execution.executed) {
      executed++;
    } else {
      failed++;
    }
    increment(executionCodes, execution.code, 1);
  }

  const failures = state.failures.filter(
    (entry) => entry.tick >= startTick && entry.tick <= endTick,
  );
  const failureCodes = new Map<string, number>();
  for (const failure of failures) {
    increment(failureCodes, failure.code, 1);
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
    executionOutcomes: {
      total: executions.length,
      executed,
      failed,
      codes: sortTupleCounts(executionCodes),
    },
    events: sortTupleCounts(eventCounts),
    issues: [...issueCounts.values()].sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity.localeCompare(b.severity);
      }
      return a.code.localeCompare(b.code);
    }),
    failures: sortTupleCounts(failureCodes),
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
