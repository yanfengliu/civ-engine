# T2 Code Review iter-1: Findings + v2 fixes

**Iter:** 1. **Subject:** T2 diff (~1100 lines staged). **Reviewers:** Codex (1 HIGH + 3 MED), Opus (2 HIGH + 1 LOW + 3 NIT).

## Convergent findings

### HIGH (both): docs drift on api-reference + guide examples

- `docs/api-reference.md` SessionMetadata section showed old union `'session' | 'scenario'` and missed `policySeed?`.
- `docs/api-reference.md` SessionRecorderConfig section missed new `sourceKind?` + `policySeed?` fields.
- `docs/guides/synthetic-playtest.md` quickstart declared `Cmds { spawn: { x, y } }` but later examples used `move` (undeclared) and `spawn { parent }` (wrong shape). Non-typecheck.

**Fix (v2):** Updated both api-reference sections to include the widened union and new fields. Extended `Cmds` to include `move`. Rewrote `memoryPolicy` example to emit a structurally-correct `spawn` payload.

### HIGH/MED (both): missing sinkError tests

Plan v7 prescribed verbatim tests for connect-time sink failure (re-throw) and mid-tick sink failure (`stopReason: 'sinkError'`); only one (poisoned-world-at-start, which exercises a different code path) was implemented in iter-1.

**Fix (v2):** Added two tests using `class FailingSink extends MemorySink` and `class FailAfterFirstSnapshot extends MemorySink`:
- Connect-time: harness re-throws on `recorder.lastError` after `connect()` returns.
- Mid-tick: post-step `recorder.lastError` check fires after periodic snapshot fails.

## Codex MED — world.rng mutated even when call rejected for poisoned world

`runSynthPlaytest` derives default seed via `world.random()` BEFORE `recorder.connect()`'s poisoned-world guard runs. A failed call advances world.rng once.

**Fix (v2):** Pre-check `world.isPoisoned()` at the start of `runSynthPlaytest` validation. Throw `RecorderClosedError({ code: 'world_poisoned' })` directly, matching the recorder's later guard. Test asserts the next world.random() value is the deterministic next-in-sequence (not skipped).

## Codex MED / Opus LOW — `ok` semantics on disconnect-time sink failures

Docs/changelog said `ok` maps 1:1 to `stopReason`, but impl uses `ok = stopReason !== 'sinkError' && recorder.lastError === null`, so a disconnect-time terminal-snapshot failure flips `ok:false` while `stopReason` stays e.g. `'maxTicks'`.

**Fix (v2):** Added explicit "Edge case" note in api-reference section + Failure Mode table in guide. CI guards should check `result.ok`, not just `stopReason !== 'sinkError'`.

## Opus NIT — `TDebug` generic non-functional

`runSynthPlaytest` exposed `TDebug = JsonValue` but `SynthPlaytestConfig` had no `debug?` field. Recorder's `_debugCapture` was always `undefined`. Type-level decoration only.

**Fix (v2):** Dropped `TDebug` from `runSynthPlaytest` signature and `SynthPlaytestResult` defaults to `Record<string, never>`-equivalent via `JsonValue` default. Cleaner public surface.

## Other Opus NITs (deferred — non-blocking)

- N-3 (api-reference signature lacks generic constraints): cosmetic; signatures in code authoritative.
- N-4 (guide `setup()` registers handler before component): order doesn't matter at runtime; cosmetic.

## Verdict (post-v2)

All HIGH and MED findings resolved. Both reviewers' findings collapse into mechanical doc + test additions + a minor poisoned-pre-check robustness fix. Expect iter-2 to ACCEPT.
