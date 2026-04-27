import type { JsonValue } from './json.js';
import type {
  EntityRef,
  Marker,
  MarkerKind,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import {
  BundleIntegrityError,
  BundleRangeError,
  BundleVersionError,
  ReplayHandlerMissingError,
} from './session-errors.js';
import type { SessionSource } from './session-sink.js';
import { ENGINE_VERSION } from './version.js';
import type { CommandExecutionResult, World } from './world.js';
import type { WorldSnapshot } from './serializer.js';

export interface ReplayerConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  /**
   * Constructs a paused `World` from a snapshot. Per ADR 4 (spec §15),
   * this factory is part of the determinism contract: it must reproduce
   * the recording-time component / handler / validator / system
   * registration, in the same order, and apply the snapshot in-place
   * (e.g. `World.applySnapshot`) to avoid `registerComponent` /
   * `registerHandler` duplicate-throws.
   */
  worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap>;
}

export interface SelfCheckOptions {
  stopOnFirstDivergence?: boolean;     // default false
  checkState?: boolean;                // default true
  checkEvents?: boolean;               // default true
  checkExecutions?: boolean;           // default true
}

export interface StateDivergence {
  fromTick: number;
  toTick: number;
  expected: WorldSnapshot;
  actual: WorldSnapshot;
  firstDifferingPath?: string;
}

export interface EventDivergence {
  tick: number;
  expected: Array<{ type: PropertyKey; data: unknown }>;
  actual: Array<{ type: PropertyKey; data: unknown }>;
}

export interface ExecutionDivergence {
  tick: number;
  expected: CommandExecutionResult[];
  actual: CommandExecutionResult[];
}

export interface SkippedSegment {
  fromTick: number;
  toTick: number;
  reason: 'failure_in_segment';
}

export interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
  skippedSegments: SkippedSegment[];
}

export interface MarkerValidationResult {
  ok: boolean;
  invalidMarkers: Array<{ markerId: string; reason: string }>;
}

/**
 * Loads a `SessionBundle` (or `SessionSource`) and exposes replay /
 * inspection / verification primitives per spec §9. Determinism contract
 * enforcement is via `selfCheck()` (state / events / executions); the
 * `worldFactory` is part of the contract per ADR 4.
 */
