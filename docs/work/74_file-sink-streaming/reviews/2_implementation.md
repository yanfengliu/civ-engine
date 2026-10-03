# Review 2: implementation

## Target

Corrected M8 handoff-freeze-3 on base57de5ce5356781389c4ae9db3dde89f51b39f209,21 frozen paths and native controls. Root accepted the complete focused report SHA256cd389748db615389dcaf8803e2cefb5cbbd0344be5b2a0b5280b8dc5f3c9f95b below. Fresh docs-only main3c676619468ca431335158062cb104abd9742844 is incorporated afterward with all frozen candidate bytes restored and verified; it is outside the original report cutoff.

## Reviewers and coverage

/root/engine_m2_acceptance independently re-read corrected reader/test/source/native evidence, public docs/version and prepared giant-file ownership/cleanup contract. It ran no product runtime or provider CLI. This corrects round1's vacuous invalid-byte claim without rewriting the historical report.

## Reports

### /root/engine_m2_acceptance — complete authored body, unchanged

# M8 focused independent re-review, round 2

2026-10-02. Outcome: the corrected reader/tests, six native controls, public documentation/version delta and prepared proof harness pass this bounded source/evidence review. No new executable repair is requested. Two small current-plan statements need correction before final integration, as detailed below. The actual giant-file proof and full eleven-step gate remain UNRUN; this is not shipping acceptance, a runtime proof performed by this reviewer, or a provider-CLI PASS.

Reviewer: `/root/engine_m2_acceptance`; integration owner: `/root`; implementation handoff: `/root/engine_reader_contract_audit`; permanent work record: `74_file-sink-streaming`. This report supplements and corrects round 1 without rewriting it. The parent owns proof release, fresh-main incorporation, final integrated review, gates and shipping.

## Correction to the earlier coverage claim

My round-1 report incorrectly counted six malformed-byte fixtures as exercised coverage. I missed that Vitest spread the raw array rows into numeric callback arguments, making `invalid.length` undefined and the loop vacuous. The original 183-case GREEN and the first 225-case GREEN therefore do not prove those replacement-byte comparisons. The source-checks-1 stdout explicitly reports the callback/number type errors and lint failures; its overall native Job exit is 1 despite the 225-case runtime summary. The previously reviewed horizon, public-flow and valid multibyte tests are distinct; their evidence is not converted into invalid-byte coverage.

The repaired fixture wraps each byte array in an object and increments an exercised counter inside the loop (`tests/file-sink-reader.test.ts:247–255`). The six nonempty literal arrays now require 13 total seam comparisons by their lengths. Reintroducing the original array/numeric callback shape while retaining the count assertion causes six specific assertion failures, not merely a destructuring exception or typecheck failure. Corrected and restored native runs then pass. These are the grounds for accepting the previously unsupported invalid-byte claim in this round. Round 1 remains exact historical text, SHA256 `a0cd71015e21eae79ac7d8229c3cd1ee4ba9771fb33df353da4c9a88e281d49a`.

## Frozen target and provenance

The reviewed handoff is the 21-path `aoe2/tmp/engine-reader-m8-1002/handoff-freeze-3/manifest.json`, SHA256 `b481e747e066f622a5eff4818c2daaa37b800648a2077277ce70dba6ca0eb909`, with `HANDOFF.md` SHA256 `3d923fb463b09ebee5796e337957e2912c992bcfa967778b93e987f8bbf91c54`. Its complete candidate patch is 91,105 bytes, SHA256 `81150cca709ebf5316869ce28303c7bf87a7253577a9c6c4492ad0ea69c79de6`. The declared source base is `57de5ce5356781389c4ae9db3dde89f51b39f209`, private tree `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-reader-m8-1002`. This review accepts those frozen snapshot bytes; it does not anticipate the parent's forthcoming docs-main refresh or audit a later index.

All 21 file snapshots, 20 retained-input bindings and the complete patch matched their manifest hashes before inspection. The 21 snapshots and 20 retained inputs remained unchanged at the closing read audit. The source/test/public-doc/release files agree with the earlier freeze-2 manifest, SHA256 `907b84b9a6d6b3e03d0b6a35da03722687a5b565e6358374e72b61c3ad05fdb4`. The FileSink delegate is unchanged from round 1. The controlling contract remains the directly read work71/design.md:274–286, SHA256 `af1d3d2ff009c2355af93272b348291e702996de808105778281f32ab0f3090d`, including first-next `fstat` horizon, positional cutoff, physical-tail handling and primary-error identity.

