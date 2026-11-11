# AGENTS.md — civ-engine

## What this is

A general-purpose, headless, AI-native 2D grid-based game engine in TypeScript: strict ECS, deterministic ticks, session recording/replay, and autonomous playtest tooling. Zero runtime dependencies, plus an `mcp/` MCP-server subpackage. The engine ships reusable infrastructure that downstream game repos (e.g. `../aoe2`) consume — no game-specific logic, rendering, or UI code lives here.

<!-- FLEET-CANON:BEGIN sha=fa6416c07600 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Shared rules for every repo under `github/`, kept in `../fleet/FLEET.md`; `../fleet/` is fleet's checkout beside this repo's primary checkout. Where a rule gives its reason, use the reason to judge cases the rule does not name; each `[Rn]`'s history is in `../fleet/docs/canon-rationale.md`. This repo's `docs/policies/local-rules.md` may add rules but cannot change these permissions or limits. [R13]

The main agent owns delivery and may implement directly. Use subagents when bounded, independent work or independent judgment materially improves speed or quality; keep small or tightly coupled work with one agent (owner directive, 2026-11-07). [R2, R3]

The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: standing loops and unattended runs; editing skills, agent instructions or rules; handing off or stopping mid-task.

### Permissions

- Commit, merge to main and push without asking. Force-pushing and rewriting history (they destroy history), and deploying and publishing (they reach other people), need the owner's OK. [R14]
- Ask before a major architecture or product change, a new major dependency, a change to a persistent format or a security boundary, or any other consequential action outside this machine, such as posting or sending something. [R8]
- Change fleet rules (FLEET.md, fleet skills and runbooks, agent memory) or add a rule to a repo's `docs/policies/local-rules.md` only when the owner asks, because the owner sets policy. You may add a proposal with its evidence to `../fleet/canon-candidates.md`, but not edit its entries. [R8]

### Sharing the machine

- Other Claude and Codex sessions may be working in this checkout, and you cannot see them. Do anything beyond a quick read in your own worktree, because two sessions in one tree spoil each other's gates and commits. Never revert, overwrite or delete changes you did not make. When resuming, check which worktrees, branches and files already exist. [R7]
- Done means merged to main and pushed: the owner archives sessions, and work left on a branch is lost. Merge on your branch, get the gates passing there, then move main, because other worktrees build on local main. Judge the merged result itself, not a worker's summary. Then remove your worktree and branch, and report where any unmerged work is. [R14]

### Doing the work

- The repo's gates must pass on the tree that is handed back or reaches main. Unless the repo's own rules ask more of a commit, commit on your own branch at every stopping point and say in the message what was not checked, because a session can end without warning. Docs-only changes need content checks and any gate the repo names for docs, not runtime tests or CI waits. [R14]
- Check the thing that should have changed (the file, the page, the number), not just the exit code or a tool's report: both can pass over a defect. Retest a blocker you inherit before repeating it. Never weaken a test or hide a failure to get green. [R9]
- Look at visual and interactive work rendered at full resolution, through the real controls, from fixed and random views, because passing tests say nothing about pixels. Run it headless unless a visible window is needed. [R16]
- Slowness on the critical path, such as a gate rendering on the CPU of a machine with a GPU, is a defect to fix. [R22]
- After pushing code, follow CI to the end; read a failed job's steps before blaming the code, since a billing limit fails jobs before any step runs. [R15]
- If a fix fails twice for one reason, rethink it. After five real repair attempts at one problem, whatever the approach and counting earlier sessions, stop and report, unless the owner set another limit; for a problem that keeps winning, run the search in `../fleet/docs/skills/hard-problem.md`. Stop when the task's criteria are met; do not invent follow-up work. [R11]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and code changes in another repo. Review the exact revision against the task's criteria, and say so when review was unavailable. Fix the findings that matter and have those fixes checked; note minor ones instead of starting another round. `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- A defect the owner reports gets a test for its whole class and an entry in `docs/learning/defect-register.md`, because a fix without a check tends to come back. [R17]
- Sessions run long: take new requests in the same session, and never hand off to a new session to shed context. Split work expected to need more than about 200k tokens of context into milestones, each merged to main. [R6]

### Records, sized to the work

- Read `docs/learning/lessons.md` at session start; it lists this repo's known traps, and its header says how to add one. [R18]
- Every change that alters behaviour adds a dated line to `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`) when it lands, because later sessions orient from its newest entries. Work that spans sessions, has several agents writing, or gets an independent review also keeps its plan and review records in `docs/work/` (`../fleet/docs/work-docs.md`); other work needs none. [R24]
- Raw output (logs, captures, screenshots) stays in ignored folders. Never commit a binary over 512 KiB or any file over 1 MiB; LFS needs the owner's OK. [R23]

### Style and environment

- Plain words; one line per paragraph, no hard wrapping. A report says what changed, how it was checked (including any check skipped or failed) and what is not done. [R25]
- Node 24 is the baseline. Products pin the model IDs they call in their own repo, and nowhere else. Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`. Runtime model calls are allowed and paid for; make per-item calls one-shot, not agent sessions. [R28, R29]
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
