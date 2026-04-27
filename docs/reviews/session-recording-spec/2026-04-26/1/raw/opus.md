I have enough to form findings. Writing the review.

---

# Session Recording & Replay — Senior Architect Review

## Critical

**C1. Replay command-submission loop has an off-by-one against `getObservableTick()` semantics — tick-0 commands and inter-tick commands will never be replayed.**

In `world.ts`, `getObservableTick()` returns `max(gameLoop.tick, currentMetrics?.tick, currentDiff?.tick, lastTickFailure?.tick)` (line 1275-1282). `gameLoop.tick` is **not** advanced until the very end of `runTick()` (line 1537), and `currentMetrics`/`currentDiff` reflect the previously completed tick. So:

- A command submitted before the first `step()` (when `world.tick === 0`) gets `result.tick === 0`.
- A command submitted *between* the step that advanced to tick N and the step that advances to N+1 gets `result.tick === N`.
- That command is processed by the step that advances `N → N+1`.

§9.1 step (3) says: "For each tick `t` from `snapshot.tick + 1` to `tick` inclusive: drain commands whose submission tick equals `t` … then call `world.step()`." Walking the trace for an initial snapshot at tick 0 with `target_tick = 2`:

| Iter | Submit (per spec)                              | step() advances | Live behavior                                  |
| ---- | ---------------------------------------------- | --------------- | ---------------------------------------------- |
| t=1  | commands with submission_tick==1 (cmd B)       | 0 → 1           | Original tick 0→1 step processed cmd A (sub=0) |
| t=2  | commands with submission_tick==2 (none)        | 1 → 2           | Original tick 1→2 step processed cmd B (sub=1) |

Result: cmd A is never submitted; cmd B is processed one tick late. Every recorded run is replayed with a uniform off-by-one. The fix is "for each `t` from `snapshot.tick` to `target_tick - 1`: submit commands with `submission_tick == t`, then step()" — but the spec must explicitly state this against the current `getObservableTick()` contract, otherwise two implementers will choose differently.

**C2. The replayer cannot disambiguate externally-submitted commands from system/handler/listener-submitted commands. Replay will double-submit anything submitted mid-tick.**

The engine's `submit()` is callable from anywhere — including from inside a system's execution, a registered command handler, or an event listener. Such a mid-tick submission gets recorded by the recorder's `onCommandResult` listener (the world emits the result regardless of caller). When the replayer re-runs `step()`, the same system/handler/listener path will run again and re-submit the command. If the replayer also drains it from `bundle.commands`, the submission happens twice — the engine queues it twice and the handler runs twice.

The spec implicitly assumes "commands originate externally only," but §11.1 does not require it, and the engine does not constrain it. Either:

- **Add a determinism-contract clause forbidding `world.submit()` from inside any tick phase** (and enforce / surface it; even a runtime warning would be enough), so the recorder can safely treat every captured submission as external. Or:
- **Capture submission provenance** (`fromTick: boolean` or origin tag) on `CommandSubmissionResult`, persist it in the bundle, and only replay external submissions.

As drafted, replay determinism is violated by any non-trivial system that ever produces a follow-up command. selfCheck() will surface the divergence, but the failure looks like a user determinism bug when it is actually an architectural ambiguity in the spec.

**C3. `SessionBundle` interface is declared as JSON-serializable but the in-memory bundle is not.**

§5.1 declares `SessionBundle.attachments: AttachmentDescriptor[]`, where `ref` may be `'inline'` — but the inline bytes live in `bundle.attachmentsInline: Map<string, Uint8Array>`, a field "*not* part of the JSON-serializable shape." The interface as written has no such field, so any consumer that types against `SessionBundle` cannot see the binary payload, and `JSON.stringify(bundle)` silently loses it. ADR 2 ("Bundle format as a first-class shared type") is undermined: the in-memory shape from `MemorySink` and the on-disk shape from `FileSink` are *not* identical — `MemorySink` carries a `Map<string, Uint8Array>` aliased into a JSON-typed surface; `FileSink` carries sidecar refs only.

Pick one:
- Strict JSON `SessionBundle`; inline bytes go through a separate `LiveSessionBundle = SessionBundle & { attachmentsInline: Map<...> }`; the replayer accepts either.
- Drop "inline" mode entirely; `MemorySink.toBundle()` always emits dataUrls (with a configurable size cap that errors above-threshold attachments rather than silently changing semantics).

The current shape is two lies wrapped in one type alias.

## High

**H1. `SessionSink.writeAttachment(descriptor, data)` ambiguity over who decides `ref`.**

