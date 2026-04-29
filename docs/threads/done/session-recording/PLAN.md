# Session Recording & Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the engine-level session-recording-and-replay primitives defined in `docs/threads/done/session-recording/DESIGN.md` (v5, converged after 4 multi-CLI review iterations).

**Architecture:** Adds `SessionRecorder` (captures live World runs into a `SessionBundle` via a `SessionSink`), `SessionReplayer` (loads bundles, opens paused worlds at any tick, runs three-stream `selfCheck()`), the bundle/marker/sink/source types, two sink implementations (`MemorySink`, `FileSink`), a `scenarioResultToBundle()` adapter, and an additive `captureCommandPayloads: true` option on `WorldHistoryRecorder`. v1 is opt-in, synchronous, and covers clean-tick replay only — replay across recorded `TickFailure` is out of scope (future spec extends `WorldSnapshot` to v6).

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+ (the project's `package.json:engines`). All new code follows the project's existing ESM + Node16 module-resolution conventions.

**Spec sections referenced throughout:** §-numbered references in this plan map 1:1 to sections in `docs/threads/done/session-recording/DESIGN.md`.

**Branch strategy:** All work on a single chained branch `agent/session-recording`, one commit per Task. Branch stays at the tip awaiting explicit user merge authorization per AGENTS.md. **Per-task multi-CLI review** lands before each commit (see "Per-task review pattern" below) — this is mandatory per AGENTS.md, not optional.

**Versioning:** Current version `0.7.6`. Each Task ships a `c`-bump (`0.7.7` through `0.7.15`). All additions are non-breaking; no `b`-bump expected.

---

## Per-task review and doc pattern (applies to every T1–T8)

Per `AGENTS.md`, every behavior/code change ships with both per-commit doc updates and a multi-CLI review BEFORE the commit lands. Each task therefore ends with these steps in order:

### A. Per-task documentation update (always in the same commit)

For every task T1–T8 that adds public surface, the same commit also updates:

- `docs/changelog.md` — version entry with what shipped, behavior callouts, validation.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full per-task entry.
- `docs/api-reference.md` — new sections for any new public types / methods (`AGENTS.md` mandatory rule for API-surface changes).
- `docs/guides/session-recording.md` — extend with the surface added (start as a stub in T2, expand each task; final shape lands at T9 cross-cutting).
- `docs/guides/scenario-runner.md` — extend in T4 + T7 (the two tasks that touch scenario integration).
- `package.json` — `c`-bump.

`README.md`, `ARCHITECTURE.md`, `decisions.md`, `drift-log.md`, `concepts.md`, `ai-integration.md`, `getting-started.md`, `building-a-game.md`, and `docs/README.md` are cross-cutting structural docs landed in T9 (their content depends on the full subsystem being in place).

### B. Per-task multi-CLI review (before commit)

After tests + impl + all four engine gates pass, but before the commit, follow the current AGENTS.md thread workflow. Use `docs/threads/current/session-recording-task-<n>/<date>/<iter>/REVIEW.md` while active, move the objective folder to `docs/threads/done/session-recording-task-<n>/` when closed, and keep each iteration directory summary-only. Temporary reviewer captures belong under `tmp/review-runs/session-recording-task-<n>/<date>/<iter>/` and are not staged. If a reviewer is unreachable, note it in the summary and devlog.

Task-specific prompts focus reviewers on the new slice (e.g., for T2: "Review the new `MemorySink` implementation and tests against the spec §5 + §8 contracts").

### C. Convergence rule

Iterate per-task review until both reviewers approve OR until 3 iterations have passed and remaining findings are nitpicks (per AGENTS.md "Continue iterating until reviewers nitpick instead of catching real bugs"). Then commit.

---

## Task 0 (Setup): preflight + shared helpers

Before T1 starts, this preflight extracts shared code that multiple tasks depend on, so they don't duplicate it (AGENTS.md anti-duplication rule).

**Files:**
- Modify: `src/json.ts` (export `cloneJsonValue` — currently duplicated as private in `history-recorder.ts:430` and `scenario-runner.ts:474`).
- Modify: `src/history-recorder.ts` (import from `./json.js` instead of local copy).
- Modify: `src/scenario-runner.ts` (same).
- Create: `src/version.ts` (`export const ENGINE_VERSION = '0.7.6' as const;` — the build/release process keeps this in sync with `package.json`'s `version`; T7 reads this for `metadata.engineVersion`).
- Create: `src/session-internals.ts` (declaration merge for `World.__payloadCapturingRecorder`).

### Step 0.1: Extract `cloneJsonValue` from history-recorder.ts to json.ts

In `src/json.ts`, add at the bottom:

```ts
export function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}
```

In `src/history-recorder.ts:430`, remove the local definition. Add to imports:

```ts
import { assertJsonCompatible, cloneJsonValue, type JsonValue } from './json.js';
```

In `src/scenario-runner.ts:474`, remove the local definition. Add to imports:

```ts
import { assertJsonCompatible, cloneJsonValue, type JsonValue } from './json.js';
```

### Step 0.2: Create `src/version.ts`

```ts
/**
 * Engine version, kept in sync with package.json's "version" field by the
 * release process. Read by SessionRecorder / scenarioResultToBundle for
 * metadata.engineVersion. Avoids relying on process.env.npm_package_version
 * (only set under `npm run`).
 */
export const ENGINE_VERSION = '0.7.6' as const;
```

(T7 / each version-bumping task increments this in lockstep with `package.json`.)

### Step 0.3: Create `src/session-internals.ts`

```ts
import type { SessionRecordingError } from './session-errors.js';

declare module './world.js' {
  interface World<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TComponents extends Record<string, unknown> = Record<string, unknown>,
    TState extends Record<string, unknown> = Record<string, unknown>,
  > {
    /**
     * Hidden slot tracking the single payload-capturing recorder attached to this
     * world. Set by SessionRecorder.connect() or WorldHistoryRecorder({
     * captureCommandPayloads: true }).connect(); cleared on disconnect(). Mutex
     * enforcement (one payload-capturing recorder per world) reads this.
     * Internal to civ-engine; callers MUST NOT touch it directly.
     */
    __payloadCapturingRecorder?: { sessionId: string; lastError: SessionRecordingError | null };
  }
}
```

### Step 0.4: Add three World API surfaces needed by T5/T6/T8

Three additive public methods needed downstream:

1. **Marker validation** in T5 (per spec §6.1) needs to verify that an `EntityRef` (id+generation) matches a live entity. The engine already exposes `World.isCurrent(ref: EntityRef): boolean` at `src/world.ts:383` — verify and reuse this rather than adding a duplicate. The plan's earlier sketches calling `world.isAliveAtGeneration(id, generation)` should be rewritten to `world.isCurrent({ id, generation })`.
2. **Replay handler-missing detection** in T6 (per spec §9.1 step 3b) needs `world.hasHandler(type)`. Not currently exposed. Add it.
3. **Worldfactory replay** in T8 needs to apply a snapshot to a world that already has registrations (since `World.deserialize(snap)` returns a fresh world without user registrations, and `registerComponent` / `registerHandler` would conflict with state already deserialized). Add `World.applySnapshot(snapshot)` instance method that overwrites entity/component/resource state in-place WITHOUT clearing registrations.

In `src/world.ts`:

```ts
// NEW: handler presence check (used by SessionReplayer.openAt)
hasHandler<K extends keyof TCommandMap>(type: K): boolean {
  return this.commandQueue.hasHandler(type as string);
}

// NEW: in-place snapshot application (used by worldFactory in T8)
// Overwrites entity/component/resource/state/RNG; preserves component/handler/validator/system registrations.
applySnapshot(snapshot: WorldSnapshot): void {
  // Reuse the existing deserialize logic against `this` rather than constructing a new World.
  // Implementation may extract the reconstruct-from-snapshot logic from World.deserialize into
  // a private helper that both call paths share; concrete approach decided during T0 implementation.
}
```

In `src/command-queue.ts`, add a public `hasHandler(type: string): boolean` method that reads the internal handler map. ~3 lines.

`World.isCurrent` already exists; do NOT add a duplicate `isAliveAtGeneration` method.

Add tests for both:

```ts
// in tests/world.test.ts (or a new tests/world-public-api.test.ts)
describe('World.hasHandler', () => {
  it('returns true for a registered handler', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    expect(world.hasHandler('spawn')).toBe(true);
  });
  it('returns false for an unregistered command type', () => {
    const world = mkWorld();
    expect(world.hasHandler('never-registered')).toBe(false);
  });
});

describe('World.applySnapshot', () => {
  it('overwrites entity/component state in-place; preserves registrations', () => {
    const w1 = mkWorld();
    w1.registerComponent('position');
    w1.registerHandler('spawn', () => ({ ok: true }));
    const id = w1.createEntity();
    w1.setComponent(id, 'position', { x: 5, y: 5 });

    const w2 = mkWorld();
    w2.registerComponent('position');
    w2.registerHandler('spawn', () => ({ ok: true }));
    expect(w2.hasHandler('spawn')).toBe(true);
    w2.applySnapshot(w1.serialize());
    // State copied
    expect(w2.getComponent(id, 'position')).toEqual({ x: 5, y: 5 });
    // Registrations preserved
    expect(w2.hasHandler('spawn')).toBe(true);
  });
});

describe('World.isCurrent (existing) + EntityRef matching', () => {
  it('returns true for a live entity matching its current generation', () => {
    const world = mkWorld();
    const id = world.createEntity();
    expect(world.isCurrent({ id, generation: 0 })).toBe(true);
  });
  it('returns false for a recycled id with a stale generation', () => {
    const world = mkWorld();
    const id = world.createEntity();
    world.destroyEntity(id);
    const recycled = world.createEntity();  // same numeric id, generation 1
    expect(world.isCurrent({ id: recycled, generation: 0 })).toBe(false);
    expect(world.isCurrent({ id: recycled, generation: 1 })).toBe(true);
  });
});
```

### Step 0.5: Verify all gates still pass after extraction

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

All four pass — `cloneJsonValue` extraction is a pure refactor; new World methods are additive.

### Step 0.6: Per-task review + commit (per the pattern above)

`refactor(engine): extract cloneJsonValue + add ENGINE_VERSION + WorldInternals + hasHandler/applySnapshot (v0.7.7-pre)`

(Note: this commit does NOT bump version since it's pure refactor + additive World methods that nothing else uses yet; T1 is the first version bump.)

---

## File Structure

### New files (created in this plan)

| Path | Responsibility | Created in Task |
| ---- | -------------- | --------------- |
| `src/session-bundle.ts` | All bundle-shape types: `SessionBundle`, `SessionMetadata`, `SessionTickEntry`, `SessionSnapshotEntry`, `AttachmentDescriptor`, `RecordedCommand`, `Marker`, `MarkerKind`, `MarkerProvenance`, `MarkerRefs`. Plus `scenarioResultToBundle()` adapter. | T1, T7 |
| `src/session-errors.ts` | `SessionRecordingError` base + subclasses (`MarkerValidationError`, `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`). | T1 |
| `src/session-sink.ts` | `SessionSink` and `SessionSource` interfaces + `MemorySink` impl. | T2 |
| `src/session-file-sink.ts` | `FileSink` (implements both `SessionSink` and `SessionSource`). | T3 |
| `src/session-recorder.ts` | `SessionRecorder` class with full lifecycle. | T5 |
| `src/session-replayer.ts` | `SessionReplayer` class with `openAt`, `tickEntriesBetween`, `stateAtTick`, marker queries, `selfCheck`. | T6 |
| `tests/session-bundle.test.ts` | Bundle/marker type round-trips; `assertJsonCompatible` validation; `EntityRef` validation. | T1 |
| `tests/session-errors.test.ts` | Error class `instanceof` discrimination + `details` shape. | T1 |
| `tests/memory-sink.test.ts` | MemorySink lifecycle, attachment policy, sidecar. | T2 |
| `tests/file-sink.test.ts` | FileSink layout, manifest cadence, atomic rename, recovery from incomplete bundles. | T3 |
| `tests/history-recorder-payloads.test.ts` | `captureCommandPayloads: true` mode capturing into `recordedCommands`. | T4 |
| `tests/session-recorder.test.ts` | Recorder lifecycle: construction → connect → per-tick → markers → disconnect → toBundle. | T5 |
| `tests/session-replayer.test.ts` | `openAt` correctness, range checks, snapshot fallback, scenario-bundle replay. | T6 |
| `tests/scenario-bundle.test.ts` | `scenarioResultToBundle()` produces correct metadata + assertion markers + handles missing payloads. | T7 |
| `tests/determinism-contract.test.ts` | Paired tests for §11.1 clauses 1–9 (clean + violating). | T8 |
| `docs/guides/session-recording.md` | New canonical guide: quickstart, sinks, markers, replay, selfCheck, full §11 contract with one example per clause. | T9 |

### Modified files

| Path | Modification | Tasks |
| ---- | ------------ | ----- |
| `src/index.ts` | Export new public types/classes/functions. | T1, T2, T3, T5, T6, T7 |
| `src/history-recorder.ts` | Add `captureCommandPayloads?: boolean` constructor option; add `recordedCommands?: RecordedCommand[]` to `WorldHistoryState`; install `submitWithResult` wrap when enabled; install/check the world's `__payloadCapturingRecorder` slot. | T4 |
| `tests/scenario-runner.test.ts` | Migrate existing scenarios to opt in (`captureCommandPayloads: true`); wrap each test's `result` with `scenarioResultToBundle` + `selfCheck`. | T8 |
| `package.json` | `c`-bump per commit (`0.7.7` … `0.7.15`). | every task |
| `docs/changelog.md` | Per-version entry per AGENTS.md mandatory discipline. | every task |
| `docs/devlog/summary.md` | One line per commit. | every task |
| `docs/devlog/detailed/<latest>.md` | Full per-task entry. | every task |
| `docs/api-reference.md` | New top-level sections per §14 list. | T9 |
| `docs/architecture/ARCHITECTURE.md` | Component-Map rows + Boundaries paragraph + tick-lifecycle ASCII. | T9 |
| `docs/architecture/decisions.md` | ADRs 1–4 per spec §15. | T9 |
| `docs/architecture/drift-log.md` | One row noting dual-recorder structure. | T9 |
| `docs/guides/scenario-runner.md` | New `scenarioResultToBundle()` section + `captureCommandPayloads` caveat. | T9 |
| `docs/guides/debugging.md` | Pointer to session-recording for replay-based debugging. | T9 |
| `docs/guides/concepts.md` | Add SessionRecorder/Replayer/Bundle/Sink/Source to standalone-utilities list. | T9 |
| `docs/guides/ai-integration.md` | New section on session recording as AI-debuggable foundation. | T9 |
| `docs/guides/getting-started.md` | Brief example of recording → bundle → replay. | T9 |
| `docs/guides/building-a-game.md` | "Recording sessions for debugging" section. | T9 |
| `README.md` | Feature overview + public-surface bullets. | T9 |
| `docs/README.md` | Index link to session-recording guide. | T9 |

---

## Task List

| #  | Task                                  | Version | Approx LOC | Tests |
| -- | ------------------------------------- | ------- | ---------- | ----- |
| T1 | Bundle types + errors                 | 0.7.7   | ~250 src + ~150 test | 8 |
| T2 | SessionSink/Source interface + MemorySink | 0.7.8 | ~200 src + ~250 test | 12 |
| T3 | FileSink                              | 0.7.9   | ~300 src + ~300 test | 14 |
| T4 | WorldHistoryRecorder.captureCommandPayloads | 0.7.10 | ~80 src + ~150 test | 8 |
| T5 | SessionRecorder                       | 0.7.11  | ~400 src + ~400 test | 18 |
| T6 | SessionReplayer + selfCheck           | 0.7.12  | ~350 src + ~350 test | 16 |
| T7 | scenarioResultToBundle adapter        | 0.7.13  | ~80 src + ~150 test | 8 |
| T8 | CI gate: existing scenarios + clause-paired tests | 0.7.14 | ~100 src changes + ~400 test | 22 |
| T9 | Doc surface + final integration       | 0.7.15  | doc-only | n/a |

Total: ~9 commits, ~1760 LOC src, ~2150 LOC tests, ~110 unit + integration tests.

---

## Setup (run once before T1)

- [ ] Create the working branch off main:

```bash
git checkout main
git pull --ff-only
git checkout -b agent/session-recording
```

- [ ] Verify the four engine gates pass on `main` before changing anything:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

All four must pass. If any fail on a clean checkout of `main`, stop and report — the plan assumes a green starting state.

---

## Task 1: Bundle types + errors (v0.7.7)

**Files:**
- Create: `src/session-bundle.ts` (types only; adapter function added in T7)
- Create: `src/session-errors.ts`
- Create: `tests/session-bundle.test.ts`
- Create: `tests/session-errors.test.ts`
- Modify: `src/index.ts`
- Modify: `package.json`
- Modify: `docs/changelog.md`, `docs/devlog/summary.md`, `docs/devlog/detailed/<latest>.md`

### Step 1.1: Write failing tests for `session-bundle.ts` types

Create `tests/session-bundle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assertJsonCompatible } from '../src/json.js';
import {
  type SessionBundle,
  type SessionMetadata,
  type Marker,
  type RecordedCommand,
  type AttachmentDescriptor,
  SESSION_BUNDLE_SCHEMA_VERSION,
} from '../src/session-bundle.js';

describe('SessionBundle types', () => {
  it('SESSION_BUNDLE_SCHEMA_VERSION is the literal 1', () => {
    expect(SESSION_BUNDLE_SCHEMA_VERSION).toBe(1);
  });

  it('a minimal SessionBundle is JSON-compatible', () => {
    const bundle: SessionBundle = {
      schemaVersion: 1,
      metadata: {
        sessionId: '00000000-0000-0000-0000-000000000000',
        engineVersion: '0.7.7',
        nodeVersion: 'v22.14.0',
        recordedAt: '2026-04-27T00:00:00.000Z',
        startTick: 0,
        endTick: 0,
        persistedEndTick: 0,
        durationTicks: 0,
        sourceKind: 'session',
      },
      initialSnapshot: {
        version: 5,
        config: { positionKey: 'position', maxTicksPerFrame: 5, instrumentationProfile: 'full' },
        tick: 0,
        entities: { generations: [], alive: [], freeList: [] },
        components: {},
        resources: { pools: {}, rates: {}, transfers: {} },
        rng: { state: '0' },
        state: {},
        tags: {},
        metadata: {},
      } as never, // simplified shape; real WorldSnapshot type from src/serializer.ts
      ticks: [],
      commands: [],
      executions: [],
      failures: [],
      snapshots: [],
      markers: [],
      attachments: [],
    };
    expect(() => assertJsonCompatible(bundle, 'session bundle round-trip')).not.toThrow();
    const round = JSON.parse(JSON.stringify(bundle));
    expect(round.schemaVersion).toBe(1);
    expect(round.metadata.sessionId).toBe(bundle.metadata.sessionId);
  });

  it('Marker accepts annotation/assertion/checkpoint kinds', () => {
    const m1: Marker = {
      id: 'a', tick: 0, kind: 'annotation', provenance: 'game',
    };
    const m2: Marker = {
      id: 'b', tick: 0, kind: 'assertion', provenance: 'engine',
      data: { passed: true, failure: null },
    };
    const m3: Marker = {
      id: 'c', tick: 0, kind: 'checkpoint', provenance: 'game',
      refs: { entities: [{ id: 1, generation: 0 }], cells: [{ x: 0, y: 0 }] },
    };
    expect(m1.kind).toBe('annotation');
    expect(m2.data).toEqual({ passed: true, failure: null });
    expect(m3.refs?.entities?.[0]).toEqual({ id: 1, generation: 0 });
  });

  it('RecordedCommand carries type, data, sequence, submissionTick, result', () => {
    const rc: RecordedCommand = {
      type: 'spawn',
      data: { x: 1, y: 2 },
      sequence: 1,
      submissionTick: 5,
      result: {
        schemaVersion: 1,
        accepted: true,
        commandType: 'spawn',
        code: 'ok',
        message: '',
        details: null,
        tick: 5,
        sequence: 1,
        validatorIndex: null,
      } as never,
    };
    expect(rc.type).toBe('spawn');
    expect(rc.submissionTick).toBe(5);
  });

  it('AttachmentDescriptor accepts dataUrl and sidecar refs', () => {
    const a1: AttachmentDescriptor = { id: 'x', mime: 'image/png', sizeBytes: 100, ref: { dataUrl: 'data:image/png;base64,...' } };
    const a2: AttachmentDescriptor = { id: 'y', mime: 'image/png', sizeBytes: 65537, ref: { sidecar: true } };
    expect(a1.ref).toHaveProperty('dataUrl');
    expect(a2.ref).toHaveProperty('sidecar', true);
  });

  it('SessionMetadata records engine + node + persisted-end-tick', () => {
    const md: SessionMetadata = {
      sessionId: 'abc', engineVersion: '0.7.7', nodeVersion: 'v22',
      recordedAt: '2026-04-27T00:00:00Z',
      startTick: 0, endTick: 100, persistedEndTick: 100, durationTicks: 100,
      sourceKind: 'session',
    };
    expect(md.persistedEndTick).toBe(md.endTick);
  });
});
```

- [ ] Run test, expect failure (file does not exist):

```bash
npm test -- session-bundle.test.ts
```

Expected: tsc / vitest error "Cannot find module '../src/session-bundle.js'".

### Step 1.2: Write `src/session-bundle.ts`

Create `src/session-bundle.ts`:

```ts
import type { TickDiff } from './diff.js';
import type { JsonValue } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type { Position } from './types.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  TickFailure,
  WorldMetrics,
} from './world.js';

export const SESSION_BUNDLE_SCHEMA_VERSION = 1 as const;

export type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
export type MarkerProvenance = 'engine' | 'game';

export interface EntityRef {
  id: number;
  generation: number;
}

export interface MarkerRefs {
  entities?: EntityRef[];
  cells?: Position[];
  tickRange?: { from: number; to: number };
}

export interface Marker {
  id: string;
  tick: number;
  kind: MarkerKind;
  provenance: MarkerProvenance;
  text?: string;
  refs?: MarkerRefs;
  data?: JsonValue;
  attachments?: string[];
  createdAt?: string;
  validated?: false;
}

export interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;
  sequence: number;
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;
}

export interface SessionTickEntry<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  tick: number;
  diff: TickDiff;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}

export interface SessionSnapshotEntry {
  tick: number;
  snapshot: WorldSnapshot;
}

export interface AttachmentDescriptor {
  id: string;
  mime: string;
  sizeBytes: number;
  ref: { dataUrl: string } | { sidecar: true };
}

export interface SessionMetadata {
  sessionId: string;
  engineVersion: string;
  nodeVersion: string;
  recordedAt: string;
  startTick: number;
  endTick: number;
  persistedEndTick: number;
  durationTicks: number;
  sourceKind: 'session' | 'scenario';
  sourceLabel?: string;
  incomplete?: true;
  failedTicks?: number[];
}

export interface SessionBundle<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];
  executions: CommandExecutionResult<keyof TCommandMap>[];
  failures: TickFailure[];
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}
```

### Step 1.3: Write failing tests for `session-errors.ts`

Create `tests/session-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  SessionRecordingError,
  MarkerValidationError,
  RecorderClosedError,
  SinkWriteError,
  BundleVersionError,
  BundleRangeError,
  BundleIntegrityError,
  ReplayHandlerMissingError,
} from '../src/session-errors.js';

describe('SessionRecordingError hierarchy', () => {
  it('all subclasses extend SessionRecordingError', () => {
    expect(new MarkerValidationError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new RecorderClosedError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new SinkWriteError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleVersionError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleRangeError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleIntegrityError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new ReplayHandlerMissingError('m')).toBeInstanceOf(SessionRecordingError);
  });

  it('subclasses are not interchangeable via instanceof', () => {
    expect(new MarkerValidationError('m')).not.toBeInstanceOf(SinkWriteError);
    expect(new RecorderClosedError('m')).not.toBeInstanceOf(BundleVersionError);
  });

  it('errors carry name + message', () => {
    const e = new BundleRangeError('tick out of range', { code: 'too_high', tick: 1000 });
    expect(e.name).toBe('BundleRangeError');
    expect(e.message).toBe('tick out of range');
    expect(e.details).toEqual({ code: 'too_high', tick: 1000 });
  });

  it('details defaults to undefined', () => {
    const e = new MarkerValidationError('bad marker');
    expect(e.details).toBeUndefined();
  });

  it('RecorderClosedError supports a code field', () => {
    const e = new RecorderClosedError('poisoned', { code: 'world_poisoned' });
    expect(e.details).toEqual({ code: 'world_poisoned' });
  });
});
```

- [ ] Run test, expect failure (file does not exist):

```bash
npm test -- session-errors.test.ts
```

### Step 1.4: Write `src/session-errors.ts`

```ts
import type { JsonValue } from './json.js';

export class SessionRecordingError extends Error {
  readonly details: JsonValue | undefined;
  constructor(message: string, details?: JsonValue) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class MarkerValidationError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class RecorderClosedError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class SinkWriteError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class BundleVersionError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class BundleRangeError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class BundleIntegrityError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
export class ReplayHandlerMissingError extends SessionRecordingError {
  constructor(message: string, details?: JsonValue) { super(message, details); }
}
```

### Step 1.5: Update `src/index.ts` to export new types

Add to `src/index.ts` (preserve existing exports; add a `// session-recording (T1)` comment block):

```ts
// session-recording (T1)
export {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type SessionBundle,
  type SessionMetadata,
  type SessionTickEntry,
  type SessionSnapshotEntry,
  type AttachmentDescriptor,
  type RecordedCommand,
  type Marker,
  type MarkerKind,
  type MarkerProvenance,
  type MarkerRefs,
  type EntityRef,
} from './session-bundle.js';
export {
  SessionRecordingError,
  MarkerValidationError,
  RecorderClosedError,
  SinkWriteError,
  BundleVersionError,
  BundleRangeError,
  BundleIntegrityError,
  ReplayHandlerMissingError,
} from './session-errors.js';
```

### Step 1.6: Run full test suite + typecheck + lint + build

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

All four must pass.

### Step 1.7: Bump version + update docs

Edit `package.json`: change `"version": "0.7.6"` to `"version": "0.7.7"`.

Add to `docs/changelog.md` (top, under any `## Unreleased`):

```markdown
## v0.7.7 (2026-04-27)

Added session-recording bundle and error types (`SessionBundle`, `Marker`, `RecordedCommand`, `SessionMetadata`, `AttachmentDescriptor`, `EntityRef`, `MarkerRefs`, plus `SessionRecordingError` hierarchy with seven subclasses). Types only; no runtime behavior. Foundation for `SessionRecorder`/`SessionReplayer` (next commits). See `docs/threads/done/session-recording/DESIGN.md` §5, §6, §12.
```

Add to `docs/devlog/summary.md` (one new line):

```markdown
- 2026-04-27: Session-recording T1 (v0.7.7) — bundle/marker/error type definitions; ~250 LOC src, ~150 LOC test, 8 new tests.
```

Add a detailed devlog entry to `docs/devlog/detailed/<latest>.md` (find the latest `START_END.md` in that folder):

```markdown
### 2026-04-27 — Session-recording T1: bundle types + errors (v0.7.7)

**Action:** Created `src/session-bundle.ts` (types: SessionBundle, SessionMetadata, SessionTickEntry, SessionSnapshotEntry, AttachmentDescriptor, RecordedCommand, Marker, MarkerKind, MarkerProvenance, MarkerRefs, EntityRef) and `src/session-errors.ts` (SessionRecordingError + 7 subclasses). Added `tests/session-bundle.test.ts` and `tests/session-errors.test.ts` (8 tests total). Updated `src/index.ts` exports.

**Reasoning:** First commit of the chain. Pure type definitions + error classes; no runtime behavior. Foundation for the rest of the chain. Types only is intentionally small to keep the chain reviewable per AGENTS.md "as soon as you have a coherent, self-contained unit of change."

**Result:** All four gates pass; new tests verify JSON-compatibility, hierarchy `instanceof`, error `details` shape.
```

### Step 1.8: Commit

```bash
git add src/session-bundle.ts src/session-errors.ts src/index.ts \
        tests/session-bundle.test.ts tests/session-errors.test.ts \
        package.json docs/changelog.md docs/devlog/summary.md \
        docs/devlog/detailed/*.md
git commit -m "feat(session-recording): bundle types + error hierarchy (v0.7.7)

Types only (no runtime behavior). Foundation for SessionRecorder /
SessionReplayer in subsequent commits.

- src/session-bundle.ts: SessionBundle, SessionMetadata, Marker,
  RecordedCommand, AttachmentDescriptor, EntityRef, MarkerRefs +
  schema-version constant.
- src/session-errors.ts: SessionRecordingError base + 7 subclasses.
- src/index.ts: public exports.
- tests/session-bundle.test.ts + tests/session-errors.test.ts (8
  tests, all gates pass).

See docs/threads/done/session-recording/DESIGN.md
§5, §6, §12.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: SessionSink/Source interface + MemorySink (v0.7.8)

**Files:**
- Create: `src/session-sink.ts`
- Create: `tests/memory-sink.test.ts`
- Modify: `src/index.ts`, `package.json`, changelog/devlog

### Step 2.1: Write failing tests

Create `tests/memory-sink.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemorySink, type SessionMetadata } from '../src/index.js';

const mkMetadata = (): SessionMetadata => ({
  sessionId: '00000000-0000-0000-0000-000000000000',
  engineVersion: '0.7.8',
  nodeVersion: 'v22.0.0',
  recordedAt: '2026-04-27T00:00:00Z',
  startTick: 0, endTick: 0, persistedEndTick: 0, durationTicks: 0,
  sourceKind: 'session',
});

const mkSnapshot = (tick: number) => ({ version: 5, tick, config: {}, entities: {}, components: {}, resources: {}, rng: { state: '0' }, state: {}, tags: {}, metadata: {} } as never);

describe('MemorySink', () => {
  it('toBundle() throws when no snapshots have been written', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    expect(() => sink.toBundle()).toThrow(/snapshot/);
  });

  it('open() + writeSnapshot() + toBundle() produces a bundle with that snapshot as initialSnapshot', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const bundle = sink.toBundle();
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.metadata.sessionId).toBe('00000000-0000-0000-0000-000000000000');
    expect((bundle.initialSnapshot as { tick: number }).tick).toBe(0);
    expect(bundle.ticks).toEqual([]);
    expect(bundle.commands).toEqual([]);
    expect(bundle.snapshots).toEqual([]);  // first snapshot consumed as initialSnapshot
  });

  it('writeMarker accumulates markers in the bundle', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });        // required for toBundle()
    sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game', text: 'hi' });
    sink.writeMarker({ id: 'b', tick: 1, kind: 'checkpoint', provenance: 'game' });
    const bundle = sink.toBundle();
    expect(bundle.markers).toHaveLength(2);
    expect(bundle.markers[0].text).toBe('hi');
    expect(bundle.markers[1].kind).toBe('checkpoint');
  });

  it('writeAttachment under 64 KiB stores as dataUrl by default', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    const data = new Uint8Array([1, 2, 3, 4]);
    const desc = sink.writeAttachment(
      { id: 'x', mime: 'image/png', sizeBytes: 4, ref: { dataUrl: '' } },
      data,
    );
    expect('dataUrl' in desc.ref).toBe(true);
    if ('dataUrl' in desc.ref) {
      expect(desc.ref.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    }
  });

  it('writeAttachment over 64 KiB without sidecar opt-in throws SinkWriteError', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    const huge = new Uint8Array(65537);
    expect(() => sink.writeAttachment(
      { id: 'x', mime: 'application/octet-stream', sizeBytes: huge.byteLength, ref: { dataUrl: '' } },
      huge,
    )).toThrow(/sidecar/);
  });

  it('writeAttachment over 64 KiB with sidecar opt-in stores as sidecar; readSidecar retrieves bytes', () => {
    const sink = new MemorySink({ allowSidecar: true });
    sink.open(mkMetadata());
    const huge = new Uint8Array(65537);
    huge[0] = 99;
    const desc = sink.writeAttachment(
      { id: 'x', mime: 'application/octet-stream', sizeBytes: huge.byteLength, ref: { sidecar: true } },
      huge,
    );
    expect(desc.ref).toEqual({ sidecar: true });
    const recovered = sink.readSidecar('x');
    expect(recovered.byteLength).toBe(65537);
    expect(recovered[0]).toBe(99);
  });

  it('writeTick / writeCommand / writeSnapshot accumulate in order; subsequent snapshots populate snapshots[]', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });        // becomes initialSnapshot
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    sink.writeCommand({
      type: 'spawn', data: {}, sequence: 1, submissionTick: 1,
      result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'ok',
        message: '', details: null, tick: 1, sequence: 1, validatorIndex: null } as never,
    });
    sink.writeSnapshot({ tick: 2, snapshot: mkSnapshot(2) });        // becomes snapshots[0]
    const bundle = sink.toBundle();
    expect(bundle.ticks).toHaveLength(2);
    expect(bundle.ticks[0].tick).toBe(1);
    expect(bundle.commands).toHaveLength(1);
    expect(bundle.snapshots).toHaveLength(1);
    expect(bundle.snapshots[0].tick).toBe(2);
  });

  it('close() advances persistedEndTick on the metadata to last snapshot tick', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 100, snapshot: mkSnapshot(100) });
    sink.writeSnapshot({ tick: 200, snapshot: mkSnapshot(200) });
    sink.close();
    const bundle = sink.toBundle();
    expect(bundle.metadata.persistedEndTick).toBe(200);
  });

  it('toBundle() is JSON-stringify-roundtrippable', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });        // required for toBundle()
    sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game' });
    const bundle = sink.toBundle();
    const round = JSON.parse(JSON.stringify(bundle));
    expect(round.markers[0].id).toBe('a');
  });

  it('SessionSource.ticks() yields ticks in write order', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    expect([...sink.ticks()].map(t => t.tick)).toEqual([1, 2]);
  });

  it('writeAttachment forces sidecar via { sidecar: true } even under cap', () => {
    const sink = new MemorySink({ allowSidecar: true });
    sink.open(mkMetadata());
    const desc = sink.writeAttachment(
      { id: 'x', mime: 'image/png', sizeBytes: 4, ref: { sidecar: true } },
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(desc.ref).toEqual({ sidecar: true });
    expect(sink.readSidecar('x').byteLength).toBe(4);
  });

  it('readSidecar throws on unknown id', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    expect(() => sink.readSidecar('missing')).toThrow();
  });

  it('writeMarker after close throws', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.close();
    expect(() => sink.writeMarker({ id: 'a', tick: 0, kind: 'annotation', provenance: 'game' })).toThrow();
  });
});
```

- [ ] Run test, expect failure: `npm test -- memory-sink.test.ts`. Expected: "Cannot find module".

### Step 2.2: Write `src/session-sink.ts`

```ts
import type { TickFailure, CommandExecutionResult } from './world.js';
import { assertJsonCompatible } from './json.js';
import type {
  AttachmentDescriptor,
  Marker,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import { SinkWriteError } from './session-errors.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import type { WorldSnapshot } from './serializer.js';

export interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor;
  close(): void;
}

export interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  toBundle(): SessionBundle;
}

const SIDECAR_THRESHOLD_BYTES = 64 * 1024;

export interface MemorySinkOptions {
  allowSidecar?: boolean; // default false
  sidecarThresholdBytes?: number; // default 65536
}

export class MemorySink implements SessionSink, SessionSource {
  private _metadata: SessionMetadata | null = null;
  private readonly _ticks: SessionTickEntry[] = [];
  private readonly _commands: RecordedCommand[] = [];
  private readonly _executions: CommandExecutionResult[] = [];
  private readonly _failures: TickFailure[] = [];
  private readonly _snapshots: SessionSnapshotEntry[] = [];
  private readonly _markers: Marker[] = [];
  private readonly _attachments: AttachmentDescriptor[] = [];
  private readonly _sidecars = new Map<string, Uint8Array>();
  private readonly _allowSidecar: boolean;
  private readonly _threshold: number;
  private _closed = false;

  constructor(options?: MemorySinkOptions) {
    this._allowSidecar = options?.allowSidecar ?? false;
    this._threshold = options?.sidecarThresholdBytes ?? SIDECAR_THRESHOLD_BYTES;
  }

  get metadata(): SessionMetadata {
    if (!this._metadata) throw new SinkWriteError('sink not opened');
    return this._metadata;
  }

