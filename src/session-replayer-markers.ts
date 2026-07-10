import type { Marker } from './session-bundle.js';
import type { MarkerValidationResult } from './session-replayer-types.js';
import type { WorldSnapshot } from './serializer.js';

/**
 * Verify retroactive (`validated === false`) markers whose entity refs must be
 * live at their tick, by hydrating bundle state at each marker's tick via the
 * supplied `stateAtTick`. Extracted from `SessionReplayer` (delegates with
 * `(t) => this.stateAtTick(t)`) to keep that file within the LOC budget.
 */
export function validateBundleMarkers(
  markers: readonly Marker[],
  stateAtTick: (tick: number) => WorldSnapshot,
): MarkerValidationResult {
  const result: MarkerValidationResult = { ok: true, invalidMarkers: [] };
  for (const marker of markers) {
    if (marker.validated === false && marker.refs?.entities && marker.refs.entities.length > 0) {
      // Retroactive marker — verify each entity ref against the snapshot at marker.tick.
      try {
        const snap = stateAtTick(marker.tick);
        for (const ref of marker.refs.entities) {
          const gens = (snap as { entities?: { generations?: number[]; alive?: boolean[] } }).entities;
          const alive = gens?.alive?.[ref.id];
          const generation = gens?.generations?.[ref.id];
          if (!alive || generation !== ref.generation) {
            result.invalidMarkers.push({
              markerId: marker.id,
              reason: `entity { id: ${ref.id}, generation: ${ref.generation} } not live at tick ${marker.tick}`,
            });
            result.ok = false;
            break;
          }
        }
      } catch (e) {
        result.invalidMarkers.push({
          markerId: marker.id,
          reason: `replay failed: ${(e as Error).message}`,
        });
        result.ok = false;
      }
    }
  }
  return result;
}
