# M8 final integrated acceptance

## Target

Engine base3c676619468ca431335158062cb104abd9742844; gated26-path indexc3a49c94fb35185f9b6f90d2e16d2424b9ffbff3. Native working bytes and normal indexed EOL population have separate verified digests.

## Reviewers and coverage

Independent in-session reviewer /root/engine_reader_final_review; source, integrated index, current docs, native gates and bounded public iterator proof. External provider CLI lanes unavailable.

## Reports

The complete authored report follows byte for byte; source SHA256 ff6830b479012ea5887108195848967c475df7739b44e2400030637fa9acb955.
# M8 final integrated candidate review, round 3

2026-10-02. Verdict: PASS for the exact frozen M8 source, indexed integration and inspected local evidence. No new material finding or executable repair is requested. M8-D1 is resolved. This permits the integration owner to finish the planned acceptance record and shipping steps; it does not assert that 2.6.1 is already committed, merged, pushed, hosted or adopted by the game.

Reviewer: `/root/engine_reader_final_review`, the assigned independent in-session fleet review lane. Integration owner: `/root`. Implementation owner: `/root/engine_reader_contract_audit`. This report applies the fleet review runbook's grounding, exact-target and abstention requirements. External provider CLI lanes remain unavailable because their source-export approvals have not been granted. Neither provider has a PASS from this round. No external model transport or network export was attempted.

## Exact target and preservation

The reviewed checkout is `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-reader-m8-1002`, HEAD/base `3c676619468ca431335158062cb104abd9742844`, with the actual 26-path index tree `c3a49c94fb35185f9b6f90d2e16d2424b9ffbff3`. Direct `git diff --cached` inspection covered the integrated changes. A read-only comparison of the actual index against that tree returned no difference. Each of the 26 retained indexed snapshots was also hashed as a Git blob and matched its actual `ls-files --stage` object ID; this establishes a connection to the real index rather than trusting only a manifest label.

The full handoff is `aoe2/tmp/engine-reader-m8-1002/FULL-GATE-HANDOFF.md`, SHA256 `29ba20384c02d0e751c57e16db7ec0b0f7785fa4b4c02835bc5f0ae655c3611b`. The staged manifest is `staged-candidate-1/manifest.json`, SHA256 `0f4ce941724ecca0beb379e4e9a5b53e606eba9235f6cbf4bb51867a2d3c6933`; its complete 131,658-byte patch has SHA256 `6d322203065767d333efd9b19ac965f6db138dbf4d22cc13cb59f4c93a957607`. These files and all 52 retained working/index snapshots match their declared digests. All 651 current gate-input working hashes match the staged manifest.

Fourteen paths differ between native working bytes and Git blobs only by CRLF-to-LF conversion. I independently encoded that precise transformation and matched the resulting SHA256 to each indexed snapshot. The other twelve are exact. The tracked root `* text=auto` and `docs/work/* -text` rules explain the distinction; no attribute override or persistent Git configuration change was used by this reviewer. Native gate/proof hashes identify the original working bytes. Indexed review identifies the normalized blobs. They are not falsely presented as identical byte populations.

| Critical input | Native working SHA256 | Indexed SHA256 |
| --- | --- | --- |
| `src/session-file-sink.ts` | `12cbabd0a551c472a3094e4bf2da9d98cd0da4df86c6a281b67d488881febe94` | `5bde80a94a3677e53c38706ca2bcbf9e07f8f93deff4db4ea8a42a2206a65f17` |
| `src/session-jsonl-reader.ts` | `4db6fd8f59f4a1f1afc48abcea29310b1d5a848f3b7e87acdedd46e0a619ba88` | Same |
| `tests/file-sink-reader.test.ts` | `26488913eeae723ba5131049d8af38b1f88e1ed39888aaf0a20f2be46fc1ed1d` | Same |
| `tests/doc-claims.test.ts` | `dfb3d0e2b2261936fa3ea6031a41d25aa8fe6515e388971f60a236085557c481` | `c7bab92950fda3e44b991bd8875ae2106f84f12e6e42bf5ca619a70bdaac8f44` |
| `tests/fixtures/doc-claims.json` | `eff3717c9b8f5cef0f6464f067f5231ba12e71988c1055c5147ec5c114ecb5c5` | Same |

The primary repository's reservation registry and work74 placeholder still match their preservation hashes, and the foreign learning-state deletion remains absent. No candidate, index, registry, dependency, shared configuration or primary source file was edited by this reviewer.

## Source and acceptance contract

