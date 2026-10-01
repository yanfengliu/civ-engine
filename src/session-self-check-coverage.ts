// Internal coverage census; recording and replay formats are unchanged.
import type {
  SelfCheckCoverage, SelfCheckRange, SelfCheckUncoveredRange, SkippedSegment,
} from './session-replayer-types.js';

export function describeSelfCheckCoverage(
  horizon: SelfCheckRange,
  enabledChecks: SelfCheckCoverage['enabledChecks'],
  completed: SelfCheckRange[],
  skipped: SkippedSegment[],
  options: { noPayloads?: boolean; stopped?: boolean } = {},
): SelfCheckCoverage {
  const coverage: SelfCheckCoverage = {
    horizon, enabledChecks, checkedRanges: [], stateComparisonTicks: [],
    uncoveredRanges: [], complete: false,
  };
  if (horizon.fromTick === horizon.toTick) {
    coverage.notRunReason = 'empty_horizon';
    return coverage;
  }
  const noComparison = options.noPayloads ? 'no_payloads'
    : !Object.values(enabledChecks).some(Boolean) ? 'all_checks_disabled' : undefined;
  if (noComparison) {
    coverage.uncoveredRanges.push({ ...horizon, reason: noComparison });
    coverage.notRunReason = noComparison;
    return coverage;
  }
  coverage.checkedRanges = completed;
  if (enabledChecks.state) coverage.stateComparisonTicks = completed.map(range => range.toTick);
  const outcomes: Array<SelfCheckRange & { reason?: SelfCheckUncoveredRange['reason'] }> = [
    ...completed, ...skipped,
  ].sort((a, b) => a.fromTick - b.fromTick);
  let cursor = horizon.fromTick;
  for (const range of outcomes) {
    if (range.fromTick > cursor) {
      coverage.uncoveredRanges.push({ fromTick: cursor, toTick: range.fromTick, reason: 'no_snapshot_segment' });
    }
    if (range.reason) coverage.uncoveredRanges.push({ ...range, reason: range.reason });
    cursor = range.toTick;
  }
  if (cursor < horizon.toTick) {
    coverage.uncoveredRanges.push({ fromTick: cursor, toTick: horizon.toTick,
      reason: options.stopped ? 'stopped_on_divergence' : 'no_snapshot_segment' });
  }
  if (completed.length === 0) {
    coverage.notRunReason = skipped.length ? 'all_segments_skipped' : 'no_segments';
  }
  coverage.complete = completed.length > 0 && coverage.uncoveredRanges.length === 0;
  return coverage;
}