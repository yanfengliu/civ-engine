# Spec 8 design iter-4: CONVERGED

Both Codex and Opus ACCEPT iter-4. Spec ready for implementation.

## Convergence trajectory

| Iter | Codex | Opus | Substantive |
|------|-------|------|-------------|
| 1 | 3 HIGH + 2 MED + 1 LOW | 4 HIGH + 6 MED + 4 LOW + 5 NIT | Typing, version mismatch, immutability, NaN-JSON, rate formula, percentile method, rejected-commands |
| 2 | 1 HIGH + 1 MED | 1 HIGH + 1 MED + 6 NIT | H-EXEC-SEMANTICS (validator vs execution), failedTickRate divzero |
| 3 | 1 MED + 2 NIT | 1 MED + 1 NIT | Stale §12 NaN/9-builtins, ADR 24 9-builtins, §17 stale overload |
| **4** | **ACCEPT (1 NIT)** | **ACCEPT (2 NIT)** | — |

## Iter-4 NITs (non-blocking)

- **Codex NIT:** `failedTickRate` can exceed 1 when zero-duration failure bundles are mixed with positive-duration bundles (numerator from former, denominator from latter only). If this is intended, document it. **Action:** trivial doc clarification — not blocking.
- **Opus NIT-1:** Status header bookkeeping says "2 NITs" but iter-3 had 3 distinct NITs (all addressed). Cosmetic.
- **Opus NIT-2:** §9 field-list enumeration missing `commands[].result.accepted` and `executions[].executed` (parallel to the ADR 24 issue iter-3 caught). §9 isn't a normative source for which fields metrics read; non-blocking.

These can be folded during implementation or left as documentation polish.

## Ready for implementation plan
