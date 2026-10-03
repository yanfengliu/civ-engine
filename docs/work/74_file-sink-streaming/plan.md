# Stream FileSink JSONL in bounded UTF-8 blocks

Status: active
Owner: /root
Created: 2026-10-02
Updated: 2026-10-02

## Problem and outcome

The 2.6.0 baseline reads and parses whole JSONL files before its public generators yield; this crosses Node's aggregate string limit and contradicts its streaming documentation. Content-based tail tolerance also hides completed malformed rows matching an unterminated final fragment. M8 makes the five public synchronous iterators read bounded UTF-8 blocks with truthful remaining memory limits.

## Scope

Implementation owner:/root/engine_reader_contract_audit. Base57de5ce5356781389c4ae9db3dde89f51b39f209 (engine2.6.0). Own maintained-controller worktree:civ-engine-worktrees/engine-reader-m8-1002. Root owns integration/heavy slot/adoption; independent source reviewer:/root/engine_m2_acceptance. Only FileSink/internal reader, contract/claim tests, recording/API docs, release stamps and task records change. No World/voxel/game/format/dependency/metrics changes. Allocator reserved74 through primary; primary registry/placeholder are retained unchanged while this tree carries the assigned reservation.

## Approach

Use one65536-byte buffer, incremental legacy-compatible UTF-8 decoding and explicit positional reads bounded by first-next fstat size. Yield each valid row before parsing later rows. Physical LF ends a completed line; only malformed actual unterminated final text is tolerated. Finally closes exactly once; a separate primary-error flag preserves falsy injected/native failures when close also fails. Native read-zero terminates truncated files; no atomic content snapshot is promised. Retained historical source investigation:[review0](reviews/0_design.md), with its dated horizon correction.

## Acceptance criteria

- All five public iterators preserve writer/layout/signatures and bounded-record JSON/CRLF/BOM/malformed-UTF8 compatibility.
- Tests prove lazy opening, physical malformed-line rules, prefix-before-later-error, Unicode seams, explicit byte bounds, independent append-excluding horizons and native read-zero termination.
- Exhaustion/return/for-of/injectedthrow/open/fstat/read/parse/close errors prove owned descriptor cleanup and primary identity.
- Eager/parse-ahead/content-tail/no-finally/close-masking controls turn their class gates red and restore exact source.
- API/guide claim pins observe the actual FileSink path and state largest-record/toBundle/corpus/MCP bounds.
- Native actual-MAX_STRING proof and final eleven gates run only after root releases their reviewed measurement/heavy slot. Exact independent source review and root integrated acceptance precede commit/main/push/hosted release; game adoption remains separate.

## Implementation steps

- Completed base revalidation and allocator handshake; preserved primary preimages.
- Initial tests-first183cases returned native1,115failed/68passed; existing writer suite passed. Job elapsed5.173s,user1.34375s,kernel1.34375s,cleanupProoftrue. Evidence:aoe2/tmp/engine-reader-m8-1002/red-1/.
- Candidate1 returned native0/183 PASS. Those passes did not prove six malformed-byte fixtures: Vitest spread array rows into numeric callback arguments, so their loop never ran. Source-checks-1 ran225 PASS but native typecheck2/lint1 exposed the instrument and close-finally lint problems. Both the RED receipt and original source/test preimages are retained.
- Repair1/5 uses object rows with an explicit exercised-count assertion, corrects lint-safe call syntax and factors close-error precedence outside finally without changing its contract. Source-checks-2 ran225 PASS/typecheck0/scoped-lint0 on native Node24.12.0, Vitest4.1.8, TypeScript5.9.3 and ESLint9.39.4. Job8.959s, user7.703125s/kernel2.9375s, cleanup true/active0.
- Six finite controls returned native1 with expected failures: original-array vacuity6 (all explicit count assertions), eager10, parse-ahead5, content-tail5, omitted-finally5 and close-masking30. Selected controls deliberately skip unrelated cases. Exact source/test hashes restored after each arm; final225/225 PASS has no skips. Job8.296s, user4.40625s/kernel2.921875s, cleanup true/active0. Complete authored control report and receipts: aoe2/tmp/engine-reader-m8-1002/controls-1/results.json and controls-job-1/job-gate-result.json.
- Freeze source/docs/measurement contract for independent review, prepare bounded native proof, and wait for root heavy-slot release.
- Merge fresh docs-only main before one final full gate; finish2.6.1 release and integration through root.

## Outcome

