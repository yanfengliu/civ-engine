# Bundle Viewer — Design Iteration 1 Review (2026-04-28)

**Disposition:** Rejected. 14 findings: 3 blocker, 8 major, 13 minor. Re-design as v2.

Reviewers: Codex (gpt-5.4 xhigh), Claude (opus xhigh). Both reviewers agreed on the three blockers and overlapped on most majors.

## Blockers

### B1: `options.replayer` requires a `SessionReplayer.bundle` getter that does not exist

§5.1 / §6 step 5 / §9.1 / §9.2 / ADR 32 assume `BundleViewer` can validate `replayer.bundle === bundle`. `SessionReplayer` exposes `metadata` and `markerCount` but not `bundle` (`src/session-replayer.ts:159-160`), and §9.2 also says "SessionReplayer does not change." The check is unimplementable.

**Resolution for v2:** Add a public `readonly bundle: SessionBundle<...>` getter on `SessionReplayer` (single-line additive change). Update §9.2 wording from "does not change" to "gains a single additive `bundle` getter." List the addition in §12 (api-reference Replayer section) and §13 (changelog). Add `replayer_bundle_mismatch` only when both `replayer` and `worldFactory` are forbidden together (see B-related M2).

### B2: Snapshot fallback is not "always correct" across recorded TickFailures

§7 path 2 / ADR 34 claim the snapshot fallback is "always correct." But `SessionReplayer.openAt` throws `BundleIntegrityError({ code: 'replay_across_failure' })` when `targetTick >= ft` for any failed tick (`src/session-replayer.ts:202-206`). If `max >= F` for any recorded failure `F`, the snapshot path itself fails. The two-path design has no actual fallback when failures intersect the range.

**Resolution for v2:** State explicitly that `diffSince` requires both endpoints to fall within the same non-failure segment (no recorded `ft` satisfies `min < ft <= max`). When that constraint is violated, `frame.diffSince` throws the same `BundleIntegrityError({ code: 'replay_across_failure' })` that `openAt` would throw, with `details.range = { from, to }` added. Remove the "always correct" claim from ADR 34. The §7 wording "TickFailure strictly between endpoints" is also wrong — replace with the concrete bound `ft <= max && ft > min`.

### B3: §6.1 sparse-tick wording wrongly empties `commands` / `executions` / `markers`

§6.1 says all of `frame.events`, `frame.commands`, `frame.executions`, `frame.markers` "default to empty arrays" when there is no `SessionTickEntry`. But commands, executions, and markers are independent bundle streams keyed by their own `submissionTick` / `tick` field — they are not part of `SessionTickEntry`. A tick without a `SessionTickEntry` can still have submitted commands, executed commands, and anchored markers.

**Resolution for v2:** Fix the wording so only the SessionTickEntry-derived fields (`events`, `diff`, `metrics`, `debug`) default to empty/null on sparse ticks. `commands`, `executions`, `markers`, `failures` are always sourced from their own per-tick indices regardless of whether a `SessionTickEntry` was recorded for that tick.

## Majors

### M1: Recorded range vs replayable range conflation

§6 step 4 / §6.1 / §8 / §11 / §17 conflate two distinct ranges. The recorder writes a `SessionTickEntry` per successful tick (so events/diff metadata cover `[startTick, endTick]`), but `persistedEndTick` only advances on snapshot writes, so `openAt` is bounded by `[startTick, persistedEndTick]` for incomplete bundles. Commands and markers may exist beyond `persistedEndTick`. As written, `timeline()` could surface frames that `atTick()` rejects.

**Resolution for v2:** Define two ranges explicitly:
- `recordedRange = { start: metadata.startTick, end: metadata.endTick }` — the metadata/content range.
- `replayableRange = { start: metadata.startTick, end: metadata.incomplete ? metadata.persistedEndTick : metadata.endTick }` — the `openAt`-able range.

`atTick(t)` accepts `t ∈ recordedRange` (so callers can inspect content beyond `persistedEndTick`); `frame.state()` / `snapshot()` / `diffSince()` only succeed when `t ∈ replayableRange` and bubble `BundleRangeError({ code: 'too_high' })` from `openAt` otherwise. Iterators (`events`, `commands`, `executions`, `markers`, `failures`, `timeline`) default their query bounds to `recordedRange`.

### M2: `worldFactory` AND `replayer` supplied: behavior undefined

`BundleViewerOptions` allows both. The design does not say what happens.

**Resolution for v2:** Forbid the combination. If both are supplied, throw `BundleViewerError({ code: 'options_conflict' })`. Removes ambiguity, no observable downside (the two paths cannot be cross-validated at runtime anyway).

