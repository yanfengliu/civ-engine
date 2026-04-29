export * from './ai-contract.js';
export * from './behavior-tree.js';
export * from './cellular.js';
export * from './client-adapter.js';
export * from './command-transaction.js';
export * from './diff.js';
export * from './history-recorder.js';
export * from './layer.js';
export * from './map-gen.js';
export * from './noise.js';
export * from './occupancy-grid.js';
export * from './path-service.js';
export * from './pathfinding.js';
export * from './random.js';
export * from './render-adapter.js';
export * from './resource-store.js';
export * from './scenario-runner.js';
export * from './serializer.js';
export * from './spatial-grid.js';
export * from './types.js';
export * from './visibility-map.js';
export * from './world.js';
export * from './world-debugger.js';

// Session-recording subsystem (T1+; see docs/threads/done/session-recording/DESIGN.md)
export {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type SessionBundle,
  type SessionMetadata,
  type SessionTickEntry,
  type SessionSnapshotEntry,
  type AttachmentDescriptor,
  type RecordedCommand,
  type Marker,
  type MarkerKind,
  type MarkerProvenance,
  type MarkerRefs,
  type EntityRef,
} from './session-bundle.js';
export {
  SessionRecordingError,
  MarkerValidationError,
  RecorderClosedError,
  SinkWriteError,
  BundleVersionError,
  BundleRangeError,
  BundleIntegrityError,
  ReplayHandlerMissingError,
} from './session-errors.js';
// Side-effect import: declaration-merge for hidden World.__payloadCapturingRecorder slot
import './session-internals.js';
export { ENGINE_VERSION } from './version.js';
// T2: Session sinks
export {
  type SessionSink,
  type SessionSource,
  MemorySink,
  type MemorySinkOptions,
} from './session-sink.js';
// T3: FileSink
export { FileSink } from './session-file-sink.js';
// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
// over closed FileSink bundle directories, with lazy SessionBundle loading.
export {
  BundleCorpus,
  CorpusIndexError,
  type BundleCorpusScanDepth,
  type BundleCorpusOptions,
  type BundleCorpusEntry,
  type BundleCorpusMetadata,
  type BundleQuery,
  type OneOrMany,
  type NumberRange,
  type IsoTimeRange,
  type CorpusIndexErrorCode,
  type CorpusIndexErrorDetails,
  type InvalidCorpusEntry,
} from './bundle-corpus.js';
// T5: SessionRecorder
export {
  SessionRecorder,
  type SessionRecorderConfig,
  type NewMarker,
} from './session-recorder.js';
// T6: SessionReplayer + selfCheck
export {
  SessionReplayer,
  type ReplayerConfig,
  type SelfCheckOptions,
  type SelfCheckResult,
  type StateDivergence,
  type EventDivergence,
  type ExecutionDivergence,
  type SkippedSegment,
  type MarkerValidationResult,
  deepEqualWithPath,
} from './session-replayer.js';
// T7: scenarioResultToBundle adapter
export {
  scenarioResultToBundle,
  type ScenarioResultToBundleOptions,
} from './session-scenario-bundle.js';
// Behavioral Metrics over Corpus — Spec 8 (v0.8.2+): pure-function corpus reducer
// over Iterable<SessionBundle>. 11 engine-generic built-in metrics + accumulator-style
// Metric contract + thin compareMetricsResults delta helper.
export {
  type Metric,
  type MetricsResult,
  type MetricsComparison,
  type MetricDelta,
  type NumericDelta,
  type OpaqueDelta,
  type OnlyInComparison,
  type Stats,
  runMetrics,
  compareMetricsResults,
  bundleCount,
  sessionLengthStats,
  commandRateStats,
  eventRateStats,
  commandTypeCounts,
  eventTypeCounts,
  failureBundleRate,
  failedTickRate,
  incompleteBundleRate,
  commandValidationAcceptanceRate,
  executionFailureRate,
} from './behavioral-metrics.js';

// Synthetic Playtest — Spec 3 T1+T2 (v0.7.20+): Policy types, 3 built-in policies, runSynthPlaytest harness.
export {
  type Policy,
  type PolicyContext,
  type StopContext,
  type PolicyCommand,
  type RandomPolicyConfig,
  type ScriptedPolicyEntry,
  type SynthPlaytestConfig,
  type SynthPlaytestResult,
  noopPolicy,
  randomPolicy,
  scriptedPolicy,
  runSynthPlaytest,
} from './synthetic-playtest.js';

// Strict-Mode Determinism — Spec 6 (v0.8.8+): opt-in `WorldConfig.strict` flag
// rejects mutation methods called outside system phases / setup window /
// runMaintenance callbacks. See docs/threads/done/strict-mode/DESIGN.md.
export {
  StrictModeViolationError,
  type StrictModePhase,
  type StrictModeViolationDetails,
} from './world-strict-mode.js';

// Bundle Viewer — Spec 4 (v0.8.7+): Programmatic agent-driver API for navigating,
// slicing, and diffing a SessionBundle. Composes with BundleCorpus and SessionReplayer.
// See docs/threads/done/bundle-viewer/DESIGN.md.
export {
  BundleViewer,
  BundleViewerError,
  diffSnapshots,
  type BundleViewerOptions,
  type BundleViewerErrorCode,
  type BundleViewerErrorDetails,
  type TickFrame,
  type RecordedTickFrameEvent,
  type RecordedTickEvent,
  type BundleStateDiff,
  type DiffOptions,
  type TickRange,
  type MarkerQuery,
  type EventQuery,
  type CommandQuery,
  type ExecutionQuery,
} from './bundle-viewer.js';
