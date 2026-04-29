# Bundle Viewer — Plan Iteration 1 Review (2026-04-28)

**Disposition:** Iterate (v2). Codex: 6 majors + 1 minor. Claude: 6 minors + ACCEPT-conditional. All fixes folded into plan v2.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Findings + dispositions

### Codex MAJOR-1 — `BundleCorpusEntry` lives in `src/bundle-corpus-types.ts`, not `bundle-corpus.ts`

Verified at `src/bundle-corpus-types.ts:81`. **v2 fix:** File Map adds `src/bundle-corpus-types.ts` to the modify list. Step 6 splits the work: type-add in `bundle-corpus-types.ts`, runtime-attach in `bundle-corpus.ts`'s `makeEntry()`.

### Codex MAJOR-2 — `docs/guides/serialization-and-diffs.md` exists, must be updated

DESIGN §12 listed the file conditionally. It exists (verified). **v2 fix:** File Map and Step 9 add the update — `diffSnapshots` note with TickDiff scope cross-reference.

### Codex MAJOR-3 — Step 9 bundle-viewer.md missing several DESIGN §12 topics

DESIGN §12 lists tick iteration, explicit `worldFactory` requirements, `SessionReplayer` integration, sparse-tick behavior. **v2 fix:** Step 9 expanded to mirror DESIGN §12's full topic list.

### Codex MAJOR-4 — Re-review prompts missing prior REVIEW.md files + lessons.md

AGENTS.md mandates this for re-review (per the recent Spec 7 plan precedent). **v2 fix:** Step 11 prompt-construction bullet now requires concatenating prior `REVIEW.md` files + `docs/learning/lessons.md` for iter-2 and beyond.

### Codex MAJOR-5 — Tie-breaker model invocation outdated

Was `claude --model opus`. **v2 fix:** Step 11 tie-breaker line now uses `claude --model "claude-opus-4-7[1m]" --effort max -p "..."` with the prescriptive-patch-on-REJECT clause.

### Codex MAJOR-6 — Step 12 sequencing: gates run before final devlog/thread move

AGENTS.md requires all four gates on the final tree before commit. **v2 fix:** Step 12 reordered — devlog append + thread move first, then `npm test`/`typecheck`/`lint`/`build` on the post-move tree, then commit, then post-commit smoke check.

### Codex MINOR-1 / Claude m1 — Step 10 audit list incomplete

Missing `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`, `BundleViewerErrorCode`, `BundleViewerErrorDetails`. **v2 fix:** Step 10 lists the full DESIGN §17 export set.

### Claude m2 — Step 9 README under-specified

Was "Update README badge"; AGENTS.md Documentation discipline requires Feature Overview + Public Surface bullet too. **v2 fix:** Step 9 now expands the README bullet to all three updates.

### Claude m3 — Step 11 prompt construction explicit baseline

**v2 fix:** Step 11 prompt-construction bullet now starts with the AGENTS.md baseline prompt verbatim and enriches with the four review aspects + task-specific anti-regression checklist.

### Claude m4 — Step 7 sequencing (test imports vs index.ts)

Tests via `../src/index.js` would fail until Step 7 lands. **v2 fix:** Step 1 adds an explicit note: iterative tests in Steps 2-5 import from new modules directly (`../src/snapshot-diff.js`, `../src/bundle-viewer.js`); final tests use the index. Step 6's corpus-integration test moves to `tests/bundle-corpus-viewer.test.ts` (kept separate from `bundle-viewer.test.ts`) so Step 5's full-file iterative run never depends on Step 6.

### Claude m5 — Step 9 vs Step 12 devlog duplication

Step 9 said "append after review" while Step 12 also appends. **v2 fix:** Step 9 drops the detailed devlog bullet; only Step 12 owns it.

### Claude m6 — Step 11 iteration directory naming

`<iter>` placeholder unanchored. **v2 fix:** Step 11 explicitly uses `iter-N/` starting at `iter-1` per AGENTS.md.

### Claude m7 — Risk register hook mention

Acknowledged as already hedged in v1. No change.

## Disposition

Re-review as plan-2 to confirm v2 closes all listed issues. Expectation: ACCEPT.