export class SessionReplayer<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  private readonly _bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  private readonly _config: ReplayerConfig<TEventMap, TCommandMap>;
  // Pre-grouped per-tick indices for O(1) lookup during replay/selfCheck.
  // Iter-2 code review M1: previously filter/find over the full bundle once
  // per replayed tick → O(N·T) per segment, blocking spec §13.2 throughput
  // target on long captures.
  private readonly _commandsByTick: Map<number, Array<typeof this._bundle.commands[number]>>;
  private readonly _eventsByTick: Map<number, typeof this._bundle.ticks[number]['events']>;
  private readonly _executionsByTick: Map<number, typeof this._bundle.executions>;

  private constructor(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    config: ReplayerConfig<TEventMap, TCommandMap>,
  ) {
    this._bundle = bundle;
    this._config = config;
    this._verifyVersionCompat();
    // Build per-tick indices once at construction. Commands are sorted by
    // sequence within a tick to preserve ordering for replay; events and
    // executions retain bundle order (already monotonic per tick).
    this._commandsByTick = new Map();
    for (const cmd of bundle.commands) {
      const list = this._commandsByTick.get(cmd.submissionTick);
      if (list) list.push(cmd);
      else this._commandsByTick.set(cmd.submissionTick, [cmd]);
    }
    for (const list of this._commandsByTick.values()) {
      list.sort((a, b) => a.sequence - b.sequence);
    }
    this._eventsByTick = new Map();
    for (const tickEntry of bundle.ticks) {
      this._eventsByTick.set(tickEntry.tick, tickEntry.events);
    }
    this._executionsByTick = new Map();
    for (const exec of bundle.executions) {
      const list = this._executionsByTick.get(exec.tick);
      if (list) list.push(exec);
      else this._executionsByTick.set(exec.tick, [exec]);
    }
  }

  static fromBundle<
    TEventMap extends Record<keyof TEventMap, unknown>,
    TCommandMap extends Record<keyof TCommandMap, unknown>,
    TDebug,
  >(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    config: ReplayerConfig<TEventMap, TCommandMap>,
  ): SessionReplayer<TEventMap, TCommandMap, TDebug> {
    return new SessionReplayer(bundle, config);
  }

  static fromSource<
    TEventMap extends Record<keyof TEventMap, unknown>,
    TCommandMap extends Record<keyof TCommandMap, unknown>,
    TDebug,
  >(
    source: SessionSource,
    config: ReplayerConfig<TEventMap, TCommandMap>,
  ): SessionReplayer<TEventMap, TCommandMap, TDebug> {
    const bundle = source.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
    return new SessionReplayer(bundle, config);
  }

  get metadata(): SessionMetadata { return this._bundle.metadata; }
  get markerCount(): number { return this._bundle.markers.length; }

  markers(): Marker[] { return this._bundle.markers.slice(); }
  markersAt(tick: number): Marker[] { return this._bundle.markers.filter((m) => m.tick === tick); }
  markersOfKind(kind: MarkerKind): Marker[] { return this._bundle.markers.filter((m) => m.kind === kind); }

  markersByEntity(ref: EntityRef): Marker[] {
    return this._bundle.markers.filter(
      (m) => m.refs?.entities?.some((e) => e.id === ref.id && e.generation === ref.generation),
    );
  }

  markersByEntityId(id: number): Marker[] {
    return this._bundle.markers.filter((m) => m.refs?.entities?.some((e) => e.id === id));
  }

  snapshotTicks(): number[] {
    const all = [
      this._bundle.metadata.startTick,
      ...this._bundle.snapshots.map((s) => s.tick),
    ];
    return all.sort((a, b) => a - b);
  }

  ticks(): number[] { return this._bundle.ticks.map((t) => t.tick); }

  openAt(targetTick: number): World<TEventMap, TCommandMap> {
    const md = this._bundle.metadata;
    const upper = md.incomplete ? md.persistedEndTick : md.endTick;
    if (targetTick < md.startTick) {
      throw new BundleRangeError(
        `tick ${targetTick} below startTick ${md.startTick}`,
        { code: 'too_low', requested: targetTick, startTick: md.startTick },
      );
    }
    if (targetTick > upper) {
      throw new BundleRangeError(
        `tick ${targetTick} above upper bound ${upper}` +
          (md.incomplete ? ' (incomplete bundle uses persistedEndTick)' : ''),
        { code: 'too_high', requested: targetTick, upper, incomplete: md.incomplete ?? false },
      );
    }
    if (md.failedTicks?.some((ft) => targetTick >= ft)) {
      throw new BundleIntegrityError(
        'replay across recorded TickFailure is out of scope',
        { code: 'replay_across_failure', failedTicks: md.failedTicks, requested: targetTick },
      );
    }
    if (targetTick > md.startTick && this._bundle.commands.length === 0) {
      throw new BundleIntegrityError(
        'bundle has no command payloads; replay forward is impossible',
        { code: 'no_replay_payloads', requested: targetTick },
      );
    }

    // Build normalized snapshot list.
    const all: SessionSnapshotEntry[] = [
      { tick: md.startTick, snapshot: this._bundle.initialSnapshot },
      ...this._bundle.snapshots,
    ];
    let start: SessionSnapshotEntry = all[0];
    for (const s of all) {
      if (s.tick <= targetTick && s.tick >= start.tick) start = s;
    }
    const world = this._config.worldFactory(start.snapshot);

    for (let t = start.tick; t < targetTick; t++) {
      const tickCommands = this._commandsByTick.get(t) ?? [];
      for (const rc of tickCommands) {
        if (!world.hasCommandHandler(rc.type as keyof TCommandMap)) {
          throw new ReplayHandlerMissingError(
            `replay needs handler for command type "${String(rc.type)}", not registered in worldFactory's world`,
            { code: 'handler_missing', commandType: String(rc.type), tick: t },
          );
        }
        world.submitWithResult(rc.type as keyof TCommandMap, rc.data as TCommandMap[keyof TCommandMap]);
      }
      world.step();
    }
    return world;
  }

  stateAtTick(tick: number): WorldSnapshot {
    return this.openAt(tick).serialize();
  }

  tickEntriesBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[] {
    const md = this._bundle.metadata;
    // Use persistedEndTick for incomplete bundles. Iter-1 code review fix.
    const upper = md.incomplete ? md.persistedEndTick : md.endTick;
    if (fromTick < md.startTick || toTick > upper || fromTick > toTick) {
      throw new BundleRangeError(
        `tick range [${fromTick}, ${toTick}] outside [${md.startTick}, ${upper}] or inverted`,
        { code: 'range_invalid', fromTick, toTick, startTick: md.startTick, upper, incomplete: md.incomplete ?? false },
      );
    }
    return this._bundle.ticks.filter((e) => e.tick >= fromTick && e.tick <= toTick);
  }

  selfCheck(options: SelfCheckOptions = {}): SelfCheckResult {
    const checkState = options.checkState ?? true;
    const checkEvents = options.checkEvents ?? true;
    const checkExecutions = options.checkExecutions ?? true;
    const md = this._bundle.metadata;
    const result: SelfCheckResult = {
      ok: true, checkedSegments: 0,
      stateDivergences: [], eventDivergences: [], executionDivergences: [],
      skippedSegments: [],
    };

    // No-payload bundles: cannot replay, return ok with warning.
    if (this._bundle.commands.length === 0 && md.endTick > md.startTick) {
      console.warn(
        `[SessionReplayer] selfCheck on bundle without command payloads is a no-op (${md.sessionId})`,
      );
      return result;
    }

    const allSnapshots: SessionSnapshotEntry[] = [
      { tick: md.startTick, snapshot: this._bundle.initialSnapshot },
      ...this._bundle.snapshots,
    ];
    for (let i = 0; i < allSnapshots.length - 1; i++) {
      const a = allSnapshots[i];
      const b = allSnapshots[i + 1];
      // Skip segments containing a recorded TickFailure
      if (md.failedTicks?.some((ft) => ft >= a.tick && ft < b.tick)) {
        result.skippedSegments.push({ fromTick: a.tick, toTick: b.tick, reason: 'failure_in_segment' });
        continue;
      }
      const segDiv = this._checkSegment(a, b, { checkState, checkEvents, checkExecutions });
      result.checkedSegments++;
      result.stateDivergences.push(...segDiv.state);
      result.eventDivergences.push(...segDiv.events);
      result.executionDivergences.push(...segDiv.executions);
      if (segDiv.state.length || segDiv.events.length || segDiv.executions.length) {
        result.ok = false;
        if (options.stopOnFirstDivergence) break;
      }
    }
    return result;
  }

  validateMarkers(): MarkerValidationResult {
    const result: MarkerValidationResult = { ok: true, invalidMarkers: [] };
    for (const marker of this._bundle.markers) {
      if (marker.validated === false && marker.refs?.entities && marker.refs.entities.length > 0) {
        // Retroactive marker — try to verify entity ref against the snapshot at marker.tick
        try {
          const snap = this.stateAtTick(marker.tick);
          for (const ref of marker.refs.entities) {
            const gens = (snap as { entities?: { generations?: number[]; alive?: boolean[] } }).entities;
            const alive = gens?.alive?.[ref.id];
            const generation = gens?.generations?.[ref.id];
            if (!alive || generation !== ref.generation) {
              result.invalidMarkers.push({
                markerId: marker.id,
                reason: `entity { id: ${ref.id}, generation: ${ref.generation} } not live at tick ${marker.tick}`,
              });
              result.ok = false;
              break;
            }
          }
        } catch (e) {
          result.invalidMarkers.push({
            markerId: marker.id,
            reason: `replay failed: ${(e as Error).message}`,
          });
          result.ok = false;
        }
      }
    }
    return result;
  }

  // --- internal ---

  private _checkSegment(
    a: SessionSnapshotEntry,
    b: SessionSnapshotEntry,
    flags: { checkState: boolean; checkEvents: boolean; checkExecutions: boolean },
  ): { state: StateDivergence[]; events: EventDivergence[]; executions: ExecutionDivergence[] } {
    const stateDivs: StateDivergence[] = [];
    const eventDivs: EventDivergence[] = [];
    const execDivs: ExecutionDivergence[] = [];
    const world = this._config.worldFactory(a.snapshot);

    // Accumulate replay-side executions via listener
    const replayExecs: CommandExecutionResult[] = [];
    const execListener: (r: CommandExecutionResult<keyof TCommandMap>) => void = (r) => {
      replayExecs.push(r as unknown as CommandExecutionResult);
    };
    world.onCommandExecution(execListener);

    try {
      for (let t = a.tick; t < b.tick; t++) {
        const tickCommands = this._commandsByTick.get(t) ?? [];
        for (const rc of tickCommands) {
          if (!world.hasCommandHandler(rc.type as keyof TCommandMap)) {
            throw new ReplayHandlerMissingError(
              `replay needs handler for command type "${String(rc.type)}"`,
              { code: 'handler_missing', commandType: String(rc.type), tick: t },
            );
          }
          world.submitWithResult(rc.type as keyof TCommandMap, rc.data as TCommandMap[keyof TCommandMap]);
        }
        world.step();
        if (flags.checkEvents) {
          const expected = this._eventsByTick.get(t + 1) ?? [];
          const actual = [...world.getEvents()] as Array<{ type: PropertyKey; data: unknown }>;
          if (!deepEqualOrdered(expected, actual)) {
            eventDivs.push({ tick: t + 1, expected: expected as Array<{ type: PropertyKey; data: unknown }>, actual });
          }
        }
        if (flags.checkExecutions) {
          // Compare execution streams ignoring `submissionSequence`.
          // `submissionSequence` is engine-level bookkeeping that monotonically
          // counts across the whole session. On replay starting from a
          // mid-bundle snapshot, the world's counter resets to 0 — so
          // recorded executions have higher sequences than replayed ones
          // even on a clean recording. WorldSnapshot v5 doesn't carry the
          // counter; v6 (future spec) would lift this caveat. For v1, we
          // strip submissionSequence from comparison so multi-segment
          // selfCheck doesn't false-positive. Iter-1 code review fix
          // (Opus H1; spec §13.5 CI gate).
          const stripSeq = (e: unknown): Record<string, unknown> => {
            const { submissionSequence: _drop, ...rest } = e as { submissionSequence?: number } & Record<string, unknown>;
            void _drop;
            return rest;
          };
          const expectedRaw = this._executionsByTick.get(t + 1) ?? [];
          const actualRaw = replayExecs.filter((e) => e.tick === t + 1);
          const expected = expectedRaw.map(stripSeq);
          const actual = actualRaw.map(stripSeq);
          if (!deepEqualOrdered(expected, actual)) {
            execDivs.push({
              tick: t + 1,
              expected: expectedRaw as unknown as CommandExecutionResult[],
              actual: actualRaw,
            });
          }
        }
      }

      if (flags.checkState) {
        const actualB = world.serialize();
        const eq = deepEqualWithPath(actualB, b.snapshot);
        if (!eq.equal) {
          stateDivs.push({
            fromTick: a.tick, toTick: b.tick,
            expected: b.snapshot, actual: actualB,
            ...(eq.firstDifferingPath ? { firstDifferingPath: eq.firstDifferingPath } : {}),
          });
        }
      }
    } finally {
      world.offCommandExecution(execListener);
    }

    return { state: stateDivs, events: eventDivs, executions: execDivs };
  }

  private _verifyVersionCompat(): void {
    const md = this._bundle.metadata;
    // Schema version check before engine-version check. Iter-1 code review fix.
    if (this._bundle.schemaVersion !== 1) {
      throw new BundleVersionError(
        `unsupported bundle schemaVersion: ${this._bundle.schemaVersion} (replayer supports 1)`,
        { code: 'schema_unsupported', schemaVersion: this._bundle.schemaVersion },
      );
    }
    const bundleParts = md.engineVersion.split('.').map((p) => Number(p));
    const runtimeParts = ENGINE_VERSION.split('.').map((p) => Number(p));
    const [ba, bb] = bundleParts;
    const [ra, rb] = runtimeParts;
    if (ba !== ra) {
      throw new BundleVersionError(
        `engineVersion cross-major: bundle ${md.engineVersion} vs runtime ${ENGINE_VERSION}`,
        { code: 'cross_a', bundleVersion: md.engineVersion, runtimeVersion: ENGINE_VERSION },
      );
    }
    if (bb !== rb) {
      throw new BundleVersionError(
        `engineVersion cross-b: bundle ${md.engineVersion} vs runtime ${ENGINE_VERSION} (b-component differs; pre-1.0 breaking-change axis per AGENTS.md)`,
        { code: 'cross_b', bundleVersion: md.engineVersion, runtimeVersion: ENGINE_VERSION },
      );
    }
    if (md.engineVersion !== ENGINE_VERSION) {
      console.warn(
        `[SessionReplayer] within-b engineVersion mismatch: bundle ${md.engineVersion} vs runtime ${ENGINE_VERSION}`,
      );
    }
    // Node version: warn-only on major mismatch
    const runtimeNode = typeof process !== 'undefined' ? process.version : 'unknown';
    const bundleMajor = parseNodeMajor(md.nodeVersion);
    const runtimeMajor = parseNodeMajor(runtimeNode);
    if (bundleMajor !== null && runtimeMajor !== null && bundleMajor !== runtimeMajor) {
      console.warn(
        `[SessionReplayer] cross-Node-major: bundle ${md.nodeVersion} vs runtime ${runtimeNode} (transcendentals may diverge)`,
      );
    }
  }
}

