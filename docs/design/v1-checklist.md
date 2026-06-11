# 1.0 checklist — the breaking-decision menu

Produced by the `v1-surface` objective (v0.8.23; design + reviews in `docs/threads/done/v1-surface/`). The non-breaking groundwork — explicit export curation + two-level surface pin, the cross-family error-code read-side mirror (`getErrorCode`, ADR 47), and the deprecation policy — is already shipped. Each item below is a **human decision**; approving an item triggers its work. The `a`-bump to 1.0.0 is itself human-gated per the versioning convention.

## Decisions

| # | Decision | Recommendation | Migration / risk notes |
|---|---|---|---|
| 1 | **Flip `WorldConfig.strict` default to `true`** | Flip at 1.0 — **APPROVED by owner 2026-06-11** | One config line (`strict: false`) opts legacy consumers out; the violation error names the fix. **Mandatory companion clause:** `deserialize`/`applySnapshot` must default ABSENT `strict` to `false` (snapshot-versioned), or every pre-1.0 snapshot/bundle silently becomes strict on load and old replays break. |
| 2 | **Snapshot v6: carry poison state** | Ship with 1.0 | `poisoned: TickFailure \| null` carried **for inspection**; `applySnapshot`/`deserialize` keep clearing live poison by default with an opt-in `{ restorePoison: true }` — replay tooling (openAt on failure-terminated bundles, debugger inspection) relies on clean restores, so naive restore would be a behavioral break (design-1 finding). v5 snapshots read as v6-with-null (v4→v5 precedent). |
| 3 | **Trim: `create*DebugProbe` ×3** | Fold behind `WorldDebugger` | WorldDebugger already composes them; exporting both layers is redundant. Documented in api-reference — removal is a documented-API break, do it before the freeze per the no-grace rule. |
| 4 | **Trim: `FORBIDDEN_PRECONDITION_METHODS`** | Remove from public surface | Test-support constant; the transaction tests import it from src directly either way. |
| 5 | **Trim: `gridPathPassabilityVersion`** | Remove from public surface | PathCache internal; `createGridPathCacheKey` is the public surface for cache keying. |
| 6 | **Trim: `clearRunningState`** | **Bless (keep)** | Guide-documented BT escape hatch — cutting it is a real documented-API break with known use cases (design-1 reclassification). Keep unless usage data says otherwise. |
| 7 | **Declare 1.0.0** | After 1–6 are decided and landed | Includes the human `dist/index.d.ts` diff review step (the name pin does not gate signatures/shapes). |

## Freeze list (1.0 declares as policy, not just current fact)

- Node **>= 20** engines floor; **ESM-only** (`"type": "module"`).
- **Zero runtime dependencies** — frozen as policy.
- `export type` hygiene for all non-value exports; no star-exports in `index.ts` (pinned by test).
- JSON-only component/state data discipline; tick lifecycle; determinism contract items 1–10; schema-version markers.
- The layered `World` internals (world-core … world-tick) remain non-public.
- Error families: core = code-first-class; session and strict-mode = `(message/args, details)` construction with read-side `code` mirrors; `getErrorCode` is the one branch key; `details.code` is the wire format forever (ADR 47).