The recorder generates the descriptor (id, mime, sizeBytes) and the sink stores the bytes — but `ref` is the policy ("inline / sidecar / dataUrl") and is sink-specific. The spec implies the recorder fills `ref` (because `writeAttachment` takes a complete descriptor), but the recorder cannot know `MemorySink` vs `FileSink` policy. Either invert the call (recorder gives bytes + metadata, sink returns the final descriptor including `ref`) or split into two phases. As written, the recorder either has to know the sink's policy or the descriptor's `ref` is wrong until `toBundle()` rewrites it — a mutation that violates the "written incrementally so streaming sinks see them in order" property in §7.1 step 4.

**H2. Marker validation at `marker.tick < world.tick` is computationally unspecified and will be expensive on `FileSink`.**

§6.1 says liveness "uses the most recent snapshot at or before `marker.tick` plus subsequent diffs." For a recorder running at tick 50000 with snapshots every 1000 ticks, a retroactive marker at tick 100 requires loading the initial snapshot and replaying ~100 ticks of diffs to determine entity liveness. With `FileSink`, those diffs were streamed to disk and must be re-read. Two unaddressed questions:

- **Cost.** Add-marker becomes O(N) in tick distance with disk I/O. For a debug session annotating dozens of ticks, this can dominate.
- **Semantics.** Does this validation also rebuild *position* (cells), *componentOptions*, *resources*, *state*? The spec only explicitly mentions entity liveness and grid bounds. If liveness is reconstructed but cells are validated against a stale grid config, validation is inconsistent.

A pragmatic path is to validate strictly when `marker.tick === world.tick` (the live case, the dominant case), and downgrade validation for retroactive markers to "entity must have existed at some point in the recorded run" with a more permissive rule. The spec needs to say which.

**H3. Determinism contract (§11.1) is incomplete — at least three real failure modes are not listed.**

- **Engine + Node version coupling, not just engine version.** Math operations (especially `Math.sin`, `Math.cos`, transcendentals) are not bit-identical across V8 versions. Promoting "engine version" determinism without flagging Node version coupling will produce confusing CI failures across machines that pass locally. Spec should state explicitly that replay determinism requires identical engine *and* runtime versions, or warn about transcendental ops.
- **System/listener registration order.** If a project re-orders system registration between record and replay, observable state changes (last-writer-wins on the same component, for example). The `worldFactory` carries this responsibility but the contract clause should make the obligation explicit.
- **Query iteration order.** §11.1 mentions `Map`, arrays, `Set`. It does not address iteration order from the engine's own query helpers (component-store iteration). If the engine guarantees deterministic order, say so; if it doesn't, callers can break replay by depending on order.

**H4. selfCheck() does not validate execution streams or events — divergence is detected only at snapshot boundaries.**

§9.3 compares `WorldSnapshot` JSON only. Two scenarios fall through:

- A system whose net state delta between snapshots is identical, but which emits a different event at intermediate tick T. snapshot equality at T+k still holds; the mismatched event stream goes unflagged.
- A handler that records a different `CommandExecutionResult` (e.g., recorded `executed: true`, replay `executed: false` because validator state diverged before) but the resulting state lands at the same place.

Both are real determinism violations a CI gate would want to catch. The bundle has `executions` and per-tick `events` precisely so they can be diffed; selfCheck should cover them or be honest that it only catches state-shaped divergence.

**H5. `openAt(tick)` unspecified for ticks outside `[bundle.metadata.startTick, bundle.metadata.endTick]`.**

What does `openAt(0)` do when the recorder connected at tick 5000 (initial snapshot tick = 5000)? §9.1 step 1 says "If none, use `bundle.initialSnapshot`" — but `initialSnapshot.tick` is 5000, which exceeds 0. The intent is presumably to throw, but the spec doesn't say. Likewise `openAt(endTick + 1)` is undefined: the loop runs into "no commands recorded" territory and produces a state that doesn't correspond to any recorded reality. Add explicit `BundleRangeError` (or extend `BundleIntegrityError`) and define the bounds.

**H6. ScenarioRunner.toBundle() drops setup-phase history and mislabels `initialSnapshot`.**

`runScenario` calls `history.clear()` after `setup` runs (line 175 of `scenario-runner.ts`), which resets `WorldHistoryRecorder.initialSnapshot` to the post-setup, pre-run state. §10 says `initialSnapshot ← the snapshot ScenarioRunner already captures at setup` — but ScenarioRunner does *not* capture a snapshot before `setup` runs; it captures one after `setup` completes via the rebaseline. Setup-phase commands and diffs are intentionally discarded.

