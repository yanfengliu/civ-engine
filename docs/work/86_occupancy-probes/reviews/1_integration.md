# Review 1: integration

## Target

Engine work86 independent release integration in C:/Users/38909/Documents/github/civ-engine-worktrees/occupancy-probes-1107. Base and HEAD: 22f3e19746cd50da264aaba259856d625b833e2a. Exact frozen staged tree: 081a1231929119aeb1dac277f83a9527bbda5335. Prior source-reviewed tree: 0f9e08aa0335180699d6b8a172f93c6e03f54dae, accepted in reviews/0_implementation.md. This round reviews the integration delta and its carried records, not a new implementation of the probe.

The integration manifest is tmp/occupancy-probes/integration-candidate.json, SHA256739f226cf8ae81be3c3ccca85f792bacd99397e0455d745c7513e9e6d4bc9d0b. Its 128,725-byte retained patch has SHA2569b255455e286707c415fb1f6820a8689a747d5be6f92ffc66b52e9ea3fc45317; both supplied patch length and digest were verified. The manifest names29 paths against the base and17 integration-delta paths against the prior reviewed tree.

Read-only Git comparisons confirmed that the tracked worktree equals the index and the index equals081a1231929119aeb1dac277f83a9527bbda5335. No write-tree, staging, commit, source/test change, build or runtime occurred. Only this new review report is authorized for writing.

## Reviewers and coverage

Codex native Astra/xhigh, independent reviewer publisher_review, assigned by root. Applied the repository/fleet review and work-record requirements in the existing native lane. No external reviewer CLI/source export, subagent or second provider lane participated.

Compared the exact trees, all source/test deltas, version/lock/badge/changelog changes, relevant public release semantics, work86 plan and preserved snapshot/review, work71 review4, carried work84 closure and scoped priority/devlog/registry additions. Re-read the unchanged helper and existing raw probe as surrounding implementation anchors. Inspected retained work84 hosted metadata, archive verification, downloaded-runtime and cleanup receipts locally; no network verification was performed. This is source/record integration review only. Full eleven gates, supported-Node CI, publication and downloaded2.11.0 runtime verification remain owner-run acceptance.

## Reports

### Codex native Astra/xhigh

No material source or version-integration finding was identified. The reviewed helper, tests and exports are unchanged; the additive release metadata coherently prepares2.11.0 on the accepted2.10.1 base without importing the unaccepted work85 optimization. Two minor documentation corrections are recommended below. This pass does not claim the release has been gated, shipped or adopted.

Source identity. The exact src/tests diff from0f9e08aa to081a1231 contains only src/version.ts, changing ENGINE_VERSION from2.10.1 to2.11.0. The helper, its test, Node/browser exports, WorldDebugger re-export and public-surface fixture have no integration changes. src/occupancy-debug-probe.ts is4,274 bytes with SHA256d4cd0920bf50248a016523ed219f5033b2d1a9a9fcde4a831c76d8f3a63c8c06, exactly matching the accepted source preimage. There is no work85 visibility source in this candidate. The decision to release independent work86 before work85 does not broaden its implementation scope.

Version consistency. package.json, package-lock.json's top-level version and packages[""].version, src/version.ts, the README badge, the changelog heading and release records all identify2.11.0. mcp/package-lock.json changes only the linked parent package version to2.11.0; the MCP package and its own lock remain0.1.2. No dependency resolution, integrity, package-manager setting or engine support range is changed by the integration. The additive function and three public types justify the planned minor bump. src/version.ts SHA256 is4fc18b0cd360d377b69d84b31aa8e50db9d66a7902aa989f0cfa0bbc840752f9. Metadata consistency is not evidence of a newly built or downloaded2.11.0 runtime.

Preserved source contract. The new factory remains structural and read-only with respect to gameplay occupancy. src/occupancy-debug-probe.ts:54-66 validates dimensions, explicit region, area and cell/claim budgets before queries. The capture at lines69-89 creates a new region/result, limits source calls in row-major order, uses one aggregate claim budget, preserves blocked/freeSubcellSlots from the source, and counts omitted claims without rewriting gameplay truth. It does not reset source instrumentation or hide the largest-cell materialization bound. The changelog and plan accurately retain those limits. Both public barrels and fixture changes remain the ones reviewed in round0.

Verified unchanged surrounding-code citation: src/world-debug-probes.ts:17-36 still captures the original eight raw-grid snapshot fields: width, height, version, blockedCells, occupiedEntities, occupiedCells, reservedEntities and reservedCells. This source is outside the integration delta and was read directly. The separate binding probe neither changes this existing snapshot nor adds a mutable-grid escape. The release prose's reference to the old global counters should be understood as this unchanged eight-field snapshot, including dimensions/version.

Original review provenance is preserved. reviews/0_implementation.md is14,144 bytes, SHA256e6c978f97748aff2678f5af4b8242e600cd1407853eda350ed9d0e462161c559, matching the complete prior authored report. snapshots/0_plan.md has Git blob3c9add4590d315c4f0ca3dec438a77c0acced8f1, exactly equal to docs/work/86_occupancy-probes/plan.md in reviewed tree0f9e08aa. The release-preparation edits to the current plan therefore do not destroy the reviewed plan preimage.

