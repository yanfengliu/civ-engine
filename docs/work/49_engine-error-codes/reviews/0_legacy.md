# engine-error-codes — implementation review, iteration 1

**Reviewed:** full v0.8.19 working-tree diff (130-site migration + engine-error.ts + pass-through + tests + docs). **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | 1 HIGH, 1 MEDIUM | details-vs-TickFailure JSON break; table over-promises details |
| Gemini | APPROVE | none ("no flaws found") |
| Claude | APPROVE w/ fixes | 1 MEDIUM-low (instrumentationProfile), 3 LOW (stale comment, doc nits, diff hygiene) |

Verified clean by reviewers: exactly 130 coded throws across 31 files, zero message drift (character-level comparison + unmodified pre-existing suite), correct class substitutions throughout, no import cycles (engine-error.ts is a runtime leaf), absent-not-null pass-through semantics safe under `toStrictEqual` and JSON cloning, completeness gate sound (session-fork.ts:274 is the acknowledged legacy gap), all five design-2 fixes landed, LOC budgets respected.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex 1 | HIGH | Non-JSON `details` (e.g. `{ cx: NaN }` from `findNearest(NaN, 0)` in a system) flows into `failure.details.error.details`, which `createTickFailure` JSON-asserts — the failure path itself throws `json_incompatible` instead of returning a `TickFailure` with `error.code: 'query_coords_not_integer'`. Reproduced live by reviewer. | FIXED — `details` sanitized to strict JSON at EngineError/EngineRangeError/EngineTypeError **construction** (non-finite numbers → `'NaN'`/`'Infinity'`/`'-Infinity'` strings, undefined entries dropped, non-JSON leaves stringified, cycles → `'[Circular]'`). Single consistent surface: direct catchers and TickFailure consumers see identical details. Pinned by a sanitization unit test + the reviewer's exact repro as a TickFailure test (`{ cx: 'NaN', cy: 0 }`). |
| Codex 2 | MEDIUM | api-reference table promises `{ x, y }`/`{ entity }`/`{ slot }`/`{ label }` details on occupancy/subcell/path sites that didn't carry them (first-pass migration skipped multi-line-close constructors) | FIXED — details enrichment pass over every interpolating site that lacked a payload (~38 sites: occupancy/subcell/path coordinates+entities+slots, layer bounds/dims, noise params, system constraint targets, system interval values, snapshot tick/key/entity, entity-manager indices/ids, transaction property names, meta key/value/owner, resource transfer id, policy offset/frequency, snapshot-diff/apply-tick-diff versions). Table rows updated to the now-true shapes; typecheck enforces JsonValue typing of every payload. |
| Claude 1 | MEDIUM-low | `instrumentationProfile` was the one `config_invalid` site without `{ field }` | FIXED — `{ field: 'instrumentationProfile' }` added |
| Claude 2 | LOW | `error.details` never JSON-asserted + stale JSON-shape invariant comment; NaN→null silent rewrite by cloneTickFailure | FIXED by the same construction-time sanitization (no non-JSON value can reach the clone); world-internal.ts comment rewritten to document the new invariant |
| Claude 3 | LOW | Doc nits: `setSpeedMultiplier` → `setSpeed`; `requireComponent` → `patchComponent`; meta doesn't route through `assertJsonCompatible`; changelog said 33 files (31) | ALL FIXED in api-reference + changelog |
| Claude 4 | LOW (process) | player-observation DESIGN.md rides in the diff | Will be excluded from the C commit (separate objective, commits with D) |
| Claude cosmetic | — | Trailing whitespace on ~24 migrated constructor lines | FIXED — targeted strip on migrated lines |

## Disposition

All findings addressed; full gates re-green (1152 passed + 2 todo). Iteration 2 launched as a confirmation round focused on the sanitization fix and enrichment accuracy.
