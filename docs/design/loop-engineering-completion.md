# Loop Engineering Completion (fleet roadmap, proposed 2026-07-08)

Status: ACCEPTED 2026-07-08 — owner decisions resolved (§8): unattended fixes commit to `main` after gates + adversarial review (`LOOP_SHIFT_DRY` available); fleet artifacts live in a new `loop-ops` sibling repo; the loop may spend ~15–20% of weekly quota in overnight shifts, exploration unlocking after a week of clean scripted shifts. Follows the mandatory-defaults thread (`docs/threads/done/mandatory-loop-defaults/`): integrity is done; this designs the remaining autonomy and learning.

## 0. Cost model and design stance

The operator runs on a fixed subscription quota: no marginal dollar cost, only opportunity cost against interactive work. Consequences baked into every component below:

- **Mechanical stages are free; LLM stages are the budget.** Everything that can be deterministic (oracles, verification, coverage accounting, canaries, aggregation, digests) runs LLM-free and unmetered. LLM calls are reserved for three things: playing (exploration), proposing/authoring fixes, and the one-line approach notes.
- **Run in low-value windows.** The loop takes shifts when the operator is not competing for quota (overnight/idle), with a hard per-shift budget so a runaway pass cannot eat the next day's interactive capacity.
- **Value per pass is the metric, not cost per pass.** Manifests record effort (LLM calls, wall clock, model) and the weekly rollup answers "what did the loop's quota fraction buy" in proven fixes, promoted regressions, new scenarios, and canaries.

## 1. Scheduler — the loop runs itself

A local nightly **shift**: one scheduled session (Windows-native cron via the Claude Code harness or Task Scheduler invoking `claude -p` with the recursive-playtest skill) that works a priority queue of repos.

