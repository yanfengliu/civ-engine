# Review 3: implementation

## Target

Repository: civ-engine. Worktree: C:/Users/38909/Documents/github/civ-engine-worktrees/fractional-visibility-1107. Branch: codex/fractional-visibility-1107. HEAD/base: `8c774d692957ab91b16d894d954b79dd398ff2c0`. Exact reviewed staged tree: `26b3b7d189dbc25f6efd707651315354ce231827`. The target contains 22 changed paths: one production source, two extracted tests, narrow public documentation and work85 records. This authored report is subsequent to that frozen target.

The uncommitted target is recoverable from the base and retained ignored patch `tmp/fractional-visibility-1107/fractional-candidate.patch`, SHA256 `480853F8E635ED25242F116ED74D54F3626F8E243D61820E696D505060DA306A`. Its file inventory is `tmp/fractional-visibility-1107/review-packet.json`, SHA256 `876BD0D06D15570B937414ACD03DDF91ED238F832D8B0F990958196EAE5DE696`. Retain both until root binds the reviewed contents to a recoverable commit. All 22 working-file lengths and SHA256 values matched the packet, and a read-only index comparison against the named tree exited 0.

The production source SHA256 is `F780EFFA6FE0157BBF426E7AA9EA0BD9952B18D7750D54B0DD1595242ECB5161`. The extracted continuous and oracle test hashes are respectively `B5B70D165F08485CD2EBC2D27263BCB5B408E8EB090E2405056499CF4EA2CBFA` and `C0EA391F8B993B5231FD65D2F908118420B85F36C25003968001449C04B2F398`; both match their original rejected-tree counterparts exactly.

## Reviewers and coverage

Reviewer: native Codex task `/root/fractional_review`, assigned the pinned Astra/xhigh source-and-evidence lane. The reviewer read repository instructions, the fleet coordinator Delegate section and canonical review runbook, applicable lessons, session-start documents, the complete visibility source, changed tests and public docs, retained decision/review records and selected raw evidence. No subagents were used. Root reported the external CLI/source-export review path unavailable after denial; this review did not retry it, and no Claude or second external-lane approval is represented.

This was static source review and read-only evidence verification. No tests, runtime imports, installs, builds, benchmarks, browsers, staging or Git mutations were executed. Only this authored report was written. Plain `git status` failed with worktree/cwd permission diagnostics; those failures are not status proof. Direct source/evidence reads, file hashes, Git object reads and the exact staged-tree comparison succeeded. No task-owned persistent process or GUI was launched.

## Reports

### Native Codex /root/fractional_review

No material source defect was found in the approved fractional-only boundary. The only production changes are the two calls at `src/visibility-map.ts:71` and `src/visibility-map.ts:189`, and the private helper beginning at `src/visibility-map.ts:320`. Git reports 11 added and two removed lines: two call replacements plus nine added helper/separator lines. The helper rejects nonfinite coordinates before finite bounds checking; valid centers reach the existing radius check. Setter validation still precedes player creation, and the loader preserves its previous copying and duplicate-entry behavior.

I independently reversed precisely those edits in memory and compared the result with the retained shipped source; the strings were equal. The retained baseline also has the same Git blob ID, `dc96d2d16f90af7f1f00e306243804369748f2ed`, as the source at the named base. This independently supports the inverse assertion in `tmp/fractional-visibility-1107/compile.mjs:8` and confirms that the candidate is not a sixth optimizer implementation.

Outside-diff code inspected: `src/visibility-map.ts:247` still bounds the existing raster scan; `src/visibility-map.ts:258` evaluates the unrounded inclusive circle; `src/visibility-map.ts:279` routes cell indexing through the unchanged integer validator; and `src/visibility-map.ts:139` preserves query counting and absent-player short-circuiting. The unchanged update at `src/visibility-map.ts:118` uses final batched sources and the existing recomputes/computedCells meanings. State copying and canonical order at `src/visibility-map.ts:167` and `src/visibility-map.ts:237` remain unchanged. These are source reads outside the changed hunks, not citations inferred from a patch header.

The two test files exercise literal half-cell and clipped circles, zero radius, exact fractional saves, nonfinite/bounds/radius error order, rejected-setter atomicity, integer queries, duplicate loads and copied extra fields. The three seeded lifecycle oracles visit every map cell at `tests/visibility-incremental-oracle.test.ts:34`, independently of the production bounding-box scan. The existing integer-source semantics are additionally supported by the exact source inverse and the retained compatibility replay; this review does not claim that finite fixtures prove every possible numeric input.

