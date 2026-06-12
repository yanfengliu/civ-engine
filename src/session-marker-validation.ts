// Marker validation per spec §6.1 (extracted from session-recorder.ts in
// 1.0.2 for LOC headroom — the recorder sat exactly at the 500 cap; pre-1.0
// review carry-over). Behavior unchanged; rule ids preserved.

import { MarkerValidationError } from './session-errors.js';
import type { EntityRef, MarkerRefs } from './session-bundle.js';

interface MarkerWorldView {
  readonly tick: number;
  isCurrent(ref: EntityRef): boolean;
  readonly grid: { readonly width: number; readonly height: number };
}

export interface NewMarkerLike {
  tick?: number;
  refs?: MarkerRefs;
  attachments?: string[];
}

/** Throws MarkerValidationError on any §6.1 violation; returns the resolved
 *  tick. Live-tick markers get the full check; retroactive markers skip
 *  entity liveness (the caller stamps validated:false). */
export function validateNewMarker(
  input: NewMarkerLike,
  world: MarkerWorldView,
  registeredAttachmentIds: ReadonlySet<string>,
): number {
  const tick = input.tick ?? world.tick;
  if (tick < 0) {
    throw new MarkerValidationError(`marker.tick must be >= 0 (got ${tick})`,
      { field: 'tick', value: tick }, '6.1.tick_negative');
  }
  if (tick > world.tick) {
    throw new MarkerValidationError(
      `marker.tick (${tick}) must not exceed current world tick (${world.tick})`,
      { field: 'tick', value: tick }, '6.1.tick_future');
  }
  const isLive = tick === world.tick;
  if (input.refs?.entities && isLive) {
    for (const ref of input.refs.entities) {
      if (!world.isCurrent(ref)) {
        throw new MarkerValidationError(
          `marker.refs.entities references a non-live entity { id: ${ref.id}, generation: ${ref.generation} }`,
          { field: 'refs.entities', ref: { id: ref.id, generation: ref.generation } },
          '6.1.entity_liveness',
        );
      }
    }
  }
  if (input.refs?.tickRange) {
    const { from, to } = input.refs.tickRange;
    if (from < 0 || to < 0 || from > to) {
      throw new MarkerValidationError(
        `marker.refs.tickRange invalid: { from: ${from}, to: ${to} }`,
        { field: 'refs.tickRange', from, to }, '6.1.tickrange_shape',
      );
    }
  }
  if (input.refs?.cells) {
    // Out-of-bounds cells are rejected per spec §6.1. Iter-1 code review fix.
    const w = world.grid.width;
    const h = world.grid.height;
    for (const cell of input.refs.cells) {
      if (cell.x < 0 || cell.x >= w || cell.y < 0 || cell.y >= h) {
        throw new MarkerValidationError(
          `marker.refs.cells contains out-of-bounds cell { x: ${cell.x}, y: ${cell.y} } (world is ${w}×${h})`,
          { field: 'refs.cells', x: cell.x, y: cell.y, gridWidth: w, gridHeight: h },
          '6.1.cell_bounds',
        );
      }
    }
  }
  if (input.attachments) {
    // Each referenced attachment id must have been registered via attach().
    for (const attId of input.attachments) {
      if (!registeredAttachmentIds.has(attId)) {
        throw new MarkerValidationError(
          `marker.attachments references unknown attachment id "${attId}" — call recorder.attach() first`,
          { field: 'attachments', id: attId },
          '6.1.attachment_unknown',
        );
      }
    }
  }
  return tick;
}
