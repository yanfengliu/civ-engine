# Pin Townscaper playtest tooling to a retained engine archive

Status: active
Owner: Codex adoption worker; root integration and acceptance
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

Townscaper's in-page and Node playtest tooling currently links a mutable sibling engine checkout. Pin the verified prebuilt civ-engine 2.9.1 archive retained under producer e8ada69ad7344aeb78211d355999042cce9c20ea, with exact lock integrity and a physical-package/runtime check that also runs when the CLI is invoked through a checkout alias.

## Scope

Townscaper manifest/lock, installation guard and contracts, installation documentation, and factual devlog/progress updates only. No gameplay, renderer, persistent format, new direct dependency, shared installation/build, or policy change. The user explicitly approved: "Approve this task-only record exception" — this task's plan and independent reviews live in civ-engine docs/work instead of Townscaper's historically inconsistent work registry. This is one task's record location, not a fleet or repository rule change. Townscaper's work2 active-water board, unregistered work765 documents, registry/witness, and three primary water-parity modifications remain untouched.

## Approach

Use the verified retained URL directly as Townscaper's existing engine devDependency; npm owns archive-byte integrity verification. Adapt the repaired Farm guard to devDependencies, preserving both Node and browser runtime checks and canonical CLI entry recognition. Keep Voxel model-studio UI and tone-band source packages at their existing pins through a task-owned sibling junction; all private lock/install operations use --ignore-scripts and never invoke shared producer builds.

Isolation: engine record branch codex/townscaper-engine-pin-1107 at379eccdf6f453232c5c9b9d240a7a2cb42fa2be1 in C:/Users/38909/Documents/github/civ-engine-worktrees/townscaper-engine-pin-1107; consumer branch codex/engine-pin-1107 atf0123b88051dfaf6665c4ea7c901fed956837954 in C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper. The sibling voxel junction points to C:/Users/38909/Documents/github/voxel for reads only. Engine primary's foreign cursor-state deletion and every foreign worktree are preserved. Root owns the single heavy CPU/GPU slot, independent review and delivery acceptance.

## Acceptance criteria

- [x] New guard contracts fail first, then pass, including actual direct/junction/Windows-case CLI, visible failure, nonempty success, and inert imports.
- [x] A clean scripts-disabled private install resolves the exact retained archive/integrity, physical package and Node/browser runtime2.9.1; unrelated source-package pins/bytes remain unchanged.
- [x] Full test, typecheck, lint, build, and both high-severity audits pass under the granted heavy slot, without weakening tests or thresholds.
- [ ] Task-owned headless GPU browser/server verifies real interactions and the full168-view sweep; each native A frame is inspected with its SHA256, with actual coverage and findings recorded.
- [ ] Exact engine-record and consumer candidates receive independent review, root delivery acceptance, main integration/push, applicable hosted checks, and task-owned cleanup.

## Implementation steps

- [x] Receive explicit owner record exception; allocate this record with the fleet tool and create isolated engine/consumer worktrees.
- [x] Add failing installation/CLI contracts, pin verified archive, install privately with scripts disabled, and prove green focused checks.
- [ ] Run full gates and mandatory interaction/visual verification only after root grants the heavy slot; retain compact raw evidence ignored.
- [ ] Freeze exact candidates for independent review and fix material findings within scope.
- [ ] After root accepts delivery, merge/push, follow applicable CI, preserve evidence, and detach own junctions before cleanup.

## Outcome

Full gates passed and the full visual sweep is running in Townscaper's granted heavy slot. Root supplied verified artifact readiness: version2.9.1, URL https://github.com/yanfengliu/civ-engine/releases/download/engine-dist/civ-engine-e8ada69ad7344aeb78211d355999042cce9c20ea.tgz, 669756bytes, SHA25638137dacf4cc43de9e640674c03e58bcbacb8bf46eea1c2856141bb470aa29db, SRI sha512-pSSU/UzfIdHuAa9PiThOXtjwP2vUou2Fay+C3/GiFg8gZimUQn2Ew839wKlyDppBsxGzBrtfZsSOYdJOc65hoQ==. Townscaper's broader historical work-record repair and unfinished water work are explicitly outside this task.

Focused evidence: baseline full audit passes with9 moderate development findings and no high/critical findings. Lock-only regeneration selected the exact engine URL/SRI but npm ci exposed missing optional package records; ordinary private npm install --ignore-scripts repaired @emnapi/core1.11.2 to1.11.3 and nested @emnapi/wasi-threads1.2.3, then clean npm ci succeeded with165 packages. No direct development tool version changed. The early absent-Vitest invocation was setup failure, not RED. The actual installed runner then failed on the missing guard; after implementation all24 contracts pass (the reviewed22 plus two devDependency classification checks), targeted lint passes, and actual physical package/Node/browser runtime2.9.1 verifies. Node24.22.1/npm11.6.2 is used throughout. No shared install/build occurred; raw logs stay ignored in the consumer output/engine-pin-1107/.

Frozen Townscaper source tree735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd passed npm test (234 files, 2028 tests), typecheck, lint, build, full high-severity audit and production high-severity audit. All six commands exited0; the gate process receipt observed142 owned processes and zero leftovers. Shared Voxel package hashes remained unchanged.

Browser verification uses a task-owned hidden Vite server on127.0.0.1:18147 and headless full Chromium on the actual NVIDIA RTX4090/D3D11 renderer. The initial default headless-shell SwiftShader probe was rejected before interaction work and cleaned; a task-only launch preload selects the available GPU without changing repository defaults. The served playtest harness imports the physical installed engine2.9.1 through Vite's browser module. Startup checks passed for empty/edit/undo, saved64-town/edit/undo, and ModelStudio return. Two full-surface file-agent runs each completed44 actions, all11 interaction categories and13 steps; existing world-comparison helpers confirm identical final states. A scratch .ts comparison runner initially failed under CommonJS; its .mts correction compared the existing captures successfully, without rerunning the app. The interaction process receipt has37 owned processes and zero leftovers. Full168-view sweep and native SHA-bound image inspection remain in progress.

Prerequisite priorities, confirmed by root: work81 component publication2.9.1 is fully delivered at379eccdf with CI42435128951 successful and its private worktree/branch cleaned. Farm589d385 and City670ad083 CLI follow-ups are complete and cleaned. civ-sim-web6914e46b712c8c9b1e39223821a2185739c5cd43 is delivered with CI42435829988 successful; idle-life5cecbc42581ff250f84ac62970484f4e0f76221e is delivered with zero configured workflows; both private worktrees/branches are cleaned. Root's AoE2 clean verification completed at0aa25692 (5503 unit passes plus3 existing skips;345 browser passes plus2 existing skips;448 owned processes and zero leftovers), with integration/remote checks owned by root. These sibling statuses are handoff facts, not fresh verification claims by this worker.
