I found the plan is solid in design fidelity but has a hard-blocking typecheck issue plus a few process gaps. Verified against the actual codebase (`src/session-errors.ts`, `src/session-bundle.ts`, `src/session-file-sink.ts`, `src/session-sink.ts`, `tsconfig.json`) and reproduced the compile errors locally.

## Findings

### Critical (blocking ΓÇö would fail Step 5 `npm run typecheck`)

**1. `CorpusIndexErrorDetails` interface will not compile (TS2411).** Reproduced with isolated `tsc --strict --noEmit`:
```
error TS2411: Property 'path' of type 'string | undefined' is not assignable to 'string' index type 'JsonValue'.
error TS2411: Property 'key'  ... not assignable to 'string' index type 'JsonValue'.
error TS2411: Property 'message' ... not assignable to 'string' index type 'JsonValue'.
```
The optional fields resolve to `string | undefined`; `JsonValue` does not include `undefined`. Widening the index signature to `JsonValue | undefined` fixes this specific error but does not fix #2.

**2. `override readonly details: CorpusIndexErrorDetails` will not compile (TS2416).** Reproduced:
```
error TS2416: Property 'details' in type 'CorpusIndexError' is not assignable to the same property in base type 'SessionRecordingError'.
  Type 'CorpusIndexErrorDetails' is not assignable to type 'JsonValue | undefined'.
    Type 'CorpusIndexErrorDetails' is missing ... 'JsonValue[]': length, pop, push, ...
```
TypeScript matches `CorpusIndexErrorDetails` against the `JsonValue[]` arm of the `JsonValue` union and fails. This is true even after widening the index signature. The plan needs a different shape (e.g., drop the index signature and type as a discriminated record, expose details via a typed getter, or use a closed `Record<string, JsonValue>` instead of an interface). The plan as written cannot land ΓÇö Step 5/6 gates will fail.

### High (process gaps)

**3. Review artifacts won't be in the commit.** Step 7's `git add` runs *before* the review folders are populated (the script then creates `raw/`, `diff.md`, `REVIEW.md`). Step 8 only adds devlog files; Step 9 commits without re-staging the review tree. Either re-run `git add docs/reviews/bundle-corpus-index-T1` after `REVIEW.md` is written, or split the commit. Missing this means the audit trail is on disk but never committed.

**4. Two-Codex / one-Claude reviewer setup deviates from AGENTS.md.** AGENTS.md prescribes Codex + Claude as the two independent reviewers, with `raw/codex.md` + `raw/opus.md` (plus optional `*.stderr.log` companions). The plan adds `raw/codex-2.md` running the same model with the same prompt, which is correlated, not independent. AGENTS.md's documented escape hatch is "if a CLI is unreachable, proceed with the remaining reviewer and note in the devlog" ΓÇö not a duplicate Codex run. Drop `codex-2.md` from Step 7.

### Medium

**5. `OneOrMany<T>` not exported.** Design ┬º5.3 says `export type OneOrMany<T>`. The plan's `src/index.ts` export block omits it, and the implementation declares `type OneOrMany<T>` as module-private. Either export it or update the design ΓÇö current state diverges from the accepted spec.

**6. Plan-review iteration is not acknowledged.** `docs/reviews/bundle-corpus-index/2026-04-27/plan-1/` already exists (untracked, with `diff.md` + `raw/`). The plan's `git add docs\reviews\bundle-corpus-index` will pick it up, which is correct ΓÇö but the plan doesn't reference it as the artifact justifying entry into coding (the design has `design-1..design-4`, but no `plan-1` mention in the plan-review summary).

### Low

**7. `docs/devlog/summary.md` is currently 90 lines.** AGENTS.md asks for compaction past 50. Plan adds one new line and says "keep the file under 50 compact lines" but does not actually compact. Either compact older entries in the same commit or stop telling the future reader the file is under 50 lines.

**8. Junction-skip behavior is platform-dependent.** Step 1's symlink test relies on Node reporting Windows junctions via `dirent.isSymbolicLink() === true`. Modern Node 16+ does this, but older versions do not. The test wraps `symlinkSync(..., 'junction')` in try/catch already; consider adding a Node-version note in the test comment or in the guide's `Symlinks` paragraph so future regressions are explainable.

### ACCEPT-with-fixes verdict

Findings 1 and 2 are blockers ΓÇö typecheck will fail and the plan's Step 6 cannot pass. Fix the `CorpusIndexErrorDetails` shape and the `override` declaration before coding starts, then address #3 and #4 (procedure) inline. Everything else (5ΓÇô8) is non-blocking polish but worth resolving in the same iteration to avoid re-review churn.
