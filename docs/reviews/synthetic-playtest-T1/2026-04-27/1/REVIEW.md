# T1 Code Review iter-1: Effectively Converged

**Iter:** 1. **Subject:** T1 diff (575 lines staged). **Reviewers:** Codex (1 MED), Opus (ACCEPT, 3 NIT).

## Codex MED — ADR 17 wording

`docs/architecture/decisions.md` ADR 17 said stateful policies use `() => instance.decide.bind(instance)` — that's a 0-arg factory returning a Policy, not a Policy itself. Fixed: `instance.decide.bind(instance)` (or an equivalent closure capturing instance state).

## Opus optional NITs (non-blocking, deferred)

- NIT-1: `randomPolicy` non-integer-burst test only covers `burst:0`, not `burst:1.5`. Impl is correct via `Number.isInteger`; test asymmetry is mild.
- NIT-2: Tests import policy factories from `synthetic-playtest.js` directly while importing `World`/`DeterministicRandom` from `index.js`. Either is fine; consistency check optional.
- NIT-3: `scriptedPolicy` doesn't validate `entry.tick >= 0`. Negative ticks just never fire (T2 harness can't generate negative tick). Authoring-convenience, not correctness.

## What landed

- Policy types (4-generic shape matching World): `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand` (discriminated union), `RandomPolicyConfig`, `ScriptedPolicyEntry` (discriminated union).
- 3 factories: `noopPolicy`, `scriptedPolicy` (O(1) per-tick lookup), `randomPolicy` (with empty/freq/burst/offset validation).
- 13 unit tests covering each factory + cross-tick determinism + ctx-using catalog + all RangeError paths.
- Doc surface: api-reference policies section, ADRs 17/18/19, changelog 0.7.20, devlog summary + detailed entry, version bumps.

## Verdict

ACCEPT post-fix. Codex MED resolved. Opus NITs deferred to either T2/T3 or out-of-scope (input validation hardening would be its own change).