This is fine if documented, but the spec calls the bundle a "complete, deterministic, replayable record of any World run" (§1). For scenario-derived bundles, that's not true — the world's state at `bundle.initialSnapshot` is post-setup, but consumers who try to reproduce the *full* scenario from raw construction will fail. Spec should distinguish "full record" (live recorder) from "pre-baselined record" (scenario adapter), and state the implication: replay from a scenario bundle requires an equivalent setup function in the `worldFactory`.

## Medium

**M1. `connect()` lifecycle does not specify reconnect or destruction semantics.**

§7.1 says "Calling `connect()` while already connected is a no-op." But after `disconnect()`, can the user call `connect()` again? `metadata.startTick` was captured at first connect; what does endTick mean across a reconnect cycle? §7.2 says "World destroyed while connected: recorder's listeners are unhooked but `sink.close()` is not automatically called. Caller must call `disconnect()` to finalize." But if the world is destroyed, calling `world.serialize()` or accessing other state will throw — `disconnect()` should be tolerant of a destroyed world.

**M2. Engine version is recorded but not validated at replay.**

`metadata.engineVersion` is captured at `connect()` time. The replayer never compares it against the runtime engine version. Cross-version replay is silently allowed. At minimum, surface a warning when `metadata.engineVersion !== package.version`. Cross-major-version replay should probably refuse.

**M3. `eventsBetween(fromTick, toTick)` boundary semantics ambiguous.**

§9 declares `eventsBetween(fromTick: number, toTick: number)`. Inclusive on both ends? Exclusive on `toTick`? Half-open? Two implementers will choose differently. Pick one and state it.

**M4. §13.3 self-check tests cover only one violation pattern.**

The spec asserts each clause of §11.1 is "tested" via the deliberate-violation test, but only one pattern (`Math.random()` inside a system) is enumerated. The most common real failure (direct `world.setComponent` from outside any system, between ticks) is not covered, even though §11.1 lists it first. Likewise wall-clock-time inside a system, environment branching, iterator-order assumptions. Each contract clause should have its own paired test (clean + violating) or the test scenarios won't catch the *kind* of divergence the contract is supposed to prevent.

**M5. `selfCheck()` cost model is hand-waved.**

§11.2 says "`selfCheck()` is recommended after every recording in CI-like contexts; for live captures, the cost makes it an explicit opt-in." Fine, but selfCheck replays from each snapshot pair forward — for the long-capture smoke (10 snapshots over 10000 ticks), that's 9 segments × 1000 ticks = 9000 ticks of replay, plus the deserialize+factory cost per segment. The "≥ 5x recording throughput" target in §13.2 is not derived from the architecture and conflates `openAt` replay with self-check replay; benchmarking will likely expose this. Either drop the specific multiplier or define what "throughput" measures.

**M6. `worldFactory` ergonomics is punted to Open Question #5 but is load-bearing for the entire replay surface.**

Every replay call requires the consumer to reproduce component registrations, validators, command handlers, and systems via a hand-written factory. If the factory drifts even slightly from the recording-time setup, replay diverges with no useful diagnostic — selfCheck will report a divergence whose cause is "missing system" rather than "determinism violation." For the spec's stated goal of agent-driven debugging, this is a real ergonomic floor:

- The factory must reconstruct *exactly* the same registration, validator, handler, system set in the same order.
- Missing or extra registration is silently treated as a determinism bug.
- There is no "I just want to load the bundle and look at marker N" affordance for a consumer that doesn't have access to the original codebase.

This shouldn't block v1, but should be elevated from Open Question to a §15 ADR explicitly accepting the constraint and documenting in §11 that `worldFactory` is part of the determinism contract. Otherwise consumers will paper-cut their way through replay setup.

**M7. Documentation surface (§14) is missing several mandatory updates per AGENTS.md.**

AGENTS.md "Update if applicable" lists:

- `docs/guides/concepts.md` — the standalone-utilities list and tick-lifecycle ASCII must reflect new utilities. SessionRecorder/SessionReplayer are new top-level utilities. Not in §14.
- `docs/guides/ai-integration.md` — "A new AI-relevant surface → `ai-integration.md`." This entire feature is the substrate of the AI-first roadmap; updating ai-integration.md is non-discretionary. Not in §14.
- `docs/guides/getting-started.md` and `docs/guides/building-a-game.md` — "A new tutorial-grade feature → both." The session-recording surface absolutely qualifies. Not in §14.
- `docs/guides/debugging.md` — listed (good), but only as a "pointer," whereas the surface materially expands what debugging is.

