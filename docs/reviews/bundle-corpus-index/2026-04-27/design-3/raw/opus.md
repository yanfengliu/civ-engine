I have enough context to render the verdict. Let me also verify one potentially novel TypeScript pattern in section 5.4 ΓÇö the `override readonly details: CorpusIndexErrorDetails` against the parent `details: JsonValue | undefined`.

Plain-text review follows.

---

**Verdict: ACCEPT**

The v3 spec resolves all five design-2 carve-outs and is implementation-ready. The remaining items below are LOW-severity nits that the implementer can address in code without re-spinning the design.

---

**Verification of the explicit v3 checks**

1. `materializedEndTick` vs replayability ΓÇö RESOLVED. ┬º5.2, ┬º5.3, ┬º9, ┬º11, ┬º17 all consistently frame it as "manifest's incomplete-aware upper bound for *persisted bundle content*, not a guarantee that `SessionReplayer.openAt(...)` will succeed." The CI Pattern in ┬º9 also models the failure-floor guard correctly (`firstFailure - 1` with a `<= startTick` check). Verified against `src/session-replayer.ts:188` / `:248ΓÇô249`: the formula `incomplete ? persistedEndTick : endTick` matches the replayer's own upper-bound logic, and `SessionMetadata.persistedEndTick` is `number` (required), so `materializedEndTick: number` cannot drift to `undefined`.

2. Canonical root key `'.'` ΓÇö RESOLVED. ┬º5.2 ("If `rootDir` itself is a bundle, its key is exactly `'.'`. Descendant bundle keys never start with `./`"), ┬º6 (key derivation rules), ADR 30, ┬º11 ("root itself can be a bundle with key `'.'`"), and ┬º17 are aligned. Backslash-to-slash normalization is also explicit.

3. `attachmentMime` any-match semantics ΓÇö RESOLVED. ┬º5.3 spells out "any-match filter, not exact-set or all-attachments filter" and ┬º11/┬º17 mandate a multi-attachment test that proves the distinction.

4. dataUrl-in-manifest cost caveat ΓÇö RESOLVED. ┬º1, ┬º2, ┬º3, ┬º7, ┬º10, and ┬º17 all flag that explicit dataUrl attachments embed bytes into `manifest.json` and inflate manifest parse cost, while clarifying that `BundleCorpus` does not decode/inspect/index those payloads. ┬º10 in particular promotes this from a footnote to a real performance caveat.

5. `CorpusIndexError.details.code` taxonomy ΓÇö RESOLVED. ┬º5.4 promotes `CorpusIndexErrorCode` to a closed string-literal union with seven values, defines `CorpusIndexErrorDetails` with the discriminator at `details.code`, and the rest of the spec consistently cites concrete codes (`entry_missing` in ┬º5.1, `query_invalid` in ┬º5.3, `root_missing` in ┬º6, etc.). Index-signature extensibility is preserved without sacrificing the discriminator contract.

**Doc surface check (┬º12 vs ┬º17 vs the diff)**

The diff in this change is design-only ΓÇö there is no implementation or canonical-guide diff to validate against yet. ┬º12's planned doc surface is complete and ┬º17's acceptance gate enforces "doc audit evidence ΓÇª in the same commit as code." Both the api-reference scope and the guide list cover the new exports, and the code-review prompt addendum in ┬º12 carries forward the doc-accuracy requirement from the AGENTS.md Documentation discipline. Nothing in ┬º12 references removed APIs or stale signatures.

---

**LOW-severity notes (do not require a v4)**

- ┬º5.4 introduces a novel pattern in the SessionRecordingError hierarchy: every existing subclass in `src/session-errors.ts` keeps the parent's `details: JsonValue | undefined` and discriminates at runtime, but `CorpusIndexError` is the first to declare `override readonly details: CorpusIndexErrorDetails`. Because `CorpusIndexErrorDetails`'s index signature is `[key: string]: JsonValue | undefined` while `JsonValue`'s object branch is `{ [key: string]: JsonValue }` (no undefined), the override may fail strict-mode covariance under `tsc --strict`. The implementer should either (a) narrow the index signature to `[key: string]: JsonValue` and rely on optional-property absence rather than `| undefined`, or (b) drop the override and expose a typed accessor (`get corpusDetails()` returning `CorpusIndexErrorDetails`), or (c) confirm that the codebase's tsconfig (no `exactOptionalPropertyTypes`) allows it. No design change required ΓÇö flagging only because every other error subclass in the family avoids this question.

- ┬º17 acceptance criteria enumerates 10 types to be exported from `src/index.ts` but omits `CorpusIndexErrorDetails`, catching it only under "and supporting types." ┬º12 lists it explicitly in the api-reference scope. A one-word addition to ┬º17's enumeration would prevent the type from being silently skipped during the export-list audit.

- The ┬º9 replay-investigation example dereferences `corpus.entries({ failedTickCount: { min: 1 } })[0]` without an empty-array guard. This is example code, not API design, but adding `if (!failed) return;` would model defensive consumer code consistent with the rest of the spec's strictness.

- ADR 28 and Open Question 5 both defer "active-writer detection," which is internally consistent. Worth confirming that the ┬º11 testing strategy's "Closed-corpus contract" test is interpreted as documentation/comments rather than an executable assertion (since the spec explicitly says v1 does not detect live writers, there is nothing to assert beyond "tests construct corpora only after sinks close").
