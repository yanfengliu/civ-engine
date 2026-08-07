# AGENTS.md — civ-engine

## What this is

A general-purpose, headless, AI-native 2D grid-based game engine in TypeScript: strict ECS, deterministic ticks, session recording/replay, and autonomous playtest tooling. Zero runtime dependencies, plus an `mcp/` MCP-server subpackage. The engine ships reusable infrastructure that downstream game repos (e.g. `../aoe2`) consume — no game-specific logic, rendering, or UI code lives here.

<!-- FLEET-CANON:BEGIN sha=66d32a789510 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

- Work headlessly by default. If only a browser or GUI can finish or verify the task, say why.
- You are not the only writer in the worktree: your own subagents commit, and a stash may predate you. Commit by explicit pathspec (`git commit -- <files>`), never `git commit -a`, `git add -A`, or `git add .` followed by a bare commit, and never `git stash pop` — the stash on top is often not yours. (voxel c024b33.)
- Commit each verified unit of change to `main` without being asked, and push. Gates pass before any commit that touches code; a dependency change re-runs the audit gate.
- Toolchain baseline is Node 24. A repo that must keep an older major says so in its Gates section and keeps a CI job proving it.
- Runtime model calls are authorized and already paid for — this fleet has one user, with Claude Code and Codex subscriptions — so a program here may call a model at runtime, vision included.
- The top reasoning tier is rationed: spend it only on the hardest problem, or on directing the workhorse tier that does the work — and only at maximum effort or orchestration.
- High-risk work — persistence/migrations, security/auth, concurrency, money, supply chain, edits that reach sibling repos — escalates to the multi-cli-review skill. That is a review you run yourself, not permission you ask the user for; nothing in this canon requires asking.
- Error messages are a product surface: audit them as a class, including paths the task did not touch. Each names what happened, which input caused it, and what would satisfy it — context the throw site holds for free and a reader can only buy back by running it again. That detail is what closes the loop: a bare `Validation failed` turns an already-diagnosed failure into a debugging session.
- When blocked, hand over the raw artifact — screenshot, rendered page, log line, data row — as soon as the blocker is named rather than after the analysis: your description of it is filtered through the misunderstanding that caused the block, so it cannot contain what you failed to notice.
- Task-run evidence lives only under ignored paths and is deleted once nothing active needs it; it enters Git only when review promotes it into a repository input — a fixture, golden, snapshot, or contract. Tracked docs keep conclusions and provenance only. Blob ceilings for anything promoted: over 256 KiB needs a stated reason, over 512 KiB binary or 1 MiB of anything never enters ordinary Git, and an asset store or LFS needs the user's approval.
- Write prose one line per paragraph (no hard wrapping).
- Keep a devlog: one short dated line per behaviour-changing session in `docs/devlog/summary.md`, newest first, and a section in `docs/devlog/detailed/` for anything a later session could trip over — what was believed and proved false, what a reviewer caught that the author missed, what number moved and from what. Both shapes are in `../fleet/docs/devlog-template.md`. It is history, not status: the repo's design docs hold the current position. Write it because the alternative is rediscovering your own dead ends.
- Read `docs/learning/lessons.md` at session start: the one-line index of what this repo has already paid to learn, short by construction, with each entry's war story and anchor in `lessons-evidence.md` — opened only when a rule is in doubt or the work is in that area. A lesson lands the session it is learned, as an entry there plus one line here, anchored to a measurement, commit, or test id; unanchored, it is folklore. When a lesson becomes a gate — a test, a lint rule, a fixed command — delete both halves, because the machine enforces it now and every line that stays spends the attention that keeps the rest read. Shape: `../fleet/docs/lessons-template.md`.
- Steering compounds: a direction that outlives the immediate task lands that same session — `../fleet/FLEET.md` if fleet-wide, else this repo's `docs/policies/local-rules.md` — and you say where it went.
- Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; a model a product itself calls is pinned in the repo that calls it. Never hardcode a model ID anywhere else.
<!-- FLEET-CANON:END -->

## Gates

`npm test` · `npm run typecheck` · `npm run lint` · `npm run build` — all four before every code commit; only affected tests while iterating, full suite once confident. Dependency audit gate: `npm audit --audit-level=high` (full tree and `--omit=dev`). CI additionally builds and tests the `mcp/` subpackage, sequenced after the root build because its `file:..` dep resolves against `dist/`.

## Session start

Read `docs/devlog/summary.md` and `docs/architecture/ARCHITECTURE.md` before starting work. Read `docs/learning/lessons.md` too — it records what has already been tried and what it cost, and a lessons file nothing tells anyone to open is write-only.

## Invariants & boundaries

