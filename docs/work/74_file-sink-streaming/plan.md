# Stream FileSink JSONL in bounded UTF-8 blocks

Status: complete
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

Complete producer milestone. Engine 2.6.1 shipped at main/origin 48297848bf68576c87ae04ada193457d482d972a. Root accepted corrected 225-case focused checks, six native red controls, the one actual 536870912-byte/32768-row MAX_STRING_LENGTH proof, independent exact index review 3 PASS, and the final eleven local gates at native 0 (1816 root passes plus one existing TODO; 22 MCP passes). Hosted CI 37088530675 passed Node 20/22/24 and publish-dist job 111103833055. Root inspected downloaded asset 606946549: 658829 bytes, 426 files, SHA256 c81205daa28852a3dbec2cddac7f43f90f778c105057f2dcfd4ae2c36b4c922c, package and standalone runtime 2.6.1; all four inspected JavaScript files match the private dist used by the native proof. Receipts are retained under primary aoe2/tmp/engine-reader-m8-1002/hosted-acceptance/. This proves bounded-record public iteration beyond that native aggregate string limit, not constant memory for an arbitrarily large record, toBundle, corpus or MCP. E11/E13 producer capability and documentation are shipped; all 21 remaining game consumer dispositions, including E11/E13 adoption and E21 metrics/memory adoption, remain OPEN under root. The existing determinism TODO and MCP Hono moderate remain explicit; repairs stay 2/5. Earlier dated preparation and review outcomes below are retained as history.


2026-10-02: root rejected the unexecuted giant-file harness proposal because its finally could delete pre-existing fixture state and a throwing iterator return could skip own-FD close. Repair2/5 preserves proposal preimages, uses exclusive directory ownership and a per-run marker/token, separates cleanup attempts and forces FAIL on retained state. Timeout fallback checks the exact token and ordinary expected entries; unexpected state is retained/reported. Revised proposal is prepared, not run. Permanent review filenames/wrappers follow the maintained work-document structural contract; original authored bodies remain unchanged.


2026-10-02: own candidate refreshed onto docs-only main3c676619468ca431335158062cb104abd9742844 (eight disjoint paths). Git stash application converted six owned files' line endings; the prelaunch native1 is retained separately. Every unexpected delta was proved EOL-only, conversion preimages retained, and all21 frozen bytes restored before dropping only the owned stash. Primary work74 registry/placeholder and foreign learning deletion stayed unchanged; source/helper/tests and all101 source/388 compiled inputs remain exact. Root accepted focused review2/M8-D1 corrections and released exactly one reviewed native MAX_STRING_LENGTH proof; full11/commit/push remain held.


2026-10-02: the exact reviewed proof/launcher8bc32fc2/d6740743 ran once in the maintained held-before-release Windows Job/default shared gate lock. Generated/independent/candidate SHA256469d609bb6e2504e792581fa7b325e9fef72e24f33b0ee76cc4256576620b839 agrees. Native Node24.12.0/ENGINE_VERSION2.6.1 imported the own ordinary dist/index.js bound to compile manifest71d226a8 (101 source/config +388 output hashes verified pre/post and closing witness). Script2.9040308s, launcher2.9657569s, Job5.633s/user2.140625s/kernel1.484375s; active0/cleanup true, no leftovers, no timeout/cleanup errors, exclusive marker-owned fixture absent. Receipt population proves bounded-record iteration beyond this native aggregate string limit; no peak-memory, throughput, arbitrarily-large-record or toBundle/corpus/MCP constant-memory claim. Proof receipts remain ignored under aoe2/tmp/engine-reader-m8-1002/native-string-proof-1/ and native-string-proof-job-1/. Stop after fresh immutable handoff; full11/commit/push remain held. Repairs stay2/5.


2026-10-02 final-gate preparation: current debugging/gate-proof wording now reflects the one actual bounded native result, and the defect-register entry is verified present after the old CRLF-sensitive insertion failure. Work71 E11/E13 producer rows describe an unshipped locally verified2.6.1 candidate; E15 now describes shipped2.6.0/main/hosted evidence. All21 game consumer dispositions and E21 metrics/memory adoption remain OPEN. Product13 exact bytes and primary reservation/learning deletion stay preserved. Root released one ordinary maintained npm run gates on the exact staged candidate, with no duplicate private/integration gate, baseline update or runtime mutation. Final integrated review/commit/main/push/hosted/adoption remain pending.

2026-10-02 final local acceptance: exact indexc3a49c94 passed all11 gates (1816 root passes plus1existingTODO;22 MCP passes),48.5409661s/Job51.385s/CPU82.234375s/active0/cleanup true. Root full/prod audits0; known MCP Hono moderate remains below high threshold. Pack dry-run2.6.1/426files and four exact benchmark counters/calibrated baseline bounds passed. Complete independent review3 PASS is retained in reviews/3_integration.md. Only this acceptance record/report append follows the frozen gate; one affected document check precedes commit. Hosted/artifact/all21gameconsumer acceptance remains open; repairs2/5.


2026-10-02 closure: root accepted M8 producer shipping at main/origin 48297848bf68576c87ae04ada193457d482d972a, hosted CI 37088530675 and downloaded asset 606946549 with the digest and producer bounds above. Status is complete for this FileSink milestone; game E11/E13 and E21 adoption remain open. No new product repair, native proof, full gate or consumer run was performed for this documentation closure; repairs remain 2/5.
