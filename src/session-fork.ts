// Spec 5 (Counterfactual Replay) — types, error classes, and ForkBuilder.
// See docs/threads/done/counterfactual-replay/DESIGN.md (v4 ACCEPTED) and
// PLAN.md (v5 ACCEPTED). This module hosts the public surface for
// SessionReplayer.forkAt(targetTick) / ForkBuilder / Divergence.

import type { JsonValue } from './json.js';
import type { RecordedCommand, SessionBundle } from './session-bundle.js';
import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
import type { WorldSnapshot } from './serializer.js';
import { WorldTickFailureError, type World } from './world.js';
import { SessionRecorder } from './session-recorder.js';
import { SessionRecordingError } from './session-errors.js';
import { computeInlineDivergence } from './session-fork-divergence.js';

/** Caller passed a sequence to `replace()`/`drop()` that doesn't match any
 *  source command at the fork's `targetTick`. `details.code` is
 *  `'unknown_command_sequence'`. */
export interface ForkSubstitutionErrorDetails {
  readonly code: 'unknown_command_sequence';
  readonly sequence: number;
  readonly tick: number;
}

export class ForkSubstitutionError extends SessionRecordingError {
  constructor(message: string, details: ForkSubstitutionErrorDetails) {
    super(message, details as unknown as JsonValue);
  }
}

/** Caller tried to replace/drop the same `originalSequence` twice, or
 *  replace+drop the same one. Synchronous per DESIGN §4.2. */
export type ForkBuilderConflictCode =
  | 'duplicate_replace'
  | 'duplicate_drop'
  | 'replace_drop_conflict';

export interface ForkBuilderConflictErrorDetails {
  readonly code: ForkBuilderConflictCode;
  readonly sequence: number;
  readonly tick: number;
}

export class ForkBuilderConflictError extends SessionRecordingError {
  constructor(message: string, details: ForkBuilderConflictErrorDetails) {
    super(message, details as unknown as JsonValue);
  }
}

/** Caller invoked `replace`/`insert`/`drop`/`snapshot`/`run` after the
 *  builder was consumed by `run()`. Builders are single-use per DESIGN §4.2. */
export class BuilderConsumedError extends SessionRecordingError {}

/** Per-tick split deltas exposed through `Divergence.perTickCounts`. Direction
 *  split for both commands and events per DESIGN §4. Execution-stream
 *  divergence is folded into `commandsChanged` per ADR 3. */
export interface DivergenceCounts {
  /** Commands present in source at this submission-tick but not fork. */
  readonly commandsSourceOnly: number;
  /** Commands present in fork at this submission-tick but not source. */
  readonly commandsForkOnly: number;
  /** Commands paired across source/fork with differing payload OR result. */
  readonly commandsChanged: number;
  /** Events present in source at this submission-tick but not fork. */
  readonly eventsSourceOnly: number;
  /** Events present in fork at this submission-tick but not source. */
  readonly eventsForkOnly: number;
  /** Events paired across source/fork with differing payload OR type. */
  readonly eventsChanged: number;
}

/**
 * Mapping from source originalSequence to fork assignedSequence for ALL
 * source commands at `targetTick` (substituted + preserved), plus
 * inserts (assigned-only) and drops (original-only). Used by `diffBundles`
 * to align command streams across source and fork at `targetTick`.
 *
 * Past `targetTick`, alignment is per-tick submission-order index — no map
 * entries needed (see DESIGN §4.3).
 */
export interface CommandSequenceMap {
  /** Source commands at targetTick whose payload+type was preserved
   *  (re-submitted unchanged in §4.1's algorithm). */
  readonly preserved: ReadonlyArray<{
    readonly tick: number;
    readonly originalSequence: number;
    readonly assignedSequence: number;
  }>;
  /** For each replace() call: original sequence in source, assigned sequence
   *  in fork. */
  readonly replaced: ReadonlyArray<{
    readonly tick: number;
    readonly originalSequence: number;
    readonly assignedSequence: number;
  }>;
  /** For each insert() call: assigned sequence in fork. */
  readonly inserted: ReadonlyArray<{
    readonly tick: number;
    readonly assignedSequence: number;
  }>;
  /** For each drop() call: original sequence in source (no fork counterpart). */
  readonly dropped: ReadonlyArray<{
    readonly tick: number;
    readonly originalSequence: number;
  }>;
}

