# Strict-Mode Determinism Enforcement — Design Spec

**Status:** Accepted v3 (2026-04-29). Both reviewers verified iter-2 fossils cleared; one residual `_inMaintenance` reference in §6 was caught by design-3 verification and folded into the same v3 doc as a single-line fix. No structural changes pending. Move to plan phase.

**Scope:** Tier-3 Spec 6 from `docs/design/ai-first-dev-roadmap.md`. Independent of other specs. Adds an opt-in `World({ strict: true })` flag that rejects content mutations from outside system phases at runtime, with explicit escape hatches for setup, deserialization, and out-of-tick maintenance.

**Author:** civ-engine team.

**Related primitives:** `World`, `World.executeTickOrThrow`, `World.applySnapshot`, `World.recover`, `WorldConfig`, `WorldTickFailureError`. Connection to Spec 1: today's determinism contract is documented but not enforced; `SessionReplayer.selfCheck` is the post-hoc verification mechanism. Strict mode makes the contract structural — violations throw at the source.

## 1. Goals

- Add `WorldConfig.strict?: boolean` (default `false`). Existing behavior unchanged for non-strict worlds.
- When `strict === true`, content mutations are accepted only when the world is in one of these states:
  1. Inside a system phase (anywhere within `executeTickOrThrow`).
  2. Inside the explicit setup window (from construction until first `step()` or explicit `world.endSetup()`).
  3. Inside an explicit `world.runMaintenance(fn)` callback.
  4. Inside `World.applySnapshot(...)` or `World.deserialize(...)` (engine-internal state replacement; bypasses the gate by design).
- Violations throw `StrictModeViolationError` synchronously at the call site with `details = { method, phase, advice }`.
- Registration calls (`registerComponent`, `registerSystem`, `registerHandler`, `registerValidator`, `registerResource`) are framework setup and are NOT gated. They are allowed at any time.

The deliverable is an additive, non-breaking flag plus internal guards on existing mutation methods. No public API is removed or renamed.

## 2. Non-Goals

- **Default-on strict mode.** Opt-in only; flipping the default breaks every existing caller that hand-rolls component/state mutations between ticks.
- **Async / concurrent strict mode.** v1 covers only synchronous tick execution.
- **Strict mode for read APIs.** Reads are always allowed.
- **Cross-world strict mode.** The flag is per-`World` instance.
- **Validation of system writes against component-registration boundaries.** Out of scope; the existing engine validates on register/write paths.
- **A "violation count" metric.** The flag is binary (allow vs throw); no soft mode.

## 3. Architecture Overview

Add three boolean fields to `World`:

| Field | Set when | Cleared when |
| --- | --- | --- |
| `_inTickPhase` | top of `runTick` (covers `step()`, `stepWithResult()`, and `GameLoop.start()` timer-driven ticks — all entry points converge on the same `runTick` body) | end of `runTick` finally block — *after* `onTickFailure` listeners fire but before control returns to the caller |
| `_inSetup` | `World` construction, when `strict === true` | top of first `runTick` (any tick entry point) OR explicit `endSetup()` |
| `_maintenanceDepth: number` | incremented at start of `runMaintenance(fn)` callback (and inside `applySnapshot`) | decremented in finally after `fn` returns / throws; gate considers maintenance active when `> 0` |

A single private helper `_assertWritable(method: string)` is called at the top of every mutation method. The helper:

```text
if (!this.strict) return;
if (this._inTickPhase || this._inSetup || this._maintenanceDepth > 0) return;
// Allocate the error / advice string only on the throw branch.
const phase = this._currentPhaseName();
const advice = adviceFor(method);
throw new StrictModeViolationError(method, phase, advice);
```

`_maintenanceDepth` is a counter rather than a boolean: `runMaintenance(fn)` increments on entry and decrements in finally on exit, supporting reentrant nesting (no-op for the inner caller; only the outermost exit clears the gate). See ADR 39.

