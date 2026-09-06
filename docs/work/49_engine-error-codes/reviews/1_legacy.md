# engine-error-codes — implementation review, iteration 2 (confirmation)

**Reviewed:** updated working-tree diff with all iteration-1 fixes. **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | 1 HIGH, 1 MEDIUM | sparse-array holes; `system_error` doc code |
| Gemini | CONVERGED | none |
| Claude | NOT CONVERGED | same two findings (MEDIUM + LOW) |

All iteration-1 fixes verified landed by all three reviewers: construction-time sanitization live in all three constructors with the asserted path confirmed; NaN repro pinned; all 130 sites swept with byte-identical messages and table-accurate details shapes; instrumentationProfile `{ field }`; comment + doc nits resolved.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex 1 / Claude 2 | HIGH (Codex) / LOW (Claude) | `sanitizeDetailsValue` used `Array.prototype.map`, which SKIPS sparse holes and preserves them — a surviving hole reads as `undefined` downstream and `assertJsonCompatible` throws, reviving the iteration-1 symptom on a narrower trigger (user-constructed EngineError with a sparse array, thrown in a system/handler) | FIXED — `Array.from(value, cb)` (does not skip holes; holes → `null`); regression test builds a sparse array imperatively and asserts dense `[1, null, 3]` |
| Codex 2 / Claude 1 | MEDIUM | The new docs taught `failure.code === 'system_error'`; the engine emits `'system_threw'` (world-systems.ts:74). Five spots: api-reference (×2), ai-integration, changelog, world-types.ts docstring, DESIGN.md — the flagship branch-on-codes example would never match | FIXED in all five spots; the propagation test now also asserts `failure.code === 'system_threw'` so the documented pair is pinned by test |
| (suite) | — | Repo docs-structure test rejects `impl-N` iteration dir names | Thread iteration dirs renamed to numeric (`1`, `2`, …) per convention |

Claude adjacent nit (no action): WeakSet is not pruned post-subtree, so shared non-cyclic references sanitize to `'[Circular]'` — lossy but deterministic and JSON-safe.

## Disposition

Both findings fixed; gates re-green (1152 passed + 2 todo). Iteration 3 launched as final confirmation.
