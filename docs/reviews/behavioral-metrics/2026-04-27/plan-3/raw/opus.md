Iter-3 plan review complete. Summary:

**Verdict: REVISE** — bar (no remaining BLOCKER/HIGH/MED) not met.

**Iter-2 closure:** All 1 HIGH + 2 MED are properly addressed in v3 (T1/T2 collapsed; single v0.8.2 bump; bash-on-mingw clarification added).

**Codex iter-3:** 3 MEDs (delayed write — initially appeared empty so I started the synthesis solo, then Codex output landed and forced a re-adjudication):
- **MED 1 (shell):** DISMISSED — repeat of the iter-2 misread the user already classified as "shell-misread". Bash-on-mingw is correct.
- **MED 2 (path inconsistency):** UPHELD — three places in the plan reference different review-artifact paths (`§B`: `behavioral-metrics-T<N>/<date>/1/raw`; `§B comment`: "HEAD~1..HEAD"; `Final-pass`: `behavioral-metrics/2026-04-27/T1/...`). With single-task collapse, executor following §B writes to one path, then Final-pass checklist looks at a different path and fails. I had this as NIT G; Codex's MED is correct.
- **MED 3 (devlog rollover):** UPHELD — active devlog is 841 lines, AGENTS.md mandates rollover at 500. Plan's Step 12 says "append to latest detailed devlog" without an explicit rollover step. I missed this entirely in my Opus pass.

**Opus iter-3:** 8 NITs (5 carried from iter-2 + 3 new from v3 collapse). All allowed per bar.

**For v4:** address the two real MEDs (path consistency + devlog rollover step), then the plan should be ready. Files written:
- `docs/reviews/behavioral-metrics/2026-04-27/plan-3/raw/opus.md` (my independent review)
- `docs/reviews/behavioral-metrics/2026-04-27/plan-3/REVIEW.md` (synthesis with adjudication)

Codex's `raw/codex.md` was authored by Codex itself — left in place as the audit trail.
rrect.
- `SessionTickEntry.events[].type: keyof TEventMap` (no string constraint) — `eventTypeCounts` still uses `String(ev.type)`.
- `CommandSubmissionResult.accepted` / `CommandExecutionResult.executed` — boolean fields read by `commandValidationAcceptanceRate` / `executionFailureRate`.
- `SessionMetadata.failedTicks?: number[]` — strict-mode-safe `(failedTicks?.length ?? 0) > 0` from iter-2 retained in 7e.
- `SessionMetadata.policySeed?: number` — user-defined-metric example in Step 15 reads it correctly.
- `SessionBundle<TEventMap, TCommandMap, TDebug>` 3-generic signature matches `runMetrics` signature in Step 3.

No regressions from iter-2 in the engine-fact column.

## v3-specific checks

The v3 collapse touches structure, not code, so the review focus is structural integrity:

