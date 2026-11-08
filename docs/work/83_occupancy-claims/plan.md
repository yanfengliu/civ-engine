# Reserve placement without blocking movement

Status: complete
Owner: Codex adoption worker; root integration and acceptance
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

OccupancyBinding currently makes every whole-cell claim block both placement and movement. Add an occupy-only blocksMovement:false option so a claimed footprint still refuses other placement/reservations but admits subcell units and movement, including a claim created beneath existing units. Preserve default behavior and raw occupancy persistence.

## Scope

Engine E06 only: typed occupy option, query/claim policy, failure atomicity, complete focused contracts, public fixtures, minor2.10.0 and migration documentation. Empty-metadata failures in occupy/reserve/occupySubcell must not mutate claims. E09/E10 diagnostics, AoE2/game policy, persistence formats, dependencies, policy files, canonical engine-priorities and work71 checkpoint edits are excluded. Root owns final independent review, full-gate slot and delivery acceptance.

## Approach

The accepted [design](design.md) keeps raw whole-cell ownership authoritative for placement and stores movement policy privately in the binding. Existing blockedBy remains the whole-cell placement ledger; opt-in occupied claims alone expose blocksMovement:false, while blocked reflects movement plus full crowding. Default payloads and raw OccupancyGridState stay unchanged. Compose private helpers to keep source files below500 lines. Never expose the mutable wrapped grid.

Isolation: base301dd86823762bd4dd50c6170591b7b0cd8c9de9, branch codex/occupancy-claims-1107, C:/Users/38909/Documents/github/civ-engine-worktrees/occupancy-claims-1107. Only the controller-created node_modules junction to the engine primary was detached nonrecursively after exact path/target verification; private npm ci --ignore-scripts --no-audit --no-fund installed150 packages on Node24.22.1/npm11.6.2. Five primary package/lock/dist/dependency hashes remain unchanged. Preserve foreign engine-feedback-1001 and the primary cursor-state deletion.

## Acceptance criteria

- [x] Literal baseline tests demonstrate both E06 movement/placement failure and metadata failure atomicity before implementation.
- [x] Default and opt-in claims cover all movement/subcell/placement/reservation queries, claim-under-unit, repeat/move/policy transition, failure, release/destroy, reuse, metadata and exact version behavior.
- [x] Invalid metadata plus conflicts has explicit validation ordering; claims and version remain unchanged on invalid/conflicting requests, without promising unchanged unsupported-invalid-input error precedence.
- [x] New type/options and optional claim tag appear in both entry points, surface fixtures, API and applicable guides; version copies agree at2.10.0, without dependency or state-format changes.
- [x] Focused tests and deliberate regression controls, strict typecheck and lint pass; final exact independent review and root-granted full eleven-step gate pass before any code commit.
- [x] Root accepts and delivers main/push/hosted publication; exact archive and owned cleanup receipts close the work.

## Implementation steps

- [x] Read current contracts and authoritative allocation; isolate dependencies and record preservation hashes.
- [x] Write the accepted bounded contract and validation-order decision before source implementation.
- [x] Add tests first, retain genuine RED, implement the smallest coherent private policy/query changes, and prove GREEN plus controls.
- [x] Update public/version/documentation records, freeze an exact candidate, obtain independent review, and run full gates only after root grants the heavy slot.
- [ ] Hand off source, tests, receipts and remaining delivery/cleanup ownership; do not commit or push before root acceptance.

## Outcome

Delivered2.10.0 at main/origin2bbace65b857c4e7a77ef16f803e96e6c6c8808c; terminal hosted publication and retained runtime are accepted, and cleanup is complete. Earlier checkpoint paragraphs below retain their then-current status. Unchanged-source RED had21 failures/8 passes; the initial affected suite passed52, then expanded coverage passed79 across8 files, with strict typecheck and repository lint. Restored source/version/surface/size checks subsequently passed89 across10 files; work-doc check passed85 units and private MCP scripts-disabled install added141 packages. Seven single-regression controls each failed the intended assertion and restored exact source bytes: raw subcell blocking, placement exclusion, solid crowding conflict, hidden same-owner reservation, policy version, metadata-after-mutation, stale release policy. The binding is437 lines; private policy/status helpers keep exclusive raw ownership and the no-policy default query fast path. No full-state query or status recursion is allowed in movement; invalid preflight counter differences are documented. API/guides/version/pins and defect records are prepared.

