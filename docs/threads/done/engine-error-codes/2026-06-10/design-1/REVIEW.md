# engine-error-codes — design review iteration 1

**Reviewers:** Codex xhigh, Gemini plan-mode, Claude max (DESIGN v1 piped; Codex/Claude with file tools).

**Verdicts:** Gemini approved 5/6 with one gate issue; Codex 4 MEDIUM + 1 LOW; Claude approved-with-adjustments (2 of the design's checkable claims were false).

| # | Sev | Reviewer(s) | Finding | v2 disposition |
|---|-----|-------------|---------|----------------|
| 1 | MEDIUM | Codex + Claude (convergent) | Duck-typed `isEngineError` false-positives on Node `ErrnoException`s (`'ENOENT'` — string `code` on an Error; the engine ships FileSink). | instanceof-based over the three classes. |
| 2 | MEDIUM | Codex | `createErrorDetails` strips codes — the in-tick failure path (`TickFailure.error`), the one agents actually read, would stay prose-only. | Optional `code`/`details` pass-through on the serialized error shape (additive). |
| 3 | MEDIUM | Codex + Gemini (convergent) | Three uncoded `TypeError`s in `layer.ts`; the completeness scan missed the class. | `EngineTypeError extends TypeError`; scan covers all three constructors. |
| 4 | MEDIUM | Codex | "Unique engine-wide" already false across existing families (`query_invalid`, `schema_unsupported`, `world_poisoned` collide today). | Uniqueness scoped to the new core namespace; discrimination documented as (family, code); new-collision avoidance via literal grep. |
| 5 | MEDIUM | Claude | `error.name` flips to subclass names in `TickFailure.error.name` — recorded bundles + client wire messages see a real delta the "class-compatible" claim implied away (in-repo blast radius verified zero). | Named explicitly in the compat section + changelog; deliberately not papered over. |
| 6 | LOW | Codex | Scope undercounted: 127 sites / 31 files (+3 TypeErrors), not ~70; public utilities enumerated. | Estimate corrected; module list added. |
| 7 | NIT | Claude | Garbled self-correcting sentence in §1 of the authoritative artifact. | Rewritten. |

Approved unchanged: dual-class shape (instanceof RangeError preservation — Claude noted zero in-repo reliance, external-only courtesy, stated honestly), message-byte-identical migration mechanics + test-suite-as-proof (necessary; supplemented by the name-delta callout), hot-path cost (Gemini verified details allocation is throw-branch-only), non-unification with the session stack, prefix-grouped taxonomy.
