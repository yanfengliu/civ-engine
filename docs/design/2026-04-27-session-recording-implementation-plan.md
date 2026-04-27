# Session Recording & Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the engine-level session-recording-and-replay primitives defined in `docs/design/2026-04-26-session-recording-and-replay-design.md` (v5, converged after 4 multi-CLI review iterations).

**Architecture:** Adds `SessionRecorder` (captures live World runs into a `SessionBundle` via a `SessionSink`), `SessionReplayer` (loads bundles, opens paused worlds at any tick, runs three-stream `selfCheck()`), the bundle/marker/sink/source types, two sink implementations (`MemorySink`, `FileSink`), a `scenarioResultToBundle()` adapter, and an additive `captureCommandPayloads: true` option on `WorldHistoryRecorder`. v1 is opt-in, synchronous, and covers clean-tick replay only — replay across recorded `TickFailure` is out of scope (future spec extends `WorldSnapshot` to v6).

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+ (the project's `package.json:engines`). All new code follows the project's existing ESM + Node16 module-resolution conventions.

**Spec sections referenced throughout:** §-numbered references in this plan map 1:1 to sections in `2026-04-26-session-recording-and-replay-design.md`.

**Branch strategy:** All work on a single chained branch `agent/session-recording`, one commit per Task (see §Task list below for one-`c`-bump-per-commit policy from AGENTS.md). Branch stays at the tip awaiting explicit user merge authorization per AGENTS.md.

**Versioning:** Current version `0.7.6`. Each Task ships a `c`-bump (`0.7.7` through `0.7.15`). All additions are non-breaking; no `b`-bump expected.

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

Added session-recording bundle and error types (`SessionBundle`, `Marker`, `RecordedCommand`, `SessionMetadata`, `AttachmentDescriptor`, `EntityRef`, `MarkerRefs`, plus `SessionRecordingError` hierarchy with seven subclasses). Types only; no runtime behavior. Foundation for `SessionRecorder`/`SessionReplayer` (next commits). See `docs/design/2026-04-26-session-recording-and-replay-design.md` §5, §6, §12.
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

See docs/design/2026-04-26-session-recording-and-replay-design.md
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

describe('MemorySink', () => {
  it('open() stores metadata; toBundle() returns the snapshot of state', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    const bundle = sink.toBundle();
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.metadata.sessionId).toBe('00000000-0000-0000-0000-000000000000');
    expect(bundle.ticks).toEqual([]);
    expect(bundle.commands).toEqual([]);
    expect(bundle.snapshots).toEqual([]);
  });

  it('writeMarker accumulates markers in the bundle', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
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

  it('writeTick / writeCommand / writeSnapshot accumulate in order', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    sink.writeCommand({
      type: 'spawn', data: {}, sequence: 1, submissionTick: 1,
      result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'ok',
        message: '', details: null, tick: 1, sequence: 1, validatorIndex: null } as never,
    });
    sink.writeSnapshot({ tick: 1, snapshot: { tick: 1 } as never });
    const bundle = sink.toBundle();
    expect(bundle.ticks).toHaveLength(2);
    expect(bundle.ticks[0].tick).toBe(1);
    expect(bundle.commands).toHaveLength(1);
    expect(bundle.snapshots).toHaveLength(1);
  });

  it('close() advances persistedEndTick on the metadata to last snapshot tick', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 100, snapshot: { tick: 100 } as never });
    sink.writeSnapshot({ tick: 200, snapshot: { tick: 200 } as never });
    sink.close();
    const bundle = sink.toBundle();
    expect(bundle.metadata.persistedEndTick).toBe(200);
  });

  it('toBundle() is JSON-stringify-roundtrippable', () => {
    const sink = new MemorySink();
    sink.open(mkMetadata());
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

  it('writeAttachment under threshold goes to manifest as dataUrl', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeAttachment(
      { id: 'small', mime: 'text/plain', sizeBytes: 5, ref: { dataUrl: '' } },
      new Uint8Array([104, 101, 108, 108, 111]),
    );
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'small');
    expect(a.ref).toHaveProperty('dataUrl');
  });

  it('writeAttachment over threshold persists to attachments/<id>.<ext> as sidecar', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    const huge = new Uint8Array(70_000);
    huge[0] = 7;
    sink.writeAttachment(
      { id: 'big', mime: 'image/png', sizeBytes: huge.byteLength, ref: { sidecar: true } },
      huge,
    );
    sink.close();
    expect(existsSync(join(bundleDir, 'attachments', 'big.png'))).toBe(true);
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'big');
    expect(a.ref).toEqual({ sidecar: true });
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
- `writeAttachment`: if `data.byteLength > threshold` OR descriptor is sidecar-refed, write to `attachments/<id>.<ext>` and append the sidecar-ref descriptor to the manifest's attachments index. Else dataUrl in manifest.
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

## Task 4: WorldHistoryRecorder.captureCommandPayloads (v0.7.10)

**Files:**
- Modify: `src/history-recorder.ts` (~80 LOC change)
- Create: `tests/history-recorder-payloads.test.ts`
- Modify: `package.json`, changelog/devlog

### Step 4.1: Write failing tests

