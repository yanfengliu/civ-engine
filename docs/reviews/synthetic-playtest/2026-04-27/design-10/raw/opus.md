Reviewing iter-10 against the iter-9 finding and engine facts.

**Engine-fact verification:**
- §7.1 step 4 confirms `policyCtx.tick = world.tick + 1` (about-to-execute). ✓
- `submitWithResult` called when `world.tick = T` produces `submissionTick = T`. ✓
- Conversion `entry.tick = submissionTick + 1` lands at the right `PolicyContext.tick`. ✓

**Iter-9 fix coverage:**

1. **§6.3 doc-comment** on `ScriptedPolicyEntry` now states explicitly: matched against `PolicyContext.tick`, not `submissionTick`; includes the literal `bundle.commands.map((cmd) => ({ tick: cmd.submissionTick + 1, type: cmd.type, data: cmd.data }))` snippet plus a sentence explaining why the +1 is required (semantics differ by one step).

2. **§6.3 prose** cross-references the doc-comment with: "bundle `submissionTick` is the tick when `submit*` was called; the corresponding command runs during the *next* `step()` (tick `submissionTick + 1`)". Clear chain from submit-time → execute-time → policy-context-time.

3. **§12 regression test** is well-specified: record → convert (with +1) → replay → assert identical command stream (types, data, ticks). Walks through the off-by-one path end-to-end. Edge cases (empty bundle, multi-command tick, non-zero start tick) all consistent with the conversion formula since `submitWithResult` ordering is preserved by `.map()`.

**Other checks:**
- §12 "matched against `PolicyContext.tick` = about-to-execute tick" line for `scriptedPolicy` reinforces the contract.
- No regressions to ADRs, lifecycle steps, failure-mode taxonomy, or symbol surface.
- Twelve symbols in §18 still match §4 prose.

No remaining BLOCKER/HIGH/MED. Convergence reached on Codex's last open finding.

ACCEPT.
