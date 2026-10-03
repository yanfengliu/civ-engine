# Review 0: design

## Target

Historical read-only M8/E21 investigation on engine eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8. The exact authored body below was retained from aoe2/tmp/engine-reader-audit-1001/report.md, SHA2562ba064cef0fec0f7f6f5efe286a3a2c418419a4611dad8ad7d098bb7fb51d950. Source inputs remain recoverable in that commit; the ignored packet retains its12-file SHA256/blob manifest. Current implementation base is57de5ce5356781389c4ae9db3dde89f51b39f209.

## Reviewers and coverage

/root/engine_reader_contract_audit read12 source/doc inputs in an isolated clean checkout, ran no runtime/test/mutant and removed its checkout/branch. This was independent source investigation, not implementation acceptance.

## Reports

### /root/engine_reader_contract_audit (original authored body, unchanged)

# M8 reader and E21 consumer audit

Owner: /root/engine_reader_contract_audit. Integration owner: /root. Implementation owner: /root/engine_feedback_resume. Read-only investigation; no implementation authorization exercised.

Source: exact engine main `eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8` (2.5.0), isolated with the maintained cwd-generic worktree controller as `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-reader-audit-1001`. `input-manifest.json` binds the 12 source/document files by actual SHA256, byte length and Git blob. The new node_modules junction was detached nonrecursively. No source, test, documentation, primary dependency/dist, foreign worktree or M2 candidate bytes were changed. The source manifest uses checkout bytes, including checkout line endings, rather than assuming Git blob and disk hashes are interchangeable.

The assignment supplies the accepted fixed-64-KiB UTF-8, first-next horizon, physical-tail tolerance, finally-close and primary-error contract. Work71's main plan currently records M8 briefly at `docs/work/71_engine-feedback/plan.md:48,67,69,77`; it does not contain the detailed recovered contract. The implementation owner should retain that accepted detail in the existing work record. No M2 advance-hook investigation is included.

## Verdict

E11 and E13 remain unsupported on this revision. The five public methods are generators, but their first next call synchronously reads and parses the entire selected JSONL file before yielding anything. E21's basic metrics capability already exists; consumer adoption remains a separate game-owned outcome. Fixing E11 removes the aggregate JSONL string boundary, while per-record parsing, snapshots, bundles and corpus/MCP consumers retain materialization bounds. No runtime or large-file acceptance was run here.

| Requested capability | Actual implementation on audited main | Verification bound |
| --- | --- | --- |
| Line-wise synchronous iteration without one whole-file string | `_readJsonlLines` returns `unknown[]`; `readFileSync(path, 'utf-8')`, `split('\n')` and every `JSON.parse` complete before the five outer generators yield (`src/session-file-sink.ts:243-267,419-432`). | Source proves the eager path. No large-file runtime proof. |
| Fixed 64-KiB UTF-8 reads and bounded first next | No chunk reader, decoder, owned read descriptor or bounded read horizon exists in that path. | Unsupported; tests not executed. |
| Ignore only the malformed physical final unterminated line | Current code uses string equality to the last element instead of its position (`src/session-file-sink.ts:259`). | Defect deduced directly from source; concrete adversary below. |
| Close owned descriptor on completion, early return and error; primary error wins | `readFileSync` currently owns its internal descriptor; there is no iterator-spanning descriptor lifecycle to accept. A new reader must establish its own lifecycle. | New acceptance requirement, not an existing defect claim about readFileSync closing. |
| Streaming statement matches behavior | API reference calls these generators “streaming the JSONL files” (`docs/api-reference.md:5180`). | False on this source. |
| Metrics over existing bundles without corpus migration | `runMetrics` consumes synchronous `Iterable<SessionBundle>` (`src/behavioral-metrics.ts:32-57`); it has no directory requirement. | Supported by source; no fresh game adoption or result denominator proved. |

## Concrete findings

1. The primary E11 failure is aggregate file materialization, not merely an array wrapper. All five stream methods use the same eager reader. Changing only the outer generator or deleting `out[]` while retaining the whole-file read would not satisfy the byte horizon. No source-reading result establishes a speedup or a memory bound for a hypothetical implementation.

2. Tail tolerance hides a completed malformed line when its text equals the final unterminated malformed tail. For exact file bytes `broken\nbroken`, the first `broken` is a completed physical line and must throw; current `line === lines[lines.length - 1]` skips both occurrences. The extended case `{"tick":1}\nbroken\nbroken` can return the valid record and hide the completed corruption. This is a source-backed inference, not a run result. It belongs in the M8 class gate; no extra game repair attempt was spent.

