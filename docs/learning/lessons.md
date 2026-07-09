# Lessons learned

Append durable engineering lessons here. Each entry should teach a future agent
something that is not obvious from the current code — a trap, a non-obvious
invariant, or a rule that keeps biting if ignored. One entry per lesson, newest
at the top. Keep entries short; link to code or devlog rather than restating.

Format:

```
## <short title> — YYYY-MM-DD
Context: when this came up.
Lesson: the durable rule or trap, phrased so it transfers to future work.
Pointer: devlog entry, file, or test that illustrates it.
```

---

## A new method on an exported class is additive PUBLIC SURFACE (minor), even when intended internal — and the name-level surface fixture won't catch it — 2026-06-13

| Field | Value |
|---|---|
| Surfaced by | `docs/threads/done/full/2026-06-13/4/REVIEW.md` (full-review iter-4) |
| Reviewer findings | Codex iter-4 MEDIUM ("getAtRaw is a public additive API method, cannot ship as patch 1.1.3"), Claude iter-4 NIT (same; "tag @internal or bump minor") |
| Fix commit | d077e52 (reverted `getAtRaw`; `findNearest` keeps the sorted-copy `getAt`) |
| Test added | n/a — process lesson. `tests/public-surface.test.ts` pins exported *names* + a no-star-export invariant; it explicitly defers method-signature changes to "a d.ts diff review step at the freeze", so a new method on an already-exported class passes it silently — that gap IS the lesson |
| Behavior delta | Before: a perf-only `SpatialGrid.getAtRaw` (added to skip a sorted-copy alloc in `findNearest`) would have shipped in patch `1.1.3` — `SpatialGrid` is exported, declarations ship (`types: ./dist/index.d.ts`, no `stripInternal`), so the method is in the consumer-facing `.d.ts`. Post-1.0 semver puts additive surface on the MINOR axis. After: reverted (the perf cost is benchmark-tolerable and both reviewers agreed), keeping the full-review batch a pure patch with the 1.0 surface frozen |

The trap: the surface-pin test gives false confidence that "the fixture is green ⇒ no surface change." It guards top-level *names*, not method additions to exported classes. When adding ANY method/property/overload to an exported class in a patch, check the `.d.ts` impact manually (or `@internal` + `stripInternal` to keep it package-internal). Corollary: don't grow public surface to dodge a benchmark-tolerable perf cost — accept the cost or use a truly-internal mechanism. Also from this review: Codex caught a real state-loss regression (the L3 terminal-snapshot skip) in a fix Claude had APPROVED the same iteration — concrete proof the multi-reviewer mandate earns its keep on re-reviews, not just first passes.

## Fan-out audits miss cross-surface duplication — grep ALL copies of a fact before claiming a fix is complete — 2026-06-13

| Field | Value |
|---|---|
| Surfaced by | `docs/threads/done/doc-accuracy-1x/2026-06-13/1/REVIEW.md` (doc-accuracy pass v1.1.1) |
| Reviewer findings | Claude iter-1 HIGH — the tick-lifecycle reorder landed in 2 of the 4 current canonical copies, introducing a four-way self-contradiction. Codex (same diff) verified the engine fact but did NOT flag the missed copies. |
| Fix commit | 579a3d1 (the 2 missed copies reordered after a full re-grep) |
| Test added | n/a — process lesson |
| Behavior delta | Before: the published docs would carry the tick-lifecycle list in two orders at once — `concepts.md`/`ARCHITECTURE.md` said "increment then notify" (correct: `world.tick === diff.tick` during listeners) while `api-reference.md` `step()` docs and `systems-and-simulation.md` still said "notify then increment", so a reader landing on the latter would conclude listeners fire at `world.tick === diff.tick - 1` — the opposite of reality. After: all four reordered; changelog/devlog say "all current copies", not "both". |

The trap: when N parallel audit agents each own one doc surface, a fact duplicated across surfaces (a lifecycle list, a signature, a phase order, a version string) gets fixed only where the assigned agent looked — and a partial fix is worse than none because the corrected copies now *contradict* the missed ones. Before declaring a cross-cutting fact fixed, `grep` the WHOLE `docs/` tree (minus `superpowers/` + `threads/done/`, which are intentional history) for every copy and reconcile them together. The multi-CLI review caught this precisely because the reviewer read the whole diff against the whole tree, not one surface — which is why the review step is load-bearing even for "doc-only" changes.