1. **File ownership across the single commit.** Step 12 lands api-ref + guide + ADRs + changelog + devlog + README + version bump. Step 18 lands ARCHITECTURE Component Map + drift-log + roadmap status + ai-integration + synthetic-playtest cross-refs. Both happen in the same commit. The split is by content domain (public-API vs structural arch), not by commit boundary. Reasonable.
2. **`engineVersion` in mock metadata.** `0.8.3` → `0.8.2` updated everywhere (Step 13's `mkBundle`). No stale `0.8.3` references remain.
3. **Commit-message template.** New unified template at the end correctly enumerates: 11 built-ins, integration-tests-as-part-of-this-commit, ADRs 23–27, structural docs. References design v4. Test-count rollup (`~55 new tests`) is a slight increase over v2's `~50` because it now includes the determinism file (4 cases). Plausible.
4. **Final-pass checklist.** Reduced from "two version entries / two task entries" to "one version entry / one task entry". Consistent with single-commit collapse.

## Remaining findings

### Iter-2 NITs that persist (allowed per bar)

**NIT A:** Sub-steps 7b, 7c, 7d describe tests in prose ("Add tests covering: empty corpus → `{}`; …") rather than concrete code blocks. iter-1's stated target was concrete code for all 9 sub-steps; v2/v3 achieve this for 6/9. The prose specs are clear enough that a TDD-disciplined implementer can derive the tests from the 7a/7e template.

**NIT B:** Step 14 (order-insensitivity) keeps the comment `// Use a focused metric set that returns plain values (not Records).` immediately above `const metrics = allBuiltins();` — the call now includes `commandTypeCounts`/`eventTypeCounts` (Record-returning), so the comment contradicts the code. The test still passes because the bundles have empty `commands` and `ticks[].events`, so both Records finalize to `{}`. Comment should be deleted or updated.

**NIT C:** Step 16 (volatile-metadata) uses single-bundle corpora. Adequate for the current 11 built-ins (none read sessionId/recordedAt) but a multi-bundle setup with 2+ distinct sessionIds would be a stronger guard against future built-ins.

**NIT D:** §B uses `git diff HEAD~0 --staged` — `HEAD~0` is identical to `HEAD` and `git diff --staged` already implies HEAD. The inline comment "Use HEAD~1..HEAD as the base (this task's diff is one commit on main)" describes a *committed* diff, but the actual command reads *staged* changes pre-commit. With v3's pre-commit review pattern, the correct command is just `git diff --staged` and the comment should be rewritten to match (e.g., "Review the staged diff before committing").

**NIT E:** Step 8 runner test creates `metrics = [bundleCount(), sessionLengthStats(), …]` without explicit `as Metric<unknown, unknown>` casts, while Step 13's `allBuiltins()` factory uses casts on every entry. Method-shorthand bivariance may let the assignment compile, but the inconsistency means the implementer might hit a TS error in one file and not the other.

### New NITs introduced by v3

**NIT F:** Steps 19 + 20 are not explicit checklisted steps — they collapse into a single parenthetical heading: `### (Step 19 + Step 20 — review + commit — appear above; they apply once Step 18 lands.)`. The actual work (run §B per-task multi-CLI review, run §D engine gates, commit using the template that follows) is well-described elsewhere in the plan, and AGENTS.md compels both regardless of plan presence. But the user's framing in the prompt promises "1-12 code surface, 13-18 integration+arch docs, 19 review, 20 commit", and the subagent-driven-development workflow generates TodoWrite items from `- [ ]` checklist items — neither Step 19 nor Step 20 has any checkboxes. Either rewrite as two explicit `### Step 19` / `### Step 20` blocks with `- [ ]` items pulling from §B/§D, or rename the placeholder heading to make clear that "see §B for Step 19, §D + commit-message-template for Step 20" is the intent.

**NIT G:** Path inconsistency between §B template and Final-pass cross-cutting check.
- §B template: `docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw` — matches AGENTS.md `<scope>/<date>/<iteration>/` convention with `scope = behavioral-metrics-T<N>`, `iter = 1`.
- Final-pass: `docs/reviews/behavioral-metrics/2026-04-27/T1/...` — treats `behavioral-metrics` as scope and `T1` as if it were the iter-num. Not the AGENTS.md convention.

Either path resolves to a findable directory, but an executor will pick one and may inconsistently switch between them. Pick one and use it in both places.

**NIT H:** §B template uses `<N>` placeholder for the per-task index, but with v3's single-task collapse there is only ever one task. The `<N>` should resolve to `1` (or be dropped: `behavioral-metrics`) — leaving `<N>` as a literal placeholder forces the executor to make the substitution at runtime, easy to forget.

## Verdict

All BLOCKER/HIGH/MED from iter-2 are closed:
- Doc-split HIGH → collapsed to single commit ✓
- Versioning MED → single v0.8.2 ✓
- Shell MED → was a misread; bash-on-mingw clarification added ✓

No new BLOCKER/HIGH/MED introduced by the v3 collapse. Remaining items are NITs (5 carried from iter-2; 3 new from v3 structural rewrite).

Per AGENTS.md "Continue iterating until reviewers nitpick instead of catching real bugs" — that's where we are. Convergence reached.

**ACCEPT**

The plan is ready to execute. Optional: a polish pass to address NITs F + G + B + D would tighten the structural seams introduced by v3's collapse, but none of these block execution.
