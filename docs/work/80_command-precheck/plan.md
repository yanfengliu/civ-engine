# Observe command acceptance without enqueueing

Status: complete
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
- [x] Independent exact Astra/xhigh review found no material issues; full authored report retained in round0, target preserved ata7a846c.
- [x] Integration/push and hosted artifact verification: main c78a3b3, CI 42430952599, retained archive/package/runtime and actual precheck/submission smoke verified by root.
- [x] Root removed the task worktree and branch after detaching only its own MCP junction. Compact evidence is retained in primary tmp/work80-precheck-retained.

## Implementation steps

- Absent-API RED: four files, 51 failures/1 existing compatibility pass; typecheck exit 2. Implementation passes 99 focused tests across five files including transaction coverage, and typecheck. P01–P26 expand to 52 new cases including matrices.
- All C01–C12 controls return nonzero at named tests; C09 additionally fails the independent readonly negative type assertion. Harness restores exact source in finally and verifies bytes. Ignored evidence: tmp/precheck-1107/controls.json, C01.log through C12.log, C09-types.log, red/green-vitest.log and red/green-typecheck.log. Initial C09 detected inert CRLF matching before mutation; correcting the harness completed all controls.
- P25 preparation assumed observable tick advances inside a system. getObservableTick and a separate actual submitWithResult world show current [0,1] inside systems and [1,2] after published diffs. Root approved preserving the helper and correcting the fixture on 2026-11-07. No tick semantics change. Automatic review initially rejected the correction as weakening the plan; explicit approval plus submission contrast resolved it.

## Outcome

Implementation, focused controls, all eleven local gates and independent exact review pass. Each mutation ran its selected discriminator; no claim covers every additional discriminator in the preparation table. Root delivered main c78a3b3162a3674b8e42204fed66cbabcdabf5ac; CI 42430952599 passed Node 20/22/24 and publish-dist. Retained asset 722423931 (civ-engine-c78a3b3162a3674b8e42204fed66cbabcdabf5ac.tgz) and rolling asset 722423995 are 667840 bytes with SHA256 9d9fce7970e9ddebbef0edd13b9ea68accf685229f3fe349c2e417dcb8e5a483. Root verified downloaded package/runtime 2.9.0, the accepted seven-field precheck and first subsequent submission sequence 0. Two initial smoke harness calls omitted required World configuration; using the accepted fixture configuration corrected the harness without a product change. The archive is retained in AoE2 task tmp/engine-pin/release-2.9.0. Root completed task worktree/branch cleanup after detaching only its own MCP junction, retaining compact evidence in primary tmp/work80-precheck-retained. These delivery and cleanup facts were supplied by root on November 7. E03 game paused-save adoption stays OPEN.