I directly reread the controlling work71/design.md M8 contract at lines 274–286, the complete indexed 68-line helper, all five FileSink delegates, the complete new reader tests, the doc-claim additions and surrounding materializing consumers. The earlier focused verdict is reused only for unchanged bytes, with this round independently checking the integrated index and later evidence.

`src/session-jsonl-reader.ts:28–41` opens on first advancement, captures `fstat` size and uses explicit positional requests capped by both 65,536 bytes and the remaining horizon. The position advances by actual bytes read. A zero-byte native read stops rather than spinning. Each invocation owns independent state. The incremental decoder cannot consume appended bytes beyond its captured boundary; the documented rewrite/truncation caveat remains accurate.

At `src/session-jsonl-reader.ts:44–59`, the physical LF cursor distinguishes completed lines from the sole final unterminated fragment. Empty strings alone are skipped. Each completed row is parsed immediately before its yield, so later corruption in the same block cannot erase an already available valid prefix. Completed malformed rows throw the existing coded `SinkWriteError` with file, physical line and valid-JSON requirement. Only parsing of the actual final unterminated text is tolerant. Valid final values, JSON primitives, CRLF parsing and BOM behavior remain compatible with the accepted contract.

The native open occurs before the owned-descriptor try/finally, while `fstat`, decoding, reading, parsing and yields are inside it. `src/session-jsonl-reader.ts:61–66` records primary failure with a separate boolean before rethrowing the original value. `closeReader` at lines 8–10 suppresses only a secondary close error. This preserves falsy injected throws and exposes a close-only failure. The public `yield*` calls at `src/session-file-sink.ts:393–406` forward return/throw to that lifecycle. A caller leaving a started iterator suspended still retains the descriptor, as the docs explicitly say.

The new tests cover all five public methods with real temporary files and native filesystem operations observed through spies. Their literal 65,536-byte denominator is independent of the production constant. The corrected malformed-byte fixtures use object rows and require a positive number of seam comparisons, preventing the earlier array-spreading vacuity. The six literal malformed arrays imply thirteen comparisons. This is meaningful bounded UTF-8 evidence, not an exhaustive encoding fuzzer or a guarantee for arbitrary file races.

Source outside the diff confirms the stated limits: `src/session-file-sink.ts:424` reads each snapshot as a whole string and `:440–443` builds stream arrays; `src/bundle-corpus.ts:226` and `:232` load complete bundles; `mcp/src/state.ts:31–43` loads bundles and builds cached viewers. The new helper is absent from the unchanged public barrels and package exports; `src/index.ts:180` continues exposing FileSink, and the browser barrel remains separate. There is no writer, format, public signature, dependency-resolution or metrics change.

## Corrected tests and sensitivity evidence

The full authored round-2 report has SHA256 `cd389748db615389dcaf8803e2cefb5cbbd0344be5b2a0b5280b8dc5f3c9f95b`. It retracts round 1's incorrect interpretation of six vacuous malformed-byte fixtures and accepts the repaired instrument. I reread the corrected source and the native control result artifact, SHA256 `f0d9a1edfcfdd85afeaacda37c4c9de88d382845369b7da4399b286fd1b9cfc5`, including actual failure messages, native exits and restoration hashes.

| Deliberate control | Native exit | Failed / passed / pending |
| --- | ---: | ---: |
| Original array-row vacuity | 1 | 6 / 0 / 154 |
| Baseline eager reader | 1 | 10 / 0 / 150 |
| Parse ahead before yielding | 1 | 5 / 0 / 155 |
| Content-equality tail skipping | 1 | 5 / 15 / 140 |
| Omitted final close | 1 | 5 / 0 / 155 |
| Close masks primary | 1 | 30 / 0 / 130 |
| Restored affected suite | 0 | 0 / 225 / 0 |

The vacuity arm fails explicit exercised-count assertions. Other signals distinguish missing bounded reads, lost prefix ordering, hidden completed corruption, missing close and changed primary identity. Every per-arm restored source/test hash matches the corrected initial hashes. The selected control arms deliberately leave unrelated tests pending; only the final restored run supplies the 225-case no-skip claim. Earlier 183/225 runtime summaries do not regain malformed-byte coverage merely because this round is green. No mutant or test was rerun by this reviewer.

## Actual native aggregate-string proof

The proof handoff manifest `handoff-freeze-4/manifest.json` matches SHA256 `6315dda7611bac17fd0c66e128ac3bd2c25436699dbd24bc5ebfcc78308ffe59`. All fourteen retained input/evidence bindings match. I read the actual proof harness, native result, launcher outcome, stdout, Job receipt and closing witness. This is completed evidence, superseding the old reports' deliberately preserved pre-proof cutoff.

