# Reserve placement without blocking movement

Status: active
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

- [ ] Literal baseline tests demonstrate both E06 movement/placement failure and metadata failure atomicity before implementation.
- [ ] Default and opt-in claims cover all movement/subcell/placement/reservation queries, claim-under-unit, repeat/move/policy transition, failure, release/destroy, reuse, metadata and exact version behavior.
- [ ] Invalid metadata plus conflicts has explicit validation ordering; claims and version remain unchanged on invalid/conflicting requests, without promising unchanged unsupported-invalid-input error precedence.
- [ ] New type/options and optional claim tag appear in both entry points, surface fixtures, API and applicable guides; version copies agree at2.10.0, without dependency or state-format changes.
- [ ] Focused tests and deliberate regression controls, strict typecheck and lint pass; final exact independent review and root-granted full eleven-step gate pass before any code commit.
- [ ] Root accepts and delivers main/push/hosted publication; exact archive and owned cleanup receipts close the work.

## Implementation steps

- [x] Read current contracts and authoritative allocation; isolate dependencies and record preservation hashes.
- [x] Write the accepted bounded contract and validation-order decision before source implementation.
- [ ] Add tests first, retain genuine RED, implement the smallest coherent private policy/query changes, and prove GREEN plus controls.
- [ ] Update public/version/documentation records, freeze an exact candidate, obtain independent review, and run full gates only after root grants the heavy slot.
- [ ] Hand off source, tests, receipts and remaining delivery/cleanup ownership; do not commit or push before root acceptance.

## Outcome

Prepared contract and isolated dependency installation only. No source edit, test execution, full gate, browser, build, benchmark, commit or push has occurred at this checkpoint. Evidence lives in ignored tmp/occupancy-claims-1107/. Root's AoE2 browser/full gate owns the heavy lane; only one-worker focused tests, typecheck and lint are authorized during iteration.
