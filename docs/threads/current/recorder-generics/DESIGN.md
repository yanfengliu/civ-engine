# DESIGN — Thread `TComponents`/`TState` through `SessionRecorder` / `SessionReplayer`

Objective: `recorder-generics`. Source: aoe2 engine-feedback (2026-06-09 / surfaced by v0.8.15). Scope decided 2026-06-13: **Core record+replay, engine-only** (no `forkAt`/`BundleViewer`; no aoe2-side adoption).

## Problem

`World` is generic over `<TEventMap, TCommandMap, TComponents extends ComponentRegistry = Record<string, unknown>, TState extends Record<string, unknown> = Record<string, unknown>>`. `SessionRecorder` / `SessionReplayer` hardcode only the first two (`World<TEventMap, TCommandMap>`). Before v0.8.15 a component-typed world was still assignable into those signatures; the v0.8.15 layer-chain split surfaced `TComponents`-dependent declarations (validators, `transaction().require`) in protected position, making `TComponents` **invariant** — so `World<E, C, GameComponents, GameState>` no longer interchanges with `World<E, C>`.

aoe2 absorbed it with a sanctioned cast seam — `toEngineWorld` / `fromEngineWorld` in `aoe2/src/game/simulation/bridge/pureHelpers.ts` (`as unknown as`) — but the casts **erase component-type safety at exactly the recorder/replayer boundary**, where a component-name typo (`getComponent(id, 'positon')`) would now compile. The same erasure exists inside the engine's own `runAgentPlaytest` / `runSynthPlaytest`, whose configs already declare `TComponents`/`TState` but cast the world down to 2-generic before constructing the recorder.

## Approach

Add two generic parameters — `TComponents extends ComponentRegistry = Record<string, unknown>` and `TState extends Record<string, unknown> = Record<string, unknown>`, mirroring `World`'s constraints + defaults — **appended after each type's existing parameters** so no existing explicit type argument changes meaning (strictly non-breaking under the 1.0 freeze).

Threading **sidesteps** the invariance rather than fixing it: the caller's typed world is *inferred* into `TComponents`/`TState`, never narrowed into `World<E, C>`, so the layer chain is untouched.

### Surface (additive, defaulted)

| Type | Before | After |
|---|---|---|
| `SessionRecorderConfig` | `<E, C, TDebug>`; `world: World<E, C>` | `<E, C, TDebug, TComponents, TState>`; `world: World<E, C, TComponents, TState>` |
| `SessionRecorder` | `<E, C, TDebug>` | `<E, C, TDebug, TComponents, TState>` (stores the wider world) |
| `ReplayerConfig` | `<E, C>`; `worldFactory: (s) => World<E, C>` | `<E, C, TComponents, TState>`; `worldFactory: (s) => World<E, C, TComponents, TState>` |
| `SessionReplayer` | `<E, C, TDebug>`; `openAt(): World<E, C>` | `<E, C, TDebug, TComponents, TState>`; `openAt(): World<E, C, TComponents, TState>` |

`fromBundle` / `fromSource` static factories thread the four+ params (inferred: `E`/`C`/`TDebug` from `bundle`, `TComponents`/`TState` from `config.worldFactory`'s return type). `_constructReplayWorld` returns the typed world. `stateAtTick` returns a `WorldSnapshot` (no world) — unchanged.

De-cast the two harness construction sites: `runAgentPlaytest` (`ai-playtester.ts:159-160`) and `runSynthPlaytest` (`synthetic-playtest.ts:199-200`) drop `new SessionRecorder<E, C>({ world: world as unknown as ... })` → `new SessionRecorder({ world, ... })` (full inference).

### Out of scope (deliberate)

`forkAt` / `ForkBuilder`, `BundleViewer` (`worldFactory` / `state()` / `replayer()`), and aoe2-side adoption (removing the cast seam). They keep working unchanged (default-generic). A follow-up can thread them.

### Unchanged

Zero runtime behavior — `TComponents`/`TState` are pure type-level passthrough; no new runtime code on any path. The sink layer (`SessionSink`/`SessionSource`/`MemorySink`/`FileSink`) stays default-generic (it stores JSON); the recorder keeps its existing `as unknown as` casts where it bridges the typed world to the default-generic sink/bundle shapes (now from the wider world to the default — still runtime-identical). World's layer chain / invariance: untouched.

## Key constraint (documented)

TypeScript has no partial type-argument specification: `new SessionRecorder<E, C>({ world })` specifies `E`/`C` and **defaults** the rest (`TComponents = Record<string, unknown>`), so the typed path requires **full inference** — call with NO explicit type args (aoe2's sites already do: `new SessionRecorder({ world })`, `SessionReplayer.fromBundle(bundle, { worldFactory })`). Explicit `<E, C>` is the documented back-compat path; existing default-generic callers are unaffected.

## Testing

Compile-only type assertions checked by the `typecheck` gate (no new tooling — there is no existing `expectTypeOf` harness):
- positive: a `World<E, C, GameComponents, GameState>` flows into `new SessionRecorder({ world })` and `SessionReplayer.fromBundle(bundle, { worldFactory })` with no cast; `replayer.openAt(t)` is assignable to `World<E, C, GameComponents, GameState>` and `w.getComponent(id, 'position')` is typed;
- negative: `// @ts-expect-error` on a bad component name through the replayed world;
- back-compat: default-generic `new SessionRecorder({ world: new World() })` still compiles.

Existing recorder/replayer/playtest suites prove zero runtime change.

## Validation

All gates (test / typecheck / lint / build) + mcp; multi-CLI review; docs (changelog, api-reference signatures, ADR, session-recording guide); **version 1.2.0** (additive minor); public-surface fixture updated if it captures generic arity. Read-only aoe2 cross-check: rebuild the engine (symlinked) and run aoe2's `typecheck` — the additive change must not break aoe2's existing cast-seam code (back-compat proof; no aoe2 edits).
