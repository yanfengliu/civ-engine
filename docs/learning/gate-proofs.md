# Gate proofs

The standing answer to "did the gates actually do their job".


## If a gate here is wrong

A gate and the claim in its header can be wrong together, and when they are they look exactly like a gate that is right: retiring 356 lessons across this fleet found 43 that named a defect their own named test did not catch. Auditing one means reaching what was actually believed, measured, and abandoned — never the sentence the gate carries about itself, which is the same self-agreement these gates exist to catch.

That evidence was deleted in the retirement commits, not lost. This repo's evidence file as it stood immediately before, all 15 entries with their anchors:

    git show 0fe2a76:docs/learning/lessons-evidence.md

`git log -- docs/learning/lessons-evidence.md` lists every earlier revision, and `git log -S'<phrase from the gate header>' -- docs/learning/` finds the entry a particular gate came from.


Every lesson this repo retired from `lessons.md` is listed here with the gate that replaced it and the exact product-code mutation that was made to prove the gate goes red. A gate that has never been made to fail is a claim, not a gate — the canon says so, and this file is where the claim is cashed.

Every mutation below was applied to product code, run, observed red, reverted with `git checkout --`, and re-run green. Baseline before the campaign: `npm run gates` green, all eleven steps (2026-09-02), so no red below is inherited.

This file stays after the prose is deleted. It is the receipt.

---

## A new method on an exported class is additive PUBLIC SURFACE (minor), even when intended internal — and the name-level surface fixture won't catch it

- **Gate:** `tests/public-surface-members.test.ts` :: `public surface pin (members) > members of every exported class, interface and object type match the committed allowlist` — run by `npm test`, so by `npm run gates` and CI. Backed by `scripts/public-surface-members.mjs` and `tests/fixtures/public-surface-members.json` (243 declarations).
- **Mutation:** re-added the reverted `SpatialGrid.getAtRaw` to `src/spatial-grid.ts` — the exact method full-review 2026-06-13 iter-4 caught one review before a `1.1.3` patch release.
- **Red:** `AssertionError: public surface of "SpatialGrid" changed. A member added to an exported declaration is additive public surface (minor), even when intended internal.` with `+ "getAtRaw"` in the diff.
- **The false green this closes:** the pre-existing `tests/public-surface.test.ts` passed 3/3 on that same mutation. Its own header documented the gap as deferred to "a d.ts diff review step at the freeze", and it was never closed.
- **Horizon checked (and fixed):** the first draft scanned only each declaration's own members, so `World` reported 3 members instead of 171 — everything else lives on the unexported `WorldCore` base. A method added to a base class would have been public surface and invisible. Members are now resolved through `extends`. Second mutation: added `peekEntityCountRaw()` to `src/world-core.ts` → red naming `World` and `+ "peekEntityCountRaw"`, while `tests/public-surface.test.ts` again stayed green.
- **Stated limit:** signatures, parameter and return types are not pinned here (typecheck, the consumer back-compat fixture, and api-reference review own those). `implements` clauses are not followed. `@internal` members ARE counted, because `tsconfig.build.json` sets no `stripInternal`, so they ship in the published `.d.ts`.
- **Green after revert:** yes.

## For an "additive, non-breaking" engine change, the symlinked-consumer typecheck is the back-compat proof — not the engine's own gates

- **Gate:** `tests/consumer-back-compat.test.ts` :: the compile-only `_consumerSlots()` block — enforced by `npm run typecheck`, not by `npm test` (vitest does not typecheck). The runtime `it` in the same file is the control that the calls actually execute.
- **Mutation:** re-parameterized `SessionRecorder.toBundle()` in `src/session-recorder.ts` from `SessionBundle` to `SessionBundle<TEventMap, TCommandMap, TDebug>` with the sink cast — the over-reach reverted in 44dbde5 before push.
- **Red:** `tests/consumer-back-compat.test.ts(107,9): error TS2322: Type 'SessionBundle<GameEvents, GameCommands, JsonValue>' is not assignable to type 'SessionBundle<Record<string, never>, Record<string, never>, JsonValue>'.` plus the same at line 169.
- **The measurement that makes this worth having:** with that break in the tree, **`npm test` passed 1354/1354**, including the existing `tests/session-generics.test.ts`. Only typecheck saw it, and only at the consumer-shaped slots this file adds — no engine code holds engine output in a default-generic slot.
- **Stated limit:** this pins assignability into the slots downstream repos actually hold. It is not a substitute for the real cross-repo typecheck on a large surface change; it is the cheap standing gate for the common variance break.
- **Green after revert:** yes.

