# Plan iter-3 — synthesized review

**Subject:** `docs/design/2026-04-27-behavioral-metrics-implementation-plan.md` v3 (commit `ad059a0`).

**Bar:** no remaining BLOCKER/HIGH/MED. NITs allowed.

**Reviewers:**
- **Codex:** 3 MED (raw at `raw/codex.md`). One of the three (shell) is dismissed as a repeat of the iter-2 misread the user explicitly classified as "shell-misread" in the iter-3 prompt; the other two are real.
- **Opus:** ACCEPT + 8 NIT (raw at `raw/opus.md`). Initial verdict; revised to REVISE after adjudicating Codex's findings — Opus's NIT G is the same issue Codex calls MED 2, with Codex's severity being correct, and Opus missed Codex's MED 3 (devlog rollover) entirely.

## Iter-2 closure (verified)

| Iter-2 finding | Severity | v3 disposition |
|---|---|---|
| Codex: T1/T2 doc split violates AGENTS.md doc-with-code rule | HIGH | ✅ Collapsed to single commit. Structural docs (ARCHITECTURE, drift-log, roadmap, ai-integration cross-ref, synthetic-playtest cross-ref) all land with the code in Step 18 of the same commit. |
| Codex: v0.8.3 follow-up bump violates one-feature-one-version rule | MED | ✅ Single v0.8.2 bump. Versioning header explicitly cites the AGENTS.md rule. Determinism-test `engineVersion` literal updated 0.8.3 → 0.8.2. |
| Codex: Shell snippets are bash, environment is "PowerShell" | MED | ✅ Was a Codex misread. Plan adds an explicit "**Shell:** bash on Windows (mingw)" line. The harness's primary shell is bash; PowerShell is secondary via tool. The repo's npm/git stack runs in mingw bash. |
| Opus iter-2 NITs 1–5 | NIT | Persist in v3. Allowed per bar. |

All BLOCKER/HIGH/MED issues from iter-2 are closed substantively.

## Iter-3 findings — adjudicated

### Codex MED 1 (shell): DISMISSED — repeat misread

Codex flags `/tmp`, `$(...)`, `[ -s … ]`, `mkdir -p`, `ls -1t` in §A/§B/§D as PowerShell-incompatible. This is the same misread the user classified as "shell-misread" in the iter-3 prompt. Reality:
- The harness platform line says "Shell: bash (use Unix shell syntax, not Windows — e.g., /dev/null not NUL, forward slashes in paths). PowerShell is also available via the PowerShell tool" — bash is primary.
- The plan now explicitly says "**Shell:** bash on Windows (mingw)".
- AGENTS.md examples in this repo are all bash.
- The bash commands in the plan (`mkdir -p`, `cat <<'EOF'`, `until [ -s … ]; do sleep 8; done`, `&` for background) all run as written under mingw bash.

Codex's PowerShell sandbox emitted constrained-language-mode errors during its own setup (see `codex.stderr.log`), which may explain why Codex perceives the workspace as PowerShell. The plan's bash invocations are correct.

### Codex MED 2 (path inconsistency): UPHELD — overrides Opus NIT G

Three places in the plan reference different review artifact paths:
1. §B template (line 53): `docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw` — AGENTS.md `<scope>/<date>/<iter>/` convention with `scope=behavioral-metrics-T<N>`, `iter=1`.
2. §B comment (line 61): "Use HEAD~1..HEAD as the base (this task's diff is one commit on main)" — describes a *committed* diff, but the command on line 62 reads *staged* changes (`--staged`).
3. Final-pass (line 1263): `docs/reviews/behavioral-metrics/2026-04-27/T1/...` — treats `behavioral-metrics` as scope and `T1` as if it were the iter-num.

If the executor follows §B, reviews land in `behavioral-metrics-T1/2026-04-27/1/raw/`. The final-pass checklist then looks at `behavioral-metrics/2026-04-27/T1/...` and fails (no such directory). The executor would either move the reviews, edit the plan, or skip the verification step — all bad outcomes. With v3's single-task collapse, the path should be unambiguous and self-consistent.

Opus called this NIT G. Codex's MED is correct: an internal contradiction in the plan that breaks the final-pass checklist is more than cosmetic.