function parseNodeMajor(version: string): number | null {
  const m = /v?(\d+)/.exec(version);
  return m ? Number(m[1]) : null;
}

/**
 * Recursive deep-equal that short-circuits on first mismatch and produces
 * a best-effort dotted `firstDifferingPath`. Snapshot serialization
 * preserves insertion order, so deep-equal need not canonicalize.
 */
export function deepEqualWithPath(a: unknown, b: unknown, path = ''): { equal: boolean; firstDifferingPath?: string } {
  if (Object.is(a, b)) return { equal: true };
  if (typeof a !== typeof b) return { equal: false, firstDifferingPath: path || '<root>' };
  if (a === null || b === null) return { equal: false, firstDifferingPath: path || '<root>' };
  if (typeof a !== 'object') return { equal: false, firstDifferingPath: path || '<root>' };

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return { equal: false, firstDifferingPath: path || '<root>' };
    }
    if (a.length !== b.length) return { equal: false, firstDifferingPath: `${path}.length` };
    for (let i = 0; i < a.length; i++) {
      const r = deepEqualWithPath(a[i], b[i], `${path}[${i}]`);
      if (!r.equal) return r;
    }
    return { equal: true };
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) {
    return { equal: false, firstDifferingPath: `${path}.<keys>` };
  }
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) {
      return { equal: false, firstDifferingPath: `${path}.${k}<missing>` };
    }
    const r = deepEqualWithPath(ao[k], bo[k], path ? `${path}.${k}` : k);
    if (!r.equal) return r;
  }
  return { equal: true };
}

function deepEqualOrdered(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualWithPath(a[i], b[i]).equal) return false;
  }
  return true;
}