- **Shift contract:** read `loop-ops/DIRECTIVES.md` first (the owner's standing orders: per-repo status, priorities, exclusions, budget — added 2026-07-09 as the owner→loop steering channel; a directive overrides everything below) → pick next repo → `npm run playtest:recursive` (aoe2: full loop; others: pass + the driving session fixes ONE candidate through TDD/gates/in-process adversarial review) → prove → promote → commit per repo policy → next repo, until the shift budget (wall-clock + LLM-call cap) is spent. Single-flight per repo (the harnesses are one-client; a lockfile under `output/` guards).
- **Backoff:** two consecutive `no-fix-candidate` passes halve a repo's cadence; an open candidate or a fresh `coverage-gap`/`canary-blind` finding restores full priority. Quota exhaustion mid-shift ends the shift gracefully with a `budget-exhausted` ledger row — never a half-proven claim.
- **Autonomy bounds unchanged:** aoe2's apply arm still never merges; agent fixes in the other repos land only after full gates + in-process adversarial review, exactly as an interactive session would. A `LOOP_SHIFT_DRY=1` escape turns any shift proposal-only for observation periods.

## 2. Aggregation — the fleet learns (Track D, concretized)

- **Engine additive minor:** `improvementFindingSignature(finding)` — the cross-run/cross-repo class key — plus the Track D `stateDigest` canonical state hash. Both pure utilities, zero-dep. (Shipped 2.1.0 with a deliberate deviation from this paragraph's original "(repo, bug-class id, area)" sketch: the key is `<gameId>/<data.class-or-id>`, trim-only, with NO area/severity component and NO normalization — attributes drift across reruns and would split classes, silencing the recurrence alarm; the aggregator groups by severity/area as row dimensions instead. Review 2026-07-08 judged the deviation correct.)
- **`loop-ops` sibling repo** (small, scripts + committed rollups, raw data gitignored): a nightly aggregator reads every repo's `output/**/passes.jsonl` and emits the fleet dashboard — outcome distribution per repo, oracle fire-rates, class recurrence, time-to-fix, fix-success rate per class, effort per outcome.
- **`loop-ops` is also the canonical home of the loop documents** (added 2026-07-08 for cross-agent reach): `docs/skills/recursive-playtest.md` (operating contract) and `docs/skills/building-recursive-loop.md` (build recipe) live there as the single source of truth. Every repo's AGENTS.md carries a one-line pointer ("before running or building the recursive loop, read ..."), which Codex follows natively via its AGENTS.md mechanism; the Claude user-level skills keep their discovery descriptions but their bodies become pointers to the canonical files. One source of truth, versioned and reviewable, readable by every agent in the fleet.
- **Recurrence alarm:** a signature that reappears after `fixed-proven` auto-files a high-severity finding with `nextAction: addRegression` ("the promotion did not hold") — the loop polices its own ratchet.

## 3. Curriculum — coverage grows itself

- **Coverage ledger:** each pass records which controls/commands the run exercised (the observations already enumerate the available inventory; photo's `HarnessCommand` enum is enumerable). A deterministic comparison emits `coverage-gap` findings for never-exercised surface.
- **The elegant move:** a `coverage-gap` finding is a normal loop candidate whose FIX is authoring a new scenario, and whose PROMOTION is that scenario joining the rotation. Curriculum growth needs no new machinery — it rides the existing find→fix→prove→promote cycle, and the prove step is "the gap class is absent from the rerun's coverage report".
- **Exploration distillation (LLM, budgeted):** occasional exploratory shifts run the LLM agent playerBlind aimed at uncovered surface; the recorded trace is distilled deterministically into a file-agent scenario (townscaper's `decisionsFromTrace` pattern, generalized). One LLM exploration buys a permanent free scenario.

## 4. Canaries — the senses are self-verifying

Prove-fixed made the loop's claims honest; canaries make its perception honest. Each repo keeps `canaries/<class>.patch` — tiny seeded bugs with a declared expected class (the acceptance drill's seeded bug, made permanent). A weekly LLM-free `loop:canary` pass applies each patch on a throwaway branch, runs the scripted pass, asserts the expected class appears VERIFIED, reverts. A miss files a critical `improveHarness` finding ("oracle blind: <class>") and lights up the dashboard. An oracle that silently stops firing is currently invisible forever; after this, it is caught within a week for zero quota.

## 5. Fix-strategy memory — the fix arm learns

`--known-findings` taught the loop not to rediscover problems; this teaches it not to rediscover solutions. Every `fixed-proven` pass appends to a committed `fix-memory.jsonl`: signature, commit, files touched, one-sentence approach note (the only LLM text in the file). Candidate selection surfaces prior fixes for the same or sibling signature into the handoff (and into aoe2's propose-fix prompt). The aggregator merges these fleet-wide — repo-specific fixes rarely transfer, but harness/loop-infrastructure fixes recur across all five repos and are exactly the ones worth remembering.

## 6. Quota accounting — opportunity cost is visible

Manifest `data.effort = { llmCalls, wallClockMs, model }` (additive, no engine change required); `costUsd` stays for API-metered runs. The weekly rollup reports value per unit effort per repo and per stage, so the owner can see whether the loop's quota fraction is earning its keep and which stage to starve first when it isn't.

## 7. Human-attention routing — the morning digest

Every shift ends by writing (and the aggregator nightly consolidates) a single digest: what ran, what was fixed and proven (commits linked), what is `blocked` awaiting an owner decision (durable queue in `loop-ops/decisions.md`, not scrollback), canary status, coverage delta, quota spent vs. budget. Blocked items are the ONLY thing that requires the owner's attention; everything else is FYI.

## 8. Owner decisions needed before build

1. **Unattended commits:** default proposal is agent fixes land on `main` after full gates + in-process adversarial review (identical bar to interactive sessions), with `LOOP_SHIFT_DRY` for observation periods. Alternative: unattended fixes queue on branches for morning approval — safer, but reintroduces the merge-authorization overhead the repos deliberately removed.
2. **`loop-ops` sibling repo:** yes/no on a new small repo for aggregation, digests, decision queue, and fleet fix-memory (vs. cramming into civ-engine, which pollutes an engine with fleet ops).
3. **Quota allocation:** what fraction of the weekly quota the loop may spend (proposal: cap ~15–20%, shifts overnight, exploration shifts only after a week of clean scripted shifts). **Superseded 2026-07-09: the owner removed all spend/cycle caps — shifts work every picked handoff to a real end state; the exploration lock remains. Additionally: per-repo handoffs run in isolated subagents so repo contexts never mix (playbook step 3).**

## 9. Rollout order (each slice TDD + adversarial review, per repo discipline)

1. Engine additive minor: `improvementFindingSignature` + `stateDigest` (+ documented `data.effort` convention). **DONE 2026-07-08 (civ-engine 2.1.0, 5e2cad1).**
2. Coverage→`coverage-gap` findings in farm (it already counts coverage) as the template; canary drill in aoe2 (richest oracle set) as the template. **DONE 2026-07-09: farm f797631 (coverage-gap findings, improveHarness joins FIX_ACTIONS, deterministic gap ordering + per-observation sightings from review); aoe2 6aed1a6+b3edfac (3 canaries; first live drill proved two green→red cycles AND honestly reported pinned-units canary-invalid — the oracle is saturated by 16 real open violations, which are the recursive pass's candidates).**
3. Shift runner + digest + `loop-ops`. **DONE 2026-07-09 (loop-ops 0197566): DIRECTIVES-driven shift.mjs (exclusive lock, tested row attribution incl. canary exclusion, win32 process-tree kill, backoff, digest merge-append), shift playbook with concrete budget caps; high-risk review (Codex + in-process, Claude CLI unreachable/compensated) confirmed 4 HIGH + 6 MEDIUM, all fixed pre-commit — docs/reviews/2026-07-09-shift-machinery.md. Scheduler activation (Windows task running the headless shift session) awaits the owner's explicit permission-posture choice — both mechanisms (bypass vs settings allowlist) are agent-permission widenings the automation gate rightly reserves for the owner.**
4. Fix-memory + aggregation dashboard + recurrence alarm. **DONE 2026-07-09 (same commit): dashboard.md keyed on candidateClass (threaded through farm/city/townscaper manifests — b07931f/edbaea2/b4f12ff — after review proved city/townscaper ids embed run-specific values; id fallback is farm-only), recurrence from fixed-proven rows AND fleet fix-memory (the only proven-fix signal proposal-only repos have), alarms render in every shift digest.**
5. Exploration→scenario distillation. **DONE-as-designed 2026-07-09: exploration shifts specified in the playbook and machine-parsed from DIRECTIVES (`locked` by default; at most one exploration run per shift when unlocked); townscaper's decisionsFromTrace → file-agent re-drive is the working reference implementation; farm/city file-agent re-drive is a normal improveHarness candidate for the shift that first needs it, deliberately not pre-built.**

## 10. Definition of complete

The loop engineering is complete when, without operator involvement: shifts run on schedule for two weeks producing proven fixes; a deliberately blinded oracle is caught by its canary; at least one `coverage-gap` becomes a rotation scenario via the loop itself; a regressed fixed class trips the recurrence alarm; and every morning there is one digest whose `blocked` queue is the only thing asking for a human.
