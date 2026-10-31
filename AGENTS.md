# AGENTS.md — civ-engine

## What this is

A general-purpose, headless, AI-native 2D grid-based game engine in TypeScript: strict ECS, deterministic ticks, session recording/replay, and autonomous playtest tooling. Zero runtime dependencies, plus an `mcp/` MCP-server subpackage. The engine ships reusable infrastructure that downstream game repos (e.g. `../aoe2`) consume — no game-specific logic, rendering, or UI code lives here.

<!-- FLEET-CANON:BEGIN sha=e54f2a9ae007 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Reasons and evidence per `[Rn]`: `../fleet/docs/canon-rationale.md`. `../fleet/` is fleet's checkout beside the repo's primary checkout, also from a worktree. The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: visual and interactive work; games, simulations and research; measuring, debugging and slow steps; writing error messages; toolchains, dependencies and model calls; standing loops and unattended runs; pushing executable changes; a user-reported defect; editing skills, agent instructions or rules; run output and files over 256 KiB; handing off or stopping mid-task.

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture and minimal necessary complexity. Optimize useful progress, not agent count, code volume or maximum reasoning. Adapt rigor to risk. This policy grants no new permissions or capabilities. [R1]

**Roles.** Only an explicitly designated agent coordinates; each scope has one accountable integration owner. [R2]

Workers own bounded outcomes and local implementation decisions. [R3]

Inspect instructions, code, docs, tree state and active tasks; set outcome, non-goals, acceptance criteria, dependencies and verification; settle ambiguity with evidence and reversible defaults. [R4]

**Session size** (owner directives, 2026-09-23 and 2026-10-22). Sessions run long: take new requests as separate assignments in the same session, and never hand off to a successor session to shed context; auto-compaction carries the session. Split tasks expected to exceed about 200k context tokens into milestones within that budget, each committed and merged to main once green. Milestones are task boundaries; a compaction never justifies wrapping up or handing off. [R6]

**Coordinate safely.** Beyond a trivial read, each session or agent defaults to its own worktree; serialize overlapping writes only when none is available, and say why. Finish each bounded increment in its session: merge to main, push, then `git worktree remove`, remove completed task-owned branches and unneeded temporary files, and explicitly transfer the ownership and location of still-needed resources. Report any merged worktree left and its location as a defect. Never overwrite or discard another participant's work. On resumption, first inspect surviving worktrees, artifacts and task status, assuming nothing survived until checked; recover what exists and preserve unfinished work. [R7]