These omissions are not "small": AGENTS.md's discipline section explicitly calls out doc drift as cumulative, and §14 is supposed to enumerate the doc obligations the implementer will satisfy.

**M8. §12 does not enumerate the "marker references stale entity" path.**

Markers added live with `marker.tick === world.tick` are validated against the live world. But entities can die after the marker is added. The spec doesn't say whether the bundle ever revalidates markers (e.g., during `disconnect()` finalization or during `SessionReplayer.fromBundle` integrity check). `BundleIntegrityError` is listed for "missing snapshots, broken attachment refs, or non-monotonic tick entries" — entity-ref integrity should be in that list, or explicitly excluded with rationale.

## Low

**L1. Marker `kind: 'assertion'` provenance is convention-only.**

§6.1 says user code calling `recorder.addMarker({ kind: 'assertion' })` "succeeds but is discouraged; ScenarioRunner is the canonical producer." If only ScenarioRunner should produce them, lift it to a structural guarantee — either a separate module-private constructor or a `provenance: 'engine' | 'game'` field. Otherwise downstream code (Spec 4 viewer, Spec 7 corpus search) will see assertion markers it cannot trust as engine-validated.

**L2. `SessionBundle` carries unbounded `commands`/`executions`/`failures` arrays.**

10000 ticks × 50 commands = 500K entries each. With `details` payloads and JSON envelope, easily 100MB+. The spec does not address truncation, compression, or sharding. Not a v1 blocker but `FileSink`'s `manifest.json` size is implied to hold these — putting 100MB in a single JSON manifest with `ticks.jsonl` separate is asymmetric. Consider sharding `commands.jsonl` and `executions.jsonl` the same way.

**L3. `SessionRecorder`'s sink-call awaits make tick rate dependent on disk latency without a documented strategy.**

§8 says "if disk is slow, the engine's tick rate can be affected — caller's choice." A common failure mode in production capture: a slow disk pauses tick execution mid-stream, which can timeout other systems (network, AI agents) waiting on tick events. Spec should at least mention a "buffered write" option or note that production captures should use an in-memory buffered sink that drains to disk asynchronously (and how to configure such a sink). Today the design pushes this onto the user with no guidance.

**L4. ADR 1's "~30 LOC of listener-wiring duplication" estimate undersells the duplication.**

`WorldHistoryRecorder` has listener wiring for `onDiff`, `onCommandResult`, `onCommandExecution`, `onTickFailure` plus per-tick `getEvents()`/`getMetrics()` collection plus `cloneJsonValue` discipline — close to 100 LOC of structurally identical code. Not a reason to extract `TickStream` now (the ADR's reasoning to defer is sound), but the ADR's cost estimate should be honest so the future "third consumer materializes" trigger isn't gated on a wrong cost basis.

## Note

**N1. `FileSink`'s `manifest.json incomplete: true` recovery path is not specified.**

§7.2 says FileSink "leaves a manifest.json with `incomplete: true` flag" on partial writes. §13.4 tests this code path. But what does the *replayer* do with an incomplete bundle? Refuse to load? Load the prefix? Load with a warning? Spec doesn't say, and "incomplete" bundles are exactly the ones a debugger most wants to inspect.

**N2. Snapshot equality (§9.3, Open Question 1) cannot be both fast and structurally informative without an explicit format choice.**

Recursive walk + short-circuit gives `firstDifferingPath` cheaply; canonical-JSON hash is faster on equal cases but loses the path. Open Question 1 acknowledges this. Reasonable. Note that for object-key ordering, `WorldSnapshot` is built via `Object.entries` over `Map` — which is insertion-ordered — so the snapshot objects have stable key order, which means "deep equal" can use a fast path that doesn't need to canonicalize. Worth making this an invariant of the snapshot format rather than discovering it during implementation.

**N3. ADR 3 (documented-not-enforced determinism) is the right scope call, but spec should commit to running selfCheck across the existing scenario test suite as a CI gate.**

Without a CI-level gate, "documented" is "wishlist." The mitigation is one-liner: "Each scenario in the engine's existing test suite runs selfCheck on its produced bundle as part of `npm test`." That single sentence converts the contract from passive to enforced-by-the-only-replayable-corpus-we-have. §13.3 hints at this with a deliberate-violation test, but doesn't promote the pattern to "every scenario ships through selfCheck."

---

**Overall assessment: needs rework on §9.1 replay semantics (C1, C2) and §5.1 bundle type (C3) before implementation. Once those are tightened — with §11.1 extended to cover mid-tick submission and floating-point/Node-version coupling, and the §14 doc surface expanded to satisfy AGENTS.md — the architecture is sound and ready to ship.**
