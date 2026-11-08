# Bounded read-only occupancy binding diagnostics

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

E09/E10: WorldDebugger's occupancy probe accepts the raw grid, while game consumers use OccupancyBinding to keep metadata, reservations and subcell rules consistent. A useful blocked-cell report must expose the binding's existing claim identities and movement policy without releasing a mutable raw grid or claiming sampled counts are global totals.

## Scope

Add a separate createOccupancyBindingDebugProbe factory over a read-only structural source (width, height, version and getCellStatus), using the existing OccupancyBinding method unchanged. Preserve createOccupancyDebugProbe and its exact eight-field raw-grid snapshot. No mutable grid accessor, occupancy lifecycle change, new dependency, save-format change, full-grid summary or game-specific policy. Base22f3e197. Work86 is independent of work85 and now proceeds first as additive2.11.0 because the visibility optimization still fails its fixed acceptance after five attempts. No work85 production code is included; its decision remains separate.

## Approach

Require an explicit in-bounds integer rectangle and detach it when constructing the probe. Validate nonnegative safe integer maxCells/maxClaims (defaults64/256), valid dimensions and a safe requested-cell product before any query. Capture row-major cells up to maxCells, retaining at most maxClaims aggregate entries (blocked claims before subcell claims, preserving each source array's order). Return dimensions/version, the requested rectangle, requestedCells, omittedCells, omittedClaims and detached cell rows. Each row preserves actual position, blocked and freeSubcellSlots, lists the retained blockedBy/crowdedBy identities/kinds/movement policy/slot offsets, and names omittedClaims. A truncated claim list never changes the source's blocked result. The snapshot deliberately contains no occupied/reserved/blocked global counts.

The factory calls getCellStatus normally, so its documented query counters increase; it does not reset metrics or mutate claims, versions or lifecycle. Read-only describes occupancy state, not an absence of instrumentation. maxCells bounds source calls, maxClaims bounds retained claim entries, and the source still materializes one complete cell status before truncation. One large custom subcell layout therefore remains a largest-cell cost. Source exceptions propagate unchanged. No caching: later captures reflect changed/released/destroyed claims.

## Acceptance criteria

- [x] Existing raw probe has exactly its eight original fields and values.
- [x] Binding claims retain metadata, identity, placement-only false, reservations and subcell slot/offset facts; ignored/outside cells are not queried.
- [x] Row-major prefix, zero/default/explicit limits and aggregate claim truncation are literal; counts never masquerade as global totals.
- [x] Creation validates invalid regions/limits before reads; options and returned nested values are detached.
- [x] Captures observe real occupy/reserve/subcell/release/destruction transitions while preserving gameplay state/version and honestly accounting query metrics.
- [ ] Public Node/browser types and surface pins, API/debugging/RTS guides and relevant architecture maps match; meaningful tests, exact independent review, all11 gates, main/push/CI and retained-package smoke complete.

## Implementation steps

- [x] Allocate86 and inspect current raw probe/binding contracts in a private worktree.
- [x] Write baseline contracts, execute RED after the shared runtime lane is free, then implement the small separate factory.
- [ ] Complete release records, review the exact integration delta, gate and deliver the independent2.11.0 milestone.

## Outcome

The separate factory and three public types are implemented. Corrected baseline contracts produce20 missing-factory assertion failures and1 passing old raw-probe control; candidate61 cases across5 files, strict types and affected lint pass. Three deliberate cell-limit, claim-limit and detached-region controls fail assertions and restore exact source. Initial RED17/1 included3 invalid test-fixture errors, so it is not claimed as17 valid contract failures. First candidate56/5 exposed the same fixture offset mistake: custom slots use[0,1), not centered offsets. Only fixtures were corrected; product behavior and assertions stayed intact. Exact baseline debugger bytes were temporarily restored for the valid RED and candidate bytes restored in finally. The corrected61-case run and final type/lint pass; task-path process census reports0. Source files, logs, source/control hashes and native receipts are retained under tmp/occupancy-probes. Independent native Astra/xhigh review0 accepted exact0f9e08aa0335180699d6b8a172f93c6e03f54dae with no material findings; the full report SHA256 E6C978F97748AFF2678F5AF4B8242E600CD1407853EDA350ED9D0E462161C559 remains unchanged. Root inspected it and the helper. Version2.11.0 and migration-facing changelog/devlog are prepared on unchanged22f3e197. The helper bytes still match the reviewed D4CD0920 digest. Exact integration review, full11, main/push/publication and downloaded-runtime/cleanup remain pending; this candidate is not shipped.


## Integration review

Native Astra/xhigh review1 accepted exact081a1231929119aeb1dac277f83a9527bbda5335 with no material source/version findings. Its complete12,066-byte report SHA2565D6CE4F503E22A0F9E48202A50B15C3439331CB092813AFCD3C4CE7C1D3B8FC6 is retained unchanged. Root read the entire report and corrected its two minor records: the current game priority row now states accepted source/precommit scope, and the verbatim relocated summary has a correctly based local pointer. Exact reviewed preimages are retained in snapshots/1_*. Only version differs under src/tests from the original source-reviewed0f9e08aa; full gates and delivery remain pending.


## Full-gate fixture repair

First full gate on17a0025a ran all eleven steps: ten passed, and the root test step failed only because the three new public types were absent from the separate member-surface fixture. It reported2,005 passes/1 failure/1 existing TODO; all22 MCP cases passed. Runtime/helper tests were unchanged. The maintained public-surface-members generator added only OccupancyBindingDebugOptions, OccupancyBindingDebugSnapshot and OccupancyDebugSource with their reviewed members; every existing entry remains identical. This is the expected additive-minor review artifact, not a relaxed gate. The47.217-second run and139 owned processes/zero leftovers are retained in tmp/occupancy-probes/full-gate-1. The watcher also rejected PowerShell's valid Int64 exit value while its native receipt correctly recorded1; its type check now accepts integer Int32/Int64 values and still fails closed. No pass is claimed for that run.


## Accepted precommit gates

Root accepted independent repair review2 (10,891 bytes, SHA256 DB52FA51FFF0E7740B08C35555ABB619881AE75A092067E7368F9E31FF0291E3) after reading the full report. Repaired tree e62a8de7 passed all eleven maintained gates in 24.384 seconds with 2,006 root tests plus one existing TODO and 22 MCP tests, Node24.22.1 and npm11.6.2. Both audits passed their high-severity thresholds; seven moderate development advisories remain, with none in production or MCP. All 129 observed task-owned processes exited, with no forced stops or leftovers. Built Node/browser2.11.0 smoke verified actual placement-only and subcell claims, bounded cells/claims, detached results, old raw fields and unchanged logical version. Source/API/version are unchanged by the fixture repair. The earlier failed gate remains retained as a failure. Main/push, hosted CI, downloaded-archive runtime, final evidence retention and worktree cleanup remain delivery acceptance, with game adoption separate.
