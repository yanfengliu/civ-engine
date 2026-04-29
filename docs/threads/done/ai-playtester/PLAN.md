# AI Playtester Agent Implementation Plan

**Plan revision:** v1 (2026-04-29). Single-iteration plan; small spec.

**Goal:** Implement Spec 9 per accepted DESIGN v2. One coherent v0.8.9 commit lands `runAgentPlaytest`, `AgentDriver` contract, `bundleSummary`, tests, docs, version bump.

**Architecture:** New module `src/ai-playtester.ts` (~250 LOC) plus tests + guide. No changes to `World`, `runSynthPlaytest`, `Policy`, or recording primitives.

**Versioning:** Current base v0.8.8. Spec 9 is additive non-breaking. Ship v0.8.9.

## File Map

**Create:**
- `src/ai-playtester.ts` — runner + driver contract + bundleSummary
- `tests/ai-playtester.test.ts` — 11 tests covering DESIGN §6 contracts
- `docs/guides/ai-playtester.md` — pattern + LLM example

**Modify:**
- `src/index.ts` — export Spec 9 surface
- `package.json` / `src/version.ts` — 0.8.8 → 0.8.9
- `README.md` — version badge + Feature Overview row
- `docs/api-reference.md` — Spec 9 section
- `docs/architecture/ARCHITECTURE.md` — Component Map row
- `docs/architecture/drift-log.md` — row
- `docs/architecture/decisions.md` — ADR 41
- `docs/design/ai-first-dev-roadmap.md` — Spec 9 status
- `docs/changelog.md` — v0.8.9 entry
- `docs/devlog/summary.md` — line entry
- `docs/devlog/detailed/2026-04-29_2026-04-29.md` — task entry

## Single Task

1. Tests first: 11 categories per DESIGN §6 (rejects bad maxTicks, rejects poisoned, sync agent, async agent, stopWhen, world poisoning, agent throws, report capture, report throws non-rejecting, bundleSummary counts/rates, bundleSummary empty bundle).
2. Implement `src/ai-playtester.ts` with `AgentDriver`, `AgentPlaytestConfig`, `AgentPlaytestResult`, `runAgentPlaytest`, `BundleSummary`, `bundleSummary`. Per-tick `recorder.lastError` check (M1).
3. Update `src/index.ts` exports.
4. Bump version. Update README badge + Feature Overview + Public Surface bullet.
5. Write `docs/guides/ai-playtester.md`.
6. Update api-reference + ARCHITECTURE + decisions (ADR 41) + drift-log + roadmap status + changelog + devlog summary.
7. Multi-CLI code review (single iteration expected; this is a small spec).
8. Append final devlog detail entry.
9. Move thread to done/.
10. Final gates on post-move tree. Commit.

## Acceptance Criteria

- All exports per DESIGN §10 ship from `src/index.ts`.
- Sync and async agents work; all five `stopReason` values reachable.
- `bundleSummary` is pure and JSON-serializable.
- All four engine gates pass.
- Multi-CLI code review converges.