3. Error timing changes under the accepted streaming contract. Current eager parsing means a later malformed line prevents all yields. The accepted reader may yield a valid prefix before a later error. It must not parse later completed lines in the already-read block before yielding the first valid record. This behavior should be explicit in the FileSink API and recording guide rather than leaving consumers to infer all-or-nothing validation.

4. Current tests cover layout, writes, order, snapshots, sidecars, MemorySink equivalence, no-snapshot rejection, directory reuse and manifest protection (`tests/file-sink.test.ts:35-348`). A scoped search across `tests/` for `jsonl_parse`, malformed JSONL and trailing partial lines found no reader contract cases. These tests are existing authored coverage, not fresh passes. `tests/doc-claims.test.ts:116-272` and its eight-entry fixture currently pin no FileSink streaming statement.

## Smallest implementation and acceptance contract

Keep the writer, file layout and public synchronous `IterableIterator` signatures unchanged (`src/session-sink.ts:47-58`). Replace only the internal JSONL read path with a bounded helper if extraction is needed to preserve the file-size cap. There is no demonstrated reason for a public option, async source, new metrics API, bundle format, runtime dependency or coroutine framework.

- Open the selected JSONL file lazily when iteration starts, read synchronously with one fixed 65,536-byte buffer, and decode UTF-8 incrementally so a code point split across blocks survives. Preserve missing-file empty iteration and existing non-missing I/O error behavior. An iterator never started should own no descriptor.
- Yield each parsed record before inspecting a later record. Read only through the block needed to complete the next nonempty physical line. For a short first record, first next consumes at most one 65,536-byte block, regardless of a much larger suffix. A multi-block first line necessarily requires its own length; this is not a constant-memory bound for arbitrarily large records.
- Use physical LF boundaries and actual EOF to classify lines. Every malformed LF-terminated line throws `SinkWriteError` with existing `jsonl_parse` and file detail. Only malformed final unterminated text at EOF is ignored. A valid final unterminated JSON value is yielded. Skip the empty string, preserving current behavior; do not silently broaden it to whitespace-only lines. Preserve CRLF handling and arbitrary JSON values rather than adding reader shape validation. Character-decoding behavior, including malformed UTF-8 and BOM, needs compatibility controls rather than an unapproved stricter policy.
- Close the owned descriptor once in a finally path after exhaustion, `return`, injected `throw` and read/parse errors. Preserve the primary failure identity, including falsy thrown values, if close also fails; a close-only failure remains visible. Do not claim this cancels caller behavior or concurrent file modification. The minimal reader need not promise an immutable live-file snapshot.
- Update the exact API sentence and recording guide to state fixed-block iteration, deferred parse failure, physical-tail tolerance, largest-record bound and whole-bundle materialization. Reuse the doc-claims fixture/predicate convention to make that wording depend on the actual FileSink path, with observable byte-horizon and prefix-yield evidence rather than identifier existence alone.

The first acceptance lane is scoped FileSink contract tests using the repository's file-sink test harness. World replay/profiling tools do not answer the filesystem read-boundary question. It should cover all five stream methods, empty/missing files, empty lines, CRLF, valid and malformed unterminated tails, completed malformed last lines, the duplicate-content adversary, first valid prefix followed by corruption in the same block, a line longer than one block and 2/3/4-byte Unicode split at each boundary. Observe actual requested read lengths, byte offsets and reads before first yield. Test descriptor closure for exhaustion, early return, injected throw, parser/read failure and close failure, with literal primary-error identity controls. Test writer/MemorySink equivalence and loaded bundles without changing format or snapshot behavior.

The principal deliberate controls restore eager whole-file reading, parse-ahead within a block, value-based tail classification and omission of finally-close one at a time; each corresponding gate must go red, then exact bytes are restored. A close-error masking control proves precedence. No mutation or test was executed in this audit.

The second lane is the future heavy-slot actual Node string-limit proof. Generate an owned ignored ASCII JSONL file of many short valid records whose total character count exceeds that process's recorded maximum string length. Record Node/version/platform and the actual file byte size and independent expected record count. Show the eager read control fails at that boundary and the candidate iterator counts/checks the records without constructing one aggregate string or retaining all records. Close descriptor/process resources and remove the owned file in finally. A small mocked limit does not establish the real Node boundary. This proof still does not establish that `toBundle`, corpus, viewer or MCP can fit the same recording in memory.

