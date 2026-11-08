# Review 2: integration

## Target

Narrow work86 member-fixture and record repair in C:/Users/38909/Documents/github/civ-engine-worktrees/occupancy-probes-1107. Base/HEAD: 22f3e19746cd50da264aaba259856d625b833e2a. Exact repaired staged tree: e62a8de7dcb310b0d943218b8d3abde02cfb5d6a. First full-gate tree: 17a0025add7d8777365da78f119d9141538df6e2. Prior integration-reviewed tree: 081a1231929119aeb1dac277f83a9527bbda5335, with original implementation review at0f9e08aa0335180699d6b8a172f93c6e03f54dae.

The repair receipt tmp/occupancy-probes/gate-repair.json has SHA256e9232e6ffe707ee40315ca1efeea6ddb65006ad12cd84997d68d5669bc8e16d9. It binds the failed and repaired trees and the archived first-run evidence in tmp/occupancy-probes/full-gate-1. The repaired tests/fixtures/public-surface-members.json has SHA25644d2ad2a024321618113fe90033d945445a528d370175600c85aa37df6670bdf.

Read-only Git comparisons confirmed the tracked worktree equals the index and the index equals the repaired frozen tree before report creation. No staging, commit, write-tree, product/test edit or runtime command was performed. Only this new authored report is written.

## Reviewers and coverage

Codex native Astra/xhigh, independent reviewer publisher_review. Bounded native review of the exact fixture/record delta, the maintained member scanner/test contract, the unchanged public interface declarations, archived full-gate evidence and ignored watcher correction. No external reviewer CLI/source export, subagent or second provider lane participated.

No test, build, gate, benchmark, installation, browser or network execution was performed. Root owns the current full-gate rerun. Its outcome is not inferred from this source inspection or from the earlier ten passing steps.

## Reports

### Codex native Astra/xhigh

The narrow repair passes source/evidence review with no new material finding. It supplies the omitted member-level public-surface fixture entries for the already reviewed additive API, preserves all preexisting entries and assertion machinery, and corrects the prior two minor record findings without rewriting the original report. Runtime source, exported API and version2.11.0 are unchanged.

Exact fixture scope. From failed-gate tree17a0025a to repairede62a8de7, the only src/tests change is21 added lines in tests/fixtures/public-surface-members.json. A read-only parsed comparison found248 previous declarations and251 after repair, with zero changed or removed prior entries. The three additions are exactly OccupancyBindingDebugOptions, OccupancyBindingDebugSnapshot and OccupancyDebugSource. Their members match the unchanged declarations at src/occupancy-debug-probe.ts:6-28:

- OccupancyBindingDebugOptions: maxCells?, maxClaims?, region.
- OccupancyBindingDebugSnapshot: cells, height, omittedCells, omittedClaims, region, requestedCells, version, width.
- OccupancyDebugSource: getCellStatus, height, version, width.

No declaration is exempted, no member is hidden, and no assertion or scanner is modified. The comparison against the prior integration-reviewed tree081a1231 also shows no change under src or in package.json/package-lock.json/mcp/package-lock.json. The release remains additive2.11.0; there is no new surface beyond the types already reviewed in rounds0/1.

Verified unchanged surrounding-code citation. tests/public-surface-members.test.ts:38-53 scans every exported class/interface/object type, compares each declaration's exact member list with the fixture, then compares the full key sets. Its second test retains the public-class and inherited-World coverage guards. scripts/public-surface-members.mjs:26-32 identifies the maintained --update generator and its two fixture inputs. The scanner explicitly treats this member inventory as the second half of the public-surface contract, separate from top-level names. Updating this allowlist after the reviewed minor API addition is therefore the intended repair, not weakening the gate.

F2 — The separate member fixture was omitted from the initial release candidate; repaired here. This escaped the earlier bounded reviews, which checked the top-level names/types fixture but did not detect the missing member inventory entries. The full gate correctly caught it. The first retained failure is tests/public-surface-members.test.ts:49: the scanned OccupancyBindingDebugOptions members ['maxCells?', 'maxClaims?', 'region'] were compared with an undefined fixture entry. Adding all three actually exported declaration shapes, with every old entry preserved, repairs the entire observed omission class for this API rather than adding only the first declaration named by the assertion.

Original gate failure remains a failure. Archived full-gates.log:66-91 records exactly one failing root case,2,005 passing cases and one existing TODO across121 files. The actual failed assertion concerns the member fixture. The maintained gate then continues through typecheck, lint, build, pack, benchmark, MCP audit/build/test and reports Gates FAILED:1 of11 steps at lines620-625. Its MCP test stage has22 passes. gates.json records Node24.22.1, npm/nested npm11.6.2, native exitCode1 and47.217 seconds. The archived process receipt records root PID45416, observed process exit1,139 owned processes, zero forced stops and zero leftovers. These records do not become a passing run after the fixture edit.

