You are reviewing the civ-engine codebase. Repository at the current working directory.

## Context: this is iteration 8 — verify iter-7's fixes

Iter-7 (`docs/reviews/full/2026-04-26/7/REVIEW.md`) was the first broader sweep beyond the iter-1–6 `CommandTransaction` chain. Codex+Opus found 7 real issues (1 High, 3 Medium, 3 Low); Gemini was quota-exhausted (5th iter in a row, may still be exhausted now).

Commit `4ef1708` (v0.7.5) shipped all 7 fixes:

- **H1:** `World.deserialize` now validates every entity-id key in `snapshot.components[*]`, `snapshot.resources.{pools,production,consumption}[*]`, and `snapshot.resources.transfers[*].{from,to}` against (i) non-negative integer, (ii) alive in the resolved entity-manager — using a shared `assertEntityIdAlive` closure. Throws on violation.
- **M1:** `EventBus.emit` now deep-clones `data` once for the buffer and once per listener. Listeners can no longer corrupt buffered history or each other's view of the payload.
- **M2:** `ClientAdapter.handleMessage` now gates `clientCommandIds.set(result.sequence, id)` on `safeSend`'s boolean return. No more leaked / cross-session mappings on transport failure.
- **M3:** `docs/api-reference.md` — `(snapshot v4)` → `(snapshot v5)` at two call-sites.
- **L1:** `octaveNoise2D` validates `octaves >= 1` integer, `persistence >= 0` finite, `lacunarity > 0` finite. Throws `RangeError` on bad inputs. `api-reference.md` updated with constraint table.
- **L2:** `ComponentStore` semantic-mode `set` now `dirtySet.delete` + `removedSet.delete` on revert-to-baseline.
- **L3:** `World.deserialize`'s `snapshot.tick` validation hoisted to the top of the method.

**Current HEAD:** `4ef1708` (v0.7.5). 627 tests pass. typecheck/lint/build clean.

## Your job

1. **Verify each iter-7 fix landed correctly.** Specifically:
   - **H1 verification**: `assertEntityIdAlive` closure should cover every entity-keyed record path. Are there any other code paths in `deserialize` (or downstream of it) that consume entity IDs from the snapshot without validation? Are the error messages descriptive enough to debug a corrupt snapshot? Does the validation order match the documented load order?
   - **M1 verification**: `EventBus.emit` clones for buffer + per-listener. Is there a path where the original `data` reference is still observable to engine internals? Is the cost (N+1 clones) the right tradeoff or did we over-defend? Does `getEvents()` still need its read-time clone now that the buffer is already isolated?
   - **M2 verification**: `safeSend` return wired correctly through `handleMessage`. Are there other call sites of `safeSend` that ignore the return value (e.g. in tick / diff / event dispatch loops) where a similar bug pattern exists?
   - **L1 verification**: parameter checks at the top of `octaveNoise2D`. Is the check itself complete? Edge cases: `Number.MAX_SAFE_INTEGER` octaves, denormal persistence, etc.
   - **L2 verification**: revert-to-baseline now clears dirty/removed. Is it correct under repeated revert-to-baseline operations within the same tick? Does the `clearDirty` path still re-baseline correctly?
   - **L3 verification**: tick validation hoisted. Is the new order safe — does anything earlier in `deserialize` (the `version` check, the `componentOptions` defaulting, the `new World(...)` constructor) have side effects we want to avoid on bad-tick input?

2. **Look for iter-7 regressions.** Did any of the 7 fixes introduce a new bug?
   - Did the new validation in deserialize break any backward-compat snapshot path (v1, v2, v3, v4)?
   - Did the EventBus clone-per-listener change observable timing or ordering for downstream subsystems (ClientAdapter, render-adapter, world-debugger)?
   - Did the noise validation tighten enough to break legitimate map-gen calls?

3. **Final sweep for new findings outside the iter-7 scope.** Iter-7 was a broader sweep; iter-8 is verification. If you find something new, flag it — but **only if it is real and important.** No nitpicks.

## Convergence expectation

Iter-1–6 closed the C1 atomicity chain. Iter-7 closed 7 real findings on the broader engine surface. **Iter-8 is a convergence check.** If clean, write "None observed." everywhere.

## Project context

- `AGENTS.md`, `CLAUDE.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/devlog/detailed/2026-04-26_2026-04-26.md` (iter-7 entry at the bottom)
- `docs/changelog.md` (v0.7.5 entry)
- `docs/reviews/full/2026-04-26/7/REVIEW.md`

## Output format

```
# Review Summary
<2-3 sentences>

# Iter-7 Fix Verification
<one bullet per H1/M1/M2/M3/L1/L2/L3 — verified or regressed>

# Critical / High / Medium / Low
<one section per severity; "None observed." if clean>

# Notes & Open Questions
<open questions only>
```

## Rules
- **No nitpicks.** Convergence check.
- Be specific: file:line, exact symbol, exact bug.
- Do NOT modify files.
- Do NOT re-flag deferred items from iter-1–6 unless they regressed.