| Focused input | SHA256 |
| --- | --- |
| `src/session-file-sink.ts` | `12cbabd0a551c472a3094e4bf2da9d98cd0da4df86c6a281b67d488881febe94` |
| `src/session-jsonl-reader.ts` | `4db6fd8f59f4a1f1afc48abcea29310b1d5a848f3b7e87acdedd46e0a619ba88` |
| `tests/file-sink-reader.test.ts` | `26488913eeae723ba5131049d8af38b1f88e1ed39888aaf0a20f2be46fc1ed1d` |
| `tests/doc-claims.test.ts` | `dfb3d0e2b2261936fa3ea6031a41d25aa8fe6515e388971f60a236085557c481` |
| `tests/fixtures/doc-claims.json` | `eff3717c9b8f5cef0f6464f067f5231ba12e71988c1055c5147ec5c114ecb5c5` |
| Prepared `native-string-proof.mjs` | `8bc32fc2ac0bcb75ff3293ed8532bbc8b0293c5481f7579b3e75f295d7c12c2e` |
| Prepared `run-native-string-proof.ps1` | `d6740743a78a0d3a7fe500513f63d29d4cb84772c56e5cb8ca3e4c4637dc3519` |

The full initial audit body is preserved byte-for-byte inside work74/reviews/0_design.md at byte offset 813 (13,640 original bytes). The full round-1 body is preserved inside reviews/1_implementation.md at byte offset 804 (11,126 bytes). The acceptance-plan snapshot remains exact SHA256 `809389119be384244ef8436c9c2d529db95c96598b27c7c8c0ff0048436b93a3`. The supplied registry patch adds only the already allocated id 74/theme entry. This is preservation review of this handoff, not permission to overwrite the primary allocator or another task's later main changes.

## Reader and test repair

The 68-line helper moves the existing conditional close-error suppression into `closeReader` (`src/session-jsonl-reader.ts:8–10`) and calls it from finally (`:65–66`). The catch still sets a separate boolean before rethrowing the identical primary value (`:61–64`). This retains the previously reviewed falsy-value precedence and visible close-only failure while resolving the `no-unsafe-finally` diagnostic. No descriptor, horizon, decoding, parse or yield-order logic otherwise changes. Direct public `yield*` delegation remains unchanged.

The corrected complete test source preserves the original real-file/read-spy adversaries: lazy first-next acquisition, explicit 65,536-byte positional lengths, partial final read, independent append-excluding horizons, malformed completed versus unterminated tails, valid prefix before same-block corruption, `fstat`/read/open identity and public return/throw cleanup. The revised invalid-byte cases use the actual full literal buffer's legacy UTF-8 decoding as oracle, rather than importing the candidate decoder. Valid 2/3/4-byte seam coverage and BOM rejection remain separate tests. This does not claim exhaustive malformed UTF-8 fuzzing, every unsupported file race or a universal record-size bound.

The new doc-claim predicate exercises the public FileSink path with a literal first-read bound, prefix-before-error and append exclusion (`tests/doc-claims.test.ts:136–155`), with owned descriptor/file cleanup (`:160–165`). Its materialization checks name concrete existing operations in FileSink, BundleCorpus and MCP (`:156–159`); they are static assertions, not whole-bundle memory measurements. The broader reader suite separately checks tail, UTF-8 and cleanup behavior. The fixture pins the same accurate sentence in both API reference and recording guide.

## Actual native controls and checks

I read the control driver, initial/final/restored hashes, raw per-arm Vitest JSON summaries and failure signals, source-check logs/results and Job accounting. The controls driver makes deliberate source/test changes, requires native exit 1 plus exact expected assertion-failure counts, restores exact preimages in finally after every arm and runs an unfiltered affected suite after restoration. All six per-arm restored hash sets and the final hash set equal the corrected input hashes above. The eager control restores the actual baseline FileSink from HEAD; it is not a simulated return value.

