# Spec 8 (Behavioral Metrics) Code Review iter-1: Convergent

**Iter:** 1. **Subject:** Spec 8 implementation diff (~1400 lines staged). **Reviewers:** Codex 1 HIGH + 2 MED + 1 LOW; Opus ACCEPT + 5 NIT.

## Codex HIGH — Metric erases corpus type

`Metric.observe` was hardcoded to `SessionBundle` (default generics), so `runMetrics<TEventMap, TCommandMap, TDebug>` generics didn't flow into custom-metric authoring. User metrics inspecting typed `commands[].data` or `ticks[].events[].data` got `Record<string, never>` — required unsafe casts.

**Fix (v2):** extended `Metric<TState, TResult, TEventMap, TCommandMap, TDebug>` with the same defaults as `SessionBundle`. Custom metrics declaring `Metric<TState, TResult, MyEvents, MyCommands>` now see typed bundle fields. Added regression test (`typed-bundle user metric`) using `factionSpawnRatio` over `MyCommands.spawn.faction: 'red' | 'blue'` discriminated payload.

## Codex MED — commandTypeCounts/eventTypeCounts not serialization-stable

Map iteration order = insertion order. Same counts in different bundle orders → different JSON-string output → baseline-file churn.

**Fix (v2):** added `sortedRecordFromMap` helper; both finalize functions now sort keys alphabetically. Added `JSON-key sorting` test verifying `JSON.stringify` equality across reversed corpora.

## Codex MED — Guide snippets missing imports

`docs/guides/synthetic-playtest.md` example used `SessionBundle` and `runSynthPlaytest` without imports. `docs/guides/ai-integration.md` used `fs.readFileSync` without `import * as fs`.

**Fix (v2):** added missing imports to both guides.

## Codex LOW — Changelog process commentary

`docs/changelog.md` 0.8.2 entry mentioned "direct-to-main commit policy" (internal process, devlog-only).

**Fix (v2):** removed the sentence; changelog focuses on user-facing surface.

## Opus 5 NITs (deferred)

- N1 (order-insensitivity test weak): empty commands/events make most metrics trivially-equal. The new `JSON-key sorting` test (above) covers the meaningful case.
- N2 (-Infinity arm uncovered): added `nonzero/0 → -Infinity` test in `compareMetricsResults pctChange edge cases`.
- N3 (Stats compare not directly tested): nested-record + numeric tests cover the same `compareValue` path.
- N4 (`as never` in fixtures): acceptable for v1.
- N5 (`String(ev.type)` per-call optimization): not measurable.

## Verification

- 4 engine gates clean: 845 passed + 2 todo (was 842; +3 from typed-bundle test, sorted-keys test, -Infinity test).
- All Codex HIGH/MED/LOW addressed.
- Opus N2 addressed (negative-baseline test added).
- Other Opus NITs deferred or addressed indirectly.

## Verdict

ACCEPT (post-v2). All real findings closed.
