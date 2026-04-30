# Counterfactual Replay / Fork — Design Spec

**Status:** Draft v2 (2026-04-29). civ-engine roadmap Spec 5. Awaiting multi-CLI design-2 review.

**v2 deltas vs v1:** addresses iter-1 review findings (Codex + Claude both ITERATE).
- **§7** softened from "byte-equivalent" to "semantic equivalence" with an explicit normalizer-fields list (sessionId, recordedAt, startTick, sequence range, initialSnapshot anchor).
- **§4 + ADR 4** replaced sequence-inheritance with the actual implementation mechanism: substituted commands are submitted through `World.submit()` and pick up fresh sequences; the recorder maintains a `originalSequence → assignedSequence` side-table emitted in `Divergence.commandSequenceMap`. Insertions also use submit-assigned sequences.
- **§4** added explicit conflict rules for builder calls: duplicate replace/drop, replace of inserted command, drop of inserted command, multi-insert ordering, single-use builder lifecycle.
- **ADR 3** dropped `stateKeyDeltas` from inline `Divergence`. State-level diffs are computed by `diffBundles` (which has access to both bundles' snapshots+TickDiffs); inline divergence covers commands/executions/events only.
- **API** split each delta count into `sourceOnly` / `forkOnly` / `changed` (Open Q1 resolved).
- **API** `firstDivergentTick` definition pinned: earliest tick with any command-stream, execution, or event delta. State-only divergence is reported by `diffBundles` and not by inline `Divergence`.
- **API** replaced `.world(): World` with `.snapshot(): WorldSnapshot` (read-only). Mutable world access defeats the counterfactual contract; callers needing a live world already have `SessionReplayer.openAt(tick)`.
- **§4** `BundleDiff` matching key specified: `(tick, originalSequence)` for fork-vs-source via `commandSequenceMap`; `(tick, type, deepEqual(data))` fallback for cross-bundle diffs without a sequence map.
- **§10** versioning corrected to `0.8.11 → 0.8.12` (c-bump per AGENTS.md — additive surface, no breakage).
- **§4** typo fix: `submittedAtTick` → `submissionTick` (the actual `RecordedCommand` field name).
- **§6** added rows for accepted-substitution-handler-failure and incomplete-bundle (mirrors `openAt` semantics).
- **ADR 7** clarified that `equivalent` ignores metadata fields by default (else fresh fork metadata makes every fork non-equivalent).

**Scope:** ship the smallest useful counterfactual primitive — `SessionReplayer.forkAt(tick).replace(...).insert(...).drop(...).run()` plus `diffBundles(a, b)`. Single-level forks (no fork-of-fork in v1). Substitution at a single tick. `run()` produces a fresh `SessionBundle` of the diverged timeline plus a structured `Divergence` summary.

**Author:** civ-engine team.

**Coordinated repos:** civ-engine only. No aoe2 changes required.

**Related primitives:**
- `SessionRecorder` / `SessionBundle` (Spec 1)
- `SessionReplayer.openAt(tick)` (Spec 1) — forward-replay primitive
- `MemorySink` (Spec 1) — sink for the forked recording
- `diffSnapshots` (Spec 4) — building block for state divergence
- `runMetrics` (Spec 8) — consumes divergence-derived bundle pairs

## 1. Goals (v0.8.12 — first counterfactual landing)

1. **`forkAt(tick)`** opens a paused `World` at the target tick from the source bundle (uses the same logic as `openAt`).
2. **Substitution operations** at the fork's `targetTick`:
   - `replace(originalSequence, newCommand)` — swap an existing recorded command for a new one
   - `insert(newCommand)` — add a command to the tick
   - `drop(originalSequence)` — remove an existing command from the tick
3. **`run({ untilTick, sink? })`** advances the forked World forward, recording into a fresh `SessionRecorder` over the supplied (or default `MemorySink({ allowSidecar: true })`) sink. Returns a `ForkResult { bundle, divergence, source }`.
4. **`Divergence` summary** describes how the forked timeline diverged from the source over the overlapping tick range: `firstDivergentTick`, per-tick split counts of command-stream / execution / event deltas, the `originalSequence → assignedSequence` map for substituted commands, and a single-bool `equivalent: boolean` flag (true when there are no command/execution/event deltas after applying the metadata-normalizer).
5. **`diffBundles(a, b)`** standalone utility that walks both bundles tick-by-tick and produces a `BundleDiff` (a richer version of `Divergence` with full per-tick payloads instead of summary counts, plus state-key deltas folded from snapshots+TickDiffs). Used for visualization (BundleViewer) and metric pipelines.
6. **`builder.snapshot()`** read-only `WorldSnapshot` of the paused world at the fork point so callers (especially AI agents) can inspect state before deciding what to substitute.

## 2. Non-Goals (v0.8.12)

- **No fork-of-fork.** A `ForkResult.bundle` can be passed to a fresh `SessionReplayer.fromBundle(...).forkAt(...)` to chain (because the fork's bundle is a normal `SessionBundle`), but the fork-tree data structure / breadth-first divergence search is out of scope.
- **No multi-tick substitution in one call.** Substitutions operate on the fork's `targetTick` only. Subsequent counterfactuals at later ticks require chaining (out of scope above).
- **No replay-across-failure.** Inherits the existing `BundleIntegrityError(code: 'replay_across_failure')` constraint.
- **No automatic divergence-search policies.** v0.8.12 ships the primitive; agents and metric pipelines compose it to find interesting divergences.
- **No bundle-format changes.** The fork's output bundle is a normal `SessionBundle` with `sourceKind: 'synthetic'` and `sourceLabel: 'counterfactual-fork-of-<sessionId>'`.
- **No mutable world access from the builder.** `builder.snapshot()` returns a read-only `WorldSnapshot`; no `builder.world(): World`.
- **No UI.** `BundleViewer` integration (e.g., side-by-side replay panel) is a future v0.9.x spec.
- **No inline state-key divergence.** `Divergence` (returned from `run()`) summarizes commands/executions/events only. State-level diffs require `diffBundles(source, fork.bundle)`, which has access to both bundles' snapshots+TickDiffs and can fold them in lockstep.

## 3. Architecture

```
                           SessionBundle (source)
                                  │
                                  ▼
                         SessionReplayer.fromBundle
                                  │
                                  ▼
                             forkAt(tick)
                                  │
                                  ▼ paused World @ tick (read-only via .snapshot())
                         ┌────────┴─────────┐
                         │  ForkBuilder     │
                         │   .replace(...)  │
                         │   .insert(...)   │
                         │   .drop(...)     │
                         │   .snapshot()    │
                         │   .run(...)      │
                         └────────┬─────────┘
                                  │ (single-use; consumed by .run())
                                  ▼
                ForkResult { bundle, divergence, source }
                                  │
                                  ▼ (optional, richer)
            diffBundles(source, fork.bundle) → BundleDiff (per-tick + state)
```

`run()` reads the source bundle's command/event/execution streams in lockstep with forward-replay so it can populate `Divergence` inline without double-buffering. State-level deltas are deferred to `diffBundles`, which has access to both bundles' snapshots and per-tick `TickDiff`s.

**File layout:**

```
src/
  session-fork.ts           ← new: ForkBuilder + ForkResult + Divergence + run() loop
  session-bundle-diff.ts    ← new: diffBundles + BundleDiff types
  session-replayer.ts       ← modify: add forkAt(targetTick): ForkBuilder
  index.ts                  ← export the new types

tests/
  session-fork.test.ts            ← contract tests
  session-bundle-diff.test.ts     ← diffBundles tests
  session-fork-equivalence.test.ts ← no-substitution fork is semantically equivalent (post-normalizer)
```

## 4. API contract

```ts
// src/session-replayer.ts (additive)
export class SessionReplayer<...> {
  // ... existing methods ...

  /** Begin a counterfactual fork at `targetTick`. Returns a builder
   *  where the caller specifies command substitutions and then calls
   *  `.run({ untilTick })` to materialize the forked timeline.
   *
   *  Inherits openAt's preconditions: tick within range, no recorded
   *  failure ≤ targetTick, bundle has command payloads, and (per
   *  openAt's semantics) honors `persistedEndTick` for incomplete
   *  bundles. */
  forkAt(targetTick: number): ForkBuilder<TEventMap, TCommandMap>;
}

// src/session-fork.ts (new)
export interface ForkBuilder<TEventMap, TCommandMap> {
  /** Replace an existing recorded command at the fork's target tick.
   *  `originalSequence` is the value of `RecordedCommand.sequence` from
   *  the source bundle. The substitution is submitted through the
   *  paused world's `submit()` at run time and receives a fresh
   *  monotonic sequence; the recorder maps original → assigned in
   *  Divergence.commandSequenceMap. Throws if no command with that
   *  sequence exists at the target tick. Throws if the same
   *  originalSequence has already been replaced or dropped. */
  replace<K extends keyof TCommandMap>(
    originalSequence: number,
    newCommand: { type: K; data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Insert a new command at the fork's target tick. Submitted through
   *  `world.submit()` and receives a fresh monotonic sequence. Multiple
   *  inserts preserve builder-call order (FIFO). Inserted commands have
   *  no original sequence; they cannot be the target of a later
   *  replace() or drop() in the same builder (single-tick, single-use). */
  insert<K extends keyof TCommandMap>(
    newCommand: { type: K; data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Drop an existing recorded command at the fork's target tick.
   *  Throws if no command with that sequence exists. Throws if the
   *  same originalSequence has already been replaced or dropped. */
  drop(originalSequence: number): ForkBuilder<TEventMap, TCommandMap>;

  /** Read-only snapshot of the paused world at the fork point. Useful
   *  for agents that branch substitution decisions on state inspection.
   *  Cheap — same shape as `world.snapshot()`; returns a fresh structure
   *  each call (no shared mutable references). Callable any number of
   *  times before `.run()`. */
  snapshot(): WorldSnapshot;

  /** Materialize the fork. Replays the source bundle up to the fork's
   *  target tick (using openAt's logic), submits the queued
   *  substitutions through `world.submit()` in submission order
   *  (drops first to free sequence slots, then replaces in
   *  originalSequence order, then inserts in builder-call order), then
   *  continues forward to `untilTick` recording through a fresh
   *  SessionRecorder (default `MemorySink({ allowSidecar: true })`).
   *
   *  Returns the recorded bundle of the forked timeline plus a
   *  Divergence summary comparing it against the source bundle's
   *  timeline over the overlapping tick range
   *  [targetTick, min(untilTick, source.persistedEndTick)].
   *
   *  Single-use: throws BuilderConsumedError if called twice. */
  run(config: ForkRunConfig): ForkResult<TEventMap, TCommandMap>;
}

export interface ForkRunConfig {
  readonly untilTick: number;
  /** Optional; defaults to `new MemorySink({ allowSidecar: true })`. Caller supplies a
   *  FileSink for disk-backed counterfactual archiving. */
  readonly sink?: SessionSink & SessionSource;
  /** Optional override for the source-label written into the forked
   *  bundle's metadata. Default: `counterfactual-fork-of-<sessionId>@<targetTick>`. */
  readonly sourceLabel?: string;
}

export interface ForkResult<TEventMap, TCommandMap> {
  readonly bundle: SessionBundle<TEventMap, TCommandMap>;
  readonly divergence: Divergence;
  /** Same exposure pattern as Spec 9.1's AgentPlaytestResult.source —
   *  callers can readSidecar / inspect raw records from the fork's sink. */
  readonly source: SessionSink & SessionSource;
}

export interface Divergence {
  /** Earliest tick at which the forked timeline first differs from the
   *  source on commands, executions, or events. Null if no such
   *  divergence over the overlapping range. State-only divergence is
   *  reported by `diffBundles`, not here. Substitutions at
   *  `targetTick` count as divergence at `targetTick` if they produced
   *  any command/execution/event delta. */
  readonly firstDivergentTick: number | null;
  /** Per-tick summary counts. Indexed by tick number (only ticks with
   *  ≥1 delta appear). */
  readonly perTickCounts: ReadonlyMap<number, DivergenceCounts>;
  /** Mapping from original (source) sequence to assigned (fork)
   *  sequence for replace()d commands, plus tick-and-assigned-sequence
   *  for insert()ed commands and tick-and-original-sequence for
   *  drop()ed commands. Used by `diffBundles` to align command streams
   *  across source and fork. */
  readonly commandSequenceMap: CommandSequenceMap;
  /** True iff firstDivergentTick === null. Convenience flag.
   *  Ignores metadata-only deltas (sessionId, recordedAt, etc.) by
   *  definition since this is the inline divergence over the live
   *  command/event/execution streams; the recorder produces fresh
   *  metadata on every fork. */
  readonly equivalent: boolean;
}

export interface DivergenceCounts {
  /** Commands present in source but not fork at this tick (drop()s, or
   *  source-side commands that the fork's prior substitutions caused
   *  the validator to reject differently). */
  readonly commandsSourceOnly: number;
  /** Commands present in fork but not source at this tick (insert()s,
   *  or fork-side commands the validator accepted differently). */
  readonly commandsForkOnly: number;
  /** Commands present in both with differing payload OR differing
   *  execution result. */
  readonly commandsChanged: number;
  /** Execution outcomes (accepted/rejected, error code) that differ. */
  readonly executionsChanged: number;
  /** Events present in source but not fork. */
  readonly eventsSourceOnly: number;
  /** Events present in fork but not source. */
  readonly eventsForkOnly: number;
  /** Events present in both with differing payload. */
  readonly eventsChanged: number;
}

export interface CommandSequenceMap {
  /** For each replace() call: original sequence in source, assigned
   *  sequence in fork (from world.submit()'s monotonic counter). */
  readonly replaced: ReadonlyArray<{ tick: number; originalSequence: number; assignedSequence: number }>;
  /** For each insert() call: assigned sequence in fork. */
  readonly inserted: ReadonlyArray<{ tick: number; assignedSequence: number }>;
  /** For each drop() call: original sequence in source (no fork
   *  counterpart). */
  readonly dropped: ReadonlyArray<{ tick: number; originalSequence: number }>;
}

// src/session-bundle-diff.ts (new)
export function diffBundles<TEventMap, TCommandMap>(
  a: SessionBundle<TEventMap, TCommandMap>,
  b: SessionBundle<TEventMap, TCommandMap>,
  options?: DiffBundlesOptions,
): BundleDiff<TEventMap, TCommandMap>;

export interface DiffBundlesOptions {
  /** Optional CommandSequenceMap from a Divergence — when provided,
   *  diffBundles uses (tick, originalSequence → assignedSequence) to
   *  align command streams across fork and source. Without it,
   *  diffBundles falls back to (tick, type, deepEqual(data)) matching. */
  readonly commandSequenceMap?: CommandSequenceMap;
}

export interface BundleDiff<TEventMap, TCommandMap> {
  readonly firstDivergentTick: number | null;
  /** True iff per-tick deltas are empty AND state-key deltas at every
   *  tick are empty. Metadata fields are NOT compared (every fork has
   *  fresh sessionId/recordedAt). Use `metadataDeltas` if you need
   *  per-field metadata comparison. */
  readonly equivalent: boolean;
  readonly perTickDeltas: ReadonlyMap<number, BundleTickDelta<TEventMap, TCommandMap>>;
  readonly metadataDeltas: ReadonlyArray<{ field: string; a: unknown; b: unknown }>;
}

export interface BundleTickDelta<TEventMap, TCommandMap> {
  readonly commands: {
    readonly sourceOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly forkOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly changed: ReadonlyArray<{ a: RecordedCommand<TCommandMap>; b: RecordedCommand<TCommandMap> }>;
  };
  readonly executions: {
    readonly changed: ReadonlyArray<{ a: CommandExecutionResult; b: CommandExecutionResult }>;
  };
  readonly events: {
    readonly sourceOnly: ReadonlyArray<TEventMap[keyof TEventMap]>;
    readonly forkOnly: ReadonlyArray<TEventMap[keyof TEventMap]>;
    readonly changed: ReadonlyArray<{ a: unknown; b: unknown }>;
  };
  readonly stateKeys: {
    readonly added: ReadonlyArray<string>;
    readonly removed: ReadonlyArray<string>;
    readonly changed: ReadonlyArray<{ key: string; a: unknown; b: unknown }>;
  };
}
```

### 4.1 Substitution mechanism (load-bearing)

**The mechanism is `world.submit()` with sequence post-mapping.** When `run()` materializes the fork:

1. The replayer advances the paused world to `targetTick - 1` and steps it once to enter `targetTick`'s submission window.
2. For each queued op (drops first, then replaces in `originalSequence` order, then inserts in builder-call order):
   - `drop(originalSequence)`: the original command is omitted entirely. No `world.submit()` call.
   - `replace(originalSequence, newCmd)`: `world.submit(newCmd)` is called; the assigned sequence (auto-incremented by the world) is recorded in `CommandSequenceMap.replaced`.
   - `insert(newCmd)`: same — `world.submit(newCmd)`, assigned sequence captured in `CommandSequenceMap.inserted`.
3. Every other source command at `targetTick` that wasn't dropped or replaced is re-submitted via `world.submit()` with its original payload (so the validator decides accept/reject under the new world state, which may differ from the source's outcome — that's the point of counterfactual replay).
4. The world steps once for `targetTick`. The recorder captures everything per its existing contract.
5. From `targetTick + 1` onward, `run()` is just normal forward-replay with the fork's own command stream.

Sequences in the fork bundle are NOT inherited from the source. They restart at the world's `nextCommandResultSequence` for `targetTick`. The `commandSequenceMap` lets `diffBundles` align across the two sequence spaces.

**Why submit() and not direct command-list manipulation?** The world's `submit()` is the only path that runs the validator, gates on `Step` phase, and increments `nextCommandResultSequence` consistently with the rest of the engine. Bypassing it would create a parallel command-injection path, defeat the validator's invariants, and make `accepted: false` substitutions impossible (which §6 specifically requires).

### 4.2 Conflict rules (builder semantics)

The builder enforces these at call time (synchronous; no need to wait for `run()`):

| Rule | Behavior |
|---|---|
| `replace(seq, X)` then `replace(seq, Y)` | Throws `ForkBuilderConflictError(code: 'duplicate_replace')` on the second call. To change a substitution mid-build, construct a fresh builder. |
| `replace(seq, X)` then `drop(seq)` (or vice versa) | Throws `ForkBuilderConflictError(code: 'replace_drop_conflict')` on the second call. |
| `drop(seq)` then `drop(seq)` | Throws `ForkBuilderConflictError(code: 'duplicate_drop')` on the second call. |
| `replace(seq, ...)` or `drop(seq)` where `seq` is not in the source bundle at `targetTick` | Throws `ForkSubstitutionError(code: 'unknown_command_sequence')`. |
| Multiple `insert(...)` calls | Allowed; preserve FIFO builder-call order. Each gets a fresh submit-assigned sequence. |
| `replace` or `drop` of a sequence that came from a prior `insert(...)` | Cannot happen — inserted commands don't have an `originalSequence` and no API exposes their would-be assigned sequence pre-`run()`. |
| Calling `.run()` twice on the same builder | Throws `BuilderConsumedError`. The builder holds a paused world internally; `.run()` advances and consumes it. |
| Calling `.replace`/`.insert`/`.drop` after `.run()` | Throws `BuilderConsumedError`. |
| Calling `.snapshot()` after `.run()` | Throws `BuilderConsumedError`. The snapshot reflects the pre-substitution paused world; post-`run()` that world has been advanced. |

## 5. ADRs

### ADR 1: forks produce a normal `SessionBundle`, not a special "fork bundle" type

**Decision:** `ForkResult.bundle` is a standard `SessionBundle<TEventMap, TCommandMap>` with `metadata.sourceKind: 'synthetic'` and `metadata.sourceLabel: 'counterfactual-fork-of-<sourceSessionId>@<targetTick>'`. No new fork-specific bundle shape, no new schemaVersion bump.

**Rationale:** Reusing the existing bundle shape lets the entire downstream ecosystem (`BundleViewer`, `BundleCorpus`, `runMetrics`, `SessionReplayer.fromBundle`) treat counterfactual results as first-class citizens. A "fork bundle" subtype would require every consumer to either special-case it or generalize, multiplying surface area for marginal gain. The provenance of the fork is recoverable from `metadata.sourceLabel`; downstream consumers that care can parse it.

### ADR 2: substitution is single-tick in v1; multi-tick is chained

**Decision:** `forkAt(tick).replace(...).insert(...).drop(...)` operates on `targetTick` only. To substitute at multiple ticks, the caller chains: `replayer.fromBundle(fork1.bundle).forkAt(tick2).replace(...).run(...)`.

**Rationale:** Multi-tick substitution introduces ordering questions (does fork-tick-N substitution see the effects of fork-tick-M's substitution?) that are best answered by composition rather than primitive complexity. v1 keeps the primitive minimal; chaining covers the multi-tick case at the application layer.

**Cost note:** N-deep counterfactual chains pay O(N × full_replay_cost) because each fork replays from the source's `startTick`. Acceptable for v1; a future spec could add an `openAt(...)`-style "warm replayer" that caches partial replays.

### ADR 3: divergence is computed inline during `run()`, but covers commands/executions/events only

**Decision:** `run()` walks the source bundle's command/execution/event streams in lockstep with forward execution and accumulates `Divergence` counts inline. `Divergence` does NOT include state-key deltas — those require both bundles' snapshots+TickDiffs and are computed by the standalone `diffBundles(source, fork.bundle)` call.

**Rationale:** Computing command/execution/event divergence inline is cheap (per-tick: O(commands_at_tick) plus O(events_at_tick)). Computing state-key divergence inline would require either (a) keeping a parallel "shadow source world" stepped in lockstep — full double-buffering — or (b) folding source TickDiffs forward from the nearest snapshot per tick — possible but redundant with `diffBundles`'s implementation. Splitting the responsibility keeps `Divergence` cheap and `diffBundles` rich. Callers who need state-level diffs (visualization, metric pipelines) call `diffBundles`; callers who only need "did the timeline diverge?" use `Divergence`.

### ADR 4: substituted commands go through `world.submit()`; sequences are post-mapped, not inherited

**Decision:** All substitutions (replace, insert) call `world.submit()` at run time. The world auto-assigns sequences from its own counter. The recorder maintains a side-table `CommandSequenceMap` mapping original (source) sequences to assigned (fork) sequences for `replace()` calls, plus tick-and-assigned-sequence for `insert()` calls and tick-and-original-sequence for `drop()` calls. `BundleDiff` and any other downstream consumer that needs to align fork commands with source commands uses this map.

**Rationale:** Forcing substitutions through `world.submit()` keeps the validator in the loop and preserves all engine invariants around `nextCommandResultSequence`. The alternative — inheriting the original sequence — would require either a new `submitWithSequence()` API (load-bearing engine surface change for one feature) or post-capture sequence rewriting in the recorder (parallel injection path, brittle). Sequence post-mapping via `CommandSequenceMap` is cheap (one entry per substitution; substitutions are rare relative to total commands) and preserves the existing `world.submit()` contract. Drop-leaves-no-record is consistent with how rejected commands are handled today (no execution record, no sequence consumption).

**Drop-leaves-gap analysis:** With sequences sourced from `world.submit()`, dropped commands simply don't exist in the fork's bundle — there is no "gap" to renumber, because the fork's sequence space starts fresh at `targetTick`'s `nextCommandResultSequence`. Existing downstream consumers (`BundleViewer`, `runMetrics`, `BundleCorpus`) iterate by `RecordedCommand[]` order and don't assume contiguity within a tick (the test suite has no such assertion). Verified by audit of `src/bundle-corpus.ts`, `src/run-metrics.ts`, and `src/bundle-viewer/*` during plan-stage.

### ADR 5: fork's recorder uses a fresh `MemorySink({ allowSidecar: true })` by default

**Decision:** `ForkRunConfig.sink` defaults to `new MemorySink({ allowSidecar: true })`. Caller can override (e.g., `FileSink` for disk archiving). `ForkResult.source` exposes the sink so the caller can `readSidecar` for any fork-emitted attachments.

**Rationale:** Mirrors Spec 9.1's `runAgentPlaytest` default-sink behavior — agents can fork-and-emit-markers (with screenshots) without terminating the recorder. Consistency reduces surprise.

### ADR 6: no fork-of-fork tracking in v1

**Decision:** v0.8.12 does not maintain a fork-tree data structure. Each `forkAt(...).run(...)` returns a `ForkResult` whose `bundle` can itself be replayed and forked again, but the engine doesn't track the parent-child lineage beyond the `metadata.sourceLabel` string.

**Rationale:** Fork-tree infra (parent pointers, visualization, breadth-first divergence search) is its own substantial spec. v1 ships the primitive; the tree falls out of repeated application. If a future spec wants to track lineage, it can extend `metadata` with a `forkParent` field.

### ADR 7: `diffBundles` is symmetric and total; `equivalent` ignores metadata

**Decision:** `diffBundles(a, b)` walks the union of `a` and `b`'s tick ranges, producing per-tick deltas for ticks present in either or both. Symmetric: `diffBundles(a, b)` and `diffBundles(b, a)` produce equivalent deltas with `a`/`b` slots swapped. Total: every divergent tick is reported, not just the first. `metadataDeltas` is exposed as a separate field (sessionId, recordedAt, sourceLabel, etc.) but does NOT participate in `BundleDiff.equivalent`.

**Rationale:** Symmetry simplifies reasoning. Totality is necessary for visualization (UI wants to highlight every diff, not just the first); `firstDivergentTick` is a derived helper. Excluding metadata from `equivalent` is necessary because every fork has fresh `sessionId` (random UUID) and `recordedAt` (Date.now) — including those would make every fork non-equivalent to its source by definition, defeating the equivalence test for the no-substitution case (§7). Callers who care about metadata equality inspect `metadataDeltas` directly.

## 6. Error handling

| Failure | Surface | Recovery |
|---|---|---|
| `forkAt` target tick out of range | `BundleRangeError` (existing) | Caller picks a valid tick |
| `forkAt` target tick ≥ recorded `failedTicks[i]` | `BundleIntegrityError(code: 'replay_across_failure')` (existing) | Same as `openAt` |
| `forkAt` on incomplete bundle (`metadata.incomplete: true`) targetTick > `persistedEndTick` | `BundleRangeError` (existing) — same handling as `openAt`'s incomplete-bundle path | Caller picks a tick ≤ persistedEndTick |
| `replace(seq, ...)` or `drop(seq)` with unknown sequence | `ForkSubstitutionError(code: 'unknown_command_sequence', sequence, tick)` | Caller passes a valid sequence from the source bundle |
| Builder conflict (duplicate replace/drop, replace+drop on same seq) | `ForkBuilderConflictError(code: 'duplicate_replace' / 'duplicate_drop' / 'replace_drop_conflict')` | Construct a fresh builder |
| Calling `.run()`, `.replace`, `.insert`, `.drop`, `.snapshot` after `.run()` | `BuilderConsumedError` | Construct a fresh builder via `replayer.forkAt(...)` |
| `run()` substituted command is rejected by validator | Recorder captures `accepted: false` per existing recorder semantics; no execution record produced; divergence reflects the rejection in `commandsChanged` if source-side same-sequence command had different acceptance | None — valid counterfactual semantics |
| `run()` accepted substituted command's handler throws or is missing | World records the failure via existing `WorldTickFailureError` path; recorder captures the tick failure record; `run()` returns the bundle with the failure recorded (matching existing `runAgentPlaytest` semantics for handler failures inside `world.step()`) | Inspect bundle's `failedTicks`; the fork is preserved up to the failing tick |
| `run({ untilTick })` exceeds source bundle's endTick | Fork continues forward beyond the source's range; the inline `Divergence` only covers the overlapping range `[targetTick, source.persistedEndTick]`; ticks past the source end aren't divergence-counted (no source to compare against). `diffBundles` reports them as `forkOnly` per ADR 7 totality | None |
| `run({ untilTick })` below `targetTick` | `RangeError` from `run()` | Caller provides untilTick ≥ targetTick |
| Source bundle has no command payloads | `BundleIntegrityError(code: 'no_replay_payloads')` (existing) | None — bundle isn't replayable |

## 7. Equivalence Invariant

A no-substitution fork (`forkAt(tick).run({ untilTick: source.persistedEndTick })` with no `replace`/`insert`/`drop` calls) MUST produce a `ForkResult` such that:

- `divergence.equivalent === true`
- `divergence.firstDivergentTick === null`
- `divergence.perTickCounts` is empty
- `divergence.commandSequenceMap` is empty (no substitutions)

And after applying the **fork normalizer** documented below, the fork's `SessionBundle` is byte-equivalent to the source's slice over `[targetTick, persistedEndTick]`. The normalizer replaces the following per-recorder fields with stable placeholders:

| Field | Reason for normalization |
|---|---|
| `metadata.sessionId` | Each recorder generates a fresh UUID. |
| `metadata.recordedAt` | `Date.now()` per recorder. |
| `metadata.sourceKind` / `metadata.sourceLabel` | Source is `live`/`disk-replay`; fork is `synthetic`/`counterfactual-fork-of-...`. |
| `metadata.startTick` | Source's startTick is its first recorded tick; fork's startTick is `targetTick`. |
| `metadata.metrics.durationMs` | Wall-clock per replay. |
| `commands[i].sequence` and `commands[i].submissionSequence` | Fork sequences start fresh from the world's counter at `targetTick`; source sequences are session-global. |
| `initialSnapshot` | Source's anchor snapshot is at `metadata.startTick`; fork's anchor snapshot is at `targetTick`. |
| `snapshots` | Periodic snapshots fire at `snapshotInterval`-aligned ticks measured from each recorder's startTick; the cadence shifts between source and fork. |

After normalization, every other field — every `RecordedCommand.type`/`data`/`submissionTick`/`accepted`, every `RecordedEvent`, every `CommandExecutionResult`, every `TickDiff`, every `failedTicks` entry — must match byte-for-byte across the overlapping tick range. This is the strongest invariant: the fork primitive doesn't change behavior for the no-substitution case, so substitution effects are isolable.

The normalizer is implemented in `tests/session-fork-equivalence.test.ts` as a test helper (and lives only there until a non-test consumer needs it). The test asserts byte-equivalence after applying it.

This is verified by `tests/session-fork-equivalence.test.ts` against several source bundles: prototype game, multi-tick events, agent-driven runs, and bundles with periodic snapshots.

## 8. Testing strategy

- **Unit tests** (vitest):
  - `forkAt` precondition errors (out-of-range, replay-across-failure, no-payload, incomplete-beyond-persistedEndTick) — same shape as `openAt`'s tests.
  - `builder.snapshot()` returns a structurally-equivalent snapshot to `world.snapshot()` at the same tick (no shared mutable references; calling it twice produces equal-but-distinct values).
  - `replace`/`insert`/`drop` build correct command lists at `targetTick`.
  - Builder conflict rules enforced (duplicate replace, duplicate drop, replace+drop on same seq, run-twice, ops-after-run).
  - `run()` no-substitution case is byte-equivalent to source over `[targetTick, persistedEndTick]` after applying the fork normalizer.
  - `run()` with `replace` of a command whose validator rejects — bundle records rejection; divergence non-empty.
  - `run()` with `replace` of a command whose handler throws — bundle records `WorldTickFailureError`; `run()` returns successfully; failedTicks populated.
  - `run()` with `insert` of a new command — bundle records the new command at submit-assigned sequence; `commandSequenceMap.inserted` populated.
  - `run()` with `drop` of an existing command — bundle has the command removed; downstream events differ; `commandSequenceMap.dropped` populated.
  - `run()` with multiple inserts — FIFO builder-call order preserved.
  - `divergence.firstDivergentTick` reports the earliest divergence; `equivalent: true` when substitution had no effect.
  - `divergence.commandSequenceMap` correctly maps original → assigned for replaces, captures inserts/drops.
  - `divergence.perTickCounts` split into sourceOnly/forkOnly/changed for commands and events.
- **`diffBundles` tests:**
  - Identical bundles (after normalizer) → `equivalent: true`, empty `perTickDeltas`.
  - Divergent bundles → `firstDivergentTick` matches the inline `Divergence`; `perTickDeltas` covers all divergent ticks including state-key deltas folded from snapshots+TickDiffs.
  - Bundle pairs with different metadata.sessionId → `metadataDeltas` populated, `equivalent` not affected (per ADR 7).
  - Symmetric: `diffBundles(a, b)` ↔ `diffBundles(b, a)` produce equivalent shape.
  - With `commandSequenceMap` option → fork-vs-source command alignment uses `(tick, originalSequence → assignedSequence)`.
  - Without `commandSequenceMap` → fork-vs-source falls back to `(tick, type, deepEqual(data))`.
  - State-key deltas fold from TickDiffs across the tick range; identical to `diffSnapshots` at every snapshot boundary.
- **Integration test:**
  - Full RSI loop: `runSynthPlaytest` produces source bundle; `replayer.forkAt(midTick).replace(...).run({ untilTick: source.persistedEndTick })` produces fork bundle; `diffBundles(source, fork.bundle, { commandSequenceMap: fork.divergence.commandSequenceMap })` reports the substituted command's downstream effect — including state-key deltas.

## 9. Performance

- `run()` per-tick cost is `world.step()` plus the divergence-summary update: O(commands_at_tick) + O(events_at_tick) for the deltas plus map insert if any delta. No state-level work (deferred to `diffBundles`).
- Memory: fork's `MemorySink` size grows like the original recording's; no double-buffering of source state.
- Snapshot strategy: fork's recorder uses the source's `snapshotInterval` default (1000 ticks).
- `diffBundles` per-tick cost when state-keys are folded: O(commands + events + tick-diff-size). Memory: O(N) per-tick deltas for an N-tick bundle. Streaming/lazy variants are a future optimization (NIT from review iter-1).

## 10. Versioning

- civ-engine: `0.8.11 → 0.8.12` (c-bump per AGENTS.md). The change is purely additive — new public API surface (`forkAt`, `ForkBuilder`, `Divergence`, `diffBundles`, `BundleDiff`, plus error/option types) with no breaking changes to existing exports. Per AGENTS.md, c-bumps are for non-breaking changes; b-bumps are reserved for breaking changes (e.g., union widening that breaks exhaustive switches, removed exports, signature changes). Architectural significance is captured in the changelog narrative, not the version axis.

## 11. Open Questions (deferred to plan or future)

1. **Lazy/streaming `BundleDiff` for very long bundles.** v1 returns the full diff eagerly. A streaming variant (per-tick generator) is the obvious follow-up if memory becomes a concern at multi-thousand-tick scale. Deferred — not blocking v1.
2. **Caching warm replayers across chained forks** (ADR 2's cost note). Each chained fork replays from `source.startTick`. A future `WarmReplayer` could cache intermediate worlds. Deferred — not blocking v1.
3. **Fork-tree visualization in BundleViewer.** Out of scope per ADR 6. Future v0.9.x spec.
