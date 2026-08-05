# AGENTS.md — civ-engine

## What this is

A general-purpose, headless, AI-native 2D grid-based game engine in TypeScript: strict ECS, deterministic ticks, session recording/replay, and autonomous playtest tooling. Zero runtime dependencies, plus an `mcp/` MCP-server subpackage. The engine ships reusable infrastructure that downstream game repos (e.g. `../aoe2`) consume — no game-specific logic, rendering, or UI code lives here.

<!-- FLEET-CANON:BEGIN sha=2d7b45473798 generated from fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

- Work headlessly by default. If only a browser or GUI can finish or verify the task, say why, and close what you opened.
- Concurrent sessions share one worktree and one index: commit by explicit pathspec (`git commit -- <files>`), never `git commit -a`, `git add -A`, or `git add .` — a sweeping commit captures whatever another session has staged. (voxel c024b33.)
- Commit early and often: the moment a minimal, coherent unit of change is verified, commit it to `main` without being asked, and push. Never batch several units into one commit, and never commit failing or partial work as a checkpoint. Gates pass before any commit that touches code; a dependency change re-runs the audit gate.
- Toolchain baseline is Node 24, pinned per repo in `.nvmrc`. A repo that must keep an older major says so in its Gates section and keeps a CI job proving it.
- Runtime model calls are authorized and already paid for — this fleet has one user, with Claude Code and Codex subscriptions — so a program here may call a model at runtime, vision included, wherever that beats a hand-written heuristic. Model output proposes; a deterministic check disposes.
- A fix is done when the failing case has been rerun and a regression test or fixture fails if the fix reverts. A diff is not evidence.
- High-risk work — persistence/migrations, security/auth, concurrency, money, supply chain, edits that reach sibling repos — escalates to the multi-cli-review skill.
- Error messages are a product surface: audit them as a class, including paths the task did not touch. Every path that rejects or throws names what happened, which input caused it, and what would satisfy it — never a bare `Validation failed`.
- Docs are part of the change: update every affected surface in the same commit, and write prose one line per paragraph (no hard wrapping).
- Task-run evidence — raw traces, per-sample results, screenshots, recordings, generated reports, archives — lives only under ignored paths and is deleted once nothing active needs it; never commit, push, or move it to LFS. Tracked docs keep conclusions and provenance only. Such output enters Git only when review promotes it into a genuine repository input — a fixture, golden, snapshot, or contract.
- Git blob ceilings: a new or changed blob over 256 KiB needs an explicit repository-input reason; over 512 KiB binary, or 1 MiB anything, never enters ordinary Git. An external asset store or LFS requires explicit user approval, and an existing oversized blob is never precedent for another.
- Steering compounds: when the user gives a direction that outlives the immediate task, land it that same session — `../fleet/FLEET.md` if fleet-wide, else this repo's `docs/policies/local-rules.md` — and say where it went.
- Citations are part of the deliverable: anything with a public answer — a numerical method, a library's behaviour, an engine parameter, a format, a protocol — carries the source it was read from, and so does any mechanism offered to explain a measured result. A dependency's source is one call away (`gh api repos/<owner>/<repo>/contents/<path>`).
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