Compatibility disclosure is clear in `docs/api-reference.md:1000` and `docs/api-reference.md:3476`: state fields remain unchanged, new readers accept old integer states, and old integer-only readers reject newly fractional source values. The current plan/design keep the intended 2.13 release after work87, full gates, delivery and AoE2 adoption pending. No package, lock, version source, barrel, surface fixture, architecture or central tracker/devlog change is in this target. A scoped search found no current public-guide/API/source claim for the rejected optimizer's unpublished work metrics. Historical rejected proposals and their earlier version numbers remain explicitly historical.

F4 (P3): `docs/guides/ai-integration.md:156` says "Invalid source centers report `visibility_source_coords_invalid`", which overstates the error's scope. Finite centers such as x = -0.5 are invalid but correctly throw `visibility_out_of_bounds` at `src/visibility-map.ts:324`; the API reference already documents that distinction. Narrow the guide wording to nonfinite source centers, optionally naming the separate bounds code. This is a minor documentation accuracy issue, not a production behavior defect.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F4 | P3: AI integration guide describes the nonfinite-source error as covering every invalid source center. | Owner disposition pending; minor documentation correction. The implementation and API reference agree on the intended distinction. | Change the wording at docs/guides/ai-integration.md:156 to identify nonfinite centers specifically; root can verify this small content repair. |

Prior F0-F3 and earlier authored reports are preserved without invented closure or revised dissent. This round accepts neither the stopped performance candidate nor its historical acceptance claims.

## Verification

Recorded focused receipt: `tmp/fractional-visibility-1107/focused-acceptance.json`, SHA256 `A2A2198168051F5274C9A45C5EFA32B02BC26F3E873B3EB790FDA61AFCAF5889`. Its hash matches the packet. I inspected actual stdout/stderr and process receipts: unchanged baseline has 17 failures and three passing controls in 20 cases; the candidate has 66 passes in nine files; strict typecheck and affected ESLint receipts exit 0. The baseline errors originate in the old integer source validator rather than setup failure. These are verified retained results, not tests newly executed by this reviewer.

All five mutation logs contain genuine test AssertionErrors: rounded setter, rounded restored source, omitted finite checking, omitted source bounds and fractional point-query admission. The first harness stopped on a three-versus-two selector occurrence assertion before the fourth mutation. That failure is retained separately; the corrected harness restricts replacement to the source helper and runs only the remaining two controls. Both scripts restore the original source in finally, and the resulting source hash still matches the frozen target. The setup failure is not counted as a successful mutation control.

The private build record's eight emitted module hashes match their files, and all five replay input hashes match the workload script and four captured traces. The replay source at `tmp/fractional-visibility-1107/integer-parity.mjs:13` checks actual captured returns; lines 14-18 compare per-checkpoint states/old metrics while asserting that observation adds no sort or metric change. Raw stdout and JSON agree on four 120-boundary windows plus two 60-boundary synthetic cases, totaling 600. This is untimed compatibility evidence only, not renewed optimization or whole-game runtime acceptance.

Retained rejected-research manifest SHA256 `6A8BA13841D90350D1140651F0BC132FA347A2E59D60746599F408B27D4C4707` matches the packet. Summing its entries yields 5,145 files and 17,815,308 bytes. I did not rehash the full archive. I checked the named source/manifest snapshots, selected captured traces and final timing/memory/runtime summaries against both copied and original files; every sampled hash matched. The separate final-candidate manifest has 46 entries and SHA256 `4BCC6CEA8DC325D4C07FC1CA5F01B14B9400DAAD0891C450E666D4C2AFB0822B`; its retained source and visibility-test entries checked against their hashes. The original rejected runtime receipt's selected current source/test hashes also still match.

Original reviews0/1 and all three originally approved snapshots match the previous tree byte-for-byte. Rejected plan/design snapshot hashes match the original plan/design, including the historical design's preserved line endings. The final timing evidence confirms the retained mixed75%-1024-radius1 wall regression in every pair, median paired +5.4461 ms, and mixed25% CPU +31 ms/1.3974x with four increases. It therefore supports retaining rejection rather than recasting the optimization as accepted. This sampling supports the specific provenance checks above; it is not a new full-archive audit or a fresh performance run.

## Round outcome

The exact fractional-only source candidate has no material source finding and is suitable to proceed to coordinated content checks, full gates and integration. F4 is a minor public-doc wording repair. The stopped optimization remains rejected after five attempts. This report provides no runtime, release, publication, retained-package or consumer-adoption acceptance. Root still owns final content/version/changelog/devlog work, all required gates, exact integration review, main/push, terminal Node20/22/24/publication CI, archive/runtime verification and cleanup; scoped AoE2 true-center adoption remains separate.