## A version bump has more than one source of truth; pin the sync or a green suite hides the drift

- **Gate:** `tests/version-sync.test.ts` :: `ENGINE_VERSION sync`, `README version badge sync`, `lockfile version sync`, `changelog version sync` — run by `npm test`.
- **Horizon found and closed:** the pre-existing gate covered three of six committed copies. `docs/learning/defect-register.md` records the other three going stale — the lockfiles sat at `1.4.0` (root) and `1.2.0` (mcp's `..` entry) against an actual `2.4.1` for roughly ten releases, found only during the 47-day CI outage postmortem, and it notes that `npm ci` does not check that field, so nothing else ever would.
- **Mutations, each red on its own:**
  - `src/version.ts` `ENGINE_VERSION` → `'2.3.0'` (the original 2.2.0 defect) → `expected '2.3.0' to be '2.4.1'`.
  - `package-lock.json` both `version` fields → `1.4.0` (the exact recorded drift) → `package-lock.json top-level version: expected '1.4.0' to be '2.4.1'`.
  - `mcp/package-lock.json` `packages[".."].version` → `1.2.0` (the exact recorded drift) → `mcp/package-lock.json packages[".."].version: expected '1.2.0' to be '2.4.1'`.
  - `docs/changelog.md` newest heading → `## 2.4.0` → `expected '2.4.0' to be '2.4.1'`.
- **Green after revert:** yes.

## Run the gates AFTER the version bump; never hardcode a version literal a test means relatively

- **Gate:** `tests/version-sync.test.ts` :: `no test hardcodes the current runtime version > every version literal in tests/ is either historical or derived` — run by `npm test`.
- **Mutation:** replaced `crossMajorVersion()` with the literal `'2.4.1'` at `tests/session-replayer.test.ts:207`, which is the shape the original defect had (a forged `'2.0.0'` written when the runtime was 1.x, made same-major by the bump, silencing the guard).
- **Red:** `A test hardcodes the version the runtime now has ("2.4.1"). If it means a version RELATIVE to ENGINE_VERSION (cross-major, cross-minor, stale-by-one), derive it …` naming `tests/session-replayer.test.ts:207` and its text.
- **Why it is scoped to the current version:** so it has no exemption list to rot. Historical literals (`'0.7.7'` legacy bundles, `'0.8.17'` benchmark baselines) are absolute by intent. The check fires at exactly the moment a "relative today" literal becomes wrong: the bump — which is also what makes the sibling rule ("a version bump is a code change; run the gates after the last file of it") bite.
- **Control:** the scan asserts it visited more than 50 test files, so an empty offender list cannot come from a walk that found nothing.
- **Green after revert:** yes.

## Condensing prose REGENERATES claims: a name-level doc check cannot catch a sentence that became false · A doc-accuracy sweep scoped to API names is blind to PROCESS claims · A doc sweep that greps names verifies the nouns, never the verbs · Fan-out audits miss cross-surface duplication

Four lessons, one gate. They are the same defect seen from four angles: the repo's only doc check was anchored to identifiers, and every claim class that matters lives outside it.

- **Gate:** `tests/doc-claims.test.ts` + `tests/fixtures/doc-claims.json` — 8 pinned claims over 14 surfaces, 24 assertions, run by `npm test`. Each claim is checked twice, and the two checks fail for opposite reasons: the **quote** must appear verbatim in every surface listed (the doc changed), and the **predicate** must hold against live code, config, or the constitution (the world changed).
- **Mutations, each red on its own:**
  - *Condensation (regenerated claim).* Rewrote README's evidence sentence to "Terminal claims (`fixed`, `regressed`) require …" — the exact understatement that shipped, dropping `verified`. → `The pinned claim "evidence-required-statuses" is no longer in README.md verbatim.`
  - *The verb, not the noun.* Dropped `'verified'` from `EVIDENCE_REQUIRED_STATUSES` in `src/improvement-loop.ts` while leaving the README correct. → `an evidence-free "verified" claim must be refused by default: expected [Function] to throw an error`.
  - *Cross-surface duplication.* Changed the tick-lifecycle line in 1 of the 5 surfaces that carry it. → red naming `docs/guides/systems-and-simulation.md` specifically.
  - *The behaviour behind that fact.* Moved `gameLoop.advance()` after the diff-listener loop in `src/world-tick.ts`. → `listeners must observe world.tick === diff.tick (increment THEN notify): expected +0 to be 1`.
  - *Dropped qualifier.* Removed the `version <= 5 && strict === undefined` legacy carve-out from `src/world.ts`. → `a legacy snapshot with no 'strict' key must not be promoted to strict: expected true to be false`.
  - *Behavioural claim vs implementation.* Gave `CommandTransaction.commit()` a real rollback on the throw path in `src/command-transaction.ts`, falsifying the docs' "leaves partial state" parenthetical. → `the earlier buffered mutation must have been applied … expected { hp: 1 } to deeply equal { hp: 2 }`.
  - *Config drift under a process claim.* `engines.node` → `>=22` while the README says 20+. → `README promises Node 20+; package.json must agree: expected '>=22' to be '>=20'`.
  - *Policy commit falsifies a process claim.* Replaced AGENTS.md's "High-risk work … escalates to the multi-cli-review skill" with an in-process rule. → `README says high-risk work escalates to multi-CLI review; AGENTS.md must still route it there`.
  - *An unpinned absolutist claim.* Added "Every change is hardened through mandatory multi-CLI review before it ships." to README.md — the literal sentence that was false for 15 days. → red naming `README.md:19` and the line.
- **A wrong gate caught by a control, recorded because it is the whole point of §11:** the `review-posture` predicate first asserted only that AGENTS.md `toContain('multi-cli-review')`. Deleting the high-risk escalation rule left it **green**, because the string still appears in the unrelated "reviewer model pins live in multi-cli-review.md" line. The anchor now binds both halves of the claim: `/High-risk work[^\n]*multi-cli-review/`.
- **A vacuous predicate caught by a control:** the `evidence-required-statuses` predicate first built a schema-invalid finding, so every status threw `improvement finding severity is not supported` — the wrong reason. It would have passed with the evidence gate deleted. It now asserts an accepted fixture first, then asserts the failure *reason* matches `/replayable evidence|verificationMethod/`.
- **Horizon guards in the gate itself:** the fixture and the predicate table must have identical key sets (so a claim cannot be dropped from one half), and the README may contain no absolutist process vocabulary outside a pinned quote (so an unpinned claim cannot be added).
- **Green after revert:** yes, all nine.

## A `replace_all` on a call-shape pattern silently skips the differently-formatted call sites — and a test that only exercises the matched ones passes green

- **Gate:** `tests/bounded-stream-truncation.test.ts` :: `bounded-stream truncation tracking > every bounded stream routes through the flag-setting helper` and `> no bounded stream is pushed to directly`, plus three per-axis behavioural cases — run by `npm test`.
- **The false green, measured 2026-09-02:** routing `recordExecution` around `this._pushBounded` — the same defect the lesson is about, at a different call site — left the lesson's own named anchor `tests/replay-truncation-guard.test.ts` green at 5/5 and **the whole suite green at 1382/1382**. That test asserts one shared `truncated` flag, which any one of the three `commandCapacity`-bounded streams satisfies on its own.
- **Mutation, run at all five call sites:** replaced `this._pushBounded(` with the bare `pushBounded(` in `recordTick`, `recordCommand`, `recordExecution`, `recordCommandPayload`, and `recordFailure` in `src/history-recorder.ts`, one at a time.
- **Red:** the new gate failed on **5 of 5**. The pre-existing guard failed on **1 of 5** (`recordTick` only). Message: `A bounded-stream push bypasses 'this._pushBounded', so eviction on that stream will not set 'truncated'. The bundle then advertises full replayability over a gapped body and replays WRONG state silently.`
- **Why structural:** three of the five streams share one capacity and one flag, so no behavioural assertion can isolate them. The AST check has no such horizon — it pins the *set* of bounded streams by name, so a bypassed, renamed, or newly added stream all fail. This is the lesson's own rule ("prove the match count equals the intended count") made mechanical.
- **Behavioural coverage added on the axes that can be isolated:** tick-entry eviction; command eviction with payload capture off (isolating the submission/execution streams from the payload stream the original fix DID rewrite); and failure-stream eviction alone, which reaches `failureEntries` with `tickEntries` at zero — a stream no existing test touched at all.
- **Control:** the AST walk asserts it found at least one routed call, so an empty violation list cannot come from a walk that matched nothing.
- **Green after revert:** yes.

## Migrating a derived rule: sweep pure-data twins, cross-package consumers, AND the failure write-path — not just the engine's own `src/`

Verified as an existing gate (bucket G), not rewritten. The lesson names four sweep targets; each was mutated separately and each went red.

- **Gate:** `tests/session-recorder.test.ts` :: `live toBundle() after a TickFailure extends endTick to the failed tick (openAt → replay_across_failure, not too_high)`; `tests/snapshot-at-tick.test.ts` :: `tolerates a legacy bundle whose endTick understates persistedEndTick`; `mcp/tests/server.test.ts` :: `corpus_query.entrySummary reports the recovered effectiveUpperBound, not the raw endTick:0` and `bundle_snapshots reports the recovered effectiveUpperBound consistent with its snapshot ticks`. Run by `npm test` and by the `test (mcp)` gate step.
- **Mutations and results:**
  - *Failure write-path, FileSink.* Removed `this._advanceEndTick(failure.tick)` from `src/session-file-sink.ts` `writeTickFailure` → red (1 failure).
  - *Failure write-path, MemorySink.* Same removal in `src/session-sink.ts` → red (2 failures). Both implementations are covered; a per-implementation horizon was the plausible gap and it is not there.
  - *Pure-data twin.* `snapshotAtTick`'s bound in `src/session-bundle-diff.ts` from `replayableUpperBound(md)` to `md.endTick` → red: `tolerates a legacy bundle whose endTick understates persistedEndTick`.
  - *Cross-package consumer, view layer.* `mcp/src/views.ts` `effectiveUpperBound` re-encoded as `entry.metadata.endTick` → red in mcp's suite.
  - *Cross-package consumer, tool handler.* `mcp/src/server.ts` `upper` re-encoded as `bundle.metadata.endTick` → red in mcp's suite.
  - *Every lockfile after a bump* — the fourth target — was NOT gated and now is; see the version-sync entry above.
- **Green after revert:** yes, all five.

---

## The pairing gate itself

`npm run lessons:check` was in `package.json` and in no gate and no CI step — not among `scripts/gates.mjs`'s eleven, not in `.github/workflows/ci.yml`. A check nobody runs enforces nothing.

`scripts/check-lessons.mjs` is now a module asserted by `tests/lessons-pairing.test.ts`, which `npm test` runs, so it is inside `npm run gates` and inside CI. Its parsers are proved against inline fixtures rather than the live files, because the live files are a queue whose correct steady state is empty: a check that only reads them goes silently vacuous the moment they are emptied, which is indistinguishable from a parser that stopped finding anything.

Its non-vacuity checks ("lists no rules", "holds no entries") were removed — they made emptying the queue a failure, which is the opposite of what the canon asks. What binds instead: a HALF-emptied queue fails in both directions (a lesson deleted without its gate, or a gate landed without deleting its prose), and every rule must name the gate it is waiting for, per "an entry that can name no gate is not a lesson".