The exact harness SHA256 `8bc32fc2ac0bcb75ff3293ed8532bbc8b0293c5481f7579b3e75f295d7c12c2e` pins native Node 24.12.0, x64 Windows and `MAX_STRING_LENGTH` 536,870,888, generates bounded ASCII rows, independently counts actual file bytes/LFs/ASCII, requires real eager `ERR_STRING_TOO_LONG`, then traverses the public iterator with row/content/order checks and a rolling digest. It imports the owned compiled 2.6.1 barrel, not a mocked reader. Its generation, census and candidate arms do not retain an aggregate string or record array.

The actual file was 536,870,912 ASCII bytes/characters, with 32,768 LF records of 16,384 bytes each. The eager arm threw `ERR_STRING_TOO_LONG`; the public iterator returned all 32,768 records. Generated, independently read and candidate-serialized SHA256 all equal `469d609bb6e2504e792581fa7b325e9fef72e24f33b0ee76cc4256576620b839`. The native result is PASS/exit 0, with no timeout or cleanup failures. Its result SHA256 is `3efb0b28078339be4e4633d9e3649bc957626f627a24fee1dd593e642920ef21`.

Compile manifest SHA256 `71d226a83f527be78aacb64fb8a53751d51e800a3b2acf5087ad7a64d3311ae4` binds 101 source/config inputs and 388 outputs. All 489 were independently rehashed against the current checkout during this review and still match, including after the later full-gate rebuild. The proof's closing witness also retains all 489 unchanged pre/post hashes. The exclusively marked fixture is currently absent. The retained Job receipt records 5.633 seconds wall, 2.140625 seconds user plus 1.484375 seconds kernel, four total processes, zero active members, no leftovers and cleanup true; script time is 2.9040308 seconds. These are recorded costs, not a fresh measurement by this reviewer.

This proves the specified bounded-record iterator crosses that native aggregate string limit. It does not establish constant memory for an arbitrarily large record, a peak-memory bound, a general throughput improvement, or successful whole-bundle/corpus/MCP loading of that file.

## Actual final local gate

I read the maintained gate runner and the ordinary launch wrapper, the complete stdout, native/pre/post witnesses, pack notices and Job accounting. The gate runner checks all eleven native step outcomes and reports failure if any cannot start or exits nonzero. The observed wrapper uses one ordinary `npm run gates` invocation, captures `$LASTEXITCODE` separately and restores its environment. It does not infer success from a piped summary. The pre/post checks bind all 651 working inputs, actual index tree, primary preservation, native toolchain and benchmark settings.

| Evidence under `aoe2/tmp/engine-reader-m8-1002/` | SHA256 |
| --- | --- |
| `full-gate-1/native.json` | `9a9e3fecd3de95515e9543bc90631e40c2274793de98b096559bec002bbeeef8` |
| `full-gate-1/stdout.log` | `4fd7dfbc35ece7ef41f383bc0f46cd69c0b83ee61f1ec94da6cf27debf41945d` |
| `full-gate-1/stderr.log` | `a7905f3d63e4ac8f9abde6cc24c70e1ddd0656b95c9c6884c91c706591494ee2` |
| `full-gate-job-1/job-gate-result.json` | `f03c01d55723382ce9afeba08fa49c3842ce3df64f24cdf84896ed6c35ae4882` |

Native gate exit, before-input guard and after-input guard are all 0. Root tests report 104 files and 1,816 passing cases plus the existing determinism-contract TODO at `tests/determinism-contract.test.ts:336`; MCP reports 22 passing cases. Root full/prod audits report zero vulnerabilities. The MCP audit reports one moderate Hono advisory, `GHSA-hxh3-vqpv-xpqv`, below the configured high threshold; it is disclosed, not erased or converted into a clean dependency tree. Typecheck, lint, root/MCP builds and pack all passed. Pack was a dry run with 426 files and version 2.6.1; its printed `.tgz` name is not proof of an emitted or published artifact.

The stderr artifact begins with PowerShell's `NativeCommandError` formatting of an `npm notice` stream, followed by pack/npm notices. It does not overturn the separately captured native 0 or the executed eleven-step results. No product error is inferred solely from that PowerShell wrapper label.