| Owner control | Native exit | Actual failed / passed / deliberately skipped | Observed failure signal |
| --- | ---: | --- | --- |
| Original array-row vacuity | 1 | 6 / 0 / 154 | Every failure is `expected +0 to be undefined` at the exercised-count assertion. |
| Baseline eager reader | 1 | 10 / 0 / 150 | Five first-read spy-length failures and five completed-corruption assertions. |
| Parse completed block before yielding | 1 | 5 / 0 / 155 | The first next throws line-2 `SinkWriteError` instead of yielding the valid prefix. |
| Content-equality tail skipping | 1 | 5 / 15 / 140 | Repeated `broken` completed lines are not rejected. |
| Omitted final close | 1 | 5 / 0 / 155 | Expected one close, observed zero on public return. |
| Close masks primary | 1 | 30 / 0 / 130 | Injected undefined/null/false/zero/empty-string/Error outcomes are replaced by close failure. |
| Exact restored affected suite | 0 | 0 / 225 / 0 | 160 reader + 23 existing FileSink + 36 doc-claim + 6 version-sync cases pass. |

Selected control arms intentionally leave unrelated tests skipped; they do not claim 160 fully exercised cases per mutation. The final restored run has 225 passes and zero pending/skipped cases. Controls results SHA256 is `f0d9a1edfcfdd85afeaacda37c4c9de88d382845369b7da4399b286fd1b9cfc5`; enclosing Job receipt `6a9ae6ce172b0f3c654e8ace9083c108e56a93104213217c68a8c975adde6f04` records exit 0, 8.296 s wall, 4.40625 s user + 2.921875 s kernel, active processes 0, no leftovers and cleanup true. Exit 0 belongs to the successful control protocol; the six deliberate mutant executions each retain native exit 1.

Corrected source-checks-2 independently records affected tests 225/225, root `tsc --noEmit` exit 0 and scoped ESLint exit 0. Its results SHA256 is `07fbb5018366de33c09fd63289eb1c224ba04a7ab9277d43d658e031aed85970`; Job receipt `5215c0d00579f4204412ba4633fecde957f87f65d727d2bd87a490d0f9ea428f` records 8.959 s wall, 7.703125 s user + 2.9375 s kernel, active 0/cleanup true. The earlier failing source-checks-1 Job remains preserved (`3e7e064573e8fa7963ac297fdc7c7586c54ce2caa83401f533f47b0f6e08d340`), native 1, with its type/lint diagnostics; it is not retrospectively GREEN.

The private root build's actual stdout runs prebuild/build for 2.6.1 and records 101 source/config inputs plus 388 outputs. Native build/record exits are 0, and the retained compile receipt records the owned dist import's ENGINE_VERSION 2.6.1. I independently rehashed those 101 current inputs and 388 compiled outputs against compile-manifest SHA256 `71d226a83f527be78aacb64fb8a53751d51e800a3b2acf5087ad7a64d3311ae4`; all matched. The build Job is 5.155 s, user 3.34375 s + kernel 0.828125 s, active 0/cleanup true. Root and MCP dependency directories and dist are ordinary directories; the intended MCP civ-engine junction targets this candidate. No installation or build was performed by this reviewer. The retained record/LOC run is also actual 56/56, native 0, 4.734 s Job, active 0/cleanup true. These are bounded private checks, not the final full gate or hosted compatibility matrix.

## Documentation, version and remaining materialization

The API-reference and session-recording guide changes state first-next horizons, at-most-65,536-byte UTF-8 blocks, append exclusion, independent iterators, valid-prefix/deferred parse errors, physical-tail tolerance, descriptor lifetime and largest-record limits. The guide explicitly explains the migration from eager error timing. Manifest/snapshot/sidecar reads and toBundle/corpus/viewer/MCP materialization remain visible. The helper is a private extraction within FileSink, with no public barrel/exports-map, writer or persisted-format addition in this patch; no broad architecture/tutorial sweep is justified by this delta.

The release delta is patch 2.6.1. `package.json`, both root lock version fields, MCP lock's parent-engine version, README badge, changelog and `src/version.ts` agree. The lock diff changes only those version literals, preserving dependency resolution bytes. The public exports map remains unchanged. The changelog names the changed error timing and limits without claiming an actual giant-file, consumer, main or hosted result. Work records explicitly preserve the instrument failure and the prepared-harness repair; their current status needs the two wording corrections below.

## Prepared large-file harness review — not executed

The exact JavaScript/PowerShell pair above is source-acceptable for the parent's separately reserved, maintained-Job execution. It pins Node binary/version/platform/architecture, actual `MAX_STRING_LENGTH` 536,870,888, the compiled manifest, 32,768 ASCII rows of 16,384 bytes and 536,870,912 total bytes (`native-string-proof.mjs:19,28–48`). It generates bounded rows with short-write handling, independently counts actual bytes/LFs/ASCII and hashes the file, requires native eager `ERR_STRING_TOO_LONG`, then traverses the public iterator without retaining an aggregate record array and checks row content/order plus a rolling digest (`:52–89`). These are intended assertions; no such file or result was produced by this review.