All seven archived artifacts listed in gate-repair.json matched their declared byte counts and SHA256 values: gates.json, process-receipt.json, full-gates.log, runner.stdout.log, runner.stderr.log, watch-gates.ps1 and run-gates.ps1. The original empty runner stderr and native failed-gate stdout are retained. No output was regenerated by this reviewer.

Ignored watcher correction is separate from the product failure. The old wrapper at full-gate-1/watch-gates.ps1:41 accepted only [int] for the parsed native exit status; the new ignored wrapper accepts [int] or [long]. A byte-string comparison confirmed that replacing exactly that one predicate transforms the archived watcher into the current one. The wrapper still starts with failure exitCode1, rejects a missing receipt, null or noninteger status, checks disagreement with an available process exit status, performs identity-owned finally cleanup, rejects remaining owned processes and exits with the actual native receipt code. Accepting the valid Int64 representation of1 does not turn the failed gate into success. No test or repository gate policy was relaxed. This is source inspection of the wrapper repair, not a fresh execution proof of all malformed receipt cases.

Prior F0 is addressed. docs/design/engine-priorities.md:10 now says combined AoE2 source is reviewed and precommit gates passed, identifies reviews3-5 and the bounded5,746-unit/345-browser result, and separately retains current native controls, cost, complete human match, real corpus, committed-clean certification, main/push and hosted CI as open. The failed setup attempt still consumes1/3 renewed attempts. The formerly contradictory current-tense review/gate clause is removed without claiming game delivery.

Prior F1 is addressed. docs/devlog/detailed/2026-10-02_2026-11-07.md retains the historical summary line verbatim and adds an explanation of its original summary-file link base plus a correct same-file anchor at line203. The intended June summaries section exists at line182. The retained authored text is not rewritten to repair current navigation.

Review and snapshot provenance remain intact. reviews/1_integration.md retains its12,066 bytes and SHA2565d6ce4f503e22a0f9e48202a50b15c3439331cb092813afcd3c4ce7c1d3b8fc6. snapshots/1_devlog-detail.md has Git blob2ffea947374034ade3b4640c6ec0f755035912c3, exactly matching that document in reviewed tree081a1231. snapshots/1_engine-priorities.md preserves17 checkout CRLF line endings; its Git blob therefore differs from the LF-normalized indexed document. Read-only comparison confirmed that removing only those CR characters produces exactly the reviewed081a1231 text. Its preserved byte SHA256 is8662c9ac34c9feef5af3958500eead1aab0c7c5a5cb7af627e28fb376b3583a0. No textual difference was hidden by that comparison, and the reviewer did not normalize or edit either snapshot.

The additional work71/priority status wording records the completed fifth/final work85 matrix as stopped with remaining regressions, no sixth repair, no acceptance and no shipment. That is a bounded owner-status update, not inclusion of work85 source in this release. This review did not rerun or independently accept that performance matrix. Work86's plan keeps the original47.217-second gate failure explicit and leaves a fresh full-gate result to the owner.

The earlier plan sentence that only version differs under src/tests is historical to review1's comparison; this round explicitly records the subsequent member-fixture addition. No current runtime/API change is concealed by that history.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Prior minor stale AoE2 priority wording | Addressed in the repaired target | Current row now separates accepted source/precommit checks from remaining game acceptance |
| F1 | Prior minor relocated historical link | Addressed without rewriting historical text | Correctly based local pointer added beside the preserved line |
| F2 | Separate member-surface fixture omitted the three reviewed public types | Root full gate found the omission; the narrow fixture repair is accepted by this review | Three exact additions,248 prior entries unchanged; fresh full11 result remains owner-run acceptance |

## Verification

Reviewer compared the exact frozen trees and parsed the before/after fixtures, read the unchanged declaration/scanner/assertion sources, verified all seven archived evidence hashes/lengths, inspected the genuine failure and continued gate stages, checked the one-predicate watcher delta, and verified prior report/snapshot preservation. No maintained test, generator, wrapper, build, install, gate or browser was executed.

The archived first full gate is native exit1 with ten other steps passing; it is not recounted as green. The repaired fixture has not been given a reviewer-executed pass. Root's concurrently scheduled rerun must supply final full-gate acceptance on the completed candidate. CI/publication/downloaded-runtime/cleanup and game adoption remain distinct and pending unless accepted by the owner in later records.

## Round outcome

Narrow integration repair PASS, no unresolved material finding in this scope. F0/F1 are addressed, and F2's fixture repair preserves the public-surface gate rather than weakening it. Runtime source/API/semver remain2.11.0. Preserve the original failed run and this report; do not infer delivery or a successful rerun from source review.
