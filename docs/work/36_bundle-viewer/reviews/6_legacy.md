# Bundle Viewer — Design Iteration 5 Review (2026-04-28)

**Disposition:** Iterate (v6). Codex: 1 not-addressed major, 1 not-addressed minor, 1 new minor. Claude: ACCEPT with 1 minor + 2 nits — same residue as Codex.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Iter-4 findings disposition

- Codex MAJOR-A / Claude MINOR (BYO-replayer residue): ADDRESSED.
- Codex MAJOR-B (immutability vs perf): **NOT ADDRESSED** — §2 declared a typing-only model, but §10 / §11 / ADR 33 still imply runtime freezing. Real residue.
- Codex MAJOR-C (`diffSnapshots` scope): ADDRESSED.
- Codex MAJOR-D (v0.8.6 staleness): ADDRESSED — v0.8.7 threaded throughout; "current base v0.8.6" matches checkout.
- Codex MINOR (BundleIntegrityError construction): **NOT ADDRESSED** — §5.4 still said "viewer does not wrap" while §7 said it constructs at the call site. Need reconciliation.

## New findings

### Codex MINOR (also Claude NIT) — `WorldSnapshot.config.*` field paths

§7 "Scope of `diffSnapshots`" listed `WorldSnapshot.maxTicksPerFrame` / `instrumentationProfile` but those are nested under `WorldSnapshot.config` per `src/serializer.ts:62-78`. Also missing: `WorldSnapshot.config` itself (gridWidth, gridHeight, tps, positionKey, seed) and `WorldSnapshot.entities.{generations,alive,freeList}`.

### Claude NIT — vocabulary sweep

§4, §6, §15, §17 used "frozen" without clarifying typing-only vs runtime. After v6 adopts the selective runtime freezing model, these reads consistently as "Object.freeze'd," so the sweep is implicit.

## Resolution in v6

1. **Selective runtime freezing model** (§2 / ADR 33): outer `TickFrame` `Object.freeze`d at construction (one-time per `atTick` call); per-tick arrays frozen once at viewer construction (reused across calls); array elements NOT individually frozen (documented bypass). §10 cost analysis updated: O(1) per-call freezing on fresh frame, amortized one-time freezing on per-tick arrays. §11 layered-contract test verifies all three levels.
2. **§5.4 / §7 reconciliation**: §5.4 explicitly carves out `frame.diffSince` failure-in-range as the only place the viewer constructs a `BundleIntegrityError` (with enriched details); all other replay materialization bubbles errors unchanged. §7 retains the call-site enrichment description.
3. **WorldSnapshot field paths**: §7 corrected to enumerate `WorldSnapshot.config` (with its nested fields), `WorldSnapshot.entities.{generations,alive,freeList}`, etc., plus an "any future field outside the TickDiff schema" closing.

Re-review as design-6. Expectation: pure nitpicks or accept.
