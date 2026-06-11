# v1-surface — implementation review, iteration 1

**Reviewed:** full v0.8.23 diff (curation + pin test + error mirror + policy docs + checklist). **Reviewers:** two independent Gemini (3.1-pro plan) lenses per the quota protocol (Codex exhausted until 2026-07-10; Claude CLI session-limited): lens A = adversarial correctness; lens B = conformance (lens B failed to produce output across two attempts — provider instability; its scope was covered by driver verification noted below).

## Verdicts

| Lens | Verdict | Substantive findings |
|---|---|---|
| A | CONVERGED (with 2 gaps + 1 mismatch) | createErrorDetails omission; StrictModeViolationError third family; DESIGN dist-vs-src text mismatch |
| B | no output (provider failure ×2) | n/a — see incident note |

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| A-3 | MAJOR | `createErrorDetails` was not extended: session-family errors thrown in-tick lost their code on `TickFailure.error` — the agent-branching contract broke exactly where ADR 47 promised it | FIXED — all three families pass code through; non-core details sanitized at the boundary (objective-C invariant); pinned by an in-tick `SinkWriteError` test |
| A-2 | MEDIUM | `StrictModeViolationError` is a third `details.code` family `getErrorCode` missed. Lens A claimed handling it would create an import cycle — **driver verification disproved the cycle** (world-strict-mode has zero runtime imports), so the clean instanceof fix was available | FIXED — first-class `code` mirror on the class + `getErrorCode` branch; cycle-freedom documented |
| A-4 | MEDIUM | DESIGN v2 said the pin parses `dist/index.d.ts`; the implementation parses the now-flat `src/index.ts` (deliberate: no build dependency for `npm test`) | FIXED — DESIGN v3 documents the adjustment + rationale; dist-level d.ts diff review stays a 1.0-checklist step |
| A-1/5 | — | Surface equality, EntityRef dedupe, barrel-chain names, runtime graph linearity, extraction edge cases, enumerable-field safety: all verified clean | no action |
| (pin test) | — | The new pin caught `sanitizeForeignDetails` (module-internal helper) leaking into the package surface during the fix wave — removed from the curated list; module export ≠ package export, exactly the property the curation buys | FIXED |

## Incident note (recorded for the audit trail; lesson + AGENTS.md hardening in the follow-up commit)

During this iteration's review runs, gemini-cli in `--approval-mode plan` was observed WRITING to the working tree (its tool list includes `replace`): `src/index.ts` was twice rewritten with plausible-but-wrong content (names attributed to the wrong modules, invalid `.ts` import extensions, six names dropped) and a hallucinated test was injected into `tests/engine-error.test.ts` (wrong module, nonexistent constructor signature). The corruption was detected by the typecheck + the new surface-pin test, excised, and the curation regenerated deterministically from HEAD with no review subprocess running; final state verified by full gates (1181 passed + 2 todo) with recorded hashes. AGENTS.md's "plan mode is read-only" assumption is corrected in the follow-up process commit.

## Disposition

All findings fixed and verified; gates green. Ship as v0.8.23.
