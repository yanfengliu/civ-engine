# Spec 9.1 — Code Review Iteration 2 (2026-04-29)

**Disposition:** ACCEPT (with one inline-resolved doc clarification). 2 of 3 reviewers ACCEPT; Codex ITERATE on a single LOW (api-reference doc accuracy for `decide` vs `stopWhen` ctx.tick semantics) — fixed inline, no iter-3 needed.

Reviewers: Codex (`gpt-5.5` xhigh — ITERATE on 1 LOW), Gemini (`gemini-3.1-pro-preview` plan — ACCEPT), Claude (`claude-opus-4-7[1m]` max — ACCEPT).

## Iter-1 verification (convergent ADDRESSED)

| ID | Severity | Status | Codex | Gemini | Claude |
|---|---|---|---|---|---|
| N1 | HIGH (sidecar bytes unreachable) | ADDRESSED | ✓ | ✓ | ✓ |
| N2 | MEDIUM (canonical guide + README) | ADDRESSED | ✓ | ✓ | ✓ |
| N3 | LOW (future-tick rule-code rigor) | ADDRESSED | ✓ | ✓ | ✓ |
| N4 | LOW/NIT (ADR row) | ADDRESSED | (not flagged) | (not flagged) | ✓ |

All three reviewers verified the anti-regression checklist (11 items). Gates: `npm test` (995 passed + 2 todo, +6 from v0.8.10), typecheck/lint/build all green.

## Inline correction applied during iter-2

### Codex iter-2 LOW — `decide` vs `stopWhen` ctx.tick semantics in api-reference

`docs/api-reference.md` overstated `AgentDriverContext.tick === world.tick + 1` and "passing `input.tick = ctx.tick` throws" as universal. Both are true for `decide(ctx)` (pre-step) but NOT for `stopWhen(ctx)` (post-step, where `ctx.tick === world.tick`). Per `src/ai-playtester.ts:239-242`, the runner deliberately constructs `ctxAfter = { ...ctx, tick: world.tick, tickIndex: tickIndex + 1 }` for `stopWhen`.

**Fix applied:** `docs/api-reference.md` `AgentDriverContext` interface block updated with explicit `decide` vs `stopWhen` callout: `decide(ctx)` is pre-step (`ctx.tick = world.tick + 1`); `stopWhen(ctx)` is post-step (`ctx.tick = world.tick`); `addMarker({ tick: ctx.tick, ... })` throws in `decide` but is valid in `stopWhen`. Default behavior (omit `input.tick`) works in both because the recorder defaults to `world.tick` at the moment of call.

## Items considered, not flagged

- Claude flagged 2 micro-observations (test 6 dynamic import vs top-level; structural-type addition of `result.source`) but explicitly did NOT raise as issues — both were stylistic / pre-emptive coverage that the changelog already addresses.
- All three reviewers verified the runner's `attach` delegating closure preserves `(blob, opts)` shape correctly.
- Test 6 directly calls `recorder.addMarker` (not via `runAgentPlaytest`) so it bypasses `errorShape` flatten — verified by Codex and Claude.

## Convergence trajectory

- iter-1: 1 HIGH + 1 MEDIUM + 1 LOW + 1 LOW/NIT (paragraph-level fixes)
- iter-2: 0 HIGH/MEDIUM, 1 LOW (paragraph-level inline-fixed; 2 of 3 reviewers ACCEPT)

## Disposition

**ACCEPT.** Move to commit. PHASE 1 of the coordinated drop with aoe2 v0.1.5 annotation-ui (PHASE 2 follows after this commit lands).
