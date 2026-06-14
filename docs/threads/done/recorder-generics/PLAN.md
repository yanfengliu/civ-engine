# PLAN — recorder-generics

Implements [DESIGN.md](./DESIGN.md). One coherent additive-minor change (1.2.0). TDD: type-level assertions first.

## Steps

1. **Failing type test.** Add `tests/session-generics.test.ts` with a compile-only `_typeAssertions(...)` function (never executed; a trivial `it()` keeps vitest happy) defining a local typed registry, asserting: (a) `new SessionRecorder({ world: typedWorld })` compiles and the instance carries the registry; (b) `SessionReplayer.fromBundle(bundle, { worldFactory: () => typedWorld }).openAt(0)` is assignable to the typed `World`; (c) `w.getComponent(id, 'health')` yields the registry type (`Health`), not `unknown` — this assignment is the discriminator (NOT a typo `@ts-expect-error`: the escape-hatch `getComponent<T>(key: string)` overload means a bad NAME still compiles by design); (d) `runAgentPlaytest`'s `AgentDriverContext.world` is typed inside `decide`; (e) default-generic `new World()` still flows. Confirm it FAILS `npm run typecheck` against today's code.

2. **`SessionRecorderConfig` + `SessionRecorder`** (`src/session-recorder.ts`). Append `TComponents extends ComponentRegistry = Record<string, unknown>`, `TState extends Record<string, unknown> = Record<string, unknown>` to both; widen `config.world` and the private `_world` to `World<E, C, TComponents, TState>`; keep the internal submit-wrap/listener casts (adjust the `as` target type). Import `ComponentRegistry` from `./world.js`.

3. **`ReplayerConfig`** (`src/session-replayer-types.ts`). Append `TComponents`/`TState`; `worldFactory` returns `World<E, C, TComponents, TState>`.

4. **`SessionReplayer`** (`src/session-replayer.ts`). Append `TComponents`/`TState` to the class; thread through `fromBundle`/`fromSource` (constraints + inference), `_config`, `_constructReplayWorld` (returns typed world), `openAt` return type, `forkAt`'s `openAt` call (keep ForkBuilder default-generic — cast at that internal boundary, out of scope to thread). `stateAtTick` unchanged.

5. **De-cast harnesses.** `runAgentPlaytest` (`src/ai-playtester.ts`) and `runSynthPlaytest` (`src/synthetic-playtest.ts`): drop the `new SessionRecorder<E, C>({ world: world as unknown as ... })` cast → `new SessionRecorder({ world, ... })`. Remove the stale "SessionRecorder is 3-generic" comments. Also thread `AgentDriverContext` / `AgentDriver` (append `TComponents`/`TState`), update `AgentPlaytestConfig.agent`/`stopWhen`, and drop the ctx-construction cast in `runAgentPlaytest` so `decide`/`stopWhen` receive a typed world (parity with `runSynthPlaytest`'s already-threaded `PolicyContext`).

6. **Green + back-compat.** `npm run typecheck` passes (type test green); `npm test` unchanged (zero runtime delta). Fix any internal default-generic cast that the widening surfaces (e.g. sink-bound entry casts).

7. **Surface pin.** Regenerate/inspect `dist/index.d.ts`; update `tests/fixtures/public-surface.json` only if it captures generic arity (names are unchanged — verify the pin still passes or update deliberately).

8. **Docs.** `api-reference.md` (the four type signatures + a note on the full-inference requirement), `session-recording.md` (a short "typed components" note), `decisions.md` (ADR 52: threaded generics, appended-order non-breaking rationale, invariance sidestep), `changelog.md` (1.2.0, additive), `devlog`, version bump (`package.json` + `src/version.ts` + README badge), `package-lock` (+ mcp lock if the linked version matters).

9. **Gates + aoe2 cross-check.** All four gates + mcp. Build the engine, then run aoe2 `npm run typecheck` (no edits) — must stay green (back-compat proof).

10. **Multi-CLI review** (Codex + Gemini + Claude) on the diff; synthesize `REVIEW.md`; iterate to convergence; fold into devlog; move thread to `done/`. Commit + push.

## Risks

- **Inference vs explicit args:** the typed path needs full inference (no `<E, C>`). Documented; the type test pins both paths.
- **Invariance resurfacing internally:** if any engine call site passes a typed world into a 2-generic position, widen it or cast at that one boundary (ForkBuilder is the known one). The typecheck gate catches all.
- **Surface-pin blind spot:** generic-arity additions don't change export names (the name-pin won't flag them — recent lesson). Treat as a deliberate minor; verify the d.ts diff in review.