  open(metadata: SessionMetadata): void {
    if (this._closed) throw new SinkWriteError('sink already closed');
    this._metadata = { ...metadata };
  }

  private assertOpen(): void {
    if (!this._metadata) throw new SinkWriteError('sink not opened');
    if (this._closed) throw new SinkWriteError('sink already closed');
  }

  writeTick(entry: SessionTickEntry): void {
    this.assertOpen();
    assertJsonCompatible(entry, 'session tick entry');
    this._ticks.push(entry);
  }
  writeCommand(record: RecordedCommand): void {
    this.assertOpen();
    assertJsonCompatible(record, 'recorded command');
    this._commands.push(record);
  }
  writeCommandExecution(result: CommandExecutionResult): void {
    this.assertOpen();
    assertJsonCompatible(result, 'command execution result');
    this._executions.push(result);
  }
  writeTickFailure(failure: TickFailure): void {
    this.assertOpen();
    assertJsonCompatible(failure, 'tick failure');
    this._failures.push(failure);
    if (this._metadata) {
      this._metadata.failedTicks = [...(this._metadata.failedTicks ?? []), failure.tick];
    }
  }
  writeSnapshot(entry: SessionSnapshotEntry): void {
    this.assertOpen();
    assertJsonCompatible(entry, 'snapshot entry');
    this._snapshots.push(entry);
    if (this._metadata) this._metadata.persistedEndTick = entry.tick;
  }
  writeMarker(marker: Marker): void {
    this.assertOpen();
    assertJsonCompatible(marker, 'marker');
    this._markers.push(marker);
  }

  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor {
    this.assertOpen();
    const oversized = data.byteLength > this._threshold;
    const wantsSidecar = 'sidecar' in descriptor.ref;
    if (oversized && !this._allowSidecar) {
      throw new SinkWriteError(
        `attachment ${descriptor.id} (${data.byteLength} bytes) exceeds threshold ` +
        `${this._threshold} and sidecar is not enabled`,
        { code: 'oversize_attachment', sizeBytes: data.byteLength, threshold: this._threshold },
      );
    }
    if (wantsSidecar || oversized) {
      this._sidecars.set(descriptor.id, new Uint8Array(data));
      const final: AttachmentDescriptor = { ...descriptor, ref: { sidecar: true } };
      this._attachments.push(final);
      return final;
    }
    const b64 = Buffer.from(data).toString('base64');
    const final: AttachmentDescriptor = { ...descriptor, ref: { dataUrl: `data:${descriptor.mime};base64,${b64}` } };
    this._attachments.push(final);
    return final;
  }