The revised fixture is required absent; directory creation is exclusive, and a fresh per-run token marker uses `wx` (`:49–53`). Only successfully acquired ownership enables JavaScript cleanup. Finally attempts iterator return and own-FD close independently, preserving the primary error while recording cleanup failures (`:90–106`). It checks real directory identity, marker bytes, ordinary expected entries and the owned file before nonrecursive removal; unexpected state is retained and forces failure. The PowerShell precondition refuses existing fixture state, starts one hidden owned Node process, uses a 120-second process cap and finally stops/disposes only that process tree (`run-native-string-proof.ps1:5–17`). Its fallback requires the exact run marker, rejects reparse/unexpected entries and deletes only the literal expected file/marker/directory (`:20–35`). A crash before proven marker ownership therefore retains/report state rather than deleting an unproven directory. The JavaScript has an internal 110-second budget. The enclosing maintained Windows Job is a required execution context, not something the launcher's descriptive receipt string independently proves.

This resolves the two prepared-harness ownership/combined-cleanup defects by source inspection. It does not prove timeout cleanup by execution, measure memory/CPU/disk cost, establish the native string-limit outcome, or authorize a duplicate heavy run. The parent's actual run must retain native outcomes and cleanup, and the full gate follows its separate release. No throughput or universal memory-safety claim follows from these sources.

## Open documentation finding and exact correction

M8-D1, low severity, current-status accuracy: frozen `docs/work/74_file-sink-streaming/plan.md:41` says `repair1/5 spent` while its line-44 update and handoff account repair 2/5. That same sentence says malformed-byte coverage was explicitly outside round 1's bound, although the preserved round-1 body incorrectly claimed it. The integration owner has accepted these corrections. They do not call for executable changes or a new runtime run.

After fresh-main incorporation, the implementation/integration owner should make these two exact replacements in the current outcome paragraph, preserving the full authored reports:

1. Replace `Active, corrected candidate and focused checks GREEN; repair1/5 spent.` with `Active, corrected candidate and focused checks GREEN; repairs 2/5 spent.`
2. Replace `Independent source round1 found no material defect on initial frozen helper/delegates, with malformed-byte/controls/typecheck/docs/version explicitly outside its bound.` with `Independent source round1 found no material defect on the initial frozen helper/delegates but incorrectly treated six vacuous malformed-byte fixtures as exercised coverage; round2 corrects that claim and reviews the repaired instrument and controls. Typecheck, controls, docs and version acceptance were pending in round1.`

The source verdict can be reused only for unchanged product bytes after the docs-main refresh. Final integrated record/source acceptance must check the actual refreshed target and these current-status corrections. The giant proof, full eleven gates, Node 20/22/24 hosted matrix/publish-dist, commit/main/push and game E11/E13/E21 adoption remain open at this report's cutoff.

## Review lane and resources

This was an in-session, read-only assessment of frozen files and existing evidence. External OpenAI/Anthropic source-export approvals remain pending after earlier rejections; no reviewer CLI, alternate transport or network payload was attempted, and neither unavailable provider is marked PASS. I ran no product tests, mutation, build, proof, heavy gate or candidate edit. No source/index/registry/dependency files were modified. No browser, GUI, server, persistent process or owned worktree was launched; there is no reviewer-owned process/resource left to clean. Only this ignored authored report is newly written and intentionally retained for exact-body owner promotion. Reading/token cost was not separately measured; all native timing figures above are from the existing owner receipts.


## Findings and disposition

No new executable repair requested. M8-D1 is resolved by the two exact current-plan replacements: repairs2/5 spent and explicit retraction of round1's invalid-byte claim. The corrected instrument, controls, docs/version and prepared harness have SOURCE/EVIDENCE PASS within this report's bounds.

## Verification

Actual owner225/typecheck/lint, six native RED controls and exact restoration are reviewed; old183/first225 passes do not prove malformed-byte seams. Runtime giant-file acceptance and full11 were unrun at the review cutoff. Native proof execution is separately root-released after fresh-main/source/compile guards.

## Round outcome

Focused SOURCE/EVIDENCE PASS; no shipping acceptance, provider CLI PASS or giant-file execution by the reviewer. Fresh integrated target, actual proof, full11 and main/hosted/adoption remain integration-owner decisions.