[Coordinator plan review](reviews/0_plan.md) retains exact accepted plan/design snapshots and digests. Independent implementation review and all eleven gates passed; delivery/publication and cleanup remain pending. Ignored tmp/occupancy-claims-1107 retains RED/GREEN/type/lint/control/install and preservation evidence. No browser or consumer integration ran. Full gates/build/benchmark have now passed; commit and push are pending at this record checkpoint. Root's tmp/visibility-followup/owner-proposal.md and future allocation84 are preserved and excluded from83 implementation. Primary registry and untouched84 placeholder are copied only to carry the authoritative reservation.

**Empty-input investigation correction:** A suspected empty-area policy leak was disproved: the existing normalizer rejects empty areas before mutation. The first two positive tests failed with occupancy_area_empty, so the unnecessary attempted condition was reverted to the exact previously frozen source bytes. Two negative controls now assert unchanged prior policy/version and default fast path; final focused checks pass91 across10 files, fresh typecheck and affected-file lint pass. Retained ignored empty-investigation.json distinguishes this mistaken test hypothesis from the genuine E06/metadata RED.

**Independent implementation review:** Native Astra/xhigh publisher_review accepted exact tree91116fe9b926f3454a90dc887541db25891d099b against301dd86 with no material finding; full authored report is retained verbatim in [round1](reviews/1_implementation.md), SHA256 FCA25A9697EA258D73EE4EF40385EDCD53B5F0F0F291ACD413D6A7510B91AA47. V1 was a minor existing RTS-guide omission: corrected ignoreEntity wording to include subcell claims while retaining static blockers. This guide-only correction needs no new review round per the authored report. Product source/tests remain exact reviewed bytes. The full11 result follows below; delivery, hosted publication and cleanup are still pending.

**Full gate and root acceptance:** Exact staged tree555551b1c8a1ce533d45a492abee1425ca785ec6 passed maintained npm run gates in24.111s on Node24.22.1/npm11.6.2 (explicit and nested). All11 steps exited0: root full/prod audits, test1970pass+1existingTODO across119 files, typecheck, lint, build, pack, benchmark with exact counters and unchanged bounds, MCP audit/build/test22pass. Root audit7moderate development findings; production/MCP0. Compiled Node/browser2.10.0 smoke observed a passable occupied claim, admitted subcell unit and competing placement rejection. All18 reviewed product/test/manifest/lock hashes and5protected shared hashes matched. Watcher observed147 owned processes,0stopped/leftovers. Root inspected actual receipts and authorized ordinary commit/FF/push; owner publication approval already covers retained archives. Gate lock stays owned through push. Exact reviewed document preimages changed only for factual closure are retained under snapshots/1_*; authored reviewer report remains verbatim. Ignored gate-acceptance.json binds this evidence.

## Delivery and cleanup accepted by root

Source b0de80b0 and documentation checkpoint2bbace65 are merged/pushed. Exact-head CI42446777045 passed Node20/22/24 and publish-dist. Retained archive civ-engine-2bbace65b857c4e7a77ef16f803e96e6c6c8808c.tgz is675365 bytes/434 entries; SHA2568fe36400c98d290b35d5f821f1a8342f23578f8e1ea3e66121374969913b9218 matches the hosted asset722875327. Actual extracted package and both Node/browser exports report2.10.0 and pass claim-under-unit identity, competing placement/reservation rejection, independent same-owner reservation and release checks. Root independently checked hosted success, the downloaded hash and observed runtime receipts.

All62 retained evidence files (1294685 bytes) are hash-verified in primary civ-engine/tmp/work83-closure; retention-receipt.json SHA256364EE2E40A16D1EC25D60F2EC03779051170091B1117890FB5E787E62CE92EFC. Exactly one owned MCP junction was detached nonrecursively; the clean worktree and branch are removed. There are zero task-path processes, and all five protected primary inputs match. The foreign cursor deletion, foreign worktree and active84/85 trees are preserved. The approved fractional-visibility proposal is carried unchanged into work85's allowed snapshots record; it is outside this shipped placement feature. Actual AoE2 claim adoption and binding diagnostics remain separately tracked in the priority list.
