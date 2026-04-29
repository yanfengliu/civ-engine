export type EntityId = number;

export interface EntityRef {
  id: EntityId;
  generation: number;
}

export interface Position {
  x: number;
  y: number;
}

export type InstrumentationProfile = 'full' | 'minimal' | 'release';

export interface WorldConfig {
  gridWidth: number;
  gridHeight: number;
  tps: number;
  positionKey?: string;
  maxTicksPerFrame?: number;
  seed?: number | string;
  instrumentationProfile?: InstrumentationProfile;
  /**
   * When true, mutation methods on `World` (setComponent, addComponent,
   * removeComponent, patchComponent, setPosition, setState, deleteState,
   * addTag, removeTag, setMeta, deleteMeta, addResource/removeResource and
   * friends, setProduction/setConsumption, addTransfer/removeTransfer,
   * setResourceMax, emit, destroyEntity, createEntity, random) throw
   * `StrictModeViolationError` when called outside a system phase, the
   * construction-time setup window, or an explicit `runMaintenance(fn)`
   * callback. Default false. Registration methods (registerComponent,
   * registerSystem, registerHandler, registerValidator, registerResource)
   * remain allowed at any time. See Spec 6 in
   * `docs/threads/done/strict-mode/DESIGN.md`.
   */
  strict?: boolean;
}
