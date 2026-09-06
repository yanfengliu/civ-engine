# Strict Mode — Design Iteration 2 Review (2026-04-29)

**Disposition:** Iterate (cosmetic). Codex ACCEPT with 3 nits; Claude ITERATE flagging that §5 "Lifecycle / Contracts" still carried v1 fossil text contradicting §3 / §10 / ADR 39. Both reviewers concur that iter-1's structural findings are addressed.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Iter-1 finding dispositions

All 12 iter-1 findings verified ADDRESSED by both reviewers (random gating, deleteState/deleteMeta, runTick setup-clearing, commit non-bypass, depth counter, isInMaintenance, submit non-gating, doc surface, perf claim, applySnapshot forward-compat, listener ordering, runTick anchor).

## v3 cleanups

Pure doc-text fixes; no structural changes.

- **§5 Construction**: field initialization list now reads `_maintenanceDepth = 0` (not the v1 boolean `_inMaintenance = false`).
- **§5 First tick / runMaintenance / applySnapshot subsections**: rewritten to describe the depth counter, no-op nesting, and the forward-compat increment. Drops the v1 "open question" sentence about whether nesting throws.
- **ADR 37**: rewritten to use `_maintenanceDepth` and to explicitly document `World.deserialize` as static (the new world's `_inSetup` is what permits the work, not a `_inMaintenance` set on `this`).
- **§12 Versioning**: `isInMaintenance` added to the new-methods list (was already in §4.2 and §15 but missing here).
- **§3 Field table**: clarified the "Set when" wording for `_inTickPhase` (drops the ambiguous "via `onTick`" phrasing).

Re-review as design-3. Expected: ACCEPT.
