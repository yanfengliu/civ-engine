# Spec 5 (Counterfactual Replay) Design Iter-4 Review

**Date:** 2026-04-29
**Iteration:** design-4 → ACCEPT (proceed to plan-stage)
**Reviewers:** Claude `claude-opus-4-7[1m]` max ✓ ACCEPT; Codex `gpt-5.5` xhigh — UNREACHABLE
**Disposition:** ACCEPT (single-reviewer; Codex unable to produce a review this round)

## Codex unreachable

Codex CLI started normally but the read-only sandbox repeatedly rejected its PowerShell `Select-String` and complex `rg` invocations (see `tmp/review-runs/counterfactual-replay/2026-04-29/design-4/codex-raw.txt` lines 85, 540-580, 2200+, 4089). It exhausted its turn budget making blocked attempts and never emitted a final review block. Direct `cat`-style file reads succeeded; only the parameterized `Select-String` pattern matching was blocked. Per AGENTS.md "If a CLI is unreachable, proceed with the remaining reviewer and note the unreachable CLI in REVIEW.md."

This is a known Windows-specific Codex behavior: on PowerShell, Codex tends toward `Select-String` with complex quoting, which the read-only sandbox flags. The previous session's `lessons.md` note about `codex.cmd exec` and quiet capture is the workaround target; deferred since the v3→v4 diff is small enough that Claude's verification covers it.

## Claude ACCEPT — verification of v3→v4 fixes

Claude verified all four v4 changes against ground-truth source files:

| Fix | Verified against | Status |
|---|---|---|
| B1: §4.1 step 1 off-by-one | `src/session-replayer.ts:226-238` | ✓ Tick math correct: loop runs `t=start.tick..targetTick-1`, each iteration submits + steps, after final iteration `world.tick === targetTick`. |
| M1: `BundleTickDelta.events` type info | `src/session-bundle.ts:55` | ✓ `{type, data}` pairs match recorded event shape. |
| M2: ADR 7 symmetry vs map asymmetry | 3 doc locations cross-checked | ✓ Symmetry without map; asymmetric with map (`a` MUST be source, `b` MUST be fork). Constraint surfaced in `DiffBundlesOptions` doc, ADR 7, and §4.3. |
| M3: `stateDiff: TickDiff` covering 6 dimensions | `src/snapshot-diff.ts:43-52`, `src/diff.ts:6-32` | ✓ All six dimensions (entities, components, resources, state, tags, metadata) reportable. |

**Cross-checks Claude performed:**
- `CommandSequenceMap` orientation consistent with `Divergence.commandSequenceMap` produced during `run()`.
- `inserted`/`dropped` entries correctly classified as `forkOnly`/`sourceOnly` at `targetTick`.
- §4.1 step 3 walking source commands in original sequence order preserves submission order; no-substitution determinism guarantees equivalence invariant.
- ADR 4 sequence-consumption note (rejected commands consume sequences) unchanged and correct.

## Non-blocking observations (folded for plan-stage)

- §4.1 footnote "= 0 after hydration" for `nextCommandResultSequence` is true at hydration but the counter increments through openAt's loop before substitution begins. Implementation expectation about `assignedSequence` magnitudes; sharpen during plan-stage.
- §4.3 events-alignment paragraph doesn't spell out length-mismatch handling (analogous to commands' rule). Plan-stage spec touch-up.
- Marker comparison in `markersDeltas` doesn't explicitly state keying (likely by `Marker.id`). Plan-stage detail; rarely matters since fork bundles have empty markers by default.

## Disposition

**ACCEPT** — design is implementation-ready. Proceed to plan-stage. The non-blocking observations are spec touch-ups, not design issues. The four v3→v4 changes correctly address Codex iter-3's findings.

## Forward note

If a future re-review wants the second-CLI verification, the codex command needs to either:
- Avoid the PowerShell `Select-String` path (use `--allowedTools Read,Glob,Grep` analogue if codex exposes one), or
- Switch to `codex.cmd exec` with explicit pre-extracted diff input (per the prior `lessons.md` note about Windows reviewer noise).

Not blocking v4 acceptance; just a workflow improvement target.