`applySnapshot` uses internal bypasses (`_replaceStateFrom` direct field reassignment) so `_maintenanceDepth` is not strictly load-bearing for it; the design still increments the counter inside `applySnapshot` defensively in case a future refactor routes through public mutation methods. `World.deserialize(snap)` is static and constructs a fresh world whose `_inSetup` is true (when strict), so the new world's setup window covers all internal mutations.

The setup window is cleared at the top of `runTick` (the common path called by `step()`, `stepWithResult()`, and the `GameLoop.start()` timer's `onTick` callback). This guarantees uniform behavior across all entry points without each entry point needing to remember to call `endSetup()`.

## 4. API + Types

### 4.1 `WorldConfig.strict`

```ts
interface WorldConfig {
  // ... existing fields
  /**
   * When true, mutation methods (setComponent, addComponent, removeComponent,
   * patchComponent, setPosition, setState, addTag/removeTag, setMeta,
   * addResource/removeResource and friends, setProduction/setConsumption,
   * addTransfer/removeTransfer, setResourceMax, emit, destroyEntity,
   * createEntity) throw `StrictModeViolationError` when called outside a
   * system phase, the construction-time setup window, or an explicit
   * `world.runMaintenance(fn)` callback. Default false.
   *
   * Registration methods (registerComponent, registerSystem, registerHandler,
   * registerValidator, registerResource) are framework setup and remain
   * allowed at any time.
   */
  strict?: boolean;
}
```

### 4.2 New `World` methods

```ts
class World<...> {
  // existing methods, with _assertWritable() guards added

  /**
   * Marks the construction-time setup window as ended. After this call,
   * direct mutations are rejected unless inside a system phase or an
   * explicit `runMaintenance(fn)` callback. The first `step()` call
   * implicitly invokes `endSetup()` as well; explicit `endSetup()` is
   * useful when the caller wants to lock down the world before any
   * step. No-op when `strict !== true`.
   */
  endSetup(): void;

  /**
   * Run an out-of-tick mutation block. Any mutation calls inside `fn` are
   * accepted regardless of strict mode. The flag is cleared on exit
   * (try/finally), so an exception from `fn` does not leave the world
   * permanently writable. Returns `fn`'s return value.
   *
   * Use sparingly — long-lived game state changes belong inside system
   * phases; this hatch exists for setup-after-startup edits, scripted
   * scenario tweaks, and tooling that intentionally mutates a paused world.
   */
  runMaintenance<T>(fn: () => T): T;

  /** Whether the world was constructed with `strict: true`. */
  isStrict(): boolean;

  /** Whether the world is currently executing a tick (any phase). */
  isInTick(): boolean;

  /** Whether the construction-time setup window is still open. */
  isInSetup(): boolean;

  /** Whether the world is currently inside one or more `runMaintenance(fn)` callbacks. */
  isInMaintenance(): boolean;
}
```

### 4.3 `StrictModeViolationError`

```ts
export type StrictModePhase = 'between-ticks' | 'after-failure';

export interface StrictModeViolationDetails {
  readonly [key: string]: JsonValue;
  readonly code: 'strict_mode_violation';
  readonly method: string;
  readonly phase: StrictModePhase;
  readonly advice: string;
}

export class StrictModeViolationError extends Error {
  readonly details: StrictModeViolationDetails;
  constructor(method: string, phase: StrictModePhase, advice: string);
}
```

`phase` distinguishes:
- (v1 collapses pre-first-tick into `'between-ticks'`; the originally-considered `'idle'` distinction was dropped because tracking it required a separate `_hasEverStepped` flag that didn't earn its keep.)
- `'between-ticks'`: the common case — between `step()` calls, no maintenance hatch active.
- `'after-failure'`: world is poisoned. Mutations are blocked even outside strict mode in some methods (existing engine behavior); strict mode adds the violation error at the same boundary for consistency.

`advice` is a short human-readable hint (e.g., `"wrap mutations in world.runMaintenance(fn) or move them inside a registered system."`).

## 5. Lifecycle / Contracts

**Construction** (`new World({ strict: true, ...config })`):
- Sets `this.strict = true`, `_inSetup = true`, `_inTickPhase = false`, `_maintenanceDepth = 0`.
- All existing setup mutations (registerComponent, addComponent for initial entities, setState for terrain config, registerResource, addProduction, addTransfer, etc.) work because `_inSetup` is true.

**First tick entry** (any of `step()`, `stepWithResult()`, or a `GameLoop.start()` timer tick — all converge on `runTick`):
- The top of `runTick` clears `_inSetup` if it was true (implicit setup-end). Explicit `endSetup()` before the first tick has the same effect.
- After clearing: subsequent direct mutations between ticks throw unless inside `runMaintenance`.

**During `runTick`**:
- `_inTickPhase = true` is set at the top of `runTick` (before the commands phase) and cleared in a finally block at the end. The clear runs *after* `onTickFailure` listeners fire so listener mutations are still in-tick.
- Systems, handlers, validators, resource updates, diff listeners, command-result listeners, and `onTickFailure` listeners all run with `_inTickPhase = true`.

**`runMaintenance(fn)`**:
- `_maintenanceDepth++` on entry, `fn()`, `_maintenanceDepth--` in finally on exit. Returns `fn`'s return value.
- Reentrant via depth counter: nested `runMaintenance(() => runMaintenance(() => mutate))` succeeds; only the outermost exit clears the gate. See ADR 39.
- An exception thrown inside `fn` still decrements the counter (try/finally), so the world is not left writable.

**`applySnapshot(snap)` / `deserialize(snap)`**:
- `applySnapshot` increments `_maintenanceDepth` for the duration of its internal mutation work and decrements in finally. This is forward-compat: today's implementation uses internal-only paths (`_replaceStateFrom`) that bypass the public mutation gate, but if a future refactor routes through public methods, the increment keeps the gate satisfied.
- `World.deserialize(snap)` is a static method that constructs a fresh world. The new world's `_inSetup` is true (when strict), so its internal setup mutations succeed. The static method does not touch a `this`.

**`recover()`**:
- Clears the poison flag plus cached `lastTickFailure` / `currentDiff` / `currentMetrics`. These are state-management writes, not content mutations. Allowed regardless of strict mode.

**Other state-management calls** (`setSpeed`, `pause`, `resume`):
- Allowed regardless of strict mode (timing/loop control, not content).

## 6. Mutation Methods to Audit

Each of these gets a leading `this._assertWritable('methodName')`:

- `createEntity`, `destroyEntity`
- `addComponent`, `setComponent`, `removeComponent`, `patchComponent`
- `setPosition`
- `addResource`, `removeResource`, `setResourceMax`, `setProduction`, `setConsumption`, `addTransfer`, `removeTransfer`
- `setState`, `deleteState`
- `addTag`, `removeTag`, `setMeta`, `deleteMeta`
- `emit`
- `random()` — calling RNG outside a tick advances `DeterministicRandom.state` and is a determinism-critical operation. Already listed in `command-transaction.ts:FORBIDDEN_PRECONDITION_METHODS` for the transaction proxy; strict mode adds the call-site throw outside ticks. The setup window allows `random()` (e.g., for seeded map generation), inside ticks allows it (engine code uses it for deterministic effects), and inside `runMaintenance` allows it (caller knows what they are doing).
- Internal `_setComponent` / `_removeComponent` paths if they're publicly reachable; otherwise rely on the public method gates.

The audit was verified against `src/world.ts` at design-1 review: `deleteState` at `:1304` and `deleteMeta` at `:1362` are the canonical names; `random()` at `:840` advances RNG.

Methods that are explicitly NOT gated:
- All `register*` methods (registerComponent, registerSystem, registerHandler, registerValidator, registerResource).
- `submit`, `submitWithResult` — these are the canonical input path; they queue commands for the next tick and should always work.
- `step`, `stepWithResult`, `pause`, `resume`, `setSpeed` — loop control.
- `recover` — state management.
- `serialize`, `getDiff`, `getMetrics`, `getEvents`, `getState`, `hasComponent`, `getComponent`, all `get*`/`is*`/`has*` — reads.
- All listener add/remove (`on`/`off`/`onDiff`/`offDiff`/`onCommandResult`, etc.) — wiring.
- `applySnapshot` — covered via `_maintenanceDepth` increment for the duration of its internal mutation work; `deserialize` — static method, the fresh world's `_inSetup` (when strict) covers it.

## 7. Determinism

Strict mode is a runtime gate, not a serialization-level invariant. A bundle recorded from a strict-mode world is byte-identical to one recorded from a non-strict world (same world, same inputs) **modulo the `config.strict: true` field** the snapshot writes so `World.deserialize` can preserve the flag. Strict mode does not affect tick-content determinism. Replay does not need to know whether the recording world was strict.

The `_inTickPhase` flag is set inside `runTick` regardless of `this.strict`. Cost is one boolean assignment per tick; not measured to be meaningful. Option to make it strict-only is rejected: keeping the flag always set lets `world.isInTick()` return useful debug info even for non-strict worlds.

## 8. Performance

- Construction: a few extra field initializations (boolean + counter). Free.
- Per mutation: one `if (!this.strict) return;` early-out is the entire cost on non-strict worlds. On strict worlds, three additional reads (`_inTickPhase`, `_inSetup`, `_maintenanceDepth > 0`). The advice/phase strings and error allocation happen only on the throw branch (after the gate check fails), so the hot path never pays for them.
- Per tick: one set + one clear of `_inTickPhase` at the top/finally of `runTick`. The `_inSetup` clear is paid once on the first tick; subsequent ticks skip the branch.
- `runMaintenance(fn)`: depth increment + `fn()` + decrement in try/finally. Bounded by `fn` cost.

Cost per mutation is small enough not to need a microbenchmark; if a future profile shows the gate is hot, the implementation can fold the strict-mode check into a no-op closure for non-strict worlds via `_assertWritable = noop` at construction. Not necessary in v1.

## 9. Testing Strategy

- **Default behavior (`strict !== true`)**: every mutation method on a non-strict world succeeds in every phase (in-tick, between-ticks, in maintenance). Negative regression test asserts `StrictModeViolationError` is never thrown.
- **Strict construction**: `new World({ strict: true, ...config })` reports `isStrict() === true`, `isInSetup() === true`, `isInTick() === false`.
- **Setup window allows mutations**: pre-step mutations (addComponent, setState, addResource, addTag, setPosition, emit, etc.) all succeed.
- **First step ends setup**: after `world.step()`, `isInSetup() === false`.
- **Explicit endSetup**: same outcome before any step.
- **Mutations during system execute**: a registered system mutates components/resources/state; succeeds.
- **Mutations during diff listener**: `world.onDiff(diff => world.setComponent(...))` succeeds (listener fires inside the tick).
- **Mutations during onTickFailure listener**: `world.onTickFailure(failure => world.recover())` succeeds (listener fires while `_inTickPhase` is still true; the flag clears in the finally block *after* listeners run).
- **Mutations between ticks throw**: each gated method called between `step()`s throws `StrictModeViolationError({ phase: 'between-ticks' })`. Includes `random()` (covered specifically with a determinism-targeted test).
- **`stepWithResult` clears `_inSetup` too**: the setup window closes at the top of `runTick`, so both `step()` and `stepWithResult()` (and `start()`'s timer ticks) have the same setup-clearing semantics.
- **Maintenance hatch allows mutations**: `world.runMaintenance(() => { world.setComponent(...); ... })` succeeds; calls outside the callback throw again afterward.
- **Maintenance hatch try/finally**: an exception thrown inside `fn` decrements `_maintenanceDepth` so the world is not left writable. Subsequent mutations throw if not in another phase.
- **Nested maintenance**: nested `runMaintenance(() => runMaintenance(() => mutate))` succeeds; only the outermost exit clears the gate. Test that an exception inside an inner nested callback decrements the counter correctly. Test `isInMaintenance()` reflects depth > 0.
- **`CommandTransaction.commit()` outside tick (no maintenance)**: throws at the first `setComponent` per ADR 40.
- **`CommandTransaction.commit()` inside `runMaintenance`**: succeeds; nesting under maintenance works as expected.
- **`CommandTransaction.commit()` inside a tick**: succeeds; `_inTickPhase` covers it.
- **applySnapshot during strict mode**: works regardless of phase; uses the maintenance flag internally and clears it on exit.
- **deserialize**: returns a fresh world; the new world's setup window is open.
- **recover() during strict mode**: works (it's state-management, not content).
- **Submit / step / pause / resume / setSpeed / register* during strict mode**: all work outside the maintenance window because they are not gated.
- **`StrictModeViolationError` shape**: `details.code === 'strict_mode_violation'`, `details.method` matches the called method, `details.phase` is one of the documented values, `details.advice` is non-empty.
- **Determinism parity**: a synthetic playtest run twice with the same seed (one strict, one not) produces byte-identical bundles modulo the snapshot's `config.strict` field.

## 10. Open Questions (resolved in v2)

1. **Is `runMaintenance` reentrant?** v2 says **yes via depth counter** (no-op nesting). `_maintenanceDepth` is incremented on entry and decremented in finally; the gate considers maintenance active when `> 0`. This lets helpers like `applySnapshot` and future bulk-apply utilities call into one another without the caller having to track whether they're already inside a maintenance window. See ADR 39.
2. **Should `endSetup()` be idempotent?** Yes — calling it twice is a no-op. Same for calling it before the first tick (clears the flag early). The first `runTick` clears it implicitly.
3. **Should `_inSetup` cover registration-only setup?** Registration is already not gated, so the question doesn't bite for `register*` calls. For e.g., `addComponent` during setup-time tests, `_inSetup` is the gate that allows it.
4. **`CommandTransaction.commit()` interaction.** v2 says **commit() does NOT auto-open maintenance**. Transactions inside a tick (the common case) work because `_inTickPhase` is true. Transactions inside an explicit `runMaintenance` callback work because the depth counter is positive. Transactions called from raw between-tick code throw at the first `setComponent` the commit attempts. Callers wanting to commit a transaction outside a tick wrap it: `world.runMaintenance(() => txn.commit())`. This keeps strict mode honest — there is no implicit public bypass via the transaction surface. See ADR 40.
5. **`clearRunningState` (BehaviorTree)?** Out of scope; game-side code.
6. **Mid-tick `submit()`.** Strict mode does not gate `submit()` / `submitWithResult()` regardless of phase. The session-recording subsystem already captures all submitted commands at submission time, including those issued from inside systems / handlers / listeners; replay reproduces them deterministically as long as the system code itself is deterministic (which is what `selfCheck` verifies). Strict mode is "World content mutation enforcement," not a guard against every possible determinism violation; submit determinism is the recorder's domain.

## 11. Doc Surface

Per AGENTS.md, implementation updates:

- `docs/api-reference.md`: new `## Strict Mode (v0.8.8)` section for `WorldConfig.strict`, `World.endSetup()`, `World.runMaintenance(fn)`, `World.isStrict()`, `World.isInTick()`, `World.isInSetup()`, `World.isInMaintenance()`, `StrictModeViolationError`, `StrictModeViolationDetails`.
- `docs/guides/strict-mode.md` (**new file**): quickstart, escape hatches, transaction integration, applySnapshot integration, performance note, opt-in rationale, `runMaintenance` reentrancy.
- `docs/guides/session-recording.md`: mention strict mode as the structural enforcement complement to `selfCheck`. (`docs/guides/determinism.md` does not currently exist; the session-recording guide is the authoritative determinism doc.)
- `docs/guides/systems-and-simulation.md`: short note that systems run with `_inTickPhase` set so all mutations are allowed inside system code.
- `docs/guides/ai-integration.md`: add Spec 6 as the structural-enforcement complement to selfCheck for agents that want errors at the source rather than at replay time.
- `docs/guides/public-api-and-invariants.md`: add `WorldConfig.strict` and the gate set as a public invariant.
- `docs/guides/serialization-and-diffs.md`: note that strict mode does not affect snapshot/diff content; bundles from strict and non-strict worlds with identical inputs are byte-identical.
- `docs/guides/concepts.md`: short "Strict Mode" subsection under World; add `WorldConfig.strict` to the configuration list.
- `docs/architecture/ARCHITECTURE.md`: Component Map row note for World adds the strict flag; Boundaries paragraph for World mentions the new gates and `runMaintenance` boundary.
- `docs/architecture/drift-log.md`: append a row.
- `docs/architecture/decisions.md`: append ADR 36 (default-off opt-in), ADR 37 (applySnapshot uses internal bypasses; `_maintenanceDepth` increment is forward-compat), ADR 38 (registration-not-gated rationale), ADR 39 (depth-counted reentrant maintenance), ADR 40 (CommandTransaction.commit does NOT auto-open maintenance).
- `docs/design/ai-first-dev-roadmap.md`: update Spec 6 status when implemented.
- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog, `package.json`, `src/version.ts`, README badge: v0.8.8 additive release entry.

## 12. Versioning

Current base is v0.8.7. Spec 6 v1 is additive and non-breaking:

- New optional `WorldConfig.strict` field.
- New methods on `World`: `endSetup`, `runMaintenance`, `isStrict`, `isInTick`, `isInSetup`, `isInMaintenance`.
- New error class `StrictModeViolationError`.
- No changes to existing behavior when `strict !== true`.

Ship as v0.8.8 (`c` bump). One coherent commit lands code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit evidence, and version bump.

## 13. ADRs

### ADR 36: Strict mode is opt-in default-off

**Decision:** `WorldConfig.strict` defaults to `false`. Existing callers that mutate between ticks continue to work unchanged.

**Rationale:** Flipping the default breaks every consumer that does setup-after-startup or scripted-scenario edits without wrapping them in a maintenance hatch. The roadmap (Spec 6 description) explicitly anticipates the migration cost and recommends staging the feature as opt-in. A future release can reverse the default once consumers have audited their call sites.

### ADR 37: `applySnapshot` increments `_maintenanceDepth` for forward-compat; `deserialize` relies on the new world's setup window

**Decision:** During `applySnapshot(snap)`, the world increments `_maintenanceDepth` for the duration of its internal mutation work and decrements in a finally block. The same gate logic (`_inTickPhase || _inSetup || _maintenanceDepth > 0`) handles it. `World.deserialize(snap)` is static and constructs a fresh world; the new world's `_inSetup` is true (when strict), which is what permits the internal mutations during state-loading.

**Rationale:** Adding a separate `_inApplySnapshot` flag would multiply the gate states without adding meaning. The maintenance counter is conceptually "mutations are temporarily allowed because the engine itself authorized this batch"; `applySnapshot` fits that. The current implementation uses internal-only paths (`_replaceStateFrom`) that bypass the public mutation gate, so the increment is forward-compat: a future refactor that routes through public methods will still pass the gate. The try/finally pattern ensures the counter is decremented even if the snapshot is malformed.

### ADR 38: Registration calls are not gated

**Decision:** `registerComponent`, `registerSystem`, `registerHandler`, `registerValidator`, `registerResource` are framework setup, not content mutation. They are allowed at any time, regardless of strict mode.

**Rationale:** Registration is part of the world's structural definition. A consumer that registers a new component type after the simulation starts is doing schema evolution, not state mutation. The existing engine already throws on duplicate registration, so accidental misuse is caught by the existing checks. Gating registration would force consumers to wrap every late registration in `runMaintenance`, which doesn't add safety because registration doesn't affect tick determinism the way state mutation does.

### ADR 39: Reentrant maintenance via depth counter

**Decision:** `runMaintenance(fn)` increments `_maintenanceDepth` on entry and decrements in finally on exit. Nesting is a no-op for the inner caller; only the outermost exit clears the gate. `applySnapshot` increments the same counter for forward-compatibility (its current implementation uses internal-only paths that bypass the gate, but a future refactor that routes through public methods would be safe).

**Rationale:** Throwing on nested maintenance (the v1 alternative) makes helpers brittle. Anything that wraps a callback in `runMaintenance` (a tooling helper, a scenario loader, a user-defined batch utility) cannot be safely called from inside another maintenance context without callers tracking depth themselves. The depth counter gives the same single-top-level guarantee for the gate's clearing point while letting helpers compose freely. The minor cost is one extra integer field and increment/decrement per call.

### ADR 40: `CommandTransaction.commit()` does NOT auto-open maintenance

**Decision:** `world.transaction()` and its `commit()` path do not automatically set `_maintenanceDepth > 0`. In strict mode, calling `commit()` from raw between-tick code throws at the first `setComponent` it tries to apply. Callers wanting to commit a transaction outside a tick wrap it explicitly: `world.runMaintenance(() => txn.commit())`.

**Rationale:** Auto-opening maintenance from `commit()` turns the transaction surface into an implicit public bypass. Anyone reading "I'm in strict mode" cannot rely on the bytecode-level guarantee that mutations only happen inside known phases — they'd also have to remember that `commit()` is a hidden hatch. Forcing the explicit wrap keeps the gate honest. Inside a tick (the typical case for transactions), `_inTickPhase` is already true and commit works without any wrapping.

## 14. Future Specs

| Future Spec | What it adds |
| --- | --- |
| Default-strict | A breaking release that flips the default to `true` once consumers have migrated. |
| Registration gating | If schema evolution at runtime becomes a recurring source of bugs, add an opt-in gate for registration too. |
| `runMaintenance` audit log | Capture an entry per maintenance call (method, advice, stack trace) for replay/CI auditing. |

## 15. Acceptance Criteria

- `WorldConfig.strict`, `World.endSetup`, `World.runMaintenance`, `World.isStrict`, `World.isInTick`, `World.isInSetup`, `World.isInMaintenance`, `StrictModeViolationError`, `StrictModeViolationDetails` are exported from `src/index.ts`.
- `world.random()` is gated by strict mode (cannot be called outside a tick / setup / maintenance).
- Non-strict worlds (default) have no behavior change. Existing tests pass unchanged.
- Strict worlds reject every gated mutation method when called between ticks (and not in setup, not in maintenance). The thrown error is `StrictModeViolationError` with a populated `details` payload.
- Strict worlds accept the same mutations during setup, inside any system phase, inside any diff listener / command-result listener, and inside `runMaintenance` callbacks.
- `applySnapshot` and `deserialize` work in strict mode at any phase.
- `recover`, `submit`, `step`, registration calls, and listener add/remove all work in strict mode regardless of phase.
- Determinism parity: a synthetic playtest of a strict world produces a bundle identical to one produced by the same seed/config without strict mode.
- All four engine gates pass: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Multi-CLI design, plan, and code reviews converge per AGENTS.md.
- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, and version bump land in the same commit as code.
