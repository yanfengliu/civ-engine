# worldFactory registration manifest — DESIGN

**Objective:** `registration-manifest` · **Status:** v2 (post design-1 review: Claude HIGH on comparison semantics vs `applySnapshot` healing; Codex 5 findings; Gemini 2 — all adopted) · **Origin:** full-review 2026-06-10 ("the single highest-leverage AI-native improvement available"); ADR 16's own admission that factory drift is "indistinguishable from genuine determinism violations".

## Problem

The replay determinism contract (ADR 4) requires `worldFactory` to reproduce the recording-time component / system / handler / validator registration, in the same order. Nothing checks this. A factory that forgets one system produces no error at `openAt()` — it produces a `selfCheck` **state divergence hundreds of ticks later**, which ADR 16 admits is indistinguishable from a genuine engine determinism bug. An agent cannot grep a diverged snapshot back to "you forgot `registerSystem(combat)`"; the registration surface is all strings, so the fix is cheap.

## Goals

- Record a JSON registration fingerprint in every new bundle at no meaningful cost.
- Fail fast at world-construction time with a structured, named mismatch ("missing system 'combat'") instead of a tick-400 divergence — on **every** path that constructs a factory world.
- Full backward compatibility: bundles without the field behave exactly as today.

## Non-goals

- Fingerprinting function *bodies* (impossible without source hashing).
- Detecting registrations performed mid-recording (Limitations).
- Verifying game-logic equivalence — this catches registration drift, the dominant failure mode.

## Design

### 1. Capture vs comparison — two different category sets (design-1 HIGH)

`worldFactory` runs `applySnapshot`, and `_replaceStateFrom` splits the registration surface in two:

- **Factory-owned (preserved through `applySnapshot`):** systems, handlers, validators, destroy callbacks, `positionKey`. Snapshots cannot carry these — this is exactly where ADR 16's pain lives, and where comparison has value.
- **Snapshot-healed (replaced/merged by `applySnapshot`):** component stores + options and the whole resource store. `serialize()` writes every registered component key and resource registration; `applySnapshot` restores them before any check could run. Comparing these categories yields checks that can never fire (missing components/options/resources self-heal) or fire only as false positives (mid-recording registrations appear as "extras" against earlier snapshots — a faithful factory would be rejected).

Therefore the manifest **captures** the full surface (introspection value), but verification **compares** only:

