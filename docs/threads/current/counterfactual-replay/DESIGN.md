# Counterfactual Replay / Fork — Design Spec

**Status:** Draft v3 (2026-04-29). civ-engine roadmap Spec 5. Awaiting multi-CLI design-3 review.

**v3 deltas vs v2:** addresses iter-2 review findings (Codex + Claude both ITERATE — one BLOCKER convergent across reviewers, plus alignment/normalizer correctness gaps).

- **§4.1 reworked** — substituted commands no longer reorder source commands at `targetTick`. The mechanism walks source commands in their original submission order: drop → skip; replace → submit replacement; otherwise → re-submit. Inserts arrive after all source commands at `targetTick` (explicit, documented). API correction: `world.submitWithResult(type, data)` (not `world.submit(newCmd)`); the actual `submit` signature is `(type, data): boolean`.
- **§7 normalizer rewritten** — corrected field paths against ground-truth schemas:
  - Removed `commands[i].submissionSequence` (doesn't exist on `RecordedCommand`).
  - Added `commands[i].result.sequence` (the nested `CommandSubmissionResult.sequence`).
  - Added `executions[i].submissionSequence` (the actual location of `submissionSequence`).
  - Removed `metadata.metrics.durationMs` (doesn't exist; metrics live per-tick).
  - Added per-tick `metrics` (entire `WorldMetrics` object — every wall-clock subfield differs).
  - Added `metadata.durationTicks`, `metadata.endTick`, `metadata.persistedEndTick`, `metadata.policySeed`.
  - Added `markers` and `attachments` (fork recorder doesn't replay user-emitted markers).
- **`CommandSequenceMap` extended to `preserved` entries** — every source command at `targetTick` (substituted or not) gets a map entry, so `diffBundles` can align the fork's fresh-sequenced commands with the source's original-sequenced commands at `targetTick`. Past `targetTick`, alignment is per-tick submission-order index (documented in §4.3).
- **`DivergenceCounts.executionsChanged` removed** — execution-stream divergence is implied by command-stream divergence (rejected commands have no execution record). Counts collapse cleanly into `commandsChanged`/`commandsSourceOnly`/`commandsForkOnly`.
- **§6 fork-failure-mid-run semantics specified** — matches `runAgentPlaytest`: abort on first `WorldTickFailureError`, return the bundle preserved up to the failing tick, populate `Divergence.perTickCounts` for `[targetTick, T_fail]` only.
- **ADR 4 corrected** — rejected commands DO consume a sequence (validator increment) but produce no execution record.
- **§4.2 expanded** — added row for replace/drop of source command whose original `result.accepted: false` (allowed; replace re-runs validator, drop becomes a true semantic no-op).
- **§4.3 added** — explicit `diffBundles` alignment algorithm (with and without `CommandSequenceMap`).
- **n1/n2/n3 fixes** — ADR 4 audit phrased as plan-stage commitment; §4.1 simplified to defer to `openAt`; §4.1 explicitly shows recorder construction with `sourceKind: 'synthetic'`.

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
   - `insert(newCommand)` — add a command to the tick (after all source commands)
   - `drop(originalSequence)` — remove an existing command from the tick
3. **`run({ untilTick, sink? })`** advances the forked World forward, recording into a fresh `SessionRecorder` over the supplied (or default `MemorySink({ allowSidecar: true })`) sink. Returns a `ForkResult { bundle, divergence, source }`.
4. **`Divergence` summary** describes how the forked timeline diverged from the source over the overlapping tick range: `firstDivergentTick`, per-tick split counts of command-stream / event deltas, the `originalSequence → assignedSequence` map for ALL `targetTick` source commands (preserved + replaced) plus inserts and drops, and a single-bool `equivalent: boolean` flag (true when there are no command/event deltas after applying the metadata-normalizer).
5. **`diffBundles(a, b, options?)`** standalone utility that walks both bundles tick-by-tick and produces a `BundleDiff` (a richer version of `Divergence` with full per-tick payloads instead of summary counts, plus state-key deltas folded from snapshots+TickDiffs). Used for visualization (BundleViewer) and metric pipelines.
6. **`builder.snapshot()`** read-only `WorldSnapshot` of the paused world at the fork point so callers (especially AI agents) can inspect state before deciding what to substitute.

## 2. Non-Goals (v0.8.12)

- **No fork-of-fork.** A `ForkResult.bundle` can be passed to a fresh `SessionReplayer.fromBundle(...).forkAt(...)` to chain (because the fork's bundle is a normal `SessionBundle`), but the fork-tree data structure / breadth-first divergence search is out of scope.
- **No multi-tick substitution in one call.** Substitutions operate on the fork's `targetTick` only. Subsequent counterfactuals at later ticks require chaining (out of scope above).
- **No replay-across-failure.** Inherits the existing `BundleIntegrityError(code: 'replay_across_failure')` constraint.
- **No automatic divergence-search policies.** v0.8.12 ships the primitive; agents and metric pipelines compose it to find interesting divergences.
- **No bundle-format changes.** The fork's output bundle is a normal `SessionBundle` with `sourceKind: 'synthetic'` and `sourceLabel: 'counterfactual-fork-of-<sessionId>@<targetTick>'`.
- **No mutable world access from the builder.** `builder.snapshot()` returns a read-only `WorldSnapshot`; no `builder.world(): World`.
- **No marker/attachment replay.** Source bundle markers and attachments are user-emitted via recorder hooks (`SessionRecorder.addMarker` / `attach`), not world-driven; the fork's recorder writes its own marker stream from scratch (empty unless callers emit fork-time markers via the agent driver). `ForkResult.bundle.markers` and `attachments` reflect only the fork's own emissions, which is the correct counterfactual semantic.
- **No UI.** `BundleViewer` integration (e.g., side-by-side replay panel) is a future v0.9.x spec.
- **No inline state-key divergence.** `Divergence` (returned from `run()`) summarizes commands/events only. State-level diffs require `diffBundles(source, fork.bundle)`, which has access to both bundles' snapshots+TickDiffs and can fold them in lockstep.

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
            diffBundles(source, fork.bundle, { commandSequenceMap }) → BundleDiff
```

`run()` reads the source bundle's command/event streams in lockstep with forward-replay so it can populate `Divergence` inline without double-buffering. State-level deltas are deferred to `diffBundles`, which has access to both bundles' snapshots and per-tick `TickDiff`s.

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
   *  paused world's `submitWithResult()` at run time and receives a
   *  fresh monotonic sequence; the recorder maps original → assigned
   *  in `Divergence.commandSequenceMap.replaced`. Throws if no command
   *  with that sequence exists at the target tick. Throws if the same
   *  originalSequence has already been replaced or dropped. */
  replace<K extends keyof TCommandMap>(
    originalSequence: number,
    newCommand: { type: K; data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Insert a new command at the fork's target tick, AFTER all source
   *  commands at this tick (substitution-or-preserved). Submitted
   *  through `world.submitWithResult()` and receives a fresh monotonic
   *  sequence. Multiple inserts preserve builder-call order (FIFO).
   *  Inserted commands have no original sequence; they cannot be the
   *  target of a later replace() or drop() in the same builder
   *  (single-tick, single-use). */
  insert<K extends keyof TCommandMap>(
    newCommand: { type: K; data: TCommandMap[K] },
  ): ForkBuilder<TEventMap, TCommandMap>;

  /** Drop an existing recorded command at the fork's target tick.
   *  Throws if no command with that sequence exists. Throws if the
   *  same originalSequence has already been replaced or dropped. */
  drop(originalSequence: number): ForkBuilder<TEventMap, TCommandMap>;

  /** Read-only snapshot of the paused world at the fork point. Useful
   *  for agents that branch substitution decisions on state inspection.
   *  Cheap — same shape as `world.serialize()`; returns a fresh
   *  structure each call (no shared mutable references). Callable any
   *  number of times before `.run()`. */
  snapshot(): WorldSnapshot;

  /** Materialize the fork. Replays the source bundle up to the fork's
   *  target tick (using openAt's logic), submits substitutions through
   *  `world.submitWithResult()` per the §4.1 algorithm, then continues
   *  forward to `untilTick` recording through a fresh SessionRecorder
   *  (default `MemorySink({ allowSidecar: true })`).
   *
   *  Returns the recorded bundle of the forked timeline plus a
   *  Divergence summary comparing it against the source bundle's
   *  timeline over the overlapping tick range
   *  [targetTick, min(untilTick, source.metadata.persistedEndTick)].
   *
   *  Single-use: throws BuilderConsumedError if called twice.
   *
   *  On WorldTickFailureError mid-run: aborts (matching
   *  runAgentPlaytest); returns the bundle preserved up to the failing
   *  tick; Divergence covers [targetTick, T_fail-1]. */
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
   *  source on commands or events. Null if no such divergence over the
   *  overlapping range. State-only divergence is reported by
   *  `diffBundles`, not here. Substitutions at `targetTick` count as
   *  divergence at `targetTick` if they produced any command/event
   *  delta. */
  readonly firstDivergentTick: number | null;
  /** Per-tick summary counts. Indexed by tick number (only ticks with
   *  ≥1 delta appear). Populated for ticks [targetTick, runEnd] where
   *  runEnd = min(untilTick, source.metadata.persistedEndTick) on
   *  success, or T_fail-1 on mid-run failure. */
  readonly perTickCounts: ReadonlyMap<number, DivergenceCounts>;
  /** Mapping from original (source) sequence to assigned (fork)
   *  sequence for every source command at `targetTick` (replaced and
   *  preserved), plus inserts (assigned-only) and drops
   *  (original-only). Used by `diffBundles` to align command streams
   *  across source and fork at `targetTick`. Past `targetTick`,
   *  alignment is per-tick submission-order index (see §4.3). */
  readonly commandSequenceMap: CommandSequenceMap;
  /** True iff firstDivergentTick === null. Convenience flag.
   *  Ignores metadata-only deltas (sessionId, recordedAt, etc.) by
   *  definition since this is the inline divergence over the live
   *  command/event streams; the recorder produces fresh metadata on
   *  every fork. */
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
   *  acceptance/execution outcome. (Execution-stream divergence is
   *  implied: rejected commands have no execution record, so a
   *  source-accepted-fork-rejected case shows up here as a single
   *  command delta, not a separate execution delta.) */
  readonly commandsChanged: number;
  /** Events present in source but not fork. */
  readonly eventsSourceOnly: number;
  /** Events present in fork but not source. */
  readonly eventsForkOnly: number;
  /** Events present in both with differing payload. */
  readonly eventsChanged: number;
}

export interface CommandSequenceMap {
  /** Source commands at `targetTick` whose payload+type was preserved
   *  (re-submitted unchanged in §4.1's algorithm). The fork's
   *  recorder writes them with fresh `assignedSequence`s. */
  readonly preserved: ReadonlyArray<{ tick: number; originalSequence: number; assignedSequence: number }>;
  /** For each replace() call: original sequence in source, assigned
   *  sequence in fork (from world.submitWithResult()'s monotonic
   *  counter). */
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
   *  diffBundles uses it for `targetTick` alignment. Without it,
   *  diffBundles falls back to per-tick submission-order index. See
   *  §4.3. */
  readonly commandSequenceMap?: CommandSequenceMap;
}

export interface BundleDiff<TEventMap, TCommandMap> {
  readonly firstDivergentTick: number | null;
  /** True iff per-tick command/event/state deltas are empty.
   *  Metadata fields are NOT compared (every fork has fresh
   *  sessionId/recordedAt). Markers and attachments are NOT compared
   *  (fork doesn't replay them — they're recorder-emitted, not
   *  world-driven). Use `metadataDeltas` / `markersDeltas` /
   *  `attachmentsDeltas` if you need those comparisons. */
  readonly equivalent: boolean;
  readonly perTickDeltas: ReadonlyMap<number, BundleTickDelta<TEventMap, TCommandMap>>;
  readonly metadataDeltas: ReadonlyArray<{ field: string; a: unknown; b: unknown }>;
  /** Markers in `a.markers` but not `b.markers`, vice versa, and
   *  ones with differing payload. Reported separately from
   *  `equivalent` because fork bundles always have empty markers
   *  unless the caller emits fork-time markers. */
  readonly markersDeltas: {
    readonly aOnly: ReadonlyArray<Marker>;
    readonly bOnly: ReadonlyArray<Marker>;
    readonly changed: ReadonlyArray<{ a: Marker; b: Marker }>;
  };
  /** Same shape as markersDeltas, for attachments. */
  readonly attachmentsDeltas: {
    readonly aOnly: ReadonlyArray<AttachmentDescriptor>;
    readonly bOnly: ReadonlyArray<AttachmentDescriptor>;
    readonly changed: ReadonlyArray<{ a: AttachmentDescriptor; b: AttachmentDescriptor }>;
  };
}

export interface BundleTickDelta<TEventMap, TCommandMap> {
  readonly commands: {
    readonly sourceOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly forkOnly: ReadonlyArray<RecordedCommand<TCommandMap>>;
    readonly changed: ReadonlyArray<{ a: RecordedCommand<TCommandMap>; b: RecordedCommand<TCommandMap> }>;
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

**The mechanism is `world.submitWithResult()` with sequence post-mapping.** When `run()` materializes the fork:

1. Use `openAt(targetTick)`'s logic to leave the world paused at `world.tick === targetTick - 1` (the same forward-replay path; `openAt` ends with the world ready to accept commands for `targetTick`).
2. Construct a fresh `SessionRecorder` over the configured sink with `sourceKind: 'synthetic'`, `sourceLabel: ForkRunConfig.sourceLabel ?? 'counterfactual-fork-of-<sourceSessionId>@<targetTick>'`. Recorder's `start()` captures the initial snapshot at `targetTick`.
3. Walk source commands at `targetTick` in **original `sequence` order** (preserves submission order — handler invocation depends on it):
   - If the source command's `sequence` is in the builder's `dropped` set → skip (no submission).
   - If the source command's `sequence` is in the builder's `replaced` map → call `world.submitWithResult(replacement.type, replacement.data)`; record `originalSequence → assignedSequence` in `commandSequenceMap.replaced`.
   - Otherwise → call `world.submitWithResult(source.type, source.data)` to re-submit unchanged; record `originalSequence → assignedSequence` in `commandSequenceMap.preserved`. (The validator runs afresh — same world state, same payload, so the outcome is normally identical to the source's; if substituted-earlier-in-the-tick changed world state, the validator may now decide differently, which is the entire point of counterfactual replay.)
4. After all source commands processed, submit inserts in builder-call order: `world.submitWithResult(insert.type, insert.data)`; record assigned sequence in `commandSequenceMap.inserted`.
5. Step the world for `targetTick` (`world.step()`). The recorder's existing `submitWithResult` wrap and listeners capture commands/events/executions/diffs.
6. From `targetTick + 1` onward, `run()` continues the existing replay loop (from `openAt`'s implementation), feeding source commands at each tick through `world.submitWithResult()` (so the fork's recorder captures them with fresh fork-side sequences).
7. While stepping, walk source `ticks[]` and `commands[]` in lockstep to populate `Divergence.perTickCounts` (per-tick command/event delta accumulation).

Sequences in the fork bundle are NOT inherited from the source. They restart at the rebuilt world's `nextCommandResultSequence` (= 0 after hydration, since `WorldSnapshotV5` does not preserve the counter — see `src/serializer.ts:62-86` and `src/world.ts:1253`'s explanatory comment). The `commandSequenceMap` lets `diffBundles` align the sequence spaces at `targetTick`.

**Why submitWithResult and not direct command-list manipulation?** It's the only path that runs validators, gates on `Step` phase, increments `nextCommandResultSequence`, and feeds the recorder through the wrap installed in `SessionRecorder.start()` (`src/session-recorder.ts:163-172`). Bypassing it would create a parallel command-injection path, defeat the validator's invariants, and make `accepted: false` substitutions impossible.

**Why use `submitWithResult` instead of `submit`?** The boolean-returning `submit(type, data): boolean` (`src/world.ts:784-786`) loses the assigned sequence we need to populate `commandSequenceMap`. `submitWithResult(type, data): CommandSubmissionResult` (`src/world.ts:792-822`) returns the result with `result.sequence` populated.

### 4.2 Conflict rules (builder semantics)

The builder enforces these at call time (synchronous; no need to wait for `run()`):

| Rule | Behavior |
|---|---|
| `replace(seq, X)` then `replace(seq, Y)` | Throws `ForkBuilderConflictError(code: 'duplicate_replace')` on the second call. To change a substitution mid-build, construct a fresh builder. |
| `replace(seq, X)` then `drop(seq)` (or vice versa) | Throws `ForkBuilderConflictError(code: 'replace_drop_conflict')` on the second call. |
| `drop(seq)` then `drop(seq)` | Throws `ForkBuilderConflictError(code: 'duplicate_drop')` on the second call. |
| `replace(seq, ...)` or `drop(seq)` where `seq` is not in the source bundle at `targetTick` | Throws `ForkSubstitutionError(code: 'unknown_command_sequence')`. |
| `replace(seq, ...)` or `drop(seq)` where the source command at `seq` has `result.accepted: false` (rejected by source's validator) | **Allowed.** Replace re-runs the validator on the new payload; drop becomes a true semantic no-op (rejected commands run no handlers). The `divergence` correctly reports the result. |
| Multiple `insert(...)` calls | Allowed; preserve FIFO builder-call order. Each gets a fresh submit-assigned sequence. |
| `replace` or `drop` of a sequence that came from a prior `insert(...)` | Cannot happen — inserted commands don't have an `originalSequence` and no API exposes their would-be assigned sequence pre-`run()`. |
| Calling `.run()` twice on the same builder | Throws `BuilderConsumedError`. The builder holds a paused world internally; `.run()` advances and consumes it. |
| Calling `.replace`/`.insert`/`.drop` after `.run()` | Throws `BuilderConsumedError`. |
| Calling `.snapshot()` after `.run()` | Throws `BuilderConsumedError`. The snapshot reflects the pre-substitution paused world; post-`run()` that world has been advanced. |

### 4.3 `diffBundles` alignment algorithm

For ALL ticks in the union of `a`'s and `b`'s ranges:

- **At `targetTick` (only meaningful when `commandSequenceMap` is provided and `a` is the source bundle, `b` is the fork bundle):** alignment uses `commandSequenceMap`. Source command at `originalSequence = N` aligns with the fork command whose `sequence` matches the corresponding `assignedSequence` (from `replaced` or `preserved`). Fork commands whose `sequence` matches a `commandSequenceMap.inserted` entry are `forkOnly`. Source commands whose `originalSequence` matches a `commandSequenceMap.dropped` entry are `sourceOnly`. Commands present in both via the map but with differing payload OR differing `result.accepted` are `changed`.
- **At ticks > `targetTick` (with `commandSequenceMap`):** the fork generates its own commands (each tick's source-side commands are re-submitted by the replay loop in original sequence order). Alignment is by **per-tick submission-order index** — `a.commands[k_at_t]` vs `b.commands[k_at_t]`. If lengths differ, the trailing extras are `sourceOnly` / `forkOnly`; mismatched indices are `changed` if same type, else split into `sourceOnly` / `forkOnly`.
- **Without `commandSequenceMap` (cross-bundle diff with no shared lineage):** alignment is **per-tick submission-order index** at every tick, as above. This is best-effort — duplicate same-type same-data commands at the same tick may be misclassified as `changed` instead of bytewise equal under index swap, but for cross-bundle diffs without a shared sequence space, no better algorithm exists in O(N).

Events at every tick align by **submission-order index** (events are emitted in deterministic order from the world's event bus).

State-key deltas at every tick are folded from `a.snapshots[]` + `a.ticks[].diff` and `b.snapshots[]` + `b.ticks[].diff`, computed by walking the snapshot+TickDiff streams per tick (the same fold `SessionReplayer.openAt` already uses for hydration) and applying `diffSnapshots` at each pair.

## 5. ADRs

### ADR 1: forks produce a normal `SessionBundle`, not a special "fork bundle" type

**Decision:** `ForkResult.bundle` is a standard `SessionBundle<TEventMap, TCommandMap>` with `metadata.sourceKind: 'synthetic'` and `metadata.sourceLabel: 'counterfactual-fork-of-<sourceSessionId>@<targetTick>'`. No new fork-specific bundle shape, no new schemaVersion bump.

**Rationale:** Reusing the existing bundle shape lets the entire downstream ecosystem (`BundleViewer`, `BundleCorpus`, `runMetrics`, `SessionReplayer.fromBundle`) treat counterfactual results as first-class citizens. A "fork bundle" subtype would require every consumer to either special-case it or generalize, multiplying surface area for marginal gain. The provenance of the fork is recoverable from `metadata.sourceLabel`; downstream consumers that care can parse it.

### ADR 2: substitution is single-tick in v1; multi-tick is chained

**Decision:** `forkAt(tick).replace(...).insert(...).drop(...)` operates on `targetTick` only. To substitute at multiple ticks, the caller chains: `replayer.fromBundle(fork1.bundle).forkAt(tick2).replace(...).run(...)`.

**Rationale:** Multi-tick substitution introduces ordering questions (does fork-tick-N substitution see the effects of fork-tick-M's substitution?) that are best answered by composition rather than primitive complexity. v1 keeps the primitive minimal; chaining covers the multi-tick case at the application layer.

**Cost note:** N-deep counterfactual chains pay O(N × full_replay_cost) because each fork replays from the source's `startTick`. Acceptable for v1; a future spec could add an `openAt(...)`-style "warm replayer" that caches partial replays.

### ADR 3: divergence is computed inline during `run()`, but covers commands and events only

**Decision:** `run()` walks the source bundle's command/event streams in lockstep with forward execution and accumulates `Divergence` counts inline. `Divergence` does NOT include state-key deltas — those require both bundles' snapshots+TickDiffs and are computed by the standalone `diffBundles(source, fork.bundle)` call. Execution-stream deltas are also folded into command-stream counts (rejected commands have no execution record; a divergence in acceptance shows up as a single `commandsChanged` entry, not a duplicate execution delta).

**Rationale:** Computing command/event divergence inline is cheap (per-tick: O(commands_at_tick) plus O(events_at_tick)). Computing state-key divergence inline would require either (a) keeping a parallel "shadow source world" stepped in lockstep — full double-buffering — or (b) folding source TickDiffs forward from the nearest snapshot per tick — possible but redundant with `diffBundles`'s implementation. Splitting the responsibility keeps `Divergence` cheap and `diffBundles` rich.

### ADR 4: substituted and preserved commands at `targetTick` go through `world.submitWithResult()`; sequences are post-mapped

**Decision:** All commands at `targetTick` (substituted + preserved) call `world.submitWithResult()` at run time. The world auto-assigns sequences from its own counter. The recorder maintains a side-table `CommandSequenceMap` mapping original (source) sequences to assigned (fork) sequences for both `replaced` and `preserved` entries, plus `inserted` (assigned-only) and `dropped` (original-only). `BundleDiff` and any other downstream consumer that needs to align fork commands with source commands at `targetTick` uses this map. Past `targetTick`, alignment is per-tick submission-order index (§4.3).

**Rationale:** Forcing all `targetTick` commands through `world.submitWithResult()` keeps the validator in the loop and preserves all engine invariants around `nextCommandResultSequence`. The alternative — inheriting the original sequence — would require either a new `submitWithSequence()` API (load-bearing engine surface change for one feature) or post-capture sequence rewriting in the recorder (parallel injection path, brittle). Sequence post-mapping via `CommandSequenceMap` is cheap (one entry per `targetTick` command; `targetTick` typically has ≤10 commands).

**Sequence-consumption note (corrected from v2):** Validator-rejected commands DO consume a sequence — `world.submitWithResult` always increments `nextCommandResultSequence` via `createCommandSubmissionResult` (`src/world.ts:1899-1910`), regardless of acceptance. What rejected commands DON'T produce is an execution record (`src/world.ts:798-808` short-circuits before `commandQueue.push`). The fork recorder still captures the rejected `RecordedCommand` (with `result.accepted: false`) per existing recorder semantics.

**Drop-leaves-no-record analysis:** With sequences sourced from `world.submitWithResult()`, dropped commands simply don't exist in the fork's bundle — there is no "gap" to renumber, because the fork's sequence space starts fresh at `targetTick`. Existing downstream consumers (`BundleViewer`, `runMetrics`, `BundleCorpus`) iterate by `RecordedCommand[]` order and don't assume contiguity within a tick. (Plan-stage will verify this against `src/bundle-corpus.ts`, `src/run-metrics.ts`, and `src/bundle-viewer/*` and update this ADR if any consumer's invariant needs accommodation.)

### ADR 5: fork's recorder uses a fresh `MemorySink({ allowSidecar: true })` by default

**Decision:** `ForkRunConfig.sink` defaults to `new MemorySink({ allowSidecar: true })`. Caller can override (e.g., `FileSink` for disk archiving). `ForkResult.source` exposes the sink so the caller can `readSidecar` for any fork-emitted attachments.

**Rationale:** Mirrors Spec 9.1's `runAgentPlaytest` default-sink behavior — agents can fork-and-emit-markers (with screenshots) without terminating the recorder. Consistency reduces surprise.

### ADR 6: no fork-of-fork tracking in v1

**Decision:** v0.8.12 does not maintain a fork-tree data structure. Each `forkAt(...).run(...)` returns a `ForkResult` whose `bundle` can itself be replayed and forked again, but the engine doesn't track the parent-child lineage beyond the `metadata.sourceLabel` string.

**Rationale:** Fork-tree infra (parent pointers, visualization, breadth-first divergence search) is its own substantial spec. v1 ships the primitive; the tree falls out of repeated application. If a future spec wants to track lineage, it can extend `metadata` with a `forkParent` field.

### ADR 7: `diffBundles` is symmetric and total; `equivalent` ignores metadata, markers, and attachments

**Decision:** `diffBundles(a, b)` walks the union of `a` and `b`'s tick ranges, producing per-tick deltas for ticks present in either or both. Symmetric: `diffBundles(a, b)` and `diffBundles(b, a)` produce equivalent deltas with `a`/`b` slots swapped. Total: every divergent tick is reported, not just the first. `metadataDeltas`, `markersDeltas`, and `attachmentsDeltas` are exposed as separate fields but do NOT participate in `BundleDiff.equivalent`.

**Rationale:** Symmetry simplifies reasoning. Totality is necessary for visualization (UI wants to highlight every diff, not just the first); `firstDivergentTick` is a derived helper. Excluding metadata, markers, and attachments from `equivalent` is necessary because:

- Every fork has fresh `sessionId` (random UUID) and `recordedAt` (Date.now); including them would make every fork non-equivalent to its source by definition, defeating the equivalence test for the no-substitution case (§7).
- Markers are user-emitted via recorder hooks (`SessionRecorder.addMarker`), not derivable from world state. The fork's recorder writes its own marker stream from scratch; counterfactual semantics are about world-driven content, not user annotations.
- Attachments follow markers (typically attached to a marker).

Callers who care about metadata/marker/attachment equality inspect the dedicated `*Deltas` fields directly.

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
| `run()` accepted substituted command's handler throws (or any handler at any fork tick throws) | World throws `WorldTickFailureError`; `run()` catches it (matching `runAgentPlaytest`'s behavior at `src/ai-playtester.ts:217-222`); recorder captures the tick failure record; bundle is preserved up to `T_fail - 1` (last completed tick); `Divergence.perTickCounts` covers `[targetTick, T_fail - 1]`. `run()` returns `ForkResult` (no rethrow); caller inspects `bundle.metadata.failedTicks` and `bundle.failures[]` | Inspect bundle's `failedTicks`; the fork is preserved up to the failing tick |
| `run({ untilTick })` exceeds source bundle's `persistedEndTick` | Fork continues forward beyond the source's range; the inline `Divergence` only covers the overlapping range `[targetTick, source.persistedEndTick]`; ticks past the source end aren't divergence-counted (no source to compare against). `diffBundles` reports them as `forkOnly` per ADR 7 totality | None |
| `run({ untilTick })` below `targetTick` | `RangeError` from `run()` | Caller provides untilTick ≥ targetTick |
| Source bundle has no command payloads | `BundleIntegrityError(code: 'no_replay_payloads')` (existing) | None — bundle isn't replayable |

## 7. Equivalence Invariant

A no-substitution fork (`forkAt(tick).run({ untilTick: source.persistedEndTick })` with no `replace`/`insert`/`drop` calls) MUST produce a `ForkResult` such that:

- `divergence.equivalent === true`
- `divergence.firstDivergentTick === null`
- `divergence.perTickCounts` is empty
- `divergence.commandSequenceMap.replaced/inserted/dropped` are empty; `commandSequenceMap.preserved` has one entry per source command at `targetTick`

And after applying the **fork normalizer** documented below, the fork's `SessionBundle` is byte-equivalent to the source's slice over `[targetTick, persistedEndTick]`.

The normalizer replaces or strips the following per-recorder fields:

**Bundle metadata (`SessionBundle.metadata`):**

| Field | Reason for normalization |
|---|---|
| `metadata.sessionId` | Each recorder generates a fresh UUID. |
| `metadata.recordedAt` | `Date.now()` per recorder. |
| `metadata.sourceKind` / `metadata.sourceLabel` | Source is `live`/`disk-replay`; fork is `synthetic`/`counterfactual-fork-of-...`. |
| `metadata.startTick` | Source's startTick is its first recorded tick; fork's startTick is `targetTick`. |
| `metadata.endTick` / `metadata.persistedEndTick` / `metadata.durationTicks` | Computed from `startTick` and tick count; differ when `startTick` differs. |
| `metadata.policySeed` | Synthetic source bundles carry a seed (`src/session-bundle.ts:101-106`); fork's recorder doesn't propagate it (different lineage). |

**Per-tick metrics (`SessionTickEntry.metrics: WorldMetrics`):** the entire `metrics` field is normalized (set to a stable placeholder). All wall-clock subfields differ across recorders (`durationMs.{total,commands,systems,resources,diff}`, `simulation.tps`, `systems[].durationMs` — see `src/world.ts:89-122`). Logical subfields (`tick`, `entityCount`, `componentStoreCount`, `commandStats`, `query`, `spatial.explicitSyncs`) are deterministic but inseparable from the wall-clock subfields in the existing serialization, so the whole `metrics` field is stripped. (A future spec could add a `WorldMetricsLogical` projection if the equivalence test wants to compare deterministic subfields.)

**Per-command nested fields (`RecordedCommand`):**

| Field | Reason |
|---|---|
| `commands[i].sequence` | Fork sequences start fresh from the rebuilt world's counter at `targetTick`; source sequences are session-global. |
| `commands[i].result.sequence` | Same reason — `CommandSubmissionResult.sequence` mirrors the top-level `sequence`, but lives in the nested result object. Both must be normalized for byte-equivalence. |
| `commands[i].result.tick` | Same value as the parent `commands[i].submissionTick`, normally identical between source and fork; included here for completeness if any future divergence appears. |

**Per-execution fields (`CommandExecutionResult`):**

| Field | Reason |
|---|---|
| `executions[i].submissionSequence` | Existing `SessionReplayer.selfCheck` already strips this for replay-vs-original comparison (`src/session-replayer.ts:382-393`); fork normalizer mirrors that stripping. |

**Per-snapshot fields (`SessionBundle.initialSnapshot` and `snapshots[]`):**

| Field | Reason |
|---|---|
| `initialSnapshot` | Source's anchor snapshot is at `metadata.startTick`; fork's anchor snapshot is at `targetTick`. Compared post-normalization at the matching anchor tick. |
| `snapshots[]` cadence | Periodic snapshots fire at `snapshotInterval`-aligned ticks measured from each recorder's startTick; the cadence shifts between source and fork. The normalizer aligns by tick number and compares matching-tick snapshots structurally, ignoring intermediate ticks where one side has a snapshot and the other doesn't. |

**Top-level bundle fields:**

| Field | Reason |
|---|---|
| `markers[]` | Fork's recorder doesn't replay user-emitted markers (per §2 non-goal). Normalizer strips both sides for the equivalence test. |
| `attachments[]` | Same — attachments accompany markers. |

After normalization, every other field — every `RecordedCommand.type`/`data`/`submissionTick`/`accepted`/`code`/`message`/`details`, every `RecordedEvent.type`/`data`, every `CommandExecutionResult.executed`/`code`/`message`/`details`/`tick`, every `TickDiff`, every `SessionTickEntry.tick`, every `failures[]` entry — must match byte-for-byte across the overlapping tick range.

The normalizer is implemented in `tests/session-fork-equivalence.test.ts` as a test helper (and lives only there until a non-test consumer needs it). The test asserts byte-equivalence after applying it. Verified against several source bundles: prototype game, multi-tick events, agent-driven runs, and bundles with periodic snapshots.

This is the strongest invariant: the fork primitive doesn't change behavior for the no-substitution case, so substitution effects are isolable.

## 8. Testing strategy

- **Unit tests** (vitest):
  - `forkAt` precondition errors (out-of-range, replay-across-failure, no-payload, incomplete-beyond-persistedEndTick) — same shape as `openAt`'s tests.
  - `builder.snapshot()` returns a structurally-equivalent snapshot to `world.serialize()` at the same tick (no shared mutable references; calling it twice produces equal-but-distinct values).
  - `replace`/`insert`/`drop` build correct command lists at `targetTick`.
  - Builder conflict rules enforced (duplicate replace, duplicate drop, replace+drop on same seq, run-twice, ops-after-run).
  - Replace/drop of source command with `result.accepted: false` is allowed and produces sensible divergence.
  - `run()` no-substitution case is byte-equivalent to source over `[targetTick, persistedEndTick]` after applying the fork normalizer.
  - `run()` no-substitution case populates `commandSequenceMap.preserved` with one entry per source command at `targetTick`, matching `(originalSequence, assignedSequence)` pairs.
  - `run()` with `replace` of a command whose validator rejects — bundle records rejection; divergence non-empty.
  - `run()` with `replace` of a command whose handler throws — bundle has `failures[]` entry; `run()` returns successfully (no rethrow); `Divergence.perTickCounts` covers `[targetTick, T_fail-1]`.
  - `run()` with `insert` of a new command — bundle records the new command at submit-assigned sequence; `commandSequenceMap.inserted` populated.
  - `run()` with `drop` of an existing command — bundle has the command removed; downstream events differ; `commandSequenceMap.dropped` populated.
  - `run()` with multiple inserts — FIFO builder-call order preserved; inserts appear after all source commands at `targetTick`.
  - `divergence.firstDivergentTick` reports the earliest divergence; `equivalent: true` when substitution had no effect.
  - `divergence.commandSequenceMap` correctly maps original → assigned for replaces and preserves; captures inserts/drops.
  - `divergence.perTickCounts` split into sourceOnly/forkOnly/changed for commands and events.
- **`diffBundles` tests:**
  - Identical bundles (after normalizer) → `equivalent: true`, empty `perTickDeltas`.
  - Divergent bundles → `firstDivergentTick` matches the inline `Divergence`; `perTickDeltas` covers all divergent ticks including state-key deltas folded from snapshots+TickDiffs.
  - Bundle pairs with different `metadata.sessionId` → `metadataDeltas` populated, `equivalent` not affected (per ADR 7).
  - Bundle pairs with different markers → `markersDeltas` populated, `equivalent` not affected (per ADR 7).
  - Symmetric: `diffBundles(a, b)` ↔ `diffBundles(b, a)` produce equivalent shape.
  - With `commandSequenceMap` option → `targetTick` alignment uses the map; ticks > `targetTick` align by per-tick submission-order index.
  - Without `commandSequenceMap` → cross-bundle alignment is per-tick submission-order index at every tick; duplicate same-type same-data commands may show as `changed` under index swap (best-effort fallback).
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
4. **Logical-only `WorldMetrics` projection.** §7's normalizer strips per-tick `metrics` wholesale because logical subfields are inseparable from wall-clock subfields in the existing serialization. A future `WorldMetricsLogical` projection would let the equivalence test compare deterministic subfields. Not blocking.
