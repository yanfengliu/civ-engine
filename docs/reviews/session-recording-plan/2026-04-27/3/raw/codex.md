**Closure list**
- `CR1`: addressed. T2 now writes an initial snapshot before the marker-accumulation `toBundle()` test, while `toBundle()` still correctly rejects zero-snapshot bundles.
- `H1`: addressed. FileSink now explicitly defaults to sidecar storage; threshold branching is MemorySink-only.
- `H7`: still partial. The top-level per-task doc rule is fixed, but the modified-files/task matrix still defers some required doc surfaces to T9.
- `H10`: addressed. T0 defines `ENGINE_VERSION`, and T7 now uses it instead of `process.env.npm_package_version`.
- `M3`: still partial. T4 owns `recordedCommands`, but the typing plan still leans on casts instead of showing the final generic surface cleanly.
- `M7`: still partial. Early tasks are clearly test-first; later tasks still describe coverage more than an explicit red/green sequence.
- `L1`: still partial. Recorder marker IDs use `randomUUID()`, but T7 assertion-marker IDs are still placeholder text.
- `L2`: addressed. T0 now explicitly adds `isAliveAtGeneration()` and `hasHandler()` with tests.
- `L3`: still open. `MarkerValidationError.referencesValidationRule` is still not modeled as a first-class field.
- `L4`: still open. `SessionSink.writeAttachment()` still returns `AttachmentDescriptor` without reconciling the spec’s `void` signature / recorder API story.
- `L6`: still open. The empty `ref: { dataUrl: '' }` placeholder pattern is still present.
- `N1`: still open. The self-review still claims away ambiguity while the remaining seams above are unresolved.
- `R1`: still open. The new `_startTick` guard shape is better, but `connect()` never assigns `this._startTick`, so the first diff tick can still duplicate the initial snapshot when recording starts at a nonzero interval boundary.
- `R2`: addressed. Engine-version sourcing is now anchored on `ENGINE_VERSION`.
- `R3`: addressed. T0 now explicitly owns the missing public replay helpers.
- `R4`: still partial. FileSink policy is explicit now, but the public `attach(..., { sidecar?: boolean })` path is still not sketched concretely enough to show where that policy is enforced.
- `R5`: still open. Same unresolved `referencesValidationRule` seam as `L3`.
- `R6`: still partial. `attach()` / `disconnect()` behavior is described and tested, but the T5 class sketch still under-specifies their concrete implementation paths.

**Remaining issues**
- `T5 periodic snapshot guard` is still a real correctness issue. The plan adds `_startTick` and uses it in the guard, but `connect()` never assigns it before `_onDiff()` reads it, so the initial-snapshot de-duplication still fails for nonzero start ticks. See [connect()](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1519) and [the guard](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1592).
- The replay reconstruction contract is still not viable against the current engine API. The T8 example does `World.deserialize(snap)` and then re-runs setup registration, but current [`World.registerComponent`](C:/Users/38909/Documents/github/civ-engine/src/world.ts:411) and [`World.registerHandler`](C:/Users/38909/Documents/github/civ-engine/src/world.ts:808) throw on duplicates. The plan needs one concrete path here: split replay-only registration, add a deserialize-into-existing-world API, or change the `worldFactory` contract. See the current example at [T8](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1968).

Approve after 2 fixes: the `T5` start-tick capture bug and the replay world-reconstruction contract.


