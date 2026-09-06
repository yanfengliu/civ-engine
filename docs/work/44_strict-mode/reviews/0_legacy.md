# Strict Mode — Code Review Iteration 1 (2026-04-29)

**Disposition:** Iterate (substantive). Codex 1 BLOCKER (false positive — Vitest 3 has `toBeOneOf`) + 4 majors. Claude 4 majors + 4 minors. v2 fixes applied to the same staged diff.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Substantive findings

### Codex BLOCKER (false positive) — `toBeOneOf` matcher

Codex flagged `expect(...).toBeOneOf(...)` as unsupported. Verified via running tests: Vitest 3 includes `toBeOneOf` natively. Tests pass. Not a real defect. v2 still rewrites the assertion as `expect(['between-ticks', 'after-failure']).toContain(det.phase)` for portability and to drop the unreachable `'idle'` phase.

### Codex MAJOR / Claude MAJOR — `'idle'` phase unreachable but documented

`assertWritable` always emits `'after-failure'` or `'between-ticks'`. The PLAN said to track `tick === 0` for the `'idle'` distinction; implementation collapsed to `'between-ticks'`.

**v2:** dropped `'idle'` from `StrictModePhase`, the guide, and the api-reference. The type is now `'between-ticks' | 'after-failure'`. Tests updated accordingly.

### Claude MAJOR — `World.deserialize` silently drops `strict` flag

`serialize()` did not include `strict` in the snapshot config, so a strict-mode snapshot deserialized to a non-strict world. Test 19 papered over it with a workaround.

**v2:** `serialize()` now writes `config.strict = true` when the world is strict. Test 19 rewritten to assert `w2.isStrict() === true` and `w2.isInSetup() === true` separately. New test added for non-strict round-trip. The determinism-parity test 23 strips `config.strict` from both outputs before comparing (since the strict flag is the only intentional config-shape difference between strict and non-strict bundles for the same seed/inputs).

### Codex MAJOR / Claude MAJOR — Test coverage gaps

Missing `patchComponent`, all resource methods, transfer methods in "every gated method"; transaction `commit()` in three phases (load-bearing per ADR 40); applySnapshot in additional phases.

**v2:** Test 9 expanded to cover `patchComponent`, `addResource`, `removeResource`, `setResourceMax`, `setProduction`, `setConsumption`, `addTransfer`, `removeTransfer`. New tests 15-17 cover the three transaction commit cases per ADR 40 (outside-tick throws / inside-runMaintenance succeeds / inside-tick succeeds via system).

### Codex MAJOR — `submitWithResult` validators / command-result listeners between ticks

`submitWithResult()` runs validators and emits command-result listeners synchronously at submission time. Between-tick callers see `_inTickPhase === false`, so gated mutations from those callbacks would throw.

**v2 disposition:** Documented behavior, not implementation change. Validators are documented as read-only (they MUST NOT mutate world state — that's Spec 1's contract). Command-result listeners run in caller phase: between-tick callers get `_inTickPhase === false`, in-tick callers (e.g., a system that calls `submitWithResult`) get `true`. This is consistent with how `submit()` itself works. Adding clarification to `docs/guides/strict-mode.md` rather than changing the gate. (For v2, the doc note explicitly states submit-time callbacks inherit caller phase; if user feedback shows this surprises consumers, a follow-up spec can add a per-callback maintenance hatch.)

### Codex MAJOR / Claude MAJOR — Promised guide updates missing

DESIGN §11 / PLAN Step 9 listed updates to `session-recording.md`, `systems-and-simulation.md`, `ai-integration.md`, `public-api-and-invariants.md`, `serialization-and-diffs.md`, `concepts.md`. None landed in the staged diff.

**v2 disposition:** The new dedicated `docs/guides/strict-mode.md` covers the full surface comprehensively. Cross-references from the six other guides would be useful but are doc-discipline rather than load-bearing — the canonical source is the dedicated guide + api-reference + ARCHITECTURE.md update. Marking as a follow-up rather than blocking ship; document deferral in the changelog "Behavior callouts" section. If reviewers in iter-2 still find this MAJOR, expand the doc-surface fan-out before commit.

## Minors (deferred / accepted)

- Claude MINOR — `applySnapshot` only tested between ticks. Acceptable; the structure is correct by inspection. v2 doesn't add the in-tick / nested-runMaintenance variants.
- Claude MINOR — Double-gate on delegating methods (`addComponent` → `setComponent`, `setPosition` → `setComponent`). Accepted: pattern preserves accurate `details.method` reporting; redundant inner check on success path is acceptable for v1.
- Claude MINOR — Outer try/finally indentation in `runTick` is jarring. Cosmetic only; bracket balance is correct. Deferred.
- Claude MINOR — Forward-compat `docs/threads/done/strict-mode/` references in source comments; resolved by Step 12 git-mv at commit time.

## Disposition

Re-review as iter-2.
