# Bundle Viewer — Design Iteration 4 Review (2026-04-28)

**Disposition:** Iterate. Codex flagged 4 majors + 1 minor (one of which is a real version-target staleness against the current checkout); Claude flagged 1 minor and ACCEPTed otherwise. v5 addresses all of them.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Iter-3 findings disposition

Both reviewers confirmed F1-F4 ADDRESSED in v4.

## New findings against v4

### Codex MAJOR-A / Claude MINOR — BYO-replayer residue continues

§5.1 `BundleViewerOptions.worldFactory` docstring described an impossible flow ("skip a worldFactory entirely... then call viewer.replayer() for a memoized replayer"); §5.2 `TickFrame.state()` docstring still said "worldFactory or pre-built replayer."

**Resolution in v5:** §5.1 docstring rewritten to make `worldFactory`-required APIs explicit (state, snapshot, snapshot-fallback diffSince, viewer.replayer) and `worldFactory`-optional surfaces clarified (metadata navigation + tick-diff folding). §5.2 `state()` docstring drops "or pre-built replayer."

### Codex MAJOR-B — Immutability vs performance contradiction

§2 said "All returned arrays/objects are frozen or freshly allocated" but ADR 33 said `frame.events` reuses bundle objects under `Readonly` cast. Inconsistent.

**Resolution in v5:** §2 reworded to specify the typing-contract / non-runtime-freezing model explicitly. ADR 33 expanded to reference the existing engine convention (e.g., `world.grid`'s frozen-delegate pattern is one-shot at construction; per-frame freezing would balloon allocations) and call out the test for write-through bypass.

### Codex MAJOR-C — `diffSnapshots` scope claim too broad

§4 / §7 described `diffSnapshots` as snapshot-authoritative while returning `TickDiff`. `WorldSnapshot` has fields not representable in `TickDiff` (`rng`, `componentOptions`, `maxTicksPerFrame`, `instrumentationProfile`, `version`).

**Resolution in v5:** §7 adds an explicit "Scope of `diffSnapshots`" subsection listing the excluded fields and the rationale for each (RNG divergence is selfCheck's domain; registration invariants belong to the worldFactory contract; etc.). §11 adds a test pinning the `rng` exclusion. The result is honest about being TickDiff-representable, not snapshot-complete.

### Codex MAJOR-D — Version target stale at v0.8.6

Verified: commit `7479541` shipped v0.8.6 for the AGENTS.md model bump (Codex `gpt-5.4` → `gpt-5.5`, Claude `opus xhigh` → `claude-opus-4-7[1m] max`). `package.json`, `src/version.ts`, README badge, and changelog all confirm 0.8.6 is taken.

**Resolution in v5:** Spec 4 retargets v0.8.7 (`c` bump from current 0.8.6 base). All references in §1, §9.1, §12, §13 updated.

### Codex MINOR — `BundleIntegrityError` details handling at §5.4 vs §7

§5.4 said replay materialization "bubbles" `BundleIntegrityError` from `SessionReplayer`, but §7 said `diffSince` proactively throws `replay_across_failure` with added range details. Ambiguous whether the viewer wraps or constructs.

**Resolution in v5:** §7 "Failure-in-range" paragraph rewritten. The viewer constructs a `BundleIntegrityError({ code: 'replay_across_failure' })` at the `diffSince` call site with `details = { code, failedTicks, fromTick, toTick }`. The `instanceof` and `details.code` match what `openAt` throws so callers see one error class for the same condition; the *details payload* is enriched because the caller asked for a range, not a single tick. The §5.4 contract still applies for direct `frame.state()` / `frame.snapshot()` paths; the §7 viewer-level guard fires before `openAt` would on the snapshot path.

## Disposition

Re-design as v5. Re-review as design-5. Expectation: nitpicks or accept.
