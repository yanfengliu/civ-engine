You are reviewing the civ-engine codebase. Repository at the current working directory.

## Context: this is iteration 7 — broader sweep after multi-commit convergence chain

Iterations 1–6 (today, 2026-04-26) closed a long CommandTransaction atomicity chain (`docs/reviews/full/2026-04-26/{1..6}/REVIEW.md`). Iter-6 reached convergence with all three reviewers reporting clean (Codex caught H_ITER6 → fix shipped v0.7.3). v0.7.4 followups landed: dropped two `as any` casts, broke a circular value-import by relocating `SYSTEM_PHASES`/`SystemPhase` from `src/world.ts` to `src/world-internal.ts`.

**Current HEAD:** v0.7.4 (`c2f8db3`). 608 tests pass. typecheck/lint/build clean.

This is a **fresh broader sweep**, not a single-Critical convergence check. Read iter-6 REVIEW first to know what's already been verified. Do NOT re-flag anything explicitly closed in iters 1–6 unless you have evidence it regressed.

## Your job

Review the entire codebase end-to-end. Focus on:

1. **Anything new since iter-6's `d58a2f6`** — commits `0049ff6`, `eb5b7be`, `860b212`, `c2f8db3` (test fix, freeze grid, doc audit, cast/import cleanup). Verify these landed without regressions.

2. **Subsystems iter-1–6 didn't focus on.** The chain centered on `command-transaction.ts` and `layer.ts`. Other subsystems may have accumulated drift:
   - `entity-manager.ts` — recycling correctness, generation overflow
   - `component-store.ts` — sparse-array invariants, dirty tracking
   - `spatial-grid.ts` + `world.ts` grid delegate — cell-set cloning, bucket math, the new `Object.freeze` boundary
   - `event-bus.ts` — payload validation, listener isolation
   - `command-queue.ts` + `world.ts` command path
   - `resource-store.ts` — pool/rate/transfer arithmetic, FIFO transfer ordering, fail-fast on poisoned worlds
   - `pathfinding.ts` — heap correctness, tie-breaking, maxCost edge cases
   - `behavior-tree.ts` — reactive node preempt/cleanup
   - `noise.ts`, `cellular.ts`, `map-gen.ts` — determinism, bounds
   - `serializer.ts` (snapshot v5) — round-trip fidelity, version validation
   - `client-adapter.ts` — protocol shape
   - `world-internal.ts` (new file) — ensure helpers genuinely standalone

3. **Cross-cutting concerns:**
   - Memory leaks (unbounded growth, never-cleaned listeners/maps)
   - Public API consistency (typed generics flow through every callback signature)
   - Doc accuracy: api-reference, ARCHITECTURE, guides match v0.7.4 runtime
   - Test gaps where contracts are asserted only by example

4. **Design / cleanliness:**
   - Files > 500 LOC (AGENTS.md rule)
   - Duplicated logic, cross-boundary leaks
   - Composition vs inheritance violations
   - Dead code

## Output format

```
# Review Summary
<2-3 sentences on overall state>

# Critical
<numbered findings; "None observed." if clean>

# High
<numbered findings; "None observed." if clean>

# Medium
<numbered findings; "None observed." if clean>

# Low
<numbered findings; "None observed." if clean>

# Polish / Nitpicks
<deliberately optional; only mention if reviewer thinks it materially helps. AGENTS.md says no fake findings.>

# Notes & Open Questions
<open questions only>
```

## Rules
- Be specific: file:line, exact symbol, exact bug. No "consider refactoring X" without a concrete why.
- Do NOT modify files.
- Do NOT re-flag deferred items from iter-1–6 unless they regressed.
- Documentation accuracy: flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides (api-reference.md, ARCHITECTURE.md, guides/*).
- If genuinely clean: say so. Convergence is a valid finding.
