# Senior Code/Design Review ΓÇö Spec 7 Bundle Corpus Index Design

The design is largely sound ΓÇö it composes correctly with verified existing primitives (`SessionMetadata`, `SESSION_BUNDLE_SCHEMA_VERSION`, `FileSink.toBundle()`, `SessionSource`, `runMetrics(Iterable<SessionBundle>, Metric[])`, `SessionReplayer.fromSource(source, { worldFactory })`, `openAt`'s `incomplete ? persistedEndTick : endTick` upper-bound rule). FileSink already writes `manifest.json` atomically (tmp + `renameSync`), `recordedAt` is always `new Date().toISOString()` (UTC `Z`), and the proposed `bundle-corpus.ts` placement does not collide with anything in `src/`. ADR numbering (28ΓÇô31) is compatible with the current latest ADR 27. Public-export "additive only" claim holds against `src/index.ts`. No stale signatures, no references to removed APIs.

That said, several real issues should be addressed before implementation lands.

## Findings

### 1. `recursive: false` semantics are misleading (Section 5.1)

The option says: when `false`, "only root itself and its immediate child directories are checked." That is depth = 1, not depth = 0. The natural reading of `recursive: false` is "don't recurse ΓÇö check the root only." Both the typical "folder of bundles" layout (each bundle in a child of root) and the "root is itself a bundle" layout (mentioned explicitly in Section 6) are conflated under one boolean.

This is a foot-gun: a user who passes `recursive: false` expecting a single-bundle root will silently include all sibling bundle directories. Recommend either (a) renaming to a tri-state `scanDepth: 'root' | 'children' | 'all'` (or numeric depth), or (b) splitting into two clearly named flags. At minimum the API doc must spell out that `recursive: false` is depth-1, not depth-0, and the Section 6 discovery contract should align (it currently lists `recursive: false` behavior in step 3 but doesn't reconcile with the option name).

### 2. `policySeed` query silently excludes non-synthetic bundles (Section 5.3)

Per `src/session-bundle.ts:102ΓÇô106`, `policySeed` is populated only when `sourceKind === 'synthetic'`. The query field `policySeed?: number | NumberRange` does not document this dependency. A user running `corpus.entries({ policySeed: { min: 0 } })` will quietly drop every `'session'` and `'scenario'` bundle ΓÇö not because the seed is out of range, but because it is `undefined`. This will surprise analysts triaging mixed corpora.

Recommend (a) stating in the BundleQuery doc that any `policySeed` filter implies `sourceKind === 'synthetic'`, and/or (b) defining how `NumberRange` interacts with `undefined` values for ALL optional manifest fields (`policySeed`, `sourceLabel`) ΓÇö currently the spec is silent on missing-value semantics and tests in Section 11 don't cover this.

### 3. `endTick` query is a usage trap for incomplete bundles (Section 5.3)

`endTick`, `persistedEndTick`, and `replayableEndTick` are all queryable. For incomplete bundles, `metadata.endTick` and `metadata.persistedEndTick` can diverge (replayer logic at `src/session-replayer.ts:187ΓÇô188` is the only reason `replayableEndTick` exists). An analyst doing `corpus.entries({ endTick: { min: 1000 } })` will get bundles whose `metadata.endTick` is high but whose persisted/replayable upper bound is much lower ΓÇö exactly the failure mode `replayableEndTick` was introduced to avoid in the replayer.

Either drop `endTick` and `persistedEndTick` from queryable fields and expose only `replayableEndTick`, or add a guidance paragraph in Section 5.3 stating which to prefer for "ran past tick X" intent. Three near-synonymous tick filters with subtle semantic differences and no usage guidance is a documentation/testing tax for limited gain.

### 4. Doc-update list omits `docs/guides/concepts.md` (Section 12)

`docs/guides/concepts.md:214ΓÇô226` is the canonical "Standalone Utilities (not owned by World)" list. Line 224 already enumerates the Session Recording family (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `FileSink`, etc.). `BundleCorpus` is the same kind of utility ΓÇö World-independent, JSON-serializable, focused ΓÇö and AGENTS.md explicitly mandates: "The concepts.md standalone-utilities list and tick-lifecycle ASCII must reflect new utilities."

Section 12's doc-update list does not include `concepts.md`. This is a real drift risk: `concepts.md` is where readers go to see the engine's surface vocabulary, and missing entries compound. (Note: Spec 3 and Spec 8 already failed to update this list ΓÇö Spec 7 should not propagate the gap.) Add `docs/guides/concepts.md` to Section 12.

### 5. `recordedAt` lexical comparison assumption is unsafe / undocumented (Section 5.3)

The design says "lexical order matches chronological order for normalized ISO values" and that the implementation "validates that the query bounds are parseable timestamps." That validation is insufficient. Today's writers (`session-recorder.ts:140`, `session-scenario-bundle.ts:66`) always emit `new Date().toISOString()` (UTC `Z`), so lexical comparison is safe in practice ΓÇö but the spec doesn't enforce that the query bounds use the same form. A user passing `from: '2026-04-27T10:00:00+05:00'` will compare lexically against `Z`-suffixed values and get wrong results.

Recommend explicitly stating the contract: "`recordedAt` query bounds must be UTC ISO-8601 strings ending in `Z`. Bounds in any other form are rejected with `query_invalid`." This also future-proofs against a writer ever changing the timestamp format.

### 6. Concurrent-write behavior unspecified for `loadBundle()` reads (Section 6)

Section 6 commits to construction-time being a snapshot. That's fine for `manifest.json` (FileSink writes it atomically). But `bundles()` and `loadBundle()` go further ΓÇö they call `FileSink.toBundle()`, which reads JSONL streams and snapshot files that FileSink does not write atomically. If a synth playtest run is still appending to `commands.jsonl`/`ticks.jsonl` for one of the discovered bundles, `loadBundle()` may see partial trailing lines or missing snapshots.

The design implicitly assumes "finalized/closed bundles only" but never states it. Recommend adding a one-line contract: "BundleCorpus is intended for closed bundles. Behavior is undefined when iterating bundles that are being actively written." This is also a testable boundary worth listing in Section 11.

### 7. Asymmetric and under-specified missing-key behavior (Section 5.1, 5.4)

`get(key)` is documented as `BundleCorpusEntry | undefined` (sane). `openSource(key)` and `loadBundle(key)` declare return types but don't say what happens when the key isn't present. The error-code enum lists `entry_missing`, so presumably they throw ΓÇö but Section 5.1's API-surface declarations don't say so. Make this explicit in the per-method contract, otherwise implementers have to guess.

### 8. Symlink handling unspecified (Section 6, 8)

Section 8 leans on the determinism claim, and Section 6 describes recursive descent without saying anything about symlinks/junctions. On Linux/macOS users may symlink bundle directories into a corpus root; Windows uses junctions. Whether to follow them, treat them as files, or skip them is undefined. Symlink loops would also break the "bounded scan" implication of Section 10.

State the behavior explicitly. The simplest deterministic choice is "do not follow symbolic links during discovery; symlinks to directories are skipped." Whatever the choice, it must be documented and tested.

### 9. `hasFailures` and `failedTickCount` are redundant (Section 5.3)

`hasFailures: true` is exactly `failedTickCount: { min: 1 }`. Two query fields that test the same predicate cost test coverage and documentation without buying expressiveness. Drop `hasFailures` (range covers it), or drop the range and keep the boolean ΓÇö but not both.

## Notes (verified ΓÇö not findings)

- `worldFactory` in the Section 9 replayer example is correct (`session-replayer.ts:22ΓÇô35`).
- `runMetrics`/`Metric.orderSensitive` shape and Iterable contract match the Section 8/9 claims.
- `manifest.json` atomicity is real (`session-file-sink.ts:163ΓÇô164` writes tmp then `renameSync`), so manifest reads during corpus construction won't see partial JSON.
- All metric names in the Section 9 example (`bundleCount`, `sessionLengthStats`, `commandValidationAcceptanceRate`) are real exports.
- ADR numbering (28ΓÇô31) and the v0.8.3 `c`-bump are appropriate given current state (latest ADR 27, current `package.json` 0.8.2).
- `behavioral-metrics.md`'s current example does build bundles in memory (a `SessionBundle[]` populated from `runSynthPlaytest`); the design's plan to swap this for a `BundleCorpus` example is accurate.
- `AttachmentDescriptor` lacks an `ext` field ΓÇö the design only references `attachments[].mime`/`sizeBytes` for derived fields, which is consistent with the actual descriptor (`session-file-sink.ts:65ΓÇô81`). The `<id>.<ext>` in the disk layout is illustrative; nothing in the design depends on `ext` being in the descriptor. Γ£ô

## Verdict

The design is implementation-ready once findings 1ΓÇô5 are resolved (these are real correctness/usability issues users will trip over) and 6ΓÇô8 get explicit contracts (these are gaps that will surface as ambiguity during implementation/test). 9 is a nit. No bug or stale-API issue blocks the design itself.