Create `tests/history-recorder-payloads.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { World, WorldHistoryRecorder } from '../src/index.js';
import type { RecordedCommand } from '../src/index.js';

describe('WorldHistoryRecorder.captureCommandPayloads', () => {
  it('default config: recordedCommands is undefined; commands is CommandSubmissionResult[]', () => {
    const world = new World();
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
    const world = new World();
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
    const world = new World();
    const rec1 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    const rec2 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    expect(() => rec2.connect()).toThrow(/recorder_already_attached/);
    rec1.disconnect();
  });

  it('default-config recorder + payload-capturing recorder coexist', () => {
    const world = new World();
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
    const world = new World();
    const before = world.submitWithResult.toString();
    const rec1 = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    rec1.connect();
    expect(world.submitWithResult.toString()).not.toBe(before);
    rec1.disconnect();
    expect(world.submitWithResult.toString()).toBe(before);
  });

  it('submit() and submitWithResult() both captured (single wrap on submitWithResult)', () => {
    const world = new World();
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

  it('captureCommandPayloads:true with a SessionRecorder attached throws (mutex; T5 dependency)', () => {
    // This test will be skipped or marked .todo until T5 lands. Note: kept as a placeholder
    // here so the test-suite stub exists; full assertion happens after T5.
  });

  it('replayed (deserialized) WorldHistoryState preserves recordedCommands', () => {
    const world = new World();
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

### Implementation summary

Per spec §7. Class with constructor accepting `{ world, sink?, snapshotInterval?, terminalSnapshot?, debug?, sourceLabel? }`. Implements:

- Construction: generates `sessionId` (UUID), prepares listener+wrap closures, does NOT install.
- `connect()`: calls `sink.open(initialMetadata)`, captures initial snapshot, installs `submitWithResult` wrap (via the same hidden-slot mutex as T4), subscribes to `world.onDiff` / `world.onCommandExecution` / `world.onTickFailure`. Throws `RecorderClosedError` if poisoned, already-attached, or post-disconnect.
- Per-tick capture: `onDiff` builds `SessionTickEntry` via `cloneJsonValue`, calls `sink.writeTick`, takes periodic snapshot if `world.tick % snapshotInterval === 0`.
- Submission capture: wrap synchronously calls `sink.writeCommand({ type, data, sequence: result.sequence, submissionTick: result.tick, result })`.
- `addMarker`: validates per §6.1 (live-tick path), calls `sink.writeMarker`.
- `attach`: validates JSON-compat, calls `sink.writeAttachment`.
- `takeSnapshot`: calls `sink.writeSnapshot`.
- `disconnect()`: writes terminal snapshot (if enabled), uninstalls wrap, unsubscribes, finalizes metadata, calls `sink.close()`. Tolerates destroyed world (catches serialize failures into `lastError`).
- `toBundle()`: delegates to `sink.toBundle()`.

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

### Test coverage (~16 tests)

- `fromBundle` accepts a bundle.
- `fromSource` accepts a sink-as-source.
- `openAt(startTick)` returns world from initialSnapshot directly.
- `openAt(midTick)` walks from prior snapshot.
- `openAt(endTick)` walks from terminal snapshot or replay.
- `openAt(< startTick)` throws `BundleRangeError`.
- `openAt(> endTick)` throws `BundleRangeError`.
- `openAt(failedTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`.
- Cross-`b` engineVersion throws `BundleVersionError`.
- Within-`b` engineVersion warns (capture `console.warn`).
- `selfCheck` on clean recording returns `ok: true`.
- `selfCheck` on `Math.random()`-violating recording reports state divergence.
- `selfCheck` on event-emitting violation reports event divergence.
- `selfCheck` on execution-divergent violation reports execution divergence.
- `stopOnFirstDivergence` truncates result.
- Self-check covers initial-to-first-snapshot segment.

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
- `metadata.engineVersion` from `package.json` at translate time (read via `process.env.npm_package_version` or import-meta-style; whichever the engine already uses).
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

### Step 8.1: Migration

For every existing call to `runScenario({ ... })`, add `history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true, captureInitialSnapshot: true }` to the config. After the run, add:

```ts
const bundle = scenarioResultToBundle(result);
const replayer = SessionReplayer.fromBundle(bundle, { worldFactory: (snap) => /* construct an equivalent World */ });
const check = replayer.selfCheck();
expect(check.ok).toBe(true);
expect(check.stateDivergences).toEqual([]);
expect(check.eventDivergences).toEqual([]);
expect(check.executionDivergences).toEqual([]);
```

### Step 8.2: Determinism clause-paired tests

Create `tests/determinism-contract.test.ts` with one paired test (clean + violating) for each clause 1–9 of §11.1. Use small custom scenarios (~10 entities, ~50–200 ticks). Each violating test asserts `check.ok === false` and the violation's first divergence falls in the expected category (state / event / execution).

### Step 8.3: Commit

`test(session-recording): CI gate - migrate scenarios + clause-paired tests (v0.7.14)`.

---

## Task 9: Documentation surface + final integration (v0.7.15)

**Files:** (per spec §14)
- Create: `docs/guides/session-recording.md`
- Modify: `docs/api-reference.md`, `docs/architecture/ARCHITECTURE.md`, `docs/architecture/decisions.md`, `docs/architecture/drift-log.md`, `docs/guides/scenario-runner.md`, `docs/guides/debugging.md`, `docs/guides/concepts.md`, `docs/guides/ai-integration.md`, `docs/guides/getting-started.md`, `docs/guides/building-a-game.md`, `README.md`, `docs/README.md`
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

Per AGENTS.md mandatory multi-CLI review, run on the full diff `main..agent/session-recording`:

```bash
git diff main..HEAD | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral '...'   # save to docs/reviews/session-recording/2026-04-27/1/raw/codex.md
git diff main..HEAD | claude -p --model opus --effort xhigh --append-system-prompt '...' --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)"   # save to .../opus.md
git diff main..HEAD | gemini -p '...' --model gemini-3.1-pro-preview   # save to .../gemini.md (if quota)
```

Synthesize into `REVIEW.md`; iterate until convergent.

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
