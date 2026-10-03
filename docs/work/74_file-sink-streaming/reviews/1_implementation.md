# Review 1: implementation

## Target

Initial M8 source-freeze-1 on exact base57de5ce5356781389c4ae9db3dde89f51b39f209. The report below is the complete independent authored body, SHA256a0cd71015e21eae79ac7d8229c3cd1ee4ba9771fb33df353da4c9a88e281d49a; its original pending bounds are preserved. The complete initial acceptance plan is snapshots/acceptance-plan.md, SHA256809389119be384244ef8436c9c2d529db95c96598b27c7c8c0ff0048436b93a3.

## Reviewers and coverage

/root/engine_m2_acceptance independently read frozen FileSink/helper/test snapshots and actual183-case native receipts. It ran no runtime or external provider CLI. Corrected malformed-byte coverage and close factoring arrived afterward and require focused re-review.

## Reports

### /root/engine_m2_acceptance — exact authored report

# M8 independent frozen-source review, round 1

2026-10-02. Outcome: no material source finding in this bounded in-session review. The frozen reader implementation satisfies the accepted synchronous iterator contract by source inspection and the inspected small-file RED/GREEN evidence. This is source acceptance, not full M8 shipping acceptance, a multi-CLI PASS, or an actual large-file proof. Mutation controls, final docs/version integration and the remaining gates are still pending at this report's cutoff.

Reviewer: `/root/engine_m2_acceptance`. Implementation owner: `/root/engine_reader_contract_audit`. Integration owner: `/root`. Permanent destination on owner promotion: `docs/work/74_file-sink-streaming/`. The preceding complete acceptance plan, including its dated controlling-contract correction, remains at `aoe2/tmp/engine-reader-m8-acceptance-1002/0_acceptance-plan.md`, SHA256 `809389119be384244ef8436c9c2d529db95c96598b27c7c8c0ff0048436b93a3`.

## Exact target and isolation

The implementation tree is `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-reader-m8-1002`. A fresh read-only Git revision query returned base/HEAD `57de5ce5356781389c4ae9db3dde89f51b39f209`. I reviewed the owner's immutable three-file snapshot packet, `aoe2/tmp/engine-reader-m8-1002/source-freeze-1/manifest.json`, SHA256 `d927b17ad981af33303adea6fd92a0ddf6d7ffaf56a6b9219085c8b83d3b25f4`. All three snapshot hashes matched before reading; the same snapshot and worker-path hashes still matched after source inspection. Docs and release files were explicitly outside this source freeze and may continue changing independently.

| Target | Bytes | SHA256 |
| --- | ---: | --- |
| `src/session-file-sink.ts` | 17830 | `12cbabd0a551c472a3094e4bf2da9d98cd0da4df86c6a281b67d488881febe94` |
| `src/session-jsonl-reader.ts` | 2410 | `6dbbb68289f207fd044e9d96263d02b99a32834b78f352213df125b38f0e2b00` |
| `tests/file-sink-reader.test.ts` | 11744 | `3a71417f076399a90f0929125e13719d0d81c85683af6de0e861a39ea78ca959` |

I read both complete source snapshots and the complete test file. A read-only FileSink Git diff against the recorded HEAD contains only the private reader import, removal of the old eager array helper and five direct generator delegations. It does not change writers, manifest layout, snapshots, attachments or the five public iterator signatures. This is not an audit of every eventual changed file, index entry or final integrated tree. No candidate bytes, Git index, registry or dependency tree were edited by this reviewer; no additional worktree was needed for the isolated frozen snapshot read.

The controlling accepted specification is `docs/work/71_engine-feedback/design.md:274–286`, directly read at SHA256 `af1d3d2ff009c2355af93272b348291e702996de808105778281f32ab0f3090d`. It includes the first-next byte-size horizon and positional reads, not merely the weaker prior audit's EOF language. Engine `AGENTS.md` was reread for gates, patch-version/internal-change rules and documentation obligations. The prior complete audit remains supporting context at `aoe2/tmp/engine-reader-audit-1001/report.md`, SHA256 `2ba064cef0fec0f7f6f5efe286a3a2c418419a4611dad8ad7d098bb7fb51d950`.

