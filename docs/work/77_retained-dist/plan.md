# Reproducible prebuilt engine consumption

Status: complete
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
- Done: main 6a8ae8f pushed; CI42425758281 passed Node20/22/24 and publication. Retained and rolling assets have identical inspected bytes and manifest/runtime2.8.1.
- Done: Farm's clean private npm ci consumes the exact retained URL with SHA512 integrity, physical package directory and matching manifest/Node/browser runtime. Consumer gates and migration delivery continue in Farm work1_engine-pin.

## Outcome

Producer delivered at main 6a8ae8fa4e65c8d49c933956592e1a088c32a78b. Retained asset722286624 is civ-engine-6a8ae8fa4e65c8d49c933956592e1a088c32a78b.tgz, 663627 bytes, SHA256b6f766fff065941c221497d4623cd8b2d8d2e7d1c4849076a62e63df213d2878; rolling asset722286666 matches. Actual downloaded manifest/runtime both2.8.1. npm integrity is sha512-Ga0WkDVK6oVDv53VQZJNJDOVjDB4OCt92YTSx1MCKdeytlUtGalyzOQmY/34RWTASTLp+wd4bbT0HUkTINtREw==. Root independently verified Farm's installed physical package, exact URL, lock integrity and runtime; full Farm delivery remains separate and its inherited dev audit findings are being repaired. No shared runtime was changed. AoE2's peer render-projection-cost-1106 worktree remains untouched. Archive retention does not make rolling replacement atomic or prevent administrators deleting archives.
