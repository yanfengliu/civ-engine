# 1.0 surface proposal — DESIGN

**Objective:** `v1-surface` · **Status:** v3 (impl-1 adjustments folded: src-level pin, strict-mode third family, sanitized foreign-details pass-through; post design-1: two independent Gemini lenses — API-design lens CONVERGED with a type-surface gap + freeze-list omissions; adversarial release-engineering lens found 5 real implementation-layer risks, all folded in; Codex/Claude CLIs quota-limited per the unreachable-CLI protocol) · **Origin:** full-review 2026-06-10 forward-looking item 5. Wave objective 7/7 (final). **Scope split:** (a) reviewed proposal, (b) NON-breaking parts implemented now, (c) breaking decisions packaged as a reviewed recommendation menu for the human — the `a`-bump itself is human-gated per the versioning convention.

## Problem

The engine is at v0.8.22 with 105 runtime exports plus a large type surface, accreted across 9 roadmap specs and a 7-objective improvement wave. Pre-1.0, `b`-bumps may break consumers; at 1.0 the surface freezes under semver. Freezing an uncurated surface locks in accidents: star-exports leak whatever a module happens to export, two error-shape families coexist (ADR 45 deferred unification exactly here), one behavioral asymmetry (poison state does not survive snapshots) and one unsafe default (`strict: false`) would become permanent contract.

## Inventory (verified against `dist/index.js`)

