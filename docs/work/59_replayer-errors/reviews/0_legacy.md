# replayer-errors — review, iteration 1 (+ fixes verified by gates)

**Reviewed:** the 1.0.1 error-quality diff. **Reviewers:** Claude (fable-5 1m max, correctness) + Gemini (3.1-pro plan, coverage/docs). Codex quota-exhausted (protocol). Post-batch contamination audit clean.

## Audit verdict (the owner's question)

Empirically probed before any code change: most replayer failures were already coded and detailed, but **two failure modes were SILENT** (a worldFactory that forgets `applySnapshot` returned a tick-0 world with no error; a poisoned factory world was accepted outright) and **one was misleading** (non-bundle input produced "unsupported schemaVersion: undefined" or raw TypeErrors). Plus one bare builtin throw left in the family.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| C-M1 | MEDIUM | The new `factory_snapshot_not_applied` guard was blind at tick 0 (fresh worlds are also at tick 0 — the most common bundle shape), so the headline fix still missed `openAt(0)`/`forkAt(0)` | FIXED — tick equality is now cross-checked with structural fingerprints (alive-entity count, world-state key count, per-component entry counts); residual blindness only for a tick-0 snapshot structurally identical to a fresh world (rng/resources documented); pinned by a content-bearing tick-0 test |
| C-M2 / G-3 | MEDIUM | `fromBundle(null)` raw-TypeError'd (metadata deref BEFORE the guard; the guard itself deref'd null); `metadata.engineVersion` unasserted → raw `.split` crash | FIXED — null/primitive branch first; deref moved below the guard; engineVersion in the shape table with root-cause-only reporting; pinned for null/undefined/number/string inputs |
| C-M3 | MEDIUM | Making `ForkBuilderConflictErrorDetails` fields optional was a type-surface break under the freeze | FIXED — discriminated union: original codes keep REQUIRED sequence/tick; `until_tick_invalid` typed precisely |
| C-L / G-1 | LOW | api-reference: "last uncoded throw" inaccurate (`BuilderConsumedError` is code-less); the registration paragraph's precedence note got absorbed into the new paragraph | FIXED — "last builtin-class throw" wording + BuilderConsumedError nuance documented; precedence note restored to its own paragraph |
| G-2 | LOW | session-recording guide steps 1+2 both instructed applySnapshot after my edit | FIXED — enforcement note merged into step 2 |
| G-4/G-5 | MEDIUM (coverage) | No test proved selfCheck-path protection; no test proved correct factories don't false-positive on interim snapshots | FIXED — both added (selfCheck fixture needed a command payload: selfCheck no-ops on payload-free bundles, itself verified in passing) |

Verified clean by reviewers: guard ordering (shape→schema→version; poison→tick); no false positives across openAt/selfCheck/forkAt/viewer (applySnapshot sets tick unconditionally and never restores poison without opt-in); FactoryWorldLike is compile-enforced against World; handler_missing byte-identical at both sites; no new public names (guards module deliberately internal); budgets hold.

## Disposition

All findings fixed; gates green (1205 passed + 2 todo). Ship as 1.0.1.
