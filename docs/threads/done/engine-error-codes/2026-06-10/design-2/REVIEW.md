# engine-error-codes — design review, iteration 2 (confirmation round)

**Reviewed:** DESIGN.md v2 + pre-staged `src/engine-error.ts` / `tests/engine-error.test.ts`. **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | NOT CONVERGED | 3 MEDIUM (doc-text contradictions), 2 LOW |
| Gemini | CONVERGED | none |
| Claude | CONVERGED | 1 LOW (same json-taxonomy contradiction as Codex D2-3), 3 INFO |

All seven design-1 treatments verified adopted by all three reviewers (instanceof guard, createErrorDetails pass-through, EngineTypeError + 3-constructor scan, scoped uniqueness, name wire-delta, 127+3 recount, prose fix). Claude independently reproduced the site arithmetic (127 across 31 files + 3 TypeErrors) and verified zero in-repo `error.name`/snapshot assertions are affected by the wire delta.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex D2-1 | MEDIUM | DESIGN line 7 still says "~70" while §scope says 127+3 | FIXED in v3 — header count corrected |
| Codex D2-2 | MEDIUM | Line 11 "unique engine-wide" contradicts §taxonomy's core-namespace scoping | FIXED in v3 — goal restated as "unique within the core namespace; (family, code) across families" |
| Codex D2-3 / Claude LOW | MEDIUM | Code table row `state_not_json` contradicts the rule "all assertJsonCompatible sites use `json_incompatible`" | FIXED in v3 — table row corrected to `json_incompatible`; implementation already uses `json_incompatible` everywhere |
| Codex D2-4 | LOW | api-reference doc list omits `EngineTypeError` | FIXED in v3 — listed |
| Codex D2-5 / Claude INFO | LOW | `session-fork.ts:274` raw RangeError makes "session stack throws typed errors" overclaim | FIXED in v3 — acknowledged as excluded legacy gap (session family, out of scope) |
| Claude INFO | — | TickFailure carries codes at two levels (top-level classification vs error.code); api-reference must state the distinction | Adopted as api-reference requirement |
| Claude INFO | — | Gate test red until migration lands; don't commit ahead | Moot — migration landed same session before any commit |

## Disposition

2/3 CONVERGED; the dissent is doc-text-only (no architecture or taxonomy change — the implementation already embodies the resolved positions). DESIGN.md v3 applies all five fixes. Rather than a third standalone design round, implementation review iteration 1 is explicitly instructed to verify the five D2 fixes landed — design verification folds into the mandatory impl review without losing third-party confirmation.
