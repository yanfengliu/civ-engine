// Input/output adapters between MCP tool schemas (flat JSON) and the engine's
// richer TypeScript shapes (RegExp keys, NumberRange/IsoTimeRange objects,
// TickFrame methods that need worldFactory).

import {
  bundleCount,
  commandRateStats,
  commandTypeCounts,
  commandValidationAcceptanceRate,
  eventRateStats,
  eventTypeCounts,
  executionFailureRate,
  failedTickRate,
  failureBundleRate,
  incompleteBundleRate,
  sessionLengthStats,
  snapshotAtTick,
} from 'civ-engine';
import type { BundleCorpusEntry, BundleQuery } from 'civ-engine';
import type { CorpusState } from './state.js';

/**
 * The 11 built-in behavioral metrics, selectable by name. Null-prototype so a
 * metric name like `constructor`/`__proto__`/`toString` can't resolve an
 * inherited Object.prototype member past the `!factory` guard at the lookup
 * sites — it returns undefined and yields the clean "unknown metric" error
 * (full-review 2026-06-13 L1).
 */
export const METRIC_FACTORIES: Record<string, () => unknown> = Object.assign(Object.create(null) as Record<string, () => unknown>, {
  bundleCount,
  sessionLengthStats,
  commandRateStats,
  eventRateStats,
  commandTypeCounts,
  eventTypeCounts,
  failureBundleRate,
  failedTickRate,
  incompleteBundleRate,
  commandValidationAcceptanceRate,
  executionFailureRate,
});

interface QueryInput {
  key?: string;
  keyPattern?: string;
  sessionId?: string;
  sourceKind?: 'scenario' | 'synthetic' | 'session';
  sourceLabel?: string;
  engineVersion?: string;
  nodeVersion?: string;
  incomplete?: boolean;
  minDurationTicks?: number;
  maxDurationTicks?: number;
  minFailedTickCount?: number;
  maxFailedTickCount?: number;
  policySeed?: number;
  recordedAfter?: string;
  recordedBefore?: string;
  attachmentMime?: string;
}

/** Flat JSON tool input -> BundleQuery (RegExp from keyPattern source;
 *  min/max pairs -> NumberRange; after/before -> IsoTimeRange). */
export function queryFromInput(input: QueryInput): BundleQuery {
  const q: BundleQuery = {};
  if (input.key !== undefined && input.keyPattern !== undefined) {
    throw new Error('key and keyPattern are mutually exclusive — pass one');
  }
  if (input.key !== undefined) q.key = input.key;
  else if (input.keyPattern !== undefined) {
    try {
      q.key = new RegExp(input.keyPattern);
    } catch {
      throw new Error(`keyPattern is not a valid regex source: ${input.keyPattern}`);
    }
  }
  if (input.sessionId !== undefined) q.sessionId = input.sessionId;
  if (input.sourceKind !== undefined) q.sourceKind = input.sourceKind;
  if (input.sourceLabel !== undefined) q.sourceLabel = input.sourceLabel;
  if (input.engineVersion !== undefined) q.engineVersion = input.engineVersion;
  if (input.nodeVersion !== undefined) q.nodeVersion = input.nodeVersion;
  if (input.incomplete !== undefined) q.incomplete = input.incomplete;
  if (input.minDurationTicks !== undefined || input.maxDurationTicks !== undefined) {
    q.durationTicks = {
      ...(input.minDurationTicks !== undefined ? { min: input.minDurationTicks } : {}),
      ...(input.maxDurationTicks !== undefined ? { max: input.maxDurationTicks } : {}),
    };
  }
  if (input.minFailedTickCount !== undefined || input.maxFailedTickCount !== undefined) {
    q.failedTickCount = {
      ...(input.minFailedTickCount !== undefined ? { min: input.minFailedTickCount } : {}),
      ...(input.maxFailedTickCount !== undefined ? { max: input.maxFailedTickCount } : {}),
    };
  }
  if (input.policySeed !== undefined) q.policySeed = input.policySeed;
  if (input.recordedAfter !== undefined || input.recordedBefore !== undefined) {
    q.recordedAt = {
      ...(input.recordedAfter !== undefined ? { from: input.recordedAfter } : {}),
      ...(input.recordedBefore !== undefined ? { to: input.recordedBefore } : {}),
    };
  }
  if (input.attachmentMime !== undefined) q.attachmentMime = input.attachmentMime;
  return q;
}

export function entrySummary(entry: BundleCorpusEntry): Record<string, unknown> {
  return {
    key: entry.key,
    sessionId: entry.metadata.sessionId,
    sourceKind: entry.metadata.sourceKind,
    sourceLabel: entry.metadata.sourceLabel ?? null,
    engineVersion: entry.metadata.engineVersion,
    recordedAt: entry.metadata.recordedAt,
    startTick: entry.metadata.startTick,
    endTick: entry.metadata.endTick,
    // Engine-computed reachable bound (BundleCorpusEntry.materializedEndTick →
    // replayableUpperBound). Reading it rather than recomputing keeps the MCP in
    // lockstep with snapshotAtTick / openAt, so a recovered legacy endTick:0
    // bundle reports its true horizon. (Claude review 2026-06-13.)
    effectiveUpperBound: entry.materializedEndTick,
    incomplete: entry.metadata.incomplete ?? false,
    hasFailures: entry.hasFailures,
    failedTickCount: entry.failedTickCount,
    attachments: { count: entry.attachmentCount, bytes: entry.attachmentBytes, mimes: entry.attachmentMimes },
  };
}

/** TickFrame projection that never touches the worldFactory-needing members
 *  (state()/snapshot()); full state on request via snapshotAtTick (pure data). */
export function frameView(
  state: CorpusState,
  key: string,
  tick: number,
  includeState: boolean,
): Record<string, unknown> {
  const viewer = state.viewer(key);
  const frame = viewer.atTick(tick);
  const failures = [...viewer.failures({ from: tick, to: tick })];
  const result: Record<string, unknown> = {
    tick: frame.tick,
    events: frame.events,
    commands: frame.commands,
    executions: frame.executions,
    markers: frame.markers,
    diff: frame.diff,
    failures,
  };
  if (includeState) {
    const bundle = state.loadBundle(key);
    result.state = snapshotAtTick(bundle, tick);
    // Flag carry-forward ONLY for a HYDRATED (folded) tick: at a recorded
    // snapshot tick (startTick / periodic / terminal) snapshotAtTick returns the
    // snapshot verbatim, so rng/config/componentOptions ARE accurate, not carried
    // forward (full-review 2026-06-13 L2 iter-3). Same `carriedForward` key as
    // bundle_snapshots — one fact, one key across both MCP surfaces (lessons.md
    // 2026-06-13 cross-surface duplication trap).
    const recordedTick = tick === bundle.metadata.startTick
      || bundle.snapshots.some((s) => s.tick === tick);
    if (!recordedTick) {
      result.carriedForward = ['rng', 'config', 'componentOptions'];
    }
  }
  return result;
}