### M3: `BundleCorpusEntry.openViewer` drops `TDebug`

§9.1 has `BundleViewerOptions<TEventMap, TCommandMap>` (missing `TDebug`).

**Resolution for v2:** Thread `TDebug` everywhere options are accepted, including `BundleCorpusEntry.openViewer<TEventMap, TCommandMap, TDebug>(options?: BundleViewerOptions<TEventMap, TCommandMap, TDebug>)`. Note in §9.1 that the corpus implementation must attach `openViewer` before `Object.freeze` in `makeEntry()` (`src/bundle-corpus.ts:226`).

### M4: `EventQuery` / `CommandQuery` defaults wider than class default

`BundleViewer` defaults `TEventMap = Record<string, never>`. `EventQuery<TEventMap = Record<string, unknown>>` defaults wider, so `viewer.events({ type: 'foo' })` typechecks on a default-typed viewer but yields nothing.

**Resolution for v2:** Align query defaults to `Record<string, never>` (or drop them and require callers to specify the map when filtering). Same for `CommandQuery`.

### M5: `RecordedTickEvent` shape vs `frame.events`

§5.2 declares `frame.events: readonly RecordedTickEvent<TEventMap>[]` where `RecordedTickEvent` adds `tick`. But `bundle.ticks[i].events` is `{type, data}[]` (no tick). Constructing `RecordedTickEvent[]` per-frame contradicts §10's O(1) frame allocation claim.

**Resolution for v2:** Two distinct types:
- `frame.events: readonly RecordedTickFrameEvent<TEventMap>[]` where `RecordedTickFrameEvent = { type, data }` (bundle shape, no tick — the tick is `frame.tick`).
- `viewer.events()` yields `RecordedTickEvent<TEventMap>` with `{ tick, type, data }` (because the iterator spans multiple ticks).

Renames keep both types' meaning unambiguous. Same applies to `frame.commands` (already `RecordedCommand` which carries `submissionTick`, so OK), `frame.executions` (carries `tick`, OK).

### M6: Tick-diff folding silently aliases entity ID recycling

§7 path 1 says destroy-then-create within the range still folds correctly. But `TickDiff` carries only numeric entity IDs, not generations. An ID destroyed at tick A and recreated at tick B (same numeric ID) would alias two distinct entity lifetimes when components/resources/tags/metadata are folded.

**Resolution for v2:** Require snapshot fallback when any entity ID appears in both `entities.destroyed` and `entities.created` within `(min, max]`. Update the path-1 safety rule. Add a test pinning this.

### M7: Sparseness fallback heuristic is wrong

§7 path 1 falls back when "any intermediate tick has no SessionTickEntry while *something* changed (heuristic: bundle.commands or bundle.executions non-empty)." But systems can mutate state with no commands/executions (resource accrual, aging, layer ticks, etc.). The heuristic misses real changes.

**Resolution for v2:** Replace the heuristic. Better rule: fall back whenever any tick in `(min, max]` lacks a `SessionTickEntry`, regardless of commands/executions. This is conservative but correct. Document that the recorder writes a `SessionTickEntry` per successful tick, so dense `SessionTickEntry` coverage in `recordedRange` is the normal case; sparseness is an artifact of incomplete bundles or hand-constructed test bundles.

### M8: `diffSince` direction unspecified for caller-supplied ordering

Callers can pass `frame.diffSince(later)` or `frame.diffSince(earlier)`. §7 normalizes to `min..max` silently.

**Resolution for v2:** State the rule once: result always represents the change from `min(tick, otherTick)` to `max(tick, otherTick)`; `fromTick === min`, `toTick === max`. Callers wanting reverse ordering invert sets/removes themselves. Equal endpoints (`min === max`) yield an empty diff with `source: 'tick-diffs'` and `fromTick === toTick`.

### M9: Open question 5 (markers beyond `persistedEndTick`) must be resolved

§15 OQ 5 leaves it open. With M1's fix splitting `recordedRange` vs `replayableRange`, markers anchored to ticks > `persistedEndTick` are still in `recordedRange`. `markerIndex` includes them, `atMarker(id)` returns the frame (since `atTick` accepts `t ∈ recordedRange`), but `frame.state()` would throw `BundleRangeError`. This is consistent and useful: agents can navigate the metadata, and only state materialization respects the replayable bound.

**Resolution for v2:** Drop OQ 5. State the resolved behavior in §6 / §6.1: markerIndex includes all bundle markers; `atMarker(id)` succeeds for any in-range marker; `frame.state()` throws when the marker's tick is beyond `replayableRange`.