## Code-review prompts: use the AGENTS.md baseline verbatim, then extract only the review — 2026-04-29
Context: Spec 5 design iter-2 review. I wrote my own multi-paragraph prompt with verbose task context, and also captured Codex's full stdout (4800 lines / 351 KiB) which includes verbatim file dumps from every Read/cat the reviewer made while reasoning.
Lesson: (1) Use the AGENTS.md "Code review" baseline prompt verbatim — it already includes the "Be concise but effective: keep the reasoning, impact, and file/line evidence needed to act without preserving transcripts, command chatter, or repetitive detail" line. Add only 2-3 lines of task-specific context after the baseline. Don't rewrite the prompt's tone or duplicate its instructions. (2) Codex CLI's exec mode dumps every file it reads into stdout as it reasons. The actual review is only the final ~20 lines (between the last "^codex$" marker and "^tokens used$"). Always extract just the review section before reading into context — feeding the full transcript wastes tokens and clutters context. Claude's CLI output is typically already concise; less filtering needed but still spot-check.
Pointer: docs/threads/current/counterfactual-replay/2026-04-29/design-2/ (verbose transcript was in tmp/, never committed). Filter pattern: `awk '/^codex$/{n=NR; buf=""} {buf=buf"\n"$0} /^tokens used$/{print buf; exit}' codex-raw.txt` extracts the final review block.

## 2026-06-11 — "Read-only" reviewer CLIs can write: audit the working tree after every review batch

| Field | Value |
|---|---|
| Surfaced by | v0.8.23 (v1-surface) implementation: src/index.ts corrupted twice mid-objective (names re-attributed to wrong modules, invalid `.ts` import extensions, six public names dropped); a hallucinated test injected into tests/engine-error.test.ts (imported StrictModeViolationError from session-errors.js, called a nonexistent constructor signature). Timeline correlation: every corruption window coincided with a running `gemini --approval-mode plan` review subprocess, whose own stderr lists `replace` among its available tools; corruption stopped permanently once no review subprocess was in flight. |
| Reviewer findings | n/a — the reviewer WAS the failure mode (incident recorded in docs/threads/done/v1-surface/2026-06-11/1/REVIEW.md) |
| Fix commit | a53efc2 (clean deterministic regeneration + verified bytes); AGENTS.md mitigation in this commit |
| Test added | tests/public-surface.test.ts > "declared export names (types included) match the committed allowlist" — the surface pin is what detected the second corruption (alongside tsc); it now permanently guards index.ts's shape |
| Behavior delta | Before: a review subprocess could silently rewrite source while the driver built on top — the corrupted index.ts dropped SessionSink/SessionSource/NewMarker/BundleIntegrityError/BundleRangeError/BundleVersionError from the package and broke the build in a way that looked like the driver's own typecheck error. After: AGENTS.md mandates a `git status`/`git diff` contamination audit after every gemini batch, and the surface-pin test turns any index.ts tampering into an immediate named-delta failure. |

The general rule: a reviewer CLI's "read-only mode" is an assumption to verify per version, not a property to trust — and the cheapest structural defense is pinning tests that make silent mutation loud. The corrupted content was plausible-looking (correct names, wrong modules), which is exactly why eyeballing diffs is insufficient; the typecheck and the pin caught what reading would have missed.

## 2026-06-13 — Migrating a derived rule: sweep pure-data twins, cross-package consumers, AND the failure write-path — not just the engine's own `src/`

| Field | Value |
|---|---|
| Surfaced by | docs/threads/done/replay-endtick-finalization/2026-06-13/{1,2}/REVIEW.md (multi-CLI review of the v1.1.4 replay-endTick fix) |
| Reviewer findings | Codex iter-1 (failure-path `writeTickFailure` HIGH; stale `ENGINE_VERSION` MEDIUM); Claude iter-1 (un-migrated MCP `effectiveUpperBound` copies MEDIUM); Codex iter-2 (`mcp/package-lock.json` still 1.1.3 MEDIUM) |
| Fix commit | 994276c (base) + 0df7c2e (review-iter-1 fixes) |
| Test added | tests/session-recorder.test.ts > "live toBundle() after a TickFailure extends endTick to the failed tick (openAt → replay_across_failure, not too_high)"; mcp/tests/server.test.ts > "corpus_query.entrySummary reports the recovered effectiveUpperBound, not the raw endTick:0" |
| Behavior delta | The fix replaced a derived rule (reachable replay bound = `incomplete ? persistedEndTick : endTick`) that was copy-encoded at 7 sites across 2 packages. The first pass routed 5 engine sites through one `replayableUpperBound` helper but missed (a) the recording-side **failure** write-path — only `writeTick` advanced `endTick`, not `writeTickFailure`, so a live-exported bundle that hit a `TickFailure` reported `openAt(failedTick)` as `too_high` instead of `replay_across_failure`; and (b) the **cross-package consumer** — `civ-engine-mcp` re-encoded the OLD rule in two tool handlers, so a recovered legacy `campaign-4` bundle (endTick 0 / persistedEndTick 9000) reported `effectiveUpperBound: 0` to LLM agents (an AI told a 9000-tick game ends at tick 0). Plus the version bump touched the root lockfile but not the subpackage's `file:..` lockfile. |

