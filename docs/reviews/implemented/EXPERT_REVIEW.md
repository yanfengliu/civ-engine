# Expert Architecture Review & Improvements

**Review Date:** 2026-04-10
**Status**: IMPLEMENTED
**Perspective:** Seasoned Game Architect
**Project:** `civ-engine` (Realtime 2D headless civilization simulation engine)

## Overall Impressions
The engine is remarkably robust for an early prototype. It strictly adheres to an AI-native, headless, and deterministic paradigm. The recent hardening pass correctly insulated its most dangerous invariant vulnerabilities (JSON-safety, explicit mutation tracking, generation handles, finite arithmetic). The codebase is incredibly clean and easily understandable.

However, as a simulation scales from a "prototype colony" to a "massive civilization" with 100,000+ entities, several deep architectural limitations in the current design will become fatal bottlenecks.

Here is my roadmap for transforming this solid foundation into a truly production-ready, highly-performant simulation engine.

---

## 1. The Query Bottleneck (Archetypes vs. Sparse Arrays)

### Current Flaw
`ComponentStore` uses Sparse Arrays. While `store.get(id)` is O(1), `world.query('pos', 'health', 'ai')` is highly inefficient. The engine essentially iterates the keys of the smallest `ComponentStore` and checks for presence in the others. In a sparse environment, this leads to O(N) cache-miss heavy iteration every single tick for every system.

### The Architect's Solution
**Implement Archetype or Bitset-based Querying.**
We do not need to rewrite the entire engine into a strict Archetype model immediately, but we MUST cache queries.
*   **Bitsets/Signatures:** Every entity should have a `ComponentSignature` (a bitmask of attached components).
*   **Query Caching:** `world.query(...)` should return a pre-computed array of `EntityId`s. When an entity adds/removes a component, its signature changes, and it is added/removed from relevant cached query arrays.
*   **Result:** System iteration becomes O(K) where K is strictly the number of matching entities, with contiguous memory iteration.

## 2. Spatial Partitioning vs. Flat 2D Grid

### Current Flaw
`SpatialGrid` is a flat 2D array of `Set<EntityId>`. It works fine for dense, small maps (64x64). For a civilization game on a 4096x4096 map (where 90% of tiles might be empty ocean or unexplored fog), a flat array allocating Sets per cell is a memory catastrophe. Furthermore, `syncSpatialIndex()` scans *every single entity with a position component* every tick, which scales terribly.

### The Architect's Solution
**Migrate to Spatial Hashing or a QuadTree/Chunked Grid.**
*   **Chunking:** Divide the world into 16x16 or 32x32 chunks. Only allocate memory for chunks that have active entities.
*   **Dirty Position Sync:** `syncSpatialIndex()` should NOT scan the entire position `ComponentStore`. It should only iterate entities whose position was explicitly mutated via `setPosition()` (using a `dirtyPositions` queue) in the previous tick.

## 3. Data Locality (Struct of Arrays / SoA)

### Current Flaw
Because components are plain JavaScript objects (`{ x: 0, y: 0 }`, `{ hp: 100 }`), they are scattered across the V8 heap. A CPU cache line cannot hold sequential positions. Iterating 10,000 positions requires 10,000 pointer dereferences in the JS engine.

### The Architect's Solution
**Introduce `StructComponent` backed by `SharedArrayBuffer`.**
*   While keeping JSON-safe plain objects for complex data, introduce a specialized API for dense numeric data (e.g., `Position`, `Velocity`, `Health`).
*   Store these in a flat `Float64Array` or `Int32Array`.
*   This makes the engine drastically faster for math-heavy systems (like pathfinding and movement) and seamlessly prepares the engine for multi-threading (WebWorkers) since `SharedArrayBuffer` can be passed without serialization.

## 4. System Scheduling and Graph Execution

### Current Flaw
Systems run in a flat registration loop `this.systems.forEach(s => s(world))`. Order is entirely dependent on when `registerSystem()` was called. In a massive project, this leads to fragile implicit dependencies (e.g., "CombatSystem must run after MovementSystem but before EconomySystem").

### The Architect's Solution
**System Dependency Graph & Execution Phases.**
*   Introduce explicit lifecycle phases: `Input`, `PreUpdate`, `Update`, `PostUpdate`, `SpatialSync`, `Output`.
*   Systems should declare their dependencies: `registerSystem({ name: 'Combat', after: ['Movement'], execute: fn })`.
*   The engine topologically sorts this graph into a deterministic pipeline.
*   This unlocks future **Worker Parallelism**: Systems without overlapping write-dependencies can be run on parallel threads.

## 5. Deterministic Randomness (RNG) & Replayability

### Current Flaw
There is no engine-level deterministic RNG. A user system relying on `Math.random()` instantly breaks determinism. A core goal of this engine is AI-native replayability, meaning given Seed X and Command Queue Y, the exact same tick output must be guaranteed.

### The Architect's Solution
**Inject a PRNG into the `World` Context.**
*   Implement a high-performance PRNG (like Xoshiro128** or PCG).
*   Initialize `World` with a `seed`.
*   Systems access random numbers via `world.random()`.
*   The internal state of the PRNG must be included in `WorldSnapshotV3` so that a game can be saved, loaded, and perfectly resumed.

## 6. Real-Time Command Pipeline & Tick Interpolation

### Current Flaw
The engine accepts commands and processes them immediately on the next `step()`. For real-time multiplayer over WebSockets, network jitter will cause commands to arrive irregularly.

### The Architect's Solution
*   **Tick Locking:** Commands should be submitted targeted at a *specific future tick* (e.g., `submitCommand(tick + 2, cmd)`). This ensures all clients and the server process the exact same command on the exact same frame.
*   **Rollback/Prediction:** The engine should provide a mechanism for the client adapter to clone the `World`, simulate ahead, and rollback if server authoritative diffs disagree. The current JSON serialization is fast enough for occasional saves, but too slow for 60Hz state rewinds. A specialized binary snapshot method (or undo-diff queue) will be needed.

## Conclusion
The `civ-engine` is built on excellent principles. By adopting bitset query caching, chunked spatial indexing, data locality via ArrayBuffers, and a deterministic PRNG, it can seamlessly graduate from an elegant prototype to an industrial-grade simulation backend.