Active, corrected candidate and focused checks GREEN; repairs 2/5 spent. Independent source round1 found no material defect on the initial frozen helper/delegates but incorrectly treated six vacuous malformed-byte fixtures as exercised coverage; round2 corrects that claim and reviews the repaired instrument and controls. Typecheck, controls, docs and version acceptance were pending in round1. Its exact authored body and acceptance plan are promoted in reviews/1_implementation.md and snapshots/acceptance-plan.md. Focused round2 SOURCE/EVIDENCE PASS is accepted by root and retained complete in reviews/2_implementation.md; its original giant-file/full11 cutoff remains explicit. Private ordinary root/MCP dependency copies were prepared without installation/shared writes; MCP resolves this candidate. Native private root build returned0 and imports ENGINE_VERSION2.6.1; compile manifest SHA25671d226a83f527be78aacb64fb8a53751d51e800a3b2acf5087ad7a64d3311ae4 pins101 source/config inputs and388 outputs. Build Job5.155s, user3.34375s/kernel0.828125s, cleanup true/active0. The one root-released actual-MAX_STRING proof returned native0/PASS on private compiled2.6.1: actual536870912 ASCII bytes and32768 bounded16384-byte LF rows exceed native MAX_STRING_LENGTH536870888; eager readFileSync utf8 failed with native ERR_STRING_TOO_LONG while all32768 public iterator rows and rolling hashes matched. Root accepted one ordinary full11 native0 and final independent index review3. Commit/main/push, hosted matrix/artifact and game consumer adoption remain open. Preliminary setup/reading elapsed and token cost were not measured.


2026-10-02: root rejected the unexecuted giant-file harness proposal because its finally could delete pre-existing fixture state and a throwing iterator return could skip own-FD close. Repair2/5 preserves proposal preimages, uses exclusive directory ownership and a per-run marker/token, separates cleanup attempts and forces FAIL on retained state. Timeout fallback checks the exact token and ordinary expected entries; unexpected state is retained/reported. Revised proposal is prepared, not run. Permanent review filenames/wrappers follow the maintained work-document structural contract; original authored bodies remain unchanged.


2026-10-02: own candidate refreshed onto docs-only main3c676619468ca431335158062cb104abd9742844 (eight disjoint paths). Git stash application converted six owned files' line endings; the prelaunch native1 is retained separately. Every unexpected delta was proved EOL-only, conversion preimages retained, and all21 frozen bytes restored before dropping only the owned stash. Primary work74 registry/placeholder and foreign learning deletion stayed unchanged; source/helper/tests and all101 source/388 compiled inputs remain exact. Root accepted focused review2/M8-D1 corrections and released exactly one reviewed native MAX_STRING_LENGTH proof; full11/commit/push remain held.


2026-10-02: the exact reviewed proof/launcher8bc32fc2/d6740743 ran once in the maintained held-before-release Windows Job/default shared gate lock. Generated/independent/candidate SHA256469d609bb6e2504e792581fa7b325e9fef72e24f33b0ee76cc4256576620b839 agrees. Native Node24.12.0/ENGINE_VERSION2.6.1 imported the own ordinary dist/index.js bound to compile manifest71d226a8 (101 source/config +388 output hashes verified pre/post and closing witness). Script2.9040308s, launcher2.9657569s, Job5.633s/user2.140625s/kernel1.484375s; active0/cleanup true, no leftovers, no timeout/cleanup errors, exclusive marker-owned fixture absent. Receipt population proves bounded-record iteration beyond this native aggregate string limit; no peak-memory, throughput, arbitrarily-large-record or toBundle/corpus/MCP constant-memory claim. Proof receipts remain ignored under aoe2/tmp/engine-reader-m8-1002/native-string-proof-1/ and native-string-proof-job-1/. Stop after fresh immutable handoff; full11/commit/push remain held. Repairs stay2/5.


2026-10-02 final-gate preparation: current debugging/gate-proof wording now reflects the one actual bounded native result, and the defect-register entry is verified present after the old CRLF-sensitive insertion failure. Work71 E11/E13 producer rows describe an unshipped locally verified2.6.1 candidate; E15 now describes shipped2.6.0/main/hosted evidence. All21 game consumer dispositions and E21 metrics/memory adoption remain OPEN. Product13 exact bytes and primary reservation/learning deletion stay preserved. Root released one ordinary maintained npm run gates on the exact staged candidate, with no duplicate private/integration gate, baseline update or runtime mutation. Final integrated review/commit/main/push/hosted/adoption remain pending.

2026-10-02 final local acceptance: exact indexc3a49c94 passed all11 gates (1816 root passes plus1existingTODO;22 MCP passes),48.5409661s/Job51.385s/CPU82.234375s/active0/cleanup true. Root full/prod audits0; known MCP Hono moderate remains below high threshold. Pack dry-run2.6.1/426files and four exact benchmark counters/calibrated baseline bounds passed. Complete independent review3 PASS is retained in reviews/3_integration.md. Only this acceptance record/report append follows the frozen gate; one affected document check precedes commit. Hosted/artifact/all21gameconsumer acceptance remains open; repairs2/5.
