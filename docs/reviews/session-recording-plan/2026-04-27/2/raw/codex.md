**Closure**
- `CR1 No` - T2 still leaves a `toBundle()` call without a required snapshot.
- `CR2 Yes` - T4 now extends `ScenarioConfig.history` and threads `captureCommandPayloads`.
- `CR3 Yes` - T4 now resets `recordedCommands` on `clear()`.

- `H1 Partially` - T3 tests reflect sidecar-by-default, but the implementation bullets still describe threshold-based behavior.
- `H2 Yes` - T4 introduces `mkWorld()` so tests stop using bare `new World()`.
- `H3 Yes` - T6 now allocates both `ReplayHandlerMissingError` and `no_replay_payloads` behavior/tests.
- `H4 Yes` - T6 now defines `selfCheck()` skip semantics for `failedTicks`.
- `H5 Partially` - T8 extracts reusable setup functions, but the replay reconstruction path is still not concrete on current APIs.
- `H6 Yes` - per-task multi-CLI review is now explicit for T1-T8.
- `H7 Partially` - the top-level policy is fixed, but the file matrix/task lists still defer some required docs to T9.
- `H8 Yes` - T0 extracts `cloneJsonValue` into `src/json.ts`.
- `H9 Yes` - T5/T6 are materially expanded with skeletons and tests.
- `H10 No` - T7 still does not commit to the deterministic engine-version source.

- `M1 Yes` - MIME-to-extension mapping is specified.
- `M2 Yes` - the hidden recorder slot gets a declaration-merge home.
- `M3 Partially` - the wrap is sketched, but there is still no explicit typed helper / T4-level typing plan.
- `M4 Yes` - the disconnect test is behavioral now, not `toString()`-based.
- `M5 Yes` - clause 7 gets `vi.stubEnv`; clause 9 gets `it.todo` for cross-Node-major.
- `M6 Yes` - `deepEqualWithPath` is now sketched.
- `M7 No` - explicit red/green verification still thins out after T2.
- `M8 Yes` - clause 9 is split out of the `selfCheck()` divergence path.

- `L1 Partially` - UUID generation is specified for recorder state, but not cleanly for T7 assertion markers.
- `L2 No` - marker validation still relies on a generation-aware liveness API the engine does not expose.
- `L3 No` - `MarkerValidationError.referencesValidationRule` is still not modeled explicitly.
- `L4 No` - `writeAttachment()` still returns `AttachmentDescriptor` without reconciling the spec mismatch.
- `L5 Yes` - `NewMarker` is now declared.
- `L6 No` - the empty `dataUrl: ''` placeholder pattern is still present.

- `N1 No` - the self-review still misses live contradictions.
- `N2 Yes` - setup/preflight gate verification is explicit.
- `N3 Yes` - per-task `c`-bumps remain coherent.
- `N4 Yes` - the plan still leans on existing `getEvents()` / `onCommandExecution` seams correctly.
- `N5 Yes` - the need to re-register handlers before replay is now called out.

**Remaining Issues**
1. `CR1` is still open. The `writeMarker accumulates markers` test calls `toBundle()` without writing any snapshot ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:738)), but the planned `toBundle()` still throws when `_snapshots.length === 0` ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1030)).

2. `H1` is only partially fixed. T3’s tests say FileSink defaults to sidecars and only embeds on explicit `{ sidecar: false }` ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1149), [implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1163)), but the implementation summary still says “sidecar if over threshold OR explicitly sidecar; else dataUrl” ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1220)).

3. The replay construction path is still not viable against the current engine API. The T6 sketch calls `world.hasHandler()` with only a “maybe add it” note ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1732), [implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1746)), and the T8 example uses `World.deserialize(w, snap)` ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1909)), but the real API is `World.deserialize(snapshot, systems?)` returning a new world ([world.ts](C:/Users/38909/Documents/github/civ-engine/src/world.ts:921)).

4. `H10` remains unresolved. T0 introduces `ENGINE_VERSION` specifically to avoid env-dependent version reads ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:79), [implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:111)), but T7 still says to source `metadata.engineVersion` from `package.json` / `process.env.npm_package_version` at translation time ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1836)).

5. The T5 periodic snapshot sketch has a logic bug: `world.tick !== this._config.world.tick` can never be true because both names reference the same world, so periodic snapshots never fire ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1530)).

6. `L2` is still real at the API boundary. The plan wants `world.isAlive(id, generation)` for marker validation ([implementation plan](C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-session-recording-implementation-plan.md:1583)), but the current engine only exposes `isAlive(id: EntityId)` ([world.ts](C:/Users/38909/Documents/github/civ-engine/src/world.ts:366)).

Needs another iter on T2/T3/T5/T7 coherence and the replay-construction path before approval.


