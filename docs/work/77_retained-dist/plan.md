# Reproducible prebuilt engine consumption

Status: active
Owner: Codex
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

Complete the P0 engine-consumption prerequisite: the sole rolling asset is replaced on each push, so even a checksum cannot recreate an old consumer. Retain a commit-named prebuilt tarball beside the rolling one, then migrate consumer manifests/locks to exact URLs in their own milestones.

## Scope

Producer publication workflow, offline command-contract tests, install documentation and patch release 2.8.1. Updated to main 614c75a in codex/retained-dist-1107. Existing consumer worktrees and shared runtimes remain untouched. The owner approved additional retained assets on 2026-11-07 under AGENTS.md R14. No new registry, token, dependency or game save format.

## Approach

The existing engine-dist release keeps civ-engine.tgz for compatibility and adds civ-engine-<full source commit SHA>.tgz. Never overwrite the commit-named asset: an identical rerun reuses it, different bytes fail closed. Archive publication must succeed before refreshing the rolling asset. Consumers can use the exact public release URL with npm lockfile integrity. Retention is a repository-operated availability promise; GitHub administrators can still remove assets. A rolling URL plus hash alone is not called reproducible.

## Acceptance criteria

- Offline tests cover first publication, identical rerun, mismatch refusal, archive/upload errors, rolling-upload failure, argument validation and temporary cleanup. The production workflow invokes the tested script after matrix/build success.
- Independent supply-chain review, full gates and explicit owner approval precede main/push/publication.
- Inspect the published archive's actual manifest/runtime version and digest; retain its exact URL for consumer adoption. Existing rolling consumers continue to work.
- The priority list distinguishes civ-sim-web's source aliases from installed package stamps. Subsequent consumer migrations remove those aliases and shared engine junction dependence, with each repo's own gates.

## Implementation steps

- Approved: the owner explicitly answered "Approve retained release assets" on 2026-11-07. This authorizes implementing and publishing the retained archives after review and gates. Automatic approval review had rejected the initial patch before that approval; no portion was applied.
- Done: tests first failed on the missing publisher. The implemented publisher and installation claim checks pass 52 focused cases, including cleanup on runner throws and archive mismatch refusal.
- Done: independent supply-chain review found no material issues; all eleven gates passed (1847 root plus one TODO, 22 MCP), final focused checks 58 passes. Full authored review retained in round 0.
- Active: integrate and publish approved 2.8.1.
- Pending: main/push/CI and actual archive verification; then consumer adoption starting with the smallest consumer, farm.

## Outcome

Pending delivery. The owner asked to continue through the actionable priority backlog, tracked by the active Codex goal. Publication changes are implemented only in the isolated branch and have not run remotely. AoE2's existing render-projection-cost-1106 tree contains another owner's unmerged implementation and is preserved; npm run ci:status reports green remote gates but unrelated idle worktree housekeeping.
