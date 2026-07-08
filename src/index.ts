// Curated explicit export surface (v1-surface objective, v0.8.23).
// No star-exports: every public name is listed here deliberately, pinned by
// tests/public-surface.test.ts (runtime names + declared-name closure).
// Additions are reviewed surface changes, not accidents.
export {
  CLIENT_PROTOCOL_VERSION, COMMAND_EXECUTION_SCHEMA_VERSION, COMMAND_RESULT_SCHEMA_VERSION,
  IMPROVEMENT_FINDING_SCHEMA_VERSION, SCENARIO_RESULT_SCHEMA_VERSION, TICK_FAILURE_SCHEMA_VERSION,
  WORLD_DEBUG_SCHEMA_VERSION, WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION, WORLD_HISTORY_SCHEMA_VERSION,
  WORLD_STEP_RESULT_SCHEMA_VERSION, getAiContractVersions, type AiContractVersions,
} from './ai-contract.js';
export {
  BTNode, NodeStatus, clearRunningState, createBTState, createBehaviorTree, type BTState,
  type TreeBuilder,
} from './behavior-tree.js';
export {
  MOORE_OFFSETS, VON_NEUMANN_OFFSETS, createCellGrid, stepCellGrid, type CellGrid,
  type CellRule,
} from './cellular.js';
export {
  ClientAdapter, type ClientMessage, type GameEvent, type ServerMessage,
} from './client-adapter.js';
export {
  CommandTransaction, type ReadOnlyTransactionWorld,
  type TransactionPrecondition, type TransactionResult,
} from './command-transaction.js';
export {
  type ResourcePool, type TickDiff,
} from './diff.js';
export {
  assertImprovementFinding,
  assertImprovementRunManifest,
  createImprovementRunManifest,
  improvementFindingToMarker,
  improvementFindingToVisualPlaytestFinding,
  improvementFindingsFromMarkers,
  minimalImprovementFindingSchemaVersion,
  visualPlaytestFindingToImprovementFinding,
  type AssertImprovementFindingOptions,
  type ImprovementDisposition,
  type ImprovementEvidenceRef,
  type ImprovementFinding,
  type ImprovementFindingInit,
  type ImprovementFindingSchemaVersion,
  type ImprovementGateResult,
  type ImprovementNextAction,
  type ImprovementPromotionTarget,
  type ImprovementRunArtifact,
  type ImprovementRunManifest,
  type ImprovementRunManifestInput,
  type ImprovementVerificationMethod,
  type ImprovementVerificationStatus,
} from './improvement-loop.js';
export {
  EngineError, EngineRangeError, EngineTypeError, getErrorCode, isEngineError,
  type EngineErrorOptions,
} from './engine-error.js';
export {
  WorldHistoryRecorder, summarizeWorldHistoryRange, type WorldHistoryIssueSummary,
  type WorldHistoryRangeSummary, type WorldHistoryState, type WorldHistoryTick,
} from './history-recorder.js';
export {
  Layer, type LayerOptions, type LayerState,
} from './layer.js';
export {
  createTileGrid, type MapGenerator,
} from './map-gen.js';
export {
  createNoise2D, octaveNoise2D,
} from './noise.js';
export {
  OccupancyBinding, OccupancyGrid, SubcellOccupancyGrid, type GridPassability,
  type OccupancyArea, type OccupancyBindingClaimOptions, type OccupancyBindingMetrics,
  type OccupancyBindingOptions, type OccupancyBindingSubcellOptions,
  type OccupancyBindingWorldHooks, type OccupancyCellClaim, type OccupancyCellStatus,
  type OccupancyClaimType, type OccupancyGridMetrics, type OccupancyGridState,
  type OccupancyMetadata, type OccupancyQueryOptions, type OccupancyRect,
  type SubcellNeighborOptions, type SubcellNeighborSpace, type SubcellOccupancyGridMetrics,
  type SubcellOccupancyGridOptions, type SubcellOccupancyGridState,
  type SubcellOccupancyOptions, type SubcellPlacement, type SubcellSlotOffset,
} from './occupancy-grid.js';
export {
  PathCache, PathRequestQueue, createGridPathCacheKey, createGridPathQueue, findGridPath,
  type GridPathConfig, type GridPathRequest,
  type PathRequestQueueEntry, type PathRequestQueueOptions, type PathRequestQueueStats,
} from './path-service.js';
export {
  PlayerObserver, type ObservedEntity, type ObservedEntityUpdate, type PlayerObservation,
  type PlayerObserverConfig, type PlayerTickObservation,
} from './player-observer.js';
export {
  findPath, type PathConfig, type PathResult,
} from './pathfinding.js';
export {
  DeterministicRandom, type RandomState,
} from './random.js';
export {
  RenderAdapter, type RenderDebugCapture, type RenderDiff, type RenderEntity,
  type RenderEntityChange, type RenderProjector, type RenderServerMessage, type RenderSnapshot,
} from './render-adapter.js';
export {
  ResourceStore, type ResourceMax, type ResourceStoreState, type Transfer,
} from './resource-store.js';
export {
  runScenario, type ScenarioCapture, type ScenarioCheck, type ScenarioCheckOutcome,
  type ScenarioCheckResult, type ScenarioConfig, type ScenarioContext, type ScenarioFailure,
  type ScenarioResult, type ScenarioStepUntilResult,
} from './scenario-runner.js';
export {
  type WorldSnapshot, type WorldSnapshotV1, type WorldSnapshotV2, type WorldSnapshotV3,
  type WorldSnapshotV4, type WorldSnapshotV5, type WorldSnapshotV6,
} from './serializer.js';
export {
  ALL_DIRECTIONS, DIAGONAL, ORTHOGONAL, SpatialGrid, type SpatialGridView,
} from './spatial-grid.js';
export {
  type EntityId, type InstrumentationProfile, type Position, type WorldConfig,
} from './types.js';
export {
  VisibilityMap, type VisibilityMapMetrics, type VisibilityMapState, type VisibilityPlayerId, type VisionSource,
  type VisionSourceId,
} from './visibility-map.js';
export {
  SYSTEM_PHASES, World, WorldTickFailureError, type CommandExecutionResult,
  type CommandSubmissionResult, type CommandValidationRejection, type CommandValidationResult,
  type ComponentOptions, type ComponentRegistry, type LooseSystem, type LooseSystemRegistration,
  type System, type SystemPhase, type SystemRegistration, type TickFailure,
  type TickFailurePhase, type TickMetricsProfile, type WorldMetrics, type WorldStepResult,
} from './world.js';
export {
  WorldDebugger, createOccupancyDebugProbe, createPathQueueDebugProbe,
  createVisibilityDebugProbe, type DebugComponentSummary, type DebugDiffSummary,
  type DebugEventSummary, type DebugIssue, type DebugProbe, type DebugResourceSummary,
  type DebugSeverity, type DebugSpatialCell, type DebugSpatialSummary, type DebugWarning,
  type OccupancyDebugSnapshot, type VisibilityDebugSnapshot, type VisibilityPlayerDebugSnapshot,
  type WorldDebugSnapshot,
} from './world-debugger.js';