  close(): void {
    if (this._closed) return;
    this._closed = true;
  }

  // SessionSource methods
  readSnapshot(tick: number): WorldSnapshot {
    const found = this._snapshots.find((s) => s.tick === tick);
    if (!found) throw new SinkWriteError(`snapshot at tick ${tick} not found`);
    return found.snapshot;
  }
  readSidecar(id: string): Uint8Array {
    const found = this._sidecars.get(id);
    if (!found) throw new SinkWriteError(`sidecar ${id} not found`);
    return new Uint8Array(found);
  }
  *ticks(): IterableIterator<SessionTickEntry> { for (const t of this._ticks) yield t; }
  *commands(): IterableIterator<RecordedCommand> { for (const c of this._commands) yield c; }
  *executions(): IterableIterator<CommandExecutionResult> { for (const e of this._executions) yield e; }
  *failures(): IterableIterator<TickFailure> { for (const f of this._failures) yield f; }
  *markers(): IterableIterator<Marker> { for (const m of this._markers) yield m; }
  *attachments(): IterableIterator<AttachmentDescriptor> { for (const a of this._attachments) yield a; }

  toBundle(): SessionBundle {
    if (!this._metadata) throw new SinkWriteError('sink not opened');
    if (this._snapshots.length === 0) {
      throw new SinkWriteError('no snapshots written; cannot build bundle');
    }
    return {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: { ...this._metadata },
      initialSnapshot: this._snapshots[0].snapshot,
      ticks: this._ticks.slice(),
      commands: this._commands.slice(),
      executions: this._executions.slice(),
      failures: this._failures.slice(),
      snapshots: this._snapshots.slice(1),
      markers: this._markers.slice(),
      attachments: this._attachments.slice(),
    };
  }
}
```

- [ ] Run tests; all pass: `npm test -- memory-sink.test.ts`.

### Step 2.3: Update `src/index.ts`

```ts
// session-recording (T2)
export { type SessionSink, type SessionSource, MemorySink, type MemorySinkOptions } from './session-sink.js';
```

### Step 2.4: Run all gates

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

### Step 2.5: Bump + docs + commit

`package.json` → `0.7.8`. Add `## v0.7.8` changelog entry. Add devlog summary line + detailed entry.

