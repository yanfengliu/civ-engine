# Reproducible prebuilt engine consumption

Status: active
Owner: Codex
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

Complete the P0 engine-consumption prerequisite: the sole rolling asset is replaced on each push, so even a checksum cannot recreate an old consumer. Retain a commit-named prebuilt tarball beside the rolling one, then migrate consumer manifests/locks to exact URLs in their own milestones.

## Scope

Producer publication workflow, offline command-contract tests, install documentation and a patch release. Based on main 44663f0 in codex/retained-dist-1107. Existing consumer worktrees and shared runtimes remain untouched. Publication of additional retained assets requires the owner's approval under AGENTS.md R14 after the change is concrete and reviewed. No new registry, token, dependency or game save format.

## Approach

The existing engine-dist release keeps civ-engine.tgz for compatibility and adds civ-engine-<full source commit SHA>.tgz. Never overwrite the commit-named asset: an identical rerun reuses it, different bytes fail closed. Archive publication must succeed before refreshing the rolling asset. Consumers can use the exact public release URL with npm lockfile integrity. Retention is a repository-operated availability promise; GitHub administrators can still remove assets. A rolling URL plus hash alone is not called reproducible.

## Acceptance criteria

- Offline tests cover first publication, identical rerun, mismatch refusal, archive/upload errors, rolling-upload failure, argument validation and temporary cleanup. The production workflow invokes the tested script after matrix/build success.
- Independent supply-chain review, full gates and explicit owner approval precede main/push/publication.
- Inspect the published archive's actual manifest/runtime version and digest; retain its exact URL for consumer adoption. Existing rolling consumers continue to work.
- The priority list distinguishes civ-sim-web's source aliases from installed package stamps. Subsequent consumer migrations remove those aliases and shared engine junction dependence, with each repo's own gates.

## Implementation steps

- Approved: the owner explicitly answered "Approve retained release assets" on 2026-11-07. This authorizes implementing and publishing the retained archives after review and gates. Automatic approval review had rejected the initial patch before that approval; no portion was applied.
- Done: test-only contract draft in the isolated retained-dist-1107 worktree; it fails on the absent implementation as expected.
- Pending: implement, review and gate the minimal publisher after work 78 lands.
- Pending: main/push/CI and actual archive verification; then consumer adoption starting with the smallest consumer, farm.

## Outcome

Pending. The owner asked to continue through the actionable priority backlog, tracked by the active Codex goal. No publication change has been applied yet. AoE2's existing render-projection-cost-1106 tree contains another owner's unmerged implementation and is preserved; npm run ci:status reports green remote gates but unrelated idle worktree housekeeping.