**Fix:** pick one AGENTS-compliant layout (most natural with single-task collapse: `docs/reviews/behavioral-metrics-T1/<date>/1/`, or drop the `T1` since there's only one task: `docs/reviews/behavioral-metrics-impl/<date>/1/`) and use it everywhere. Also fix the §B comment to describe staged-diff review or switch the command to a committed diff.

### Codex MED 3 (devlog rollover): UPHELD — Opus missed this

Active devlog `docs/devlog/detailed/2026-04-26_2026-04-27.md` is **841 lines**. AGENTS.md mandates rollover at **500 lines or a significant time boundary**. Adding a Spec 8 entry without rollover continues the violation.

The plan currently says (Step 12) "Latest detailed devlog: append Spec 8 entry per AGENTS.md template." This silently violates the rollover rule. The plan needs an explicit pre-Step-12 rollover step:

```
- [ ] Active devlog (`docs/devlog/detailed/2026-04-26_2026-04-27.md`) is at 841 lines, exceeding AGENTS.md's 500-line rollover threshold. Before appending the Spec 8 entry: `git mv` it to update END_DATE to the date of its last entry (2026-04-27 → keep as-is if accurate); start a new file `2026-04-27_2026-04-27.md` (today's date for both halves). Spec 8 entry goes in the new file.
```

Or equivalent: rollover happens as a discrete step before the Spec 8 task, with its own commit.

**Fix:** add an explicit rollover instruction either as a pre-Step-12 sub-step in the plan, or as a separate one-liner commit immediately preceding the Spec 8 commit (per AGENTS.md "Commit as soon as you have a coherent, self-contained unit of change").

### Opus NITs F + H (new in v3): UNCHANGED (NIT-level)

- **F:** Steps 19 + 20 collapse into a single parenthetical heading; no `- [ ]` items. AGENTS.md compels the work regardless; cosmetic for human readers but bites subagent-driven-development workflows that auto-generate todos from checkboxes.
- **H:** §B template uses `<N>` placeholder; with single-task collapse it should resolve to `1` or be dropped.

These are real but not severity-elevating. After fixing the path inconsistency (MED 2), H is automatically resolved.

### Opus NITs A–E (carried from iter-2): UNCHANGED (NIT-level)

- A: 7b/7c/7d still in prose, not concrete code (6/9 with full code).
- B: Step 14 order-insensitivity comment contradicts `allBuiltins()` call below it.
- C: Step 16 volatile-metadata uses single-bundle corpora.
- D: §B uses `git diff HEAD~0 --staged` (`HEAD~0` redundant; staged-diff vs committed-diff comment mismatch — partially overlaps with Codex MED 2's §B-comment finding, but the redundancy aspect remains NIT).
- E: Step 8 runner-test missing explicit `as Metric<unknown, unknown>` casts.

### Codex secondary drift (design-doc status): NIT (in design doc, not plan)

Plan correctly says "design v4, converged after 4 multi-CLI design review iterations" (commit 232fc42 confirms iter-4 closing CONVERGED). Design doc header at `docs/design/2026-04-27-behavioral-metrics-design.md:3` still says "Status: Draft v4 (2026-04-27). Awaiting iter-4 multi-CLI review." This is design-doc drift, not plan drift. Worth fixing in a one-line edit but does not affect plan iter-3 verdict.

## Verdict

**REVISE.**

Two real MEDs remain, missing the bar:
- **MED:** Path inconsistency between §B template, §B comment, and Final-pass checklist (Codex MED 2; Opus called it NIT G — Codex's severity is correct). Pick one AGENTS-compliant layout and use it everywhere.
- **MED:** Devlog rollover step missing despite active file at 841 lines (Codex MED 3; Opus missed). Add an explicit rollover step before the Spec 8 entry, or land rollover as a separate one-liner commit immediately preceding Spec 8.

Codex MED 1 (shell) is dismissed as a repeat misread.

NITs A–H (5 carried + 3 new from v3) are all allowed per bar and can stay.

A v4 plan revision should:
1. Resolve the path inconsistency to a single AGENTS-compliant layout used in §B + Final-pass.
2. Add an explicit devlog rollover step (or land rollover as a separate commit before the Spec 8 task).

After that, the plan should be ready. Optional polish on NITs F (explicit Step 19 / Step 20 blocks) and B + D would tighten the structural seams.

## Codex CLI note

Codex's stdout was 0 bytes for ~5 minutes after launch (initial check found empty `codex.md`); the actual review output finally landed during the synthesis pass. The 146 KB `codex.stderr.log` shows the constrained-language-mode PowerShell warning during sandbox setup, but stderr eventually settled and stdout produced 9 lines of findings. No reviewer was actually unreachable; my initial assumption of unreachability was premature.
