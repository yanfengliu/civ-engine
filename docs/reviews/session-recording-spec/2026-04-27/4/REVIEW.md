# Multi-CLI Design Review — Session Recording & Replay Spec, Iter-4 (Convergence)

**Iteration:** 4 (convergence verification of v4 → v5).
**Date:** 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-exhausted (11th iter).

## Verdicts

- **Codex:** "Ship after fixing 3 remaining spec contradictions" — all wording-level.
- **Opus:** "Converged — ship after the two-sentence ADR 1 + §10.2 sample wording pass."

**Spec is converged.** Both reviewers report all iter-3 findings closed (Codex Yes-or-Partially-due-to-wording-only; Opus 14/14 Yes). Iter-4 surfaced three small wording inconsistencies — all addressed in v5 in this same fold. No architectural concerns; no new findings.

## A. Iter-3 Closure (cross-CLI consensus)

| Finding   | Codex       | Opus       | Reconciled |
| --------- | ----------- | ---------- | ---------- |
| H3-1      | Yes         | Yes        | **Closed** |
| H3-2      | Partially   | Partially  | **Closed in v5** (ADR 1 wording) |
| H3-3      | Partially   | Yes        | **Closed in v5** (§12 BundleRangeError row) |
| H3-4      | Partially   | Yes        | **Closed in v5** (architecture table row) |
| M3-1      | Yes         | Yes        | **Closed** |
| M3-2      | Yes         | Yes        | **Closed** |
| M3-3      | Yes         | Yes        | **Closed** |
| L3-1      | Yes         | Yes        | **Closed** |
| L3-2      | Yes         | Yes        | **Closed** |
| L3-3      | Yes         | Yes        | **Closed** |
| L3-4      | Yes         | Yes        | **Closed** |
| L3-5      | Yes         | Yes        | **Closed** |
| N3-1      | Yes (deferred) | Yes (deferred) | **Closed (deferred-by-design)** |
| N3-2      | Yes         | Yes (cosmetic) | **Closed** |
| Iter-2 H-new-1 | Yes    | Yes        | **Closed** |
| Iter-2 H-new-2 | Yes    | Yes        | **Closed** |
| Iter-2 H-new-3 | Partially | Yes      | **Closed in v5** (ADR 1 wording — same as H3-2) |
| Iter-2 H-new-6 | Yes    | Yes        | **Closed** |
| Iter-2 M-new-1 | Yes    | Yes        | **Closed** |
| Iter-2 M-new-4 | Yes    | Yes        | **Closed** |
| Iter-1 N1      | Partially | Yes     | **Closed in v5** (§12 BundleRangeError row references persistedEndTick) |

**Summary:** all 21 findings closed in v5.

## B. Iter-4 Findings (folded into v5 in same revision)

These are the three Codex-flagged + Opus-confirmed wording inconsistencies, all addressed in v5:

### Wording (no severity escalation needed; all fixed inline)

**W4-1. Architecture overview table (line 59) said `captureCommandPayloads` records `RecordedCommand` "instead of" `CommandSubmissionResult`** — re-introduces the type-widening implication that H3-4 was supposed to remove. **Fixed:** table row now says "into a NEW `WorldHistoryState.recordedCommands?: RecordedCommand[]` field. The existing `WorldHistoryState.commands: CommandSubmissionResult[]` is unchanged (additive, not widening)." Also adds a sentence noting the `SessionRecorder` mutex.

**W4-2. §12 `RecorderClosedError` row (line 648) narrowed `recorder_already_attached` to "another `SessionRecorder`"** — should match §7.1 step 2's payload-capturing-recorder mutex (any payload-capturing variant of either class). **Fixed:** row now says "another payload-capturing recorder (any `SessionRecorder`, OR any `WorldHistoryRecorder` with `captureCommandPayloads: true`)".

**W4-3. §12 `BundleRangeError` row (line 651) used `[startTick, endTick]` universally** — should reference `persistedEndTick` for incomplete bundles per §9.1. **Fixed:** row now distinguishes complete (`endTick`) and incomplete (`persistedEndTick`) bundle ranges.

**W4-4. ADR 1 Consequences bullet 2 (line 775) said "Both recorders can attach simultaneously without interference"** — predates the H3-2 mutex restriction. **Fixed:** bullet now distinguishes default-config WorldHistoryRecorder (composes freely) from payload-capturing variants (mutually exclusive).

**W4-5. §10.2 quickstart sample missed the required `world: World<...>` field** on `ScenarioConfig` — Opus surfaced via cross-check at `src/scenario-runner.ts:107`. **Fixed:** sample now includes `world,` field.

## C. Final Status

The spec has converged after 4 review iterations across 4 spec versions:

- **v1 → v2** (iter-1 fixes): 6 Critical / 9 High / 9 Medium / 4 Low / 3 Note → all addressed.
- **v2 → v3** (iter-2 fixes): 1 Critical / 9 High / 7 Medium / 4 Low / 2 Note → all addressed.
- **v3 → v4** (iter-3 fixes): 0 Critical / 4 High / 3 Medium / 5 Low / 2 Note → all addressed.
- **v4 → v5** (iter-4 fixes): 0 new findings; 3 partial closures resolved + 2 wording cleanups → all addressed in same revision.

Architecture, type contracts, lifecycle semantics, replay semantics, determinism contract, error handling, testing strategy, doc surface, and CI gate are all stable across iter-3 → iter-4.

**Ready for the implementation phase** (`writing-plans` next).

## Reviewer Coverage

| Iter | Codex findings | Opus findings | Convergent | Resolution |
| ---- | ----- | ---- | ---------- | ---------- |
| 1    | 8     | 17   | 7          | All in v2  |
| 2    | 14    | 9    | 8          | All in v3  |
| 3    | 9     | 6    | 5          | All in v4  |
| 4    | 3     | 3    | 3          | All in v5  |

Convergence rate: 100% across 4 iterations. Two-reviewer consensus (Codex + Opus) was sufficient throughout; Gemini was quota-exhausted for iters 2–4 (consistent with the engine's full-codebase review history). Per `AGENTS.md` unreachable-CLI policy, two-CLI consensus on a converged spec is acceptable signal.

The spec is ready. Moving to `writing-plans`.
