## Iter-3 Verdict: REJECT — 1 convergent MED above ACCEPT bar

Both reviewers re-flagged iter-2 Codex's **M-DRIFT** (silently omitted from v3's status line):
- §12 line 454: `count: 0 + NaN`s → should be `null` (contradicts v2's H-JSON-NAN fix)
- §12 line 461: "9 built-ins" → should be 11
- §15 ADR 24 line 523: "9 built-in metrics" → should be 11 + expanded field list

**What landed cleanly in v3:** H-EXEC-SEMANTICS rename + bundle.commands switch (engine-verified by Opus against world.ts:732-748 / 1686 / 1721 / 1769); M-FAILEDTICK-DIVZERO zero-tick-corpus guard; N-DUP-METRIC rationale (holds — different sources, no longer 1-x); 5 of 6 iter-2 NITs.

**Iter-3-only NITs:**
- Codex: §12 line 475 still has "100% of new code"; line 3 brace expansion
- Opus: §8 cross-ref to §6.12 doesn't fit (§6.12 catalogs excluded metrics, not volatile-metadata exclusion)

**v4 in flight.** The on-disk file already has uncommitted edits applying all 3 M-DRIFT fixes + N-100PCT + N-BRACE + the §17/ADR 26 contradiction (which neither reviewer flagged but is a free byproduct). Remaining gap: N-§8-XREF.

Synthesis written to `docs/reviews/behavioral-metrics/2026-04-27/design-3/REVIEW.md`. Expect ACCEPT on iter-4 once N-§8-XREF is folded.
Holds. After the rename, denominators are different — `commandValidationAcceptanceRate` divides by `bundle.commands.length`, `executionFailureRate` divides by `bundle.executions.length`. Validator-rejected commands inflate the former's denominator without contributing to the latter's, so the two no longer sum to 1. The §6.11 "Pair with…" block correctly explains this.

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
