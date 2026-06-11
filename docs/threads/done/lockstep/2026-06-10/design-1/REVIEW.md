# lockstep — design review, iteration 1

**Reviewed:** DESIGN.md v1 (design-only objective; implementation gated on a real networked consumer). **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | NOT CONVERGED | 2 MEDIUM |
| Gemini | CONVERGED | none |
| Claude | NOT CONVERGED | 1 IMPORTANT (same as Codex 2), 2 SHOULD, minors |

Unanimously verified: lockstep-with-relay is the right model (FIFO command queue + submission-order-is-execution-order substrate confirmed at world-commands.ts; replay already sorts by per-tick sequence); rollback rejection justified; `stateDigest` is the right and only engine gap (serialize() canonicality preconditions verified down to the explicit freeList in WorldSnapshotV5; FNV-1a already exists in-repo as `seedToUint32`); `diffBundles` post-mortem fit confirmed (symmetric mode is purpose-fit for two peers' bundles).

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex 2 / Claude 1 | IMPORTANT | **Peer leave/timeout membership is unspecified and the barrier makes that a correctness hole**: "wait for every peer's input" + waiting-only stalls = a crashed peer stalls the session forever; locally-inferred departure desyncs the barrier's own membership set; §2's "(or a timeout policy fires)" dangles. Also: barrier needs per-peer per-tick input frames INCLUDING empty frames, else "no input" and "packet missing" are indistinguishable | FIXED in v2 — explicit `InputFrame(tick, playerId, commands[])` with mandatory empty frames; active-roster epochs; membership changes (join AND leave/timeout) are relay-declared control messages effective at a named tick so every peer agrees on the required-input set per tick |
| Codex 1 / Claude nit | MEDIUM | "Structurally enforceable via strict: true" overstates — ARCHITECTURE.md: the determinism contract is documented but NOT structurally enforced; strict mode covers only the out-of-tick-mutation clause; selfCheck is the verifier | FIXED in v2 — wording aligned: lockstep inherits the documented determinism contract; strict mode helps one clause; digest + diffBundles are the live-desync analogue of selfCheck |
| Claude 2 | SHOULD | Join handshake checks registration manifest but not the version envelope — the replay subsystem already treats engineVersion skew as construction-fatal (`BundleVersionError` cross-a/cross-b); networked peers are MORE exposed | FIXED in v2 — join handshake exchanges engineVersion + Node major under the same cross-a/cross-b reject policy (also subsumes residual transcendental-float risk: same engine + same V8 ⇒ agreement) |
| Claude 3 | SHOULD | Session-owns-submission must be explicit: the ordering rule binds iff each peer submits the sorted set to its local world in that order; direct `world.submit()` in lockstep mode is an instant desync | FIXED in v2 — composition sentence + footgun callout (SessionRecorder's submitWithResult ownership cited as precedent) |
| Claude 4 | MINOR | Digest round-trip stability is untested by the existing suite (selfCheck compares key-order-insensitively; the digest needs byte-level stability; late-joiner's first digest is exactly the applySnapshot round-trip) | FIXED in v2 — test-plan line: `digest(serialize(w)) === digest(serialize(applySnapshot(serialize(w))))` + veteran-vs-late-joiner digest equality; diffBundles overlap-range guidance sentence |
| Claude nits | — | Strengthen rollback rejection (AI agents don't perceive input delay — rollback's benefit is void; resimulation would force speculation-awareness onto onDiff/getEvents consumers); 64-bit FNV variant nearly free | ADOPTED in v2 |

## Disposition

DESIGN v2 applies all items; design-2 confirmation round follows.
