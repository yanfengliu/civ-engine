`ComponentRegistry = Record<string, unknown>` at line 229, matching the defaults in synthetic-playtest.ts. World's TEventMap/TCommandMap default to `Record<string, never>`, but the devlog correctly notes the deliberate omission of those defaults in the policy types (collapsing PolicyCommand to never under empty-map default).

Now reviewing the substance.

---

## Review

**ACCEPT.**

### Why

**Design (clean, scales, debuggable):** Function-based policy via `Policy = (ctx) => Cmd[]` matches existing engine conventions (`System`, `validator`, `handler`). `PolicyContext` and `StopContext` expose only `world`/`tick`/`random` — minimum-viable surface. Discriminated-union `PolicyCommand` correlates `type` with `data` per command. ADRs 17/18/19 accurately defend the choices.

**Correctness:**
- `noopPolicy()` — returns `() => []`. Trivially correct.
- `scriptedPolicy(sequence)` — pre-groups into `Map<number, Cmd[]>` at construction (O(1) per-tick lookup). Preserves declaration order within a tick. The `as PolicyCommand<TCommandMap>` cast is the standard TS pattern for restoring discriminated-union correlation lost by destructuring `entry.type` / `entry.data`; safe because input shape `ScriptedPolicyEntry<TCommandMap>` enforces correlation.
- `randomPolicy(config)` — frequency gate (`tick % frequency !== offset → []`) skips the RNG entirely on non-firing ticks, so the sub-RNG only advances on emission ticks (consistent with replayer's behavior of not re-invoking policies). `Math.floor(ctx.random() * catalog.length)` is bounds-safe given DeterministicRandom's `[0,1)` contract. Validation: empty catalog, non-positive-integer freq/burst, non-negative-integer offset < frequency — all `RangeError`. Validation order is fine.

**Test coverage:** 13 tests covering each factory's main behavior, `RangeError` paths, and cross-tick determinism. The cross-tick determinism test correctly shares one `DeterministicRandom` across the 5 tick calls within a `runOnce` — testing actual sequence determinism rather than per-tick reseeding.

**Doc accuracy:**
- `api-reference.md` signatures match implementation defaults (`frequency=1, offset=0, burst=1`).
- ADRs 17/18/19 in `decisions.md` match design v10 §15. ADR 19's seed-derivation expression is forward-looking to T2 (correctly flagged as such in the body).
- changelog 0.7.20 entry, devlog detailed entry, summary line all consistent.
- `bundle.commands.map(c => ({ tick: c.submissionTick + 1, ... }))` conversion documented in api-reference and devlog. The `+1` is correct given the spec's submissionTick semantics (`world.tick` at submit time is one less than the tick during which the command executes).

**No anti-regressions:** Diff doesn't touch `runSynthPlaytest`, `SessionRecorderConfig`, or `SessionMetadata.sourceKind` — all correctly deferred to T2.

### Optional nits (non-blocking)

- **NIT-1:** `randomPolicy` non-integer-burst test only covers `burst: 0`, not `burst: 1.5`. The `Number.isInteger` check catches both, so impl is correct, but the test asymmetry with the non-integer-frequency case (which tests `1.5`) is mildly inconsistent.
- **NIT-2:** Tests import policy factories from `../src/synthetic-playtest.js` directly while importing `World`/`DeterministicRandom` from `../src/index.js`. Either is fine, but consistency (or one extra index-import test) would prove the re-export contract holds.
- **NIT-3:** `scriptedPolicy` doesn't validate `entry.tick >= 0`. Negative ticks just never fire (impossible for `PolicyContext.tick` to be negative in T2's harness), so this is benign — but a `RangeError` would surface authoring mistakes earlier.

None of these block merge.