- Downstreams consume the prebuilt engine tarball, not a local build: on every push to `main`, CI's `publish-dist` job packs the built engine and refreshes the rolling `engine-dist` release that downstream CI (e.g. aoe2) fetches. Keep `main` green and pushed — a red or unpushed engine blocks downstream builds. The consumer-side upgrade and breaking-change contract lives in the downstream repos' AGENTS.md files; this repo's obligation is truthful semver plus a migration-focused changelog.
- Version `a.b.c` under semver, post-1.0 rules (since 2026-06-12): `a` (major) = breaking changes ONLY, and only when the user says so — removals go through the deprecation policy (deprecate in a minor, remove in the next major; `docs/guides/public-api-and-invariants.md`). `b` (minor) = additive surface (new exports, methods, options), with the surface-pin fixture diff (`tests/public-surface.test.ts`) as the review artifact. `c` (patch) = fixes, docs, internal changes — no surface additions. Pre-1.0 changelog entries used `b` as the breaking axis. One bump per coherent shipped change — independent features land as separate commits with separate bumps, while a feature's follow-up fix commits stay on the original version.
- Recursive-loop ownership: the engine owns the loop's validators and machine contracts — the `ImprovementFinding` contract, marker bridge, and run-manifest lifecycle (shipped v1.6.0; honesty invariants on by default since 2.0.0). Gates, browser/provider adapters, and auto-fix policy remain game-repo-owned; fleet-wide loop-engineering guidance lives in `../fleet/docs/skills/building-recursive-loop.md`.
- TDD for behavior changes: tests first, testing the contract (app experience and mechanisms), not the code.
- Respect the boundaries documented in `docs/architecture/ARCHITECTURE.md`; if a boundary seems wrong, flag it instead of silently violating it.
- File size: keep every file under 500 LOC (hard ceiling 1000) — split god-objects by lifecycle/role; prefer composition over inheritance.

## Known traps

- Visual changes verify with before screenshot → change → after screenshot → pixel diff, alongside the normal gates.
- Debugging sessions record their process in a new file per session from `docs/debugging/template.md`; if a later session invalidates an old conclusion, update the old doc to prevent misunderstandings; clean up temporary dumps (stack traces, test results) when done.

## Conventions

- Devlog: `docs/devlog/summary.md` (one line per task; remove outdated info; compact past 50 lines — no cheating with mega-lines) + `docs/devlog/detailed/START_DATE_END_DATE.md` (per-task entry: timestamp, action, reviewer findings by provider and theme, result, reasoning, notes; append to the file with the latest `END_DATE` and search backwards from it; archive via `git mv` when the active file passes 500 lines, starting a new file dated today and keeping all filename dates accurate). Subagents doing summary work extract facts only, no interpretation.
- Changelog `docs/changelog.md`: one entry per version — external audience, migration focus, validation and behavior callouts; dev-internal commentary stays in the devlog. Each version bump updates `package.json` and the README version badge.
- API surface changes (new, removed, or renamed exports/methods/types): update `docs/api-reference.md` (every public type, method, and standalone utility gets its own section; removed APIs get removed, not struck through; no stale signatures), the README Feature Overview / Public Surface bullets when user-visible, and the `docs/README.md` index when a guide is added.
- Structural changes: update `docs/architecture/ARCHITECTURE.md` (component-map row, boundaries paragraph, tick-lifecycle ASCII) and append a row to `docs/architecture/drift-log.md`; non-obvious tradeoffs append to `docs/architecture/decisions.md` (append-only — supersede, never delete). Non-structural fixes, refactors, UI tweaks, and test-only work touch none of these.
- Guide routing — update every `docs/guides/<topic>.md` whose subject overlaps the change: resource APIs → `resources.md`; system features → `systems-and-simulation.md`; spatial primitives → `spatial-grid.md` / `rts-primitives.md`; AI-facing surfaces → `ai-integration.md`; field-data utilities → `map-generation.md`; tutorial-grade features → `building-a-game.md` and `getting-started.md`; `concepts.md`'s standalone-utilities list and tick-lifecycle ASCII track new utilities and lifecycle changes. Guides demonstrate the current API — replace deprecated demos rather than adding "new way" sidebars. A feature too small for a guide update still gets a sentence in the relevant existing guide; silence is not a valid signal.
- Doc-accuracy sweep before declaring a change done: grep removed/renamed API names across `docs/` and `README.md` (or invoke the doc-review skill). Stale references are intentional only in historical changelog/devlog/drift-log entries; every other surface reflects current reality.
- Review threads: syntheses land in `docs/threads/current/<objective>/<date>/<n>/REVIEW.md` — synthesis only, severity-tagged findings plus final disposition; never raw CLI output, logs, prompts, or diff snapshots under `docs/` (temp captures go to unstaged `tmp/review-runs/<objective>/<date>/<n>/` and get cleaned up). `DESIGN.md`/`PLAN.md` live at the objective root as the authoritative design and plan docs; `<n>` starts at 1 and increments per re-review, and re-reviewers read prior `REVIEW.md`s + `docs/learning/lessons.md` + the new diff so earlier fixes land verified and old issues aren't re-flagged. Move closed objectives to `docs/threads/done/` and keep them as audit trail. Cross-thread roadmaps and historical design notes live in `docs/design/`.
- Lessons: `docs/learning/lessons.md` per the fleet evidence-anchor rule; code lessons need a real test node id (`n/a` reserved for genuinely process-level lessons), and engine/sim lessons include the affected bundle ID / replay seed / behavioral metric in the behavior delta.
