// Bundle Hotspots (v0.8.13+) — per-bundle "where did this run go wrong?" helper.
//
// `bundleHotspots(bundle, options?)` scans a SessionBundle and returns a sparse,
// ordered list of "ticks worth looking at": tick failures, execution failures,
// per-tick metric outliers (z-score above threshold), and (optionally) marker
// locations. Designed for AI agents investigating a recorded session — the
// output is a triage list pointing the agent at specific ticks to load via
// `SessionReplayer.openAt(tick)` or `BundleViewer.atTick(tick)`.
//
// This is the first concrete incarnation of the "anomaly detection over the
// corpus" continuous capability mentioned in
// `docs/design/ai-first-dev-roadmap.md`. v1 is per-bundle only; corpus-level
// outlier detection (cross-bundle z-scores) is a future addition.

import type { JsonValue } from './json.js';
import type { SessionBundle, SessionTickEntry } from './session-bundle.js';
import type { CommandExecutionResult, TickFailure } from './world.js';

/** A single "interesting tick" surfaced by `bundleHotspots`. */
export interface BundleHotspot {
  /** Tick number. For failures, `tick` matches the failure's tick (the
   *  pre-advance tick where the failure occurred); for duration outliers
   *  and markers, `tick` matches `SessionTickEntry.tick` (= submission-tick + 1)
   *  or the marker's `tick` field. */
  readonly tick: number;
  /** What kind of hotspot this is. */
  readonly kind: BundleHotspotKind;
  /** Severity hint for downstream UI / triage. */
  readonly severity: 'low' | 'medium' | 'high';
  /** Human-readable summary. */
  readonly message: string;
  /** Structured details for programmatic consumers. */
  readonly details: JsonValue;
}

export type BundleHotspotKind =
  | 'tick_failure'        // bundle.failures[i] — fatal tick-time error
  | 'execution_failure'   // bundle.executions[i].executed === false
  | 'duration_outlier'    // SessionTickEntry.metrics.durationMs.total z-score above threshold
  | 'marker';             // bundle.markers[i] — user/agent annotation

export interface BundleHotspotsOptions {
  /** z-score threshold for duration_outlier detection. Default: 3
   *  (i.e., flag ticks whose total durationMs is > 3 stdev from the bundle's
   *  mean). Set to `Infinity` to disable duration outlier detection. */
  readonly durationStdevThreshold?: number;
  /** Include marker locations as hotspots. Default: true. Markers are
   *  always severity:'low' (they're annotations, not errors). */
  readonly includeMarkers?: boolean;
  /** Limit on the number of duration outliers reported (top N by z-score).
   *  Default: 10. Failure hotspots are NOT capped — every failure is
   *  reported. */
  readonly maxDurationOutliers?: number;
}

/**
 * Returns a sorted-by-tick list of "interesting ticks" in a bundle.
 *
 * Ordering: ascending by tick. Within the same tick, hotspots are ordered
 * by kind: tick_failure → execution_failure → duration_outlier → marker.
 *
 * The function is pure and synchronous; it scans the bundle once and
 * collects per-tick metric values for the duration-outlier z-score
 * computation in a single pass.
 *
 * **Short-bundle note for duration outliers:** the z-score uses the
 * population stdev (divide by n, not n-1), so the maximum possible z for
 * any sample in a bundle of n metric-bearing ticks is `√(n-1)`. With
 * the default threshold of 3, that means bundles with <10 metric-bearing
 * ticks cannot produce duration outliers regardless of how skewed the
 * distribution is, and at n=10 only the extreme pathological case
 * (one sample at the maximum, all others equal) reaches the boundary.
 * Lower the threshold or accumulate more ticks if you need outlier
 * detection on short bundles.
 */
