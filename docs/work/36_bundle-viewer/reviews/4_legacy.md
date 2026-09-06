# Bundle Viewer — Design Iteration 3 Review (2026-04-28)

**Disposition:** Iterate (cosmetic). Codex: 1 major + 2 minors. Claude: 2 majors + 2 minors. All findings are surface leftovers from the BYO-replayer removal in v3 — no new structural issues. v4 applies the four edits.

Reviewers: Codex (gpt-5.5 xhigh), Claude (opus xhigh).

## Iter-2 findings disposition

Both reviewers confirmed all iter-2 findings ADDRESSED in v3:
- Codex MAJOR-A (recordedRange overstates content): ADDRESSED in §5.1, §6 step 4, §11.
- Codex MAJOR-B (BYO replayer self-contradictory): structurally ADDRESSED via ADR 35 + dropped option, but text leftovers remain (see new findings).
- Codex MINOR (validation order): ADDRESSED in §6 step 1.
- Claude minor 1-5 (rationale, replayable bound, eager validation, NaN guard, folded diff.tick): all ADDRESSED.

## New findings against v3

Both reviewers converged on the same residue:

### F1 — `viewer.replayer()` docstring leftover (§5.1)

The class-method JSDoc still said "or returns the supplied one" / "neither `worldFactory` nor `replayer`." With the BYO replayer removed, the canonical API doc must match §6's correct prose. Severity: MAJOR (Claude); MAJOR-cluster (Codex).

**Fixed in v4:** docstring now reads "Lazily constructs and memoizes the internal SessionReplayer. Throws `world_factory_required` if no `worldFactory` was supplied."

### F2 — Generic-arity mismatch on `BundleCorpusEntry.openViewer` (§9.1)

`BundleViewerOptions` is declared with two generics (`TEventMap`, `TCommandMap`) but §9.1 passed three (including `TDebug`). TypeScript would reject. Severity: MAJOR.

**Fixed in v4:** §9.1 signature uses `BundleViewerOptions<TEventMap, TCommandMap>` while still parameterizing `BundleViewer<TEventMap, TCommandMap, TDebug>` on TDebug.

### F3 — ADR count drift (§12)

§12 said "append ADRs 32-34" but v3 added ADR 35. Severity: MINOR.

**Fixed in v4:** §12 now says "ADRs 32-35".

### F4 — Anachronistic "options validation" phrasing (§5.4)

§5.4's error contract listed "options validation" alongside metadata navigation, but with BYO replayer dropped there is no longer any options-validation step. Severity: MINOR (borderline nit).

**Fixed in v4:** removed "options validation" from the §5.4 list.

## Disposition

v4 applies the four surface edits. Re-review as design-4. Expectation: reviewers nitpick or accept.