105 runtime exports: World + 9 standalone utilities (Layer, SpatialGrid via World, OccupancyGrid/Binding/Subcell, PathService trio, VisibilityMap, PlayerObserver, RenderAdapter, ClientAdapter, CommandTransaction), the session/corpus/viewer/fork/strict stack, playtest harnesses, behavioral metrics (11 factories + 2 runners), behavior trees, map-gen/noise/cellular, RNG, debug probes, 9 schema-version markers, 3 core error classes + isEngineError + 10 session-family error classes, scenario runner, history recorder + summarizer. `src/index.ts` holds 25 star-exports (design-1 recount), two of which traverse barrels with their own re-export chains (`world.ts` re-exporting world-types/world-internal symbols like `SYSTEM_PHASES`; `occupancy-grid.ts` barreling occupancy-types like `SubcellPlacement`), plus one load-bearing side-effect import (`import './session-internals.js'` — the World declaration-merge for the recorder's `__payloadCapturingRecorder` mutex slot).

## Proposal

### 1. Export curation: star-exports → explicit lists (NON-BREAKING, implement now)

Replace every `export *` in `index.ts` with an explicit named list reproducing the CURRENT surface exactly. Verification is two-level (design-1 adversarial lens: runtime names alone are insufficient — type-only exports are erased at runtime, and barrel-chain symbols can vanish silently):

- **Runtime level:** sorted `Object.keys(import('dist/index.js'))` equality against a committed allowlist (the v0.8.15 split's proven verification pattern, now permanent as `tests/public-surface.test.ts`).
- **Type level:** the test parses the now-flat `src/index.ts` brace blocks and pins the sorted set of ALL exported names — types included — against a second committed allowlist. Post-curation, src IS the closure (no star-exports, no barrel traversal — the no-star invariant in the same test keeps it that way), and parsing src instead of `dist/index.d.ts` removes the build-step dependency from `npm test` (impl adjustment from the v2 text; the dist-level `.d.ts` diff review remains a 1.0-checklist step, which also covers the build-output concern).
- **Side-effect import preserved explicitly** (`./session-internals.js`); the existing session-recorder suite already fails hard if the declaration-merge disappears, which is the behavioral backstop.
- **Hygiene:** all non-value exports move to `export type { ... }` form during the rewrite (prevents accidental empty runtime exports and makes the d.ts diff review tractable).
- **Stated plainly (anti-oversell):** the pin gates NAMES, not signatures or type shapes. Signature/shape drift is gated by typecheck + the test suite + api-reference review; the 1.0 checklist adds a human `dist/index.d.ts` diff review step at the freeze itself. api-extractor stays rejected (heavy dependency vs the repo's zero-dep policy; the two-level pin + checklist step achieve the gate).

### 2. Error-shape unification via additive mirror (NON-BREAKING, implement now)

ADR 45 deferred (family, code) unification to this objective. Unifying ON the session shape (`details.code`) would demote the core's first-class `code`; removing `details.code` breaks every session consumer. The non-breaking resolution, corrected by design-1: `SessionRecordingError`'s constructor stays `(message, details?)` — the base class gains `readonly code: string | null` **extracted** from `details.code` when it is a string, `null` otherwise (not every session throw site carries a code; `null` is honest, no invented `'unknown'` sentinel). A new cross-family helper `getErrorCode(e): string | null` (in `engine-error.ts`; imports `session-errors.ts` and `world-strict-mode.ts` — both cycle-free, each imports only json types) returns the code from ANY engine family — core, session, or strict-mode (`StrictModeViolationError` gains the same one-line first-class mirror; impl-1 found it was a third `details.code` family the v2 text missed) — and `null` for foreign errors. `createErrorDetails` passes the code through to `TickFailure.error.code` for all three families (session/strict details sanitized at that boundary, preserving the objective-C invariant). `isEngineError` stays instanceof-scoped to the three core classes. The construction asymmetry (core is code-first, session is message-first) is permanent and documented — the unification target is the READ side, which is what agents branch on. `details.code` remains forever as the recorded-wire-format field. ADR 47 supersedes ADR 45's "deferred" with "read-side mirrored, not unified".

### 3. Deprecation policy (doc, implement now)

Post-1.0: deprecation happens in a minor (`@deprecated` TSDoc + changelog callout + guide migration note), removal happens in the next major, never sooner; deprecated APIs keep tests until removal. Pre-1.0 (now → 1.0): anything slated for removal is removed BEFORE the freeze — there is no deprecation grace pre-1.0.

### 4. Strict mode default (BREAKING — recommendation to human)

`strict: false` today. Every AGENTS-grade consumer benefits from the mutation gate; the engine's thesis argues strict-by-default at 1.0 with `strict: false` as the explicit opt-out. Migration: one config line for non-strict consumers; the violation error names the fix. **Snapshot-compatibility clause (design-1 adversarial — the trap):** serialized configs from pre-flip engines carry `strict: undefined`; a 1.0 `deserialize`/`applySnapshot` MUST default absent `strict` to `false` (snapshot-versioned behavior), otherwise every legacy snapshot and recorded bundle silently becomes strict on load and old replays break. With that clause, recorded-bundle replay is unaffected. Recommendation: **flip at 1.0, with the clause**.

### 5. Snapshot v6: carry poison state (recommendation to human — reclassified by design-1)

Today a poisoned world serializes WITHOUT its poison; `applySnapshot` explicitly clears poison/lastTickFailure (world.ts "Failure / poison state — clear"), and replay tooling RELIES on clean restores (`openAt` on failure-terminated bundles, debugger inspection of failing snapshots). Naively restoring poison would therefore change the `applySnapshot`/`openAt` contract — a behavioral break, not a version bump (design-1 adversarial lens; the v1 text's "breaking-lite" classification was wrong). Corrected shape: v6 adds optional `poisoned: TickFailure | null` **carried for inspection**; `applySnapshot`/`deserialize` keep clearing live poison by default and gain an opt-in `{ restorePoison: true }` for tooling that wants terminal-state fidelity. Old v5 snapshots read as v6-with-null (v4→v5 forward-compat precedent verified in the deserialize version switch). All existing flows preserved; the data stops being lost. Recommendation: **ship with 1.0**.

### 6. Surface trims (BREAKING — recommendation list to human)

Candidates: the three `create*DebugProbe` factories (WorldDebugger composes them; exporting both layers is redundant), `FORBIDDEN_PRECONDITION_METHODS` (test-support constant), `gridPathPassabilityVersion` (PathCache internal). `clearRunningState` is RECLASSIFIED by design-1: it is a guide-documented BT escape hatch, so cutting it is a documented-API break — recommend **bless (keep)** unless the human has usage data saying otherwise. Each remaining candidate either gets folded behind its owning facade or explicitly blessed in the §1 curation list. Per §3 there is no pre-1.0 deprecation grace — decide, then cut or bless.

### 7. Freeze list (1.0 declares, design-1 additions)

Node >= 20 engines floor; ESM-only (`"type": "module"`); **zero runtime dependencies as frozen policy** (not just current fact); `export type` hygiene as a standing convention; JSON-only data discipline; tick lifecycle; determinism contract items 1–10; version markers; the layered World internals as non-public. No engine-behavior changes ride the 1.0 commit beyond §4/§5 if approved.

## Deliverables

1. This reviewed proposal.
2. Implemented now (non-breaking): §1 export curation + two-level surface-pin test; §2 session-error code mirror + `getErrorCode` + tests + api-reference; §3 policy section in `docs/guides/public-api-and-invariants.md`; ADR 47.
3. `docs/design/v1-checklist.md`: the breaking-decision menu (§4 strict default with the snapshot clause, §5 snapshot v6 opt-in poison carry, §6 trim list with clearRunningState pre-marked bless) + the freeze list (§7) + the d.ts-diff review step — the artifact the human approves item-by-item to trigger the 1.0 work.

## Test plan

Surface-pin test: (a) sorted runtime export names == committed allowlist; (b) sorted `dist/index.d.ts` exported names (types included) == committed allowlist; failing message names the delta. Mirror tests: every `SessionRecordingError` subclass exposes `code === details.code` when present and `null` when absent; `getErrorCode` reads core (`EngineError` family), session (`SessionRecordingError` family), and returns `null` for plain/foreign errors. Curation verification: runtime export list byte-identical before/after the rewrite (one-shot script during implementation, then the pin test holds the line). Existing suites unchanged.
