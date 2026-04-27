I've identified a HIGH-severity issue. The v6 revision header claims the iter-5 fix landed at **both** T2 step 9 and T3 step 2, but only T2 step 9 was actually patched.

## Findings

### HIGH: T3 Step 2 dual-run test still compares timing-noisy `bundle.ticks`

**Location:** `docs/design/2026-04-27-synthetic-playtest-implementation-plan.md:1466`

**Issue:** The T3 step 2 production-determinism dual-run test still has the unstripped comparison:

```ts
// Tick entries (diffs + events).
expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);
```

This is the **exact same iter-5 HIGH** that v6 was supposed to fix. `SessionTickEntry.metrics: WorldMetrics | null` (session-bundle.ts:56) includes `durationMs`, which is `performance.now()`-backed (world-internal.ts:171). Two deterministic runs will produce different `durationMs` values, causing intermittent CI failures.

**Why the v6 header's claim is false:** The note says "replace_all on the stripTickMetrics pattern caught both sites." But `stripTickMetrics` was a *new* identifier introduced in v6 — it didn't exist at the T3 step 2 site in v5 (T3 step 2 had `expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);` directly). `replace_all` on a string that doesn't exist at a site cannot reach that site. T2 step 9 was fixed correctly (line 1220-1223 has the `stripTickMetrics` helper); T3 step 2 was missed.

**Fix:** Apply the same `stripTickMetrics` helper used at T2 step 9 (line 1220-1223). The T3 step 2 test already strips `sessionId`/`recordedAt` from metadata via `stripVolatile`, so the pattern is established — just extend it to ticks. Replace line 1466 with:

```ts
// Tick entries (deterministic fields only — strip metrics for the same reason as T2 step 9).
const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
  tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
});
expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));
```

Also correct the v6 revision header at line 6 — the "replace_all caught both sites" claim should be verified by grep before writing it down (a one-line `grep -n "bundle\.ticks).toEqual" docs/design/...` would have surfaced this).

---

**Verdict:** REJECT for iter-6. One HIGH remains. The bar (no BLOCKER/HIGH/MED) is not met. v7 needs to actually patch T3 step 2 and verify with `grep -n "bundle\.ticks).toEqual"` returning only the post-fix `.map(stripTickMetrics)` form.
