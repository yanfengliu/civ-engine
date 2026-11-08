# AoE2 engine adoption scope

Prepared 2026-11-07 by Codex for the active engine priority backlog. This is a task proposal, not a change to AoE2's ownership or worktree rules.

## Required owner decision

AoE2 docs/policies/rules/work-records.md retains the October11 direction that Codex is not working on AoE2 and the Claude coordinator owns all its work until the owner says otherwise. Its worktrees.md requires controlWorktree.mjs and forbids npm install/ci in worktrees because their entire node_modules directory links to primary. Engine work can continue independently; implementing the AoE2 part requires a scoped owner override for this backlog and an isolated-dependency exception.

## Concrete first change

Pin the verified retained engine archive in package.json/package-lock.json, remove the three rolling engine downloads from .github/workflows/ci.yml (gates/browser) and playtest.yml (corpus), and update README setup. Preserve voxel setup, matrices, shards, timeouts, headroom and historical-document fetches.

Adapt existing civEngineInternalHelpers.test.ts and ciDownloadRetry.test.ts to check the exact archive URL, lock integrity, installed package/runtime version and physical package resolution. Keep internal-helper tripwires, public positive controls, browser-entry checks and all voxel retry contracts. Do not rewrite historical workflow fixtures mechanically. Preserve selfplay-ab's actual engine byte fingerprint; retain installation/artifact evidence separately because the verify receipt deliberately excludes dependency bytes.

## Isolation and acceptance

Create/remove only through controlWorktree.mjs. With the requested exception, detach only the task-created node_modules junction non-recursively and install private dependencies. Establish a private, verified voxel input where necessary; do not run installation or producer builds through a shared dependency junction or alter shared primary dist. Preserve all existing peer worktrees, especially render-projection-cost-1106; no liveness claim is inferred from their age.

Run ci:status, scoped package/workflow contracts and audits, then take the primary gate lock for final integration/verify/push. Use a unique preview port, headless browsers, owned process cleanup and the actual verify-receipt check. Independently review the exact candidate, merge/push only after gates pass, follow CI and corpus to terminal results, then retire the task through the controller.

## Subsequent engine-related adoption

After the package boundary is verified, separately integrate selected render invalidation and remeasure the map-size workload against equal game states. Preserve or reconcile peer implementation through normal source review rather than replacing it wholesale.

Paused human commands and replay/playtest advance need separate game parity checks. Human facades currently submit directly to the engine, while saved pendingCommands are a different game-owned queue; a package pin does not close paused-save persistence. Replay has its own pending-command drain, so an enclosing advance callback is not an incidental upgrade. No new product decision, save-format change, voxel feature or unrelated AoE2 work is authorized by this proposal.
