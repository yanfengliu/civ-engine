All engine facts confirmed. Now reviewing v2 against iter-1 fix targets and looking for any remaining real issues.

## Iter-1 fixes verified

| Iter-1 issue | v2 status |
|---|---|
| HIGH: Step 7 needs concrete sub-steps | ✅ 9 sub-steps (7a-7i); 6 with full code, 3 with prose specs |
| HIGH: T2 Steps 1-4 needed test bodies | ✅ Full test code with `checkZeroDelta` walker, `allBuiltins` factory, `mkBundle` helpers |
| HIGH: ADR count inconsistent | ✅ 5 ADRs (23-27) consistent across all 4 sites |
| MED: Commit msg references v10 | ✅ T1 + T2 commit msgs reference design v4 |
| MED: `mkBundle` helper location undefined | ✅ Per-file duplication explicitly chosen + duplicated in each test file |
| MED: Single-pass test was weak | ✅ Side-effecting generator + `bundlesIterated` counter; verifies 5 not 55 |
| MED: `failedTicks?.length > 0` strict-mode bug | ✅ `(failedTicks?.length ?? 0) > 0` in 7e |
| MED: T2 Steps 7-8 headings only | ✅ Expanded with mkdir/diff/poll commands and full commit msg |
| LOW: "N tests" placeholder | ✅ "~50 tests across 4 test files (types: 2; builtins: ~36; runner: 4; compare: ~8)" |

## Engine facts verified

- `RecordedCommand.type: keyof TCommandMap & string` (line 44) — already string-typed; metric's `state.set(cmd.type, ...)` needs no cast ✓
- `SessionTickEntry.events[].type: keyof TEventMap` (line 55) — NOT constrained to string; metric correctly uses `String(ev.type)` ✓
- `CommandSubmissionResult.accepted: boolean` (world.ts:135) ✓
- `CommandExecutionResult.executed: boolean` (world.ts:150) ✓
- `SessionMetadata.incomplete?: true` (literal type, line 99); plan's `incomplete === true` check + override `incomplete: true` are both valid ✓
- `SessionMetadata.policySeed?: number` (line 106); user-defined-metric example reads it correctly ✓
- `SessionBundle<TEventMap, TCommandMap, TDebug>` 3-generic signature (line 109) matches plan's `runMetrics` signature ✓
- Asymmetry between commands (no `String()`) and events (`String(ev.type)`) is JUSTIFIED by the type constraints — not arbitrary

## Remaining findings

**NIT 1:** Sub-steps 7b, 7c, 7d describe tests in prose ("Add tests covering: empty corpus → `{}`; ...") rather than concrete code blocks. iter-1's stated target was "concrete factory + 3 tests each" for all 9 sub-steps; v2 achieves this for 6/9. The prose specs are clear enough that a TDD-disciplined implementer can derive the tests from the 7a/7e template, so this isn't a real bug — just incomplete fulfillment of the iter-1 fix target.

**NIT 2:** T2 Step 2 (order-insensitivity) has a comment "Use a focused metric set that returns plain values (not Records)" that contradicts the code which calls `allBuiltins()` (includes `commandTypeCounts`/`eventTypeCounts`, both Record-returning). Test still passes because the bundles have empty `commands` and `ticks[].events`, so both Records finalize to `{}`. Comment should be removed or updated.

**NIT 3:** T2 Step 4 (volatile-metadata) uses single-bundle corpora, so a hypothetical built-in that *counted unique sessionIds* would give 1 for both runs — passing the test spuriously. Adequate as a regression guard for the current 11 built-ins (none of which read sessionId/recordedAt at all), but a multi-bundle setup with 2+ distinct sessionIds would be a stronger guard for future built-ins.

**NIT 4:** §B review pattern uses `git diff HEAD~0 --staged` — `HEAD~0` is identical to `HEAD` and `git diff --staged` already implies HEAD. The inline comment "Use HEAD~1..HEAD as the base (this task's diff is one commit on main)" doesn't match the actual command (which reviews staged changes pre-commit, not a committed diff).

**NIT 5:** T1 Step 8 runner test creates `metrics = [bundleCount(), sessionLengthStats(), ...]` without explicit `as Metric<unknown, unknown>` casts, while T2's `allBuiltins()` factory uses casts on every entry. With method-shorthand bivariance the assignment may work, but the inconsistency means the implementer might hit a TS error in one file and not the other — easily fixed but worth aligning ahead of time.

## Verdict

All BLOCKER/HIGH/MED issues from iter-1 are addressed with substance, not just rephrasing. Engine facts (SessionBundle metadata fields, RecordedCommand/CommandExecutionResult schemas, generic signatures) all verified against `src/session-bundle.ts` and `src/world.ts`. Remaining findings are pure NITs that the implementer can resolve during TDD without changing the plan's structure.

Per AGENTS.md "iterate until reviewers nitpick instead of catching real bugs" — that's where we are.

**ACCEPT**