export function bundleHotspots<TEventMap, TCommandMap>(
  bundle: SessionBundle<TEventMap, TCommandMap>,
  options?: BundleHotspotsOptions,
): BundleHotspot[] {
  const b = bundle as unknown as SessionBundle;
  const stdevThreshold = options?.durationStdevThreshold ?? 3;
  const includeMarkers = options?.includeMarkers ?? true;
  const maxDurationOutliers = options?.maxDurationOutliers ?? 10;

  const out: BundleHotspot[] = [];

  // ---- Tick failures (always reported) ----
  for (const f of b.failures) {
    out.push(failureHotspot(f));
  }

  // ---- Execution failures (always reported, one hotspot per failed execution) ----
  // The engine writes `executions[i].executed === false` (per
  // src/world.ts:1783-1875) in three cases:
  //   - missing handler (also produces a TickFailure for the same tick)
  //   - thrown handler (also produces a TickFailure for the same tick)
  //   - command dropped because the tick already aborted (no fresh
  //     TickFailure; the abort happened upstream)
  // So an execution_failure hotspot may accompany a tick_failure at the
  // same tick. Multiple failures at the same tick produce multiple
  // hotspots — each failed command is independent triage signal.
  for (const e of b.executions) {
    if (!e.executed) {
      out.push(executionFailureHotspot(e));
    }
  }

  // ---- Duration outliers via z-score over bundle.ticks[].metrics.durationMs.total ----
  if (Number.isFinite(stdevThreshold)) {
    const outliers = findDurationOutliers(b.ticks, stdevThreshold, maxDurationOutliers);
    out.push(...outliers);
  }

  // ---- Markers (optional, low severity) ----
  if (includeMarkers) {
    for (const m of b.markers) {
      out.push({
        tick: m.tick,
        kind: 'marker',
        severity: 'low',
        message: `marker ${m.id}${m.text ? `: ${m.text.slice(0, 80)}` : ''}`,
        details: {
          markerId: m.id,
          kind: m.kind,
          provenance: m.provenance,
          ...(m.text !== undefined ? { text: m.text } : {}),
        },
      });
    }
  }

  // Sort: ascending by tick, then by kind priority.
  out.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });
  return out;
}

const KIND_ORDER: Record<BundleHotspotKind, number> = {
  tick_failure: 0,
  execution_failure: 1,
  duration_outlier: 2,
  marker: 3,
};

function failureHotspot(f: TickFailure): BundleHotspot {
  return {
    tick: f.tick,
    kind: 'tick_failure',
    severity: 'high',
    message: `tick ${f.tick} failed in ${f.phase} phase: ${f.code} (${f.message})`,
    details: {
      phase: f.phase,
      code: f.code,
      message: f.message,
      subsystem: f.subsystem,
      ...(f.commandType !== null ? { commandType: f.commandType } : {}),
      ...(f.submissionSequence !== null ? { submissionSequence: f.submissionSequence } : {}),
    },
  };
}

function executionFailureHotspot(e: CommandExecutionResult): BundleHotspot {
  return {
    tick: e.tick,
    kind: 'execution_failure',
    severity: 'medium',
    message: `command ${String(e.commandType)} at tick ${e.tick} failed: ${e.code} (${e.message})`,
    details: {
      commandType: String(e.commandType),
      code: e.code,
      message: e.message,
      ...(e.submissionSequence !== null ? { submissionSequence: e.submissionSequence } : {}),
    },
  };
}

/** Compute mean + stdev of durationMs.total across all ticks with metrics,
 *  then return the top-N z-score outliers above the threshold. */
function findDurationOutliers(
  ticks: ReadonlyArray<SessionTickEntry>,
  stdevThreshold: number,
  maxOutliers: number,
): BundleHotspot[] {
  const samples: Array<{ tick: number; duration: number }> = [];
  for (const t of ticks) {
    if (t.metrics === null) continue;
    samples.push({ tick: t.tick, duration: t.metrics.durationMs.total });
  }
  if (samples.length < 3) return []; // need at least 3 samples for meaningful z-score

  const mean = samples.reduce((s, x) => s + x.duration, 0) / samples.length;
  const variance =
    samples.reduce((s, x) => s + (x.duration - mean) ** 2, 0) / samples.length;
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return []; // all identical — no outliers

  const candidates: Array<BundleHotspot & { _zscore: number }> = [];
  for (const s of samples) {
    const zscore = (s.duration - mean) / stdev;
    if (zscore < stdevThreshold) continue; // only flag SLOW outliers (high tail); fast ticks aren't problems
    candidates.push({
      tick: s.tick,
      kind: 'duration_outlier',
      severity: zscore >= stdevThreshold * 2 ? 'high' : 'medium',
      message: `tick ${s.tick} took ${s.duration.toFixed(2)}ms (z=${zscore.toFixed(2)}, mean=${mean.toFixed(2)}ms, stdev=${stdev.toFixed(2)}ms)`,
      details: {
        durationMs: s.duration,
        zscore,
        mean,
        stdev,
        sampleCount: samples.length,
      },
      _zscore: zscore,
    });
  }
  candidates.sort((a, b) => b._zscore - a._zscore);
  // Strip the internal _zscore field before returning.
  return candidates.slice(0, maxOutliers).map((c) => ({
    tick: c.tick,
    kind: c.kind,
    severity: c.severity,
    message: c.message,
    details: c.details,
  }));
}
