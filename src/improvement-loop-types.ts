import type { JsonValue } from './json.js';
import type { MarkerRefs } from './session-bundle.js';
import type {
  VisualPlaytestFindingCategory,
  VisualPlaytestFindingSeverity,
} from './visual-playtest-types.js';

export type ImprovementFindingSchemaVersion = 1 | 2;

export type ImprovementVerificationStatus =
  | 'unverified'
  | 'verified'
  | 'falsePositive'
  | 'fixed'
  | 'regressed';

export type ImprovementVerificationMethod =
  | 'replay'
  | 'state'
  | 'spec'
  | 'metric'
  | 'screenshot'
  | 'human';

export type ImprovementPromotionTarget =
  | 'test'
  | 'scenario'
  | 'fixture'
  | 'assertion'
  | 'backlog'
  | 'engineFeedback'
  | 'designQuestion';

export type ImprovementNextAction =
  | 'proposalOnly'
  | 'autoFix'
  | 'manualFix'
  | 'observeMore'
  | 'none'
  | 'improveHarness'
  | 'fileEngineFeedback'
  | 'addRegression'
  | 'updateDesign';

export type ImprovementDisposition =
  | 'candidate'
  | 'accepted'
  | 'rejected'
  | 'deferred'
  | 'wontFix';

export interface ImprovementEvidenceRef {
  kind: 'tick' | 'step' | 'screenshot' | 'marker' | 'trace' | 'bundle' | 'metric' | 'text';
  tick?: number;
  step?: number;
  actionIndex?: number;
  screenshotPath?: string;
  markerId?: string;
  bundleId?: string;
  sessionId?: string;
  label?: string;
  value?: string;
  stateLabels?: readonly string[];
  data?: JsonValue;
}

export interface ImprovementRunArtifact {
  kind: string;
  path: string;
}

export interface ImprovementGateResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface ImprovementRunManifest {
  schemaVersion: 1;
  id: string;
  gameId?: string;
  objective?: string;
  startedAt?: string;
  completedAt?: string;
  bundleId?: string;
  sessionId?: string;
  gitCommit?: string;
  engineVersion?: string;
  model?: string;
  provider?: string;
  seed?: string | number;
  costUsd?: number;
  durationMs?: number;
  stopReason?: string;
  artifacts?: readonly ImprovementRunArtifact[];
  gates?: readonly ImprovementGateResult[];
  tags?: readonly string[];
  data?: JsonValue;
}

export type ImprovementRunManifestInput = Omit<ImprovementRunManifest, 'schemaVersion'>;

export interface ImprovementFinding {
  schemaVersion: ImprovementFindingSchemaVersion;
  id: string;
  title: string;
  severity: VisualPlaytestFindingSeverity;
  category: VisualPlaytestFindingCategory;
  observed: string;
  expected?: string;
  suggestion?: string;
  area?: string;
  evidence?: readonly ImprovementEvidenceRef[];
  refs?: MarkerRefs;
  verificationStatus: ImprovementVerificationStatus;
  verificationMethod?: ImprovementVerificationMethod;
  nextAction: ImprovementNextAction;
  promotionTarget?: ImprovementPromotionTarget;
  disposition?: ImprovementDisposition;
  sourceRun?: ImprovementRunManifest;
  data?: JsonValue;
}

export interface ImprovementFindingInit {
  id: string;
  verificationStatus?: ImprovementVerificationStatus;
  verificationMethod?: ImprovementVerificationMethod;
  nextAction?: ImprovementNextAction;
  promotionTarget?: ImprovementPromotionTarget;
  disposition?: ImprovementDisposition;
  sourceRun?: ImprovementRunManifest;
  data?: JsonValue;
}

export interface AssertImprovementFindingOptions {
  /**
   * Default true: verified findings must carry a verificationMethod and at
   * least one addressed replayable evidence ref. Pass false only when reading
   * historical data recorded before the strict default.
   */
  requireVerificationEvidence?: boolean;
}