## Source conclusions

The helper opens lazily inside a generator, captures `fstatSync(fd).size` once, and reads at explicit positions with `Math.min(65_536, horizon - position)` (`src/session-jsonl-reader.ts:23–38`). The buffer size is a private literal. Iterators have separate descriptor/decoder/cursor state, so later appends cannot extend an older iterator's horizon. A premature native zero-byte read terminates the loop rather than retrying forever. This is a byte horizon, not an atomic snapshot under rewrites or truncation.

`StringDecoder('utf8')` spans block boundaries; `decoder.end()` flushes at the captured terminal boundary or early native EOF (`:31,39,49`). The line loop searches physical LF, increments the physical line count including empty lines, skips only zero-length lines and yields each parsed record before considering the next completed line (`:40–47`). Consequently a valid prefix in the same block is observable before later corruption. Completed-line parsing occurs in a separate non-generator helper, so a caller's injected throw is not caught and recast as a parse failure (`:8–17,45`). Completed malformed lines produce the existing `SinkWriteError`/`jsonl_parse`/file details with a diagnostic naming file, physical line and required valid JSON. Only the final unterminated fragment uses tolerant parse failure (`:50–54`); repeated equal text cannot make an earlier completed malformed line disappear.

All five public generators use direct `yield*` delegation (`src/session-file-sink.ts:393–406`). The reader's surrounding catch marks a separate boolean and rethrows the identical primary value; finally attempts close once and exposes a close-only failure (`src/session-jsonl-reader.ts:56–62`). That placement covers `fstat`, allocation, read/decode, parse and injected-throw exits, including `undefined`, `null`, `false`, `0` and empty string. Explicit return reaches finally without inventing a primary error. An open failure occurs before descriptor ownership and therefore does not close an unowned descriptor (`:26–28`).

The legacy `existsSync` precheck remains (`:25`). This review accepts preservation of actual thrown native open/read/fstat errors and does not expand that into a claim that every inaccessible-path condition must surface: an existence check can retain its pre-existing missing-path behavior. The inspected FileSink diff confirms that precheck existed in the old helper. No new error-normalization boundary was introduced.

Materialization limits remain explicit. The pending string and `JSON.parse` follow the largest record, not a universal constant-memory bound. The unchanged FileSink constructor reads its manifest (`src/session-file-sink.ts:105–118`), snapshots/sidecars use whole-file reads (`:349–390`), and `toBundle` reads snapshots and spreads all five streams into arrays (`:412–447`). This review does not establish whole-bundle/corpus/MCP capacity, E21 adoption, a speedup or immutable concurrent file contents. The helper is an internal extraction within the existing FileSink responsibility; the observed source delta does not change the core tick lifecycle or introduce a public option/format. Required API/recording-guide accuracy and final version synchronization are still separate acceptance items.

## Tests-first and actual native evidence

I read the full test source before the frozen implementation. Its 160 cases exercise the five public methods over real owned files, with forwarding spies for native operations and independent literal 65,536-byte/read-position assertions. The first short LF record is followed by more than one block, so its one-read assertion distinguishes incremental first yield from eager reading (`tests/file-sink-reader.test.ts:130–149`). It checks independent first-next horizons, append exclusion and a partial UTF-8/JSON tail that later appended bytes must not complete (`:151–169`). Prefix-before-corruption and repeated malformed/completed versus unterminated cases are public-flow assertions (`:111–128`). Native `fstat`/read/open identity, parse-versus-close precedence, explicit return/break, falsy injected throws and close-only errors are covered (`:180–239`). The UTF-8 seam oracles use the literal full byte buffer's legacy UTF-8 decoding, not the candidate decoder, and include 2/3/4-byte sequences, malformed-byte replacements and BOM rejection (`:242–268`). This is bounded coverage, not exhaustive UTF-8 fuzzing or every concurrency schedule.