Work71 review4 is also unchanged:32,537 bytes, SHA2560f04e80dc0428772ce1d31f3afa40579f2d694a9ba46f3723efd549eff6aa04f. It retains the E02/E20 and recording/playtest proposals, their source anchors, limits and open decisions. The copied current work71 plan explicitly states that this report authorizes no new observation policy, persistence migration or repair beyond the exhausted work73 budget. No proposal is represented as measured acceptance.

Work84 closure is consistent with the locally retained evidence inspected here. Primary tmp/work84-closure/hosted-metadata.json records completed-success run42448132800 with successful Node24/22/20 and publication jobs at22f3e197. archive-verification.json records675,957 bytes,434 entries and SHA2566858c24bdb71d6ffe89b5edb3522037ef1f0a62ab8309d6af9c6c6cc2334d754. published-runtime.json records actual Node/browser2.10.1 entries, accepted shared references, the nested rejection context and absent rejected state. cleanup-complete.json records227 retained files/1,513,137 bytes,136 prior gate-owned processes with zero leftovers, zero task-path matches, protected before/after hash equality and preservation of the foreign cursor deletion. retention.json's actual SHA256 equals the recorded7e7fa1060cc317507bb1e735f92e6b8a11aa817fe383c149ff061d877d048f86. These are retained historical receipts; this round did not rerun their commands, rehash all227 payloads or query hosted CI.

The work84/current devlog edits distinguish historical preparation from subsequent delivery and retain the scoped12.35% saved-component validation CPU result without claiming whole-game improvement. Work86's summary and detailed entries say prepared and keep full gates/publication/adoption pending. Work85 is explicitly unaccepted with observed regressions rather than silently included in2.11.0. The work87 registry/plan addition is an allocation bootstrap in this baseline-derived tree, not a claim that the independent distance-field candidate or its validation repair has shipped.

Game status bounds are generally preserved. The current work71 acceptance update distinguishes a precommit verify from committed-clean certification, retains the setup-failed native attempt and1/3 renewed attempt count, and leaves corpus, route cost, complete match, clean certification and delivery open. This round did not independently rerun or re-accept the game gate/native evidence; those records remain root-owned. The minor contradictory priority-row wording below should be corrected so that the same scope is stated consistently.

F0, P3 — Refresh the current AoE2 priority row rather than combining incompatible stages. docs/design/engine-priorities.md:10 says the combined107/155 candidate is "ready for review" and that "exact combined review ... and full gates remain", then the same row says integrated107/155/156 source8b356f passed the full precommit unit/browser/audit checks. The older current-tense review/gate clause is stale against the accepted combined/integration reviews and the row's own later statement. Rewrite the current row around source reviewed and precommit verify passed, while explicitly retaining current native/cost/complete-match/corpus proof, committed-clean certification, main/push and CI as pending. Earlier bounded human-candidate evidence can remain as clearly dated provenance. This is a minor record correction; it does not change the engine release source or establish game delivery.

F1, P3 — Add a working pointer beside the verbatim relocated summary link. docs/devlog/detailed/2026-10-02_2026-11-07.md:201 retains the old summary line with target detailed/2026-10-02_2026-11-07.md#june-summaries-retained-during-work84. From its new containing directory that resolves to docs/devlog/detailed/detailed/2026-10-02_2026-11-07.md, which does not exist. The intended section exists in the same file at line182. Preserve the literal historical summary line as required, and add a correctly based local-anchor pointer or an explicit original-base note with a working link. There is no need to rewrite the archived authored text to fix current navigation.

No other material finding emerged from the bounded integration comparison. The first attempted PowerShell lockfile parse could not represent the standard empty package key; it was repeated with ConvertFrom-Json -AsHashtable and the actual lock values were then inspected successfully. This was a read-only reviewer inspection correction, not a product, test or gate failure.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | P3: stale current-tense review/gate stage in the AoE2 priority row | Minor documentation correction recommended; no source/version blocker | State accepted source/precommit scope consistently and preserve remaining game acceptance |
| F1 | P3: relocated verbatim summary line retains a now-broken relative link | Minor navigation correction recommended while preserving the historical line | Add a current local-anchor pointer or equivalent correct-base explanation |

## Verification

Reviewer verified exact base/index/worktree identity, the complete source/test delta against0f9e08aa, version fields and lockfile scope, manifest patch hash/length, helper hash, both retained authored-report hashes and the exact original-plan Git blob. Read unchanged surrounding implementation and the release/current-status records. Inspected bounded historical work84 receipts and the retention-manifest hash without executing their commands.

Round0's61 focused cases, types/lint and three meaningful mutation controls remain its retained evidence; this integration did not change those test or helper bytes. No fresh runtime pass is claimed for the versioned2.11.0 candidate. No tests, builds, audits, gates, benchmarks, browser sessions, installs, network calls, source edits, index writes or commits were performed. The only new file is this integration review.

## Round outcome

Integration source/version review passes with no material findings and two minor record corrections. This is not release acceptance: full eleven gates on the final tree, main/push, terminal supported-Node/publication CI, downloaded immutable2.11.0 runtime checks and cleanup remain pending. The review does not establish game adoption or transfer acceptance to work85/work87. Preserve this report and apply the minor wording/navigation corrections without altering the reviewed product/test source.
