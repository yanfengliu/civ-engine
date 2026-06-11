// Registration-manifest comparison for fail-fast replay verification
// (registration-manifest objective; DESIGN §1/§5). Compares only the
// FACTORY-OWNED categories — systems / handlers / validators /
// destroyCallbackCount / positionKey, plus components as extras-only against
// manifest ∪ the construction snapshot's keys. Component options and
// resources are capture-only: `applySnapshot` heals them from the snapshot,
// so comparing them yields dead checks or false positives.

import type { JsonValue } from './json.js';
import type { RegistrationManifest } from './session-bundle.js';
import type { WorldSnapshot } from './serializer.js';

/** The minimum surface the check reads from a factory-built world. */
export interface RegistrationCheckView {
  readonly positionKey: string;
  getRegistrationManifest(): RegistrationManifest;
}

export interface RegistrationMismatchDetails {
  readonly [key: string]: JsonValue;
  code: 'registration_mismatch';
  missingSystems: string[];
  extraSystems: string[];
  recordedSystemOrder: string[];
  actualSystemOrder: string[];
  systemDetailMismatches: Array<{
    index: number;
    name: string;
    field: string;
    recorded: string | number | string[];
    actual: string | number | string[];
  }>;
  extraComponents: string[];
  missingHandlers: string[];
  extraHandlers: string[];
  validatorCountMismatches: Array<{ key: string; recorded: number; actual: number }>;
  destroyCallbackCountMismatch: { recorded: number; actual: number } | null;
  positionKeyMismatch: { snapshot: string; actual: string } | null;
}

/**
 * Returns mismatch details, or null when the factory-owned registration
 * matches the recorded manifest. `snapshot` is the snapshot passed to THIS
 * construction — the per-construction reading is load-bearing for the
 * extras-only component rule (design-2 review).
 */
export function compareRegistration(
  recorded: RegistrationManifest,
  world: RegistrationCheckView,
  snapshot: WorldSnapshot,
): RegistrationMismatchDetails | null {
  const actual = world.getRegistrationManifest();

  const recordedNames = recorded.systems.map((s) => s.name);
  const actualNames = actual.systems.map((s) => s.name);
  // Strict criterion: ordered name-array equality. Length-safe and
  // duplicate-safe (impl-review-1 Codex HIGH: set-based diffs let recorded
  // ['a','a'] vs factory ['a'] pass clean — duplicate unconstrained names
  // are legal). The set-based missing/extra lists below are diagnostics.
  const systemOrderMatches =
    recordedNames.length === actualNames.length &&
    recordedNames.every((n, i) => n === actualNames[i]);
  const recordedNameSet = new Set(recordedNames);
  const actualNameSet = new Set(actualNames);
  const missingSystems = recordedNames.filter((n) => !actualNameSet.has(n));
  const extraSystems = actualNames.filter((n) => !recordedNameSet.has(n));

  const systemDetailMismatches: RegistrationMismatchDetails['systemDetailMismatches'] = [];
  const overlap = Math.min(recorded.systems.length, actual.systems.length);
  for (let i = 0; i < overlap; i++) {
    const r = recorded.systems[i];
    const a = actual.systems[i];
    const fields: Array<[string, string | number | string[], string | number | string[]]> = [
      ['name', r.name, a.name],
      ['phase', r.phase, a.phase],
      ['interval', r.interval, a.interval],
      ['intervalOffset', r.intervalOffset, a.intervalOffset],
      ['before', r.before, a.before],
      ['after', r.after, a.after],
    ];
    for (const [field, rv, av] of fields) {
      const differs = Array.isArray(rv)
        ? JSON.stringify(rv) !== JSON.stringify(av)
        : rv !== av;
      if (differs) {
        systemDetailMismatches.push({ index: i, name: r.name, field, recorded: rv, actual: av });
      }
    }
  }

  const recordedHandlers = new Set(recorded.handlers);
  const actualHandlers = new Set(actual.handlers);
  const missingHandlers = recorded.handlers.filter((h) => !actualHandlers.has(h));
  const extraHandlers = actual.handlers.filter((h) => !recordedHandlers.has(h));

  const actualValidatorCounts = new Map(actual.validators.map((v) => [v.key, v.count]));
  const recordedValidatorKeys = new Set(recorded.validators.map((v) => v.key));
  const validatorCountMismatches: Array<{ key: string; recorded: number; actual: number }> = [];
  for (const v of recorded.validators) {
    const got = actualValidatorCounts.get(v.key) ?? 0;
    if (got !== v.count) validatorCountMismatches.push({ key: v.key, recorded: v.count, actual: got });
  }
  for (const v of actual.validators) {
    if (!recordedValidatorKeys.has(v.key) && v.count > 0) {
      validatorCountMismatches.push({ key: v.key, recorded: 0, actual: v.count });
    }
  }

  const destroyCallbackCountMismatch =
    recorded.destroyCallbackCount !== actual.destroyCallbackCount
      ? { recorded: recorded.destroyCallbackCount, actual: actual.destroyCallbackCount }
      : null;

  const snapshotPositionKey = snapshot.config.positionKey ?? 'position';
  const positionKeyMismatch =
    world.positionKey !== snapshotPositionKey
      ? { snapshot: snapshotPositionKey, actual: world.positionKey }
      : null;

  // Components: extras-only vs manifest ∪ this construction's snapshot keys.
  const allowed = new Set<string>([
    ...recorded.components.map((c) => c.key),
    ...Object.keys(snapshot.components),
  ]);
  const extraComponents = actual.components
    .map((c) => c.key)
    .filter((key) => !allowed.has(key))
    .sort();

  const clean =
    systemOrderMatches &&
    systemDetailMismatches.length === 0 &&
    extraComponents.length === 0 &&
    missingHandlers.length === 0 &&
    extraHandlers.length === 0 &&
    validatorCountMismatches.length === 0 &&
    destroyCallbackCountMismatch === null &&
    positionKeyMismatch === null;
  if (clean) return null;

  return {
    code: 'registration_mismatch',
    missingSystems,
    extraSystems,
    recordedSystemOrder: recordedNames,
    actualSystemOrder: actualNames,
    systemDetailMismatches,
    extraComponents,
    missingHandlers,
    extraHandlers,
    validatorCountMismatches,
    destroyCallbackCountMismatch,
    positionKeyMismatch,
  };
}
