# Observe command acceptance without enqueueing

Status: active
Owner: Codex command-precheck worker; root owns review and integration
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

E03 needs current validation observation so games can stage detached intentions without queueing or recording commands. Implement accepted work 71 M3 Option A from [the preparation](../71_engine-feedback/snapshots/precheck-preparation-1002.md), based on main 228380beb3673189ea9a6cc848362076777e6440, in isolated branch codex/command-precheck-1107 with private dependencies/dist.

## Scope

Engine-only additive minor 2.9.0. No AoE2 edits, persistent-format changes, rollback or reserved acceptance. Root owns exact review/integration; worker makes no commits or push.

## Approach

Invoke the existing validator pipeline once; clone rejection details; run/discard the existing accepted JSON clone. Preserve thrown identity and caller phase, including validator/accessor side effects. Preserve submitWithResult, validateCommand and normalizeCommandValidationResult bodies byte-for-byte. Transaction predicates forbid precheck because validators receive the actual World.

## Acceptance criteria

- [x] `World.precheckCommand<K>(type,data): CommandPrecheckResult<K>` returns exactly accepted, commandType, code, message, details, tick and validatorIndex; both barrels export the type. No sequence/schemaVersion/identity.
- [x] Engine observation alone causes no queue, warning, sequence, result-emitter, recording, history or tick effects. P01–P26 cover strict phase, hostile JSON/accessors, exceptions, callback side effects, current validation and legacy submit semantics.
- [x] Twelve individually failing/restored controls; explicit negative consumer types and surface fixture.
- [x] All eleven local gates: 1,907 root passes plus one existing TODO across 113 files; 22 MCP passes. Production/MCP audits clean; seven moderate root dev advisories remain. Build, pack and native benchmark checks pass. Private MCP engine junction resolves inside this worktree.
- [ ] Independent exact review, integration/push, hosted artifact verification and cleanup.

## Implementation steps

- Absent-API RED: four files, 51 failures/1 existing compatibility pass; typecheck exit 2. Implementation passes 99 focused tests across five files including transaction coverage, and typecheck. P01–P26 expand to 52 new cases including matrices.
- All C01–C12 controls return nonzero at named tests; C09 additionally fails the independent readonly negative type assertion. Harness restores exact source in finally and verifies bytes. Ignored evidence: tmp/precheck-1107/controls.json, C01.log through C12.log, C09-types.log, red/green-vitest.log and red/green-typecheck.log. Initial C09 detected inert CRLF matching before mutation; correcting the harness completed all controls.
- P25 preparation assumed observable tick advances inside a system. getObservableTick and a separate actual submitWithResult world show current [0,1] inside systems and [1,2] after published diffs. Root approved preserving the helper and correcting the fixture on 2026-11-07. No tick semantics change. Automatic review initially rejected the correction as weakening the plan; explicit approval plus submission contrast resolved it.

## Outcome

Implementation, focused controls and all eleven local gates pass. `legacy-body-proof.json` confirms unchanged Git-blob bodies for submitWithResult, validateCommand and normalizeCommandValidationResult against base 228380b. `full-gates.log` retains the successful gate run. Independent review, integration, hosted delivery and cleanup remain pending. E03 game paused-save adoption stays OPEN. Retained worktree/private dependencies, build outputs and evidence are owned resources for root handoff; no server or browser was launched.
