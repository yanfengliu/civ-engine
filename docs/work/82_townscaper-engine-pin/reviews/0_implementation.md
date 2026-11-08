# Review 0: implementation

## Target

Townscaper uncommitted tree `735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd` against base `f0123b88051dfaf6665c4ea7c901fed956837954`; engine record tree `bb434f2783b749b215961fba4ecdc48db5e0bb11` against `379eccdf6f453232c5c9b9d240a7a2cb42fa2be1`. The complete consumer patch is retained in ignored `output/engine-pin-1107/reviewed-735ca09.patch`. Reviewed document bytes are retained in this work unit's snapshots; the plan snapshot digest is recorded in the verification below. Original reviewed code must remain recoverable when delivery completes.

## Reviewers and coverage

publisher_review, independent native Astra/xhigh lane, read-only exact-source and retained-evidence review. No external CLI source export or runtime rerun. Native visual coverage is recorded in round 1; the later test-only portability correction is round 2.

## Reports

### publisher_review

**Townscaper retained-engine adoption — independent source review**

Reviewed Townscaper tree `735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd` against base `f0123b88051dfaf6665c4ea7c901fed956837954`, and central-record tree `bb434f2783b749b215961fba4ecdc48db5e0bb11` against `379eccdf6f453232c5c9b9d240a7a2cb42fa2be1`. Read-only Git comparisons confirmed that both indexes and tracked worktrees matched their frozen trees.

**No material source findings.** The reviewed changes are suitable to proceed to the remaining acceptance work.

The manifest retains civ-engine as a development dependency and pins the commit-named 2.9.1 archive for producer `e8ada69ad7344aeb78211d355999042cce9c20ea`. Manifest, lock entry, and pin agree; the lock’s SHA-512 integrity exactly matches the supplied pin. The guard requires development classification, rejects linked installations, verifies private package resolution, and checks both compiled Node and browser runtime versions. [Dependency and lifecycle binding](C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper/package.json:8), [guard checks](C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper/scripts/check-engine.mjs:20)

The CLI uses the repaired canonical-path comparison. Missing or unresolved invocation paths cannot accidentally match; Windows normalization is null-safe. Tests invoke the actual copied script through direct paths, genuine junctions, and Windows case variants. Success requires verification text and the installation path; rejection requires exit 1 and the intended diagnostic. Import cases deliberately contain an invalid installation and require inert behavior with ordinary, absent, and nonexistent arguments. The two added classification controls cover moving the dependency to production and removing its lockfile development flag. [CLI and classification contracts](C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper/scripts/engine-install.test.mjs:61)

The semantic lock comparison found no direct tool-version changes. Besides the engine replacement, changes comprise the documented optional `@emnapi/core` 1.11.2→1.11.3 repair, its nested `wasi-threads` 1.2.3 entry, removal of the redundant root runtime entry, and metadata normalization. Rolldown’s nested `@emnapi` 1.11.1 dependencies remain represented. Retained install evidence identifies the missing optional records, followed by a successful clean scripts-disabled installation.

I inspected unchanged consumer code outside the diff. Browser-facing harness code continues importing the public root package; Node recursive tooling uses the same public API. The installed package provides the corresponding Node and browser exports, and no Vite/TypeScript alias redirects resolution to a sibling engine checkout. The game’s replay schema and application source remain unchanged. [Unchanged browser consumer](C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper/src/app/playtestHarness.ts:2), [unchanged Node consumer](C:/Users/38909/Documents/worktrees/townscaper-engine-pin-1107/townscaper/scripts/recursive-pass.mjs:1)

The central diff contains only work 82’s plan and its registry allocation. Townscaper’s nine-file diff contains no policy, historical registry/witness, active-water-board, gameplay, renderer, or saved-format change. The record-location exception is documented as task-specific.

**Evidence inspected**

- Six retained gate commands exited 0: tests, typecheck, lint, build, full high-severity audit, and production high-severity audit.
- Test output reports **234 files / 2,028 tests passing**; focused guard output reports **24 passing**.
- Full audit retains nine moderate findings; production audit reports zero vulnerabilities.
- The retained browser probe dynamically imports the engine URL discovered from Vite’s served harness module and observes `ENGINE_VERSION = 2.9.1`.
- Both scripted interaction runs report 44 actions and 13 steps. The initial comparison runner failed before comparison because of CommonJS/top-level-await configuration; the corrected retained comparison reports matching final states.

The guard RED evidence is specifically a missing-module failure before implementation, not a Townscaper mutation proof for every guard branch. The current negative assertions were inspected directly.

**Bounds:** This was read-only source and retained-evidence review. I ran no tests, gates, installations, browser sessions, network operations, or external reviewer exports, and changed no files. Archive provenance was accepted from root’s supplied producer evidence; I verified local pin/lock agreement without downloading the archive again. Native capture inspection, sweep completion, visual acceptance, final cleanup, and delivery remain separate acceptance work.

## Findings and disposition

No material findings. The owner accepts the stated evidence limits: the missing-module RED proves the installation contract was absent, not mutation coverage of every branch. The initial comparator setup failure remains retained beside the corrected successful comparison. Later canonical-path expectation portability is independently addressed in round 2.

## Verification

The implementer ran six required commands successfully under Node 24.22.1/npm 11.6.2; the original 234-file/2,028-test gate logs remain in ignored `reviewed-735ca09-gates/`. Browser interaction and installed runtime evidence are described in the authored report. Reviewed document snapshots retain the plan, progress and two devlog files before their status updates; `snapshots/digests.txt` binds their exact bytes. No shared producer install or build was run.

## Round outcome

Accepted exact original source, with remaining visual and delivery acceptance kept separate. No material source repair was requested.