The general rule: when a fix turns a behavior into a *derived rule*, the migration isn't done when the engine's own `src/` greps clean. Sweep four extra places before declaring it: (1) **pure-data twins** of the canonical path (here `snapshotAtTick` mirrors `openAt`'s gate); (2) **cross-package / cross-repo consumers** that re-encode the rule for their own surface (the MCP server — and it is the AI-native consumer the fix existed for, so its silent misreport defeats the whole change); (3) the **failure / error write-path** that parallels the success path (a "do X on every recorded tick" sink change must cover `writeTickFailure`, since a failed tick still consumes a tick number via `gameLoop.advance()`); (4) **every lockfile** after a version bump (root AND each subpackage with a `file:..` link — re-resolve all, then `npm ci` to confirm). This is the same fan-out-misses-duplication failure as the `eacaceb` lesson, sharpened: route all sites through ONE helper or ONE field (here the MCP reads the engine-computed `materializedEndTick` rather than re-deriving), so there is nothing left to drift. Grep the literal rule shape (`incomplete ?.*persistedEndTick.*endTick`) repo-wide AND in sibling packages as the completeness check.

## 2026-06-13 — For an "additive, non-breaking" engine change, the symlinked-consumer typecheck is the back-compat proof — not the engine's own gates

| Field | Value |
|---|---|
| Surfaced by | docs/threads/done/recorder-generics/2026-06-13/1/REVIEW.md (v1.2.0 generic-threading); the break was caught by the planned aoe2 cross-check, not by a reviewer |
| Reviewer findings | n/a — process lesson (the cross-check caught it pre-review; reviewers later confirmed `toBundle` correctly stays default-generic) |
| Fix commit | 44dbde5 (the over-reach was reverted in the same commit, before push) |
| Test added | n/a — process lesson. The feature itself is pinned by tests/session-generics.test.ts; the "toBundle stays default-generic" decision is enforced by the aoe2 typecheck, not a unit test |
| Behavior delta | Threading `TComponents`/`TState` through the recorder/replayer was purely additive and ALL engine gates (test/typecheck/lint/build, 1238+1) passed — including with an extra change I'd made: parameterizing `SessionRecorder.toBundle()`'s return as `SessionBundle<E, C, TDebug>`. That extra change was a silent back-compat BREAK: a typed bundle won't assign to a default-generic `SessionBundle` slot, and aoe2's `runPlaytest.ts` holds the result in exactly such a slot. The engine's own suite can't see it (no engine code holds a `SessionBundle` in a narrowed slot); only building the symlinked engine and running the consumer's `typecheck` (zero consumer edits) surfaced it. Reverted; the bundle stays the default-generic JSON middle. |

The general rule: "additive minor, all engine gates green" does NOT prove back-compat for a library with a real consumer — variance breaks (a more-specific return type that won't assign to a less-specific slot the consumer already holds) are invisible to the producer's own suite. When the change touches a public type signature and a sibling repo links the package (`file:..` / symlink), the back-compat gate is: rebuild `dist`, then run the consumer's `typecheck` with ZERO consumer edits. Bake it into the plan for any "engine-only" surface change. Here it caught a `toBundle()`-return over-reach the engine gates and the type test all waved through. Corollary: prefer threading types via INFERENCE (caller's typed value flows in) over re-parameterizing OUTPUT types (which widen what the producer hands back and can break narrowed consumer slots).

## 2026-07-08 — Run the gates AFTER the version bump; never hardcode a version literal a test means relatively

| Field | Value |
|---|---|
| Surfaced by | docs/threads/current/mandatory-loop-defaults/2026-07-08/1/REVIEW.md (Claude review of the 2.0.0 diff, verified by running the live tree's suite) |
| Reviewer findings | Claude iter-1 BLOCKER — `npm test` red (1305/1306) on the working tree while the drafted changelog claimed "gates green" |
| Fix commit | 6f823eb |
| Test added | tests/session-replayer.test.ts > "cross-major (a-component) engineVersion throws BundleVersionError" (fixture now derives via `crossMajorVersion()`) |
| Behavior delta | Before: the cross-major replay-guard test forged `engineVersion: '2.0.0'` as a literal (written when the runtime was 1.x). Bumping ENGINE_VERSION to 2.0.0 made the forged bundle SAME-major — the guard stopped throwing, the test failed, and the release would have shipped with a red suite and a changelog claiming green, because the full gates had been run BEFORE the version bump. After: the fixture derives from ENGINE_VERSION (`major + 1`), surviving every future major; the adjacent cross-minor test already used this pattern (`crossMinorVersion()`), so the convention existed and the literal was the outlier. |

Two rules. (1) A version bump is a code change: the full gate suite must run AFTER the last file of the change — including `package.json`/`version.ts` — not before; "gates were green when I ran them" is not "gates are green on the commit". (2) A test that means "a version RELATIVE to the runtime" (cross-major, cross-minor, stale-by-one) must derive that version from `ENGINE_VERSION`, never hardcode a literal that is only relative today — grep test fixtures for the current version string as part of any bump.