// Session-recording subsystem (T1+; see docs/threads/done/session-recording/DESIGN.md)
export {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type SessionBundle,
  type SessionMetadata,
  type RegistrationManifest,
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
// Counterfactual Replay / Fork — Spec 5 (v0.8.12+):
// SessionReplayer.forkAt(targetTick) builder API + Divergence summary.
// See docs/threads/done/counterfactual-replay/DESIGN.md.
export {
  ForkSubstitutionError,
  ForkBuilderConflictError,
  BuilderConsumedError,
  type ForkBuilder,
  type ForkResult,
  type ForkRunConfig,
  type Divergence,
  type DivergenceCounts,
  type CommandSequenceMap,
  type ForkBuilderConflictCode,
  type ForkSubstitutionErrorDetails,
  type ForkBuilderConflictErrorDetails,
} from './session-fork.js';
export {
  diffBundles,
  snapshotAtTick,
  type DiffBundlesOptions,
  type BundleDiff,
  type BundleTickDelta,
} from './session-bundle-diff.js';
// Bundle Hotspots (v0.8.13+) — per-bundle anomaly detection helper.
// First incarnation of the "anomaly detection over the corpus" continuous
// capability in `docs/design/ai-first-dev-roadmap.md`. See
// `docs/api-reference.md` § "Bundle Hotspots (v0.8.13+)".
export {
  bundleHotspots,
  type BundleHotspot,
  type BundleHotspotKind,
  type BundleHotspotsOptions,
} from './bundle-hotspots.js';
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

// AI Playtester Agent — Spec 9 (v0.8.9+): async sibling to runSynthPlaytest for
// LLM-driven (or any other async-decision) playtesters, plus bundleSummary helper
// for feeding bundle facts to an LLM. See docs/threads/done/ai-playtester/DESIGN.md.
export {
  runAgentPlaytest,
  bundleSummary,
  type AgentDriver,
  type AgentDriverContext,
  type AgentPlaytestConfig,
  type AgentPlaytestResult,
  type AgentStopReason,
  type BundleSummary,
} from './ai-playtester.js';

// Visual Playtest Harness (v1.3.0+): zero-dependency player-surface loop
// contracts for screenshot/control/state-channel based game playtesting.
export {
  buildVisualPlaytestPrompt,
  buildVisualPlaytestPromptParts,
  observationForAgent,
  redactVisualPlaytestObservation,
  runVisualPlaytestLoop,
  visualPlaytestFindingToMarker,
  visualPlaytestFindingsFromMarkers,
  type VisualPlaytestAction,
  type VisualPlaytestActionContext,
  type VisualPlaytestActionKind,
  type VisualPlaytestActionResult,
  type VisualPlaytestAgent,
  type VisualPlaytestAgentInput,
  type VisualPlaytestAnnotationContext,
  type VisualPlaytestBudget,
  type VisualPlaytestControl,
  type VisualPlaytestDecision,
  type VisualPlaytestErrorShape,
  type VisualPlaytestFinding,
  type VisualPlaytestFindingCategory,
  type VisualPlaytestFindingEvidence,
  type VisualPlaytestFindingSeverity,
  type VisualPlaytestHost,
  type VisualPlaytestLoopConfig,
  type VisualPlaytestLoopResult,
  type VisualPlaytestObservation,
  type VisualPlaytestObserveInput,
  type VisualPlaytestPoint,
  type VisualPlaytestPromptInput,
  type VisualPlaytestPromptMode,
  type VisualPlaytestPromptPart,
  type VisualPlaytestRect,
  type VisualPlaytestRedactionOptions,
  type VisualPlaytestScreenshot,
  type VisualPlaytestStateAudience,
  type VisualPlaytestStateChannel,
  type VisualPlaytestStopReason,
  type VisualPlaytestTraceEntry,
  type VisualPlaytestViewport,
} from './visual-playtest.js';

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