### M10: Versioning — `BundleCorpusEntry.openViewer` is technically source-breaking for downstream mocks

Adding a required method to a structural interface changes the type surface. In practice civ-engine has no external `BundleCorpusEntry` implementers, but per AGENTS.md "compile-breaking" rule, the conservative read is a `b` bump.

**Resolution for v2:** Use a `c` bump (v0.8.6) on the basis that no downstream consumers implement `BundleCorpusEntry` (it is constructed only by `BundleCorpus.makeEntry`). Document the additive method explicitly in the changelog under "Behavior callouts." If reviewers insist on `b` after this rationale, revisit. Make `openViewer` a non-optional method on the interface.

## Minors

### m1: `diffSnapshots` placement

Move to `src/diff.ts` (or `src/snapshot-diff.ts`) and re-export from `bundle-viewer.ts` so the helper is reusable for live-world snapshot comparison without pulling in the viewer surface. Document the signature explicitly: `export function diffSnapshots(a: WorldSnapshot, b: WorldSnapshot, opts?: { tick?: number }): TickDiff`. The `tick` field of the returned `TickDiff` defaults to `b`'s tick when both are bundle-anchored, otherwise 0; callers can override via `opts.tick`.

### m2: `executions(query)` lacks `type` filter

Add `type?: OneOrMany<keyof TCommandMap & string>` to symmetrize with `commands(query)`.

### m3: `fromSource` generics are caller assertions

Note in §5.1 that `BundleViewer.fromSource` does not validate `TEventMap`/`TCommandMap`/`TDebug` at runtime (consistent with `SessionReplayer.fromSource` which casts via `as unknown as SessionBundle<...>`).

### m4: Lazy replayer error timing

Document in §6: `BundleViewer` constructor validates `bundle.schemaVersion` only and throws `BundleVersionError` on mismatch. Cross-engine-version checks fire only when the lazy `SessionReplayer` is instantiated (first `frame.state()`, `frame.snapshot()`, snapshot-fallback `diffSince()`, or `viewer.replayer()`).

### m5: `tick_out_of_range` vs `BundleRangeError` overlap

Document explicitly in §5.4: metadata navigation (`atTick`, query bound validation) throws `BundleViewerError`; replay materialization (`frame.state`, `frame.snapshot`, snapshot-fallback `diffSince`) bubbles `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` from `SessionReplayer`. Different `instanceof` checks let callers separate the two regimes.

### m6: `failures()` tiebreaker

Note the recorder's contract is one `TickFailure` per tick (the world is poisoned after a failure, blocking further ticks within the same lifetime). `failures()` order is `(tick ASC)` and unambiguous. Add the assumption to §8.

### m7: `viewer.replayer()` memoization contract

State explicitly in §10: the lazily-constructed `SessionReplayer` is built once and memoized on the viewer instance. Subsequent `frame.state()`, `frame.snapshot()`, snapshot-fallback `diffSince()`, and `viewer.replayer()` calls reuse the same replayer. If a pre-built replayer is supplied via `options.replayer`, the viewer holds that reference; no second replayer is ever constructed.

### m8: `RecordedTickEvent.type` width vs bundle's keyof TEventMap

Bundle's stored event uses `type: keyof TEventMap`; viewer's `RecordedTickEvent.type` narrows to `keyof TEventMap & string`. Practically TEventMap keys are strings, but TypeScript needs a cast at the seam. Keep the narrower viewer type (consumers want `string`) and add a one-liner in §5.2 noting the cast at the boundary.

### m9: `metadata.incomplete` is `incomplete?: true` not boolean

§6 step 4's expression `metadata.incomplete ? metadata.persistedEndTick : metadata.endTick` works at runtime. Add a one-liner noting the convention matches `SessionReplayer.openAt`.

### m10: `docs/guides/bundle-viewer.md` is a new file

Mark explicitly in §12 as new (consistent with how `bundle-corpus-index.md` was marked).

### m11: ADR numbering

Verified: 32–34 is the next free block. No change.

### m12: Doc surface adds the SessionReplayer getter

Per B1's resolution, §12 must add `docs/api-reference.md`'s SessionReplayer section and the changelog must list the additive getter.

### m13: `query_invalid` code collides with `CorpusIndexError({ code: 'query_invalid' })` as a string

Different classes, no functional collision. No change. Document in §5.4 that codes are scoped to their error class.

## Disposition

Reject design v1. Address all 3 blockers and 8 majors in v2. Minors are pulled into v2 where they affect the same sections. Re-review as design-2.
