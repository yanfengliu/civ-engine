# Review 0: implementation

## Target

civ-engine commit 50fa994947c650849c3a34aacf5600796dac0990, tree d6aa98535dd2a36378575aa0d171980b1d2a2ca0 against main 44663f0893b7cc87af7b3fae7914cc38c3cee9be. Source, tests, related API/guide documentation and version metadata.

## Reviewers and coverage

Independent in-session gpt-6-astra/xhigh reviewed actual source and the exact staged candidate. External Codex CLI invocation was rejected before execution by automatic approval review because it exported the staged diff to a separate model service. Claude CLI was not attempted; no external lane report is claimed. Installed versions checked: Codex 0.163.0, Claude 2.1.308. The in-session reviewer used read-only source access; an attempted write-tree failed on index.lock permissions before making changes. Final staged comparison was unchanged.

## Reports

### gpt-6-astra / xhigh

One finding in staged tree d6aa98535dd2a36378575aa0d171980b1d2a2ca0, reviewed against 44663f0893b7cc87af7b3fae7914cc38c3cee9be:

- **[P2] The command-payload rejection test passes for the wrong reason** — tests/render-typed-world.test.ts:84. World has no submitCommand method, so @ts-expect-error suppresses a missing-member error regardless of whether { dx: 'invalid' } is rejected. The actual typed method is submit<K extends keyof TCommandMap>(type, data) at src/world-commands.ts:38. Replace the call with submit; preferably exercise these negative calls on an inferred projector callback parameter inside an unexecuted fixture, since the current helper receives an explicitly annotated GameWorld.

No implementation-level defect found. The appended parameters preserve existing positions/defaults, follow World’s constraints, and propagate through entity/frame callbacks and the internal change collector. Runtime projection code is unchanged; version and API/guide documentation agree.

Verified surrounding-code evidence outside changed hunks:

- src/world.ts:62: World’s generic order and constraints match the propagation.
- src/world-entities.ts:140 and src/world-observers.ts:231: typed component/state reads and their intentional fallback overloads remain intact.
- tests/public-surface.test.ts:1: the fixture pins exported names, explicitly excluding signatures; leaving it unchanged is appropriate.

Coverage: source/type-contract inspection, existing render/invalidation test inspection, new type/runtime assertions, and related documentation/version diffs. No tests, builds, installs, network access, browser activity, or external review services were run. Reported full-gate results were not independently rerun. Final staged comparison returned 0; files and index remain unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F0 | Invalid command assertion suppressed a nonexistent member | Accepted; test did not establish its stated contract | efe4048 replaces it with valid/invalid real submit and emit calls on an inferred callback; round 1 checks repair |

## Verification

Root's initial typecheck reproduced the typed World assignment/callback-read defect. The candidate passed all eleven gates: 1830 root passes plus one existing TODO, 22 MCP passes. Root dev audit retains seven moderate findings; production/MCP audits clean. These checks preceded commit 50fa994.

## Round outcome

One test repair required. No implementation defect found. Consumer adoption remains separate.