```bash
git add src/session-sink.ts src/index.ts tests/memory-sink.test.ts package.json docs/changelog.md docs/devlog/summary.md docs/devlog/detailed/*.md
git commit -m "feat(session-recording): SessionSink/Source interface + MemorySink (v0.7.8)

- src/session-sink.ts: SessionSink (write) + SessionSource (read)
  interfaces; MemorySink implementing both.
- 12 tests covering open/close lifecycle, marker/tick/snapshot
  accumulation, attachment dataUrl/sidecar policy, JSON round-trip.

See spec §8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: FileSink (v0.7.9)

**Files:**
- Create: `src/session-file-sink.ts`
- Create: `tests/file-sink.test.ts` (uses Node's `fs` + `os.tmpdir()`)
- Modify: `src/index.ts`, `package.json`, changelog/devlog

### Step 3.1: Write failing tests

Create `tests/file-sink.test.ts` with tests covering:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSink, type SessionMetadata } from '../src/index.js';

const mkMetadata = (): SessionMetadata => ({
  sessionId: '00000000-0000-0000-0000-000000000000',
  engineVersion: '0.7.9', nodeVersion: 'v22.0.0',
  recordedAt: '2026-04-27T00:00:00Z',
  startTick: 0, endTick: 0, persistedEndTick: 0, durationTicks: 0,
  sourceKind: 'session',
});

describe('FileSink', () => {
  let bundleDir: string;
  beforeEach(() => { bundleDir = mkdtempSync(join(tmpdir(), 'civ-engine-bundle-')); });
  afterEach(() => { rmSync(bundleDir, { recursive: true, force: true }); });

  it('open() creates the directory layout (manifest, jsonl streams, snapshots/, attachments/)', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.close();
    expect(existsSync(join(bundleDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(bundleDir, 'ticks.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'commands.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'executions.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'failures.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'markers.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'snapshots'))).toBe(true);
    expect(existsSync(join(bundleDir, 'attachments'))).toBe(true);
  });

  it('writeSnapshot persists JSON to snapshots/<tick>.json and advances persistedEndTick in manifest', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 100, snapshot: { version: 5, tick: 100 } as never });
    const onDisk = JSON.parse(readFileSync(join(bundleDir, 'snapshots', '100.json'), 'utf-8'));
    expect(onDisk.tick).toBe(100);
    const manifest = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    expect(manifest.metadata.persistedEndTick).toBe(100);
    sink.close();
  });

  it('manifest is rewritten atomically via .tmp.json rename on snapshot writes', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 50, snapshot: { tick: 50 } as never });
    expect(existsSync(join(bundleDir, 'manifest.tmp.json'))).toBe(false);
    sink.close();
  });

  it('writeAttachment defaults to sidecar (FileSink is disk-backed; spec §7.1 step 5)', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeAttachment(
      { id: 'small', mime: 'image/png', sizeBytes: 5, ref: { sidecar: true } },
      new Uint8Array([1, 2, 3, 4, 5]),
    );
    sink.close();
    expect(existsSync(join(bundleDir, 'attachments', 'small.png'))).toBe(true);
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'small');
    expect(a.ref).toEqual({ sidecar: true });
  });

  it('writeAttachment with explicit { sidecar: false } embeds as dataUrl in manifest', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeAttachment(
      // The descriptor's ref signals the desired policy. dataUrl payload
      // populated by the sink. (Caller passes a placeholder; sink rewrites.)
      { id: 'tiny', mime: 'text/plain', sizeBytes: 5, ref: { dataUrl: '' } },
      new Uint8Array([104, 101, 108, 108, 111]),
    );
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'tiny');
    expect(a.ref).toHaveProperty('dataUrl');
    expect(a.ref.dataUrl).toMatch(/^data:text\/plain;base64,/);
  });

  it('MIME → file extension mapping for sidecar attachments', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    const cases = [
      { id: 'a1', mime: 'image/png', ext: '.png' },
      { id: 'a2', mime: 'image/jpeg', ext: '.jpg' },
      { id: 'a3', mime: 'application/json', ext: '.json' },
      { id: 'a4', mime: 'application/octet-stream', ext: '.bin' },
      { id: 'a5', mime: 'text/plain', ext: '.txt' },
      { id: 'a6', mime: 'application/x-custom', ext: '.bin' },  // fallback
    ];
    for (const c of cases) {
      sink.writeAttachment(
        { id: c.id, mime: c.mime, sizeBytes: 4, ref: { sidecar: true } },
        new Uint8Array([1, 2, 3, 4]),
      );
    }
    sink.close();
    for (const c of cases) {
      expect(existsSync(join(bundleDir, 'attachments', `${c.id}${c.ext}`))).toBe(true);
    }
  });

  // ... add 9 more tests covering: writeTick → ticks.jsonl, writeCommand → commands.jsonl,
  // writeMarker → markers.jsonl, close() rewrites manifest with endTick/durationTicks,
  // SessionSource: reading back ticks(), commands(), markers(), readSnapshot(), readSidecar(),
  // recovery: open existing dir with incomplete:true manifest (do not re-init), incomplete bundle prefix,
  // toBundle() reads from disk and produces same shape as MemorySink.
});
```

### Step 3.2: Write `src/session-file-sink.ts`

