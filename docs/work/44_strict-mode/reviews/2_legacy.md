# Strict Mode — Design Iteration 1 Review (2026-04-29)

**Disposition:** Iterate. Codex: 1 blocker + 5 majors + 2 minors. Claude: 2 majors + 5 minors. Convergence on key issues; v2 addresses all of them.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Findings + dispositions

### Codex BLOCKER / Claude MAJOR — `world.random()` missing from audit

`world.random()` advances `DeterministicRandom.state`, exactly the kind of determinism-critical mutation strict mode exists to catch. Already in `command-transaction.ts:FORBIDDEN_PRECONDITION_METHODS`.

**v2:** `random()` added to §6 audit list with the gate semantics (allowed in setup / tick / maintenance; throws otherwise).

### Codex MAJOR / Claude MAJOR — `removeState` / `removeMeta` are wrong names

Actual methods are `deleteState` (`src/world.ts:1304`) and `deleteMeta` (`src/world.ts:1362`).

**v2:** §6 audit list corrected. Verified against the source.

### Codex MAJOR / Claude MINOR — Setup must close at the common tick entry

§5 said "step() calls endSetup() at entry" but that misses `stepWithResult()` and `start()`-driven timer ticks.

**v2:** Setup-clearing moved to the top of `runTick` (the common path called by all entry points). `step`, `stepWithResult`, and `GameLoop.start()` timer ticks all converge on `runTick`, so one call site covers them.

### Codex MAJOR / Claude MAJOR — `CommandTransaction.commit()` should NOT auto-open maintenance

§10 OQ-4 v1 said yes; reviewers correctly flagged that as turning transactions into an implicit public bypass.

**v2:** ADR 40 added — commit() does NOT auto-open maintenance. Inside-tick commit works because `_inTickPhase` is true; out-of-tick callers wrap explicitly: `world.runMaintenance(() => txn.commit())`.

### Codex MAJOR / Claude MINOR — Reentrant maintenance: depth counter, not throw

§10 OQ-1 v1 said throw on nested. Reviewers preferred no-op nesting via depth counter.

**v2:** `_maintenanceDepth: number` instead of `_inMaintenance: boolean`. ADR 39 added. `isInMaintenance()` exposed for caller composition.

### Codex MAJOR / Claude — Mid-tick `submit()` clarification

Codex flagged that strict mode allows `submit()` from inside systems and called this a "known replay-determinism violation."

**v2:** §10 OQ-6 added — strict mode is "World content mutation enforcement," not a guard against every possible determinism violation. `submit()` is captured by the recorder regardless of phase; replay reproduces submitted commands deterministically as long as system code is deterministic (which `selfCheck` verifies). No gate on `submit()`.

### Codex MAJOR / Claude MINOR — Doc surface gaps

Missing `docs/guides/systems-and-simulation.md`, `docs/guides/ai-integration.md`, `docs/guides/public-api-and-invariants.md`, `docs/guides/serialization-and-diffs.md`.

**v2:** §11 expanded to cover all four (and confirmed that `docs/guides/determinism.md` does not exist; the "if present" hedge falls through to `session-recording.md`).

### Codex MINOR / Claude MINOR — Performance claim

§8 v1 claimed "2-4 ns per mutation." Reviewers asked for either a benchmark or a softer claim, and to make explicit that advice/phase strings construct only on the throw branch.

**v2:** §8 reworded to drop the specific ns figure; describes the work in terms of "boolean reads on the hot path; allocation only on the throw branch."

### Claude MINOR — `_inMaintenance` redundant for applySnapshot/deserialize

`applySnapshot` uses internal-only paths (`_replaceStateFrom`); `World.deserialize` is static and never sets the flag on `this`.

**v2:** §3 explicitly says the increment inside `applySnapshot` is forward-compat (in case a future refactor routes through public methods). `deserialize` constructs a fresh world whose `_inSetup` is true (when strict).

### Claude MINOR — `isInMaintenance()` getter missing

**v2:** Added to §4.2.

### Claude MINOR — Listener ordering for `_inTickPhase`

`onTickFailure` listeners must fire while `_inTickPhase` is still true; flag clears after listener emission.

**v2:** §3 + §5 + §9 all explicit about clear-after-listeners ordering.

### Claude MINOR — `_inTickPhase` toggling lives in `runTick`, not `executeTickOrThrow`

**v2:** §3 + §5 explicitly anchor the toggle at the top/finally of `runTick`.

## Disposition

Re-design as v2. Re-review as design-2. Expectation: ACCEPT with at most nits.