| Category | Compared | How |
|---|---|---|
| systems | strict | ordered tuples (name, phase, interval, intervalOffset, before, after); order = execution-relevant registration order |
| handlers | strict | sorted key set |
| validators | strict | sorted (key, count) pairs — within-key order not fingerprintable (Limitations) |
| destroyCallbackCount | strict | count — same precedent as validators; destroy callbacks mutate state evolution and are factory-preserved |
| positionKey | strict | asserted as `world.positionKey === snapshot.config.positionKey` at the same checkpoint (snapshot already carries it; no manifest field needed) |
| components | extras-only | flag factory components present in **neither** the manifest **nor** the component keys of *the snapshot passed to this construction* (`_constructReplayWorld(snapshot)`'s argument — the per-construction reading is load-bearing) — that set can only come from the factory, and an extra (even empty) store changes `serialize()` output and would fail selfCheck today |
| component options / resources | capture-only | documented as snapshot-healed; never compared |

Comparing only snapshot-invariant categories also makes the verdict **call-order-independent** for bundles within the connect-time contract (mid-recording-free; same result whether `selfCheck()` or `openAt(endTick)` runs first — design-2 Claude verified the union is tick-invariant there because `serialize()` writes every registered key, even empty stores).

### 2. `RegistrationManifest` (new type, `src/session-bundle.ts`)

```ts
interface RegistrationManifest {
  schemaVersion: 1;
  /** Registration order preserved (it is the replay-relevant order for systems;
   *  recorded for components too as introspection — bit assignment is lazy and
   *  snapshot-realigned, so order here is informational for components). */
  components: Array<{ key: string; options?: ComponentStoreOptions }>;
  systems: Array<{ name: string; phase: SystemPhase; interval: number; intervalOffset: number; before: string[]; after: string[] }>;
  handlers: string[];                                  // sorted
  validators: Array<{ key: string; count: number }>;   // sorted by key
  resources: string[];                                 // sorted; capture-only
  destroyCallbackCount: number;
}
```

`SessionMetadata` gains optional `registration?: RegistrationManifest` — additive, non-breaking.

### 3. `World.getRegistrationManifest()` (new public method, observers layer)

Built from live registries: `componentStores`/`componentOptions` (insertion order), the `systems` registration array (NOT `resolvedSystemOrder` — manifest is stable whether or not a tick has run), `handlers` keys sorted, `validators` key+count sorted, resource keys sorted, `destroyCallbacks.length`. **Engine prerequisite:** `ResourceStore` has no key-enumeration accessor — it gains an internal `getRegisteredKeys(): string[]` (a private *field* named `registeredKeys` already exists — design-2 nit) (do not abuse `getState()`). Public because registration introspection is independently useful to agents; read-only, fresh arrays.

### 4. Capture points

- **`SessionRecorder.connect()`**: stamps `initialMetadata.registration = world.getRegistrationManifest()` after the poisoned/mutex guards. Both sinks pass metadata through verbatim (verified: top-level spread copies in MemorySink and FileSink). Synthetic + agent playtests inherit via their internal recorders; **fork bundles inherit for free** — `ForkBuilder.run()` constructs a fresh recorder over the factory-built world, so the fork's own connect() captures the factory's manifest.
- **`runScenario`**: `ScenarioResult` gains `registration?: RegistrationManifest`, captured by `captureScenarioState()` from the live world (the result object carries no world, so the adapter cannot do this itself — design-1 Codex F3). `scenarioResultToBundle` copies `result.registration` into metadata, with `options.registration` as an explicit override. Absent → no field, as today.

### 5. Verification: one shared construction path

`SessionReplayer` gets a private `_constructReplayWorld(snapshot)` wrapper — **the only two `worldFactory` call sites in the codebase** (`openAt`, `_checkSegment`; verified) route through it. The wrapper calls the factory, then (if `bundle.metadata.registration` present and `skipRegistrationCheck !== true`) verifies **on every construction** (not memoized — the build is cheap, and per-construction verification also covers pathological snapshot-dependent factories; design-1 Codex F1). `BundleViewer` inherits through its lazy internal replayer (all materialization routes through `replayer().openAt`); pure-metadata viewer paths construct no world and correctly never check. `BundleViewerOptions` gains and forwards `skipRegistrationCheck` (the viewer constructs its own replayer per ADR 35, so the flag is otherwise unreachable — design-1 Claude F6).

Mismatch → `BundleIntegrityError` (existing class; established `details.code` discrimination) with `code: 'registration_mismatch'` and JsonValue-safe details:

```ts
{
  code: 'registration_mismatch',
  missingSystems: string[], extraSystems: string[],
  recordedSystemOrder: string[], actualSystemOrder: string[],   // full ordered name lists — agents diff these directly; duplicates stay positional
  systemDetailMismatches: Array<{ index: number; name: string; field: string; recorded: string | number | string[]; actual: string | number | string[] }>,
  extraComponents: string[],                                     // per §1: not in manifest ∪ snapshot keys
  missingHandlers: string[], extraHandlers: string[],
  validatorCountMismatches: Array<{ key: string; recorded: number; actual: number }>,
  destroyCallbackCountMismatch: { recorded: number; actual: number } | null,
  positionKeyMismatch: { snapshot: string; actual: string } | null,
}
```

Dead fields from v1 (missingComponents / componentOptionMismatches / missing+extraResources) are pruned — an agent-facing shape with never-truthful fields is worse than a smaller shape. The error `message` names `skipRegistrationCheck` so agents can self-serve the escape hatch. Docs note precedence: on new bundles this eager check fires before `ReplayHandlerMissingError` would; the lazy error remains the guard for old bundles and skipped checks.

### 6. Corpus index pass-through (design-1, resolved open question)

`bundle-corpus-manifest.ts`'s `validateMetadata` builds a fresh object from known fields — it **silently strips** unknown ones (verified). Replay through the corpus is unaffected (loadBundle goes through FileSink's raw manifest preload), but `entry.metadata` would lose the field. `validateMetadata` gains `registration`: light shape check only (`isRecord` + `schemaVersion === 1`), copied through verbatim — the index stays a faithful projection without deep-validating a structure the replayer owns.

## Limitations (documented in the session-recording guide)

- Strict ordered-tuple system comparison flags a cross-phase registration reorder even when phase-sorting would yield identical execution order — deliberate: it enforces ADR 4's "same order" contract as written; the ordered name arrays + `skipRegistrationCheck` make it cheap to diagnose or bypass (design-2 acknowledgment).

- Manifest = **connect-time** registration; mid-recording registration is not captured (already outside ADR 4's reproducibility assumption). With §1's comparison scope this is purely a non-capture — it can no longer cause spurious rejections of faithful factories.
- Validator within-key order and all function bodies: count-only / uncovered.
- Missing components/options/resources self-heal via `applySnapshot` — that is why the check concentrates on systems/handlers/validators, and why ADR 16's pain lives there.

## Compatibility & versioning

Additive field + additive method + new error code on an existing class + optional flags on `ReplayerConfig`/`BundleViewerOptions` + internal `ResourceStore.registeredKeys()`. Non-breaking (c-bump). Old bundles: no field, no check. Old engines reading new bundles: replayer never enumerates metadata keys (verified); fork/diff equivalence ignores metadata (`metadataDeltas` excluded from `equivalent` per ADR 7); selfCheck compares state/events/executions only.

## Test plan

- Manifest construction per category; order preservation; options captured; destroyCallbackCount; ResourceStore key accessor.
- Round-trip: record → manifest in bundle → faithful factory passes (openAt + selfCheck + forkAt + viewer materialization).
- Strict-category mismatches each yield `registration_mismatch` with correct details, thrown at construction before stepping: missing/extra/reordered system (order arrays populated), system detail drift (interval change), missing/extra handler, validator count drift, destroyCallbackCount drift, positionKey drift.
- Snapshot-healed categories: factory missing a recorded component/resource replays **clean** (heal verified, no false positive); factory with a genuinely extra component (absent from manifest and snapshot) is flagged.
- Call-order independence: `selfCheck()`-first and `openAt(endTick)`-first produce identical outcomes on a bundle with a mid-recording-free manifest.
- Escape hatch on replayer AND viewer; absent-field bundles skip; scenario adapter passthrough + override; corpus `entry.metadata.registration` survives indexing.