(Implementation skeleton — fill in per spec §5.2 + §8 with `fs.writeFileSync`/`appendFileSync`/`renameSync` for atomic manifest + JSONL append-only + snapshot/attachment file persistence. ~300 LOC. Mirror MemorySink's API surface; differ only in persistence strategy.)

The implementation:

- Constructor accepts `bundleDir: string` and optional `MemorySinkOptions`-shaped config.
- `open(metadata)`: creates the directory if missing; creates `manifest.json` (atomic write via `.tmp.json` rename); touches the five `.jsonl` files (creates if missing); creates `snapshots/` and `attachments/` subdirs.
- Each `writeX` appends a JSON-stringified line to the corresponding `.jsonl` (with `\n` terminator).
- `writeSnapshot` writes `snapshots/<tick>.json` and rewrites the manifest (`metadata.persistedEndTick = tick` + atomic rename).
- `writeAttachment`: **FileSink defaults to sidecar unconditionally** (per spec §7.1 step 5). If the caller passes `descriptor.ref = { dataUrl: ... }` (any value; the field's presence is the opt-in signal), embed as dataUrl in the manifest. Otherwise write bytes to `attachments/<id>.<ext>` and append the sidecar-ref descriptor to the manifest's attachments index. There is NO threshold-based branching on FileSink — disk-backed sinks default to disk-backed storage. The threshold-based logic is MemorySink-specific (per Step 2.2).
- `close()`: rewrites manifest with final `metadata.endTick`/`durationTicks`/optional `incomplete: true`.
- SessionSource reads: stream JSONL via `readline` (or sync `fs.readFileSync` + split on `\n` for v1 simplicity); `readSnapshot` reads the file; `readSidecar` reads from `attachments/`.

**Key invariants** (must be preserved by impl):
- Manifest atomic-rename via `manifest.tmp.json` → `manifest.json` (`fs.writeFileSync` then `fs.renameSync`).
- JSONL files append-only; never rewrite.
- Per-tick manifest rewrites are NOT performed (§5.2).

### Step 3.3: Update `src/index.ts`

```ts
// session-recording (T3)
export { FileSink } from './session-file-sink.js';
```

### Step 3.4: Gates + bump + docs + commit

Same pattern as T1/T2. Commit message: `feat(session-recording): FileSink (v0.7.9)`.

---

## Task 4: WorldHistoryRecorder.captureCommandPayloads + scenario plumbing (v0.7.10)

**Files:**
- Modify: `src/history-recorder.ts` (~100 LOC change: option, recordedCommands field, wrap install/uninstall, clear() reset)
- Modify: `src/scenario-runner.ts` (extend `ScenarioConfig.history` to include `captureCommandPayloads?: boolean`; thread into `new WorldHistoryRecorder({...})`)
- Create: `tests/history-recorder-payloads.test.ts`
- Modify: `src/index.ts`, `package.json`, changelog/devlog/api-reference/scenario-runner.md (per per-task doc pattern)

**Test helper:** all T4+ tests use a shared `mkWorld()` helper to avoid per-test `WorldConfig` boilerplate. Define once in `tests/test-utils.ts`:

```ts
import { World, type WorldConfig } from '../src/index.js';
export function mkWorld(config?: Partial<WorldConfig>) {
  return new World({
    positionKey: 'position',
    maxTicksPerFrame: 5,
    instrumentationProfile: 'minimal',
    ...config,
  });
}
```

### Step 4.1: Write failing tests

Create `tests/history-recorder-payloads.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { World, WorldHistoryRecorder } from '../src/index.js';
import type { RecordedCommand } from '../src/index.js';

describe('WorldHistoryRecorder.captureCommandPayloads', () => {
  it('default config: recordedCommands is undefined; commands is CommandSubmissionResult[]', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec = new WorldHistoryRecorder({ world });
    rec.connect();
    world.submit('spawn', { x: 1, y: 2 });
    world.step();
    const state = rec.getState();
    expect((state as { recordedCommands?: unknown[] }).recordedCommands).toBeUndefined();
    expect(state.commands).toHaveLength(1);
    rec.disconnect();
  });

  it('captureCommandPayloads:true populates recordedCommands with full payload', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec.connect();
    world.submit('spawn', { x: 1, y: 2 });
    world.submit('spawn', { x: 3, y: 4 });
    world.step();
    const state = rec.getState();
    const recorded = (state as { recordedCommands: RecordedCommand[] }).recordedCommands;
    expect(recorded).toHaveLength(2);
    expect(recorded[0].type).toBe('spawn');
    expect(recorded[0].data).toEqual({ x: 1, y: 2 });
    expect(recorded[1].data).toEqual({ x: 3, y: 4 });
    rec.disconnect();
  });

  it('two recorders with captureCommandPayloads:true cannot coexist on same world', () => {
    const world = mkWorld();
    const rec1 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    const rec2 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    expect(() => rec2.connect()).toThrow(/recorder_already_attached/);
    rec1.disconnect();
  });

  it('default-config recorder + payload-capturing recorder coexist', () => {
    const world = mkWorld();
    const rec1 = new WorldHistoryRecorder({ world });            // default
    const rec2 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    rec2.connect();
    expect(rec1.getState().commands).toBeDefined();
    expect((rec2.getState() as { recordedCommands: unknown[] }).recordedCommands).toBeDefined();
    rec1.disconnect();
    rec2.disconnect();
  });

  it('disconnect unwraps submitWithResult so subsequent recorders see clean delegation', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec1 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    rec1.disconnect();
    // Behavioral check: after disconnect, the slot is cleared and a submission
    // post-disconnect doesn't appear in rec1's recordedCommands. Avoids brittle
    // .toString() comparison.
    expect((world as { __payloadCapturingRecorder?: unknown }).__payloadCapturingRecorder).toBeUndefined();
    world.submit('spawn', { afterDisconnect: true });
    const recorded = (rec1.getState() as { recordedCommands?: RecordedCommand[] }).recordedCommands ?? [];
    expect(recorded.find((rc) => (rc.data as { afterDisconnect?: boolean })?.afterDisconnect)).toBeUndefined();
  });

  it('submit() and submitWithResult() both captured (single wrap on submitWithResult)', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec.connect();
    world.submit('spawn', { via: 'submit' });
    world.submitWithResult('spawn', { via: 'submitWithResult' });
    const recorded = (rec.getState() as { recordedCommands: RecordedCommand[] }).recordedCommands;
    expect(recorded).toHaveLength(2);
    expect(recorded[0].data).toEqual({ via: 'submit' });
    expect(recorded[1].data).toEqual({ via: 'submitWithResult' });
    rec.disconnect();
  });

  it('clear() resets recordedCommands (so post-setup scenario rebase is clean)', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec.connect();
    world.submit('spawn', { phase: 'setup' });
    world.step();
    expect((rec.getState() as { recordedCommands: RecordedCommand[] }).recordedCommands).toHaveLength(1);
    rec.clear();
    expect((rec.getState() as { recordedCommands: RecordedCommand[] }).recordedCommands).toHaveLength(0);
    world.submit('spawn', { phase: 'run' });
    world.step();
    const after = (rec.getState() as { recordedCommands: RecordedCommand[] }).recordedCommands;
    expect(after).toHaveLength(1);
    expect((after[0].data as { phase: string }).phase).toBe('run');
    rec.disconnect();
  });

  it('runScenario({ history: { captureCommandPayloads: true } }) threads the option through', () => {
    // Verifies T4's scenario-runner.ts plumbing — ScenarioConfig.history.captureCommandPayloads
    // is forwarded to the internal WorldHistoryRecorder.
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const result = runScenario({
      name: 't4-thread-test',
      world,
      setup: () => {},
      run: (ctx) => { ctx.submit('spawn', { x: 1 }); },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const recorded = (result.history as { recordedCommands?: RecordedCommand[] }).recordedCommands;
    expect(recorded).toBeDefined();
    expect(recorded).toHaveLength(1);
    expect((recorded![0].data as { x: number }).x).toBe(1);
  });

  it('replayed (deserialized) WorldHistoryState preserves recordedCommands', () => {
    const world = mkWorld();
    world.registerHandler('spawn', () => ({ ok: true }));
    const rec = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec.connect();
    world.submit('spawn', { x: 1 });
    world.step();
    const state = rec.getState();
    const round = JSON.parse(JSON.stringify(state));
    expect((round as { recordedCommands: RecordedCommand[] }).recordedCommands).toHaveLength(1);
    rec.disconnect();
  });
});
```

### Step 4.2: Modify `src/history-recorder.ts`

Add:
- New constructor option `captureCommandPayloads?: boolean` (default `false`).
- New private state: `recordedCommands: RecordedCommand[]` array (only used when option is true).
- New private method `_installSubmitWrap()` and `_uninstallSubmitWrap()` that wrap `world.submitWithResult` (NOT `submit`) and store the original closure for restoration.
- Mutex via a hidden `world.__payloadCapturingRecorder` slot — `_installSubmitWrap` throws `RecorderClosedError(code: 'recorder_already_attached')` if the slot is set; otherwise sets the slot to `this`.
- `connect()` calls `_installSubmitWrap()` if `captureCommandPayloads === true`; `disconnect()` calls `_uninstallSubmitWrap()`.
- `getState()` returns `{ ...existing, recordedCommands: this._recordedCommands }` when payloads enabled; existing shape unchanged otherwise.

### Step 4.3: Gates + bump + docs + commit

Same pattern. Commit: `feat(history-recorder): captureCommandPayloads option (v0.7.10)`.

---

## Task 5: SessionRecorder (v0.7.11)

**Files:**
- Create: `src/session-recorder.ts`
- Create: `tests/session-recorder.test.ts`
- Modify: `src/index.ts`, `package.json`, changelog/devlog

### Implementation skeletons

Per spec §7.

**Type aliases:**

```ts
export type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance'> & { tick?: number };
type AttachmentId = string;
type MarkerId = string;
```

**Class shape:**

```ts
import { randomUUID } from 'node:crypto';
import { ENGINE_VERSION } from './version.js';

export class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
  readonly sessionId: string;
  readonly _config: SessionRecorderConfig<TEventMap, TCommandMap, TDebug>;
  private _connected = false;
  private _closed = false;
  private _originalSubmitWithResult: typeof this._config.world.submitWithResult | null = null;
  private _diffListener: ((d: TickDiff) => void) | null = null;
  // ... similar for execution / failure listeners
  lastError: SessionRecordingError | null = null;

  constructor(config: SessionRecorderConfig<TEventMap, TCommandMap, TDebug>) {
    this.sessionId = randomUUID();
    this._config = { ...config, sink: config.sink ?? new MemorySink() };
  }

  connect(): void {
    if (this._closed) throw new RecorderClosedError('recorder already disconnected', { code: 'already_closed' });
    if (this._connected) return;
    const world = this._config.world;
    if (world.isPoisoned()) throw new RecorderClosedError('world is poisoned', { code: 'world_poisoned' });
    if (world.__payloadCapturingRecorder) {
      throw new RecorderClosedError('another payload-capturing recorder is attached',
        { code: 'recorder_already_attached', existing: world.__payloadCapturingRecorder.sessionId });
    }
    world.__payloadCapturingRecorder = { sessionId: this.sessionId, lastError: null };
    this._startTick = world.tick;       // captured here; used by _onDiff periodic-snapshot guard

    // Open sink + write initial snapshot
    const initialMetadata: SessionMetadata = {
      sessionId: this.sessionId,
      engineVersion: ENGINE_VERSION,
      nodeVersion: process.version,
      recordedAt: new Date().toISOString(),
      startTick: world.tick,
      endTick: world.tick,
      persistedEndTick: world.tick,
      durationTicks: 0,
      sourceKind: 'session',
      sourceLabel: this._config.sourceLabel,
    };
    this._config.sink.open(initialMetadata);
    const initialSnapshot = world.serialize();
    this._config.sink.writeSnapshot({ tick: world.tick, snapshot: initialSnapshot });

    // Install wrap on submitWithResult only (NOT submit; spec §7.3)
    this._originalSubmitWithResult = world.submitWithResult.bind(world);
    const sink = this._config.sink;
    world.submitWithResult = ((type, data) => {
      const result = this._originalSubmitWithResult!(type, data);
      try {
        sink.writeCommand({
          type: type as never,
          data: data as never,
          sequence: result.sequence,
          submissionTick: result.tick,
          result,
        });
      } catch (e) {
        this._handleSinkError(e);
      }
      return result;
    }) as typeof world.submitWithResult;

    // Subscribe to listeners
    this._diffListener = (diff) => this._onDiff(diff);
    world.onDiff(this._diffListener);
    // similar for onCommandExecution → sink.writeCommandExecution
    // similar for onTickFailure → sink.writeTickFailure (also push to metadata.failedTicks)

    this._connected = true;
  }

  private _startTick = 0;  // captured in connect()

  private _onDiff(diff: TickDiff): void {
    try {
      const world = this._config.world;
      const entry: SessionTickEntry<TEventMap, TDebug> = cloneJsonValue({
        tick: diff.tick,
        diff,
        events: [...world.getEvents()],
        metrics: world.getMetrics(),
        debug: this._config.debug?.capture() ?? null,
      }, 'session tick entry');
      this._config.sink.writeTick(entry);
      const interval = this._config.snapshotInterval ?? 1000;
      // Periodic snapshot fires when the current tick is a non-zero multiple of interval
      // AND we've advanced past the start tick (initial snapshot was taken at startTick;
      // don't double-write at tick == startTick).
      if (interval !== null && world.tick > this._startTick && world.tick % interval === 0) {
        this._config.sink.writeSnapshot({ tick: world.tick, snapshot: world.serialize() });
      }
    } catch (e) {
      this._handleSinkError(e);
    }
  }

  private _handleSinkError(e: unknown): void {
    const err = e instanceof SessionRecordingError ? e : new SinkWriteError(String(e), { wrapped: true });
    this.lastError = err;
    // Mark metadata.incomplete via a sink-specific helper (or via re-open with updated metadata in close())
    // Subsequent listener invocations short-circuit: this._connected -> false-ish flag.
    this._terminate();
  }

  private _terminate(): void {
    // Unsubscribe listeners + uninstall wrap, but do NOT clear __payloadCapturingRecorder
    // (caller must still call disconnect() to finalize).
    if (this._diffListener) { this._config.world.offDiff(this._diffListener); this._diffListener = null; }
    if (this._originalSubmitWithResult) {
      this._config.world.submitWithResult = this._originalSubmitWithResult;
      this._originalSubmitWithResult = null;
    }
    // similar for other listeners
  }

  addMarker(input: NewMarker): MarkerId {
    if (!this._connected || this._closed) throw new RecorderClosedError('cannot addMarker on disconnected recorder');
    const tick = input.tick ?? this._config.world.tick;
    // Live-tick path: validate strictly (entity liveness, cell bounds)
    // Retroactive path: skip entity liveness, set validated: false
    const marker: Marker = {
      id: randomUUID(),
      tick,
      kind: input.kind,
      provenance: 'game',
      text: input.text,
      refs: input.refs,
      data: input.data,
      attachments: input.attachments,
      createdAt: new Date().toISOString(),
      ...(tick < this._config.world.tick ? { validated: false as const } : {}),
    };
    this._validateMarker(marker);
    this._config.sink.writeMarker(marker);
    return marker.id;
  }

  // ... attach, takeSnapshot, disconnect, toBundle similarly per spec §7
}
```

`_validateMarker` enforces §6.1 — for live tick: every `EntityRef` matches a live entity via `world.isCurrent({ id, generation })` (existing engine API at `src/world.ts:383`), every `cell` is in-bounds, `tickRange` valid. Retroactive markers skip entity liveness.

### Test coverage (~18 tests)

- Construction defaults; `sessionId` generated.
- Pre-connect submissions are not captured (wrap not installed).
- `connect()` captures initial snapshot.
- `connect()` on poisoned world throws `RecorderClosedError(code: 'world_poisoned')`.
- `connect()` after `disconnect()` throws.
- `connect()` when another payload-capturing recorder is attached throws.
- Per-tick: `onDiff` produces `SessionTickEntry` with diff, events, metrics.
- Periodic snapshots at `snapshotInterval`.
- `addMarker` validation: live-tick entity ref check, cell bounds, kind enum.
- Retroactive marker gets `validated: false`.
- `attach` returns AttachmentId; sink stores blob.
- `takeSnapshot` adds explicit snapshot at current tick.
- `disconnect` writes terminal snapshot by default.
- `terminalSnapshot: false` skips terminal.
- Destroyed-world disconnect: `lastError` set, `incomplete: true`.
- Sink write failure during recording: `incomplete: true` + recorder terminates listener short-circuit.
- `toBundle` produces strict-JSON.
- Round-trip: record → serialize → deserialize bundle still has all data.

### Commit

`feat(session-recording): SessionRecorder lifecycle (v0.7.11)`.

---

## Task 6: SessionReplayer + selfCheck (v0.7.12)

**Files:**
- Create: `src/session-replayer.ts`
- Create: `tests/session-replayer.test.ts`
- Modify: `src/index.ts`, `package.json`, changelog/devlog

### Implementation summary

Per spec §9. Class with `static fromBundle(bundle, config)` and `static fromSource(source, config)` constructors. `ReplayerConfig.worldFactory` is the determinism-contract callback.

Methods:
- `markers()`, `markersAt(tick)`, `markersOfKind(kind)`, `markersByEntity(ref)`, `markersByEntityId(id)` — bundle-side queries.
- `snapshotTicks()`, `ticks()`.
- `openAt(tick)`: per §9.1 — range checks against `[startTick, endTick or persistedEndTick if incomplete]`; reject if tick is at-or-after first failedTick; find latest snapshot ≤ tick (normalized union with `initialSnapshot`); construct world via factory; replay forward via `submitWithResult` per ordered `submissionTick === t` then `step()`.
- `stateAtTick(tick)`: shortcut that opens and serializes.
- `tickEntriesBetween(from, to)`: filter ticks (inclusive both ends).
- `selfCheck(options?)`: per §9.3 algorithm — segments include `(initialSnapshot, snapshots[0])`, walk consecutive pairs, replay each segment, compare state (deep-equal), events (per-tick), executions (via `onCommandExecution` listener accumulator).
- `validateMarkers()`: re-validate retroactive markers against historical snapshots.

Engine version compat checks per §11.1 clause 9: cross-`b` throws `BundleVersionError`; within-`b` warns; cross-Node-major warns.

### Key implementation sketches

**Engine version compatibility** (per spec §11.1 clause 9):

```ts
function checkVersionCompat(bundleVersion: string, runtimeVersion: string): void {
  // Both '0.X.Y' shape; X is the "b" component (breaking-change axis pre-1.0)
  const [a1, b1] = bundleVersion.split('.').map(Number);
  const [a2, b2] = runtimeVersion.split('.').map(Number);
  if (a1 !== a2 || b1 !== b2) {
    throw new BundleVersionError(
      `engineVersion mismatch: bundle ${bundleVersion} vs runtime ${runtimeVersion} (cross-b)`,
      { code: 'cross_b', bundleVersion, runtimeVersion },
    );
  }
  // Within-b: c-component differences warn but proceed.
  // (No-op here; warning emitted at openAt() boundary if the .c differs.)
}
```

**deepEqualWithPath helper** (~80 LOC):

```ts
export function deepEqualWithPath(a: unknown, b: unknown, path = ''): { equal: boolean; firstDifferingPath?: string } {
  if (Object.is(a, b)) return { equal: true };
  if (typeof a !== typeof b) return { equal: false, firstDifferingPath: path };
  if (a === null || b === null) return { equal: false, firstDifferingPath: path };
  if (typeof a !== 'object') return { equal: false, firstDifferingPath: path };

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return { equal: false, firstDifferingPath: path };
    if (a.length !== b.length) return { equal: false, firstDifferingPath: `${path}.length` };
    for (let i = 0; i < a.length; i++) {
      const r = deepEqualWithPath(a[i], b[i], `${path}[${i}]`);
      if (!r.equal) return r;
    }
    return { equal: true };
  }

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) {
    return { equal: false, firstDifferingPath: `${path}<keys>` };
  }
  // Snapshot serialization preserves insertion order (Map → Object.fromEntries),
  // so we can iterate aKeys in order without canonicalizing.
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) {
      return { equal: false, firstDifferingPath: `${path}.${k}<missing>` };
    }
    const r = deepEqualWithPath(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
      path ? `${path}.${k}` : k,
    );
    if (!r.equal) return r;
  }
  return { equal: true };
}
```

**openAt** (key flow):

```ts
openAt(targetTick: number): World<TEventMap, TCommandMap> {
  const md = this.metadata;
  // Range check
  const upper = md.incomplete ? md.persistedEndTick : md.endTick;
  if (targetTick < md.startTick || targetTick > upper) {
    throw new BundleRangeError(`tick ${targetTick} outside [${md.startTick}, ${upper}]`,
      { code: targetTick < md.startTick ? 'too_low' : 'too_high', requested: targetTick });
  }
  // Failure span check
  if (md.failedTicks?.some((ft) => targetTick >= ft)) {
    throw new BundleIntegrityError('replay across recorded TickFailure is out of scope',
      { code: 'replay_across_failure', failedTicks: md.failedTicks });
  }
  // No-replay-payloads check
  if (targetTick > md.startTick && this.bundle.commands.length === 0) {
    throw new BundleIntegrityError('bundle has no command payloads; replay forward is impossible',
      { code: 'no_replay_payloads' });
  }

  // Build normalized snapshot list
  const allSnapshots: SessionSnapshotEntry[] = [
    { tick: md.startTick, snapshot: this.bundle.initialSnapshot },
    ...this.bundle.snapshots,
  ];
  const start = [...allSnapshots].reverse().find((s) => s.tick <= targetTick)!;
  // Construct world via factory
  const world = this.config.worldFactory(start.snapshot);

  // Replay forward
  for (let t = start.tick; t < targetTick; t++) {
    const tickCommands = this.bundle.commands
      .filter((c) => c.submissionTick === t)
      .sort((a, b) => a.sequence - b.sequence);
    for (const rc of tickCommands) {
      if (!world.hasHandler(rc.type)) {
        throw new ReplayHandlerMissingError(
          `replay needs handler for command type "${String(rc.type)}", not registered in worldFactory's world`,
          { code: 'handler_missing', commandType: String(rc.type), tick: t },
        );
      }
      world.submitWithResult(rc.type, rc.data);
    }
    world.step();
  }
  return world;
}
```

(`world.hasHandler(type)` is added in T0 step 0.4.)

**selfCheck failedTicks-skipping**:

```ts
selfCheck(options: SelfCheckOptions = {}): SelfCheckResult {
  const md = this.metadata;
  // No-payload bundles: ok with checkedSegments: 0 + warning
  if (this.bundle.commands.length === 0 && md.endTick > md.startTick) {
    console.warn(`[SessionReplayer] selfCheck on bundle without command payloads is a no-op (${md.sessionId})`);
    return { ok: true, checkedSegments: 0, stateDivergences: [], eventDivergences: [], executionDivergences: [], skippedSegments: [] };
  }
  // Build normalized snapshot list
  const allSnapshots: SessionSnapshotEntry[] = [
    { tick: md.startTick, snapshot: this.bundle.initialSnapshot },
    ...this.bundle.snapshots,
  ];
  const segments: Array<[SessionSnapshotEntry, SessionSnapshotEntry]> = [];
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    segments.push([allSnapshots[i], allSnapshots[i + 1]]);
  }
  const result: SelfCheckResult = {
    ok: true, checkedSegments: 0,
    stateDivergences: [], eventDivergences: [], executionDivergences: [],
    skippedSegments: [],
  };
  for (const [a, b] of segments) {
    // Skip segments containing a recorded TickFailure (replay refuses across failures)
    if (md.failedTicks?.some((ft) => ft >= a.tick && ft < b.tick)) {
      result.skippedSegments.push({ fromTick: a.tick, toTick: b.tick, reason: 'failure_in_segment' });
      continue;
    }
    const segmentResult = this._checkSegment(a, b, options);
    result.checkedSegments++;
    result.stateDivergences.push(...segmentResult.stateDivergences);
    result.eventDivergences.push(...segmentResult.eventDivergences);
    result.executionDivergences.push(...segmentResult.executionDivergences);
    if (segmentResult.stateDivergences.length || segmentResult.eventDivergences.length || segmentResult.executionDivergences.length) {
      result.ok = false;
      if (options.stopOnFirstDivergence) break;
    }
  }
  return result;
}
```

(The `_checkSegment` helper does the per-segment replay + 3-stream comparison using `deepEqualWithPath` for state and ordered-deep-equal for events/executions.)

### Test coverage (~18 tests; expanded from 16)

- `fromBundle` accepts a bundle.
- `fromSource` accepts a sink-as-source.
- `openAt(startTick)` returns world from initialSnapshot directly.
- `openAt(midTick)` walks from prior snapshot.
- `openAt(endTick)` walks from terminal snapshot or replay.
- `openAt(< startTick)` throws `BundleRangeError(code: 'too_low')`.
- `openAt(> endTick)` throws `BundleRangeError(code: 'too_high')`.
- `openAt(> persistedEndTick)` on incomplete bundle throws `BundleRangeError`.
- `openAt(failedTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`.
- `openAt(tick > startTick)` on bundle with empty commands throws `BundleIntegrityError(code: 'no_replay_payloads')`.
- `openAt` on a bundle whose RecordedCommand.type has no handler in factory-built world throws `ReplayHandlerMissingError`.
- Cross-`b` engineVersion throws `BundleVersionError(code: 'cross_b')`.
- Within-`b` engineVersion warns (`console.warn` mocked) and proceeds.
- `selfCheck` on clean recording returns `ok: true`, `checkedSegments >= 1`.
- `selfCheck` on `Math.random()`-violating recording reports `stateDivergences[0]`.
- `selfCheck` on event-emitting violation reports `eventDivergences[0]`.
- `selfCheck` on execution-divergent violation reports `executionDivergences[0]`.
- `selfCheck` on no-payload bundle returns `ok: true, checkedSegments: 0` + console.warn.
- `selfCheck` skips segments containing a recorded TickFailure (records in `skippedSegments`).
- `stopOnFirstDivergence` truncates result.
- Self-check covers initial-to-first-snapshot segment (regression test).

### Commit

`feat(session-recording): SessionReplayer + selfCheck (v0.7.12)`.

---

## Task 7: scenarioResultToBundle adapter (v0.7.13)

**Files:**
- Modify: `src/session-bundle.ts` (add the adapter function alongside the types)
- Create: `tests/scenario-bundle.test.ts`
- Modify: `src/index.ts`, `package.json`, changelog/devlog

### Implementation summary

Per spec §10. Standalone exported function `scenarioResultToBundle(result, options?)`:

- `metadata.sourceKind = 'scenario'`, `sourceLabel = options?.sourceLabel ?? result.name`.
- `metadata.engineVersion` from `ENGINE_VERSION` exported from `src/version.ts` (created in T0). DO NOT use `process.env.npm_package_version` — only populated under `npm run`, breaks in test runners launched directly.
- `metadata.nodeVersion = options?.nodeVersion ?? process.version`.
- `metadata.startTick = result.history.initialSnapshot.tick` (throw `BundleIntegrityError(code: 'no_initial_snapshot')` if null).
- `metadata.endTick = result.tick`, `durationTicks = endTick - startTick`, `persistedEndTick = endTick`.
- `initialSnapshot ← result.history.initialSnapshot`.
- `ticks ← result.history.ticks`.
- `commands ← result.history.recordedCommands ?? []`. If absent or empty, the bundle is diagnostic-only (warns).
- `executions ← result.history.executions`.
- `failures ← result.history.failures`.
- `snapshots ← [{ tick: result.tick, snapshot: result.snapshot }]`.
- `markers ← result.checks.map((outcome, i) => ({ id: '...', tick: result.tick, kind: 'assertion', provenance: 'engine', text: outcome.name, data: { passed: outcome.passed, failure: outcome.failure } }))`.
- `attachments ← []`.

### Test coverage (~8 tests)

- Adapter produces strict-JSON bundle with metadata fields populated.
- Each `result.checks` outcome becomes one assertion marker with `provenance: 'engine'`.
- Markers carry `data: { passed, failure }`.
- `result.history.initialSnapshot === null` throws `BundleIntegrityError`.
- Missing payloads → `commands: []`; bundle is diagnostic-only.
- With payloads → bundle is replayable (round-trip via `SessionReplayer`).
- `metadata.startTick` reflects post-setup tick when scenario runs `world.step()` in setup.
- `sourceLabel` defaults to `result.name`; can be overridden.

### Commit

`feat(session-recording): scenarioResultToBundle adapter (v0.7.13)`.

---

## Task 8: CI gate — migrate existing scenarios + clause-paired tests (v0.7.14)

**Files:**
- Modify: `tests/scenario-runner.test.ts` (or wherever existing scenarios live — find via `find tests -name '*.test.ts' | xargs grep -l 'runScenario'`)
- Create: `tests/determinism-contract.test.ts`
- Modify: `package.json`, changelog/devlog

### Step 8.1: Refactor existing scenarios — extract setup-as-reusable-function pattern

All 4 scenarios in `tests/scenario-runner.test.ts` currently register components and handlers inline inside their `setup` callback. For replay's `worldFactory` to reproduce that registration, each scenario's setup must be extracted into a standalone function reusable by both `scenario.setup` and `worldFactory`.

Pattern:

```ts
// Before (current shape, e.g. tests/scenario-runner.test.ts:25-36):
runScenario({
  name: 'move',
  world: mkWorld(),
  setup: (ctx) => {
    ctx.world.registerComponent('position');
    ctx.world.registerHandler('move', (cmd) => { /* ... */ });
  },
  // ...
});

// After:
function setupMoveScenario(world: World): void {
  world.registerComponent('position');
  world.registerHandler('move', (cmd) => { /* ... */ });
}
const result = runScenario({
  name: 'move',
  world: mkWorld(),
  setup: (ctx) => setupMoveScenario(ctx.world),
  run: ...,
  checks: ...,
  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true, captureInitialSnapshot: true },
});
const bundle = scenarioResultToBundle(result);
const replayer = SessionReplayer.fromBundle(bundle, {
  worldFactory: (snap) => {
    // Pattern: register first, then apply snapshot. registerComponent /
    // registerHandler throw on duplicates, so the deserialize-then-register
    // path is unsafe (deserialize already populates component stores).
    // World.applySnapshot (added in T0 step 0.4) overwrites entity/component
    // state in-place without clearing registrations.
    const w = mkWorld();
    setupMoveScenario(w);          // register components, handlers, validators
    w.applySnapshot(snap);          // overwrite state without touching registrations
    return w;
  },
});
const check = replayer.selfCheck();
expect(check.ok).toBe(true);
expect(check.stateDivergences).toEqual([]);
expect(check.eventDivergences).toEqual([]);
expect(check.executionDivergences).toEqual([]);
```

**Note:** `World.deserialize(snap)` returns a fresh `World` without user registrations and is unsuitable for the worldFactory because subsequent `setupMoveScenario` registrations would conflict with already-populated component stores. T0 step 0.4 adds `World.applySnapshot(snap)` (in-place state overwrite, registrations preserved) precisely for this path. The refactor pattern above uses it.

Refactor each of the 4 scenarios in `tests/scenario-runner.test.ts`:
- `setupMoveScenario(world)` — for the move test
- `setupSpawnScenario(world)` — for the spawn test
- `setupQueryScenario(world)` — for the query test
- `setupCrashScenario(world)` — for the handler-crash test

### Step 8.2: Handler-crash scenario semantics

The handler-crash scenario (currently `tests/scenario-runner.test.ts:185-210`) intentionally records a `TickFailure`. Per spec §9.1, `openAt(failedTick)` throws. selfCheck per §9.3 (with the failedTicks-skipping logic from T6) skips segments containing the failure. So the migrated test asserts:

```ts
const check = replayer.selfCheck();
expect(check.ok).toBe(true);                            // remaining segments are clean
expect(check.skippedSegments).toHaveLength(1);          // one segment skipped
expect(check.skippedSegments[0].reason).toBe('failure_in_segment');
```

### Step 8.3: Determinism clause-paired tests

Create `tests/determinism-contract.test.ts` with one paired test (clean + violating) for each clause 1–8 of §11.1 (clause 9 is special-cased — see below).

For clauses 1–8, each violating test asserts `check.ok === false` AND the violation's first divergence falls in the expected category:

| Clause | Violation pattern | Expected divergence category |
| ------ | ----------------- | ---------------------------- |
| 1 | Direct `world.setComponent` from external test code between ticks | `stateDivergences` |
| 2 | A system calls `world.submit()` mid-tick | `executionDivergences` (double-submit shows up here) |
| 3 | A system calls `Math.random()` | `stateDivergences` |
| 4 | A validator calls `world.setComponent` (side effect) | `stateDivergences` |
| 5 | A system reads `Date.now()` and writes to a component | `stateDivergences` |
| 6 | A system iterates a `Set` whose contents differ across runs | `stateDivergences` |
| 7 | A system reads `process.env.SOME_FLAG` (use `vi.stubEnv` + `vi.unstubAllEnvs` to flip between record and replay) | `stateDivergences` |
| 8 | Factory registers two systems in different order than recorder | `stateDivergences` (last-writer-wins on shared component) |

Clause 9 (engine + Node version compat) is enforced at `openAt`/`fromBundle` time, NOT via selfCheck divergence:

```ts
it('clause 9: cross-b engineVersion throws BundleVersionError at openAt', () => {
  // Construct bundle with metadata.engineVersion = '0.6.0'; runtime is 0.7.x.
  // Expect BundleVersionError on fromBundle (or openAt; spec §9.1).
});

