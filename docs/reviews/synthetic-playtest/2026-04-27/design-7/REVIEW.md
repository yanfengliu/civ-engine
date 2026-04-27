# Spec 3 — Design iter-7 Review Synthesis

**Iter:** 7. **Subject:** v7 (commit 088f95a). **Reviewers:** Opus ACCEPT (3 NITs); Codex 1 MED + 1 LOW.

Trend: iter-5 had 3 MED, iter-6 had 2 MED, iter-7 has 1 MED. Convergent.

## Codex MED — selfCheck overclaim on poisoned bundles

§10/§12 say "every synthetic playtest in the engine's test corpus should pass selfCheck." `SessionReplayer.selfCheck()` skips failed segments only when `failedTick < segmentEnd` (`session-replayer.ts:286`). A terminal snapshot at the failed tick (the harness's hardcoded `terminalSnapshot:true`) bounds the final segment AT the failed tick — not skipped. `_checkSegment` replays through `world.step()` for that segment (`session-replayer.ts:355`), and poisoned ticks consume the tick number (`world.ts:1872`), so the replay re-throws the original exception. selfCheck doesn't return `{ok: true}` — it throws.

**Fix:** narrow §10 + §12. selfCheck is the CI gate for **non-poisoned** synthetic bundles. Poisoned runs produce a useful bundle for debug-investigation (load into viewer, scrub timeline) but selfCheck doesn't apply. CI guard pattern: `result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1` before calling selfCheck.

## Codex LOW — stale `stopOnPoisoned` in §7.3

§7.3 production-determinism input list still mentions `stopOnPoisoned`. v7 removed the option. Drop the reference.

## Opus NITs (skipped — landing post-design or as the implementer prefers)

- NIT-1 (Opus): same `stopOnPoisoned` stale ref in §7.3 — convergent with Codex LOW. Apply.
- NIT-2 (Opus): §1 wording lists "poisoned-world detection" as a "configurable stop condition." It's now built-in always-on. Cosmetic.
- NIT-3 (Opus): §10 "had `recorder.lastError` cleared and policy-throw before step" awkward. Cosmetic.

## v8 plan

1. **Codex MED** + **Opus NIT-1**: narrow §10 + §12 selfCheck claim; drop §7.3 `stopOnPoisoned` reference.
2. **Opus NIT-2 + NIT-3**: cosmetic word fixes.

After v8, iter-8. Expect ACCEPT/ACCEPT.