## E21 consumer boundary

`FileSink` constructor reads the manifest as a whole string (`src/session-file-sink.ts:104-110`). Individual snapshots and sidecars still use whole-file reads (`:415,450`), and `toBundle` reads every snapshot and spreads every stream into bundle arrays (`:438-473`). A single oversized record or snapshot retains its own parsing/string bound. The reader improvement therefore supports large aggregate JSONL streams made from bounded records, not arbitrary file or bundle size.

Corpus metadata discovery is manifest-shaped and does not load JSONL at listing time (`src/bundle-corpus.ts:80-109`). `openSource` creates a FileSink (`:221`), so stream-by-stream consumers can inherit the new reader without a corpus API change. `loadBundle` and `openViewer` call `FileSink.toBundle` (`:226,232`), and `bundles()` loads one full bundle per yielded entry (`:117-120`). The API already states this full-bundle unit honestly (`docs/api-reference.md:5500`).

MCP `CorpusState.loadBundle` delegates to that full-bundle load, and a cache miss constructs `BundleViewer(this.loadBundle(key))` (`mcp/src/state.ts:31-49`). It retains an LRU of four viewer objects. Viewer internals and actual memory overhead were not audited; no memory measurement or four-bundle-size formula is asserted. Reader adoption reaches this construction path but does not make its tools stream individual records or prove large real recordings fit.

`runMetrics` observes one bundle at a time and retains only reducer states itself (`src/behavioral-metrics.ts:47-57`). Metric-specific state remains relevant: session/command/event rate stats collect one scalar per bundle and `computeStats` copies/sorts that array (`:60-79,94-131`); type-count metrics retain maps by distinct type (`:146-179`); failure-rate metrics retain aggregate counters (`:181-223`). Generic metrics are consumer-supplied and may retain more. Root can adopt useful metrics over existing AoE2 JSON bundles now; directory migration and useful corpus/MCP acceptance require a real bundle denominator and explicit memory evidence. No new engine metric API is indicated.

## Evidence, status and cost

Implemented on audited main: public synchronous iterators, whole-file eager reader, FileSink-directory corpus, iterable-bundle metrics and four-object MCP viewer LRU. Requested/prepared: the accepted incremental reader contract and consumer adoption. Verified here: source path, exact revision and recorded content digests only. Not run: game/engine tests, mutants, build, benchmark, large-file proof, review CLIs, servers, browsers, commits, release or consumer adoption. Root supplied game CI36936991772 RED/corpus36936991809 GREEN and engine CI36816404419 GREEN; this audit did not refresh hosted status or imply those runs verify M8.

Source/doc content files read: 12, within the 15-file initial scope; policy/instruction/recovery and controller reads are separate logistics inputs. Checkout creation-to-manifest interval is 265.921 seconds, computed from recorded filesystem creation time `2026-10-02T04:56:37.5230173Z` and manifest time `2026-10-02T05:01:03.4437414Z`; it includes reading, coordination and report preparation, not pure source-reading CPU. Preliminary reading duration and total token/compute cost were not measured. Final audit and cleanup timestamps are retained separately. No runtime measurement is invented.

The report and manifest remain in ignored `aoe2/tmp/engine-reader-audit-1001/` for the still-open M8 handoff. Root owns promotion of this authored report into the permanent work71 review record if useful. The source checkout and its branch must be removed with the maintained controller after unchanged input hashes and clean status are confirmed; `cleanup.md` records the actual outcome. No owned browser, GUI, server, daemon or background process was launched.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F0 | Eager aggregate JSONL read and false streaming statement | Accepted source evidence | M8 tests-first reader and claim gate |
| F1 | Content equality hides a completed malformed line matching the tail | Accepted source inference | All five streams gate broken\nbroken |
| F2 | Corpus/MCP and reducers retain materialization bounds | Accepted consumer boundary | Root-owned adoption and memory evidence |

## Verification

Historical source digests and cleanup only. Fresh base revalidation found the reader/tests/corpus/MCP/metrics/sink/doc-claim files unchanged; work71/API/guide advanced with M2. Initial183-case focused run returned native1,115failed/68passed, with owned Job cleanup proved.

## Round outcome

Investigation is accepted context. Dated correction2026-10-02: the original body's minimal concurrency discussion omitted a later accepted requirement. Work71/design.md274-286 controls: first next captures fstat byte horizon with positional reads and later-append exclusion. The original body is preserved as history; the current plan/tests supersede that omission. Runtime/full gate/release/consumer acceptance remain open.
