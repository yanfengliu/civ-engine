# Spec 8 (Behavioral Metrics) — Design iter-3 Review Synthesis

**Iteration:** 3. **Subject:** v3 (commit 79db0a4). **Reviewers:** Codex 1 MED + 2 NIT; Opus 1 MED + 1 NIT.

**Verdict:** REJECT — re-spin to v4 required. The HIGH (H-EXEC-SEMANTICS) and MED (M-FAILEDTICK-DIVZERO) from iter-2 land cleanly in v3, and 5 of 6 iter-2 NITs are addressed. But iter-2 Codex's MED M-DRIFT (stale §12 / ADR 24 references) was silently omitted from v3's status line — both iter-3 reviewers re-flag it. One convergent MED above the ACCEPT bar; not at convergence yet.

## Convergent MEDs

### M-DRIFT-PERSISTS — three stale references in normative sections

Codex iter-3 [MED] + Opus iter-3 [MED]. Both reviewers verified the same three locations contradict v2's already-landed semantics:

1. **§12 line 454 — empty-corpus `*Stats`.** v3 says "empty corpus returns `count: 0` + `NaN`s." This contradicts §6.2 (line 171) and §7.3, both of which specify `null` numeric fields with the explicit JSON-round-trip rationale (`JSON.stringify(NaN) === 'null'`, `JSON.parse('null') !== NaN`). An implementer writing tests from §12 would assert `Number.isNaN(stats.min)` and fail the spec.

2. **§12 line 461 — multiplexing test count.** v3 says "Multiplexing: 9 built-ins in one pass produces all 9 results." Actual count is 11 per §4 table, §13 docs, §14 plan, §18 acceptance criteria. The test as written omits coverage of `commandValidationAcceptanceRate` and `executionFailureRate` — the two new built-ins from v2 onwards.

3. **§15 ADR 24 line 523 — built-in count + field list.** v3 says "v1 ships 9 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, etc.)." Two drifts: (a) "9" should be "11"; (b) the example field list omits the now-load-bearing `commands[].result.accepted` (§6.10) and `executions[].executed` (§6.11). ADR 24 is a permanent decision record — the count contradicting four other sections is more material than a §12 testing-list typo.

**Why this is MED, not NIT.** §12 is the implementation/test plan and ADR 24 is a permanent decision record. Both directly steer downstream code: an implementer writing tests against §12's "9 built-ins / NaN" wording would produce wrong tests; a future architect reading ADR 24's "9 built-in metrics" would build on a stale anchor. iter-2 Codex flagged this exact MED ("not cosmetic drift, because §12 is the implementation/test plan and can directly recreate the fixed empty-corpus bug or send TDD against the wrong surface") and v3's status line silently omitted it.

**Fix (v4):** `null` not `NaN` in §12 line 454; `11` not `9` in §12 line 461 and ADR 24; expand ADR 24's example field list to include `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete`. The on-disk file at review time already has these edits as uncommitted v4 work.

## Codex iter-3 unique NITs

### N-100PCT — §12 line 475 still claims "100% of new code covered by tests"

Codex iter-3 [NIT]. iter-1 already flagged this as performative. The concrete case list above it is the real acceptance surface. Drop the line or replace with case-enumeration language.

### N-BRACE — line 3 status header uses shell-style brace expansion

Codex iter-3 [NIT]. v3 line 3 reads `` `docs/reviews/behavioral-metrics/2026-04-27/design-{1,2}/REVIEW.md` `` — brace expansion is shell syntax, not a markdown path. Should expand to two explicit paths.

## Opus iter-3 unique NIT

### N-§8-XREF — §8 cross-reference to §6.12 doesn't fit

Opus iter-3 [NIT]. iter-2 NIT was "§8 wrong cross-ref (§6.10 → §6.12)." v3 changed the target to §6.12, but §6.12 ("What's deliberately NOT built in") catalogs deliberately excluded *metrics* (stopReasonHistogram, sourceKindHistogram, etc.) — it does NOT document the deliberate non-reading of `sessionId`/`recordedAt` by built-ins. The §8 sentence is self-explanatory without a cross-reference; the §6.12 pointer adds noise. Either drop the cross-reference or add a §6.12 bullet covering the volatile-metadata exclusion.

## What landed cleanly

- **H-EXEC-SEMANTICS** (iter-2 HIGH, both reviewers): rename to `commandValidationAcceptanceRate`; numerator/denominator switched to `bundle.commands[].result.accepted` / total bundle.commands; `executionFailureRate` rewritten to enumerate the three real `executed: false` causes (`missing_handler`, `command_handler_threw`, `tick_aborted_before_handler`); §4 table, §6.3 cross-ref, §18 list all updated. Engine references verified by Opus against `world.ts:732-748` (validator early-return), `world.ts:1686/1721/1769` (executed=false codes), `session-recorder.ts:163-172` (capture wrapper).
- **M-FAILEDTICK-DIVZERO** (iter-2 MED): §6.8 now reads `totalDurationTicks > 0 ? totalFailedTicks / totalDurationTicks : 0`; explicit zero-tick-corpus call-out matches §6.10/§6.11 shape.
- **N-DUP-METRIC rationale** (iter-2 NIT, deliberately not applied): holds. After H-EXEC-SEMANTICS, the two metrics read different sources — `commandValidationAcceptanceRate` divides by `bundle.commands.length`, `executionFailureRate` divides by `bundle.executions.length`. Validator-rejected commands inflate the former's denominator without contributing to the latter's, so they no longer sum to 1. The §6.11 "Pair with…" block explains this correctly.
- **5 of 6 iter-2 NITs**: §6.2 NaN-wording flipped from "losslessly" to "lossy" with explicit save/reload illustration; §10 example does `'onlyIn' in val` runtime check before the `as` cast; ADR 26 proposes separate `runMetricsAsync` with correct rationale that overload would widen the return type to `MetricsResult | Promise<MetricsResult>`; §7.2 negative-baseline `pctChange` caveat added.

## What v4 should bundle in one revision

- 3× M-DRIFT-PERSISTS fixes (§12 line 454 NaN→null; §12 line 461 9→11; ADR 24 line 523 9→11 + field list).
- N-100PCT (§12 line 475 drop/replace).
- N-BRACE (line 3 expand brace).
- N-§8-XREF (drop §6.12 reference or add a §6.12 bullet for sessionId/recordedAt non-reading).

The §17 row "Async corpus reducer (v2) — `AsyncIterable` overload" silently contradicts v3's just-fixed ADR 26 ("not an overload, separate `runMetricsAsync`"). Bundle this one-line fix into v4 too — neither reviewer flagged it, but it's a free byproduct of the ADR 26 update that should round-trip.

The on-disk file at review time already has uncommitted v4 edits applying all three M-DRIFT fixes, the N-100PCT replacement, the N-BRACE expansion, and the §17 contradiction fix. The remaining gap is N-§8-XREF — minor, fold or drop.

## Verdict

**REJECT for v3.** 1 convergent MED (M-DRIFT-PERSISTS, three stale references in §12 + ADR 24) above the ACCEPT bar. NITs cheap to fold into v4. Architecture, semantics, and engine-fact alignment are all converged — this is purely doc-drift cleanup. Expect convergence (ACCEPT) on iter-4.