The actual affected runner invokes Vitest with `tests/file-sink-reader.test.ts` and the existing `tests/file-sink.test.ts`, a one-worker task config, native config loader and no cache. I read its runner/config, complete RED and GREEN stdout, representative RED stderr, both native workload results, Job receipts, resource baseline/closing records and process traces. The owner revalidation receipt binds the preimplementation FileSink to SHA256 `5b4867c96000840fc4b95c0daebf14ad8f5c02ba9f8a381a425ece6e8683b9e0` and the existing FileSink tests to `255e7d846e75706c8154929368c5ae53abc858aa73d39afc23d481eed473afec`. I did not independently execute or reconstruct the earlier baseline run; the tests-first claim is supported by that retained provenance, the native run chronology and the observed old-helper failure traces.

| Recorded owner lane | Observed result | Native/ownership evidence |
| --- | --- | --- |
| `red-1` | 183 total: 115 failed, 68 passed; new reader file 160 cases with 115 failures. Existing behavior therefore does not satisfy the new contract. | Workload/Job exit 1; Job 5.173 s; user 1.34375 s + kernel 1.34375 s; active processes 0; cleanup true; no leftovers. |
| `green-1` | 183 passed across both selected files; no skipped/TODO summary. | Workload/Job exit 0; Job 4.047 s; user 1.375 s + kernel 1.078125 s; active processes 0; cleanup true; no leftovers. |

The RED stdout SHA256 is `a51f6b94b52846960b83cadc81c04772435fcf549b555924e4b742e9034b3b06`; stderr `72d3189532af050fb84eaab04f6d8702e0001d27b2e2ce62824a24f2fd77987a`; Job receipt `e55b2fca08c7d2768edc723a460010ea4ee7323261426496c7e343584230ebd9`. The GREEN stdout SHA256 is `a4341c7d4caa96072ecc3af2108f2b761092e16dd8fda6f7ac8913e866d89d12`; stderr is empty, SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; Job receipt `b38c77d3f6e54cf3b37ac1c8e09e0c20938d32146d1b02563925c39f39083ef3`. These are retained owner executions, not reviewer executions or a performance A/B conclusion.

## Remaining acceptance and resources

No justified executable repair is requested by this round. At cutoff, targeted eager/tail/cleanup/precedence mutation controls and their restored GREEN results have not been supplied to this reviewer; neither has current typecheck/lint evidence. The actual Node string-limit heavy proof, final docs/doc-claim/version/public-surface checks, final integrated review, full eleven-step gate, Node 20/22 matrix, build/pack/hosted publication, main/push and real consumer adoption are not accepted by this source-only round. The integration owner retains those decisions. No status from the earlier M2 gate is reused as an M8 pass.

The independent assessment was performed in-session. External OpenAI/Anthropic source-export authorization remains pending after earlier rejections; no CLI smoke/reviewer/model transport was retried and no unavailable provider result is represented as PASS. This reviewer launched no product runtime, browser, GUI, server, daemon, persistent process or heavy proof. Only completed read-only shell/Git commands and writes to this task's ignored authored review files were used. No task-owned process or descriptor remains. Source/read wall time and token/compute cost were not separately measured; the table reports only the actual owner Job accounting. Preserve this complete body for work74 promotion rather than replacing it with a summary.


## Findings and disposition

No material reader/delegate source defect was found within this original scope. Typecheck/lint/control/docs/version/large-file/full/integrated acceptance were explicitly pending. Repair1/5 later corrected the vacuous malformed-byte fixture and factored close precedence for lint; those corrections and native controls are under focused re-review. Root found a cleanup ownership error in the unexecuted giant-file harness and requested repair2/5; it changes no reader bytes.

## Verification

Only actual owner183-case RED/GREEN evidence was accepted by this original report. Its malformed-byte claim is superseded by the dated instrument correction in plan.md: six original byte rows ran zero iterations. Corrected225/typecheck/lint and six controls are newer evidence, not retrospectively part of this report.

## Round outcome

SOURCE PASS within the initial frozen-source bound; corrected re-review and final integration acceptance remain open. The original body remains unchanged inside this wrapper.
