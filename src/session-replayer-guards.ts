// Construction-time guards for the replay path (error-quality audit 1.0.1).
// Every failure here must name the ACTUAL defect with a stable code and
// actionable guidance — the defects below were previously SILENT (openAt
// returned a tick-0 world when a factory forgot applySnapshot, and accepted
// a poisoned factory world) or misleading (a non-bundle input produced an
// "unsupported schemaVersion: undefined" message).

import { BundleIntegrityError } from './session-errors.js';
import type { WorldSnapshot } from './serializer.js';

interface FactoryWorldLike {
  readonly tick: number;
  isPoisoned(): boolean;
  getLastTickFailure(): { code: string; tick: number } | null;
  getAliveEntities(): IterableIterator<number>;
  getStateKeys(): string[];
  query(...keys: string[]): IterableIterator<number>;
}

/** Structural minimum the replayer touches; checked BEFORE version gates so
 *  garbage input says "not a bundle", not "bad schemaVersion: undefined". */
export function assertBundleShape(bundle: unknown): void {
  if (typeof bundle !== 'object' || bundle === null) {
    // null/undefined/primitives are realistic JSON.parse outputs — say so
    // instead of raw-TypeError-ing on the first property read (review C-M2).
    throw new BundleIntegrityError(
      `not a usable SessionBundle: got ${bundle === null ? 'null' : typeof bundle} — pass the object produced by SessionRecorder.toBundle() / a SessionSource`,
      { code: 'bundle_malformed', missing: ['<entire bundle>'] },
    );
  }
  const b = bundle as Record<string, unknown>;
  const md = b.metadata as { engineVersion?: unknown } | null | undefined;
  const required: Array<[string, boolean]> = [
    ['schemaVersion', b.schemaVersion !== undefined],
    ['metadata', typeof b.metadata === 'object' && b.metadata !== null],
    // Conditional: when metadata itself is missing, report only the root
    // cause, not the nested field too.
    ['metadata.engineVersion',
      typeof b.metadata !== 'object' || b.metadata === null
        ? true
        : typeof md?.engineVersion === 'string'],
    ['initialSnapshot', typeof b.initialSnapshot === 'object' && b.initialSnapshot !== null],
    ['ticks', Array.isArray(b.ticks)],
    ['commands', Array.isArray(b.commands)],
    ['snapshots', Array.isArray(b.snapshots)],
  ];
  const missing = required.filter(([, ok]) => !ok).map(([k]) => k);
  if (missing.length > 0) {
    throw new BundleIntegrityError(
      `not a usable SessionBundle: missing/invalid field(s) ${missing.join(', ')} — pass the object produced by SessionRecorder.toBundle() / a SessionSource, not a partial or foreign shape`,
      { code: 'bundle_malformed', missing },
    );
  }
}

/** The worldFactory contract: returns a CLEAN world with the construction
 *  snapshot APPLIED. Runs after the registration check on every factory
 *  invocation (openAt, selfCheck segments, forkAt, viewer). */
export function assertFactoryContract(world: FactoryWorldLike, snapshot: WorldSnapshot): void {
  if (world.isPoisoned()) {
    const failure = world.getLastTickFailure();
    throw new BundleIntegrityError(
      `worldFactory returned a POISONED world (${failure?.code ?? 'unknown'} at tick ${failure?.tick ?? '?'}): replay requires a clean construction — fix the factory so no tick fails during setup (or recover() before returning)`,
      {
        code: 'factory_world_poisoned',
        failureCode: failure?.code ?? null,
        failureTick: failure?.tick ?? null,
        snapshotTick: snapshot.tick,
      },
    );
  }
  if (world.tick !== snapshot.tick) {
    throw new BundleIntegrityError(
      `worldFactory returned a world at tick ${world.tick} but the construction snapshot is tick ${snapshot.tick}: the factory must call applySnapshot(snapshot) on the snapshot it receives and must not step afterwards`,
      { code: 'factory_snapshot_not_applied', worldTick: world.tick, snapshotTick: snapshot.tick },
    );
  }
  // Tick equality alone is blind at tick 0 (fresh worlds are also at 0 —
  // review C-M1): cross-check cheap structural fingerprints. Residual
  // blindness only when the snapshot is structurally indistinguishable from
  // a fresh factory world (rng/resource state may still differ — documented).
  const snap = snapshot as unknown as {
    entities?: { alive?: boolean[] };
    state?: Record<string, unknown>;
    components?: Record<string, Array<unknown>>;
  };
  const mismatch = (what: string, expected: number, actual: number): never => {
    throw new BundleIntegrityError(
      `worldFactory returned a world whose ${what} (${actual}) does not match the construction snapshot (${expected}) despite matching tick ${snapshot.tick}: the factory must call applySnapshot(snapshot) on the snapshot it receives`,
      { code: 'factory_snapshot_not_applied', worldTick: world.tick, snapshotTick: snapshot.tick, fingerprint: what, expected, actual },
    );
  };
  const snapAlive = (snap.entities?.alive ?? []).filter(Boolean).length;
  const worldAlive = [...world.getAliveEntities()].length;
  if (worldAlive !== snapAlive) mismatch('alive-entity count', snapAlive, worldAlive);
  const snapStateKeys = Object.keys(snap.state ?? {}).length;
  const worldStateKeys = world.getStateKeys().length;
  if (worldStateKeys !== snapStateKeys) mismatch('world-state key count', snapStateKeys, worldStateKeys);
  for (const [key, entries] of Object.entries(snap.components ?? {})) {
    if (entries.length === 0) continue;
    let actual = 0;
    try {
      actual = [...world.query(key)].length;
    } catch {
      actual = -1; // unregistered key: definitionally not applied
    }
    if (actual !== entries.length) mismatch(`component '${key}' entry count`, entries.length, actual);
  }
}
