[BLOCKER] `§5.1`, `§6.2`, `§7.3`, `§10`, and `§12` conflate “bundle replays cleanly” with “policy is deterministic.” `SessionReplayer.selfCheck()` only proves that the recorded command stream can replay through the world; it does not prove the policy generated that command stream deterministically. A policy can read `Math.random()`, `Date.now()`, environment state, or closure state outside the bundle and still produce a bundle that self-checks. Worse, the spec’s own `randomPolicy` requires `world.random()`, but replay never re-executes those policy RNG draws. Since snapshots include RNG state, policy-side `world.random()` consumption changes recorded world state in ways replay will not reproduce. As written, the core determinism story is unsound.

[HIGH] `§7.1` relies on mutating `sink.metadata.sourceKind` after `SessionRecorder.connect()`. That is not a real producer contract; it is a dependency on the current `MemorySink`/`FileSink` implementation shape. The published sink contract is `open(metadata)` plus writes/close. A custom sink that snapshots metadata during `open()` would silently record `sourceKind: 'session'`. Given `src/session-recorder.ts` currently hardcodes `'session'`, `synthetic` needs to enter through a first-class recorder/harness API, not post-hoc sink mutation.

[HIGH] `§7.2`’s “policy throw => stopReason: 'poisoned' + synthetic TickFailure in bundle.failures” is a category error and does not fit the existing schema. A policy exception happens outside `world.step()` and does not poison the world. The current `TickFailurePhase` in `src/world.ts` has no `policy` phase, and `failedTicks` currently means replay-invalid world failures. Reusing that channel for harness-driver exceptions will mislead both replay logic and downstream consumers.

[HIGH] `§8`, `§14`, and ADR 3 understate the compatibility impact of extending `SessionMetadata.sourceKind` to include `'synthetic'`. In a TypeScript library, widening an exported string union is not “free”: exhaustive switches, `Record<SessionMetadata['sourceKind'], ...>`, and `never` checks can stop compiling. Runtime compatibility may be fine, but the public type surface changes incompatibly, so “no `b`-bump” is not justified as written.

[MED] `§5`’s command typing is too weak for a public engine API. `PolicyCommand<TCommandMap>` pairs `type: keyof TCommandMap` with `data: TCommandMap[keyof TCommandMap]`, so `type` and `data` are not correlated. Invalid command/payload pairs type-check. The same problem carries into `ScriptedPolicyEntry`. For a Tier-1 primitive, that is a material ergonomics hole.

[MED] `§7` reuses `PolicyContext` for `stopWhen`, but that context’s documented `tick` meaning is “the tick that’s about to execute.” After `world.step()`, that meaning is false. Either `stopWhen` gets a misleading tick value, or implementations will have to special-case the context semantics. That is an avoidable off-by-one contract leak.

Everything else is broadly pointed in the right direction: keeping this separate from `runScenario`, keeping corpus/index/LLM work out of scope, and making the harness synchronous in v1 are all good calls. The design is not acceptable as-is, though.

Must land before acceptance:
- Fix the determinism model so policy nondeterminism is actually detectable, and policy RNG consumption is replay-compatible.
- Make `synthetic` metadata a first-class producer concern rather than sink metadata mutation.
- Separate policy/harness failures from world poison/tick-failure semantics.
- Re-evaluate the `sourceKind` versioning claim as a public API change.
- Tighten the policy command/context typing contract.


