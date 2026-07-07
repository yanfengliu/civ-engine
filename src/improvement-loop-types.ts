import type { IMPROVEMENT_FINDING_SCHEMA_VERSION } from './ai-contract.js';
import type { JsonValue } from './json.js';
import type { MarkerRefs } from './session-bundle.js';
import type {
  VisualPlaytestFindingCategory,
  VisualPlaytestFindingSeverity,
} from './visual-playtest-types.js';

export type ImprovementVerificationStatus =
  | 'unverified'
  | 'verified'
  | 'falsePositive'
  | 'fixed'
  | 'regressed';

export type ImprovementNextAction =
  | 'proposalOnly'
  | 'autoFix'
  | 'manualFix'
  | 'observeMore'
  | 'none';

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

export interface ImprovementRunManifest {
  schemaVersion: 1;
  id: string;
  gameId?: string;
  objective?: string;
  startedAt?: string;
  completedAt?: string;
  bundleId?: string;
  sessionId?: string;
  tags?: readonly string[];
  data?: JsonValue;
}

export interface ImprovementFinding {
  schemaVersion: typeof IMPROVEMENT_FINDING_SCHEMA_VERSION;
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
  nextAction: ImprovementNextAction;
  disposition?: ImprovementDisposition;
  sourceRun?: ImprovementRunManifest;
  data?: JsonValue;
}
