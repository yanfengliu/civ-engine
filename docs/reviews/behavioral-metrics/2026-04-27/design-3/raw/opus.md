I have everything I need to produce the review.

---

# Iter-3 Review — Behavioral Metrics Design v3

## Verification of iter-2 fixes

**Engine-fact references verified:**
- `world.ts:732-748` — validator rejection path returns before `commandQueue.push`, so rejected submissions never reach `bundle.executions`. Matches §6.10's claim. ✓
- `world.ts:1686 / 1721 / 1769` — three `executed: false` paths with codes `missing_handler` / `command_handler_threw` / `tick_aborted_before_handler`. Matches §6.11 verbatim. ✓
- `session-recorder.ts:163-172` — capture wrapper invokes after `original(type, data)` unconditionally, so every `submitWithResult` (accepted + rejected) lands in `bundle.commands`. Matches §6.10 numerator/denominator. ✓

**Iter-2 H-EXEC-SEMANTICS (HIGH):** Addressed. Rename to `commandValidationAcceptanceRate`, source switched to `bundle.commands[].result.accepted`, §6.11 rewritten to enumerate the three real `executed: false` causes. §4 table, §6.3 cross-ref, and §18 list all updated.

**Iter-2 M-FAILEDTICK-DIVZERO (MED):** Addressed. §6.8 now reads `totalDurationTicks > 0 ? totalFailedTicks / totalDurationTicks : 0` and explicitly calls out the zero-tick-corpus case.

**N-DUP-METRIC rationale check:** Holds. After the rename, denominators are different — `commandValidationAcceptanceRate` divides by `bundle.commands.length`, `executionFailureRate` divides by `bundle.executions.length`. Validator-rejected commands inflate the former's denominator without contributing to the latter's, so the two no longer sum to 1. The §6.11 "Pair with…" block correctly explains this.

**5 of 6 iter-2 NITs:** Addressed (§6.2 NaN wording flipped to "lossy"; §10 example now does `'onlyIn' in val` runtime check before the `as` cast; ADR 26 now proposes `runMetricsAsync` separate function rather than overload, with correct rationale that overloading would widen the return type; §7.2 negative-baseline `pctChange` caveat added).

## Real findings on v3

### [MED] M-DRIFT-PERSISTS — iter-2 Codex's M-DRIFT finding not addressed

Three stale references remain in v3 (commit 79db0a4) that iter-2 Codex explicitly flagged:

1. **§12 line 454** — "`*Stats` — empty corpus returns `count: 0` + `NaN`s." This contradicts §6.2 line 171 and §7.3 line 373 (both v2 work), which specify `null` numeric fields with the explicit JSON-round-trip rationale. An implementer writing tests from §12 would assert `Number.isNaN(stats.min)` and fail against the spec'd shape. Internal contradiction in a normative section.

2. **§12 line 461** — "Multiplexing: 9 built-ins in one pass produces all 9 results." Actual count is 11 (per §4 table, §13 docs, §14 plan, §18 acceptance criteria — all consistent at 11). The multiplexing test as written omits coverage of `commandValidationAcceptanceRate` and `executionFailureRate`.

3. **§15 ADR 24 line 523** — "Decision: v1 ships 9 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, etc.)." Two separate drifts here: (a) "9" should be "11"; (b) the "etc." example field list omits the now-load-bearing `commands[].result.accepted` (§6.10) and `executions[].executed` (§6.11). ADR 24 is a permanent decision record — the count contradicting §4/§13/§14/§18 is more material than a §12 testing-list typo.

The v3 status line lists what was addressed (H-EXEC-SEMANTICS, M-FAILEDTICK-DIVZERO, 6 NITs) and is silent on M-DRIFT. iter-2 Codex's review explicitly listed M-DRIFT as a MED that v3 must update.

### [NIT] §8 cross-reference still imprecise

Iter-2 NIT was "§8 wrong cross-ref (§6.10 → §6.12)". v3 changed the target to §6.12, but §6.12 ("What's deliberately NOT built in") catalogs deliberately excluded *metrics* (stopReasonHistogram, sourceKindHistogram, etc.) — it does NOT document the deliberate non-reading of `sessionId`/`recordedAt` by built-ins. The §8 sentence is self-explanatory without any cross-reference; the §6.12 pointer adds noise. Either drop the cross-reference or add a bullet to §6.12 covering the volatile-metadata exclusion.

## Note on on-disk file state

The on-disk file is no longer v3 — it has 5 line additions/5 deletions beyond commit 79db0a4 (uncommitted), and its status line reads "Draft v4… v4 addresses iter-3's MED (stale §12 NaNs + 9-built-in count + ADR 24's '9 built-ins' not updated to v3's 11) + 2 NITs." Those uncommitted edits pre-apply exactly the M-DRIFT fixes I flagged above. My review scopes to v3 as committed (per the supplied diff being v2→v3); the uncommitted v4 work appears to confirm the same finding from another reviewer.

## Verdict

**REJECT — v3 still has iter-2 Codex's MED M-DRIFT (§12 line 454 `NaN`s, §12 line 461 "9 built-ins", §15 ADR 24 line 523 "9 built-ins") unaddressed; the v3 status line silently omits this iter-2 finding rather than fixing it.**
