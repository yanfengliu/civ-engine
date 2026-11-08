# Preserve component entity order in folded snapshots

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

AoE2 work157's third full168 recording proof passed all1,002 live-state/economy/history comparisons and complete raw replay, then failed an unchanged interior Resource-component array comparison at tick24501. Both retained arrays contain the same3,113 unique entity rows and values, but folded entity31076 appears last instead of at numeric position2666. World serialization enumerates component IDs numerically; the fold preserves Map insertion order when a lower entity ID acquires a component later. Preserve the serialization order in the public pure-data snapshot path without changing the recorded bundle or its oracle.

## Scope

Bounded engine defect repair on main34de6af in the isolated folded-component-order-1108 worktree. No new public API, persisted field, runtime dependency, simulation rule or game normalization. Resource-pool insertion semantics and the documented partial-hydration limits are distinct and remain explicit. Setter-observation work89 and its running game benchmark are separate.

## Approach

First prepare public recorder/snapshotAtTick regression cases with literal ascending component rows and direct live component-array equality. Exercise later lower-ID insertion, removal/re-addition and recycled IDs, while preserving input snapshots/bundles and other component stores. Run the unmodified implementation to establish genuine failures before applying the smallest fold repair. Keep the original long-game failure and verify the same retained artifact with the accepted compiled repair after focused and full engine checks.

## Acceptance criteria

- New contract cases fail for the reproduced ordering defect before the repair and pass afterward; existing fold/viewer/diff tests remain green.
- Original retained game arrays and bundle bytes remain unchanged. The fresh verifier checks exact component arrays and complete economy, with no sorting or field exclusions in expected values.
- Exact independent review, all eleven gates, truthful patch version and migration-focused documentation precede main/push/CI and retained-runtime adoption.
- The original work157 timing, publication counts, raw replay coverage and partial-hydration limits remain distinct; this repair does not claim new simulation or performance results.

## Implementation steps

- Retain bounded diagnosis and prepare tests before production edits.
- Run RED, repair, run affected checks and independently review the exact patch.
- Gate and publish the patch release under the existing engine publishing approval; verify the retained game evidence and adopt only the published archive.
- Update work157 and engine/game feedback, preserve evidence and clean owned resources.

## Outcome

Patch 2.13.1 is prepared after six genuine regression failures and 81 focused passes, typecheck, lint and build. Independent exact review, full gates, original-artifact verification, main/push/hosted delivery and cleanup remain. The conditional setter-observation candidate was separately rejected; it is not part of this release.

## Focused result and patch preparation

The independent [retained-array diagnosis](snapshots/diagnosis.md), SHA2562d23e36d6623f9eaf5a2e06526eaa9f9a9a24e7d9fd8cbebda4014b366e535cd, identifies a producer representation defect without dropping the original assertion. The first RED launcher stopped before tests on a proven LF/CRLF preflight mismatch; original source and failed receipt remain. Corrected native RED found6/6 intended `[10,11,2]` versus `[2,10,11]` failures. After the numeric sort,81/81 focused tests across6 files, typecheck, full lint and build passed with zero owned leftovers. Patch version2.13.1 and its docs are now prepared. The earlier build still carried2.13.0 metadata; full gates will build the reviewed final version. Exact review, original-artifact follow-up, full gates/main/push/CI and cleanup remain.


## 2026-11-08 review and gate checkpoint

Independent exact review accepted tree dac39f20d84382c5b4ca3736b7d5ea5453f77634 with no material finding. First final2.13.1 gates passed10/11 steps,2118 root tests and22 MCP tests; only the work89 review format failed its missing Target heading. Root preserved each authored report byte-for-byte inside a current-format owner wrapper and retained the preimages. No source/test assertion or gate was weakened. The next full gate is attempt2; attempt1 remains intact.


## Final local acceptance

All eleven final2.13.1 release gates passed on2026-11-08T23:02:37Z:2,119 root tests plus one existing TODO,22 MCP tests, typecheck/lint/build/pack/benchmark and required audits. Seven moderate development advisories remain below the high-severity gate; production and MCP audits report zero. Gate2 preserved the failed gate1 and unchanged code/tests. The owned watcher reports zero remaining processes and released its exact lock. Independent round0 accepted the exact implementation; only owner-authored structural wrappers and acceptance records followed that reviewed source. Main/push, hosted CI, actual retained archive and unchanged game-artifact acceptance remain pending.
