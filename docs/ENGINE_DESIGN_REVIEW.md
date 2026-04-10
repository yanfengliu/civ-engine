# Engine Design Review

Review date: 2026-04-10

Scope: general state and design quality for a headless 2D realtime civilization simulation engine. This is a handoff note for a future Codex or Claude pass. No engine behavior was changed as part of this review.

Validation run during review:

- `npm.cmd test` - 19 files, 242 tests passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.

## Overall Assessment

The engine is in a strong early-prototype state: it has a small TypeScript core, a coherent `World` facade, good subsystem separation for entities/components/events/commands/resources, transport-agnostic client plumbing, and unusually thorough tests for its current size. The docs are also better than the code maturity would normally imply.

The main design risk is that several APIs are framed as deterministic, diffable, JSON-serializable simulation infrastructure, but the current write model does not fully enforce those guarantees. For realtime civ-scale games, the next work should harden invariants before adding more features.

The headless/no-renderer boundary is good. Do not add rendering, UI, combat rules, tech trees, diplomacy, or other game-specific logic to this package unless the project scope changes.

## What Is Working Well

- `World` is a simple, discoverable facade over private subsystems (`src/world.ts:24`, `src/world.ts:25`, `src/world.ts:28`, `src/world.ts:29`, `src/world.ts:42`).
- The tick order is explicit and deterministic for synchronous code (`src/world.ts:439`).
- The command/event/diff model is a reasonable fit for AI agents and external clients (`src/world.ts:209`, `src/world.ts:192`, `src/world.ts:419`, `src/client-adapter.ts:43`).
- Standalone utilities are correctly kept outside `World` where possible: pathfinding, map generation, noise, cellular automata, and behavior trees.
- The test suite is broad for the current surface area and all checks pass.
- The docs clearly explain current design intent, including important caveats such as same-tick spatial-grid staleness (`docs/guides/spatial-grid.md:57`).

## High-Priority Design Risks

### 1. Component mutation tracking is not reliable enough for diffs

Docs encourage direct mutation from `getComponent()` (`docs/guides/concepts.md:58`, `docs/guides/concepts.md:66`), and systems examples mutate component objects in place. But dirty tracking only happens when `ComponentStore.set()` or `ComponentStore.remove()` is called (`src/component-store.ts:10`, `src/component-store.ts:27`). `World.buildDiff()` only reads those dirty sets (`src/world.ts:419`).

That means a normal system like `pos.x += 1` updates the stored object and serialization result, but it does not appear in the per-tick diff unless the system also calls `addComponent()` to re-set the object. This conflicts with the doc claim that diffs capture everything (`docs/guides/concepts.md:134`) and is risky for client sync, AI observation, replay, and debugging.

Suggested direction:

- Add explicit write APIs such as `setComponent`, `patchComponent`, and `setPosition`; document them as the diff-safe mutation path.
- Consider returning readonly component views from `getComponent()` in the public API, or freezing/proxying component objects in dev/test mode to catch untracked writes.
- Update docs and tutorials so all systems either call a write API or explicitly accept that the mutation is not diff-tracked.
- Add tests for in-place mutation not appearing in diffs, then either lock that behavior down in docs or change the implementation.

### 2. Entity ID reuse can make stale references unsafe

Entity IDs are numeric and recycled by a LIFO free list (`src/entity-manager.ts:10`, `src/entity-manager.ts:24`). Generation counters exist (`src/entity-manager.ts:36`), but the public `World` API accepts bare `EntityId` values and does not expose generation-aware handles.

`World.addComponent()` does not check that an entity is alive (`src/world.ts:105`). Resource APIs similarly delegate to `ResourceStore` without an entity liveness check (`src/world.ts:336`, `src/world.ts:340`, `src/world.ts:351`, `src/world.ts:359`, `src/world.ts:363`, `src/world.ts:375`). A stale command or bug can attach components/resources to a dead or never-created ID. Worse, if an ID is destroyed and recycled, stale external references can silently target a different entity.

Suggested direction:

- Validate liveness in `World.addComponent`, `World.removeComponent`, resource operations, transfer creation, and position/spatial writes.
- Expose a generation-aware handle type, for example `{ id, generation }`, for commands and external clients.
- Add helper methods such as `world.getEntityRef(id)`, `world.isCurrent(ref)`, and command validators that check generation.
- Add tests for stale queued commands, dead entity component writes, and huge invalid IDs.

### 3. Serialization is not complete or fully JSON-safe

`WorldSnapshot` stores config, tick, entity state, and component entries only (`src/serializer.ts:3`, `src/world.ts:259`). Resource pools, rates, transfers, and resource registrations are explicitly excluded (`docs/guides/serialization-and-diffs.md:132`, `docs/guides/serialization-and-diffs.md:134`).

This is a known limitation, but it is important for civ simulations because resources are core state. Also, the resource default max is `Infinity` (`src/resource-store.ts:30`). That leaks into resource diffs and examples; JSON will serialize `Infinity` as `null`, so the client protocol is not actually JSON-safe for those messages. Components can also contain arbitrary non-JSON values because the engine does not validate payloads.

Suggested direction:

- Extend `WorldSnapshot` with resource registrations, pools, rates, transfers, and `nextTransferId`.
- Encode special values explicitly, or ban `Infinity` in public serialized/diffed state. Prefer a finite default max or a tagged value such as `{ kind: "unbounded" }`.
- Add a snapshot validation layer that rejects functions, symbols, cycles, `NaN`, and `Infinity` unless intentionally encoded.
- Add tests for JSON round-trip via `JSON.stringify` and `JSON.parse`, not just object equality.

### 4. Spatial grid ownership and timing need a harder boundary

Docs say the grid is read-only from user code (`docs/guides/spatial-grid.md:20`), but `World.grid` exposes the actual `SpatialGrid` instance (`src/world.ts:38`), including public `insert`, `remove`, and `move` mutators (`src/spatial-grid.ts:39`, `src/spatial-grid.ts:47`, `src/spatial-grid.ts:52`).

The grid also syncs by scanning every positioned entity before systems run (`src/world.ts:445`, `src/world.ts:456`). This creates two problems: same-tick grid staleness after a movement system, and O(positioned entity count) work every tick. The staleness is documented (`docs/guides/spatial-grid.md:57`, `docs/guides/spatial-grid.md:64`), but for a realtime civ simulation it will be a frequent source of ordering bugs.

Suggested direction:

- Expose only a read-only grid view from `World`; keep mutators internal.
- Add a first-class position write API (`moveEntity`, `setPosition`) that updates component dirty state and the spatial grid together.
- Consider system phases, such as command, pre-spatial, movement, post-spatial, resource, diff. That would let collision/combat/vision systems depend on a fresh grid without every system doing manual sync work.
- Validate grid coordinates as finite integers. Current bounds checks do not reject fractional coordinates before indexing (`src/spatial-grid.ts:123`, `src/spatial-grid.ts:129`).
- Add perf tests or benchmarks around moving sparse vs. dense populations.

### 5. Realtime loop needs basic lifecycle hardening

`GameLoop.start()` does not guard against being called while already running (`src/game-loop.ts:30`). A second call can schedule another timer loop while only one timer handle is stored. Config inputs also need validation: `tps`, `gridWidth`, `gridHeight`, and `maxTicksPerFrame` should be finite positive integers where applicable (`src/types.ts:8`, `src/game-loop.ts:14`).

Suggested direction:

- Make `start()` idempotent or throw on double start.
- Validate `WorldConfig` in the `World` constructor.
- Add fake-timer tests for `start`, `stop`, pause/resume, speed, and double-start behavior.

### 6. Resource arithmetic needs validation

Resource methods accept arbitrary numbers (`src/resource-store.ts:38`, `src/resource-store.ts:53`, `src/resource-store.ts:70`, `src/resource-store.ts:86`, `src/resource-store.ts:105`, `src/resource-store.ts:119`). Negative or non-finite amounts can produce surprising state: for example, `removeResource(entity, key, -10)` can increase a pool.

Suggested direction:

- Validate that resource amounts, rates, maxima, and transfer rates are finite and non-negative.
- If debt, deficits, decay, or negative production are desired, model them explicitly instead of relying on accidental negative values.
- Validate entity liveness at the `World` resource API boundary, not inside the standalone `ResourceStore`.

