I've completed verification of v2 against design-1 findings and cross-checked references against the actual codebase.

## Verification Summary

**All design-1 findings resolved:**
- Γ£ô Closed/frozen corpus scope (┬º1, ┬º6 explicit)
- Γ£ô No live-writer safety promise (┬º6)
- Γ£ô `loadBundle` documented as not validating sidecar bytes (┬º5.4, ┬º11)
- Γ£ô `scanDepth: 'root' | 'children' | 'all'` with unambiguous semantics (┬º5.1, ┬º6)
- Γ£ô Optional fields (`policySeed`, `sourceLabel`) match only when defined (┬º5.3)
- Γ£ô `replayableEndTick` guidance present in 4 places (┬º5.2, ┬º5.3, ┬º11)
- Γ£ô `loadBundle` generics exactly match `SessionBundle<TEventMap, TCommandMap, TDebug>` constraints in `src/session-bundle.ts:109-113`
- Γ£ô Frozen `metadata` + frozen `failedTicks` defensive copy (┬º5.2, ┬º7)
- Γ£ô `CorpusIndexError extends SessionRecordingError`
- Γ£ô `recordedAt` bounds require Z-form, rejected via `query_invalid` (┬º5.3)
- Γ£ô `openSource`/`loadBundle` throw `entry_missing` (┬º5.1)
- Γ£ô Symlinks/junctions skipped (┬º6 step 4, ┬º10, ┬º11)
- Γ£ô Docs surface includes `concepts.md`, README badge, doc-audit step, reviewer prompt addendum (┬º12)
- Γ£ô `hasFailures` removed from query, kept as derived entry field

**Codebase consistency checks:**
- All `SessionMetadata` field references match `src/session-bundle.ts:83-107`
- `SESSION_BUNDLE_SCHEMA_VERSION` exists with current value `1`
- Current version `0.8.2`; planned `0.8.3` `c`-bump is correct
- Latest ADR is #27; planned #28-31 is correct
- `SessionSource.readSidecar(id)` exists (`src/session-sink.ts:47-59`)
- `AttachmentDescriptor` has `mime`, `sizeBytes` as referenced
- `runMetrics` accepts `Iterable<SessionBundle>` (matches ┬º9 example)

**Doc surface coverage:** the listed updates cover every canonical guide that touches the new API; reviewer-prompt addendum is included in ┬º12.

## Findings

**LOW ΓÇö `CorpusIndexError` shape diverges from existing error taxonomy**

The design defines `code`, `path`, `key` as typed top-level fields *plus* an inherited `details?: JsonValue`. Every other `SessionRecordingError` subclass in `src/session-errors.ts` stores discriminator codes inside `details` (e.g., `BundleIntegrityError(message, { code: 'replay_across_failure', failedTicks, requested })` at `src/session-replayer.ts:205`, `RecorderClosedError(message, { code: 'world_poisoned' })` at `src/session-recorder.ts:124`). Only `MarkerValidationError` adds a typed top-level field, and it doesn't duplicate `code` ΓÇö it adds an orthogonal `referencesValidationRule`.

Consequences if left as designed:
- Generic catch handlers using the established `err.details?.code` pattern won't see CorpusIndexError's code
- Contract is ambiguous about what `details` is for once `path`/`key`/`code` are typed at the top ΓÇö risk of duplication or inconsistency at call sites
- Public error surface is hard to change post-release

Either follow the existing pattern (`new CorpusIndexError(message, { code, path, key, ...extra })`) or explicitly document why this subclass diverges and what role `details` plays alongside the typed fields. Not a correctness blocker ΓÇö implementation can pick either pattern ΓÇö but worth confirming intent now since it's user-visible API.

## Verdict

**ACCEPT.** All design-1 findings are resolved, all referenced types/APIs match the codebase, and the doc/version/ADR plan is accurate. The single LOW finding above is a stylistic-consistency call the implementor can resolve at code time without re-spinning the design.
