# Architecture Drift Log

Append a row here whenever architecture changes. Each row captures the date, the change, and the reason.

| Date       | Change                                | Reason                                                           |
| ---------- | ------------------------------------- | ---------------------------------------------------------------- |
| 2026-04-04 | Initial architecture                  | Core engine foundation implementation                            |
| 2026-04-05 | Added EventBus as World subsystem     | System-to-system and engine-to-client event communication        |
| 2026-04-05 | Added CommandQueue as World subsystem | Input command layer for player command validation and processing |
| 2026-04-05 | Added state serialization             | JSON snapshot save/load via World.serialize() and World.deserialize() |
| 2026-04-05 | Added state diff output               | Per-tick dirty tracking and TickDiff via getDiff/onDiff/offDiff       |
| 2026-04-05 | Added resource system                  | ResourceStore with pools, rates, transfers, diff integration          |
| 2026-04-06 | Added map infrastructure utilities     | Standalone noise, cellular automata, and tile-creation primitives for map generation |
| 2026-04-06 | Made hardcoded defaults configurable   | positionKey, maxTicksPerFrame, neighbor offsets, cellular offsets now have overridable defaults |
| 2026-04-06 | Added generic A* pathfinding        | Standalone graph-agnostic pathfinding with configurable callbacks and early termination |
| 2026-04-06 | Added simulation speed control       | Speed multiplier and pause/resume on GameLoop, proxied via World                             |
| 2026-04-06 | Added ClientAdapter | Transport-agnostic client protocol with typed messages for server-client communication |
| 2026-04-06 | Added getComponents batch API      | Reduces verbosity when systems need multiple components per entity        |
| 2026-04-06 | Added entity destroy hooks           | onDestroy/offDestroy callbacks fire before component removal for relationship cleanup |
| 2026-04-06 | Added behavior tree framework        | Standalone generic BT with ECS-compatible state (BTState) and game-defined TContext    |
| 2026-04-10 | Added RTS-scale standalone primitives | OccupancyGrid, queued grid path helpers, VisibilityMap, and benchmark harness |
| 2026-04-10 | Added render projection and debugger helpers | RenderAdapter for renderer-facing projections and WorldDebugger with probe support |
| 2026-04-10 | Hardened engine invariants           | Added JSON-safe component/resource state, entity refs, explicit write APIs, read-only grid exposure, resource snapshot v2, package exports/build, and CI |
| 2026-04-11 | Added scenario runner harness        | `runScenario()` for deterministic setup/run/check orchestration over the AI-facing debug/history surfaces |
| 2026-04-12 | Added 6 engine ergonomics features | Typed component registry, loose system typing, world-level state store, spatial query helpers, system ordering constraints, entity tags & metadata — addressing civ-sim-web integration friction |
| 2026-04-23 | Added BT interrupt affordances and semantic diff mode | Address civ-sim-web feedback: reactive selector/sequence + clearRunningState helper; per-component diffMode opt-in to suppress blind-rewrite diff churn |
| 2026-04-25 | Fail-fast tick failure semantics + World.recover() | Replace partial-mutation-after-failure ambiguity with explicit poisoned state; step() throws until recover() is called. World.tick is advanced on failure so failed and successful tick numbers are distinct. |
| 2026-04-25 | Added TState generic on World | Separate state and component type registries — setState/getState now type against `TState`, not `TComponents`; `setMeta` reverse index now throws on duplicate (key,value) pairs. |
| 2026-04-25 | Snapshot v5 (config + per-component options) | Round-trips `maxTicksPerFrame`, `instrumentationProfile`, and per-component `ComponentStoreOptions` (diffMode + detectInPlaceMutations). v4 snapshots stay readable. |
| 2026-04-25 | ComponentStore.detectInPlaceMutations option | Lets callers opt out of the per-tick all-entries fingerprint scan when they only mutate via setComponent. Strict-mode set() also no longer computes fingerprint redundantly. |
| 2026-04-25 | GameLoop.step no longer auto-advances | World.runTick now calls gameLoop.advance() directly so the gameLoop tick aligns with the diff tick when listeners fire. GameLoop is internal-only (not in src/index.ts). |