Workers act autonomously in scope; escalate cross-task interfaces, persistent formats, security boundaries, major dependencies and scope changes to the coordinator for resolution within the approved mandate. Unapproved major architecture or product changes and consequential external actions need human authorization. Fleet rules (FLEET.md, the fleet's skills and runbooks, canon candidates, and agent memory) change only when the owner asks (owner directive, 2026-10-28). Agents propose changes instead of making them. The one exception: they may add a proposal to `../fleet/canon-candidates.md`, with the lesson, its evidence and the rule it would change (owner directive, 2026-10-29). They never change, promote or delete an entry: the owner decides each one, and the session the owner asks makes the change. Never reset consumed allowances. [R8]

**Implement and verify.** Inspect, implement a coherent increment, check, diagnose, fix, recheck. Preserve architecture; no unrelated rewrites, speculative abstractions or unnecessary dependencies. Implement when requested. Use task-appropriate evidence and baselines; prototype uncertain ideas before generalizing. Never weaken tests or conceal failures to claim success. Docs-only work uses content and version checks; skip runtime tests and CI waits. [R9]

During authorized work and within scope and budget, proactively improve products and the task's orchestration, learn from recorded outcomes and propose improvements to fleet rules. Read `../fleet/docs/skills/self-improvement/SKILL.md` when proposing a fleet-rule change or turning a mistake into a gate (owner directive, 2026-10-29). [R33]

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. Report unavailable review; fix justified findings, rerun affected checks, and obtain focused re-review when fixes invalidate earlier review. [R10]

**Integrate, report, and stop.** Reassess after two failures for one reason. Unless another budget is set or the user authorizes more, cap automatic repair at five substantive attempts, then report; explicit overrides hold for their stated scope without asking again. Keep updates brief and decision-relevant. Stop when acceptance criteria and material findings are resolved; invent no follow-up work. [R11]

**Final acceptance gate.** The integration owner integrates in dependency order and on the final integrated revision's actual changes and evidence, not worker summaries, checks every acceptance criterion, runs relevant automated checks and exercises affected end-to-end behavior and cross-task interactions. Substantial or high-risk work gets independent read-only review of the integrated changes, integration fixes included. Confirm the merge to main; report that revision, review status and every failed, skipped or unavailable check and unmet criterion. Nothing is fully verified with an open material finding or required check. [R12]

### Fleet conventions

- Repository rules add local constraints consistent with this policy; they cannot override its permissions, adaptive workflow or stopping limits. [R13]
- Gates pass before any commit touching code, a merge included: merge on a detached HEAD or its own branch and move main to it once its gate passes. The user's standing grant covers committing, merging to main and pushing in their repos; force-pushing, rewriting history, deploying and publishing still need authorization. Work is done only once merged to main, regardless of green branch or worktree gates; report unmerged work's location. [R14]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and executable changes in sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; every model a product calls is pinned in its calling repo. No model IDs are hardcoded elsewhere. [R29]
- Read `docs/learning/lessons.md` at session start. Record the session's lessons there; each names its retiring gate and is deleted in the commit landing it. A gate counts only after going red with the defect reintroduced, following `../fleet/docs/lessons-template.md`. [R18]
- Gates prove nothing beyond their bounds: name the bound in the header and pin every reproducing input. Distinguish passed from did-not-run; a check built from its checked symbol proves only self-agreement. [R19]
- Verify outcomes beyond exit status, red or green, and return values: read the artifact that should have changed. Retest inherited blockers before repeating them. [R20]
- Keep plans and every authored review round in permanent `docs/work/<id>_<theme>/` folders (`../fleet/docs/work-docs.md`). Record history, not status: a dated devlog line per behaviour-changing session in `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`). [R24]
- Use common words with the same meaning in chat, docs, commits, PRs, comments and errors. One idea per sentence unless a rule needs more. Cut length, not facts: keep exact terms, numbers and evidence. Quotes and pastes are exempt; do not copy this canon's style. One line per paragraph, no hard wrapping. [R25]
- When blocked, immediately hand over the redacted artifact with the named blocker, before analysis; continue safe independent work. [R27]
- The owner's directions that outlive a task land that session in `../fleet/FLEET.md` if fleet-wide, otherwise the repo's `docs/policies/local-rules.md`; report where. [R31]
- When a hard problem blocks progress, run the search in `../fleet/docs/skills/hard-problem.md`. [R32]
<!-- FLEET-CANON:END -->

## Gates

`npm run gates` before every commit that touches code, and before every push — eleven steps, exactly what CI runs, in CI's order: both audits (`npm audit --audit-level=high`, full tree and `--omit=dev`), test, typecheck, lint, build, pack, the benchmark gate, then the `mcp/` subpackage, sequenced after the root build because its `file:..` dep resolves against `dist/`. It runs the whole list past the first failure, so one invocation surfaces every failure instead of one per remote round trip.

While iterating, the four fast gates are enough — `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`, with only affected tests until confident. They are not enough to push on. The audit gate is time-dependent, not diff-dependent: a newly published advisory against an unchanged dependency turns a green tree red with no commit at all, so there is no diff to key a conditional on. That is how `main` went red for 47 days and 27 pushes behind four green local gates — [docs/learning/defect-register.md](docs/learning/defect-register.md).

Node 24 is the baseline, pinned in `.nvmrc`; `engines.node` still promises `>=20`, so CI's matrix runs 20, 22, and 24 and every one of them is a real promise. A failure on one major only is a version mismatch, not a code failure — read it that way before debugging the diff.

## Session start

Read `docs/devlog/summary.md` and `docs/architecture/ARCHITECTURE.md` before starting work. Of the summary, read the newest ten entries, which are at its top; of ARCHITECTURE.md, read its section map, then only the sections the work needs.

## Invariants & boundaries

