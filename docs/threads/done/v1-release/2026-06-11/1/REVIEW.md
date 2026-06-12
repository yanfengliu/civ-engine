# v1-release — release review, iteration 1

**Reviewed:** the full 1.0.0 diff (strict flip + clause, snapshot v6 + restorePoison, trims, test fallout, docs wave). **Reviewers:** Claude (fable-5 1m max, correctness focus) + Gemini (3.1-pro plan, docs/migration focus). Codex remains quota-exhausted (unreachable-CLI protocol). Post-batch contamination audit clean.

## Findings and dispositions

| ID | Sev (as filed) | Finding | Disposition |
|---|---|---|---|
| Gemini 1 | BLOCKER (reclassified DOC-TRUTH) | Changelog claimed "pre-1.0 bundles replay unchanged" — FALSE: the replayer's version policy rejects cross-`a` bundles at construction (`BundleVersionError`), and rejected cross-`b` throughout 0.x. Bundle replay is same-engine-version tooling by design | FIXED — claims corrected in changelog / strict-mode guide / ADR 48 / api-reference: the compatibility clause protects the SNAPSHOT (save-file) path, which is version-tolerant; bundles were never cross-version-replayable. No code change — the policy is correct and unchanged |
| Gemini 2 | BLOCKER (reclassified LOW-doc) | `applySnapshot` doesn't apply the strict clause, so a hypothetical `new World(snap.config)` + `applySnapshot(snap)` factory stays strict for legacy snapshots | Driver verification: no guide or api-reference teaches that factory shape (factories use their own explicit configs), and legacy snapshots only reach 1.x factories via unsupported metadata rewriting (see Gemini 1). The strictness asymmetry was already documented pre-review in the applySnapshot section ("strictness is NOT transferred; the clause governs deserialize") |
| Gemini 3 | HIGH (reclassified UNREACHABLE) | `selfCheck` would key-count-mismatch comparing a legacy v5 recorded snapshot (no `config.strict`) against a replayed world's v6 serialize | Unreachable by the Gemini-1 policy: legacy bundles cannot be opened, and all 1.x-recorded snapshots are v6 with explicit strict on both sides of every comparison. Stripping `config.strict` from comparison would be WRONG (a real strict mismatch between record and replay is meaningful). Documented here; no code change |
| Gemini 4 | MEDIUM | `restorePoison` via `applySnapshot` double-cloned and broke the engine-internal `poisoned === lastTickFailure` single-reference invariant (finalizeTickFailure sets both to one object) | FIXED — adopts `fresh.poisoned` directly (fresh is discarded), one shared reference, zero extra clones |

## Claude findings (correctness lens; landed after the Gemini batch) and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| C-HIGH | HIGH | strict-mode.md still said "Default is off" two lines under the updated header; ai-integration.md taught the old default | FIXED — both lines corrected |
| C-M2 | MEDIUM | "legacy replays unchanged" repeated in four doc spots (overlaps Gemini 1) | FIXED in the same correction wave (clause = snapshot path; bundles same-version by policy) |
| C-M3 | MEDIUM | **Policy contradiction:** the fatal cross-`b` replay gate (built when `b` = breaking) contradicts the 1.0 freeze (`b` = additive) — every minor would orphan every corpus, against the AI-first thesis; stale message text either way | FIXED — same-major cross-`b` now WARNS (cross-`a` stays fatal; selfCheck backstops); test repinned; changelog bullet + ADR 48 + determinism-contract item 9 updated. Policy change flagged to the owner in the release summary |
| C-M4 | MEDIUM | deserialize Throws line said 1–5; serialization guide said 1–5 and omitted restorePoison; both WorldSnapshot shape listings omitted the `poisoned` field | FIXED — all listings now carry v6 + `poisoned` + restorePoison |
| C-M5 | MEDIUM | `WorldSnapshotV6` was the only un-nameable snapshot type at the freeze; PLAN's `WORLD_SNAPSHOT_VERSION` constant never landed | FIXED — V6 exported (+fixture); the constant is dropped deliberately (no V1–V5 precedent; PLAN annotated by this row) |
| C-M6 | MEDIUM | Changelog false claims: committed-DTS-DIFF pointer; "348-name fixture" | FIXED — accurate provenance (in-conversation review + regen steps) and counts (104 runtime / 315 declared) |
| C-L1 | LOW | snapshot-diff stale v5-only comment + error message | FIXED |
| C-L2 | LOW | ADR 48 / changelog implied applySnapshot participates in the strict clause; worldFactory contract lacked the config-must-match sentence (v6 always serializes strict → mismatch surfaces as config.strict divergence) | FIXED — wording corrected; contract sentence added |

Claude verified clean: no v5 assumptions anywhere in the session stack (recorder/selfCheck/viewer/fork/diffBundles all v6-coherent); clause edge cases (explicit strict:true in v5; hand-edited v6); restorePoison aliasing on both paths; config.strict consumer sweep.

## Verified by driver before acting (per the verify-reviewer-claims rule)

cross-`a` throw site and 0.x cross-`b` precedent in session-replayer; absence of `new World(snap.config)` factory examples in guides; the finalizeTickFailure single-reference invariant in world-tick.