### 7. Client protocol needs runtime input validation and failure isolation

`ClientAdapter.handleMessage()` trusts the TypeScript type of incoming messages (`src/client-adapter.ts:70`). That is fine for in-process tests but not for WebSocket/stdin/postMessage transports. Missing handlers are discovered later in `World.processCommands()` and throw during a tick (`src/world.ts:400`, `src/world.ts:406`). `send` callbacks can also throw from inside a diff listener (`src/client-adapter.ts:50`), which can break `world.step()`.

Suggested direction:

- Add a runtime message decoder/validator hook or a small schema layer owned by the game project.
- Reject unknown command types before enqueueing, or expose a `canHandleCommand(type)` API.
- Include rejection reasons and optionally accepted/processed acknowledgements with tick numbers.
- Decide whether adapter send failures should throw, disconnect the adapter, or be reported through an error callback.

### 8. Package boundaries are not ready for reuse

The repo has TypeScript source and tests, but no public barrel export, package `exports`, declaration output, or build script (`package.json:2`, `package.json:5`, `tsconfig.json:11`). Docs import directly from `./src/...`, which is fine for local development but not for a reusable engine package.

Suggested direction:

- Add `src/index.ts` with the intended public API.
- Add `exports`, `types`, and a real build/declaration pipeline if this will be consumed as a package.
- Decide which classes are public. For example, `SpatialGrid` may be useful to import for tests, but its mutators should not be the public way to modify `World.grid`.
- Add CI to run test, typecheck, and lint.

## Medium-Priority Architecture Gaps for Civ-Scale Games

- System phases or scheduling. A flat registration order is good early, but large games will want explicit phases for input, AI planning, movement, collision, economy, combat, cleanup, and output.
- Query/index strategy. Sparse arrays and smallest-store query selection are simple, but archetype-style indexes or cached query results may matter once maps contain many tiles plus many agents.
- Tile and terrain primitives. `createTileGrid()` is useful, but civ games will likely need standardized terrain layers, occupancy, passability, ownership, yields, region IDs, and visibility.
- Multi-agent pathing. Generic A* is a good utility (`src/pathfinding.ts:76`), but large civ sims often need grid helpers, cached cost fields, flow fields, path invalidation, and hierarchical pathfinding.
- Deterministic randomness and replay. Seeded noise helps map generation, but gameplay systems still need an engine-provided RNG and command log/replay contract.
- Performance instrumentation. Add optional tick timing, system timing, entity counts, query counts, and diff sizes before optimizing blindly.
- Persistence migrations. The snapshot version exists, but no migration story exists yet. Add one before shipped saves matter.

## Suggested Roadmap

1. Harden invariants first: config validation, alive checks, resource numeric validation, double-start guard, and read-only grid exposure.
2. Fix the write model: introduce explicit component/position write APIs and make diffs reliable for ordinary system code.
3. Make save/load and client sync truthful: serialize resources, remove or encode `Infinity`, and test actual JSON round-trips.
4. Add entity generation handles for external commands, clients, and AI agents.
5. Add system phases and dirty spatial updates before scaling to large maps and many units.
6. Add package exports/build/CI once the public API boundary is deliberate.

## Tests to Add Next

- In-place component mutation and whether it appears in `TickDiff`.
- Mutating dead, recycled, never-created, and huge entity IDs.
- Queued stale command targeting an entity ID that is destroyed and reused before command processing.
- JSON stringify/parse round-trip for snapshots and tick messages with resource diffs.
- Negative, `NaN`, and `Infinity` resource amounts/rates/maxima.
- `GameLoop.start()` called twice, then `stop()`.
- Fractional and non-finite spatial coordinates.
- Malformed client messages and unknown command types.
- Large-map smoke/perf tests for spatial sync, query, diff size, and pathfinding.

## Do Not Change Yet

- Do not merge rendering or UI into the engine core.
- Do not add game-specific civ rules until the invariant and write-model issues are addressed.
- Do not replace the simple `World` facade with a heavy framework yet. The current API is a strength; it just needs stricter boundaries.
