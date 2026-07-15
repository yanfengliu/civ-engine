# AGENTS.md — civ-engine

## What this is

A general-purpose, headless, AI-native 2D grid-based game engine in TypeScript: strict ECS, deterministic ticks, session recording/replay, and autonomous playtest tooling. Zero runtime dependencies, plus an `mcp/` MCP-server subpackage. The engine ships reusable infrastructure that downstream game repos (e.g. `../aoe2`) consume — no game-specific logic, rendering, or UI code lives here.

## Fleet constitution

- Work headlessly by default; go non-headless only when nothing else can complete or verify the task, and say why.
- These rules are strong defaults, not law: when one would make the work worse, deviate and say why.
- Scale the approach to the task: trivial changes directly; substantial work as explore → plan → implement → verify, with subagents when work is genuinely parallel.
- Delivery boundary: each minimal coherent verified unit is reviewed, staged (scoped files only), and committed promptly — never commit failing or partial work as a checkpoint. Commit to `main`; push at the end of every task.
- The repo's gates must pass before every commit that touches code; doc-only changes need a self-reviewed diff.
- Review: self-review trivial changes; adversarially review non-trivial ones — independent agents that try to refute the change against the live code. High-risk work (persistence/migrations, security/auth, concurrency, money, supply chain, edits that reach sibling repos) escalates to the multi-cli-review skill. Reviewers must read the live code; verify reviewer claims against the codebase before acting on them; substantive findings outweigh approval votes.
- Dependency changes: re-resolve the lockfile, run the repo's audit gate (a new HIGH/CRITICAL is a blocker), and note the audit result in the commit message.
- Docs are part of the change: update every affected surface in the same commit; write prose one line per paragraph (no hard wrapping); never reference or mandate files that don't exist.
- Bias to continue: work through the whole accepted plan without mid-plan check-ins; context management is the harness's job, never a reason to stop. Stop only for a genuine blocker, a direction-changing decision, or an explicit stop. (Established 2026-05-01; reinforced 2026-07-05.)
- Model pins live only in `../loop-ops/docs/skills/multi-cli-review.md` — never hardcode model IDs anywhere else.
- Lessons files (`docs/learning/lessons.md` where present) require evidence anchors — source, fix commit, test id, behavior delta; unanchored lessons are folklore.
- Recursive loop: before running or driving a pass, read `../loop-ops/docs/skills/recursive-playtest.md`; before building loop machinery, read `../loop-ops/docs/skills/building-recursive-loop.md`.

## Gates

`npm test` · `npm run typecheck` · `npm run lint` · `npm run build` — all four before every code commit; only affected tests while iterating, full suite once confident. Dependency audit gate: `npm audit --audit-level=high` (full tree and `--omit=dev`). CI additionally builds and tests the `mcp/` subpackage, sequenced after the root build because its `file:..` dep resolves against `dist/`.

## Session start

Read `docs/devlog/summary.md` and `docs/architecture/ARCHITECTURE.md` before starting work.

## Invariants & boundaries

- Downstreams consume the prebuilt engine tarball, not a local build: on every push to `main`, CI's `publish-dist` job packs the built engine and refreshes the rolling `engine-dist` release that downstream CI (e.g. aoe2) fetches. Keep `main` green and pushed — a red or unpushed engine blocks downstream builds. The consumer-side upgrade and breaking-change contract lives in the downstream repos' AGENTS.md files; this repo's obligation is truthful semver plus a migration-focused changelog.
- Version `a.b.c` under semver, post-1.0 rules (since 2026-06-12): `a` (major) = breaking changes ONLY, and only when the user says so — removals go through the deprecation policy (deprecate in a minor, remove in the next major; `docs/guides/public-api-and-invariants.md`). `b` (minor) = additive surface (new exports, methods, options), with the surface-pin fixture diff (`tests/public-surface.test.ts`) as the review artifact. `c` (patch) = fixes, docs, internal changes — no surface additions. Pre-1.0 changelog entries used `b` as the breaking axis. One bump per coherent shipped change — independent features land as separate commits with separate bumps, while a feature's follow-up fix commits stay on the original version.
- Recursive-loop ownership: the engine owns the loop's validators and machine contracts — the `ImprovementFinding` contract, marker bridge, and run-manifest lifecycle (shipped v1.6.0; honesty invariants on by default since 2.0.0). Gates, browser/provider adapters, and auto-fix policy remain game-repo-owned; loop operations and fleet aggregation live in `../loop-ops`.
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
