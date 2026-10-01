# M1: self-check coverage contract (proposed)

Base: civ-engine a2bfe02a6c722274a16e718692bd56902372a092 with the pending M0 dependency-only repair. Owner: engine-feedback worker; interface approver and downstream adoption owner: root. E22 is the sole behavior change in M1. No recording, metadata, snapshot or bundle format changes. Root accepted this exact contract on 2026-10-01. Implementation begins after M0 lands and its remote matrix/publish-dist boundary is green.

## Public types

```ts
export interface SelfCheckRange {
  fromTick: number;
  toTick: number;
}

export interface SelfCheckUncoveredRange extends SelfCheckRange {
  reason: 'no_payloads' | 'no_snapshot_segment' | 'failure_in_segment'
    | 'stopped_on_divergence' | 'all_checks_disabled';
}

export interface SelfCheckCoverage {
  horizon: SelfCheckRange;
  enabledChecks: { state: boolean; events: boolean; executions: boolean };
  checkedRanges: SelfCheckRange[];
  stateComparisonTicks: number[];
  uncoveredRanges: SelfCheckUncoveredRange[];
  complete: boolean;
  notRunReason?: 'empty_horizon' | 'no_payloads' | 'no_segments'
    | 'all_checks_disabled' | 'all_segments_skipped';
}

// Existing fields remain unchanged.
export interface SelfCheckResult {
  // ... existing fields ...
  coverage?: SelfCheckCoverage;
}
```

Coverage is optional on the interface so old consumer-created result objects remain assignable. Every successful return from SessionReplayer.selfCheck includes it. New interfaces are exported through the same curated root barrel as SelfCheckResult and covered by public-surface fixtures. No new runtime symbol or dependency is required.

## Meaning and bounds

Every range describes transitions `(fromTick, toTick]`, with integer ticks and fromTick strictly below toTick. The horizon itself may be empty. Its start is metadata.startTick. Its end is the existing replayableUpperBound: complete recordings use max(endTick, persistedEndTick); incomplete recordings use persistedEndTick. No recorded or declared tick beyond that bound becomes covered. Snapshot endpoints outside the horizon are excluded from the self-check segment list; eligible endpoints use ascending tick order and zero-length pairs make no comparison claim. Valid recorder/sink output keeps its current replay work and segment counts.

checkedRanges retains one interval per actually completed segment, including a segment that found a divergence. It is not a count of checked world snapshots. With state enabled, stateComparisonTicks lists each actual terminal snapshot comparison; state at intermediate ticks is not compared and is never implied to be. Enabled event and execution streams are compared for each replayed transition in a checked interval. Disabled checks remain false in enabledChecks and make no comparison claim. No new replay of an unanchored tail is added.

complete means at least one positive-length interval made a requested comparison, and the entire positive horizon is covered for the enabled checks without an uncovered range. It is independent of ok: complete true with ok false means all requested comparisons ran and a divergence was found. Partial flag selection can be complete for that selection; callers requiring all three must also inspect enabledChecks. All-disabled, empty-horizon, no-payload, no-segment and all-skipped cases are incomplete even when ok remains true. checkedSegments preserves its existing attempted-segment meaning for compatibility, including its existing value when all flags are disabled; that value alone is not evidence that a comparison ran.

uncoveredRanges partitions the remaining positive horizon with explicit causes. A tail without a later snapshot has no_snapshot_segment. A skipped failure segment has failure_in_segment. After stopOnFirstDivergence, all remaining transitions use stopped_on_divergence, including an otherwise unanchored tail. When no comparison runs, notRunReason explains why even for an empty horizon where no positive uncovered range exists. Reason precedence is empty_horizon, existing no-payload short circuit, all_checks_disabled, no_segments, all_segments_skipped. Missing tick entries inside an otherwise checked segment cannot support event-stream coverage: propose applying the existing assertContiguousTickEntries guard before segment replay, reporting its existing BundleIntegrityError/missing_tick_entries diagnostic rather than returning a fabricated complete result. Root accepted this bounded guard with the contract on 2026-10-01.

Legacy limitations remain explicit: an empty commands array is still conservatively classified no_payloads when the horizon is positive; the current bundle schema cannot distinguish a genuinely commandless recording from stripped payloads. A bundle can carry valid-looking but dishonest data; coverage reports comparisons performed against the supplied recording, not provenance, game correctness or determinism outside those comparisons. Factory/registration/handler/continuity exceptions retain their exception semantics and produce no completed SelfCheckResult.

