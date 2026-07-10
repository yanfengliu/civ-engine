import { BundleIntegrityError } from './session-errors.js';

/**
 * Assert that `ticks` contiguously covers `(fromTick, toTick]` — every tick in
 * that half-open-below range has a `SessionTickEntry`. A gap means the bundle
 * body was truncated past the recorder's rolling-buffer capacity, or tampered;
 * replaying forward (SessionReplayer.openAt) or folding diffs (snapshotAtTick)
 * over the gap would silently yield WRONG state, so both callers fail fast here
 * with a coded `missing_tick_entries` error instead (full-review 2026-07-10 M1).
 * No-op for a healthy bundle. Failed ticks are handled by the callers' separate
 * `replay_across_failure` guard, which runs before this.
 */
export function assertContiguousTickEntries(
  ticks: readonly { tick: number }[],
  fromTick: number,
  toTick: number,
): void {
  const present = new Set(ticks.map((te) => te.tick));
  const missing: number[] = [];
  for (let t = fromTick + 1; t <= toTick; t++) {
    if (!present.has(t)) missing.push(t);
  }
  if (missing.length === 0) return;
  throw new BundleIntegrityError(
    `bundle body is gapped: tick entries missing in (${fromTick}, ${toTick}] ` +
      `(truncated past the recorder's capacity, or tampered): ` +
      `${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', …' : ''}`,
    { code: 'missing_tick_entries', missing: missing.slice(0, 50), fromSnapshotTick: fromTick, requested: toTick },
  );
}