/**
 * Inline divergence summary returned by `forkBuilder.run()`. Keys
 * `perTickCounts` by submission-tick (= TickDiff.tick - 1) per DESIGN §4 +
 * §6's public contract. State-level divergence is NOT included here — see
 * `diffBundles` for that (DESIGN ADR 3).
 *
 * `equivalent: true` ignores metadata, markers, and attachments by definition;
 * see DESIGN §7's normalizer field list and ADR 7.
 */
export interface Divergence {
  /** Earliest submission-tick at which the forked timeline first differs from
   *  the source on commands or events. Null if no such divergence over the
   *  overlapping range. */
  readonly firstDivergentTick: number | null;
  /** Per-(submission-)tick split counts. Only ticks with ≥1 delta appear. */
  readonly perTickCounts: ReadonlyMap<number, DivergenceCounts>;
  /** originalSequence → assignedSequence map for substitution alignment. */
  readonly commandSequenceMap: CommandSequenceMap;
  /** True iff `firstDivergentTick === null`. */
  readonly equivalent: boolean;
}

/**
 * Configuration for `forkBuilder.run()`. Per DESIGN §4 + ADR 5: `sink` defaults
 * to a fresh `MemorySink({ allowSidecar: true })` (set by `run()` when omitted).
 * `sourceLabel` defaults to
 * `counterfactual-fork-of-<sourceSessionId>@<targetTick>`.
 */
export interface ForkRunConfig {
  /** The world.tick value at fork-run end (matching `openAt`'s contract).
   *  Required: `untilTick > targetTick`. */
  readonly untilTick: number;
  /** Optional sink override. Defaults to `new MemorySink({ allowSidecar: true })`. */
  readonly sink?: SessionSink & SessionSource;
  /** Optional override for the bundle's `metadata.sourceLabel`. */
  readonly sourceLabel?: string;
}

/**
 * Result of materializing a fork via `builder.run()`. Mirrors Spec 9.1's
 * `AgentPlaytestResult.source` exposure pattern so callers can `readSidecar`
 * for fork-emitted attachments.
 */
export interface ForkResult<TEventMap, TCommandMap> {
  readonly bundle: SessionBundle<TEventMap, TCommandMap>;
  readonly divergence: Divergence;
  /** Same shape as `runAgentPlaytest`'s `result.source`. */
  readonly source: SessionSink & SessionSource;
}

/**
 * Counterfactual fork builder. Constructed via `SessionReplayer.forkAt(tick)`
 * (Step 2). Single-use: any call after `run()` throws `BuilderConsumedError`.
 *
 * Conflict rules (DESIGN §4.2): replace/drop with unknown sequence throws
 * `ForkSubstitutionError`; duplicate replace/drop or replace+drop on the same
 * `originalSequence` throws `ForkBuilderConflictError`. Multi-insert preserves
 * builder-call order. Inserts arrive AFTER all source commands at `targetTick`.
 */