I inspected the unchanged benchmark denominator/control in `scripts/rts-benchmark.mjs:89–114` and `scripts/benchmark-gate.mjs`. Each reported value is median scenario wall milliseconds divided by median-of-three calibration milliseconds from the checksum-asserted 5,000,000-sqrt workload. The four observed ratios, medium 9.461, large 68.471, churn 3.539 and commands 5.701, are below their respective committed baseline times three: 60.51, 457.044, 15.3 and 30.693. Exact scenario/counter comparisons passed. No stress, baseline update or `BENCH_RATIO_MAX` override is claimed; the guards reject a ratio override. Calibration milliseconds are not separately logged, so these receipts do not supply absolute benchmark durations or an M8-specific performance comparison.

The wrapper records 48.5409661 seconds. The owned Job records 51.385 seconds wall and 82.234375 seconds combined CPU, 191 total processes, zero active members, no leftovers, successful Job close and cleanup true. The timing population includes the ordinary full gate and its process tree. It is not the cost of only FileSink iteration.

## Documents, version and final boundary

API reference, recording guide and changelog accurately describe lazy opening, first-next horizons, deferred error timing, physical final-tail tolerance, largest-record parsing memory and descriptor lifetime. The guide explicitly warns that older eager readers could fail before yielding a prefix. The doc-claim predicate observes actual public reads and failure ordering, with static checks grounding the retained materialization limits. The seven release/version copies agree on patch 2.6.1; both lock diffs alter only engine version literals. No new public surface justifies an additional minor bump.

M8-D1's two requested current-plan corrections are present: repairs 2/5 and an honest account of round 1's mistaken invalid-byte coverage. The previously absent defect-register entry is now actually present in the indexed diff, alongside corrected debugging/gate-proof evidence. Work71 E11/E13 accurately remain locally verified, unshipped producer work at the frozen cutoff; E15 identifies already shipped 2.6.0. All 21 game consumer dispositions and E21 metrics/memory adoption remain OPEN. The task records intentionally stop before final gate/shipping acceptance; the owner's planned small dated status addition and complete promotion of this report remain required before commit, followed by the scoped documentation check.

I independently located the complete original authored bodies inside their preserved wrappers: review0 is 13,640 bytes at offset 813, review1 is 11,126 bytes at offset 804, and review2 is 16,846 bytes at offset 870. Their original SHA256 values are respectively `2ba064cef0fec0f7f6f5efe286a3a2c418419a4611dad8ad7d098bb7fb51d950`, `a0cd71015e21eae79ac7d8229c3cd1ee4ba9771fb33df353da4c9a88e281d49a` and `cd389748db615389dcaf8803e2cefb5cbbd0344be5b2a0b5280b8dc5f3c9f95b`. The acceptance-plan snapshot remains SHA256 `809389119be384244ef8436c9c2d529db95c96598b27c7c8c0ff0048436b93a3`. Historical cutoffs and corrected dissent have not been replaced by a later synthesis.

The local implementation, integration and evidence criteria are satisfied within these bounds. Commit/main merge/push, hosted Node 20/22/24 acceptance, publish-dist inspection and game adoption were not performed by this reviewer and are not accepted by anticipation. A later source/test/gate-input change invalidates the relevant portion of this verdict. A small outcome/report-only append needs the promised exact documentation check and owner review, not a claim that it was part of the already frozen gate.

## Reviewer resources and limits

This review launched no product runtime, test, mutation control, build, gate, browser, GUI, server, child agent or persistent worker. Only this ignored authored report is newly written for owner promotion. No separate reviewer worktree was necessary because all candidate access was read-only and checked against retained snapshots. No reviewer-owned browser/GUI process exists to clean up.

Initial Git ownership rejection was handled with command-scoped `safe.directory` and optional index locks disabled; no global configuration was edited. A Windows CIM process inventory was denied, so fresh machine-wide process-tree inspection is unavailable from this reviewer. Cleanup acceptance relies on the directly inspected held-before-release Job membership/accounting receipts and absent owned fixture, not an invented independent OS trace. The implementation checkout, private build/dependencies and ignored evidence remain intentionally retained for the owner's active integration. Reading/token cost was not measured.

## Findings and disposition

No new material findings. M8-D1 resolved. Earlier vacuous fixture coverage is explicitly corrected while complete historical reports remain preserved.

## Verification

One full11 native0:1816 root passes plus existingTODO,22 MCP passes; known moderate advisory remains. One512MiB native proof passed with matched hashes and owned cleanup. See complete report for reach and receipts.

## Round outcome

Accepted locally on the exact gated index. Root owns the small final record check, commit/main/push, hosted matrix, published artifact and game adoption.
