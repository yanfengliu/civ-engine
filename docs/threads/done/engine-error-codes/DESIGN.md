# EngineError code migration — DESIGN

**Objective:** `engine-error-codes` · **Status:** v3 (post design-2: Codex 3 MEDIUM doc-text contradictions + 2 LOW — all fixed; Gemini + Claude CONVERGED) · **Origin:** full-review 2026-06-10 design-lens MEDIUM: "Two-tier error taxonomy — the core surface is stringly, the newer surface is coded. An engine whose stated thesis is machine-readable everything makes agents regex-match its most common errors."

## Problem

The session/corpus/viewer/strict-mode stack throws typed errors with stable machine-readable codes (`SessionRecordingError.details.code`, `StrictModeViolationError.details.code`, `BundleViewerError`) — with one known legacy gap, a raw `RangeError` in `session-fork.ts`, which stays as-is under the session-family exclusion (out of this objective's scope). The core engine — `World` layers, stores, and the standalone utilities — throws 127 plain `Error`/`RangeError`s plus 3 `TypeError`s with prose-only messages: `Component 'x' is not registered`, `Entity 3 is not alive`, `Cycle detected in system ordering: …`. An agent that needs to branch on these (retry vs re-register vs abort) must regex the prose, which breaks the moment a message is reworded. The setup/programming-error path predates the machine-readable philosophy; this objective retrofits it.

## Goals

- Every engine-thrown error carries a stable `code` (snake_case, unique within the new core namespace; discrimination across error families is `(family, code)` — see §2) and, where useful, structured `details`.
- **Message-compatible and class-compatible:** every existing message string is unchanged; sites that throw `RangeError` keep `instanceof RangeError` truthy. Existing tests asserting message regexes keep passing unmodified — that is the non-breakage proof.
- One documented error-code table in the api-reference (code → thrown by → meaning → details shape).

## Non-goals

- Touching the session stack's existing error classes (already coded; `BundleIntegrityError` et al. stay).
- Changing any `CommandSubmissionResult`/`TickFailure`/transaction *result* codes (already structured).
- Wrapping user-thrown errors (system/handler exceptions surface through `TickFailure` already).

## Design

### 1. Classes (new module `src/engine-error.ts`)

```ts
interface EngineErrorOptions { details?: JsonValue }

class EngineError extends Error {
  readonly code: string;
  readonly details: JsonValue | null;
  constructor(code: string, message: string, options?: EngineErrorOptions)
}

class EngineRangeError extends RangeError {  // same shape; preserves instanceof RangeError
  readonly code: string;
  readonly details: JsonValue | null;
}

class EngineTypeError extends TypeError {    // same shape; src/layer.ts throws TypeError today
  readonly code: string;
  readonly details: JsonValue | null;
}

function isEngineError(e: unknown): e is EngineError | EngineRangeError | EngineTypeError
```

- `code` is a first-class field (not buried in `details`) — the discrimination key agents switch on. `name` stays the subclass name.
- `isEngineError` is **instanceof-based** over the three classes (design-1 Codex/Claude convergent: a duck-typed string-`code` check false-positives on Node `ErrnoException`s — `'ENOENT'` etc. — which this engine surfaces via `FileSink`). Origin-accurate by construction; the session stack discriminates via `details.code` and is deliberately not matched (unification is a `v1-surface` question — changing either shape today is breaking).
- **`name` and stack-first-line delta (design-1 Claude):** engine errors escaping inside systems/handlers flow through `createErrorDetails` into `TickFailure.error.name`, recorded bundles, and client wire messages — post-migration that field reads `'EngineError'`/`'EngineRangeError'`/`'EngineTypeError'` instead of `'Error'`/`'RangeError'`. In-repo blast radius is zero (verified: only user-thrown errors are name-asserted), but it is a real wire-visible delta for external consumers — called out here and in the changelog, and deliberately NOT papered over by faking `name = 'Error'`.
- **`TickFailure` code propagation (design-1 Codex):** `createErrorDetails` gains optional pass-through — when the caught error `isEngineError`, the serialized shape becomes `{ name, message, stack, code?, details? }` (additive optional fields on `TickFailure.error`). Without this, the migration would fix only direct throws while the in-tick failure path — the one agents actually read — kept prose-only errors.
- Exported from `index.ts` (public).

### 2. Code taxonomy

Bare snake_case, prefix-grouped by domain, **unique within the new core namespace** — NOT promised unique against the pre-existing session/corpus/viewer code space, where collisions already exist across families (design-1 Codex verified: `query_invalid`, `schema_unsupported`, `world_poisoned` each appear in multiple families). Discrimination is `(error family, code)`; the api-reference table lists family + idiom per row, and the migration greps existing public code literals to avoid *new* collisions where cheap. Representative set (full inventory from the migration itself):

| Domain | Codes |
|---|---|
| entity | `entity_not_alive` |
| component | `component_not_registered`, `component_already_registered`, `component_missing_on_entity` |
| position | `position_invalid_shape`, `position_not_integer`, `position_out_of_bounds` |
| system | `system_unknown_phase`, `system_unknown_target`, `system_cross_phase_constraint`, `system_ambiguous_target`, `system_cycle`, `system_interval_invalid`, `system_interval_offset_invalid` |
| command | `handler_already_registered`, `validator_invalid_return`, `rejection_code_empty` |
| config | `config_invalid` (details: `{ field, reason }`) |
| state/meta | `json_incompatible` (all `assertJsonCompatible` sites — see below), `meta_not_finite`, `meta_not_unique` |
| snapshot | `snapshot_unsupported_version`, `snapshot_invalid_tick`, `snapshot_dead_entity`, `snapshot_invalid_entity_key` |
| resource | `resource_already_registered`, `resource_unknown` |
| utilities | `layer_*`, `occupancy_*`, `path_*`, `bt_*`, `visibility_*`, `noise_*`, `cellular_*`, `grid_*` per their assert helpers |

`assertJsonCompatible` / `jsonFingerprint` (json.ts) throw on non-JSON values from many call sites — they gain `json_incompatible` with `details: { context }` (the existing context string), one code for all sites.

### 3. Migration mechanics

Mechanical per-site rewrite: `throw new Error(msg)` → `throw new EngineError(code, msg)`; same for `RangeError`/`TypeError` via their subclasses; messages byte-identical. Where a message interpolates identifiers (entity id, key, system name), the same values also land in `details` so agents need not parse the prose. Scope (design-1 Codex recount): **127 plain `Error`/`RangeError` constructor throws across 31 non-excluded files** plus 3 `TypeError`s in `layer.ts` — the world layers, component/entity/resource stores, json helpers, serializer boundary checks, and the standalone utilities including `synthetic-playtest`, `ai-playtester`, `behavioral-metrics`, `random`, `game-loop`, `snapshot-diff`, and `apply-tick-diff`. The grep `throw new (Error|RangeError|TypeError)\(` over `src/` must come back EMPTY outside the excluded modules at the end — the completeness gate, enforced by a source-scan test (loc-budget pattern) so future sites cannot regress to uncoded throws.

### 4. Relationship to the session-stack convention (documented, not unified)

The session stack carries codes in `details.code` on `SessionRecordingError` subclasses; the core now carries `code` first-class. Both appear in the api-reference table with their discrimination idiom. Unification is a 1.0-surface question (objective `v1-surface`) — changing either shape today is breaking for existing consumers.

### 5. Tests & docs

- `tests/engine-error.test.ts`: class behavior (code/details/name/instanceof incl. `EngineRangeError instanceof RangeError`), `isEngineError` guard, representative migrated sites per domain assert BOTH the unchanged message and the new code, and the **no-uncoded-throws source scan** (§3 completeness gate).
- Existing suites are the message-compatibility proof: zero modifications expected; any failure means a message changed — a migration bug.
- api-reference: `EngineError`/`EngineRangeError`/`EngineTypeError`/`isEngineError` + the error-code table. The `TickFailure` section must state the two-level distinction explicitly: top-level `code`/`details` classify the FAILURE (e.g. `system_threw`, `world_poisoned`); nested `error.code`/`error.details` carry the thrown EngineError — agents branch on the right level. Guides: one paragraph in `ai-integration.md` (branch on `code`, not message). Changelog: additive, c-bump; the "errors now carry codes" callout. ADR: code-first-class vs details.code rationale + non-unification decision.

## Risks

- A few sites build messages dynamically in helpers (`world-internal.ts` validators) — the helper signatures gain a code parameter or fixed per-helper codes; verify no message drift via the untouched test suite.
- `instanceof Error` subclassing across realms is irrelevant here (single-realm engine).
- LOC budgets: touched files gain ~0 net lines per site (same line count); `engine-error.ts` ~70 lines.
