# benchmark-gate — implementation review iteration 1

**Diff:** working tree vs HEAD `761d987` (note: the tree also carried early registration-manifest work — a separate objective committed separately; reviewers were briefed on benchmark-gate's scope). **Reviewers:** Codex `gpt-5.5` xhigh, Gemini `gemini-3.1-pro-preview`, Claude `claude-fable-5[1m]` max.

## Findings → dispositions

| # | Sev | Reviewer(s) | Finding | Disposition |
|---|-----|-------------|---------|-------------|
| 1 | HIGH | all three (convergent) | `renderMarkdown` still threw a TypeError — on the new churn scenario, whose sparse shape lacks the standard summary/pathfinding/occupancy/memory fields the renderer dereferenced unconditionally. The smoke test was vacuous for this path (full-shaped fixture only), so the changelog's "fixed" claim was false as shipped — the exact failure class the fix targeted. | **Fixed**: renderer guards every standard-only section; churn-shaped scenario added to the smoke test; `node scripts/rts-benchmark.mjs --format markdown` run end-to-end (all three scenarios render, churn line present, no `undefined`). |
| 2 | LOW | Codex + Claude (convergent) | Malformed `BENCH_RATIO_MAX` (`NaN`/`Infinity`) silently disabled the tier-2 time gate (`x > y * NaN` is always false). | **Fixed**: validated finite-positive or loud exit 1. |
| 3 | LOW | Claude | PLAN step 8's recorded disposition ("one line in README Quick Start") was not delivered. | **Fixed**: `benchmark:check` line added to the Quick Start block. |
| 4 | NOTE | Claude | Thread-path forward references + mixed-objective working tree. | Thread moves at commit; benchmark-gate files staged selectively so the commit is single-objective. |

## Verified clean (highlights)

Claude independently **reproduced the committed baseline's churn arithmetic from engine code** — (150×3 spawn + 150×1 destroy signature changes) × 8 caches × 20 ticks = 96 000 membershipChecks; 338 000 queryResults; 160 queryCalls — all matching `benchmarks/baseline.json` exactly. Also verified: metric increment is arithmetically per-entry with release-profile behavior unchanged; counter comparison fails on either-side-missing keys; scenario-set equality both directions; the 3-run determinism assert excludes memory/wall-clock; CLI flag interactions; CI step ordering; `.d.mts` parity; the test suite is non-vacuous on the comparison library; doc claims (counts, sabotage message format) all check out.

## Disposition

One real HIGH (incomplete fix of the very bug the objective claimed to fix — caught because reviewers ran the path, not just read the diff) + two LOWs, all fixed inline with the smoke test hardened. Iteration 2 verifies the three fixes.
