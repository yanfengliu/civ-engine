You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is iteration 2 (fix verification + fresh review)

Iteration 1 happened on 2026-04-26 against `main` at `d7f9511`. It produced 1 Critical + 4 High + 5 Medium + 7 Low + 3 Notes findings. The team has since landed 5 commits on branch `agent/full-review-2026-04-26-iter1` (HEAD: `5b7b3d0`):

| Commit | Version | Closes |
|---|---|---|
| `31438a5` | v0.6.0 (breaking) | C1, H1, H3, M1, L2, L6 — `CommandTransaction` overhaul |
| `87a1593` | v0.6.1 | H2, H4, M4, M5, L5 — `Layer<T>` overhaul |
| `4ae0e44` | v0.6.2 | M2 — `World.deserialize` tick validation |
| `f1cb3e9` | v0.6.3 | L1, L4, L7 — runTick polish + doc + tick saturation guard |
| `5b7b3d0` | v0.6.4 | M3 partial — extracted standalone helpers from `world.ts` |

The summary report from iteration 1 is at:
- `docs/reviews/full/2026-04-26/1/REVIEW.md`

Read it first. Your job in this iteration has two parts:

1. **Regression / fix-quality check.** For each iter-1 finding (C1, H1, H2, H3, H4, M1, M2, M4, M5, L1, L2, L4, L5, L6, L7), spot-check that the implemented fix is correct, complete, and didn't introduce a new bug. Call out any iter-1 finding that is:
   - not actually fixed
   - fixed but with a regression in adjacent behavior
   - fixed in a way that is internally inconsistent with the rest of the codebase
   - "fixed" but in a form that creates a worse footgun than the original
   Reference the iter-1 ID (e.g. C1, H3, M2) when you flag this. **Pay special attention to:**
   - C1: the new `ReadOnlyTransactionWorld` Proxy in `command-transaction.ts:71-141`. Verify (a) the type-level `Omit` covers all true write methods on `World`, (b) the runtime `FORBIDDEN_IN_PRECONDITION` set covers all true write methods, (c) the Proxy's `get` trap correctly binds bound methods, (d) the new `TransactionPrecondition` signature compiles for callers using read methods.
   - H1: typed-generics threading through `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>`. Verify the typed/loose overload pattern matches `World`'s exactly and that `world.transaction()` passes `this` without an `as unknown as` cast.
   - H2: strip-at-write in `Layer.setCell`/`setAt`/`fill` (`layer.ts:71-130`). Verify (a) `matchesDefault` is correct for both primitive and object T, (b) the `cells.delete` path leaves `getState` consistent with a `setCell(non-default)` followed by `setCell(default)`, (c) the existing serialization test `getState only includes cells that differ from defaultValue` still pins the right behaviour.
   - H4: primitive fast-path. Verify the `_isPrimitive` cache covers `null`/`number`/`string`/`boolean` exactly (no false positives for `undefined`, no false negatives for boxed primitives), and that every read/write boundary correctly skips `structuredClone` only when `_isPrimitive` is true.
   - M2: deserialize validates `Number.isSafeInteger(snapshot.tick) && snapshot.tick >= 0` before `setTick`. Verify it rejects `NaN`, `-1`, `3.14`, `Infinity`, `MAX_SAFE_INTEGER + 1`, and that the error message is descriptive.
   - L1: hoisted tick capture. Verify there is exactly one `const tick = ...` declaration in `runTick`, and that both the in-try failure paths and the listener-failure path use it.
   - M3 (partial): `world.ts` is now 2232 LOC (down from 2481), `world-internal.ts` is 262 LOC. Verify (a) every extracted helper is genuinely standalone (not referencing private `World` state via `this`), (b) the import list is complete, (c) `topologicalSort` correctly stayed in `world.ts` because of its dependency on the internal `RegisteredSystem` interface. **Do not re-flag the remaining LOC overage on `world.ts` (2232) / `occupancy-grid.ts` (1602) / `world-debugger.ts` (509) as new findings — these are explicitly deferred to a dedicated refactor branch and acknowledged in the changelog. If the partial extraction itself is broken, flag that. If the deferral makes you uncomfortable, write it under "Notes & Open Questions" not under a severity bucket.**

2. **Fresh review.** Independently re-review the current state of `src/` for any **new** issues introduced by the 5 fix commits — design flaws, bugs, edge-case failures, footguns, performance traps, broken invariants, doc drift. The diff is substantial (~600 lines across `command-transaction.ts`, `layer.ts`, `world.ts`, `game-loop.ts`, plus a brand-new `world-internal.ts`); new bugs are possible.

