# mcp-server — design review, iteration 2 (confirmation)

**Reviewed:** DESIGN.md v2. **Reviewer:** Gemini (3.1-pro plan, text-only directive honored) — serving as the second reviewer since its design-1 pass failed to spawn. Codex quota-exhausted (protocol). Contamination audit clean.

## Verdict

**CONVERGED.** All design-1 resolutions verified against the live codebase: H1 (`hydrateAtTick` exists module-private; the public `snapshotAtTick` wrap with `diffSince`'s failure-crossing guard is feasible and sufficient for all three consuming tools); H2 (private subpackage + node entry + per-package lockfile/audit + CI sequencing coherent); M1–M4 (BundleQuery field surface, BundleCorpus immutability + `skipInvalid`/`invalidEntries`, `perTickDeltas` ReadonlyMap conversion necessity).

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| nit | — | "15-field" filter surface is actually 16 fields (17 in the tool schema after the key/keyPattern split) | FIXED in v2.1 (count corrected) |

## Disposition

Design CLOSED at v2.1; implementation proceeds (engine 1.1.0 prerequisites first, then the subpackage).