## Independent contract tests (literal expectations)

A small deterministic test fixture registers one spawn command and a deterministic per-tick value increment. It records actual commands and events through SessionRecorder/MemorySink. Expectations use literal tick intervals and recorded outcomes, never the production coverage helper or replayableUpperBound. Fresh failing tests are promoted to tests/session-self-check-coverage.test.ts after M0 lands; no red test is included in the M0 gate.

| Case | Recording and independent expectation |
|---|---|
| Clean terminal recording | 9 ticks, interval 5, terminal true: checked (0,5] and (5,9]; stateComparisonTicks [5,9], no uncovered range, complete true, ok true. |
| Live or terminal-disabled tail | 9 ticks, interval 5, terminal false: checked (0,5], uncovered (5,9] no_snapshot_segment; stateComparisonTicks [5], complete false, ok true. This is the reported class. |
| No snapshot segment | 4 ticks, interval null, terminal false, command payload present: no checked range, uncovered (0,4] no_snapshot_segment, notRunReason no_segments, complete false. |
| No payload | Strip commands from the otherwise terminal-complete 9-tick bundle: zero checkedSegments, warning preserved, no checked range, uncovered (0,9] no_payloads, notRunReason no_payloads, complete false, ok true. Factory spy must remain uncalled. |
| Empty recording | Connect and disconnect without stepping: horizon (0,0], no positive ranges or state comparisons, notRunReason empty_horizon, complete false. No claim from a zero-length snapshot pair. |
| Disabled comparisons | Complete 9-tick bundle, all three flags false: no comparison ranges or stateComparisonTicks, uncovered (0,9] all_checks_disabled, notRunReason all_checks_disabled, complete false; old checkedSegments value preserved. |
| Selected checks | Complete 9-tick bundle with state false and event/execution true: complete true for those flags, stateComparisonTicks [], explicit state false. Independent event tamper must produce ok false. |
| Failure boundary | Snapshots 0,2,4,6; failedTicks [4]: checked (0,2] and (4,6], skipped (2,4] with exact failure boundary, uncovered (2,4] failure_in_segment, complete false. Failure at a segment's start belongs to the prior interval. |
| Early stop | Snapshots 0,2,4,6; independently tamper expected state at tick 2; stopOnFirstDivergence true: checked (0,2], stateComparisonTicks [2], uncovered (2,6] stopped_on_divergence, complete false, ok false. Without stopping, all intervals checked, complete true, ok false. |
| All failure segments | Sole (0,4] segment with failedTicks [4]: no checked range, uncovered failure_in_segment, notRunReason all_segments_skipped, complete false. |
| Legacy metadata | Complete terminal 4-tick recording with endTick/durationTicks manually set 0 and persistedEndTick 4: horizon (0,4], checked (0,4], complete true. |
| Incomplete metadata | Actual 9-tick recording, snapshots 0,5,9; set incomplete true and persistedEndTick 5: horizon (0,5], checked only (0,5], no tick-9 world construction, stateComparisonTicks [5]. |
| Nonzero start | Start world at tick 3, record 4 more ticks with terminal: horizon (3,7], checked (3,7], complete true; no invented (0,3] coverage. |
| Gapped expected stream | Remove recorded tick 3 from a complete (0,4] bundle: existing missing_tick_entries diagnostic, no complete result. This verifies the coverage instrument rather than trusting absent expected events as empty. |
| Compatibility | A literal old SelfCheckResult without coverage typechecks; runtime return always has coverage. Existing checkedSegments/divergence/skipped arrays and warning behavior stay pinned. |

After green implementation, temporarily reintroduce the original missing coverage return and run the tail/no-payload/zero-segment cases; all must go red, then restore exact authored bytes. Also mutate the horizon calculation to endTick-only and run the legacy-metadata case, and reintroduce above-persisted snapshot checking for the incomplete case. Retain only authored conclusions in the permanent review; raw runs stay ignored until the milestone is accepted. A meaningful performance bound compares world-construction/step counts against the base for valid bundles; coverage must not replay the unchecked tail or add world construction. Gate: affected tests plus full engine gates on the final accepted revision, pinned independent exact implementation/integrated review, main merge/push and green remote matrix/publish-dist.

## Status

Accepted by root 2026-10-01: exact type/reason meanings, snapshot horizon normalization and existing continuity guard. M0 remains unshipped; M1 implementation waits for its green remote release boundary. M1 code and public interfaces are unchanged.