## Project context (read for grounding before reviewing)
- `AGENTS.md` and `CLAUDE.md` (root) — project rules. Note the LOC cap was tightened to 500 in `d7f9511`.
- `docs/architecture/ARCHITECTURE.md` — boundaries, data flow, decisions
- `docs/devlog/summary.md` and `docs/devlog/detailed/2026-04-26_2026-04-26.md` — five new entries describe the fixes
- `docs/changelog.md` — entries for v0.6.0 / v0.6.1 / v0.6.2 / v0.6.3 / v0.6.4
- `docs/reviews/full/2026-04-26/1/REVIEW.md` — iter-1 findings to verify

## About the project
- TypeScript / Node.js general-purpose 2D grid-based game engine (NOT a game)
- AI-native: built to be operated by AI agents, not humans
- Strict ECS; World is the only public entry point; no rendering, no UI
- Tested with Vitest; lint with ESLint flat config; strict TypeScript
- Currently v0.6.4 with `ReadOnlyTransactionWorld` proxy on transaction preconditions, fully-threaded `CommandTransaction` generics, `Layer<T>` strip-at-write + primitive fast-path, `world-internal.ts` extraction

## Scope (in priority order)
- `src/command-transaction.ts` — the new `ReadOnlyTransactionWorld` proxy is the highest-risk change
- `src/layer.ts` — strip-at-write + primitive fast-path are intricate
- `src/world.ts` — verify `transaction()`, `runTick` tick capture, `deserialize` validation, public `warnIfPoisoned`, helper-extraction imports
- `src/world-internal.ts` (NEW) — verify completeness of extracted helpers
- `src/game-loop.ts` — verify the MAX_SAFE_INTEGER guard does not regress existing tick semantics
- `tests/command-transaction.test.ts`, `tests/layer.test.ts`, `tests/serializer.test.ts`, `tests/game-loop.test.ts` — verify the new regression tests are sound and pin the right behaviour
- `docs/architecture/ARCHITECTURE.md`, `docs/api-reference.md` — verify they match the new behaviour

## What we specifically want flagged
1. **Regression of an iter-1 fix.** "C1's Proxy still allows writes via X" — that kind of thing.
2. **Bugs in the new code.** Wrong defaults, off-by-one, edge-case failures, type-cast holes, dead-code paths, missing invariants.
3. **Doc drift introduced by this iteration.** Did the changelog / ARCHITECTURE / api-reference catch every behavior change?
4. **Test coverage gaps.** Did the iter-1 fixes add tests for every claimed behavior change? Did any pre-existing test become stale or wrong-headed because of the fix?
5. **Public API ergonomics.** Did the new `ReadOnlyTransactionWorld` type, `forEachReadOnly`, `clear`/`clearAt`, etc. land cleanly?

## Output format

Return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<3-5 sentence high-level take: did the iter-1 fixes hold up? overall code quality now? biggest remaining risks?>

# Iter-1 Regressions
<findings of the form: "iter-1 finding X was fixed in commit Y, but the fix is wrong/incomplete because Z". Use the iter-1 finding ID. If no regressions, write "None observed.">

# Critical
<NEW findings that should block release / could cause data loss / break determinism>

# High
<NEW findings that are clearly wrong or significant design issues>

# Medium
<NEW real issues but lower urgency>

# Low / Polish
<NEW nits, style, small ergonomics>

# Notes & Open Questions
<anything you weren't sure about, or that needs user clarification — e.g. the deferred world.ts deeper split>
```

Each finding under any section MUST follow this format:
```
### <short title>
- **File**: `src/foo.ts:123-145` (or range)
- **Problem**: <what is wrong, concretely>
- **Why it matters**: <impact in 1 sentence>
- **Suggested fix**: <concrete recommendation, may include code sketch>
```

For Iter-1 Regressions, also include `- **Iter-1 ID**: C1 / H3 / M7 / etc.` as the first bullet.

## Rules
- Be specific. Always cite file paths and line ranges. No vague advice.
- Be honest. **Quality > quantity. If there are no issues at a severity, write "None observed."** Do not pad the report with nits to look thorough.
- Do NOT modify any files. This is a read-only review.
- Do NOT re-flag iter-1 findings that have been correctly fixed. Only mention them under "Iter-1 Regressions" if the fix is broken.
- Do NOT re-flag the remaining LOC overage on `world.ts` / `occupancy-grid.ts` — explicitly deferred. Note that under Notes if you want.
- Skip generic advice ("add more tests", "improve docs") unless tied to a specific finding with file:line.
- If you are uncertain whether something is a bug vs. intended, list it under "Notes & Open Questions" with the file:line.