- Downstreams consume the prebuilt engine tarball, not a local build: on every push to `main`, CI's `publish-dist` job packs the built engine and refreshes the rolling `engine-dist` release that downstream CI (e.g. aoe2) fetches. Keep `main` green and pushed — a red or unpushed engine blocks downstream builds. The consumer-side upgrade and breaking-change contract lives in the downstream repos' AGENTS.md files; this repo's obligation is truthful semver plus a migration-focused changelog.
- Version `a.b.c` under semver, post-1.0 rules (since 2026-06-12): `a` (major) = breaking changes ONLY, and only when the user says so — removals go through the deprecation policy (deprecate in a minor, remove in the next major; `docs/guides/public-api-and-invariants.md`). `b` (minor) = additive surface (new exports, methods, options), with the surface-pin fixture diff (`tests/public-surface.test.ts`) as the review artifact. `c` (patch) = fixes, docs, internal changes — no surface additions. Pre-1.0 changelog entries used `b` as the breaking axis. One bump per coherent shipped change — independent features land as separate commits with separate bumps, while a feature's follow-up fix commits stay on the original version.
- Recursive-loop ownership: the engine owns the loop's validators and machine contracts — the `ImprovementFinding` contract, marker bridge, and run-manifest lifecycle (shipped v1.6.0; honesty invariants on by default since 2.0.0). Gates, browser/provider adapters, and auto-fix policy remain game-repo-owned; fleet-wide loop-engineering guidance lives in `../fleet/docs/skills/building-recursive-loop.md`.
- TDD for behavior changes: tests first, testing the contract (app experience and mechanisms), not the code.
- Respect the boundaries documented in `docs/architecture/ARCHITECTURE.md`; if a boundary seems wrong, flag it instead of silently violating it.
- File size: keep every file under 500 LOC (hard ceiling 1000) — split god-objects by lifecycle/role; prefer composition over inheritance.

## Conventions

- Devlog: `docs/devlog/summary.md` (one line per task; compact past 50 lines — no cheating with mega-lines) + `docs/devlog/detailed/START_DATE_END_DATE.md` (per-task entry: timestamp, action, reviewer findings by provider and theme, result, reasoning, notes; append to the file with the latest `END_DATE` and search backwards from it; archive via `git mv` when the active file passes 500 lines, starting a new file dated today and keeping all filename dates accurate). Subagents doing summary work extract facts only, no interpretation.
- Changelog `docs/changelog.md`: one entry per version — external audience, migration focus, validation and behavior callouts; dev-internal commentary stays in the devlog. Each version bump updates `package.json` and the README version badge.
- API surface changes (new, removed, or renamed exports/methods/types): update `docs/api-reference.md` (every public type, method, and standalone utility gets its own section; removed APIs get removed, not struck through; no stale signatures), the README Feature Overview / Public Surface bullets when user-visible, and the `docs/README.md` index when a guide is added.
- Structural changes: update `docs/architecture/ARCHITECTURE.md` (component-map row, boundaries paragraph, tick-lifecycle ASCII) and append a row to `docs/architecture/drift-log.md`; non-obvious tradeoffs append to `docs/architecture/decisions.md` (append-only — supersede, never delete). Non-structural fixes, refactors, UI tweaks, and test-only work touch none of these.
- Guide routing — update every `docs/guides/<topic>.md` whose subject overlaps the change: resource APIs → `resources.md`; system features → `systems-and-simulation.md`; spatial primitives → `spatial-grid.md` / `rts-primitives.md`; AI-facing surfaces → `ai-integration.md`; field-data utilities → `map-generation.md`; tutorial-grade features → `building-a-game.md` and `getting-started.md`; `concepts.md`'s standalone-utilities list and tick-lifecycle ASCII track new utilities and lifecycle changes. Guides demonstrate the current API — replace deprecated demos rather than adding "new way" sidebars. A feature too small for a guide update still gets a sentence in the relevant existing guide; silence is not a valid signal.
- Doc-accuracy sweep before declaring a change done: grep removed/renamed API names across `docs/` and `README.md` (or invoke the doc-review skill). Stale references are intentional only in historical changelog/devlog/drift-log entries; every other surface reflects current reality.
- Cross-work roadmaps and historical design notes live in `docs/design/`.
- Lessons: `docs/learning/lessons.md` per the fleet evidence-anchor rule; code lessons need a real test node id (`n/a` reserved for genuinely process-level lessons), and engine/sim lessons include the affected bundle ID / replay seed / behavioral metric in the behavior delta.
- Debugging: one file per session under `docs/debugging/`, copied from `template.md` there, which carries the procedure; when a later session invalidates an old conclusion, correct the old file instead of leaving it to mislead.
