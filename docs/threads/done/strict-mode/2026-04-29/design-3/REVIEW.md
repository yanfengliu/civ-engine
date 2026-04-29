# Strict Mode — Design Iteration 3 Review (2026-04-29)

**Disposition:** ACCEPT (after one-line fix). Both reviewers verified the iter-2 fossils were cleared at the four targeted locations (§5 subsections, ADR 37, §12 versioning, §3 wording). Codex + Claude flagged one remaining v1-style `_inMaintenance` reference at §6 line 204 ("applySnapshot, deserialize — covered via `_inMaintenance` for duration"). Single-line fix applied to the same v3 doc; no structural changes.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Per-fix verification

- §5 Lifecycle subsections: PASS (depth counter, no-op nesting, forward-compat applySnapshot, static deserialize).
- ADR 37: PASS (`_maintenanceDepth` + static `World.deserialize`).
- §12 versioning: PASS (`isInMaintenance` listed).
- §3 `_inTickPhase` wording: PASS (unambiguous "top of `runTick`").

## Residual fix folded into v3

§6 line 204 now reads: "applySnapshot — covered via `_maintenanceDepth` increment for the duration of its internal mutation work; deserialize — static method, the fresh world's `_inSetup` (when strict) covers it." Aligned with §3 + ADR 37.

## Disposition

ACCEPT. Move to plan phase.
