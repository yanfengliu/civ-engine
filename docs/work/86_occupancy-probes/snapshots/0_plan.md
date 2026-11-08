# Bounded read-only occupancy binding diagnostics

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

E09/E10: WorldDebugger's occupancy probe accepts the raw grid, while game consumers use OccupancyBinding to keep metadata, reservations and subcell rules consistent. A useful blocked-cell report must expose the binding's existing claim identities and movement policy without releasing a mutable raw grid or claiming sampled counts are global totals.

## Scope

Add a separate createOccupancyBindingDebugProbe factory over a read-only structural source (width, height, version and getCellStatus), using the existing OccupancyBinding method unchanged. Preserve createOccupancyDebugProbe and its exact eight-field raw-grid snapshot. No mutable grid accessor, occupancy lifecycle change, new dependency, save-format change, full-grid summary or game-specific policy. Base22f3e197; refresh onto work85 before final acceptance and use a separate additive version.

## Approach

Require an explicit in-bounds integer rectangle and detach it when constructing the probe. Validate nonnegative safe integer maxCells/maxClaims (defaults64/256), valid dimensions and a safe requested-cell product before any query. Capture row-major cells up to maxCells, retaining at most maxClaims aggregate entries (blocked claims before subcell claims, preserving each source array's order). Return dimensions/version, the requested rectangle, requestedCells, omittedCells, omittedClaims and detached cell rows. Each row preserves actual position, blocked and freeSubcellSlots, lists the retained blockedBy/crowdedBy identities/kinds/movement policy/slot offsets, and names omittedClaims. A truncated claim list never changes the source's blocked result. The snapshot deliberately contains no occupied/reserved/blocked global counts.

The factory calls getCellStatus normally, so its documented query counters increase; it does not reset metrics or mutate claims, versions or lifecycle. Read-only describes occupancy state, not an absence of instrumentation. maxCells bounds source calls, maxClaims bounds retained claim entries, and the source still materializes one complete cell status before truncation. One large custom subcell layout therefore remains a largest-cell cost. Source exceptions propagate unchanged. No caching: later captures reflect changed/released/destroyed claims.

## Acceptance criteria

- [ ] Existing raw probe has exactly its eight original fields and values.
- [ ] Binding claims retain metadata, identity, placement-only false, reservations and subcell slot/offset facts; ignored/outside cells are not queried.
- [ ] Row-major prefix, zero/default/explicit limits and aggregate claim truncation are literal; counts never masquerade as global totals.
- [ ] Creation validates invalid regions/limits before reads; options and returned nested values are detached.
- [ ] Captures observe real occupy/reserve/subcell/release/destruction transitions while preserving gameplay state/version and honestly accounting query metrics.
- [ ] Public Node/browser types and surface pins, API/debugging/RTS guides and relevant architecture maps match; meaningful tests, exact independent review, all11 gates, main/push/CI and retained-package smoke complete.

## Implementation steps

- [x] Allocate86 and inspect current raw probe/binding contracts in a private worktree.
- [x] Write baseline contracts, execute RED after the shared runtime lane is free, then implement the small separate factory.
- [ ] Review the exact additive API and bounded-read evidence; refresh after85, version, gate and deliver.

## Outcome

The separate factory and three public types are implemented. Corrected baseline contracts produce20 missing-factory assertion failures and1 passing old raw-probe control; candidate61 cases across5 files, strict types and affected lint pass. Three deliberate cell-limit, claim-limit and detached-region controls fail assertions and restore exact source. Initial RED17/1 included3 invalid test-fixture errors, so it is not claimed as17 valid contract failures. First candidate56/5 exposed the same fixture offset mistake: custom slots use[0,1), not centered offsets. Only fixtures were corrected; product behavior and assertions stayed intact. Exact baseline debugger bytes were temporarily restored for the valid RED and candidate bytes restored in finally. The corrected61-case run and final type/lint pass; task-path process census reports0. Source files, logs, source/control hashes and native receipts are retained under tmp/occupancy-probes. Independent exact review, refresh onto85, additive version/devlog/changelog, full11 and delivery remain pending; this candidate is not shipped.