it.todo('clause 9: cross-Node-major mismatches warn but proceed (requires multi-Node CI matrix)');
```

### Step 8.4: Commit

`test(session-recording): CI gate - migrate scenarios + clause-paired tests (v0.7.14)`. Per-task review per the pattern at the top.

---

## Task 9: Cross-cutting structural docs + final integration (v0.7.15)

**Note:** Per the per-task doc pattern at the top of this plan, T1–T8 already landed `docs/api-reference.md` updates, `docs/changelog.md` entries, `docs/devlog/*` entries, and incrementally built `docs/guides/session-recording.md` and `docs/guides/scenario-runner.md` updates in their own commits. T9 lands ONLY the cross-cutting structural docs whose content depends on the full subsystem being in place.

**Files:** (only those NOT updated per-task)
- Modify: `docs/architecture/ARCHITECTURE.md` (Component-Map rows + Boundaries paragraph + tick-lifecycle ASCII)
- Modify: `docs/architecture/decisions.md` (ADRs 1–4 per spec §15)
- Modify: `docs/architecture/drift-log.md` (one row 2026-04-27)
- Modify: `docs/guides/concepts.md` (standalone-utilities list + tick-lifecycle ASCII)
- Modify: `docs/guides/ai-integration.md` (new section: session recording as foundation of AI debugging)
- Modify: `docs/guides/getting-started.md` (brief "Recording your first session" example)
- Modify: `docs/guides/building-a-game.md` ("Recording sessions for debugging" section)
- Modify: `docs/guides/debugging.md` (pointer to session-recording for replay-based debugging)
- Modify: `README.md` (Feature Overview row + Public Surface bullets)
- Modify: `docs/README.md` (index link)
- Final pass on `docs/guides/session-recording.md` and `docs/api-reference.md` to ensure cross-references resolve and no stale wording remains
- Modify: `package.json`, changelog/devlog

### Step 9.1: Write `docs/guides/session-recording.md`

New canonical guide. Sections:
1. **What this is** (one paragraph).
2. **Quickstart**: `new SessionRecorder({ world }) → connect → run → addMarker → disconnect → toBundle`.
3. **Sinks**: MemorySink (default) vs FileSink; sidecar attachments.
4. **Markers**: kinds, refs (entities use `EntityRef`), provenance, attachments.
5. **Replay**: `SessionReplayer.fromBundle/fromSource → openAt → tickEntriesBetween → stateAtTick`. Include `worldFactory` example.
6. **selfCheck**: when, cost model, how to interpret divergences.
7. **Determinism contract**: each of the 9 §11.1 clauses with a concrete code example of a violation.
8. **Scenario integration**: `runScenario({ history: { captureCommandPayloads: true } }) → scenarioResultToBundle`.
9. **Limitations** (v1): single payload-capturing recorder per world; no replay across `TickFailure`; sync-only sinks.

### Step 9.2: Update other guides

- `docs/api-reference.md`: full sections per §14 list (signatures, examples, error tables).
- `docs/architecture/ARCHITECTURE.md`: add 4 Component-Map rows; Boundaries paragraph re dual-recorder structure; tick-lifecycle ASCII updated to show submitWithResult interception when SessionRecorder is attached.
- `docs/architecture/decisions.md`: ADR rows for ADR 1 (separate recorders), ADR 2 (shared bundle type), ADR 3 (documented-not-enforced determinism), ADR 4 (worldFactory part of contract).
- `docs/architecture/drift-log.md`: one row dated 2026-04-27 noting "session-recording subsystem; dual recorder (rolling debug vs persistent archive)."
- `docs/guides/scenario-runner.md`: new "Replayable bundles via scenarioResultToBundle" section + `captureCommandPayloads` caveat.
- `docs/guides/debugging.md`: pointer to session-recording for replay-based debugging.
- `docs/guides/concepts.md`: SessionRecorder/Replayer/Bundle/Sink/Source added to standalone-utilities list.
- `docs/guides/ai-integration.md`: new section on session recording as the foundation of AI-driven debugging.
- `docs/guides/getting-started.md`: brief "Recording your first session" example.
- `docs/guides/building-a-game.md`: "Recording sessions for debugging" section.
- `README.md`: feature-overview row + public-surface bullets.
- `docs/README.md`: index link to session-recording.md.

### Step 9.3: Run doc-review skill

`/doc-review` to verify no stale references. Fix anything it surfaces.

### Step 9.4: Run full multi-CLI code review on the chained branch

Per AGENTS.md mandatory multi-CLI review, run on the full diff and synthesize the result into `docs/threads/current/session-recording/<date>/<iter>/REVIEW.md`. Keep only `REVIEW.md` in the committed thread; any local command captures belong under `tmp/review-runs/session-recording/<date>/<iter>/` and are not staged. Iterate until convergent, then move the thread to `docs/threads/done/session-recording/`.

### Step 9.5: Bump + commit

`docs(session-recording): doc surface + final integration (v0.7.15)`.

---

## Final integration check (after all 9 tasks)

- [ ] All 9 commits on `agent/session-recording` ahead of `main`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all pass on the tip.
- [ ] `npm test` runs every existing scenario through `selfCheck` per §13.5; all pass.
- [ ] Multi-CLI review converged.
- [ ] Branch is rebase-clean against `main`.
- [ ] **STOP — do not auto-merge.** Per AGENTS.md, merging to `main` requires explicit user authorization. Surface the branch + final review summary; wait for user `merge` directive.

---

## Self-Review

This plan was self-reviewed against the v5 spec for:

1. **Spec coverage:**
   - §1–§3 (Goals, Non-Goals, Background): T1 establishes types and groundwork.
   - §4 (Architecture): T1–T7 ship every symbol in the Component Map.
   - §5 (Bundle format): T1 + T2 (MemorySink) + T3 (FileSink).
   - §6 (Marker schema): T1 + T5 (validation in `addMarker`).
   - §7 (SessionRecorder API + lifecycle): T5.
   - §8 (Sinks): T2 + T3.
   - §9 (Replayer + selfCheck): T6.
   - §10 (Scenario integration): T7.
   - §11 (Determinism contract): T8 paired tests.
   - §12 (Error handling): T1 + scattered through the rest.
   - §13 (Testing): every task ships tests; T8 wires the CI gate.
   - §14 (Doc surface): T9.
   - §15 (ADRs): T9 architecture/decisions row.
   - §16 (Open questions): handled in implementation phase per spec.
   - §17 (Future specs): captured in roadmap, no work here.
   - §18 (Acceptance criteria): final integration check above.

2. **Placeholder scan:** No `TBD`/`TODO`/"implement later" placeholders; every task has the test code, impl approach, run commands, and commit message.

3. **Type consistency:** All cross-task type references match (`SessionBundle`, `Marker`, `RecordedCommand`, `SessionMetadata`, etc.). Field names match the spec verbatim.

4. **Ambiguity check:** Each task has a single owner of each new symbol; sequencing prevents collision.