export interface ForkBuilder<TEventMap, TCommandMap> {
  /** Replace an existing recorded command at the fork's `targetTick`. */
  replace<K extends keyof TCommandMap & string>(
    originalSequence: number,
    newCommand: { readonly type: K; readonly data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Insert a new command at the fork's `targetTick`, AFTER all source
   *  commands at this tick. FIFO across multiple inserts. */
  insert<K extends keyof TCommandMap & string>(
    newCommand: { readonly type: K; readonly data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Drop an existing recorded command at the fork's `targetTick`. */
  drop(originalSequence: number): ForkBuilder<TEventMap, TCommandMap>;

  /** Read-only snapshot of the paused world at the fork point. Cheap; safe
   *  to call any number of times before `run()`. */
  snapshot(): WorldSnapshot;

  /** Materialize the fork. Single-use. See DESIGN §4.1 for the substitution
   *  mechanism and PLAN.md Step 5 for the implementation order. */
  run(config: ForkRunConfig): ForkResult<TEventMap, TCommandMap>;
}

/** Internal — `SessionReplayer.forkAt()` is the only call site. */
export interface ForkBuilderInit<TEventMap, TCommandMap> {
  readonly world: World<TEventMap, TCommandMap>;
  readonly sourceBundle: SessionBundle<TEventMap, TCommandMap>;
  readonly targetTick: number;
  readonly sourceCommandsAtTargetTick: ReadonlyMap<number, RecordedCommand<TCommandMap>>;
}

type SubstitutionStatus = 'replaced' | 'dropped';
interface QueuedReplace<TCommandMap> {
  readonly originalSequence: number;
  readonly type: keyof TCommandMap & string;
  readonly data: TCommandMap[keyof TCommandMap];
}
interface QueuedInsert<TCommandMap> {
  readonly type: keyof TCommandMap & string;
  readonly data: TCommandMap[keyof TCommandMap];
}

export class ForkBuilderImpl<TEventMap, TCommandMap>
  implements ForkBuilder<TEventMap, TCommandMap>
{
  private readonly _world: World<TEventMap, TCommandMap>;
  private readonly _sourceBundle: SessionBundle<TEventMap, TCommandMap>;
  private readonly _targetTick: number;
  private readonly _sourceCommandsAtTargetTick: ReadonlyMap<number, RecordedCommand<TCommandMap>>;
  private readonly _substitutionStatus = new Map<number, SubstitutionStatus>();
  private readonly _queuedReplaces: QueuedReplace<TCommandMap>[] = [];
  private readonly _queuedInserts: QueuedInsert<TCommandMap>[] = [];
  private readonly _queuedDrops = new Set<number>();
  private _consumed = false;

  constructor(init: ForkBuilderInit<TEventMap, TCommandMap>) {
    this._world = init.world;
    this._sourceBundle = init.sourceBundle;
    this._targetTick = init.targetTick;
    this._sourceCommandsAtTargetTick = init.sourceCommandsAtTargetTick;
  }

  replace<K extends keyof TCommandMap & string>(
    originalSequence: number,
    newCommand: { readonly type: K; readonly data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap> {
    this._assertNotConsumed();
    this._assertSourceHasSequence(originalSequence);
    this._assertNoConflict(originalSequence, 'replaced');
    this._substitutionStatus.set(originalSequence, 'replaced');
    this._queuedReplaces.push({
      originalSequence,
      type: newCommand.type,
      data: newCommand.data,
    });
    return this;
  }

  insert<K extends keyof TCommandMap & string>(
    newCommand: { readonly type: K; readonly data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap> {
    this._assertNotConsumed();
    // Inserts have no originalSequence; no conflict-rule check beyond
    // the consumed-flag. Order is preserved via FIFO array.
    this._queuedInserts.push({ type: newCommand.type, data: newCommand.data });
    return this;
  }

  drop(originalSequence: number): ForkBuilder<TEventMap, TCommandMap> {
    this._assertNotConsumed();
    this._assertSourceHasSequence(originalSequence);
    this._assertNoConflict(originalSequence, 'dropped');
    this._substitutionStatus.set(originalSequence, 'dropped');
    this._queuedDrops.add(originalSequence);
    return this;
  }

  snapshot(): WorldSnapshot {
    this._assertNotConsumed();
    return this._world.serialize();
  }

  run(config: ForkRunConfig): ForkResult<TEventMap, TCommandMap> {
    this._assertNotConsumed();
    const { untilTick } = config;
    if (untilTick <= this._targetTick) {
      throw new RangeError(
        `forkBuilder.run({ untilTick: ${untilTick} }) requires untilTick > targetTick (${this._targetTick})`,
      );
    }
    this._consumed = true; // mark consumed BEFORE potentially-throwing work, per PLAN.md note

    const sink: SessionSink & SessionSource = config.sink ?? new MemorySink({ allowSidecar: true });
    const sourceLabel =
      config.sourceLabel ??
      `counterfactual-fork-of-${this._sourceBundle.metadata.sessionId}@${this._targetTick}`;

    // Recorder construction: NO policySeed (different lineage; DESIGN §7).
    const recorder = new SessionRecorder<TEventMap, TCommandMap>({
      world: this._world,
      sink,
      sourceKind: 'synthetic',
      sourceLabel,
    });

    // Side-tables for CommandSequenceMap, populated as we submit at targetTick.
    const replacedEntries: Array<{ tick: number; originalSequence: number; assignedSequence: number }> = [];
    const insertedEntries: Array<{ tick: number; assignedSequence: number }> = [];
    const droppedEntries: Array<{ tick: number; originalSequence: number }> = [];
    const preservedEntries: Array<{ tick: number; originalSequence: number; assignedSequence: number }> = [];

    let failedAtTargetTick = false;

    try {
      recorder.connect();
      // Connect-time sink failure: matching runSynthPlaytest:207-214.
      if (recorder.lastError !== null) {
        const err = recorder.lastError;
        try { recorder.disconnect(); } catch { /* best-effort */ }
        throw err;
      }

      // Pre-compute the replaced map for O(1) lookup during the targetTick walk.
      const replacedMap = new Map<number, QueuedReplace<TCommandMap>>();
      for (const r of this._queuedReplaces) replacedMap.set(r.originalSequence, r);

      // Walk source commands at targetTick in originalSequence order (preserves submission order).
      const sourceCmdsAtTarget = Array.from(this._sourceCommandsAtTargetTick.values()).sort(
        (a, b) => a.sequence - b.sequence,
      );
      for (const rc of sourceCmdsAtTarget) {
        if (this._queuedDrops.has(rc.sequence)) {
          droppedEntries.push({ tick: this._targetTick, originalSequence: rc.sequence });
          continue;
        }
        const replacement = replacedMap.get(rc.sequence);
        if (replacement !== undefined) {
          const result = this._world.submitWithResult(
            replacement.type as keyof TCommandMap,
            replacement.data as TCommandMap[keyof TCommandMap],
          );
          replacedEntries.push({
            tick: this._targetTick,
            originalSequence: rc.sequence,
            assignedSequence: result.sequence,
          });
        } else {
          const result = this._world.submitWithResult(
            rc.type as keyof TCommandMap,
            rc.data as TCommandMap[keyof TCommandMap],
          );
          preservedEntries.push({
            tick: this._targetTick,
            originalSequence: rc.sequence,
            assignedSequence: result.sequence,
          });
        }
      }

      // Inserts after all source commands at targetTick, in builder-call order.
      for (const ins of this._queuedInserts) {
        const result = this._world.submitWithResult(
          ins.type as keyof TCommandMap,
          ins.data as TCommandMap[keyof TCommandMap],
        );
        insertedEntries.push({
          tick: this._targetTick,
          assignedSequence: result.sequence,
        });
      }

      // Step targetTick.
      try {
        this._world.step();
      } catch (e) {
        if (e instanceof WorldTickFailureError) {
          failedAtTargetTick = true;
        } else {
          throw e;
        }
      }
      if (recorder.lastError !== null) failedAtTargetTick = true;

      // Continuation loop (skip if targetTick failed).
      if (!failedAtTargetTick) {
        const sourceCommandsByTick = this._groupSourceCommandsByTick();
        while (this._world.tick < untilTick) {
          const t = this._world.tick;
          const sourceCmds = sourceCommandsByTick.get(t) ?? [];
          for (const rc of sourceCmds) {
            this._world.submitWithResult(
              rc.type as keyof TCommandMap,
              rc.data as TCommandMap[keyof TCommandMap],
            );
          }
          try {
            this._world.step();
          } catch (e) {
            if (e instanceof WorldTickFailureError) break;
            throw e;
          }
          if (recorder.lastError !== null) break;
        }
      }
    } finally {
      if (recorder.isConnected) {
        try { recorder.disconnect(); } catch { /* best-effort */ }
      }
    }

    const commandSequenceMap: CommandSequenceMap = {
      preserved: preservedEntries,
      replaced: replacedEntries,
      inserted: insertedEntries,
      dropped: droppedEntries,
    };

    const forkBundle = sink.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap>;
    // Overlap end is the smaller of source/fork persistedEndTick — past either
    // end there's no apples-to-apples comparison, so divergence isn't counted.
    const overlapEnd = Math.min(
      this._sourceBundle.metadata.persistedEndTick,
      forkBundle.metadata.persistedEndTick,
    );
    const divergence = computeInlineDivergence(
      this._sourceBundle,
      forkBundle,
      commandSequenceMap,
      this._targetTick,
      overlapEnd,
    );

    return {
      bundle: forkBundle,
      divergence,
      source: sink,
    };
  }

  /** Build a tick → source-commands map for the continuation loop, scoped to
   *  ticks > targetTick (the targetTick walk uses a precomputed map already). */
  private _groupSourceCommandsByTick(): Map<number, RecordedCommand<TCommandMap>[]> {
    const out = new Map<number, RecordedCommand<TCommandMap>[]>();
    for (const rc of this._sourceBundle.commands) {
      if (rc.submissionTick <= this._targetTick) continue;
      const list = out.get(rc.submissionTick);
      if (list === undefined) {
        out.set(rc.submissionTick, [rc]);
      } else {
        list.push(rc);
      }
    }
    return out;
  }

  private _assertNotConsumed(): void {
    if (this._consumed) {
      throw new BuilderConsumedError(
        'ForkBuilder is single-use; construct a new builder via replayer.forkAt(...)',
      );
    }
  }

  private _assertSourceHasSequence(originalSequence: number): void {
    if (!this._sourceCommandsAtTargetTick.has(originalSequence)) {
      throw new ForkSubstitutionError(
        `no source command with sequence ${originalSequence} at targetTick ${this._targetTick}`,
        {
          code: 'unknown_command_sequence',
          sequence: originalSequence,
          tick: this._targetTick,
        },
      );
    }
  }

  private _assertNoConflict(
    originalSequence: number,
    nextStatus: SubstitutionStatus,
  ): void {
    const existing = this._substitutionStatus.get(originalSequence);
    if (existing === undefined) return;
    let code: ForkBuilderConflictCode;
    if (existing === nextStatus) {
      code = nextStatus === 'replaced' ? 'duplicate_replace' : 'duplicate_drop';
    } else {
      code = 'replace_drop_conflict';
    }
    throw new ForkBuilderConflictError(
      `conflict on originalSequence ${originalSequence} at targetTick ${this._targetTick}: ${code}`,
      { code, sequence: originalSequence, tick: this._targetTick },
    );
  }

}

/** Free-function entry point for `SessionReplayer.forkAt()`. Kept here (not in
 *  session-replayer.ts) so the replayer module stays under the project's
 *  500-LOC limit. */
export function createForkBuilder<TEventMap, TCommandMap>(
  init: {
    readonly world: World<TEventMap, TCommandMap>;
    readonly sourceBundle: SessionBundle<TEventMap, TCommandMap>;
    readonly sourceCommandsAtTargetTick: ReadonlyMap<number, RecordedCommand<TCommandMap>>;
    readonly targetTick: number;
  },
): ForkBuilder<TEventMap, TCommandMap> {
  return new ForkBuilderImpl<TEventMap, TCommandMap>(init);
}
