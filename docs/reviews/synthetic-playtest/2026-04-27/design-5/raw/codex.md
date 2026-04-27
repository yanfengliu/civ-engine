[MED] §14 still contains the old `c`-bump conclusion. The T2 bullet correctly changes the `sourceKind` widening to `v0.8.0` / `b`-bump, but the closing paragraph at the end of §14 still says "`c`-bump rather than `b`-bump per ADR 3." That leaves the versioning plan internally contradictory and still out of sync with AGENTS.md's breaking-change rule.

[MED] §7.1/§10 still overstate the non-vacuous `selfCheck()` guarantee. The new validation only rejects `snapshotInterval == null && terminalSnapshot === false`, but a zero-segment bundle is still possible whenever `terminalSnapshot` is false and the run ends before the first periodic snapshot, for example `maxTicks < snapshotInterval`, or an early `stopWhen` / `policyError` / `poisoned` stop. The sentence in §10 claiming the validation "guarantees at least one segment exists" is therefore still false.

[MED] The policy submission model is still internally inconsistent. §5.2 says policy effects must flow through the returned `PolicyCommand[]`, with the harness performing `world.submitWithResult`. But §5.1 clause 2, §7.2's "partial-submit before policy throw" path, and §12's matching test case all assume a policy can imperatively call `world.submitWithResult` itself. Those are materially different contracts; the failure-mode and test plan need one canonical model, with the other called out explicitly as out-of-contract if it remains possible only because `context.world` is live.

[NIT] The `snapshotInterval` field docs in §7 still point to "§7.1 step 1", but the validation now lives in §7.1 step 0.

[NIT] §18 still says "this iteration is iter-2 of design review" while the document header/status is clearly iter-5.
