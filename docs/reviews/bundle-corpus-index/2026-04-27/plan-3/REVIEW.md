# Spec 7 Bundle Corpus Index Plan Review - Iteration 3

**Scope:** v3 implementation plan and verification against the plan-1 and plan-2 review findings.

**Verdict:** Rejected. Opus accepted, but both Codex reviewers found remaining concrete issues. The remaining gaps are bounded to doc-discipline specificity and a few tests/implementation snippets.

## Raw Outputs

- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`

Claude was reachable and returned `ACCEPT`.

## Findings

### Medium - README and roadmap tasks still allow stale "Spec 7 is future" language

Codex-1 found that the plan says to add a README row and mark the roadmap implemented, but does not explicitly remove current stale language that describes corpus indexing as future Tier-2 work or Spec 7 as proposed/not drafted.

**Action:** Make the README and roadmap tasks require scrubbing stale future/proposed language: update the Synthetic Playtest README row, add the Bundle Corpus row, fix public surface bullets, revise the Spec 7 roadmap section, and update the status tracker from proposed/not drafted to implemented v0.8.3.

### Medium - Behavioral metrics guide task does not replace in-memory-only framing

Codex-1 found that the plan only adds a disk-backed example, while the accepted design says to replace in-memory-only corpus examples with a disk-backed `BundleCorpus` example.

**Action:** Update the plan so `docs/guides/behavioral-metrics.md` uses `BundleCorpus` as the primary quickstart/framing and keeps in-memory arrays only as an optional small-test pattern.

### High - Public ordering snippets use locale-dependent `localeCompare`

Codex-2 found `localeCompare()` in entry sorting, attachment MIME sorting, and child discovery sorting. Default locale collation can vary across hosts, which weakens deterministic CI ordering.

**Action:** Add a locale-independent `compareCodeUnit()` helper using `<` / `>` comparisons, use it for all public ordering, and add a tie-order regression test that would fail under locale-dependent case collation.

### Medium - Lazy bundle iteration is not proven

Codex-2 found that the planned lazy-loading test does not catch eager materialization. A `bundles()` implementation that loads all matching bundles before yielding the first one could pass.

**Action:** Add a test with first bundle valid and second bundle malformed. Assert the first `iterator.next()` succeeds and only the second `iterator.next()` throws.

### Medium - Stop-descending-inside-bundle discovery is not proven

Codex-2 found that tests cover scan-depth limits but not the accepted contract that discovery stops once a directory is identified as a bundle directory.

**Action:** Add a fixture with a nested `manifest.json` under an already indexed bundle directory and assert only the outer bundle key is indexed.

## Resolved From Iteration 2

- Type-compatible frozen `failedTicks` snippet was added.
- Nested `failedTicks` immutability coverage was added.
- `incomplete: true` and `incomplete: false` query coverage was added.
- Full public-name doc audit now runs after final devlog updates.
