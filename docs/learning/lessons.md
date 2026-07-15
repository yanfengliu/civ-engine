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

## A search tool that isn't on PATH returns empty *identically to "no matches"* — never prove ABSENCE with a `2>/dev/null`-suppressed command — 2026-07-10

| Field | Value |
|---|---|
| Surfaced by | full-review H2 reachability check (this session's devlog `2026-07-07_2026-07-10.md` → "Notes") |
| Reviewer findings | n/a — process lesson (the driver's own near-miss, caught by re-checking before implementing) |
| Fix commit | 2.4.0 full-review H2 (the reachability audit that gated the version decision) |
| Test added | n/a — process lesson |
| Behavior delta | Before: `rg -n … 2>/dev/null \| grep …` over the sibling repos returned empty and I concluded "no consumer uses the `ImprovementFinding` contract" — which would have mis-scoped the H2 versioning decision (a wrong "zero consumers" read). `rg` is NOT on this machine's Git-Bash PATH, so it errored to stderr (hidden by `2>/dev/null`) and emitted nothing. After: re-running with `grep -rn --include --exclude-dir` showed aoe2 IS a live consumer (it just doesn't set `fixed`/`regressed`) — same final decision, but now on real evidence. |

The trap: an empty result from a search you're using to prove a NEGATIVE ("nothing matches, therefore safe to change X") is only trustworthy if the tool actually ran. `2>/dev/null` on a `command-not-found` makes a broken invocation look exactly like a clean codebase. Rules: (1) on this machine use `grep -rn --include=… --exclude-dir=…` or the harness Grep tool for cross-repo search — `rg` is not on the Bash PATH; (2) when a grep result gates a decision, don't suppress stderr, or run `which <tool>` / a positive control first (grep for something you KNOW exists and confirm it's found); (3) treat "empty" as "unproven," not "absent," until the tool is confirmed to have executed. Pairs with the `replace_all` lesson below — both are "a green/empty result gave false confidence."

## A `replace_all` on a call-shape pattern silently skips the differently-formatted call sites — and a test that only exercises the matched ones passes green — 2026-07-10

| Field | Value |
|---|---|
| Surfaced by | `docs/threads/done/full/2026-07-10/2/REVIEW.md` (full-review iter-2, verify-high — runtime-reproduced) |
| Reviewer findings | verify-high iter-2 ISSUE-FOUND — M1 truncation-tracking wired into only 1 of 5 bounded streams; command-only eviction invisible to `getState().truncated` |
| Fix commit | 2.3.0 full-review hardening batch (see devlog `2026-07-07_2026-07-10.md` → "Iteration 2") |
| Test added | `tests/replay-truncation-guard.test.ts > "B: refuses a replayable bundle when only COMMANDS truncated (ticks intact)"` |
| Behavior delta | Before: a scenario whose `commandCapacity` exhausted before `tickCapacity` (>4 cmd/tick, or a low explicit `commandCapacity`) evicted commands but left `WorldHistoryState.truncated` unset, so `scenarioResultToBundle` shipped a payload-gapped bundle advertising full replayability; `openAt`'s tick-entry continuity guard passed (ticks intact) and it silently replayed WRONG state. After: all five `pushBounded(this.…)` record calls route through the `_truncated`-setting `_pushBounded`, so any stream eviction is caught and the adapter throws `history_truncated`. |

The trap: `replace_all` matches a literal substring. The pattern `pushBounded(this.` matched the ONE single-line call (`pushBounded(this.tickEntries, …)`) but not the four written as `pushBounded(\n      this.recordedCommandEntries, …)` — the newline+indent between `(` and `this.` breaks the match. The edit LOOKED complete (helper added, "all call sites" swept) and the suite stayed green because the only regression test exercised the tick-entry stream that DID get rewritten. Rules: after a structural `replace_all`, grep the negative (`grep 'pushBounded(this' ` vs a count of intended sites) to prove the match count equals the intended count; and when a fix claims to cover N cases (here: 5 bounded streams / two truncation vectors), the test must exercise EACH case, not just the representative one — a green suite over partial coverage is the exact shape of a fix that ships half-done. This is why the adversarial re-review (an independent agent that runtime-reproduced the uncovered vector) is load-bearing, not ceremony.

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
Pointer: docs/threads/done/counterfactual-replay/2026-04-29/design-2/ (verbose transcript was in tmp/, never committed). Filter pattern: `awk '/^codex$/{n=NR; buf=""} {buf=buf"\n"$0} /^tokens used$/{print buf; exit}' codex-raw.txt` extracts the final review block.

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
| Surfaced by | docs/threads/done/mandatory-loop-defaults/2026-07-08/1/REVIEW.md (Claude review of the 2.0.0 diff, verified by running the live tree's suite) |
| Reviewer findings | Claude iter-1 BLOCKER — `npm test` red (1305/1306) on the working tree while the drafted changelog claimed "gates green" |
| Fix commit | 6f823eb |
| Test added | tests/session-replayer.test.ts > "cross-major (a-component) engineVersion throws BundleVersionError" (fixture now derives via `crossMajorVersion()`) |
| Behavior delta | Before: the cross-major replay-guard test forged `engineVersion: '2.0.0'` as a literal (written when the runtime was 1.x). Bumping ENGINE_VERSION to 2.0.0 made the forged bundle SAME-major — the guard stopped throwing, the test failed, and the release would have shipped with a red suite and a changelog claiming green, because the full gates had been run BEFORE the version bump. After: the fixture derives from ENGINE_VERSION (`major + 1`), surviving every future major; the adjacent cross-minor test already used this pattern (`crossMinorVersion()`), so the convention existed and the literal was the outlier. |

Two rules. (1) A version bump is a code change: the full gate suite must run AFTER the last file of the change — including `package.json`/`version.ts` — not before; "gates were green when I ran them" is not "gates are green on the commit". (2) A test that means "a version RELATIVE to the runtime" (cross-major, cross-minor, stale-by-one) must derive that version from `ENGINE_VERSION`, never hardcode a literal that is only relative today — grep test fixtures for the current version string as part of any bump.

## 2026-07-10 — A version bump has more than one source of truth; pin the sync or a green suite hides the drift

| Field | Value |
|---|---|
| Surfaced by | docs/threads/done/browser-safe-entry/2026-07-10/1/REVIEW.md (docs-accuracy finder DOC-1, verified by running the built package: `import('civ-engine').then(m=>m.ENGINE_VERSION)` printed 2.1.0 while `npm ls` showed 2.2.0) |
| Reviewer findings | Fable 5 docs-accuracy DOC-1 HIGH — built 2.2.0 package reports ENGINE_VERSION 2.1.0; CONFIRMED by an independent verifier that also checked six prior release commits all kept the two in sync |
| Fix commit | (this task's landing commit) |
| Test added | tests/version-sync.test.ts > "matches package.json version" |
| Behavior delta | Before: the 2.2.0 bump edited package.json but not the hand-maintained `src/version.ts` literal (`ENGINE_VERSION`), and all 1328 tests passed because every test compared the constant against itself — nothing pinned it to package.json. A shipped 2.2.0 package would have stamped `metadata.engineVersion: '2.1.0'` into every recorded bundle (session-recorder.ts:148), scenario bundle (session-scenario-bundle.ts:78), and auto-filled run manifest (improvement-loop.ts:241), and the replayer's cross-version diagnostics (session-replayer.ts:458-479) would key off the wrong version — corrupting the fleet's cross-version finding-durability provenance (ADR 57) invisibly. After: `tests/version-sync.test.ts` asserts `ENGINE_VERSION === package.json.version`, so any future bump that touches one and not the other fails the suite loudly. |

The rule: when a fact is duplicated across two committed files by convention ("kept in sync by the release process"), a test comparing the value against itself is not a pin — add an explicit cross-file equality test, or the convention silently rots the first time someone edits one file and not the other. This is the sibling of the 2026-07-08 lesson (that one: derive relative-version fixtures from ENGINE_VERSION; this one: pin ENGINE_VERSION to package.json) — together they close both directions of version-literal drift. Grep for the old version string across the repo as part of any bump remains the cheap manual backstop.

## 2026-07-15 — Condensing prose REGENERATES claims: a name-level doc check cannot catch a sentence that became false

| Field | Value |
|---|---|
| Surfaced by | README landing-page restructure (2026-07-15); an in-process adversarial reviewer tasked specifically to refute the NEW prose against live source, after an automated check had already reported the rewrite clean |
| Reviewer findings | opus, theme "term-of-art regression": condensing the improvement-loop gate to "Terminal claims require replayable evidence by default" silently dropped `verified` from the claim. Second finding, theme "dropped qualifier": strict-mode's legacy-snapshot carve-out (`src/world.ts:199-202`) vanished from "On by default; `strict: false` opts out" |
| Fix commit | 00ee3b6 (README rows corrected; the identical understatement found and fixed in `src/improvement-loop-types.ts`'s shipped `.d.ts` docstring) |
| Test added | n/a (process-level) |
| Behavior delta | Before: an automated no-information-loss check (every identifier dropped from the old README must still exist in `api-reference.md` or `changelog.md`) passed with zero orphans, and all four gates were green — yet the rewritten text asserted that only the terminal `fixed`/`regressed` claims need evidence. `EVIDENCE_REQUIRED_STATUSES` is `{verified, fixed, regressed}` (`src/improvement-loop.ts:69-73`), and the source comment at `:64-65` defines "the terminal claims" as *specifically* `fixed`/`regressed` **in contrast to** `verified` — so the sentence used the repo's own vocabulary to exclude the status gated longest (since 2.0.0), i.e. it understated the loop's headline honesty invariant. A reader would conclude an `unverified`→`verified` claim needs no evidence; it throws (`tests/improvement-loop.test.ts:210-231`). After: all three statuses named explicitly in both the README and the `.d.ts` docstring that ships to consumer IDEs. |

The rule: a doc rewrite has two independent failure modes, and the cheap check only covers one. "Did I drop a name?" is mechanically checkable (set-diff the identifiers, require each dropped one to survive in an authoritative doc) and worth automating — it found a real `api-reference.md` gap here. "Is what I wrote still true?" is not: condensation *authors new sentences*, and a shorter sentence about a gated invariant is exactly where a qualifier silently dies. Every claim in the rewrite is new evidence-free prose regardless of how accurate the source paragraph was, so a summarization diff needs a reviewer reading the NEW text against live source, not against the old text. Highest-risk sentences are the ones using the codebase's own terms of art (`terminal`, `verified`, `strict`): a term-of-art word is load-bearing, and reusing it loosely reads as precise while meaning something narrower than the code.

## 2026-07-15 — `git add` aborts wholesale on one bad pathspec; the next `commit` then ships a message that lies about its contents

| Field | Value |
|---|---|
| Surfaced by | README restructure (2026-07-15) — post-commit `git show --stat` audit, after the commit had already been pushed to `main` |
| Reviewer findings | n/a (self-caught by verifying the pushed commit's contents rather than trusting the exit path) |
| Fix commit | 00ee3b6 (content landed as an honest follow-up; 48d3361 left in history — amending a pushed commit is a rewrite and was correctly denied) |
| Test added | n/a (process-level) |
| Behavior delta | Before: `git add <7 real files> <1 stale path>` was passed the pre-rename devlog filename that an earlier `git mv` had already staged. `git add` treats an unmatched pathspec as `fatal:` and stages **nothing** — but the index still held the `git mv` rename, so the very next `git commit` succeeded, produced a 0-insertion/0-deletion rename-only commit carrying a 40-line message describing the full restructure, and pushed it to `main`. Every content change sat unstaged and invisible in the "success" output. After: content committed in 00ee3b6 with a message stating what happened to 48d3361. |

The rule: `git add`'s failure is all-or-nothing, and a `git commit` that follows it does not fail — it commits whatever the index happened to hold, so a mid-sequence `fatal:` inside a chained command surfaces as a *successful* commit. Never infer staging from a command chain's exit status; run `git diff --cached --stat` and read it before committing, especially when a `git mv` has pre-staged part of the change (that's what makes the resulting commit non-empty and therefore silent). The `--stat` of the commit is the receipt: a "restructure" commit reporting `1 file changed, 0 insertions(+), 0 deletions(-)` is the tell. Corollary: verify a push landed the *contents*, not just that it exited 0 — and once pushed, prefer an honest follow-up commit over a history rewrite.

## 2026-07-15 — A doc-accuracy sweep scoped to API names is blind to PROCESS claims; those go stale from a policy commit, not a code change

| Field | Value |
|---|---|
| Surfaced by | The owner, reading the restructured README and asking why the status banner "still" said what it said — after the v2.4.1 doc sweep, my identifier/link verification, and an adversarial reviewer had all passed over it |
| Reviewer findings | n/a — three consecutive automated/adversarial passes missed it; a human reading the rendered page caught it |
| Fix commit | (this task's landing commit) — banner now describes the actual posture: adversarial review by default, multi-CLI escalation for high-risk work |
| Test added | n/a (process-level) |
| Behavior delta | Before: `README.md:5` told external consumers "Invariants are hardened through **mandatory** multi-CLI review". True when written (78bfd41, 2026-04-27, v0.8.3 — multi-CLI was then the blanket mandate), but falsified on 2026-06-30 by 89ccf75 ("default review to in-process Workflow; multi-CLI for high-risk") and again by ee88c6a's slimmed constitution. The README advertised a review guarantee the project had stopped making 15 days earlier — the strongest kind of claim to get wrong, since it is precisely what a prospective consumer weighs when deciding to trust an unvalidated engine. After: the banner states the real posture. |

The rule: docs drift along two axes, and this repo's tooling only watches one. AGENTS.md:51 defines the pre-ship sweep as "grep removed/renamed API names across `docs/`" — that catches *code* drift (a renamed export, a changed signature) and is why the README's ~180 identifiers were all still valid. It is structurally blind to *governance* drift: a sentence about how the project reviews, versions, tests, or releases itself goes stale when a **policy commit** lands, and no amount of grepping `src/` will surface it. So a change to AGENTS.md (or any constitution/process doc) is a doc-accuracy trigger for the shipped surface, exactly like a rename is — the sweep should also grep the shipped docs for process nouns (`mandatory`, `every commit`, `non-negotiable`, `always`, `never`) and re-verify each against the *current* constitution. Note the asymmetry that makes this dangerous: process claims are load-bearing for consumer trust but invisible to every code-anchored check, so they survive indefinitely until a human reads the page. Historical changelog/devlog entries are exempt (they are point-in-time records); the banner is not.

## 2026-07-15 — A doc sweep that greps names verifies the nouns, never the verbs: every false README claim used 100% valid identifiers

| Field | Value |
|---|---|
| Surfaced by | Owner-requested full README audit (2026-07-15), run as 4 reviewers with deliberately disjoint lenses (process/status, new-user reality, carried-over technical claims, editorial) |
| Reviewer findings | 5 provably-false technical claims, all in text carried verbatim across the v2.4.1 doc sweep AND the landing-page restructure. opus, theme "behavioral claim vs implementation": `Atomic Transactions … apply all-or-nothing` (false on the throw path — `command-transaction.ts:303-307` has no rollback, and `tests/command-transaction.test.ts:814` asserts partial state *in the engine's own suite*); `Generation counters — minimal change detection for diff/serialization` (wrong mechanism — `ComponentStore._generation` is read by no production code; `buildDiff` reads dirty sets, `world-tick.ts:301`); `Every core throw carries a stable code` (false for `WorldTickFailureError`, which `getErrorCode` returns null for **by design**, `engine-error.ts:127` — i.e. the error `step()` throws); `Fixed system pipeline` (there is a topological sort, `world-systems.ts:155`, which the README's own feature table advertises two sections earlier); banner `removals only as majors` (the repo's only major, 2.0.0, shipped zero removals — it was behavior flips) |
| Fix commit | 59b4a3a (all five, plus the identical `all-or-nothing` defect in `ARCHITECTURE.md:24`) |
| Test added | n/a (process-level) — but the audit's one mechanically-checkable gap DID get a test: `tests/version-sync.test.ts > README version badge sync`, sabotage-verified (badge→9.9.9 fails "expected '9.9.9' to be '2.4.1'") |
| Behavior delta | Before: `AGENTS.md:51` defines the pre-ship sweep as "grep removed/renamed API names across `docs/`", and by that standard the README was **clean** — an automated check confirmed all ~180 API-shaped identifiers resolved to real exports. Every one of the five false claims above passed it, because each is built entirely from *valid* names: `world.transaction()` exists, generation counters exist, core throws do carry codes, a system pipeline exists. The falsehood lives in the **predicate** — what the doc says those things *do*. After: all five corrected against live source, with the strongest one (`all-or-nothing`) contradicted by the repo's own passing test. |

The rule: a name-grep is a spell-checker for APIs. It answers "does this symbol exist?" and can never answer "is this sentence true?" — so the claims it certifies are exactly the ones that rot silently, because they look verified. The tell is that every false claim here was *once true or nearly true* and was falsified by an implementation detail (no rollback on throw), a deliberate exception (`WorldTickFailureError` is a wrapper), a later feature (the topological sort arrived after "fixed pipeline" was written), or a later release (2.0.0 broke by default-flip, not removal). None of those events renames anything, so none trip the sweep. Practical consequence: verbs need a reader, not a grep — when auditing docs, sample the *assertions* and trace each to the code path it describes, and treat "carried over verbatim, still compiles, names all valid" as UNVERIFIED rather than safe. Sibling of the same-day process-claims lesson (that one: policy commits falsify process claims); the shared root is that this repo's only doc gate is anchored to identifiers, and both claim classes live outside it. Cheapest partial defense: when a doc sentence describes a guarantee, grep the test suite for a test that would fail if the guarantee broke — for `all-or-nothing` that test existed and asserted the opposite.
